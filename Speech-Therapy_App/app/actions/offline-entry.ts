"use server";

// FR-Q-013 후속 — submitOfflineEntry Server Action.
//
// 흐름:
//   1) Supabase auth → viewerId (입력 author) 확인
//   2) prisma.user.findUnique — viewer role / institutionId 조회 + RBAC
//      허용 role : teacher / principal / admin
//   3) prisma.user.findUnique — target (자녀) role / institutionId 조회
//      자녀가 role='parent' 이어야 함. 미존재 시 invalid_target.
//   4) cross-institution 차단 (admin 제외):
//      viewer.institutionId == target.institutionId 필요
//      (양쪽 비어 있으면 차단)
//   5) Zod 입력 검증 + CON-04 금칙어 검사 (note 본문 hasBannedTerm)
//   6) createOfflineEntry — withActor(viewerId, ...) 안에서 INSERT
//   7) revalidatePath — /admin/timeline/[userId] + offline-entry 페이지
//   8) 분석 이벤트 발송 (server-side console.log — Vercel Logs)
//
// graceful (throw 절대 금지):
//   - 모든 분기는 { success: false, reason } 결과 객체 반환.
//   - 성공 시 { success: true, entryId, observedAt }.
//
// R4 (자녀 보호):
//   - viewer 가 본인 institution 의 자녀에만 입력 가능 — cross-tenant 차단.
//   - note 본문 자녀 PII (이름/email/주소) 입력은 author 책임 — 본 Action 은 검출 X.
//
// CON-04: note 본문 금칙어 ("치료/진단/장애" 등) 검출 시 즉시 reject.

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { hasBannedTerm } from "@/lib/forbidden-words";
import {
  createOfflineEntry,
  OFFLINE_ENTRY_KINDS,
  OFFLINE_ENTRY_NOTE_MAX_LENGTH,
} from "@/lib/offline-entry/repo";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports 는 ./offline-entry-shape 으로 분리.
import type { SubmitOfflineEntryResult } from "./offline-entry-shape";

/// 본 Action 허용 role — teacher / principal / admin.
/// expert / parent 차단.
const SUBMIT_ALLOWED_ROLES = ["admin", "principal", "teacher"] as const;
type AllowedRole = (typeof SUBMIT_ALLOWED_ROLES)[number];

/** Zod schema — Server Action 진입 시 강제. */
const InputSchema = z.object({
  userId: z.string().min(1, "자녀 식별자가 필요해요."),
  kind: z.enum(OFFLINE_ENTRY_KINDS),
  note: z
    .string()
    .min(1, "메모 내용을 입력해 주세요.")
    .max(
      OFFLINE_ENTRY_NOTE_MAX_LENGTH,
      `메모는 최대 ${OFFLINE_ENTRY_NOTE_MAX_LENGTH}자까지 입력할 수 있어요.`,
    ),
  observedAt: z.string().optional(),
});

/// server-side telemetry — Vercel Logs 수집. R4: 자녀 식별 정보 노출 0건.
function logEntryCreated(properties: {
  userId: string;
  kind: string;
  noteLength: number;
}): void {
  try {
    console.log(
      JSON.stringify({
        level: "info",
        event: "offline_entry_created",
        properties,
      }),
    );
  } catch {
    // graceful — 텔레메트리 실패는 사용자 흐름 차단 X.
  }
}

/**
 * 오프라인 entry 입력 (teacher/principal/admin).
 *
 * RBAC 정책:
 *   - Supabase auth uid 필수 (비로그인 차단).
 *   - viewer.role ∈ {teacher, principal, admin}.
 *   - admin 제외 cross-institution 차단 (viewer.institutionId == target.institutionId).
 *   - target.role === 'parent' — 자녀에만 입력 가능.
 *
 * CON-04: note 본문 금칙어 즉시 reject (1차 검증).
 */
export async function submitOfflineEntry(
  rawInput: unknown,
): Promise<SubmitOfflineEntryResult> {
  // 1) Zod 입력 검증 — schema 분기.
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      reason: "invalid_input",
      message:
        parsed.error.issues[0]?.message ?? "입력 값이 올바르지 않아요.",
    };
  }
  const input = parsed.data;

  // 2) CON-04 금칙어 검사 — note 본문.
  if (hasBannedTerm(input.note)) {
    return {
      success: false,
      reason: "banned_term",
      message:
        "메모에 사용할 수 없는 단어가 포함됐어요. 다른 표현으로 다시 입력해 주세요.",
    };
  }

  // 3) Supabase auth.
  let viewerId: string;
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      return {
        success: false,
        reason: "unauthorized",
        message: "로그인 후 다시 시도해 주세요.",
      };
    }
    viewerId = data.user.id;
  } catch {
    return {
      success: false,
      reason: "unauthorized",
      message: "로그인 상태를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 4) viewer / target 동시 조회 (단일 round trip 효율).
  let viewerRow: { role: string | null; institutionId: string | null } | null;
  let targetRow: { role: string | null; institutionId: string | null } | null;
  try {
    [viewerRow, targetRow] = await Promise.all([
      prisma.user.findUnique({
        where: { id: viewerId },
        select: { role: true, institutionId: true },
      }),
      prisma.user.findUnique({
        where: { id: input.userId },
        select: { role: true, institutionId: true },
      }),
    ]);
  } catch {
    return {
      success: false,
      reason: "db_failed",
      message: "사용자 정보를 조회하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 5) RBAC — viewer role.
  if (
    !viewerRow?.role ||
    !(SUBMIT_ALLOWED_ROLES as readonly string[]).includes(viewerRow.role)
  ) {
    return {
      success: false,
      reason: "forbidden",
      message: "본 작업은 선생님/원장/관리자만 수행할 수 있어요.",
    };
  }
  const viewerRole = viewerRow.role as AllowedRole;

  // 6) target 검증 — 존재 + role=parent.
  if (!targetRow || targetRow.role !== "parent") {
    return {
      success: false,
      reason: "invalid_target",
      message: "대상 자녀(보호자) 계정을 찾을 수 없어요.",
    };
  }

  // 7) cross-institution 차단 (admin 제외).
  if (viewerRole !== "admin") {
    if (
      !viewerRow.institutionId ||
      !targetRow.institutionId ||
      viewerRow.institutionId !== targetRow.institutionId
    ) {
      return {
        success: false,
        reason: "cross_institution",
        message: "본 기관 소속이 아닌 자녀에게는 입력할 수 없어요.",
      };
    }
  }

  // 8) observedAt parse (선택).
  let observedAt: Date | undefined;
  if (input.observedAt) {
    const parsedDate = new Date(input.observedAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return {
        success: false,
        reason: "invalid_input",
        message: "활동 시각이 올바르지 않아요.",
      };
    }
    observedAt = parsedDate;
  }

  // 9) INSERT — withActor 안에서 audit actor 캡처.
  let entryId: string;
  let observedAtIso: string;
  try {
    const row = await createOfflineEntry({
      userId: input.userId,
      authorId: viewerId,
      kind: input.kind,
      note: input.note,
      observedAt,
      institutionId: viewerRow.institutionId ?? null,
    });
    entryId = row.id;
    observedAtIso = row.observedAt.toISOString();
  } catch {
    return {
      success: false,
      reason: "db_failed",
      message: "기록 저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 10) Cache revalidate — 타임라인 + 입력 페이지 동기화.
  try {
    revalidatePath(`/admin/timeline/${input.userId}`);
    revalidatePath(`/admin/teacher/students/${input.userId}/offline-entry`);
  } catch {
    // revalidate 실패는 사용자 흐름 차단 X — 다음 요청 시 자동 fresh.
  }

  // 11) 텔레메트리.
  logEntryCreated({
    userId: input.userId,
    kind: input.kind,
    noteLength: input.note.length,
  });

  return {
    success: true,
    entryId,
    observedAt: observedAtIso,
  };
}
