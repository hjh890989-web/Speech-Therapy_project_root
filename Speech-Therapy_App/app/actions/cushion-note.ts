"use server";

// FR-C-017 (#40 Replace D8) — AI 쿠션어 알림장 Server Action (전체 텍스트, 동기).
//
// 책임:
//   - streaming 비대응 환경 (SSR snapshot, 테스트, JS 비활성 fallback) 에서 전체 텍스트 반환
//   - 동일한 RBAC + R4 보호 (POST /api/cushion/stream 과 정합)
//   - 동일한 graceful fallback (CON-04 자동 swap)
//
// 사용 시나리오:
//   - Admin 페이지의 "텍스트만 즉시 생성" 보조 버튼
//   - 테스트 (vitest) 가 streaming 안 거치고 결과 검증
//
// 본 Action 은 streamCushionNote 와 다른 표면 — 호출자가 명시 선택.

import { z } from "zod";

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  generateCushionNote,
  type CushionSource,
  type CushionFallbackReason,
  type TargetPhoneme,
} from "@/lib/cushion/generate";

const InputSchema = z.object({
  evaluationResultId: z.string().min(1),
  studentName: z.string().max(40).optional(),
});

const ALLOWED_ROLES = ["admin", "principal", "expert", "parent"] as const;

export interface GenerateCushionNoteResult {
  text: string;
  source: CushionSource;
  fallbackReason: CushionFallbackReason | null;
  evaluationResultId: string;
}

export class CushionAuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 404,
  ) {
    super(message);
    this.name = "CushionAuthError";
  }
}

const ALLOWED_PHONEMES = new Set<TargetPhoneme>(["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"]);

function isAllowedPhoneme(value: string): value is TargetPhoneme {
  return ALLOWED_PHONEMES.has(value as TargetPhoneme);
}

/**
 * 알림장 텍스트를 한 번에 생성 (streaming 아님).
 *
 * RBAC + R4 보호 흐름은 POST /api/cushion/stream 과 동일.
 *
 * @throws CushionAuthError (401 / 403 / 404)
 */
export async function generateCushionNoteAction(
  rawInput: unknown,
): Promise<GenerateCushionNoteResult> {
  const parsed = InputSchema.parse(rawInput);

  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new CushionAuthError("UNAUTHORIZED", 401);
  }

  const { data: viewerRow, error: roleError } = await supabase
    .from("User")
    .select("role,institutionId")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null; institutionId: string | null }>();
  if (roleError) {
    throw new Error(`role lookup failed: ${roleError.message}`);
  }
  const viewerRole = viewerRow?.role ?? null;
  const viewerInstitutionId = viewerRow?.institutionId ?? null;
  if (!viewerRole || !(ALLOWED_ROLES as readonly string[]).includes(viewerRole)) {
    throw new CushionAuthError("FORBIDDEN", 403);
  }
  const role = viewerRole as (typeof ALLOWED_ROLES)[number];

  const evaluation = await prisma.evaluationResult.findUnique({
    where: { id: parsed.evaluationResultId },
    select: {
      id: true,
      userId: true,
      targetPhoneme: true,
      articulationScore: true,
      linguisticScore: true,
      acousticScore: true,
      user: { select: { institutionId: true } },
    },
  });
  if (!evaluation) {
    throw new CushionAuthError("NOT_FOUND", 404);
  }

  const targetInstitutionId = evaluation.user?.institutionId ?? null;
  const isOwnResult = evaluation.userId === user.id;
  const isSameInstitution =
    !!viewerInstitutionId &&
    !!targetInstitutionId &&
    viewerInstitutionId === targetInstitutionId;

  let authorized = false;
  if (role === "parent") authorized = isOwnResult;
  else if (role === "admin") authorized = true;
  else authorized = isOwnResult || isSameInstitution;

  if (!authorized) {
    throw new CushionAuthError("FORBIDDEN", 403);
  }

  const phoneme = isAllowedPhoneme(evaluation.targetPhoneme)
    ? evaluation.targetPhoneme
    : "ㅅ";

  const out = await generateCushionNote({
    evaluationResultId: evaluation.id,
    studentName: parsed.studentName,
    targetPhoneme: phoneme,
    articulationScore: evaluation.articulationScore,
    linguisticScore: evaluation.linguisticScore,
    acousticScore: evaluation.acousticScore,
  });

  return {
    text: out.text,
    source: out.source,
    fallbackReason: out.fallbackReason,
    evaluationResultId: evaluation.id,
  };
}
