// API-001 — analyzeDiagnosis() 계약 (Zod 입력·출력 + 타입 export).
// SRS §3.5, §3.6.1, REQ-FUNC-001~003, REQ-NF-001 (p95 ≤ 800ms).
// D7 적용 — audioBlob 직접 수신 대신 STT 결과 텍스트 + 음향 특징을 클라이언트가 미리 추출.
// 구현 책임: FR-C-001 (3축 스코어링 비즈니스 로직).

import { z } from "zod";

export const DiagnosisErrorCode = z.enum([
  "INVALID_INPUT",
  "STT_FAILED",
  "LLM_TIMEOUT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);
export type DiagnosisErrorCode = z.infer<typeof DiagnosisErrorCode>;

export const DiagnosisInputSchema = z.object({
  /// Sprint 2 §2 — 부모가 선택한 의도 단어 (예: "사과"). 발음 비교 기준.
  intendedWord: z.string().min(1).max(50),
  /// Web Speech API STT 결과 텍스트.
  transcript: z.string().min(1).max(2_000),
  /// 음향 특징 (옵션, Sprint 1 엔 null 허용 — P1+ 에서 활성화).
  acousticFeatures: z
    .object({
      pitchMean: z.number().nullable(),
      pitchStd: z.number().nullable(),
      durationSec: z.number().min(0).nullable(),
      energy: z.number().nullable(),
    })
    .nullable()
    .optional(),
  /// 자녀 월령 (만 2~7세).
  childAgeMonths: z.number().int().min(24).max(84),
  /// 시드 5종 한국어 음소.
  targetPhoneme: z.enum(["ㅅ", "ㅈ", "ㄱ", "ㄴ", "ㄹ"]),
  /// 인증 사용자는 userId, 무로그인 진단은 anonymousUserId 중 하나 필수
  /// (Server Action 진입 시 비즈니스 검증).
  userId: z.string().uuid().optional(),
  anonymousUserId: z.string().uuid().optional(),
});
export type DiagnosisInput = z.infer<typeof DiagnosisInputSchema>;

export const DiagnosisOutputSchema = z.object({
  sessionId: z.string().uuid(),
  /// Sprint 2 §2 — 부모가 선택한 의도 단어 echo. 결과 페이지 비교 표시용.
  intendedWord: z.string().optional(),
  /// Sprint 2 §2 — STT 가 들은 실제 단어 (transcript 동일값, 의미 명확화).
  heardWord: z.string().optional(),
  articulationScore: z.number().min(0).max(100),
  linguisticScore: z.number().min(0).max(100),
  acousticScore: z.number().min(0).max(100),
  peerPercentile: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  /// CON-04 금칙어 0건 보장 (FR-C-005 미들웨어 또는 본 Server Action 응답 직전 검증).
  aiCushionText: z.string(),
  /// Sprint 2 §2: articulationScore < 50 시 자동 true → FR-C-002 가 HITL 큐 등록 트리거.
  requiresHITL: z.boolean(),
  /// REQ-FUNC-011 Disclaimer 강제.
  disclaimerRequired: z.literal(true),
});
export type DiagnosisOutput = z.infer<typeof DiagnosisOutputSchema>;
