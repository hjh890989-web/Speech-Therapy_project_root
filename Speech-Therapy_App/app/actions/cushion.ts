"use server";

// FR-C-001 §A — generateCushion Server Action.
// 진단 결과 페이지 (Suspense) 가 마운트 시 호출. analyzeDiagnosis 에서 분리해
// 결과 페이지 도착 시간을 ~10s 단축 (Gemini 2회 → 1회 동기).
//
// 동작:
//  1. sessionId 로 evaluation_results 조회 → peerPercentile / 음소 / 월령 확보
//  2. 이미 aiCushionText 가 채워져 있으면 그대로 반환 (cache hit / 새로고침 멱등)
//  3. Gemini cushion 생성 + 금칙어 검증 + 1회 재생성 + sanitize
//  4. UPDATE evaluation_results.aiCushionText
//  5. 텍스트 반환

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { generatePlainText, LLMTimeoutError, RateLimitedError } from "@/lib/ai/gemini";
import { SYSTEM_PROMPT_CUSHION, buildCushionPrompt } from "@/lib/ai/prompts";
import { hasBannedTerm } from "@/lib/forbidden-words";
import { sanitizeUserFacingText } from "@/lib/text-safety";

const SAFE_CUSHION_FALLBACK = "오늘도 즐겁게 발음 연습을 해 보아요. 부담 갖지 말고 천천히.";

const InputSchema = z.object({
  sessionId: z.string().uuid(),
});

export interface GenerateCushionResult {
  aiCushionText: string;
  /** 캐시 히트 (DB 에 이미 채워져 있어 Gemini 미호출) 여부. */
  fromCache: boolean;
}

export async function generateCushion(rawInput: unknown): Promise<GenerateCushionResult> {
  const { sessionId } = InputSchema.parse(rawInput);

  const row = await prisma.evaluationResult.findUnique({
    where: { sessionId },
    select: {
      aiCushionText: true,
      peerPercentile: true,
      targetPhoneme: true,
      childAgeMonths: true,
      userId: true,
    },
  });

  if (!row) {
    return { aiCushionText: SAFE_CUSHION_FALLBACK, fromCache: false };
  }

  if (row.aiCushionText && row.aiCushionText.length > 0) {
    return { aiCushionText: row.aiCushionText, fromCache: true };
  }

  const args = {
    peerPercentile: row.peerPercentile,
    targetPhoneme: row.targetPhoneme,
    childAgeMonths: row.childAgeMonths,
    // Sprint 3 §2 E — rate limiter 추적 키.
    userId: row.userId,
  };

  let cushion = await safeCushion(args);
  if (hasBannedTerm(cushion)) {
    cushion = await safeCushion(args);
    if (hasBannedTerm(cushion)) cushion = SAFE_CUSHION_FALLBACK;
  }
  const aiCushionText = sanitizeUserFacingText(cushion);

  try {
    await prisma.evaluationResult.update({
      where: { sessionId },
      data: { aiCushionText },
    });
    // aiCushionText 갱신 → 결과 페이지 RSC 캐시 무효화.
    revalidatePath(`/diagnose/result/${sessionId}`);
  } catch (err) {
    // UPDATE 실패는 사용자 응답을 막지 않음 — 다음 방문 시 재생성.
    console.error("evaluation_result UPDATE aiCushionText failed:", err);
  }

  return { aiCushionText, fromCache: false };
}

async function safeCushion(args: {
  peerPercentile: number;
  targetPhoneme: string;
  childAgeMonths: number;
  userId: string;
}): Promise<string> {
  try {
    return await generatePlainText({
      system: SYSTEM_PROMPT_CUSHION,
      prompt: buildCushionPrompt({
        peerPercentile: args.peerPercentile,
        targetPhoneme: args.targetPhoneme,
        childAgeMonths: args.childAgeMonths,
      }),
      userId: args.userId,
    });
  } catch (err) {
    if (err instanceof RateLimitedError) {
      // Sprint 3 §2 E — RPM 또는 일 한도 초과 시 graceful fallback.
      // 사용자 흐름 막지 않음 (cushion 은 보조 정보).
      console.warn(`Gemini rate limited: ${err.reason} retry in ${err.retryAfterSec}s`);
      return SAFE_CUSHION_FALLBACK;
    }
    if (err instanceof LLMTimeoutError) {
      // 타임아웃은 fallback 으로 처리 (사용자 흐름 끊지 않음).
      return SAFE_CUSHION_FALLBACK;
    }
    return SAFE_CUSHION_FALLBACK;
  }
}
