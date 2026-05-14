"use server";

// FR-C-001 — analyzeDiagnosis() 3축 스코어링 비즈니스 로직 구현.
// REQ-FUNC-001~003, REQ-NF-001 (p95 ≤ 800ms).
//
// 6 단계 (쿠션 텍스트는 generateCushion Server Action 으로 분리 — 결과 페이지 Suspense 로 후속 로드):
//  1. Zod 입력 검증
//  2. Gemini 스코어링 (JSON) + (익명 시) user upsert 병렬 실행 — 유일한 동기 Gemini 호출
//  3. 또래 백분위 계산 (lib/peer-percentile)
//  4. SessionLog + EvaluationResult nested INSERT (단일 round-trip)
//  5. requiresHITL 결정 (confidence < 70) → enqueue 동기, Slack 알림 fire-and-forget
//  6. 출력 스키마 검증 (Zod)

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { generateJson, LLMTimeoutError } from "@/lib/ai/gemini";
import { buildScoringPrompt, SYSTEM_PROMPT_SCORING } from "@/lib/ai/prompts";
import { compositeScore, computePeerPercentile } from "@/lib/peer-percentile";
import { enqueueForReview } from "@/lib/hitl";
import { notifyHITLBySlack } from "@/lib/notifications/slack";
import { getDiagnosisMock } from "@/lib/mocks/diagnosis";
import {
  DiagnosisInputSchema,
  DiagnosisOutputSchema,
  type DiagnosisInput,
  type DiagnosisOutput,
} from "@/lib/schemas/diagnosis";

const HITL_THRESHOLD = 70;

// Gemini 가 반환할 JSON 스키마.
const GeminiScoringSchema = z.object({
  articulation: z.number().min(0).max(100),
  linguistic: z.number().min(0).max(100),
  acoustic: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
});

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

  // ── 2단계: Gemini 스코어링 + (익명 사용자) user upsert 병렬 실행 ──
  // user upsert 는 Gemini 응답 (5~10s) 와 무관하므로 동시에 진행 → ~200ms 절감.
  const sessionId = randomUUID();
  const userId = input.userId ?? input.anonymousUserId ?? randomUUID();
  const isAnonymous = !input.userId;

  const userUpsertPromise = isAnonymous
    ? prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          role: "parent",
          childAgeMonths: input.childAgeMonths,
        },
      })
    : Promise.resolve(null);

  let scoring;
  try {
    const [scoringResult] = await Promise.all([
      generateJson({
        system: SYSTEM_PROMPT_SCORING,
        prompt: buildScoringPrompt({
          transcript: input.transcript,
          childAgeMonths: input.childAgeMonths,
          targetPhoneme: input.targetPhoneme,
        }),
        schema: GeminiScoringSchema,
      }),
      userUpsertPromise,
    ]);
    scoring = scoringResult;
  } catch (err) {
    if (err instanceof LLMTimeoutError) {
      throw new Error("LLM_TIMEOUT");
    }
    throw err;
  }

  const composite = compositeScore({
    articulationScore: scoring.articulation,
    linguisticScore: scoring.linguistic,
    acousticScore: scoring.acoustic,
  });

  // ── 3단계: 또래 백분위 ──────────────────────────────────────────
  const peerPercentile = await computePeerPercentile({
    childAgeMonths: input.childAgeMonths,
    targetPhoneme: input.targetPhoneme,
    compositeScore: composite,
  });

  // ── 4단계: SessionLog + EvaluationResult nested INSERT (단일 트랜잭션) ─
  // Prisma nested create 로 sessionLog → evaluationResult FK 의존을 1회 round-trip 에 처리.
  // aiCushionText 는 generateCushion Server Action 이 결과 페이지 마운트 시 비동기로 채움.
  const requiresHITL = scoring.confidence < HITL_THRESHOLD;

  try {
    await prisma.sessionLog.create({
      data: {
        id: sessionId,
        userId,
        durationSec: 0,
        evaluationResult: {
          create: {
            userId,
            articulationScore: scoring.articulation,
            linguisticScore: scoring.linguistic,
            acousticScore: scoring.acoustic,
            peerPercentile,
            confidence: scoring.confidence,
            aiCushionText: null,
            targetPhoneme: input.targetPhoneme,
            childAgeMonths: input.childAgeMonths,
          },
        },
      },
    });

    // ── 5단계: Confidence < 70 → HITL 큐 등록 + Slack 웹훅 (FR-C-002) ──
    // G: Slack 호출은 fire-and-forget — 사용자 응답을 ~1~2s 빠르게 반환.
    // 큐 등록은 동기 (HITL 추적 손실 방지), Slack 알림만 비동기.
    if (requiresHITL) {
      const queue = await enqueueForReview(sessionId, userId, scoring.confidence);
      void notifyHITLBySlack({
        sessionId,
        queueId: queue.id,
        confidenceScore: scoring.confidence,
        slaDueAt: queue.slaDueAt,
      })
        .then((slackResult) => {
          if (!slackResult.ok && !slackResult.skipped) {
            console.warn("HITL Slack 알림 실패:", slackResult.error);
          }
        })
        .catch((err) => {
          // fire-and-forget: 사용자 응답에는 영향 없음, 로깅만.
          console.error("HITL Slack 알림 예외:", err);
        });
    }
  } catch (err) {
    // DB 저장 실패는 사용자 응답을 막지 않음 (R8 free-tier 가용성 보호).
    console.error("evaluation_result INSERT failed:", err);
  }

  // ── 6단계: 출력 스키마 검증 + 반환 ──────────────────────────────
  // aiCushionText 는 결과 페이지가 generateCushion 으로 후속 로드 → 빈 문자열 반환.
  const output: DiagnosisOutput = {
    sessionId,
    articulationScore: scoring.articulation,
    linguisticScore: scoring.linguistic,
    acousticScore: scoring.acoustic,
    peerPercentile,
    confidence: scoring.confidence,
    aiCushionText: "",
    requiresHITL,
    disclaimerRequired: true,
  };
  return DiagnosisOutputSchema.parse(output);
}
