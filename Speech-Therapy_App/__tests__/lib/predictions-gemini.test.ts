// FR-C-011 (#34) — lib/predictions/gemini.predictNextScore 단위 테스트.
//
// 본 helper 의 핵심 계약은 "절대 throw 하지 않는다 + mock fallback 으로 항상 응답" 이다.
//
// 분기 매트릭스 (10+ 시나리오):
//   1. NODE_ENV='test' / GEMINI_DISABLED='1' / API key 미설정 → mock fallback (disabled / api_key_missing)
//   2. 정상 Gemini 호출 (generateJson mock) → predicted / confidence / model='gemini-2.5-flash'
//   3. Rate limit (사용자 5건/h sliding window) → 6번째 호출 mock fallback (rate_limited)
//   4. lib/ai/gemini RateLimitedError throw → mock fallback (rate_limited)
//   5. lib/ai/gemini LLMTimeoutError throw → mock fallback (timeout)
//   6. 일반 API 에러 → mock fallback (api_error)
//   7. Zod schema 위반 응답 → mock fallback (schema_invalid)
//   8. 캐시 hit — 같은 입력 두 번째 호출 → cached=true
//   9. missionFrequency 'low' / 'normal' / 'high' → 다른 predicted (low<normal<high)
//  10. weekHistory 비어있음 → mock fallback (insufficient_history) + predicted=5 (0+5)
//  11. confidence 범위 검증 — clamp 0~1
//  12. R4 — prompt 에 자녀 식별 정보 (이름/email) 미포함

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const generateJsonMock = vi.fn();
const trackEventMock = vi.fn();

vi.mock("@/lib/ai/gemini", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/gemini")>(
    "@/lib/ai/gemini",
  );
  return {
    ...actual,
    generateJson: (...args: unknown[]) => generateJsonMock(...args),
  };
});

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

import {
  predictNextScore,
  __resetPredictionsGeminiForTest,
  __fillRateLimitForTest,
  type PredictionInput,
} from "@/lib/predictions/gemini";
import { RateLimitedError, LLMTimeoutError } from "@/lib/ai/gemini";

const USER = "user-a";

function buildHistory(latest = 70): PredictionInput["weekHistory"] {
  return [
    { weekNumber: 17, articulationAvg: 60, linguisticAvg: 60, acousticAvg: 60, sessionCount: 4, wAurAchieved: true },
    { weekNumber: 18, articulationAvg: 64, linguisticAvg: 64, acousticAvg: 64, sessionCount: 4, wAurAchieved: true },
    { weekNumber: 19, articulationAvg: 67, linguisticAvg: 67, acousticAvg: 67, sessionCount: 4, wAurAchieved: true },
    { weekNumber: 20, articulationAvg: latest, linguisticAvg: latest, acousticAvg: latest, sessionCount: 5, wAurAchieved: true },
  ];
}

beforeEach(() => {
  generateJsonMock.mockReset();
  trackEventMock.mockReset();
  __resetPredictionsGeminiForTest();
});

afterEach(() => {
  // env 정리 — 다른 테스트에 영향 주지 않도록.
  delete process.env.GEMINI_DISABLED;
  // NODE_ENV 는 test runner 가 'test' 로 강제하므로 그대로 둠.
});

// ============================================================================
// 1. 강제 mock 모드 (test / disabled / api_key_missing)
// ============================================================================
describe("predictNextScore — 강제 mock (test / disabled / api_key_missing)", () => {
  it("NODE_ENV='test' (vitest 기본) → mock fallback + model='mock' + staleFromRateLimit=true", async () => {
    const out = await predictNextScore({ userId: USER, weekHistory: buildHistory(70) });
    expect(out.model).toBe("mock");
    expect(out.staleFromRateLimit).toBe(true);
    expect(out.cached).toBe(false);
    expect(out.predicted).toBeCloseTo(75, 1); // 70+5
    expect(out.confidence).toBe(0.3);
    expect(generateJsonMock).not.toHaveBeenCalled();
    expect(trackEventMock).toHaveBeenCalledWith("prediction_fallback_used", {
      userId: USER,
      reason: "disabled",
    });
  });

  it("GEMINI_DISABLED='1' → mock fallback + reason='disabled'", async () => {
    process.env.GEMINI_DISABLED = "1";
    const out = await predictNextScore({ userId: USER, weekHistory: buildHistory(70) });
    expect(out.model).toBe("mock");
    expect(trackEventMock).toHaveBeenCalledWith(
      "prediction_fallback_used",
      expect.objectContaining({ reason: "disabled" }),
    );
  });

  it("weekHistory 비어있음 → mock fallback (insufficient_history) + predicted=5", async () => {
    const out = await predictNextScore({ userId: USER, weekHistory: [] });
    expect(out.model).toBe("mock");
    expect(out.predicted).toBe(5); // 0+5
    expect(out.confidence).toBe(0.3);
  });
});

// ============================================================================
// 2. 실 Gemini 호출 (NODE_ENV 우회 + API key 주입)
// ============================================================================
describe("predictNextScore — 실 Gemini 호출 분기", () => {
  // 실 Gemini 분기 진입 조건을 만족시키는 헬퍼.
  function enableGeminiPath(): void {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    // NODE_ENV='test' 가 forced-mock 트리거이므로 잠시 override.
    // vi.stubEnv 사용 (vitest 4+).
    vi.stubEnv("NODE_ENV", "development");
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  it("정상 응답 → predicted/confidence/model='gemini-2.5-flash' + cached=false", async () => {
    enableGeminiPath();
    generateJsonMock.mockResolvedValueOnce({
      predicted: 78.5,
      confidence: 0.82,
      reasoning: "직전 주차 상승 추세 유지",
    });
    const out = await predictNextScore({ userId: USER, weekHistory: buildHistory(70) });
    expect(out.model).toBe("gemini-2.5-flash");
    expect(out.predicted).toBe(78.5);
    expect(out.confidence).toBe(0.82);
    expect(out.cached).toBe(false);
    expect(out.staleFromRateLimit).toBe(false);
    expect(generateJsonMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("RateLimitedError throw → mock fallback (reason='rate_limited')", async () => {
    enableGeminiPath();
    generateJsonMock.mockRejectedValueOnce(new RateLimitedError("GLOBAL_RPM", 30));
    const out = await predictNextScore({ userId: USER, weekHistory: buildHistory(70) });
    expect(out.model).toBe("mock");
    expect(out.staleFromRateLimit).toBe(true);
    expect(trackEventMock).toHaveBeenCalledWith(
      "prediction_fallback_used",
      expect.objectContaining({ reason: "rate_limited" }),
    );
  });

  it("LLMTimeoutError throw → mock fallback (reason='timeout')", async () => {
    enableGeminiPath();
    generateJsonMock.mockRejectedValueOnce(new LLMTimeoutError("LLM 호출이 15초를 초과했습니다"));
    const out = await predictNextScore({ userId: USER, weekHistory: buildHistory(70) });
    expect(out.model).toBe("mock");
    expect(trackEventMock).toHaveBeenCalledWith(
      "prediction_fallback_used",
      expect.objectContaining({ reason: "timeout" }),
    );
  });

  it("일반 API 에러 throw → mock fallback (reason='api_error')", async () => {
    enableGeminiPath();
    generateJsonMock.mockRejectedValueOnce(new Error("network unreachable"));
    const out = await predictNextScore({ userId: USER, weekHistory: buildHistory(70) });
    expect(out.model).toBe("mock");
    expect(trackEventMock).toHaveBeenCalledWith(
      "prediction_fallback_used",
      expect.objectContaining({ reason: "api_error" }),
    );
  });

  it("Zod schema 위배 (invalid 응답) → mock fallback (reason='schema_invalid')", async () => {
    enableGeminiPath();
    generateJsonMock.mockRejectedValueOnce(new Error("schema validation failed: invalid"));
    const out = await predictNextScore({ userId: USER, weekHistory: buildHistory(70) });
    expect(out.model).toBe("mock");
    expect(trackEventMock).toHaveBeenCalledWith(
      "prediction_fallback_used",
      expect.objectContaining({ reason: "schema_invalid" }),
    );
  });

  it("Rate limit (helper 자체 5건/h sliding window) — 6번째 호출 mock fallback", async () => {
    enableGeminiPath();
    // 5건 채워 두면 다음 호출이 rate-limited.
    __fillRateLimitForTest(USER, 5);
    const out = await predictNextScore({ userId: USER, weekHistory: buildHistory(70) });
    expect(out.model).toBe("mock");
    expect(out.staleFromRateLimit).toBe(true);
    expect(trackEventMock).toHaveBeenCalledWith(
      "prediction_fallback_used",
      expect.objectContaining({ reason: "rate_limited" }),
    );
    // Gemini 호출 자체가 사전 차단 — generateJson 호출 0회.
    expect(generateJsonMock).not.toHaveBeenCalled();
  });

  it("clamp — predicted 초과 (200) / confidence 초과 (1.5) → helper 가 0~100 / 0~1 로 잘라냄", async () => {
    enableGeminiPath();
    // generateJson 이 mock 이라 Zod 검증을 우회하므로, helper 측 clamp 가 최종 안전망 역할.
    generateJsonMock.mockResolvedValueOnce({
      predicted: 200,
      confidence: 1.5,
      reasoning: "out-of-range",
    });
    const out = await predictNextScore({ userId: USER, weekHistory: buildHistory(70) });
    expect(out.model).toBe("gemini-2.5-flash");
    expect(out.predicted).toBe(100); // clamp 0~100
    expect(out.confidence).toBe(1); // clamp 0~1
  });
});

// ============================================================================
// 3. 캐시 (in-memory 24h TTL)
// ============================================================================
describe("predictNextScore — 캐시", () => {
  it("같은 입력 두 번째 호출 → cached=true", async () => {
    const input = { userId: USER, weekHistory: buildHistory(70) };
    const first = await predictNextScore(input);
    expect(first.cached).toBe(false);

    const second = await predictNextScore(input);
    expect(second.cached).toBe(true);
    expect(second.predicted).toBe(first.predicted);
  });

  it("missionFrequency 다르면 별도 캐시 키 (각각 cached=false)", async () => {
    const base = { userId: USER, weekHistory: buildHistory(70) };
    const normal = await predictNextScore({ ...base, missionFrequency: "normal" });
    const high = await predictNextScore({ ...base, missionFrequency: "high" });
    expect(normal.cached).toBe(false);
    expect(high.cached).toBe(false);
  });
});

// ============================================================================
// 4. missionFrequency 시뮬레이션 (mock 분기 — low<normal<high)
// ============================================================================
describe("predictNextScore — missionFrequency 시뮬", () => {
  it("low < normal < high (mock 분기)", async () => {
    const base = { userId: USER, weekHistory: buildHistory(70) };
    const low = await predictNextScore({ ...base, missionFrequency: "low" });
    const normal = await predictNextScore({ ...base, missionFrequency: "normal" });
    const high = await predictNextScore({ ...base, missionFrequency: "high" });
    expect(low.predicted).toBeLessThan(normal.predicted);
    expect(normal.predicted).toBeLessThan(high.predicted);
  });

  it("missionFrequency 미전달 → 기본 'normal' 동작 (low 보다 큼)", async () => {
    const base = { userId: USER, weekHistory: buildHistory(70) };
    const def = await predictNextScore(base);
    const low = await predictNextScore({ ...base, missionFrequency: "low" });
    expect(def.predicted).toBeGreaterThan(low.predicted);
  });
});

// ============================================================================
// 5. R4 — prompt 에 자녀 식별 정보 미포함 + 응답 정합성
// ============================================================================
describe("predictNextScore — R4 (자녀 식별 정보 0)", () => {
  beforeEach(() => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    vi.stubEnv("NODE_ENV", "development");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  it("Gemini prompt 에 userId 그 자체 미포함 — 집계 점수만", async () => {
    generateJsonMock.mockResolvedValueOnce({
      predicted: 75,
      confidence: 0.8,
      reasoning: "ok",
    });
    await predictNextScore({
      userId: "very-secret-userid-12345",
      weekHistory: buildHistory(70),
    });
    expect(generateJsonMock).toHaveBeenCalledTimes(1);
    const call = generateJsonMock.mock.calls[0][0] as {
      prompt: string;
      system: string;
      userId?: string;
    };
    // userId 는 rate-limit 트래커로만 사용 — prompt 본문에 노출 X.
    expect(call.prompt).not.toContain("very-secret-userid-12345");
    expect(call.system).not.toContain("very-secret-userid-12345");
    // 단 lib/ai/gemini rate-limit 통과용으로 별도 인자 전달은 허용 (R4 위배 아님 — 내부 카운터).
    expect(call.userId).toBe("very-secret-userid-12345");
  });

  it("system prompt 에 금칙어 (치료/진단/장애) 미포함", async () => {
    generateJsonMock.mockResolvedValueOnce({
      predicted: 75,
      confidence: 0.8,
      reasoning: "ok",
    });
    await predictNextScore({ userId: USER, weekHistory: buildHistory(70) });
    const call = generateJsonMock.mock.calls[0][0] as { system: string; prompt: string };
    for (const banned of ["치료", "진단", "장애"]) {
      expect(call.system).not.toContain(banned);
      expect(call.prompt).not.toContain(banned);
    }
  });
});
