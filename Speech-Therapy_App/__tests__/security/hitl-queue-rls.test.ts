// DB-009 §RLS / #21 잔여 — HITLQueue 신규 5종 RLS 정책 정적 검증.
//
// 본 테스트는 20260522192300_add_hitl_queue_rls/migration.sql 의 정책 정의를
// SQL 텍스트 레벨에서 검증한다. 기존 enable_rls_policies migration 의 2개 정책
// (hitl_select_visible, hitl_update_assigned_expert) 은 rls-policies.test / rbac-rls.test
// 에서 이미 검증 — 본 파일은 _신규 5종만_ 책임.
//
// 시나리오:
//   1) RLS enable 문 존재 (idempotent 재실행 안전성)
//   2) 5개 정책 모두 존재 (이름 정합성)
//   3) 각 정책의 FOR 절 정확성 (SELECT / INSERT / UPDATE / DELETE)
//   4) USING / WITH CHECK 조건 SQL 정확성
//   5) 컬럼 이름 / JWT claim 패턴 정확성
//   6) 회귀 sentinel — 기존 2개 정책 미파괴 (drop 부재)

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

function readHitlQueueRlsMigration(): string {
  const dirs = readdirSync(MIGRATIONS_DIR);
  const target = dirs.find((d) => d.endsWith("_add_hitl_queue_rls"));
  if (!target) throw new Error("add_hitl_queue_rls migration 폴더 미존재");
  return readFileSync(join(MIGRATIONS_DIR, target, "migration.sql"), "utf-8");
}

/** SQL 본문만 추출 — `-- ...` 한 줄 주석 제거. 패턴 카운팅 시 comment noise 제거 목적. */
function stripSqlComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

function readEnableRlsMigration(): string {
  const dirs = readdirSync(MIGRATIONS_DIR);
  const target = dirs.find((d) => d.endsWith("_enable_rls_policies"));
  if (!target) throw new Error("enable_rls_policies migration 폴더 미존재");
  return readFileSync(join(MIGRATIONS_DIR, target, "migration.sql"), "utf-8");
}

describe("DB-009 §RLS — HITLQueue 신규 5종 RLS 정책", () => {
  const sql = readHitlQueueRlsMigration();

  describe("시나리오 1 — RLS enable 문 존재 (idempotent)", () => {
    it("ALTER TABLE HITLQueue ENABLE ROW LEVEL SECURITY 문 존재", () => {
      expect(sql).toMatch(/ALTER TABLE "HITLQueue" ENABLE ROW LEVEL SECURITY/);
    });
  });

  describe("시나리오 2 — 5개 정책 이름 정합성", () => {
    const REQUIRED_POLICIES = [
      "hitl_queue_select_own",
      "hitl_queue_select_expert",
      "hitl_queue_insert_system",
      "hitl_queue_update_expert",
      "hitl_queue_delete_admin",
    ];

    it.each(REQUIRED_POLICIES)('정책 "%s" 존재', (policyName) => {
      const re = new RegExp(`CREATE POLICY\\s+"${policyName}"\\s+ON\\s+"HITLQueue"`);
      expect(sql).toMatch(re);
    });

    it("총 5개 신규 정책 생성 (CREATE POLICY count)", () => {
      const count = (sql.match(/CREATE POLICY/g) ?? []).length;
      expect(count).toBe(5);
    });
  });

  describe("시나리오 3 — FOR 절 + USING/WITH CHECK 조건", () => {
    it("hitl_queue_select_own — FOR SELECT + auth.uid()::text = userId", () => {
      expect(sql).toMatch(
        /CREATE POLICY\s+"hitl_queue_select_own"\s+ON\s+"HITLQueue"\s+FOR\s+SELECT\s+USING\s*\(\s*auth\.uid\(\)::text\s*=\s*"userId"\s*\)/,
      );
    });

    it("hitl_queue_select_expert — FOR SELECT + JWT role IN (expert, admin, principal)", () => {
      expect(sql).toMatch(
        /CREATE POLICY\s+"hitl_queue_select_expert"\s+ON\s+"HITLQueue"\s+FOR\s+SELECT\s+USING\s*\(\s*\(\s*auth\.jwt\(\)\s*->>\s*'role'\s*\)\s+IN\s*\(\s*'expert',\s*'admin',\s*'principal'\s*\)\s*\)/,
      );
    });

    it("hitl_queue_insert_system — FOR INSERT + WITH CHECK (false) — default deny", () => {
      expect(sql).toMatch(
        /CREATE POLICY\s+"hitl_queue_insert_system"\s+ON\s+"HITLQueue"\s+FOR\s+INSERT\s+WITH\s+CHECK\s*\(\s*false\s*\)/,
      );
    });

    it("hitl_queue_update_expert — FOR UPDATE + JWT role IN (expert, admin)", () => {
      expect(sql).toMatch(
        /CREATE POLICY\s+"hitl_queue_update_expert"\s+ON\s+"HITLQueue"\s+FOR\s+UPDATE\s+USING\s*\(\s*\(\s*auth\.jwt\(\)\s*->>\s*'role'\s*\)\s+IN\s*\(\s*'expert',\s*'admin'\s*\)\s*\)/,
      );
    });

    it("hitl_queue_delete_admin — FOR DELETE + JWT role = admin", () => {
      expect(sql).toMatch(
        /CREATE POLICY\s+"hitl_queue_delete_admin"\s+ON\s+"HITLQueue"\s+FOR\s+DELETE\s+USING\s*\(\s*\(\s*auth\.jwt\(\)\s*->>\s*'role'\s*\)\s*=\s*'admin'\s*\)/,
      );
    });
  });

  describe("시나리오 4 — 컬럼 / JWT claim 정합성", () => {
    it('userId 컬럼명 "userId" 정확 (소문자 user_id 사용 금지)', () => {
      // schema.prisma 의 HITLQueue.userId 와 정확 일치.
      expect(sql).toMatch(/"userId"/);
      expect(sql).not.toMatch(/"user_id"/);
    });

    it("JWT role claim 패턴 — auth.jwt() ->> 'role' (text 캐스팅)", () => {
      const body = stripSqlComments(sql);
      const jwtPatternCount = (body.match(/auth\.jwt\(\)\s*->>\s*'role'/g) ?? []).length;
      // select_expert + update_expert + delete_admin 정책 본문에서 사용 — 총 3회 (주석 제외).
      expect(jwtPatternCount).toBe(3);
    });

    it("auth.uid()::text 캐스팅 패턴 (uuid vs text mismatch 방어)", () => {
      const body = stripSqlComments(sql);
      // select_own 정책 본문에서 사용 — 1회 (주석 제외).
      const uidPatternCount = (body.match(/auth\.uid\(\)::text/g) ?? []).length;
      expect(uidPatternCount).toBe(1);
    });
  });

  describe("시나리오 5 — 기존 enable_rls_policies 정책 미파괴 (sentinel)", () => {
    it("본 migration 은 DROP POLICY 문 부재 — 기존 정책 보존", () => {
      expect(sql).not.toMatch(/DROP POLICY/i);
    });

    it("기존 enable_rls_policies 의 hitl_select_visible / hitl_update_assigned_expert 보존", () => {
      const baseSql = readEnableRlsMigration();
      expect(baseSql).toMatch(/CREATE POLICY\s+"hitl_select_visible"\s+ON\s+"HITLQueue"/);
      expect(baseSql).toMatch(/CREATE POLICY\s+"hitl_update_assigned_expert"\s+ON\s+"HITLQueue"/);
    });

    it("신규 정책명은 hitl_queue_* 접두 — 기존 hitl_* 와 명확 구분 (정책명 unique 제약 회피)", () => {
      const newPolicyNames = (sql.match(/CREATE POLICY\s+"([^"]+)"/g) ?? []).map((m) =>
        m.replace(/CREATE POLICY\s+"/, "").replace(/"$/, ""),
      );
      expect(newPolicyNames.length).toBe(5);
      for (const name of newPolicyNames) {
        expect(name).toMatch(/^hitl_queue_/);
      }
    });
  });

  describe("시나리오 6 — 금칙어 / 보안 sentinel", () => {
    it("AGENTS.md §2.1 금칙어 (치료/진단/장애) 미사용 — SQL 주석 포함", () => {
      expect(sql).not.toMatch(/치료/);
      expect(sql).not.toMatch(/진단/);
      expect(sql).not.toMatch(/장애/);
    });

    it("INSERT WITH CHECK 가 (false) 인 정책 정확히 1개 — default deny 보장", () => {
      const body = stripSqlComments(sql);
      const denyCount = (body.match(/WITH\s+CHECK\s*\(\s*false\s*\)/g) ?? []).length;
      expect(denyCount).toBe(1);
    });
  });
});
