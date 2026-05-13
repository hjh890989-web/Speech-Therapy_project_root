"use server";

// FR-C-001 — analyzeDiagnosis() 3축 스코어링 비즈니스 로직 구현.
// REQ-FUNC-001~003, REQ-NF-001 (p95 ≤ 800ms).
//
// 8 단계:
//  1. Zod 입력 검증
//  2. Gemini 3축 스코어링 (JSON)
//  3. 또래 백분위 계산 (lib/peer-percentile)
//  4. AI 쿠션 텍스트 생성 (Gemini plain text)
//  5. 금칙어 검증 + 재생성 1회 (lib/forbidden-words + sanitize)
//  6. evaluation_results INSERT (Prisma)
//  7. requiresHITL 결정 (confidence < 70) → FR-C-002 (별도) 가 후속 enqueue
//  8. 출력 스키마 검증 (Zod)

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { generateJson, generatePlainText, LLMTimeoutError } from "@/lib/ai/gemini";
import {
  buildScoringPrompt,
  buildCushionPrompt,
  SYSTEM_PROMPT_SCORING,
  SYSTEM_PROMPT_CUSHION,
} from "@/lib/ai/prompts";
import { compositeScore, computePeerPercentile } from "@/lib/peer-percentile";
import { hasBannedTerm } from "@/lib/forbidden-words";
import { sanitizeUserFacingText } from "@/lib/text-safety";
import { enqueueForReview } from "@/lib/hitl";
import { notifyHITLBySlack } from "@/lib/notifications/slack";
import { getDiagnosisMock } from "@/lib/mocks/diagnosis";
import {
  DiagnosisInputSchema,
  DiagnosisOutputSchema,
  type DiagnosisInput,
  type DiagnosisOutput,
} from "@/lib/schemas/diagnosis";

const SAFE_CUSHION_FALLBACK = "오늘도 즐겁게 발음 연습을 해 보아요. 부담 갖지 말고 천천히.";
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

  // ── 2단계: Gemini 3축 스코어링 ──────────────────────────────────
  let scoring;
  try {
    scoring = await generateJson({
      system: SYSTEM_PROMPT_SCORING,
      prompt: buildScoringPrompt({
        transcript: input.transcript,
        childAgeMonths: input.childAgeMonths,
        targetPhoneme: input.targetPhoneme,
      }),
      schema: GeminiScoringSchema,
    });
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

  // ── 4단계: AI 쿠션 텍스트 (재생성 1회 포함) ─────────────────────
  let cushion = await safeCushion({
    peerPercentile,
    targetPhoneme: input.targetPhoneme,
    childAgeMonths: input.childAgeMonths,
  });
  // ── 5단계: 금칙어 검증 + 재생성 1회 ─────────────────────────────
  if (hasBannedTerm(cushion)) {
    cushion = await safeCushion({
      peerPercentile,
      targetPhoneme: input.targetPhoneme,
      childAgeMonths: input.childAgeMonths,
    });
    if (hasBannedTerm(cushion)) cushion = SAFE_CUSHION_FALLBACK;
  }
  // 최종 sanitize — 어떤 경우든 안전 fallback 보장.
  const aiCushionText = sanitizeUserFacingText(cushion);

  // ── 6단계: evaluation_results INSERT ────────────────────────────
  // Sprint 1: 무로그인 사용자도 분석 결과를 DB 에 저장해야 result 페이지가 동작.
  // anonymousUserId 또는 새 UUID 로 User row 자동 upsert (role: parent).
  const sessionId = randomUUID();
  const requiresHITL = scoring.confidence < HITL_THRESHOLD;
  const userId = input.userId ?? input.anonymousUserId ?? randomUUID();
  const isAnonymous = !input.userId;

  try {
    if (isAnonymous) {
      // 익명 사용자 user row 자동 생성 (멱등 upsert).
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

    await prisma.sessionLog.create({
      data: { id: sessionId, userId, durationSec: 0 },
    });
    await prisma.evaluationResult.create({
      data: {
        sessionId,
        userId,
        articulationScore: scoring.articulation,
        linguisticScore: scoring.linguistic,
        acousticScore: scoring.acoustic,
        peerPercentile,
        confidence: scoring.confidence,
        aiCushionText,
        targetPhoneme: input.targetPhoneme,
        childAgeMonths: input.childAgeMonths,
      },
    });

    // ── 7단계: Confidence < 70 → HITL 큐 등록 + Slack 웹훅 (FR-C-002) ──
    if (requiresHITL) {
      const queue = await enqueueForReview(sessionId, userId, scoring.confidence);
      // D4: Slack 알림. 실패해도 사용자 응답 막지 않음 (graceful degradation).
      const slackResult = await notifyHITLBySlack({
        sessionId,
        queueId: queue.id,
        confidenceScore: scoring.confidence,
        slaDueAt: queue.slaDueAt,
      });
      if (!slackResult.ok && !slackResult.skipped) {
        console.warn("HITL Slack 알림 실패:", slackResult.error);
      }
    }
  } catch (err) {
    // DB 저장 실패는 사용자 응답을 막지 않음 (R8 free-tier 가용성 보호).
    console.error("evaluation_result INSERT failed:", err);
  }

  // ── 8단계: 출력 스키마 검증 + 반환 ──────────────────────────────
  const output: DiagnosisOutput = {
    sessionId,
    articulationScore: scoring.articulation,
    linguisticScore: scoring.linguistic,
    acousticScore: scoring.acoustic,
    peerPercentile,
    confidence: scoring.confidence,
    aiCushionText,
    requiresHITL,
    disclaimerRequired: true,
  };
  return DiagnosisOutputSchema.parse(output);
}

async function safeCushion(args: {
  peerPercentile: number;
  targetPhoneme: string;
  childAgeMonths: number;
}): Promise<string> {
  try {
    return await generatePlainText({
      system: SYSTEM_PROMPT_CUSHION,
      prompt: buildCushionPrompt(args),
    });
  } catch {
    return SAFE_CUSHION_FALLBACK;
  }
}
