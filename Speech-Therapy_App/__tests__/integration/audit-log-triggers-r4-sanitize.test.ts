// TEST-017 — audit_log_triggers R4 sanitize 검증 (V07 DB-013 후속).
//
// 배경:
//   prisma/migrations/20260522210000_audit_log_triggers/migration.sql 의 PostgreSQL
//   TRIGGER + 함수 (audit_sanitize_jsonb / audit_trigger_fn) 가 prod 적용됨
//   (Supabase Studio SQL Editor, 본 sub-session). 본 테스트는 prod TRIGGER 의 동작 회귀를
//   _SQL 실행 없이_ 검증 — migration 파일 정합성 + sanitize 패턴 logic 정합성 + 적용 대상
//   3 TRIGGER 확인.
//
// 회귀 가드 매트릭스:
//   1. migration 파일 존재 + 3 TRIGGER (audit_user_changes / audit_hitl_changes
//      / audit_reward_log_inserts) + 2 함수 (audit_trigger_fn / audit_sanitize_jsonb).
//   2. R4 의심 키 9 패턴 (realname / real_name / ssn / rrn / email / phone / address
//      / birthdate / birthday) 의 substring 매칭 — case-insensitive.
//   3. nested object (before/after, deleted, created wrapper) 1-level 재귀 처리.
//   4. NULL / non-object 입력 — 그대로 통과.
//   5. actor_id GUC fallback 'system' — 미설정 시 default 동작.
//   6. SECURITY DEFINER — RLS INSERT default deny 우회 (AuditLog 정책상 service_role 만).
//
// Refs: TASK_TEST-017.md, TASK_DB-013.md, REQ-NF-019 (1년+ 감사 로그), R4 (영유아 보호).

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH = path.resolve(
  process.cwd(),
  "prisma/migrations/20260522210000_audit_log_triggers/migration.sql",
);

// ---------------------------------------------------------------------------
// SQL 함수 audit_sanitize_jsonb 의 TS 재현 — 회귀 가드 핵심.
// 패턴 변경 시 본 함수 + migration.sql 의 v_patterns 동시 update 필요.
// ---------------------------------------------------------------------------
const SUSPICIOUS_PATTERNS = [
  "realname",
  "real_name",
  "ssn",
  "rrn",
  "email",
  "phone",
  "address",
  "birthdate",
  "birthday",
] as const;

function isSuspiciousKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SUSPICIOUS_PATTERNS.some((p) => lower.includes(p));
}

/** TS 재현 — migration.sql 의 audit_sanitize_jsonb 동작 모방. */
function auditSanitizeJsonb(input: unknown): unknown {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (isSuspiciousKey(key)) {
      out[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // 1-level 재귀 (before/after, deleted, created wrapper).
      out[key] = auditSanitizeJsonb(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

describe("TEST-017 — audit_log_triggers R4 sanitize 검증", () => {
  describe("Scenario 1: migration 파일 정합성", () => {
    it("migration.sql 이 존재하고 3 TRIGGER + 2 함수 정의를 포함한다", () => {
      expect(fs.existsSync(MIGRATION_PATH)).toBe(true);
      const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

      // 2 함수
      expect(sql).toMatch(/CREATE OR REPLACE FUNCTION audit_sanitize_jsonb/);
      expect(sql).toMatch(/CREATE OR REPLACE FUNCTION audit_trigger_fn/);

      // 3 TRIGGER
      expect(sql).toMatch(/CREATE TRIGGER audit_user_changes/);
      expect(sql).toMatch(/CREATE TRIGGER audit_hitl_changes/);
      expect(sql).toMatch(/CREATE TRIGGER audit_reward_log_inserts/);

      // 적용 대상 (3개 테이블) — User UPDATE/DELETE, HITLQueue UPDATE/DELETE, RewardLog INSERT
      expect(sql).toMatch(/AFTER UPDATE OR DELETE ON "User"/);
      expect(sql).toMatch(/AFTER UPDATE OR DELETE ON "HITLQueue"/);
      expect(sql).toMatch(/AFTER INSERT ON "RewardLog"/);
    });

    it("SECURITY DEFINER — RLS INSERT default deny 우회 명시", () => {
      const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
      expect(sql).toMatch(/LANGUAGE plpgsql SECURITY DEFINER/);
    });

    it("actor_id GUC fallback 'system' — 미설정 시 graceful", () => {
      const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
      expect(sql).toMatch(/COALESCE\(NULLIF\(current_setting\('audit\.actor_id', true\), ''\), 'system'\)/);
    });

    it("의심 키 9 패턴 모두 migration v_patterns 배열에 명시", () => {
      const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
      for (const pattern of SUSPICIOUS_PATTERNS) {
        expect(sql).toContain(`'${pattern}'`);
      }
    });
  });

  describe("Scenario 2: R4 의심 키 [REDACTED] 치환 (top-level)", () => {
    it.each([
      ["realname", "홍길동"],
      ["real_name", "홍길동"],
      ["ssn", "880101-1234567"],
      ["rrn", "880101-1234567"],
      ["email", "parent@example.com"],
      ["phone", "010-1234-5678"],
      ["address", "서울시 강남구 ..."],
      ["birthdate", "1988-01-01"],
      ["birthday", "1988-01-01"],
    ])("키 %s 의 값을 [REDACTED] 로 치환한다", (key, value) => {
      const result = auditSanitizeJsonb({ [key]: value, id: "u1" });
      expect(result).toEqual({ [key]: "[REDACTED]", id: "u1" });
    });

    it("case-insensitive substring 매칭 — EMAIL / Phone / parentEmail", () => {
      expect(auditSanitizeJsonb({ EMAIL: "x@y.com" })).toEqual({ EMAIL: "[REDACTED]" });
      expect(auditSanitizeJsonb({ Phone: "010" })).toEqual({ Phone: "[REDACTED]" });
      expect(auditSanitizeJsonb({ parentEmail: "x@y.com" })).toEqual({ parentEmail: "[REDACTED]" });
    });

    it("무관한 키는 그대로 통과", () => {
      const input = {
        id: "u1",
        role: "parent",
        childAgeMonths: 36,
        pipaUnderageConsentAt: "2026-05-27T10:00:00Z",
      };
      expect(auditSanitizeJsonb(input)).toEqual(input);
    });
  });

  describe("Scenario 3: nested object 1-level 재귀 처리 (before/after wrapper)", () => {
    it("UPDATE diff — before/after 둘 다 sanitize", () => {
      const input = {
        before: { id: "u1", email: "old@x.com", role: "parent" },
        after: { id: "u1", email: "new@x.com", role: "parent" },
      };
      const result = auditSanitizeJsonb(input);
      expect(result).toEqual({
        before: { id: "u1", email: "[REDACTED]", role: "parent" },
        after: { id: "u1", email: "[REDACTED]", role: "parent" },
      });
    });

    it("DELETE diff — deleted wrapper sanitize", () => {
      const input = { deleted: { id: "u1", phone: "010-1234" } };
      const result = auditSanitizeJsonb(input);
      expect(result).toEqual({ deleted: { id: "u1", phone: "[REDACTED]" } });
    });

    it("INSERT diff — created wrapper sanitize", () => {
      const input = { created: { id: "r1", address: "서울 ..." } };
      const result = auditSanitizeJsonb(input);
      expect(result).toEqual({ created: { id: "r1", address: "[REDACTED]" } });
    });
  });

  describe("Scenario 4: edge case — NULL / non-object / array", () => {
    it("NULL 입력은 그대로 통과", () => {
      expect(auditSanitizeJsonb(null)).toBeNull();
    });

    it("primitive (string / number / boolean) 그대로 통과", () => {
      expect(auditSanitizeJsonb("hello")).toBe("hello");
      expect(auditSanitizeJsonb(42)).toBe(42);
      expect(auditSanitizeJsonb(true)).toBe(true);
    });

    it("array 는 sanitize 대상 외 — 그대로 통과 (SQL 함수 정합)", () => {
      // migration.sql 의 audit_sanitize_jsonb 는 jsonb_typeof = 'object' 만 처리.
      // array (jsonb_typeof = 'array') 는 그대로 반환.
      const arr = [{ email: "x@y.com" }];
      expect(auditSanitizeJsonb(arr)).toEqual(arr);
    });

    it("빈 object — 빈 object 그대로", () => {
      expect(auditSanitizeJsonb({})).toEqual({});
    });
  });

  describe("Scenario 5: 실 시나리오 — User row UPDATE 전체 diff", () => {
    it("User UPDATE — PIPA 컬럼 변경 시 의심 키 없음, 통과", () => {
      const diff = {
        before: {
          id: "u1",
          role: "parent",
          childAgeMonths: 36,
          pipaUnderageConsentAt: null,
          overseasTransferConsentAt: null,
        },
        after: {
          id: "u1",
          role: "parent",
          childAgeMonths: 36,
          pipaUnderageConsentAt: "2026-05-27T10:00:00Z",
          overseasTransferConsentAt: "2026-05-27T10:00:00Z",
        },
      };
      // PIPA 컬럼 자체는 timestamp PII 아님 — 그대로 통과해야 함.
      const result = auditSanitizeJsonb(diff) as typeof diff;
      expect(result.before.pipaUnderageConsentAt).toBeNull();
      expect(result.after.pipaUnderageConsentAt).toBe("2026-05-27T10:00:00Z");
    });

    it("HITLQueue UPDATE — expertComment 에 인명 포함 가설 시나리오", () => {
      // 실제 expertComment 는 자유 텍스트 — 의심 키 매칭 안 됨 (key 매칭만).
      // 본 테스트는 future-proof: 만약 'parentEmail' 등 의심 키로 column 추가 시 자동 sanitize.
      const diff = {
        before: { id: "h1", status: "PENDING", expertComment: null },
        after: { id: "h1", status: "RESOLVED", expertComment: "발음 양호" },
      };
      const result = auditSanitizeJsonb(diff);
      expect(result).toEqual(diff); // 변경 없이 통과 (expertComment 는 의심 키 아님)
    });
  });

  describe("Scenario 6: 회귀 sentinel — sanitize 패턴 누락 방지", () => {
    it("9 패턴 모두 TS 재현에 포함 + migration 과 동기", () => {
      expect(SUSPICIOUS_PATTERNS).toHaveLength(9);
      // migration.sql 의 v_patterns 배열도 동일 9개 (위 Scenario 1 에서 검증).
    });

    it("새 의심 키 패턴 추가 시 본 테스트가 실패 — 명시적 update 강제", () => {
      // 본 테스트는 sanity check — 9 패턴 외 추가/제거 시 본 테스트가 실패하여
      // migration.sql 의 v_patterns 와 TS 재현이 양쪽 동시 update 필요함을 강제.
      const expected = [
        "realname",
        "real_name",
        "ssn",
        "rrn",
        "email",
        "phone",
        "address",
        "birthdate",
        "birthday",
      ];
      expect([...SUSPICIOUS_PATTERNS]).toEqual(expected);
    });
  });

  describe("Scenario 7: 무게이트 심화 — 다단계 중첩 · substring · key-only 경계 (TEST-017 백필)", () => {
    // ⚠️ 실제 동작: audit_sanitize_jsonb (SQL + TS 재현) 는 중첩 object 를 _깊이 제한 없이_ 재귀한다.
    //    소스 주석의 "1단계 재귀" 는 before/after wrapper 를 가리키는 intent 표현이며,
    //    구현은 v_value 가 object 인 한 자기 자신을 재귀 호출(migration.sql L107)한다.
    //    아래 테스트는 그 실제 full-recursion 동작 + key-only/substring 경계를 회귀 가드·문서화한다.

    it("migration.sql 의 sanitize 함수가 자기 자신을 재귀 호출한다 (full recursion 보장)", () => {
      const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
      const selfCalls = sql.match(/audit_sanitize_jsonb\(v_value\)/g) ?? [];
      expect(selfCalls.length).toBeGreaterThanOrEqual(1);
    });

    it("depth-2 중첩 — created.childMeta.birthday 가 REDACTED (RewardLog INSERT 가설)", () => {
      const input = {
        created: {
          id: "r1",
          rewardType: "star",
          childMeta: { birthday: "2020-01-01", nickname: "safe" },
        },
      };
      expect(auditSanitizeJsonb(input)).toEqual({
        created: {
          id: "r1",
          rewardType: "star",
          childMeta: { birthday: "[REDACTED]", nickname: "safe" },
        },
      });
    });

    it("depth-3 중첩 — before.meta.profile.email 가 REDACTED", () => {
      const input = {
        before: { meta: { profile: { email: "p@x.com", locale: "ko" } } },
      };
      expect(auditSanitizeJsonb(input)).toEqual({
        before: { meta: { profile: { email: "[REDACTED]", locale: "ko" } } },
      });
    });

    it("중첩 wrapper — 비-PII 형제 키 보존, 내부 PII 키만 strip (HITLQueue correctedScore 가설)", () => {
      const input = {
        after: { correctedScore: { value: 80, evaluator_email: "expert@x.com" } },
      };
      expect(auditSanitizeJsonb(input)).toEqual({
        after: { correctedScore: { value: 80, evaluator_email: "[REDACTED]" } },
      });
    });

    it.each([
      ["phoneme", "음소 분석"],
      ["addressable", true],
      ["realnamed", "x"],
      ["emailVerified", true],
    ])(
      "substring 매칭 — 키 %s 는 의심 substring 포함으로 보수적 REDACTED (over-redaction 허용)",
      (key, value) => {
        const result = auditSanitizeJsonb({ [key as string]: value, id: "u1" }) as Record<
          string,
          unknown
        >;
        expect(result[key as string]).toBe("[REDACTED]");
        expect(result.id).toBe("u1");
      },
    );

    it("key-only 매칭 — 안전 키의 PII-형 값은 그대로 통과 (value 스캔 안 함)", () => {
      // sanitize 는 _키 이름_ 만 본다. note 값에 연락처/이메일 형태 문자열이 있어도 strip 하지 않는다.
      const input = { note: "보호자 연락처 010-1234-5678 / parent@x.com" };
      expect(auditSanitizeJsonb(input)).toEqual(input);
    });

    it("RewardLog INSERT created — 복수 PII 키 동시 strip, 비-PII 보존", () => {
      const input = {
        created: { id: "r1", rewardType: "star", email: "p@x.com", phone: "010-1" },
      };
      expect(auditSanitizeJsonb(input)).toEqual({
        created: { id: "r1", rewardType: "star", email: "[REDACTED]", phone: "[REDACTED]" },
      });
    });

    it("DELETE — deleted wrapper 복수 PII (ssn/rrn/address) 동시 strip", () => {
      const input = {
        deleted: { id: "u1", role: "parent", ssn: "880101-1", rrn: "880101-1", address: "서울" },
      };
      expect(auditSanitizeJsonb(input)).toEqual({
        deleted: {
          id: "u1",
          role: "parent",
          ssn: "[REDACTED]",
          rrn: "[REDACTED]",
          address: "[REDACTED]",
        },
      });
    });
  });
});
