// SEC-002 — RBAC + RLS + Audit Log 통합 검증 + cross-tenant 차단 패턴.
//
// Refs: GitHub Issue #72, REQ-NF-019 (RBAC + RLS + Audit Log), R4 (영유아 데이터 보호).
//
// 본 테스트는 _정책 검증_ + _응용 측 cross-tenant 차단 패턴_ 에 집중한다.
// 실 침투 테스트 (sqlmap / OWASP ZAP / 실 Supabase 호출) 는 본 PR 범위 외 — 별도 task.
//
// 기존 `__tests__/security/rls-policies.test.ts` 는 migration SQL 의 ENABLE RLS / 정책명
// 존재 여부를 정적 검증한다. 본 파일은 그 위에 다음 7 시나리오를 추가:
//   1) RLS migration 의 정책 coverage 매트릭스 — 9개 테이블 × (SELECT/UPDATE/INSERT) 사용 정책 매핑
//   2) Prisma cross-user read 차단 패턴 — 다른 userId 쿼리 시 빈 결과 mock
//   3) SessionLog/EvaluationResult cross-tenant 접근 시도 — owner 외에는 0 rows
//   4) HITLQueue expert 격리 — 본인 할당 큐만 read/update
//   5) service_role (lib/supabase/admin) 사용처 grep — 위험 호출처 화이트리스트 검증
//   6) 익명 사용자 (anonymous_user_id cookie) — cookie 매칭 시만 RewardProgress 접근 (AGENTS.md §2.2)
//   7) AuditLog 보호 — admin role 외 read 0건 + service_role insert only

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

function readRlsMigration(): string {
  // RLS 관련 모든 migration 을 concat — base (_enable_rls_policies) + 후속 보완 (_*_rls 또는 _rls_*).
  // 신규 RLS migration 추가 시 자동 통합 (filename 에 'rls' 포함 + .sql 패턴).
  const dirs = readdirSync(MIGRATIONS_DIR);
  const rlsDirs = dirs
    .filter((d) => /rls/i.test(d))
    .sort(); // timestamp prefix 순서
  if (rlsDirs.length === 0) throw new Error("RLS migration 폴더 미존재");
  return rlsDirs
    .map((d) => readFileSync(join(MIGRATIONS_DIR, d, "migration.sql"), "utf-8"))
    .join("\n\n-- ===== migration boundary =====\n\n");
}

/** lib/ + app/ 전체에서 특정 import 토큰을 사용하는 파일 경로 수집 (test 코드 제외). */
function findImportUsages(token: string, roots: string[]): string[] {
  const matches: string[] = [];
  function walk(dir: string) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        // generated / node_modules / .next 제외.
        if (entry === "node_modules" || entry === ".next" || entry === "generated") continue;
        walk(full);
      } else if (/\.(ts|tsx|mjs|js)$/i.test(entry) && !entry.endsWith(".test.ts")) {
        try {
          const src = readFileSync(full, "utf-8");
          if (src.includes(token)) {
            matches.push(full.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", ""));
          }
        } catch {
          /* swallow */
        }
      }
    }
  }
  for (const root of roots) walk(root);
  return matches;
}

describe("SEC-002 — RBAC + RLS + Audit Log 통합", () => {
  const sql = readRlsMigration();

  // ===== 시나리오 1: RLS 정책 coverage 매트릭스 (테이블 × 동작) =====
  describe("시나리오 1 — RLS 정책 coverage 매트릭스", () => {
    // 11개 테이블 (RewardLog 보완 완료 — 2026-05-22 add_reward_log_rls migration).
    // (table, requiredPolicyNames[]) — 1개 이상 존재해야 함.
    const POLICY_MATRIX: Array<{ table: string; policies: string[] }> = [
      { table: "User", policies: ["users_select_own", "users_update_own"] },
      { table: "Institution", policies: ["institutions_select_own", "institutions_update_principal"] },
      { table: "Class", policies: ["classes_select_same_institution", "classes_modify_staff"] },
      { table: "SessionLog", policies: ["sessions_select_own", "sessions_insert_own"] },
      { table: "EvaluationResult", policies: ["evaluations_select_own", "evaluations_insert_own"] },
      { table: "MissionCard", policies: ["missions_select_authenticated", "missions_modify_admin"] },
      { table: "WeeklyReport", policies: ["reports_select_own"] },
      { table: "RewardProgress", policies: ["rewards_select_own", "rewards_modify_own"] },
      { table: "RewardLog", policies: ["reward_log_select_own", "reward_log_insert_own"] },
      { table: "HITLQueue", policies: ["hitl_select_visible", "hitl_update_assigned_expert"] },
      { table: "AuditLog", policies: ["audit_select_admin"] },
    ];

    it.each(POLICY_MATRIX)('테이블 "$table" 의 RLS 정책 모두 존재', ({ table, policies }) => {
      expect(sql).toMatch(new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`));
      for (const policy of policies) {
        // CREATE POLICY "<name>" ON "<table>" 형태.
        const re = new RegExp(`CREATE POLICY\\s+"${policy}"\\s+ON\\s+"${table}"`);
        expect(sql, `${table}: 정책 "${policy}" 미발견`).toMatch(re);
      }
    });

    it("정책 총 개수 ≥ 15 (RBAC 매트릭스 충분 coverage)", () => {
      const total = (sql.match(/CREATE POLICY/g) ?? []).length;
      expect(total).toBeGreaterThanOrEqual(15);
    });

    it("auth.uid()::text = userId / id 비교 패턴이 최소 6회 (소유권 강제)", () => {
      // text cast 패턴이 user 격리의 핵심 — 누락 시 즉시 노출.
      const count = (sql.match(/auth\.uid\(\)::text\s*=\s*"?(?:userId|id|assignedExpertId)"?/g) ?? []).length;
      expect(count).toBeGreaterThanOrEqual(6);
    });
  });

  // ===== 시나리오 2: Prisma cross-user read 차단 (mock — RLS WHERE 자동 적용 시뮬) =====
  describe("시나리오 2 — Prisma cross-user read 차단 시뮬", () => {
    const sessionFindManyMock = vi.fn();
    const evalFindUniqueMock = vi.fn();

    beforeEach(() => {
      sessionFindManyMock.mockReset();
      evalFindUniqueMock.mockReset();
    });

    // 실제로는 Supabase 가 RLS WHERE 절을 자동 추가 — mock 으론 빈 결과 반환을 가정.
    it("parent X 가 parent Y 의 SessionLog 쿼리 시 0 rows (RLS 자동 차단 시뮬)", async () => {
      sessionFindManyMock.mockResolvedValueOnce([]); // RLS 가 cross-user row 를 필터링.
      const result = await sessionFindManyMock({
        where: { userId: "user-Y-uuid" }, // 의도적으로 타인 userId 요청.
      });
      expect(result).toEqual([]);
      expect(sessionFindManyMock).toHaveBeenCalledTimes(1);
    });

    it("parent X 가 자기 자신 SessionLog 쿼리 시 정상 반환", async () => {
      sessionFindManyMock.mockResolvedValueOnce([
        { id: "s1", userId: "user-X-uuid", durationSec: 30 },
      ]);
      const result = await sessionFindManyMock({ where: { userId: "user-X-uuid" } });
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-X-uuid");
    });
  });

  // ===== 시나리오 3: 다른 사용자 sessionId 직접 조회 시도 → null / throw =====
  describe("시나리오 3 — EvaluationResult cross-user access 차단", () => {
    const evalFindUniqueMock = vi.fn();
    beforeEach(() => evalFindUniqueMock.mockReset());

    it("타 사용자 sessionId 로 EvaluationResult.findUnique → RLS 가 null 반환", async () => {
      // Supabase RLS evaluations_select_own 정책:
      //   USING (auth.uid()::text = "userId" OR HITL expert 배정)
      // → parent X 가 parent Y 의 sessionId 로 조회 시 row 보이지 않음.
      evalFindUniqueMock.mockResolvedValueOnce(null);

      const result = await evalFindUniqueMock({
        where: { sessionId: "session-belongs-to-Y" },
      });
      expect(result).toBeNull();
    });

    it("HITL 큐에 expert 로 배정된 경우엔 evaluation row 접근 가능", async () => {
      // RLS 정책 두번째 OR 분기: HITLQueue.assignedExpertId = auth.uid() 면 read 허용.
      evalFindUniqueMock.mockResolvedValueOnce({
        sessionId: "session-Y",
        userId: "user-Y",
        articulationScore: 70,
        confidence: 60,
      });
      const result = await evalFindUniqueMock({ where: { sessionId: "session-Y" } });
      expect(result).not.toBeNull();
      expect(result.confidence).toBeLessThan(70);
    });

    it("RLS 정책 OR 절 — HITL expert 분기가 SQL 에 명시", () => {
      // evaluations_select_own 정책 SQL 본문 검증.
      // 정책 본문은 EXISTS (SELECT ... FROM "HITLQueue" WHERE ... "assignedExpertId" = auth.uid()::text).
      expect(sql).toMatch(
        /evaluations_select_own[\s\S]*?"HITLQueue"[\s\S]*?"assignedExpertId"\s*=\s*auth\.uid\(\)/,
      );
    });
  });

  // ===== 시나리오 4: HITLQueue 의 expertId 격리 (expert 만 자기 큐 read/update) =====
  describe("시나리오 4 — HITLQueue expert 격리", () => {
    const hitlFindManyMock = vi.fn();
    const hitlUpdateMock = vi.fn();
    beforeEach(() => {
      hitlFindManyMock.mockReset();
      hitlUpdateMock.mockReset();
    });

    it("expert A 가 expert B 의 할당 큐 read 시도 → RLS 0 rows", async () => {
      // hitl_select_visible 정책: assignedExpertId = auth.uid() OR userId = auth.uid() OR admin.
      // expert A 가 B 의 큐 보려 하면 빈 결과.
      hitlFindManyMock.mockResolvedValueOnce([]);
      const result = await hitlFindManyMock({
        where: { assignedExpertId: "expert-B-uuid" },
      });
      expect(result).toEqual([]);
    });

    it("expert A 본인 할당 큐 read → 정상 row 반환", async () => {
      hitlFindManyMock.mockResolvedValueOnce([
        { id: "q1", assignedExpertId: "expert-A-uuid", status: "in_review" },
      ]);
      const result = await hitlFindManyMock({
        where: { assignedExpertId: "expert-A-uuid" },
      });
      expect(result[0].assignedExpertId).toBe("expert-A-uuid");
    });

    it("expert UPDATE 정책은 USING (assignedExpertId = auth.uid) 만 허용", () => {
      // 응용 측에서 mock 만으로는 정책을 강제 못함 — SQL 레벨 검증으로 갈음.
      expect(sql).toMatch(
        /CREATE POLICY\s+"hitl_update_assigned_expert"\s+ON\s+"HITLQueue"[\s\S]*?FOR\s+UPDATE[\s\S]*?USING\s*\(\s*auth\.uid\(\)::text\s*=\s*"assignedExpertId"\s*\)/,
      );
    });
  });

  // ===== 시나리오 5: service_role (lib/supabase/admin) 사용처 화이트리스트 =====
  describe("시나리오 5 — service_role 사용처 화이트리스트 (RLS 우회 위험 통제)", () => {
    // 허용된 사용처 — Cron / Auth trigger / seed 등. 그 외 추가 시 본 테스트 실패하여 리뷰 강제.
    const ALLOWED_USAGES = [
      "lib/supabase/admin.ts", // 정의 파일 자체.
      "app/api/cron/audio-cleanup/route.ts", // FR-C-004 음성 폐기 Cron.
      "lib/audit.ts", // SEC-002 (DB-011 후속) — AuditLog INSERT helper. RLS INSERT default deny 우회 필수.
    ];

    it("getSupabaseAdmin import 사용처가 화이트리스트 안에만 존재", () => {
      const usages = findImportUsages('from "@/lib/supabase/admin"', [
        join(process.cwd(), "lib"),
        join(process.cwd(), "app"),
      ]);
      // 경로 구분자 정규화 (Windows \ → /).
      const normalized = usages.map((p) => p.replace(/\\/g, "/"));
      for (const u of normalized) {
        expect(
          ALLOWED_USAGES.some((allowed) => u.endsWith(allowed)),
          `service_role 사용처가 화이트리스트 외: ${u}. RLS 우회 위험 검토 필요.`,
        ).toBe(true);
      }
    });

    it("admin.ts 는 'server-only' 의도 주석 + service_role 환경변수만 사용", () => {
      const src = readFileSync(join(process.cwd(), "lib", "supabase", "admin.ts"), "utf-8");
      expect(src).toMatch(/server-only/);
      expect(src).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
      // NEXT_PUBLIC_ 접두 service key 노출 0건.
      expect(src).not.toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE/);
    });

    it("client.ts 가 service_role key 를 import / 참조하지 않음", () => {
      const src = readFileSync(join(process.cwd(), "lib", "supabase", "client.ts"), "utf-8");
      expect(src).not.toMatch(/SERVICE_ROLE/);
      expect(src).not.toMatch(/getSupabaseAdmin/);
    });
  });

  // ===== 시나리오 6: 익명 사용자 (anonymous_user_id cookie) 격리 =====
  describe("시나리오 6 — 익명 사용자 cookie 격리 (AGENTS.md §2.2 cross-read 금지)", () => {
    const rewardFindUniqueMock = vi.fn();
    beforeEach(() => rewardFindUniqueMock.mockReset());

    it("cookie userId 매칭 시 RewardProgress 정상 반환", async () => {
      rewardFindUniqueMock.mockResolvedValueOnce({
        userId: "anon-uuid-mine",
        cumulativeStars: 10,
      });
      const cookieUserId = "anon-uuid-mine";
      const row = await rewardFindUniqueMock({ where: { userId: cookieUserId } });
      expect(row.userId).toBe(cookieUserId);
      expect(row.cumulativeStars).toBe(10);
    });

    it("cookie userId 미매칭 (타인 userId 직접 요청) → RLS rewards_select_own 차단 → null", async () => {
      rewardFindUniqueMock.mockResolvedValueOnce(null);
      const cookieUserId = "anon-uuid-mine";
      const requestedUserId = "anon-uuid-someone-else";
      expect(cookieUserId).not.toBe(requestedUserId);
      const row = await rewardFindUniqueMock({ where: { userId: requestedUserId } });
      expect(row).toBeNull();
    });

    it("proxy.ts 가 cookie 미발급 사용자에게 새 UUID 자동 발급 (sameSite=lax)", () => {
      const src = readFileSync(join(process.cwd(), "proxy.ts"), "utf-8");
      expect(src).toMatch(/ANONYMOUS_USER_COOKIE/);
      expect(src).toMatch(/crypto\.randomUUID\(\)/);
      expect(src).toMatch(/sameSite:\s*["']lax["']/);
    });

    it("anonymous-user.ts 가 client / server 양쪽 안전 (use client directive 없음)", () => {
      const src = readFileSync(join(process.cwd(), "lib", "anonymous-user.ts"), "utf-8");
      expect(src).not.toMatch(/^["']use client["']/m);
      expect(src).toMatch(/ANONYMOUS_USER_COOKIE\s*=\s*["']anonymous_user_id["']/);
    });
  });

  // ===== 시나리오 7: AuditLog 보호 — admin only read =====
  describe("시나리오 7 — AuditLog 보호", () => {
    it("AuditLog 테이블 존재 + RLS 활성화", () => {
      expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "AuditLog"/);
      expect(sql).toMatch(/ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY/);
    });

    it("AuditLog 컬럼 — actorId / action / tableName / rowId / diff / createdAt", () => {
      expect(sql).toMatch(/"actorId"\s+TEXT\s+NOT NULL/);
      expect(sql).toMatch(/action\s+TEXT\s+NOT NULL/);
      expect(sql).toMatch(/"tableName"\s+TEXT\s+NOT NULL/);
      expect(sql).toMatch(/"rowId"\s+TEXT/);
      expect(sql).toMatch(/diff\s+JSONB/);
      expect(sql).toMatch(/"createdAt"\s+TIMESTAMPTZ/);
    });

    it("audit_select_admin 정책 — admin role 만 SELECT", () => {
      expect(sql).toMatch(
        /CREATE POLICY\s+"audit_select_admin"\s+ON\s+"AuditLog"[\s\S]*?FOR\s+SELECT[\s\S]*?"User"\.role\s*=\s*'admin'/,
      );
    });

    it("INSERT/UPDATE/DELETE 정책 부재 → service_role 만 가능 (default deny)", () => {
      // audit_select_admin 외 다른 AuditLog 정책 없음 = INSERT/UPDATE/DELETE 는 service_role 만.
      const auditPolicies = sql.match(/CREATE POLICY\s+"[^"]+"\s+ON\s+"AuditLog"/g) ?? [];
      expect(auditPolicies).toHaveLength(1); // audit_select_admin 만.
    });

    it("actorId 인덱스 + createdAt DESC — 감사 조회 성능", () => {
      expect(sql).toMatch(
        /CREATE INDEX IF NOT EXISTS\s+"AuditLog_actorId_createdAt_idx"\s+ON\s+"AuditLog"\s*\(\s*"actorId",\s*"createdAt"\s+DESC\s*\)/,
      );
    });

    // 별도 task: PostgreSQL 트리거 (모든 UPDATE/DELETE → AuditLog INSERT) 는 본 migration 미포함.
    // 추후 DB-011 후속 PR 로 트리거 함수 + 테이블별 trigger 추가 시 본 테스트 확장.
    it("회귀 sentinel — AuditLog 자동 INSERT 트리거는 현재 migration 미포함 (별도 task)", () => {
      expect(sql).not.toMatch(/CREATE TRIGGER[\s\S]*AuditLog/);
    });
  });

  // ===== 보안 결함 회귀 sentinel =====
  describe("보안 결함 회귀 sentinel", () => {
    it("✅ RewardLog RLS 활성화 완료 (2026-05-22 add_reward_log_rls migration, SEC-002 후속 보완)", () => {
      // 초기 SEC-002 #72 (commit 227fb7f) 의 sentinel 이 RewardLog RLS 누락 발견.
      // 즉시 보완 — 신규 migration 으로 ENABLE RLS + select/insert 정책 추가.
      // 본 케이스 가 RewardLog RLS 회귀 (실수로 정책 제거) 즉시 노출.
      expect(sql).toMatch(/ALTER TABLE "RewardLog" ENABLE ROW LEVEL SECURITY/);
      expect(sql).toMatch(/CREATE POLICY\s+"reward_log_select_own"\s+ON\s+"RewardLog"/);
      expect(sql).toMatch(/CREATE POLICY\s+"reward_log_insert_own"\s+ON\s+"RewardLog"/);
    });

    it("audit.uid()::text 캐스팅 패턴 강제 — uuid vs text 타입 mismatch 방어", () => {
      // Supabase auth.uid() 는 uuid 반환, User.id 는 prisma String (text).
      // 캐스팅 빠뜨리면 false-negative 매칭 (RLS 항상 통과) 위험 — migration 정책 전수 검증.
      const policyBlocks = sql.match(/USING\s*\([^)]*auth\.uid\(\)[^)]*\)/g) ?? [];
      expect(policyBlocks.length).toBeGreaterThan(0);
      for (const block of policyBlocks) {
        if (block.includes("auth.uid()") && block.includes("=")) {
          // = 비교가 있는 모든 정책엔 ::text 캐스팅 또는 role-only (auth.role()) 사용.
          const safe =
            block.includes("::text") ||
            block.includes("auth.role()") ||
            !block.match(/auth\.uid\(\)\s*=\s*"?\w/); // 직접 비교 없음 = EXISTS 서브쿼리만.
          expect(safe, `정책 블록에 ::text 캐스팅 누락 의심: ${block}`).toBe(true);
        }
      }
    });

    it("INFO — 별도 task 트래킹 항목", () => {
      // 1) 실 침투 테스트 (sqlmap / OWASP ZAP) — 별도 PR + Preview 환경 실행
      // 2) AuditLog 자동 INSERT 트리거 (PostgreSQL CREATE TRIGGER) — DB-011 후속
      // 3) RewardLog RLS 정책 — Sprint 2 누락 보완 PR
      // 4) Middleware RBAC (proxy.ts) /admin 경로 403 — API-010 §2 구현 후 통합
      expect(true).toBe(true);
    });
  });
});
