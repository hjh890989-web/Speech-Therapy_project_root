// SEC-003 (단순화 모드) — 동의서 전자서명 일반 웹 폼 공격 검증.
//
// Refs: GitHub Issue #73, REQ-FUNC-059~061 (전자서명 라이프사이클),
//       REQ-NF-019 (RBAC + 보안), R4 (영유아 데이터 보호),
//       검토 보고서 §2.2 [추가 E2] (카카오 전자서명 미연동 → 일반 웹폼 자체 보안 강화).
//
// 본 테스트는 _정적 + 단위 검증_ 위주. 실 침투 테스트 (sqlmap / OWASP ZAP / 실 Vercel
// Preview 환경 호출) 는 본 PR 범위 외 — 별도 task (SEC-002 침투 시나리오 통합 시).
//
// 7 시나리오 매핑 (issue #73 Acceptance Criteria 와 별개로 단순화 폼 공격 표면 기준):
//   1) XSS 차단 — <script>, javascript:, onerror= 등 입력 → Zod 가 거부 또는 sanitize
//   2) Length 폭주 — 100KB+ 문자열 입력 → Zod max() 강제 차단
//   3) SQL injection 패턴 — Prisma parameter binding 가 자동 차단 (정적 — string() 만 사용)
//   4) Replay 공격 — idempotencyKey / nonce / timestamp 검증 (현재 schema 미반영 → 후속 task sentinel)
//   5) CSRF 보호 — proxy.ts cookie sameSite=lax + Origin 검증 (정적 검증 + 후속 task)
//   6) Empty / null 입력 차단 — required 필드 누락 → 400 응답
//   7) 부정 형식 (이메일 / 전화) — invalid format → Zod 거부 → 400 응답

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ConsentCreateInputSchema,
  ConsentConfirmInputSchema,
} from "@/lib/schemas/consent";
import { POST } from "@/app/api/consent/sign/route";

const PROJECT_ROOT = process.cwd();
const SCHEMA_SRC = readFileSync(
  join(PROJECT_ROOT, "lib", "schemas", "consent.ts"),
  "utf-8",
);
const ROUTE_SRC = readFileSync(
  join(PROJECT_ROOT, "app", "api", "consent", "sign", "route.ts"),
  "utf-8",
);
const PROXY_SRC = readFileSync(join(PROJECT_ROOT, "proxy.ts"), "utf-8");

/** valid baseline payload — 시나리오 별 단일 필드만 변조하기 위한 baseline. */
function makeValidCreatePayload(overrides: Record<string, unknown> = {}) {
  return {
    institutionId: "11111111-1111-4111-8111-111111111111",
    parentEmail: "parent@example.com",
    parentPhone: "+82-10-1234-5678",
    childNickname: "별이",
    childAgeMonths: 36,
    ...overrides,
  };
}

function makeValidConfirmPayload(overrides: Record<string, unknown> = {}) {
  return {
    token: "55555555-5555-4555-8555-555555555555",
    agreed: true as const,
    signedName: "홍길동",
    ...overrides,
  };
}

/** POST 호출 — Request body 를 JSON 으로 직렬화. */
async function postSign(body: unknown): Promise<{ status: number; payload: unknown }> {
  const req = new Request("http://localhost/api/consent/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  const payload = await res.json();
  return { status: res.status, payload };
}

describe("SEC-003 — 동의서 전자서명 보안 검증 (XSS/length/replay/CSRF)", () => {
  // ===== 시나리오 1: XSS 차단 =====
  describe("시나리오 1 — XSS 페이로드 차단", () => {
    // childNickname / signedName / parentEmail 에 XSS payload 주입.
    // Zod 가 명시적 sanitize 는 안 하지만, max length / regex / email format 으로
    // 대부분 차단됨. <script> 자체는 string 으로 통과 가능 — 따라서 _렌더 측_
    // (React 의 기본 escape) + max length 이중 방어 패턴 검증.
    const XSS_PAYLOADS = [
      "<script>alert(1)</script>",
      "javascript:alert(document.cookie)",
      "<img src=x onerror=alert(1)>",
      "\"><svg/onload=alert(1)>",
    ];

    it.each(XSS_PAYLOADS)('XSS payload "%s" - parentEmail (email format) 거부', (payload) => {
      const result = ConsentCreateInputSchema.safeParse(
        makeValidCreatePayload({ parentEmail: payload }),
      );
      expect(result.success).toBe(false);
    });

    it.each(XSS_PAYLOADS)('XSS payload "%s" - parentPhone (regex) 거부', (payload) => {
      const result = ConsentCreateInputSchema.safeParse(
        makeValidCreatePayload({ parentPhone: payload }),
      );
      expect(result.success).toBe(false);
    });

    it("childNickname 의 max(20) 가 100자+ XSS payload 차단", () => {
      const longXss = "<script>" + "a".repeat(50) + "</script>";
      const result = ConsentCreateInputSchema.safeParse(
        makeValidCreatePayload({ childNickname: longXss }),
      );
      expect(result.success).toBe(false);
    });

    it("✅ SEC-003 패치 — childNickname 짧은 XSS (예: '<a>') 는 sanitize transform 으로 escape", () => {
      // 이전 sentinel: Zod 에 sanitize 미적용 → React escape 의존.
      // 패치 후 (SEC-003): lib/schemas/consent.ts sanitizeNickname 인라인 regex 가
      // `<`, `>`, `&`, `"`, `'`, `javascript:` 등 위험 문자 escape (HTML entity).
      // 별도 task: DOMPurify 정식 통합 (npm 의존성 추가).
      const shortXss = "<a>x</a>"; // 8자 — max(20) 통과 → transform 으로 entity escape.
      const result = ConsentCreateInputSchema.safeParse(
        makeValidCreatePayload({ childNickname: shortXss }),
      );
      expect(result.success).toBe(true);
      // 핵심 검증: transform 결과가 escape 된 안전한 문자열인지.
      expect(result.success && result.data.childNickname).toBe(
        "&lt;a&gt;x&lt;/a&gt;",
      );
      // 원본 XSS 토큰 (`<`, `>`) 은 결과에 없어야 함.
      expect(result.success && result.data.childNickname).not.toMatch(/[<>]/);
    });

    it("signedName 의 max(50) — 50자 이내 XSS 는 통과 (renderer 측 escape 의존)", () => {
      // 동일 sentinel — confirm 입력도 sanitize 부재.
      const shortXss = "<img src=x>"; // 11자.
      const result = ConsentConfirmInputSchema.safeParse(
        makeValidConfirmPayload({ signedName: shortXss }),
      );
      expect(result.success).toBe(true); // 후속 task — transform 단계 sanitize 검토.
    });
  });

  // ===== 시나리오 2: Length 폭주 (DoS / buffer 폭발) =====
  describe("시나리오 2 — Length 폭주 차단", () => {
    it("childNickname 100KB 입력 → max(20) 차단", () => {
      const huge = "a".repeat(100_000);
      const result = ConsentCreateInputSchema.safeParse(
        makeValidCreatePayload({ childNickname: huge }),
      );
      expect(result.success).toBe(false);
    });

    it("✅ SEC-003 패치 — parentEmail 1MB 입력 → .max(254) (RFC 5321) 거부", () => {
      // 이전 sentinel: Zod v4 email() 은 RFC local-part 64자 제약 미강제 → 1MB 통과.
      // 패치 후 (SEC-003): lib/schemas/consent.ts parentEmail 에 .max(254) (RFC 5321 total) 추가.
      const huge = "a".repeat(1_000_000) + "@example.com";
      const result = ConsentCreateInputSchema.safeParse(
        makeValidCreatePayload({ parentEmail: huge }),
      );
      expect(result.success).toBe(false);
    });

    it("parentPhone 100KB 입력 → regex (8-20자) 차단", () => {
      const huge = "0".repeat(100_000);
      const result = ConsentCreateInputSchema.safeParse(
        makeValidCreatePayload({ parentPhone: huge }),
      );
      expect(result.success).toBe(false);
    });

    it("signedName 100KB 입력 → max(50) 차단 (confirm endpoint)", () => {
      const huge = "X".repeat(100_000);
      const result = ConsentConfirmInputSchema.safeParse(
        makeValidConfirmPayload({ signedName: huge }),
      );
      expect(result.success).toBe(false);
    });

    it("Zod schema 의 모든 string 필드에 max() 명시 (정적 — buffer 폭발 방어)", () => {
      // childNickname max(20), signedName max(50). parentEmail/Phone 은
      // regex / email format 으로 사실상 길이 제한. institutionId / token 은 uuid.
      expect(SCHEMA_SRC).toMatch(/childNickname:\s*z\.string\(\)[\s\S]*?\.max\(\d+\)/);
      expect(SCHEMA_SRC).toMatch(/signedName:\s*z\.string\(\)[\s\S]*?\.max\(\d+\)/);
    });
  });

  // ===== 시나리오 3: SQL injection 패턴 =====
  describe("시나리오 3 — SQL injection 패턴 (Prisma parameter binding 자동 차단)", () => {
    const SQLI_PAYLOADS = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1' UNION SELECT * FROM users--",
      "admin'--",
      "1; DELETE FROM consent_signatures;",
    ];

    it.each(SQLI_PAYLOADS)('SQLi payload "%s" - institutionId (uuid) 거부', (payload) => {
      const result = ConsentCreateInputSchema.safeParse(
        makeValidCreatePayload({ institutionId: payload }),
      );
      expect(result.success).toBe(false);
    });

    it.each(SQLI_PAYLOADS)('SQLi payload "%s" - parentEmail (email) 거부', (payload) => {
      const result = ConsentCreateInputSchema.safeParse(
        makeValidCreatePayload({ parentEmail: payload }),
      );
      expect(result.success).toBe(false);
    });

    it.each(SQLI_PAYLOADS)('SQLi payload "%s" - token (uuid) 거부 (confirm)', (payload) => {
      const result = ConsentConfirmInputSchema.safeParse(
        makeValidConfirmPayload({ token: payload }),
      );
      expect(result.success).toBe(false);
    });

    it("정적 — schema 에 raw string interpolation (`${...}`) 패턴 부재 (Prisma 안전)", () => {
      // route.ts 가 향후 Prisma 호출 추가 시 $queryRawUnsafe 사용 금지.
      expect(ROUTE_SRC).not.toMatch(/\$queryRawUnsafe/);
      expect(ROUTE_SRC).not.toMatch(/\$executeRawUnsafe/);
    });

    it("정적 — schema 의 string 필드는 모두 format 제약 (uuid/email/regex/max) 부착", () => {
      // 자유 형식 string() (제약 없음) 이 있으면 SQLi payload 통과 가능 — 명시 검증.
      // childNickname / signedName 은 max 만 있어 사실상 자유 입력. 의도적으로 sentinel.
      const freeStringPattern = /:\s*z\.string\(\)\s*,/g;
      const freeMatches = SCHEMA_SRC.match(freeStringPattern) ?? [];
      // 0건 기대 — 모든 string 은 추가 제약 (`.uuid()`, `.email()`, `.regex(...)`, `.min(...).max(...)` 등) 부착.
      expect(freeMatches).toHaveLength(0);
    });
  });

  // ===== 시나리오 4: Replay 공격 =====
  describe("시나리오 4 — Replay 공격 (idempotency / nonce / timestamp)", () => {
    it("⚠️ 후속 task — ConsentConfirmInputSchema 에 nonce / idempotencyKey 필드 부재", () => {
      // SEC-003 issue Acceptance §Scenario 4: PATCH 헤더에 nonce + DB 저장 → 재사용 차단.
      // 현재 schema 미반영 — 단순화 모드 1차 구현은 placeholder 401 응답.
      // 본 sentinel 이 후속 PR (FR-C-018 구현) 시 nonce 필드 추가 강제.
      expect(SCHEMA_SRC).not.toMatch(/nonce/i);
      expect(SCHEMA_SRC).not.toMatch(/idempotencyKey/i);
    });

    it("⚠️ 후속 task — ConsentConfirmInputSchema 에 client-supplied timestamp 필드 부재 (서버 시간 권위)", () => {
      // 클라이언트 timestamp 위조 방지 — 서버가 NOW() 기준 expiresAt 검증.
      // ConfirmInput 엔 timestamp 없음 (의도적 — 서버 측 권위 보존). 본 sentinel 이
      // 누군가 client-supplied timestamp 를 _input_ schema 에 추가 시 즉시 노출.
      // OutputSchema 의 signedAt (서버 발급) 은 무관 — input 블록만 검사.
      const inputBlock = SCHEMA_SRC.match(
        /ConsentConfirmInputSchema[\s\S]*?z\.object\(\{([\s\S]*?)\}\)/,
      );
      expect(inputBlock, "ConsentConfirmInputSchema 블록 매칭 실패").not.toBeNull();
      const inputBody = inputBlock![1];
      expect(inputBody).not.toMatch(/timestamp/i);
      expect(inputBody).not.toMatch(/signedAt/i);
      expect(inputBody).not.toMatch(/clientTime/i);
    });

    it("정상 schema — token (uuid) 1개로 idempotent 식별 가능 (1회용 patch 후 status='signed')", () => {
      // Confirm input 의 token field 는 uuid v4 (122-bit entropy). 재사용은 DB
      // status='signed' 체크로 차단 (FR-C-018 책임 — 본 schema 단계엔 정상).
      expect(SCHEMA_SRC).toMatch(/token:\s*z\.string\(\)\.uuid\(\)/);
    });

    it("동일 입력 2회 parse — schema validation 은 stateless 이므로 양쪽 통과 (DB 측 1회용 책임)", () => {
      const body = makeValidConfirmPayload();
      const r1 = ConsentConfirmInputSchema.safeParse(body);
      const r2 = ConsentConfirmInputSchema.safeParse(body);
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      // sentinel: replay 차단은 schema 가 아닌 DB layer (status='signed' WHERE token=$1).
    });
  });

  // ===== 시나리오 5: CSRF 보호 (Same-Origin / SameSite cookie) =====
  describe("시나리오 5 — CSRF 보호 (proxy.ts cookie / Origin)", () => {
    it("proxy.ts 의 anonymous cookie 가 sameSite=lax (CSRF GET 차단)", () => {
      expect(PROXY_SRC).toMatch(/sameSite:\s*["']lax["']/);
    });

    it("proxy.ts 의 anonymous cookie 가 production 환경에서 secure=true", () => {
      expect(PROXY_SRC).toMatch(/secure:\s*process\.env\.NODE_ENV\s*===\s*["']production["']/);
    });

    it("✅ SEC-003 패치 — /api/consent/sign route 가 verifyOrigin (CSRF) 호출", () => {
      // SEC-003 — Origin 검증 추가. route.ts 가 `lib/csrf.verifyOrigin` import +
      // POST 진입 시 호출하는지 정적 검증. 동작 단위 테스트는 `__tests__/lib/csrf.test.ts`
      // (node env) 에서 별도 — happy-dom 은 forbidden header (Origin/Referer) 를
      // strip 하므로 본 happy-dom env 에서는 정적 검증 위주.
      expect(ROUTE_SRC).toMatch(/from\s+["']@\/lib\/csrf["']/);
      expect(ROUTE_SRC).toMatch(/verifyOrigin\s*\(\s*request\s*\)/);
    });

    it("✅ SEC-003 패치 — 403 CSRF_ORIGIN_MISMATCH 응답 분기 존재", () => {
      // verifyOrigin 결과 ok=false 시 403 + error code 반환하는지 정적 검증.
      expect(ROUTE_SRC).toMatch(/status:\s*403/);
      expect(ROUTE_SRC).toMatch(/CSRF_ORIGIN_MISMATCH/);
    });

    it("✅ SEC-003 패치 — lib/csrf.ts 헬퍼가 Origin / Referer 모두 검사", () => {
      // verifyOrigin 헬퍼 자체는 Origin 우선 + Referer fallback 구조여야 함.
      const csrfSrc = readFileSync(join(PROJECT_ROOT, "lib", "csrf.ts"), "utf-8");
      expect(csrfSrc).toMatch(/headers\.get\(["']Origin["']\)/);
      expect(csrfSrc).toMatch(/headers\.get\(["']Referer["']\)/);
    });

    it("✅ SEC-003 패치 — lib/csrf.ts 가 환경별 분기 (production/preview/dev)", () => {
      // SEC-004 / MON-002 패턴 — VERCEL_ENV / NODE_ENV prefix 활용.
      const csrfSrc = readFileSync(join(PROJECT_ROOT, "lib", "csrf.ts"), "utf-8");
      expect(csrfSrc).toMatch(/VERCEL_ENV/);
      expect(csrfSrc).toMatch(/NODE_ENV/);
    });

    it("⚠️ 후속 task — 정식 CSRF token (double-submit cookie) 패턴 부재", () => {
      // Origin 검증으로 일반 폼 1차 방어 완료. 본 sentinel 은 정식 token 패턴 (cookie
      // + header 매칭) 부재 추적 — sensitive endpoint 확장 시 추가 검토.
      expect(ROUTE_SRC).not.toMatch(/csrf[_-]?token/i);
    });
  });

  // ===== 시나리오 6: Empty / null 입력 차단 =====
  describe("시나리오 6 — Empty / null / 누락 필드 400 응답", () => {
    it("빈 객체 → 400 INVALID_INPUT", async () => {
      const { status, payload } = await postSign({});
      expect(status).toBe(400);
      expect((payload as { error: string }).error).toBe("INVALID_INPUT");
    });

    it("required 필드 1개 (institutionId) 누락 → 400", async () => {
      const body = makeValidCreatePayload();
      delete (body as Record<string, unknown>).institutionId;
      const { status } = await postSign(body);
      expect(status).toBe(400);
    });

    it("required 필드 모두 null → 400", async () => {
      const body = {
        institutionId: null,
        parentEmail: null,
        parentPhone: null,
        childNickname: null,
        childAgeMonths: null,
      };
      const { status } = await postSign(body);
      expect(status).toBe(400);
    });

    it("required 필드 모두 빈 문자열 → 400 (uuid/email/regex 거부)", async () => {
      const body = {
        institutionId: "",
        parentEmail: "",
        parentPhone: "",
        childNickname: "",
        childAgeMonths: 0,
      };
      const { status } = await postSign(body);
      expect(status).toBe(400);
    });

    it("Confirm — agreed:false (literal(true) 위반) → schema 거부", () => {
      const result = ConsentConfirmInputSchema.safeParse(
        makeValidConfirmPayload({ agreed: false }),
      );
      expect(result.success).toBe(false);
    });

    it("Confirm — agreed 누락 → schema 거부", () => {
      const body = makeValidConfirmPayload();
      delete (body as Record<string, unknown>).agreed;
      const result = ConsentConfirmInputSchema.safeParse(body);
      expect(result.success).toBe(false);
    });
  });

  // ===== 시나리오 7: 부정 형식 (이메일 / 전화 / uuid / 월령) =====
  describe("시나리오 7 — 부정 형식 거부 (이메일 / 전화 / uuid / 월령 범위)", () => {
    it.each([
      "not-an-email",
      "user@",
      "@example.com",
      "user space@example.com",
      "user@.com",
      "user@example",
    ])('parentEmail "%s" (invalid email) → 400', async (email) => {
      const { status } = await postSign(makeValidCreatePayload({ parentEmail: email }));
      expect(status).toBe(400);
    });

    it.each([
      "abc-def-ghij", // 글자
      "1234567", // 7자 (min 8 미만)
      "1".repeat(21), // 21자 (max 20 초과)
      "010!1234!5678", // 허용 외 특수문자
    ])('parentPhone "%s" (invalid regex) → 400', async (phone) => {
      const { status } = await postSign(makeValidCreatePayload({ parentPhone: phone }));
      expect(status).toBe(400);
    });

    it.each([
      "not-uuid",
      "11111111-1111-1111-1111-111111111111X", // 끝에 글자
      "11111111", // 짧음
      "ZZZZZZZZ-ZZZZ-4ZZZ-8ZZZ-ZZZZZZZZZZZZ", // 비 hex
    ])('institutionId "%s" (invalid uuid) → 400', async (uuid) => {
      const { status } = await postSign(makeValidCreatePayload({ institutionId: uuid }));
      expect(status).toBe(400);
    });

    it.each([
      0, // min 24 미만
      23, // 24 미만
      85, // max 84 초과
      120,
      -1,
      3.5, // int 위반
    ])('childAgeMonths %s (범위 외 / 비정수) → 400', async (age) => {
      const { status } = await postSign(makeValidCreatePayload({ childAgeMonths: age }));
      expect(status).toBe(400);
    });

    it("정상 payload 는 500 / 501 (구현 미완) 반환 — schema 통과 확인", async () => {
      // 현재 route.ts 는 NOT_IMPLEMENTED 501. schema 가 정상 payload 를 통과시키면
      // 400 INVALID_INPUT 이 아닌 501 반환됨. 본 케이스 가 schema 회귀 (false-positive
      // 거부) 즉시 노출.
      const { status, payload } = await postSign(makeValidCreatePayload());
      expect(status).toBe(501);
      expect((payload as { error: string }).error).toBe("NOT_IMPLEMENTED");
    });

    it("Confirm token 비 uuid → schema 거부", () => {
      const result = ConsentConfirmInputSchema.safeParse(
        makeValidConfirmPayload({ token: "not-a-uuid" }),
      );
      expect(result.success).toBe(false);
    });
  });

  // ===== 후속 task 트래킹 (INFO) =====
  describe("보안 결함 회귀 sentinel — 후속 task 트래킹", () => {
    it("INFO — 본 PR 범위 외 후속 task", () => {
      // 1) Zod transform 단계 DOMPurify/sanitize-html 통합 — XSS 짧은 payload 방어
      // 2) Confirm endpoint 의 nonce 헤더 + DB 별도 저장 (replay 차단)
      // 3) /api/consent/sign route 에 Origin 헤더 검증 (CSRF 1차 방어)
      // 4) Rate Limiter (Upstash) — IP 당 1분 5회 / 무차별 대입 방어 (SEC-004 통합)
      // 5) Audit Log INSERT (sign/rescind 모든 행위 → audit_log)
      // 6) 실 침투 테스트 — sqlmap / OWASP ZAP / token 추측 (UUID 1000회)
      // 7) 법적 효력 문서 (`docs/electronic-signature-legal.md`) — 전자서명법·개인정보보호법
      expect(true).toBe(true);
    });
  });
});
