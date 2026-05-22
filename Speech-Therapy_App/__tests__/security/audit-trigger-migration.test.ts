// SEC-002 + DB-011 후속 — AuditLog PostgreSQL TRIGGER 자동 capture migration 정적 검증.
//
// 본 테스트는 _migration SQL 정적 검증_ 에 집중 — 실 DB 호출 / 실 row 변경 → AuditLog
// INSERT 발생 시나리오는 Preview 환경 통합 테스트 (별도 task) 로 격리.
//
// 검증 범위:
//   1) audit_trigger_fn 함수 정의 존재 (CREATE OR REPLACE FUNCTION + SECURITY DEFINER)
//   2) 3개 TRIGGER 등록 — User / HITLQueue / RewardLog
//   3) R4 sanitize 로직 존재 (audit_sanitize_jsonb 함수 + REDACTED 치환 패턴)
//   4) actor_id 주입 패턴 — current_setting('audit.actor_id', ...) + 'system' fallback
//   5) action 명명 규약 — TG_TABLE_NAME || '_' || lower(TG_OP) 형태
//   6) lib/audit.ts 와 중복 방지 — action 값 prefix 로 구분 (예: "RewardLog_insert" vs "reward_grant")
//   7) AuditLog INSERT 컬럼 매핑 (id / actorId / action / tableName / rowId / diff / createdAt)
//   8) audit_select_admin 정책 변경 없음 (회귀 sentinel)
//
// Refs:
//   - prisma/migrations/20260522210000_audit_log_triggers/migration.sql
//   - lib/audit.ts (commit 84076bf) — application-level helper (TRIGGER 와 보완 관계)
//   - REQ-NF-019 RBAC + Audit Log, R4 영유아 데이터 보호.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

/** audit_log_triggers migration SQL 로드. */
function readTriggerMigration(): string {
  const dirs = readdirSync(MIGRATIONS_DIR);
  const target = dirs.find((d) => d.endsWith("_audit_log_triggers"));
  if (!target) throw new Error("audit_log_triggers migration 폴더 미존재");
  return readFileSync(join(MIGRATIONS_DIR, target, "migration.sql"), "utf-8");
}

/** enable_rls_policies migration SQL 로드 — audit_select_admin 회귀 검증용. */
function readRlsBaseMigration(): string {
  const dirs = readdirSync(MIGRATIONS_DIR);
  const target = dirs.find((d) => d.endsWith("_enable_rls_policies"));
  if (!target) throw new Error("enable_rls_policies migration 폴더 미존재");
  return readFileSync(join(MIGRATIONS_DIR, target, "migration.sql"), "utf-8");
}

describe("SEC-002 + DB-011 — AuditLog PostgreSQL TRIGGER 자동 capture", () => {
  const sql = readTriggerMigration();

  // ===== 시나리오 1: audit_trigger_fn 함수 정의 =====
  describe("시나리오 1 — audit_trigger_fn 함수 정의", () => {
    it("CREATE OR REPLACE FUNCTION audit_trigger_fn 존재", () => {
      expect(sql).toMatch(
        /CREATE OR REPLACE FUNCTION\s+audit_trigger_fn\s*\(\s*\)\s+RETURNS\s+TRIGGER/i,
      );
    });

    it("SECURITY DEFINER 키워드 존재 — RLS INSERT default deny 우회", () => {
      // AuditLog INSERT 정책 부재 → service_role 만 가능. SECURITY DEFINER 가 동등 권한.
      expect(sql).toMatch(/SECURITY DEFINER/);
    });

    it("LANGUAGE plpgsql 명시", () => {
      expect(sql).toMatch(/LANGUAGE\s+plpgsql/);
    });

    it("TG_OP 별 분기 — INSERT / UPDATE / DELETE 모두 처리", () => {
      expect(sql).toMatch(/TG_OP\s*=\s*'UPDATE'/);
      expect(sql).toMatch(/TG_OP\s*=\s*'DELETE'/);
      // INSERT 는 ELSE 분기 — 명시 토큰 검증.
      expect(sql).toMatch(/'created'/);
    });
  });

  // ===== 시나리오 2: TRIGGER 3개 등록 =====
  describe("시나리오 2 — TRIGGER 3개 등록 (User / HITLQueue / RewardLog)", () => {
    it("User: AFTER UPDATE OR DELETE TRIGGER 등록", () => {
      expect(sql).toMatch(
        /CREATE TRIGGER\s+audit_user_changes\s+AFTER\s+UPDATE\s+OR\s+DELETE\s+ON\s+"User"/i,
      );
    });

    it("HITLQueue: AFTER UPDATE OR DELETE TRIGGER 등록", () => {
      expect(sql).toMatch(
        /CREATE TRIGGER\s+audit_hitl_changes\s+AFTER\s+UPDATE\s+OR\s+DELETE\s+ON\s+"HITLQueue"/i,
      );
    });

    it("RewardLog: AFTER INSERT TRIGGER 등록 (lib/audit.ts reward_grant 보완)", () => {
      expect(sql).toMatch(
        /CREATE TRIGGER\s+audit_reward_log_inserts\s+AFTER\s+INSERT\s+ON\s+"RewardLog"/i,
      );
    });

    it("모든 TRIGGER 가 EXECUTE FUNCTION audit_trigger_fn 호출", () => {
      const matches = sql.match(/EXECUTE FUNCTION\s+audit_trigger_fn\s*\(\s*\)/g) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(3);
    });

    it("DROP TRIGGER IF EXISTS 패턴 — 재실행 idempotent", () => {
      // migration replay (실수로 두 번 적용) 시 conflict 방지.
      const drops = sql.match(/DROP TRIGGER IF EXISTS\s+audit_\w+/g) ?? [];
      expect(drops.length).toBeGreaterThanOrEqual(3);
    });

    it("AFTER 시점 (BEFORE 아님) — 메인 트랜잭션 성공 후 audit 적재", () => {
      // BEFORE 트리거는 메인 INSERT/UPDATE 실패 시에도 audit 발생 → 잘못된 false 감사.
      expect(sql).not.toMatch(/BEFORE\s+(?:UPDATE|DELETE|INSERT)\s+ON\s+"(?:User|HITLQueue|RewardLog)"/i);
    });
  });

  // ===== 시나리오 3: R4 sanitize 로직 =====
  describe("시나리오 3 — R4 자녀 식별 정보 sanitize (강제 [REDACTED] 치환)", () => {
    it("audit_sanitize_jsonb 함수 정의 존재", () => {
      expect(sql).toMatch(
        /CREATE OR REPLACE FUNCTION\s+audit_sanitize_jsonb\s*\(\s*input\s+JSONB\s*\)\s+RETURNS\s+JSONB/i,
      );
    });

    it("[REDACTED] 치환 패턴 — 의심 키 값 강제 mask", () => {
      expect(sql).toMatch(/\[REDACTED\]/);
    });

    it("의심 키 패턴 — lib/audit.ts SUSPICIOUS_PAYLOAD_KEYS 와 정합", () => {
      // 핵심 의심 키워드 — realname / ssn / email / phone / address / birthdate.
      // lib/audit.ts 의 console.warn 패턴과 정합.
      const requiredPatterns = [
        "realname",
        "ssn",
        "email",
        "phone",
        "address",
        "birthdate",
      ];
      for (const pat of requiredPatterns) {
        expect(sql, `의심 키 "${pat}" 미정의`).toMatch(new RegExp(`'${pat}'`));
      }
    });

    it("audit_trigger_fn 안에서 to_jsonb 결과를 sanitize 통과", () => {
      // to_jsonb(OLD/NEW) 가 raw row 노출 — 반드시 audit_sanitize_jsonb 래핑.
      expect(sql).toMatch(/audit_sanitize_jsonb\s*\(\s*to_jsonb\s*\(\s*OLD\s*\)\s*\)/);
      expect(sql).toMatch(/audit_sanitize_jsonb\s*\(\s*to_jsonb\s*\(\s*NEW\s*\)\s*\)/);
    });

    it("중첩 object 재귀 sanitize — before/after wrapper 안쪽도 보호", () => {
      // jsonb_typeof check + 재귀 호출 패턴.
      expect(sql).toMatch(/jsonb_typeof/);
      // audit_sanitize_jsonb 가 자기 자신 호출 (재귀).
      const selfCalls = sql.match(/audit_sanitize_jsonb\s*\(/g) ?? [];
      // 정의 1 + to_jsonb 래핑 2 + 재귀 1 = 최소 4회 등장.
      expect(selfCalls.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ===== 시나리오 4: actor_id 주입 패턴 =====
  describe("시나리오 4 — actor_id 주입 (current_setting + system fallback)", () => {
    it("current_setting('audit.actor_id', true) 호출 존재", () => {
      // 두번째 인자 true = missing_ok (GUC 미설정 시 NULL 반환).
      expect(sql).toMatch(
        /current_setting\s*\(\s*'audit\.actor_id'\s*,\s*true\s*\)/,
      );
    });

    it("'system' fallback — GUC 미설정 시 anonymous actor 아닌 명시 사용자", () => {
      // COALESCE / NULLIF 패턴으로 빈 문자열 / NULL → 'system' fallback.
      expect(sql).toMatch(/'system'/);
    });

    it("후속 PR 메모 — lib/db.ts 의 SET LOCAL audit.actor_id 주입 미포함 (분리)", () => {
      // 본 migration 은 raw SQL 만 — lib/db.ts 수정 없음 정책.
      // 향후 lib/db.ts 트랜잭션 시작 시 SET LOCAL 호출 → TRIGGER 가 실 userId 캡처.
      expect(sql).toMatch(/lib\/db\.ts/i);
      expect(sql).toMatch(/후속/);
    });
  });

  // ===== 시나리오 5: action 명명 규약 =====
  describe("시나리오 5 — action 명명 규약 (lib/audit.ts 중복 방지)", () => {
    it("action = TG_TABLE_NAME || '_' || lower(TG_OP) 패턴", () => {
      // 예: "RewardLog_insert" / "User_update" / "HITLQueue_delete".
      expect(sql).toMatch(/TG_TABLE_NAME\s*\|\|\s*'_'\s*\|\|\s*lower\s*\(\s*TG_OP\s*\)/);
    });

    it("lib/audit.ts 의 AuditAction enum 과 _다른_ 형태 — 중복 X 보완", () => {
      // lib helper: "reward_grant" / "sign_in" 등 _의도_ 표현.
      // TRIGGER: "RewardLog_insert" / "User_update" 등 _raw_ 동작.
      // 같은 사건 (reward 발급) 도 2 row 적재 — action prefix 로 구분 분석 가능.
      const libActions = ["reward_grant", "sign_in", "consent_sign", "hitl_assign"];
      for (const a of libActions) {
        // TRIGGER 본문에 lib helper 의 의도 액션명이 직접 등장하면 안 됨 (중복 위험).
        expect(sql).not.toMatch(new RegExp(`v_action\\s*:=\\s*'${a}'`));
      }
    });
  });

  // ===== 시나리오 6: AuditLog INSERT 컬럼 매핑 =====
  describe("시나리오 6 — AuditLog INSERT 컬럼 매핑", () => {
    it("INSERT 문이 7개 컬럼 모두 명시 (id / actorId / action / tableName / rowId / diff / createdAt)", () => {
      expect(sql).toMatch(
        /INSERT INTO\s+"AuditLog"\s*\(\s*id\s*,\s*"actorId"\s*,\s*action\s*,\s*"tableName"\s*,\s*"rowId"\s*,\s*diff\s*,\s*"createdAt"\s*\)/,
      );
    });

    it("id 컬럼은 gen_random_uuid() 사용 (DEFAULT 의존 X, 명시 INSERT)", () => {
      expect(sql).toMatch(/gen_random_uuid\s*\(\s*\)/);
    });

    it("createdAt 은 now() — TRIGGER 발화 시점 캡처", () => {
      expect(sql).toMatch(/now\s*\(\s*\)/);
    });

    it("rowId 추출 — TG_OP DELETE 면 OLD.id, 그 외 NEW.id", () => {
      expect(sql).toMatch(/OLD\.id::text/);
      expect(sql).toMatch(/NEW\.id::text/);
    });
  });

  // ===== 시나리오 7: 회귀 sentinel — audit_select_admin 정책 불변 =====
  describe("시나리오 7 — 회귀 sentinel (audit_select_admin 정책 불변)", () => {
    const baseSql = readRlsBaseMigration();

    it("audit_select_admin 정책은 enable_rls_policies 에 그대로 — 본 migration 영향 없음", () => {
      expect(baseSql).toMatch(/CREATE POLICY\s+"audit_select_admin"\s+ON\s+"AuditLog"/);
      // 본 trigger migration 은 정책 변경 0건.
      expect(sql).not.toMatch(/DROP POLICY/);
      expect(sql).not.toMatch(/CREATE POLICY\s+"audit_select_admin"/);
    });

    it("본 migration 은 ALTER TABLE ENABLE/DISABLE RLS 변경 0건", () => {
      // RLS 토글은 별도 migration 책임. 본 PR 은 TRIGGER 만.
      expect(sql).not.toMatch(/ALTER TABLE[\s\S]*?(ENABLE|DISABLE)\s+ROW LEVEL SECURITY/);
    });

    it("금칙어 (치료/진단/장애) SQL 본문에 미사용 (AGENTS.md §2.1)", () => {
      // 함수명 / 주석 / action 값 모두 금칙어 없음 보장.
      expect(sql).not.toMatch(/치료/);
      expect(sql).not.toMatch(/진단/);
      expect(sql).not.toMatch(/장애/);
    });
  });

  // ===== 시나리오 8: lib/audit.ts 와의 보완 관계 검증 =====
  describe("시나리오 8 — lib/audit.ts 와의 보완 관계 (중복 X)", () => {
    it("lib/audit.ts SUSPICIOUS_PAYLOAD_KEYS 와 TRIGGER sanitize 패턴 정합", () => {
      const libSrc = readFileSync(
        join(process.cwd(), "lib", "audit.ts"),
        "utf-8",
      );
      // lib helper 의 의심 키 (소문자) 가 TRIGGER 함수에도 정의되어 있어야 함.
      // 핵심 4종만 spot-check — 전수 검증은 시나리오 3 에서 별도.
      const overlapKeys = ["ssn", "email", "phone", "address"];
      for (const k of overlapKeys) {
        expect(libSrc).toMatch(new RegExp(`"${k}"`));
        expect(sql).toMatch(new RegExp(`'${k}'`));
      }
    });

    it("보완 관계 명시 — migration 주석에 lib/audit.ts 와의 분담 설명", () => {
      expect(sql).toMatch(/lib\/audit\.ts/);
      expect(sql).toMatch(/보완/);
    });
  });
});
