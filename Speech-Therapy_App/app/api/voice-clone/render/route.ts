// API-018 / FR-C-027 — F11 부모 음성 TTS 렌더 Route Handler (V07).
//
// 동작:
//   1) 인증 확인 (Supabase auth) — 익명 미허용
//   2) Zod 입력 검증 — { voiceModelId, contentType, text }
//   3) ADR-09 윤리 가드 — contentType 화이트리스트 (storybook / lullaby 만 허용)
//   4) VoiceModel 조회 + 소유자 검증 + 만료 / soft delete 검증
//   5) ElevenLabs synthesize — audio (mp3) ArrayBuffer 반환
//   6) Cache-Control: 1시간 (Vercel Edge Cache 활용)
//
// R4: 자녀 식별 정보 미노출 — text 본문 (동화 텍스트) 만 외부 API 전송.
//     CON-04 금칙어 사전 검증 — 동화 페이지 콘텐츠는 사전 큐레이션 가정.
//
// Refs: TASK_API-018.md, V07 §4.1 F11, ADR-09.

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { synthesize } from "@/lib/voice-clone/elevenlabs-client";
import {
  assertVoiceContentAllowed,
  EthicsViolationError,
} from "@/lib/voice-clone/ethics-whitelist";

const InputSchema = z.object({
  voiceModelId: z.string().min(1),
  contentType: z.string().min(1),
  text: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
  // (1) 인증.
  let userId: string;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    userId = data.user.id;
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // (2) Zod 검증.
  let parsed: z.infer<typeof InputSchema>;
  try {
    const json = await request.json();
    parsed = InputSchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: err instanceof Error ? err.message : "Zod 실패" },
      { status: 400 },
    );
  }

  // (3) ADR-09 윤리 가드 — contentType 화이트리스트.
  try {
    assertVoiceContentAllowed(parsed.contentType);
  } catch (err) {
    if (err instanceof EthicsViolationError) {
      return NextResponse.json(
        {
          error: "VOICE_ETHICS_VIOLATION",
          contentType: parsed.contentType,
          message: err.message,
        },
        { status: 403 },
      );
    }
    throw err;
  }

  // (4) VoiceModel 조회 + 소유자 + 만료 검증.
  const voiceModel = await prisma.voiceModel.findUnique({
    where: { id: parsed.voiceModelId },
    select: {
      userId: true,
      modelHash: true,
      expiresAt: true,
      deletedAt: true,
      appliedContentTypes: true,
    },
  });
  if (!voiceModel) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (voiceModel.userId !== userId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (voiceModel.deletedAt) {
    return NextResponse.json({ error: "DELETED" }, { status: 410 });
  }
  if (voiceModel.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "EXPIRED" }, { status: 410 });
  }
  // VoiceModel 의 appliedContentTypes 도 cross-check (사용자가 변경했을 가능성).
  if (!voiceModel.appliedContentTypes.includes(parsed.contentType)) {
    return NextResponse.json(
      { error: "CONTENT_TYPE_NOT_ALLOWED" },
      { status: 403 },
    );
  }

  // (5) ElevenLabs synthesize.
  const result = await synthesize({
    voiceId: voiceModel.modelHash,
    text: parsed.text,
  });
  if (!result.ok || !result.data) {
    if (result.skipped) {
      return NextResponse.json(
        { error: "ELEVENLABS_SKIPPED", message: result.error },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "ELEVENLABS_ERROR", message: result.error },
      { status: 502 },
    );
  }

  // (6) audio/mpeg 응답 + Vercel Edge Cache 1시간.
  return new Response(result.data, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
