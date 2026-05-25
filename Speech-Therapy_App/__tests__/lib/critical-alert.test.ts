// DB-011 후속 — lib/audit/critical-alert.ts 단위 테스트.
//
// 검증 시나리오 (≥ 9):
//   [1] critical action (User_delete) → Slack webhook 호출 + 메시지 본문 검증
//   [2] non-critical action (sign_in) → fetch 0회 (skip)
//   [3] AUDIT_SLACK_WEBHOOK_URL 미설정 → fetch 0회 + warn 1회만
//   [4] Slack fetch 실패 (HTTP 500) → console.error + throw X (graceful)
//   [5] Slack fetch reject (network) → console.error + throw X
//   [6] diff 256자 초과 → 256자 truncate + … 추가
//   [7] diff 의심 키 (email/realname/transcript) → [REDACTED] 치환
//   [8] CRITICAL_ACTIONS — 정책 매트릭스 (User_delete / data_delete / config_change 등 매핑)
//   [9] CON-04 금칙어 — 본문에 "치료/진단/장애" 0건
//  [10] env swap 복원 — 호출 후 SLACK_WEBHOOK_URL 가 원래 값으로 복귀
//  [11] summarizeDiff — null/undefined → "(diff 없음)"
//  [12] summarizeDiff — 객체 아님 (string) → "(diff 형식 비정상)"
//  [13] buildCriticalAlertMessage — link encodeURIComponent 적용
//
// Refs: lib/audit/critical-alert.ts, lib/audit.ts (호출 측), lib/notifications/slack.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  alertIfCritical,
  buildCriticalAlertMessage,
  CRITICAL_ACTIONS,
  isCriticalAction,
  summarizeDiff,
  __resetCriticalAlertWarnFlagForTest,
} from "@/lib/audit/critical-alert";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const WEBHOOK_URL = "https://hooks.slack.com/services/AUDIT/CHANNEL/XYZ";

const originalAuditEnv = process.env.AUDIT_SLACK_WEBHOOK_URL;
const originalSlackEnv = process.env.SLACK_WEBHOOK_URL;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  __resetCriticalAlertWarnFlagForTest();
  delete process.env.AUDIT_SLACK_WEBHOOK_URL;
  delete process.env.SLACK_WEBHOOK_URL;
  globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
});

afterEach(() => {
  if (originalAuditEnv === undefined) {
    delete process.env.AUDIT_SLACK_WEBHOOK_URL;
  } else {
    process.env.AUDIT_SLACK_WEBHOOK_URL = originalAuditEnv;
  }
  if (originalSlackEnv === undefined) {
    delete process.env.SLACK_WEBHOOK_URL;
  } else {
    process.env.SLACK_WEBHOOK_URL = originalSlackEnv;
  }
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ============================================================================
// [1] critical action → Slack webhook 호출
// ============================================================================

describe("alertIfCritical — 시나리오 1: critical action → Slack 발송", () => {
  it("User_delete → fetch 1회 호출 + 메시지 본문 검증", async () => {
    process.env.AUDIT_SLACK_WEBHOOK_URL = WEBHOOK_URL;
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    await alertIfCritical("User_delete", ACTOR_ID, { before: { id: "x" }, after: null }, new Date("2026-05-25T00:00:00Z"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(WEBHOOK_URL);
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.text).toContain("AuditLog critical event");
    expect(body.text).toContain("User_delete");
    expect(body.text).toContain(ACTOR_ID);
    expect(body.text).toContain("2026-05-25T00:00:00.000Z");
    expect(body.text).toContain("/admin/audit?action=User_delete");
  });
});

// ============================================================================
// [2] non-critical action → skip
// ============================================================================

describe("alertIfCritical — 시나리오 2: non-critical action → skip", () => {
  it("sign_in → fetch 0회", async () => {
    process.env.AUDIT_SLACK_WEBHOOK_URL = WEBHOOK_URL;
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    await alertIfCritical("sign_in", ACTOR_ID, null);
    await alertIfCritical("consent_sign", ACTOR_ID, null);
    await alertIfCritical("reward_grant", ACTOR_ID, null);
    await alertIfCritical("hitl_assign", ACTOR_ID, null);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ============================================================================
// [3] AUDIT_SLACK_WEBHOOK_URL 미설정 → skip + warn 1회만
// ============================================================================

describe("alertIfCritical — 시나리오 3: webhook URL 부재", () => {
  it("env 미설정 → fetch 0회 + console.warn 1회만 (반복 호출해도)", async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await alertIfCritical("User_delete", ACTOR_ID, null);
    await alertIfCritical("User_delete", ACTOR_ID, null);
    await alertIfCritical("data_delete", ACTOR_ID, null);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(String(warnSpy.mock.calls[0]?.[0] ?? "")).toContain(
      "AUDIT_SLACK_WEBHOOK_URL",
    );
  });
});

// ============================================================================
// [4] Slack fetch 실패 (HTTP 500) → graceful
// ============================================================================

describe("alertIfCritical — 시나리오 4: Slack HTTP 500", () => {
  it("HTTP 500 → console.error + throw X (Promise resolve)", async () => {
    process.env.AUDIT_SLACK_WEBHOOK_URL = WEBHOOK_URL;
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("err", { status: 500 }));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      alertIfCritical("User_delete", ACTOR_ID, null),
    ).resolves.toBeUndefined();

    expect(errSpy).toHaveBeenCalledOnce();
    expect(String(errSpy.mock.calls[0]?.[0] ?? "")).toContain("Slack 발송 실패");
  });
});

// ============================================================================
// [5] Slack fetch reject (network) → graceful
// ============================================================================

describe("alertIfCritical — 시나리오 5: Slack network reject", () => {
  it("fetch reject → console.error + throw X", async () => {
    process.env.AUDIT_SLACK_WEBHOOK_URL = WEBHOOK_URL;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      alertIfCritical("User_delete", ACTOR_ID, null),
    ).resolves.toBeUndefined();

    // sendSlackMessage 가 graceful → { ok:false, error:"network down" } 반환 →
    // alertIfCritical 이 console.error 1회 (발송 실패) 호출.
    expect(errSpy).toHaveBeenCalledOnce();
  });
});

// ============================================================================
// [6] diff truncate
// ============================================================================

describe("summarizeDiff — 시나리오 6: 256자 초과 truncate", () => {
  it("긴 diff → 256자 + … 추가", () => {
    const huge = { content: "x".repeat(500) };
    const out = summarizeDiff(huge);
    expect(out.length).toBe(257); // 256 + '…'
    expect(out.endsWith("…")).toBe(true);
  });

  it("256자 이하 diff → truncate 안 함", () => {
    const small = { a: 1, b: 2 };
    const out = summarizeDiff(small);
    expect(out).toBe('{"a":1,"b":2}');
    expect(out.endsWith("…")).toBe(false);
  });
});

// ============================================================================
// [7] R4 — 의심 키 [REDACTED] 치환
// ============================================================================

describe("summarizeDiff — 시나리오 7: R4 의심 키 redact", () => {
  it("email / realName / transcript → [REDACTED] 치환", () => {
    const out = summarizeDiff({
      email: "child@example.com",
      realName: "홍길동",
      transcript: "발화 본문",
      safeField: "공개 가능",
    });
    expect(out).not.toContain("child@example.com");
    expect(out).not.toContain("홍길동");
    expect(out).not.toContain("발화 본문");
    expect(out).toContain("[REDACTED]");
    expect(out).toContain("공개 가능");
    // 키 _이름_ 은 노출 허용 (분석 단서).
    expect(out).toContain("email");
    expect(out).toContain("realName");
  });

  it("대소문자 변형 (Email / EMAIL / Phone) 도 redact", () => {
    const out = summarizeDiff({
      Email: "x@y.com",
      EMAIL: "z@y.com",
      Phone: "010-1234",
    });
    expect(out).not.toContain("x@y.com");
    expect(out).not.toContain("z@y.com");
    expect(out).not.toContain("010-1234");
    const redactedCount = (out.match(/\[REDACTED\]/g) ?? []).length;
    expect(redactedCount).toBe(3);
  });
});

// ============================================================================
// [8] CRITICAL_ACTIONS 정책 매트릭스
// ============================================================================

describe("isCriticalAction — 시나리오 8: 정책 매트릭스", () => {
  const criticalSamples = [
    "User_delete",
    "User_update",
    "data_delete",
    "data_export",
    "config_change",
    "hitl_manually_escalated",
    "totp_disabled",
    "User_role_change",
  ];

  for (const action of criticalSamples) {
    it(`"${action}" → critical`, () => {
      expect(isCriticalAction(action)).toBe(true);
      expect(CRITICAL_ACTIONS.has(action)).toBe(true);
    });
  }

  const nonCriticalSamples = [
    "sign_in",
    "consent_sign",
    "reward_grant",
    "hitl_assign",
    "hitl_comment_added",
    "OfflineEntry_insert",
    "RewardLog_insert",
    "User_insert",
    "",
    "MALICIOUS_DROP_TABLE",
  ];

  for (const action of nonCriticalSamples) {
    it(`"${action}" → not critical`, () => {
      expect(isCriticalAction(action)).toBe(false);
    });
  }
});

// ============================================================================
// [9] CON-04 금칙어 — 본문 / 빌더에 0건
// ============================================================================

describe("buildCriticalAlertMessage — 시나리오 9: CON-04 금칙어", () => {
  it("정상 case — 본문에 치료/진단/장애 단어 0건", () => {
    const text = buildCriticalAlertMessage({
      action: "User_delete",
      actorId: ACTOR_ID,
      diff: { before: { id: "x" }, after: null },
      occurredAt: new Date("2026-05-25T00:00:00Z"),
    });
    for (const word of FORBIDDEN_MEDICAL_WORDS) {
      expect(text).not.toContain(word);
    }
  });

  it("baseUrl 미설정 → 상대 경로 link 생성", () => {
    const text = buildCriticalAlertMessage({
      action: "data_delete",
      actorId: ACTOR_ID,
      diff: null,
      occurredAt: new Date(),
    });
    expect(text).toContain("/admin/audit?action=data_delete");
  });

  it("baseUrl 명시 → 절대 URL link 생성", () => {
    const text = buildCriticalAlertMessage({
      action: "User_delete",
      actorId: ACTOR_ID,
      diff: null,
      occurredAt: new Date(),
      baseUrl: "https://app.example.com/",
    });
    expect(text).toContain("https://app.example.com/admin/audit?action=User_delete");
  });
});

// ============================================================================
// [10] env swap 복원
// ============================================================================

describe("alertIfCritical — 시나리오 10: env swap 복원", () => {
  it("SLACK_WEBHOOK_URL 원래 값 복원 (HITL 채널 보호)", async () => {
    process.env.AUDIT_SLACK_WEBHOOK_URL = WEBHOOK_URL;
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/HITL_ORIGINAL";

    await alertIfCritical("User_delete", ACTOR_ID, null);

    expect(process.env.SLACK_WEBHOOK_URL).toBe(
      "https://hooks.slack.com/HITL_ORIGINAL",
    );
  });

  it("원래 SLACK_WEBHOOK_URL 가 undefined → 복원 후에도 undefined", async () => {
    process.env.AUDIT_SLACK_WEBHOOK_URL = WEBHOOK_URL;
    delete process.env.SLACK_WEBHOOK_URL;

    await alertIfCritical("User_delete", ACTOR_ID, null);

    expect(process.env.SLACK_WEBHOOK_URL).toBeUndefined();
  });
});

// ============================================================================
// [11~12] summarizeDiff edge cases
// ============================================================================

describe("summarizeDiff — 시나리오 11~12: edge cases", () => {
  it("null → (diff 없음)", () => {
    expect(summarizeDiff(null)).toBe("(diff 없음)");
  });

  it("undefined → (diff 없음)", () => {
    expect(summarizeDiff(undefined)).toBe("(diff 없음)");
  });

  it("순환 참조 객체 → (직렬화 불가)", () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    expect(summarizeDiff(obj)).toBe("(직렬화 불가)");
  });
});

// ============================================================================
// [13] link encodeURIComponent
// ============================================================================

describe("buildCriticalAlertMessage — 시나리오 13: link encode", () => {
  it("action 에 특수문자 포함 → URL encode", () => {
    const text = buildCriticalAlertMessage({
      action: "User update with space",
      actorId: ACTOR_ID,
      diff: null,
      occurredAt: new Date(),
    });
    // encodeURIComponent("User update with space") = "User%20update%20with%20space"
    expect(text).toContain("action=User%20update%20with%20space");
  });
});
