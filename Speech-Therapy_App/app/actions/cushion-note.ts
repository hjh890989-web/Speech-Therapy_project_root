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
import {
  sendCushionNoteEmail,
  type CushionEmailResult,
} from "@/lib/cushion/email";

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

// =====================================================================
// FR-C-017+ — 쿠션어 알림장을 부모에게 이메일로 직접 발송 (Resend 통합).
//
// 기존 generateCushionNoteAction (클립보드 복사 경로) 와 공존:
//   - 클립보드 복사 경로 — 원장이 수동으로 채널 (카카오톡 / 문자) 발송
//   - 본 Action — 원장 클릭 1회로 Resend 가 부모 이메일 자동 발송
//
// RBAC: principal / admin / expert 만 (parent 제외 — 본인이 본인에게 보내는 시나리오 차단).
// R4: parentEmail = EvaluationResult.user.email (자녀 본인 own evaluation 의 parent)
//   - cross-institution 차단 (admin 제외)
//   - parentEmailOverride 는 admin 만 허용 (테스트 / 보강 시나리오)
// =====================================================================

const SEND_TO_PARENT_ALLOWED_ROLES = ["admin", "principal", "expert"] as const;

const SendInputSchema = z.object({
  evaluationResultId: z.string().min(1),
  noteText: z.string().min(1).max(2000),
  /// (선택) 원장이 수정한 본문 → DB 의 부모 email 대신 직접 지정.
  /// admin 만 허용 — 일반 원장은 무시.
  parentEmailOverride: z.string().email().optional(),
  /// (선택) 부모 호칭 — 인사말 prefix.
  parentName: z.string().max(40).optional(),
  /// (선택) 자녀 호칭 — UI 가 입력한 값. 본문 인사 + subject 에 사용.
  childName: z.string().max(40).optional(),
  /// (선택) 발신자 이름 — 원장이 직접 입력. 서명 line.
  senderName: z.string().max(40).optional(),
});

export interface SendCushionNoteToParentResult extends CushionEmailResult {
  evaluationResultId: string;
}

/**
 * 쿠션어 알림장을 부모 이메일로 발송 (Server Action).
 *
 * 흐름:
 *   1) Supabase auth.getUser → 401
 *   2) User 테이블 role / institutionId 조회 → role 검증 (admin/principal/expert) → 403
 *   3) EvaluationResult + user.{email,institutionId} 조회 → 404 / R4 cross-institution 차단
 *   4) parentEmail 결정 (override → admin only, 아니면 user.email)
 *   5) sendCushionNoteEmail 호출 (graceful — 절대 throw 금지)
 *
 * 사용 시나리오:
 *   - CushionNoteGenerator UI 의 "부모 이메일로 발송" 버튼
 *
 * @throws CushionAuthError (401 / 403 / 404)
 */
export async function sendCushionNoteToParent(
  rawInput: unknown,
): Promise<SendCushionNoteToParentResult> {
  const parsed = SendInputSchema.parse(rawInput);

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
  if (
    !viewerRole ||
    !(SEND_TO_PARENT_ALLOWED_ROLES as readonly string[]).includes(viewerRole)
  ) {
    throw new CushionAuthError("FORBIDDEN", 403);
  }
  const role = viewerRole as (typeof SEND_TO_PARENT_ALLOWED_ROLES)[number];

  const evaluation = await prisma.evaluationResult.findUnique({
    where: { id: parsed.evaluationResultId },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          email: true,
          institutionId: true,
          institution: { select: { name: true } },
        },
      },
    },
  });
  if (!evaluation) {
    throw new CushionAuthError("NOT_FOUND", 404);
  }

  const targetInstitutionId = evaluation.user?.institutionId ?? null;
  const isSameInstitution =
    !!viewerInstitutionId &&
    !!targetInstitutionId &&
    viewerInstitutionId === targetInstitutionId;

  // R4 — admin 외 cross-institution 차단.
  if (role !== "admin" && !isSameInstitution) {
    throw new CushionAuthError("FORBIDDEN", 403);
  }

  // parentEmail 결정 — override 는 admin 만 허용 (운영 보강).
  let parentEmail: string;
  if (parsed.parentEmailOverride && role === "admin") {
    parentEmail = parsed.parentEmailOverride.trim();
  } else {
    parentEmail = (evaluation.user?.email ?? "").trim();
  }

  const childName = parsed.childName?.trim() || "자녀";
  const institutionName = evaluation.user?.institution?.name ?? undefined;

  const out = await sendCushionNoteEmail({
    evaluationResultId: evaluation.id,
    parentEmail,
    parentName: parsed.parentName?.trim() || undefined,
    childName,
    noteText: parsed.noteText,
    senderName: parsed.senderName?.trim() || undefined,
    institutionName,
    // FR-C-NOTIFICATION-PREFERENCE — 수신자 (자녀 own evaluation 의 parent user) 옵션 확인.
    // admin override 경로에서도 동일하게 EvaluationResult.userId 의 preference 가 적용 — admin 이
    // 다른 이메일로 보내더라도 _수신자가 본인 이메일을 가진 parent user_ 의 의사 존중.
    recipientUserId: evaluation.userId,
  });

  return {
    ...out,
    evaluationResultId: evaluation.id,
  };
}
