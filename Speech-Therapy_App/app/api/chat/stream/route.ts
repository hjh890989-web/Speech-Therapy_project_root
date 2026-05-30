// API-NEW-F15-1 — POST /api/chat/stream (F15 LLM 발화 유도 챗봇 스트리밍).
//
// 흐름:
//   0) ADR-14 게이트 — F15_CHAT_ENABLED !== 'true' 시 스트림 진입 전 403 (UI 우회/직접 호출 차단).
//   1) Supabase auth.getUser() — 익명 시 401 (인증 전용 슬라이스).
//   2) Zod messages 검증 — 400.
//   3) 입력 금칙어 — 전 메시지에 의료/단정 표현 시 Gemini 미호출, 안전 멘트로 화제 전환(graceful 200).
//   4) rate-limit(SEC-004) — Gemini 무료 RPM 보호. 차단 시 429.
//   5) streamChatReply → text/plain stream (cushion 패턴: TextEncoder TransformStream).
//
// Node 런타임(Prisma 7 Edge 비호환 — 프로젝트 전 route 일관) + force-dynamic.
//
// ⚠️ F15_CHAT_ENABLED 는 default 미설정(false). ADR-14 §10 KOPLAC 13항목(IRB·식약처 포함) 통과 전 비활성.

import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, recordCall } from "@/lib/ratelimit";
import { streamChatReply, type ChatTurn } from "@/lib/ai/chat-stream";
import { containsForbidden, SAFE_FALLBACK_MESSAGE } from "@/lib/ai/profanity-filter";
import {
  assertConsentedIfAuthenticated,
  ConsentRequiredError,
} from "@/lib/policy/consent-guard";
import { reportPipaViolation } from "@/lib/monitoring/pipa-violation";
import { maskPii } from "@/lib/ai/pii-mask";

export const dynamic = "force-dynamic";

const TurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});
const BodySchema = z.object({
  messages: z.array(TurnSchema).min(1).max(40),
});

function isF15Enabled(): boolean {
  return process.env.F15_CHAT_ENABLED === "true";
}

/// ReadableStream<string> → text/plain UTF-8 Response (cushion 패턴).
function streamResponse(stream: ReadableStream<string>, source: string): Response {
  const encoder = new TextEncoder();
  const byteStream = stream.pipeThrough(
    new TransformStream<string, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(encoder.encode(chunk));
      },
    }),
  );
  return new Response(byteStream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Chat-Source": source,
    },
  });
}

export async function POST(request: Request) {
  // 0) ADR-14 게이트 — 스트림 진입 전 차단.
  if (!isF15Enabled()) {
    return NextResponse.json(
      { error: "F15_DISABLED", detail: "임상 자문 진행 중입니다." },
      { status: 403 },
    );
  }

  // 1) auth.
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch (err) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 1.5) PIPA 가드 — 자녀 발화 처리 + Gemini 국외 이전(§17) 전 §22-6/§17 동의 확인(진단/F11 동등 Tier).
  //      Gemini 국외 이전 직전 binding 경로 → DB 장애 시 fail-closed(미동의 데이터 외부 전송 차단).
  try {
    await assertConsentedIfAuthenticated({ failClosedOnDbError: true });
  } catch (err) {
    if (err instanceof ConsentRequiredError) {
      void reportPipaViolation({
        ctx: { layer: "2_analyze_authenticated", serverAction: "chatStream" },
      });
      return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 403 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  // 2) body Zod.
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "INVALID_INPUT", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  // 3) 입력 금칙어 — 의료/단정 화제는 Gemini 미호출 + 안전 멘트로 graceful 전환(아이 발화를 막지 않음).
  //     마지막 user 발화만이 아니라 *전 메시지*(과거 turn·assistant·재전송 포함)를 검사 —
  //     클라이언트 조작으로 과거 turn 에 금칙어를 심어 우회하지 못하도록(적대적 검증 low).
  if (parsed.messages.some((m) => containsForbidden(m.content))) {
    const safe = new ReadableStream<string>({
      start(controller) {
        controller.enqueue(SAFE_FALLBACK_MESSAGE);
        controller.close();
      },
    });
    return streamResponse(safe, "input-guard");
  }

  // 4) rate-limit (SEC-004).
  const rl = checkRateLimit(user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", reason: rl.reason, retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
  }

  // 5) stream — R4: Gemini 국외 이전 전 user/assistant 메시지 PII 마스킹.
  const maskedMessages = parsed.messages.map((m) => ({ ...m, content: maskPii(m.content) }));
  const stream = streamChatReply(maskedMessages as ChatTurn[]);
  recordCall(user.id);
  return streamResponse(stream, "streaming");
}
