// @vitest-environment node
//
// TEST-017 통합 — audit_log_triggers 의 R4 sanitize 를 **실제 PostgreSQL(PGlite, in-process)** 에서
// PL/pgSQL 트리거 발화로 검증. 기존 audit-log-triggers-r4-sanitize.test.ts 는 TS 재현/정적 SQL
// 단언이라 "실 트리거 발화"를 못 봤다(= 게이트). 본 테스트는 prisma/migrations 의 실제 migration.sql
// (audit_sanitize_jsonb + audit_trigger_fn + 3 TRIGGER)을 PGlite 에 로드해 INSERT/UPDATE/DELETE 시
// AuditLog 자동 적재 + 자녀 의심 키 [REDACTED] 치환 + actorId GUC 캡처를 실 DB 로 검증한다.
//
// PGlite = Postgres 16 WASM → PL/pgSQL 함수·트리거를 실제 실행(pg-mem 미지원분). 외부 DB/CI service
// 불필요(vitest in-process). Supabase 스키마 전체가 아닌, 트리거가 거는 4개 테이블의 최소 스캐폴드만
// 생성(의심 키 컬럼 포함)하여 sanitize 동작을 노출.
//
// Refs: TASK_TEST-017.md (Scenario 1~7 + 7키 매트릭스 + smoke), DB-013, REQ-NF-019, R4.

import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "prisma/migrations/20260522210000_audit_log_triggers/migration.sql",
);

// 트리거가 거는 4개 테이블의 최소 스캐폴드 — 의심 키(realname/ssn/email/phone/address/birthdate)를
// 컬럼으로 포함해 to_jsonb(NEW) 의 키로 노출 → sanitize 동작 검증. 실 Supabase 스키마의 부분집합.
const SCAFFOLD = `
  CREATE TABLE "User" (
    id text PRIMARY KEY,
    role text,
    realname text,
    email text,
    phone text,
    ssn text,
    address text,
    birthdate text,
    "pipaUnderageConsentAt" timestamptz
  );
  CREATE TABLE "HITLQueue" (
    id text PRIMARY KEY,
    status text,
    "correctedScore" jsonb
  );
  CREATE TABLE "RewardLog" (
    id text PRIMARY KEY,
    "rewardType" text,
    amount integer,
    email text
  );
  CREATE TABLE "AuditLog" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "actorId" text NOT NULL,
    action text NOT NULL,
    "tableName" text NOT NULL,
    "rowId" text,
    diff jsonb,
    "createdAt" timestamptz NOT NULL DEFAULT now()
  );
`;

let db: PGlite;

/** AuditLog 의 마지막(또는 단일) row 조회 헬퍼. */
async function latestAudit(): Promise<{
  actorId: string;
  action: string;
  tableName: string;
  rowId: string | null;
  diff: Record<string, unknown>;
}> {
  const r = await db.query<{
    actorId: string;
    action: string;
    tableName: string;
    rowId: string | null;
    diff: Record<string, unknown>;
  }>(`SELECT "actorId", action, "tableName", "rowId", diff FROM "AuditLog" ORDER BY "createdAt" DESC, ctid DESC LIMIT 1`);
  return r.rows[0];
}

async function setActor(actor: string): Promise<void> {
  // 트리거의 current_setting('audit.actor_id', true) 가 읽는 세션 GUC — lib/db/with-actor 의 주입 모방.
  await db.query(`SELECT set_config('audit.actor_id', $1, false)`, [actor]);
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SCAFFOLD);
  // 실제 migration.sql 로드 — audit_sanitize_jsonb + audit_trigger_fn + 3 TRIGGER (테이블 선존 필요).
  const migration = fs.readFileSync(MIGRATION_PATH, "utf8");
  await db.exec(migration);
});

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec(
    `DELETE FROM "AuditLog"; DELETE FROM "User"; DELETE FROM "HITLQueue"; DELETE FROM "RewardLog";`,
  );
  await setActor(""); // 기본: GUC 비움 → 'system' fallback.
});

describe("TEST-017 통합 — audit_sanitize_jsonb 함수 (실 PL/pgSQL)", () => {
  it("[Scenario 6] 의심 키 9종 모두 [REDACTED] (realname/real_name/ssn/rrn/email/phone/address/birthdate/birthday)", async () => {
    for (const key of [
      "realname",
      "real_name",
      "ssn",
      "rrn",
      "email",
      "phone",
      "address",
      "birthdate",
      "birthday",
    ]) {
      const r = await db.query<{ out: Record<string, unknown> }>(
        `SELECT audit_sanitize_jsonb(jsonb_build_object($1::text, '민감값', 'score', 80)) AS out`,
        [key],
      );
      expect(r.rows[0].out[key], key).toBe("[REDACTED]");
      expect(r.rows[0].out.score, key).toBe(80);
    }
  });

  it("[Scenario 4] 비의심 키 false positive 0 — score/articulation/status 보존", async () => {
    const r = await db.query<{ out: Record<string, unknown> }>(
      `SELECT audit_sanitize_jsonb('{"score":80,"articulation":75,"status":"resolved"}'::jsonb) AS out`,
    );
    expect(r.rows[0].out).toEqual({ score: 80, articulation: 75, status: "resolved" });
  });

  it("[Scenario 3] 중첩 JSONB 재귀 sanitize — metadata.phone / child.birthdate", async () => {
    const r = await db.query<{ out: { metadata: Record<string, unknown>; child: Record<string, unknown> } }>(
      `SELECT audit_sanitize_jsonb('{"metadata":{"phone":"010-1234","note":"ok"},"child":{"birthdate":"2020-01-01","nick":"safe"}}'::jsonb) AS out`,
    );
    expect(r.rows[0].out.metadata.phone).toBe("[REDACTED]");
    expect(r.rows[0].out.metadata.note).toBe("ok");
    expect(r.rows[0].out.child.birthdate).toBe("[REDACTED]");
    expect(r.rows[0].out.child.nick).toBe("safe");
  });

  it("[smoke] pg_proc 에 audit_sanitize_jsonb / audit_trigger_fn 존재", async () => {
    const r = await db.query<{ name: string }>(
      `SELECT proname AS name FROM pg_proc WHERE proname IN ('audit_sanitize_jsonb','audit_trigger_fn') ORDER BY proname`,
    );
    expect(r.rows.map((x) => x.name)).toEqual(["audit_sanitize_jsonb", "audit_trigger_fn"]);
  });
});

describe("TEST-017 통합 — TRIGGER 발화 (실 INSERT/UPDATE/DELETE)", () => {
  it("[Scenario 7] RewardLog INSERT → AuditLog 1건(action=RewardLog_insert) + created sanitize", async () => {
    await db.query(
      `INSERT INTO "RewardLog" (id, "rewardType", amount, email) VALUES ('r1','star',1,'parent@x.com')`,
    );
    const a = await latestAudit();
    expect(a.action).toBe("RewardLog_insert");
    expect(a.tableName).toBe("RewardLog");
    expect(a.rowId).toBe("r1");
    const created = a.diff.created as Record<string, unknown>;
    expect(created.email).toBe("[REDACTED]"); // 의심 키
    expect(created.rewardType).toBe("star"); // 비의심 보존
    expect(created.amount).toBe(1);
    expect(a.actorId).toBe("system"); // GUC 미설정 → fallback
  });

  it("[Scenario 1+2] User UPDATE → action=User_update + before/after realname·email [REDACTED] + actorId GUC 캡처", async () => {
    await db.query(
      `INSERT INTO "User" (id, role, realname, email, "pipaUnderageConsentAt") VALUES ('u1','parent','홍길동','p@x.com', NULL)`,
    );
    await setActor("u1"); // withActor('u1', ...) 모방
    await db.query(`UPDATE "User" SET "pipaUnderageConsentAt" = now() WHERE id='u1'`);

    const a = await latestAudit();
    expect(a.action).toBe("User_update");
    expect(a.actorId).toBe("u1"); // GUC 캡처
    const before = a.diff.before as Record<string, unknown>;
    const after = a.diff.after as Record<string, unknown>;
    expect(before.realname).toBe("[REDACTED]");
    expect(before.email).toBe("[REDACTED]");
    expect(after.realname).toBe("[REDACTED]");
    expect(before.role).toBe("parent"); // 비의심 보존
    expect(after.role).toBe("parent");
  });

  it("[Scenario 1] User DELETE → action=User_delete + deleted wrapper sanitize", async () => {
    await db.query(`INSERT INTO "User" (id, role, ssn, phone) VALUES ('u2','parent','880101-1','010-9')`);
    await db.query(`DELETE FROM "User" WHERE id='u2'`);
    const a = await latestAudit();
    expect(a.action).toBe("User_delete");
    expect(a.rowId).toBe("u2");
    const deleted = a.diff.deleted as Record<string, unknown>;
    expect(deleted.ssn).toBe("[REDACTED]");
    expect(deleted.phone).toBe("[REDACTED]");
    expect(deleted.role).toBe("parent");
  });

  it("[Scenario 7] HITLQueue UPDATE → correctedScore JSONB 안의 의심 키 재귀 sanitize", async () => {
    await db.query(
      `INSERT INTO "HITLQueue" (id, status, "correctedScore") VALUES ('h1','pending','{"value":80}'::jsonb)`,
    );
    await db.query(
      `UPDATE "HITLQueue" SET status='resolved', "correctedScore"='{"value":85,"reviewer":{"email":"expert@x.com"}}'::jsonb WHERE id='h1'`,
    );
    const a = await latestAudit();
    expect(a.action).toBe("HITLQueue_update");
    const after = a.diff.after as { status: string; correctedScore: { value: number; reviewer: Record<string, unknown> } };
    expect(after.status).toBe("resolved");
    expect(after.correctedScore.value).toBe(85); // 비의심 보존
    expect(after.correctedScore.reviewer.email).toBe("[REDACTED]"); // 중첩 의심 키
  });

  it("[Scenario 5] actorId GUC 미설정 → 'system' fallback, sanitize 정상", async () => {
    // beforeEach 에서 setActor('') 로 비워둠 → NULLIF('','')=NULL → 'system'.
    await db.query(`INSERT INTO "RewardLog" (id,"rewardType",amount) VALUES ('r9','badge',1)`);
    const a = await latestAudit();
    expect(a.actorId).toBe("system");
    expect(a.action).toBe("RewardLog_insert");
  });

  it("회귀 가드 — 비의심 INSERT 도 audit 1건 적재(누락 없음) + 의심 키 0건이면 원본 보존", async () => {
    await db.query(`INSERT INTO "RewardLog" (id,"rewardType",amount) VALUES ('r3','tree',2)`);
    const rows = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM "AuditLog"`);
    expect(rows.rows[0].n).toBe(1);
    const a = await latestAudit();
    expect((a.diff.created as Record<string, unknown>).rewardType).toBe("tree");
  });
});
