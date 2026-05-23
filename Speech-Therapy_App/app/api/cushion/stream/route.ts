// FR-C-017 (#40 Replace D8) — POST /api/cushion/stream
//
// AI 쿠션어 알림장 streaming endpoint.
// 클라이언트 (components/admin/CushionNoteGenerator) 가 호출 → fetch().body 의
// ReadableStream 을 한 글자씩 textarea 에 페인트.
//
// 흐름:
//   1) Supabase auth.getUser() — 익명 시 401
//   2) User.role SELECT — admin / principal / expert / parent 만 통과 (그 외 403)
//   3) request body Zod 검증 — evaluationResultId 필수
//   4) Prisma EvaluationResult + User join → CushionInput 변환
//      - row 부재 시 404
//      - R4 (다른 institutionId 의 결과 접근) — 호출자 role 별 분기:
//        * parent: 본인 evaluationResults 만 (userId === viewerId)
//        * principal/admin/expert: 같은 institutionId 의 user 의 결과만
//   5) streamCushionNote(input) → text/plain stream 반환
//
// 응답 헤더:
//   - Content-Type: text/plain; charset=utf-8
//   - X-Cushion-Source: streaming / template-forced (forced fallback 분기 추적)
//
// 금칙어 (CON-04): streamCushionNote 안에서 자동 swap 마커 ([__CUSHION_SWAP__]) 발송.
// 클라이언트가 마커 인지 시 누적 텍스트를 마커 이후 chunk 로 교체.

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { streamCushionNote, type TargetPhoneme } from "@/lib/cushion/generate";

const ALLOWED_ROLES = ["admin", "principal", "expert", "parent"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

const BodySchema = z.object({
  evaluationResultId: z.string().min(1),
  /** UI 가 자녀 호칭을 별도 제어할 수 있도록 optional 허용. */
  studentName: z.string().max(40).optional(),
});

const ALLOWED_PHONEMES = new Set<TargetPhoneme>(["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"]);

function isAllowedPhoneme(value: string): value is TargetPhoneme {
  return ALLOWED_PHONEMES.has(value as TargetPhoneme);
}

export async function POST(request: Request) {
  // 1) Supabase auth.
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

  // 2) role 조회.
  let viewerRole: string | null = null;
  let viewerInstitutionId: string | null = null;
  try {
    const { data: row, error: roleError } = await supabase
      .from("User")
      .select("role,institutionId")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null; institutionId: string | null }>();
    if (roleError) {
      return NextResponse.json(
        { error: "INTERNAL_ERROR", detail: roleError.message },
        { status: 500 },
      );
    }
    viewerRole = row?.role ?? null;
    viewerInstitutionId = row?.institutionId ?? null;
  } catch (err) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  if (!viewerRole || !(ALLOWED_ROLES as readonly string[]).includes(viewerRole)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const role = viewerRole as AllowedRole;

  // 3) body Zod.
  let parsed: z.infer<typeof BodySchema>;
  try {
    const body = await request.json();
    parsed = BodySchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: "INVALID_INPUT", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  // 4) EvaluationResult 조회 + R4 보호.
  let evaluation;
  try {
    evaluation = await prisma.evaluationResult.findUnique({
      where: { id: parsed.evaluationResultId },
      select: {
        id: true,
        userId: true,
        targetPhoneme: true,
        articulationScore: true,
        linguisticScore: true,
        acousticScore: true,
        user: {
          select: { institutionId: true },
        },
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  if (!evaluation) {
    return NextResponse.json(
      { error: "NOT_FOUND", detail: `evaluationResultId=${parsed.evaluationResultId}` },
      { status: 404 },
    );
  }

  // R4 보호: 부모는 본인 결과만, 그 외 (principal/admin/expert) 는 같은 institutionId 만.
  const targetInstitutionId = evaluation.user?.institutionId ?? null;
  const isOwnResult = evaluation.userId === user.id;
  const isSameInstitution =
    !!viewerInstitutionId &&
    !!targetInstitutionId &&
    viewerInstitutionId === targetInstitutionId;

  let authorized = false;
  if (role === "parent") {
    authorized = isOwnResult;
  } else if (role === "admin") {
    // admin 은 전체 접근 — institutionId 가 없어도 OK.
    authorized = true;
  } else {
    // principal / expert — 같은 institution 만.
    authorized = isOwnResult || isSameInstitution;
  }

  if (!authorized) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // 5) phoneme 정규화 + stream.
  const phoneme = isAllowedPhoneme(evaluation.targetPhoneme)
    ? evaluation.targetPhoneme
    : "ㅅ"; // 호환성 fallback (legacy row).

  const stream = await streamCushionNote({
    evaluationResultId: evaluation.id,
    studentName: parsed.studentName,
    targetPhoneme: phoneme,
    articulationScore: evaluation.articulationScore,
    linguisticScore: evaluation.linguisticScore,
    acousticScore: evaluation.acousticScore,
  });

  // ReadableStream<string> → Response (text/plain UTF-8).
  // TextEncoder 로 byte stream 변환.
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
      "X-Cushion-Source": "streaming",
    },
  });
}
