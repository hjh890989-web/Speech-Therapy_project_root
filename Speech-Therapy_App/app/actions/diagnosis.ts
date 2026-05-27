"use server";

// FR-C-001 (Sprint 2 §2) — analyzeDiagnosis 비즈니스 로직.
//
// 변경 핵심: Gemini 텍스트 평가 → phonetic similarity (의도 vs 실현 자모 비교).
// Web Speech API 의 STT 보정으로 사라지던 발음 차이 정보를 결정적 알고리즘으로 복원.
//
// 6 단계 (Sprint 1 의 §A: 쿠션 분리, §B: user upsert 병렬, §C: Slack fire-and-forget 유지):
//  1. Zod 입력 검증 (intendedWord 필수)
//  2. (익명 시) user upsert
//  3. phonetic similarity 계산 → articulationScore (결정적, 즉시)
//  4. FR-C-002 — computeDiagnosisConfidence (Gemini swap, dormant 트리거 해제)
//     - 실 Gemini 출력 또는 graceful fallback (3축 평균 - 분산 패널티)
//     - test / 키 미설정 시 fallback 사용 — throw 금지 보장
//  5. SessionLog + EvaluationResult nested INSERT
//  6. articulationScore < 50 → HITL 큐 등록 + Slack 알림 (fire-and-forget)
//     + maybeEnqueueHitl (confidence < 70 자동 게이트) — 이젠 실 confidence 로 작동.

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { withActor } from "@/lib/db/with-actor";
import { compositeScore, computePeerPercentile } from "@/lib/peer-percentile";
import { computePhoneticSimilarity } from "@/lib/phonetic-similarity";
import { computeLinguisticScore } from "@/lib/linguistic-score";
import { computeAcousticScore } from "@/lib/acoustic-score";
import { computeDiagnosisConfidence } from "@/lib/diagnose/confidence";
import { enqueueForReview } from "@/lib/hitl";
import { maybeEnqueueHitl, HITL_CONFIDENCE_THRESHOLD } from "@/lib/hitl/enqueue";
import { notifyHITLBySlack } from "@/lib/notifications/slack";
import { getDiagnosisMock } from "@/lib/mocks/diagnosis";
import { trackEvent } from "@/lib/analytics";
// SEC-COMP-PIPA (Grill #3A) — 인증 user 의 PIPA 동의 hard 가드 (UI 가드 보완).
// + 익명 user 가드 — 본 PR 에서 input.pipaUnderageConsent + input.overseasTransferConsent 검증.
import { assertConsentedIfAuthenticated, ConsentRequiredError } from "@/lib/policy/consent-guard";
// MON-005 (V07) — PIPA 가드 위반 시도 Slack alert (fire-and-forget, R4 정합).
import { reportPipaViolation } from "@/lib/monitoring/pipa-violation";
import {
  DiagnosisInputSchema,
  DiagnosisOutputSchema,
  type DiagnosisInput,
  type DiagnosisOutput,
} from "@/lib/schemas/diagnosis";

import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Sprint 2 §4 + API-010 — userId 우선순위.
 *  1. Supabase 인증 사용자 (최우선, /rewards 와 동일 권위)
 *  2. input.userId (legacy, 미사용 — schema 호환)
 *  3. input.anonymousUserId (localStorage 권위, useAnonymousUserId hook 과 동일)
 *  4. cookie 의 anonymous_user_id (proxy.ts 가 발급한 stale 값일 수 있음 — 폴백)
 *  5. randomUUID (방어적, 정상 흐름엔 도달 안 함)
 */
async function resolveUserId(input: DiagnosisInput): Promise<string> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch {
    // Supabase env 미설정 등 — 익명 폴백.
  }
  if (input.userId) return input.userId;
  if (input.anonymousUserId) return input.anonymousUserId;
  const cookieStore = await cookies();
  const cookieUserId = cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
  if (cookieUserId) return cookieUserId;
  return randomUUID();
}

// Sprint 2 §2: HITL 게이트 재정의 — confidence 가 아닌 phonetic similarity 기반.
// articulationScore < 50 → 발음과 의도 자모 차이가 큼 → 전문가 검토 추천.
const HITL_SIMILARITY_THRESHOLD = 50;

export async function analyzeDiagnosis(
  rawInput: unknown,
  options: { searchParams?: URLSearchParams } = {},
): Promise<DiagnosisOutput> {
  // ── 1단계: 입력 검증 ────────────────────────────────────────────
  const input: DiagnosisInput = DiagnosisInputSchema.parse(rawInput);

  // ── SEC-COMP-PIPA hard 가드 (Grill #3A) ─────────────────────────
  // 인증 user 의 두 동의 (pipaUnderageConsentAt + overseasTransferConsentAt) 가
  // 모두 not-NULL 인지 server-side 에서 검증. 미동의 시 ConsentRequiredError throw —
  // DiagnosisForm 의 catch 가 "PIPA_CONSENT_REQUIRED" message 를 잡아 /settings/privacy-consent
  // 로 안내.
  // MOCK 모드 진입 _전_ 에 호출하여 우회 차단 (USE_MOCK_DIAGNOSIS 도 인증 user 가드 적용).
  // MON-005: ConsentRequiredError catch → fire-and-forget Slack alert + re-throw.
  try {
    await assertConsentedIfAuthenticated();
  } catch (err) {
    if (err instanceof ConsentRequiredError) {
      // Fire-and-forget — Slack 발송이 메인 흐름 차단 X.
      void reportPipaViolation({
        ctx: { layer: "2_analyze_authenticated", serverAction: "analyzeDiagnosis" },
      });
    }
    throw err;
  }

  // 익명 user 가드 — 인증 user 가 아닐 때 (input.userId 미제공)
  // input.pipaUnderageConsent + input.overseasTransferConsent 둘 다 true 여야 통과.
  // DiagnosisForm 의 inline 체크박스가 클라이언트 측 가드 → 본 가드는 hard enforcement.
  if (!input.userId) {
    if (!input.pipaUnderageConsent || !input.overseasTransferConsent) {
      // MON-005: 익명 5층 가드 위반 — fire-and-forget Slack alert.
      void reportPipaViolation({
        ctx: {
          layer: "5_analyze_anonymous_boolean",
          serverAction: "analyzeDiagnosis",
        },
      });
      throw new ConsentRequiredError();
    }
  }

  // ── MOCK 모드 fallback (USE_MOCK_DIAGNOSIS=true) ────────────────
  if (options.searchParams) {
    const mock = getDiagnosisMock(options.searchParams);
    if (mock) {
      return DiagnosisOutputSchema.parse(mock);
    }
  }

  // ── 2단계: (익명 시) user upsert ────────────────────────────────
  // Sprint 2 §3: cookie 우선 → /rewards 와 동일 userId 보장.
  const sessionId = randomUUID();
  const userId = await resolveUserId(input);
  const isAnonymous = !input.userId;

  if (isAnonymous) {
    // DB-011: User upsert 의 update 분기는 audit_user_changes TRIGGER 발화 →
    // withActor(userId, ...) 로 익명 user 본인 id 캡처.
    // 익명 흐름의 userId 는 anonymous_user_id (cookie) 또는 supabase auth.uid —
    // 모두 withActor 의 ACTOR_ID_PATTERN ([a-zA-Z0-9_-]{1,128}) 통과.
    // SEC-COMP-PIPA (Grill #3A): create + update 양쪽에 동의 일시 기록 — 익명 user 도
    // 인증 user 와 동일하게 User row 에 보존. 본 시점은 위 가드 통과 이후라 두 boolean true 보장.
    const consentTimestamp = new Date();
    await withActor(userId, (tx) =>
      tx.user.upsert({
        where: { id: userId },
        update: {
          pipaUnderageConsentAt: consentTimestamp,
          overseasTransferConsentAt: consentTimestamp,
        },
        create: {
          id: userId,
          role: "parent",
          childAgeMonths: input.childAgeMonths,
          pipaUnderageConsentAt: consentTimestamp,
          overseasTransferConsentAt: consentTimestamp,
        },
      }),
    );
  }

  // ── 3단계: 3축 점수 계산 (Sprint 3 §1 분리 + §2 A 신호 기반 acoustic) ─
  // - articulation: 자모 단위 정확도 (phonetic similarity).
  // - linguistic: 음절 단위 어휘 완성도 (의도 단어를 끝까지 발화했는가).
  // - acoustic: input.acousticFeatures (Web Audio API 신호) 우선, 없으면 텍스트 프록시 폴백.
  const articulationScore = computePhoneticSimilarity(input.intendedWord, input.transcript);
  const linguisticScore = computeLinguisticScore(
    input.intendedWord,
    input.transcript,
    input.sttConfidence ?? null,
  );
  const acousticScore = computeAcousticScore(
    input.intendedWord,
    input.transcript,
    input.acousticFeatures ?? null,
  );

  // FR-C-002 (#25) — confidence Gemini swap (dormant 트리거 해제).
  // 기존 결정적 95 하드코딩 → 실 Gemini 출력 (또는 graceful fallback) 으로 교체.
  // computeDiagnosisConfidence 는 절대 throw 하지 않음 — test/no-key 시 fallback 공식 사용.
  // fallback 공식: clamp(평균(3축) - (분산>=30 ? 15 : 0), 0, 100).
  const confidenceResult = await computeDiagnosisConfidence({
    articulationScore,
    linguisticScore,
    acousticScore,
    targetPhoneme: input.targetPhoneme,
    childAgeMonths: input.childAgeMonths,
    userId,
  });
  const confidence = confidenceResult.confidence;

  const composite = compositeScore({
    articulationScore,
    linguisticScore,
    acousticScore,
  });
  const peerPercentile = await computePeerPercentile({
    childAgeMonths: input.childAgeMonths,
    targetPhoneme: input.targetPhoneme,
    compositeScore: composite,
  });

  // ── 4단계: SessionLog + EvaluationResult nested INSERT ──────────
  // aiCushionText 는 generateCushion Server Action 이 결과 페이지 마운트 시 비동기로 채움.
  // FR-C-002 (#25) — requiresHITL 정확화: phonetic similarity 게이트 OR confidence < 70 게이트.
  //   두 게이트는 OR — 어느 한쪽이라도 위반하면 응답 페이로드의 requiresHITL=true 로 노출.
  //   confidence 트리거 실행 자체는 maybeEnqueueHitl 가 동일 임계 (< 70) 로 분기 보장.
  const requiresHITL =
    articulationScore < HITL_SIMILARITY_THRESHOLD ||
    confidence < HITL_CONFIDENCE_THRESHOLD;

  try {
    await prisma.sessionLog.create({
      data: {
        id: sessionId,
        userId,
        durationSec: 0,
        evaluationResult: {
          create: {
            userId,
            articulationScore,
            linguisticScore,
            acousticScore,
            peerPercentile,
            confidence,
            aiCushionText: null,
            targetPhoneme: input.targetPhoneme,
            childAgeMonths: input.childAgeMonths,
            // Sprint 3 §2 B — Web Audio API features 영구 저장 (미지원/미측정 시 undefined → DB NULL).
            acousticFeatures: input.acousticFeatures ?? undefined,
          },
        },
      },
    });

    // ── 5단계: articulationScore < 50 → HITL + Slack (fire-and-forget) ──
    if (requiresHITL) {
      const queue = await enqueueForReview(sessionId, userId, articulationScore);
      void notifyHITLBySlack({
        sessionId,
        queueId: queue.id,
        confidenceScore: articulationScore, // HITL 측엔 articulation 점수가 신호.
        slaDueAt: queue.slaDueAt,
      })
        .then((slackResult) => {
          if (!slackResult.ok && !slackResult.skipped) {
            console.warn("HITL Slack 알림 실패:", slackResult.error);
          }
        })
        .catch((err) => {
          console.error("HITL Slack 알림 예외:", err);
        });
    }
  } catch (err) {
    console.error("evaluation_result INSERT failed:", err);
  }

  // ── FR-C-002 (#25) — confidence < 70 자동 HITL 이관 트리거 (fire-and-forget) ──
  // 본 게이트는 articulationScore 와 별개 — confidence 가 Gemini swap (FR-C-002) 이후 동적이므로
  // dormant 트리거가 실 신뢰도에 의해 정상 작동.
  // 응답 지연 ≤ 1ms — await 하지 않음. 실패해도 응답 페이로드 영향 0.
  //
  // 중복 호출 방지: 위 5단계 (articulation < 50) 에서 이미 enqueueForReview + Slack 발송 완료한 경우
  // maybeEnqueueHitl 의 추가 호출은 DB 측 UNIQUE 멱등성으로 update no-op 이지만 Slack 중복 알림 발생.
  // → articulation 게이트가 이미 발화했다면 confidence 게이트는 skip (동일 sessionId, 동일 큐).
  const articulationGateFired = articulationScore < HITL_SIMILARITY_THRESHOLD;
  if (!articulationGateFired) {
    void maybeEnqueueHitl({
      userId,
      diagnoseResultId: sessionId,
      confidenceScore: confidence,
      targetPhoneme: input.targetPhoneme,
    }).catch((err) => console.error("[FR-C-002] maybeEnqueueHitl 예외:", err));
  }

  // ── FR-C-002 텔레메트리 — confidence < 70 분기 (Gemini vs fallback 분기 추적) ──
  // 본 이벤트는 dormant 해제 비율 측정용. R4 보호: 자녀 식별 정보 미포함.
  // trackEvent 는 dev console.debug / prod no-op (server-side) — 흐름 차단 X.
  if (confidence < HITL_CONFIDENCE_THRESHOLD) {
    try {
      trackEvent("diagnose_confidence_low", {
        confidence,
        source: confidenceResult.source,
      });
    } catch (err) {
      console.error("[FR-C-002] diagnose_confidence_low trackEvent 예외:", err);
    }
  }

  const output: DiagnosisOutput = {
    sessionId,
    intendedWord: input.intendedWord,
    heardWord: input.transcript,
    articulationScore,
    linguisticScore,
    acousticScore,
    peerPercentile,
    confidence,
    aiCushionText: "",
    requiresHITL,
    disclaimerRequired: true,
  };

  // 별 누적 영향 — /rewards RSC 캐시 무효화.
  revalidatePath("/rewards");

  return DiagnosisOutputSchema.parse(output);
}
