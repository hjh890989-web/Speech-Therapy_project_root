"use server";

// FR-C-001 (Sprint 2 §2) — analyzeDiagnosis 비즈니스 로직.
//
// 변경 핵심: Gemini 텍스트 평가 → phonetic similarity (의도 vs 실현 자모 비교).
// Web Speech API 의 STT 보정으로 사라지던 발음 차이 정보를 결정적 알고리즘으로 복원.
//
// 5 단계 (Sprint 1 의 §A: 쿠션 분리, §B: user upsert 병렬, §C: Slack fire-and-forget 유지):
//  1. Zod 입력 검증 (intendedWord 필수)
//  2. (익명 시) user upsert
//  3. phonetic similarity 계산 → articulationScore (결정적, 즉시)
//  4. SessionLog + EvaluationResult nested INSERT
//  5. articulationScore < 50 → HITL 큐 등록 + Slack 알림 (fire-and-forget)
//
// Gemini 호출 제거 → 응답 시간 ~5~10s 추가 단축 기대.

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { compositeScore, computePeerPercentile } from "@/lib/peer-percentile";
import { computePhoneticSimilarity } from "@/lib/phonetic-similarity";
import { enqueueForReview } from "@/lib/hitl";
import { notifyHITLBySlack } from "@/lib/notifications/slack";
import { getDiagnosisMock } from "@/lib/mocks/diagnosis";
import {
  DiagnosisInputSchema,
  DiagnosisOutputSchema,
  type DiagnosisInput,
  type DiagnosisOutput,
} from "@/lib/schemas/diagnosis";

import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";

/**
 * Sprint 2 §4 — userId 우선순위 재정렬 (별 누적 1개 고착 fix).
 *  1. input.userId (인증 사용자, 최우선)
 *  2. input.anonymousUserId (클라이언트 localStorage 권위, useAnonymousUserId hook 과 동일 방향)
 *  3. cookie 의 anonymous_user_id (proxy.ts 가 발급한 stale 값일 수 있음 — 폴백)
 *  4. randomUUID (방어적, 정상 흐름엔 도달 안 함)
 *
 * 폐기 사유: §3 의 "cookie 우선" 은 proxy.ts 가 ITP 클리어 후 새 UUID 를 발급하면
 * 보상이 새 userId 에 분산 저장되는 root cause 였음. localStorage 권위로 통일.
 */
async function resolveUserId(input: DiagnosisInput): Promise<string> {
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
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        role: "parent",
        childAgeMonths: input.childAgeMonths,
      },
    });
  }

  // ── 3단계: phonetic similarity → articulationScore + 또래 백분위 ─
  // Sprint 2 §2: deterministic. STT transcript 가 의도 단어와 자모 단위로 얼마나 다른지.
  // linguistic / acoustic 은 Sprint 3 에서 별도 재설계 — 현재는 articulation 동값 노출
  // (3 축 분리 노이즈 회피, 사용자에게 단일 신호로 일관성 있게 표시).
  const articulationScore = computePhoneticSimilarity(input.intendedWord, input.transcript);
  const linguisticScore = articulationScore;
  const acousticScore = articulationScore;

  // 결정적 알고리즘이므로 confidence 는 항상 높음 (95). HITL 트리거는 articulationScore 기반.
  const confidence = 95;

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
  const requiresHITL = articulationScore < HITL_SIMILARITY_THRESHOLD;

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
  return DiagnosisOutputSchema.parse(output);
}
