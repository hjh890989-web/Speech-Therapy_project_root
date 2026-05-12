// MOCK-001 — analyzeDiagnosis() 3종 Mock (성공 high / 성공 low + HITL 이관 / 실패).
// API-001 DiagnosisOutputSchema 와 100% 호환.

import {
  DiagnosisOutputSchema,
  type DiagnosisOutput,
} from "@/lib/schemas/diagnosis";
import { getMockBySearchParam, isMockEnabled } from "./utils";

const SESSION_ID_HIGH = "11111111-1111-4111-8111-111111111111";
const SESSION_ID_LOW = "22222222-2222-4222-8222-222222222222";

export const mockSuccessHigh: DiagnosisOutput = {
  sessionId: SESSION_ID_HIGH,
  articulationScore: 88,
  linguisticScore: 85,
  acousticScore: 84,
  peerPercentile: 92,
  confidence: 95,
  aiCushionText: "또래의 상위 8% 안에 들어요. 차근차근 즐겁게 이어가세요.",
  requiresHITL: false,
  disclaimerRequired: true,
};

export const mockSuccessLow: DiagnosisOutput = {
  sessionId: SESSION_ID_LOW,
  articulationScore: 42,
  linguisticScore: 35,
  acousticScore: 38,
  peerPercentile: 25,
  confidence: 65,
  aiCushionText: "조금 더 연습하면 좋아져요. 부담 갖지 말고 천천히.",
  requiresHITL: true,
  disclaimerRequired: true,
};

/// `throw` 대신 값으로 표현해야 OutputSchema 검증 단위 테스트 (스키마 100% 일치) 가능.
/// 실제 사용 시점에선 호출 측에서 throw 변환.
export const mockFailureSTT = new Error("STT_FAILED");

const VARIANTS = {
  "success-high": mockSuccessHigh,
  "success-low": mockSuccessLow,
} as const;

/// FE 개발자가 ?mock=success-high|success-low 로 분기.
/// USE_MOCK_DIAGNOSIS=true 환경 변수 활성 + Production 외 환경에서만 동작.
export function getDiagnosisMock(
  searchParams: URLSearchParams | { get(key: string): string | null },
): DiagnosisOutput | null {
  if (!isMockEnabled("USE_MOCK_DIAGNOSIS")) return null;
  if (searchParams.get("mock") === "failure") {
    throw mockFailureSTT;
  }
  return getMockBySearchParam(searchParams, "mock", VARIANTS, mockSuccessHigh);
}

// 스키마 자가 검증 (모듈 로드 시점 1회).
DiagnosisOutputSchema.parse(mockSuccessHigh);
DiagnosisOutputSchema.parse(mockSuccessLow);
