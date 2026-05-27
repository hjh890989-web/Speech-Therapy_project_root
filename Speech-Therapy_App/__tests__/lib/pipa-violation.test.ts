// MON-005 단위 테스트 — PIPA 위반 monitoring (V07 신규).
//
// 검증 매트릭스:
//   1. 메시지 빌더 — 5 layer 모두 R4 정합 (자녀 식별 정보 미포함).
//   2. Slack 발송 성공 시 { sent: true } 반환.
//   3. SLACK_WEBHOOK_URL 미설정 시 graceful skip — { sent: false, skipped: "no_webhook" }.
//   4. dedup — 동일 (userHash, layer) 5분 내 중복 호출 skip.
//   5. dedup — 다른 layer 는 별도 카운트 (각각 발송).
//   6. dedup — 다른 userHash 는 별도 카운트.
//   7. 발송 실패 (HTTP 500) graceful — console.warn + { sent: false, skipped: "error" }.
//
// Refs: TASK_MON-005.md, lib/monitoring/pipa-violation.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Slack lib mock — sendSlackMessage 호출 캡처.
const sendSlackMock = vi.fn();
vi.mock("@/lib/notifications/slack", () => ({
  sendSlackMessage: (text: string) => sendSlackMock(text),
}));

import {
  buildPipaViolationMessage,
  reportPipaViolation,
  _resetDedupCacheForTest,
  type PipaGuardLayer,
} from "@/lib/monitoring/pipa-violation";

describe("MON-005 — PIPA 위반 monitoring", () => {
  beforeEach(() => {
    _resetDedupCacheForTest();
    sendSlackMock.mockReset();
    sendSlackMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Scenario 1: buildPipaViolationMessage — R4 정합 검증", () => {
    it.each<[PipaGuardLayer, string]>([
      ["1_ui_redirect", "ConsentRedirectGate"],
      ["2_analyze_authenticated", "analyzeDiagnosis"],
      ["3_update_child_profile", "updateChildProfile"],
      ["4_generate_cushion", "generateCushion"],
      ["5_analyze_anonymous_boolean", "analyzeDiagnosis"],
    ])("layer %s 의 메시지에 layer + action 포함, 자녀 PII 미포함", (layer, action) => {
      const msg = buildPipaViolationMessage({
        layer,
        serverAction: action,
        timestamp: new Date("2026-05-27T15:00:00Z"),
      });
      expect(msg).toContain(layer);
      expect(msg).toContain(action);
      expect(msg).toContain("2026-05-27T15:00:00.000Z");
      // R4: 자녀 식별 정보 부재 검증
      expect(msg).not.toMatch(/email|phone|realname|user[_\s]*id/i);
    });

    it("sessionId 가 있으면 노출, 없으면 미노출", () => {
      const withSession = buildPipaViolationMessage({
        layer: "2_analyze_authenticated",
        serverAction: "analyzeDiagnosis",
        sessionId: "sess-abc-123",
        timestamp: new Date("2026-05-27T15:00:00Z"),
      });
      expect(withSession).toContain("sess-abc-123");

      const withoutSession = buildPipaViolationMessage({
        layer: "2_analyze_authenticated",
        serverAction: "analyzeDiagnosis",
        timestamp: new Date("2026-05-27T15:00:00Z"),
      });
      expect(withoutSession).not.toMatch(/sessionId/);
    });
  });

  describe("Scenario 2: 정상 발송 — { sent: true }", () => {
    it("처음 호출 시 Slack 발송 + { sent: true } 반환", async () => {
      const result = await reportPipaViolation({
        ctx: {
          layer: "2_analyze_authenticated",
          serverAction: "analyzeDiagnosis",
        },
        userHash: "hash-user1",
      });
      expect(result.sent).toBe(true);
      expect(sendSlackMock).toHaveBeenCalledTimes(1);
      expect(sendSlackMock).toHaveBeenCalledWith(expect.stringContaining("2_analyze_authenticated"));
    });
  });

  describe("Scenario 3: SLACK_WEBHOOK_URL 미설정 graceful", () => {
    it("Slack 'skipped: true' 반환 시 { sent: false, skipped: 'no_webhook' }", async () => {
      sendSlackMock.mockResolvedValueOnce({
        ok: false,
        skipped: true,
        error: "SLACK_WEBHOOK_URL not set",
      });
      const result = await reportPipaViolation({
        ctx: { layer: "1_ui_redirect", serverAction: "ConsentRedirectGate" },
        userHash: "hash-user2",
      });
      expect(result.sent).toBe(false);
      expect(result.skipped).toBe("no_webhook");
    });
  });

  describe("Scenario 4: dedup — 동일 (userHash, layer) 5분 내 중복 skip", () => {
    it("두 번째 호출은 skipped: 'deduped' 반환 + Slack 미호출", async () => {
      const ctx = {
        layer: "5_analyze_anonymous_boolean" as PipaGuardLayer,
        serverAction: "analyzeDiagnosis",
      };
      const first = await reportPipaViolation({ ctx, userHash: "hash-user3" });
      const second = await reportPipaViolation({ ctx, userHash: "hash-user3" });

      expect(first.sent).toBe(true);
      expect(second.sent).toBe(false);
      expect(second.skipped).toBe("deduped");
      expect(sendSlackMock).toHaveBeenCalledTimes(1);
    });

    it("5분 경과 후 재발송 허용", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-27T15:00:00Z"));

      const ctx = {
        layer: "2_analyze_authenticated" as PipaGuardLayer,
        serverAction: "analyzeDiagnosis",
      };
      const first = await reportPipaViolation({ ctx, userHash: "hash-user4" });
      expect(first.sent).toBe(true);

      // 5분 + 1초 경과
      vi.setSystemTime(new Date("2026-05-27T15:05:01Z"));
      const second = await reportPipaViolation({ ctx, userHash: "hash-user4" });
      expect(second.sent).toBe(true);
      expect(sendSlackMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("Scenario 5: dedup 분리 — 다른 layer 는 별도 카운트", () => {
    it("같은 user, 다른 layer 는 각각 발송", async () => {
      const userHash = "hash-user5";
      const layers: PipaGuardLayer[] = [
        "2_analyze_authenticated",
        "3_update_child_profile",
        "4_generate_cushion",
      ];
      for (const layer of layers) {
        const result = await reportPipaViolation({
          ctx: { layer, serverAction: "test" },
          userHash,
        });
        expect(result.sent).toBe(true);
      }
      expect(sendSlackMock).toHaveBeenCalledTimes(3);
    });
  });

  describe("Scenario 6: dedup 분리 — 다른 userHash 는 별도 카운트", () => {
    it("동일 layer, 다른 user 는 각각 발송", async () => {
      const ctx = {
        layer: "1_ui_redirect" as PipaGuardLayer,
        serverAction: "ConsentRedirectGate",
      };
      const r1 = await reportPipaViolation({ ctx, userHash: "hash-A" });
      const r2 = await reportPipaViolation({ ctx, userHash: "hash-B" });
      const r3 = await reportPipaViolation({ ctx, userHash: "hash-C" });

      expect(r1.sent).toBe(true);
      expect(r2.sent).toBe(true);
      expect(r3.sent).toBe(true);
      expect(sendSlackMock).toHaveBeenCalledTimes(3);
    });
  });

  describe("Scenario 7: 발송 실패 graceful", () => {
    it("HTTP 500 실패 시 { sent: false, skipped: 'error' } + console.warn", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      sendSlackMock.mockResolvedValueOnce({ ok: false, error: "HTTP 500" });

      const result = await reportPipaViolation({
        ctx: { layer: "4_generate_cushion", serverAction: "generateCushion" },
        userHash: "hash-user-err",
      });

      expect(result.sent).toBe(false);
      expect(result.skipped).toBe("error");
      expect(result.error).toBe("HTTP 500");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[MON-005]"),
        "HTTP 500",
      );
      warnSpy.mockRestore();
    });

    it("Slack lib throw 시도 시 graceful (sendSlackMessage 자체 try/catch — 본 모듈 외)", async () => {
      // sendSlackMessage 가 자체적으로 try/catch — { ok: false, error } 반환만.
      // 본 테스트는 그 계약을 명시.
      sendSlackMock.mockResolvedValueOnce({ ok: false, error: "ECONNRESET" });
      const result = await reportPipaViolation({
        ctx: { layer: "5_analyze_anonymous_boolean", serverAction: "analyzeDiagnosis" },
        userHash: "hash-user-net",
      });
      expect(result.sent).toBe(false);
      expect(result.error).toBe("ECONNRESET");
    });
  });

  describe("Scenario 8: userHash 미전달 시 fallback 'anonymous'", () => {
    it("userHash 부재 시에도 정상 발송", async () => {
      const result = await reportPipaViolation({
        ctx: { layer: "1_ui_redirect", serverAction: "ConsentRedirectGate" },
      });
      expect(result.sent).toBe(true);
    });

    it("userHash 부재 + 동일 layer 두 번째 호출 skip ('anonymous' dedup)", async () => {
      const ctx = {
        layer: "1_ui_redirect" as PipaGuardLayer,
        serverAction: "ConsentRedirectGate",
      };
      await reportPipaViolation({ ctx });
      const second = await reportPipaViolation({ ctx });
      expect(second.sent).toBe(false);
      expect(second.skipped).toBe("deduped");
    });
  });
});
