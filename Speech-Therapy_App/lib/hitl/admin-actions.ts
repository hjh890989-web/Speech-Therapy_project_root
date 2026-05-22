// FR-C-013 (#36) — HITL 전문가 코멘트 PATCH 비즈니스 로직.
//
// 책임:
//   1) HITLQueue row UPDATE — expertComment / correctedScore / reviewedAt / reviewedBy / status='completed' / completedAt
//   2) AuditLog INSERT (recordAudit) — action="hitl_comment_added"
//   3) 서버 텔레메트리 구조화 로그 — event="hitl_comment_submitted"
//
// route handler (app/api/hitl/[id]/comment/route.ts) 는 본 helper 를 thin wrapper 로 호출.
// 본 helper 는 _RBAC 검증_ 은 책임 X — 호출 측 (route handler) 가 Supabase auth + role lookup 으로 사전 확인.
//
// 정책:
//   - audit 실패는 graceful — 메인 코멘트 저장 흐름 유지 (lib/audit.ts 의 graceful 정책 계승).
//   - 텔레메트리 실패도 graceful — 사용자 응답 차단 방지.
//   - Prisma update 실패만 throw — route handler 가 500 변환.
//   - 멱등성: 같은 queueId 에 대한 재호출은 overwrite — 409 미반환 (재검토 운영 시나리오 허용).
//
// 금칙어: "치료" / "진단" / "장애" 사용 금지.
// R4: 코멘트 본문은 로그 / 텔레메트리에 노출 금지 (호출 측 ↔ DB 만 보유).
//
// lib/hitl.ts 본체 수정 금지 정책 (CON-08) 준수 — 본 admin-actions 는 별도 모듈.

import { recordAudit } from "@/lib/audit";
import { withActor } from "@/lib/db/with-actor";
import type { AnalyticsEvent } from "@/lib/events";

/** route handler 가 사용자 입력 검증 후 전달하는 정규화된 입력. */
export interface SubmitExpertCommentInput {
  /** HITLQueue.id (UUID). */
  queueId: string;
  /** 검토 actor — Supabase auth uid. assignedExpertId 와 다를 수 있음 (admin 대리). */
  expertId: string;
  /** 검토 actor role — admin / principal / expert. 텔레메트리 분기용. */
  expertRole: "admin" | "principal" | "expert";
  /** 전문가 코멘트 (1~2000자, 호출 측 Zod 검증 완료 가정). */
  comment: string;
  /** 보정 단일 종합 점수 (0~100, 선택). 미포함 시 코멘트만 저장. */
  correctedScore?: number;
}

/** 결과 — route handler 가 200 응답 본문으로 노출. */
export interface SubmitExpertCommentResult {
  queueId: string;
  reviewedAt: Date;
  reviewedBy: string;
  status: "completed";
  expertComment: string;
  correctedScore: number | null;
  /** audit INSERT 시도 결과 — false 이면 graceful failure (코멘트는 저장됨). */
  auditRecorded: boolean;
}

/**
 * 전문가 코멘트 + 보정 점수 저장 트랜잭션.
 *
 * 흐름:
 *   1. prisma.hITLQueue.update — completed 마킹 + 컬럼 갱신
 *   2. recordAudit (graceful) — hitl_comment_added
 *   3. 구조화 로그 — hitl_comment_submitted (R4 보호)
 *
 * 에러:
 *   - Prisma 실패 (queueId 미존재 / DB 오류) → throw (route handler 가 500/404 분기)
 *   - audit 실패 → result.auditRecorded=false, throw 안 함
 */
export async function submitExpertComment(
  input: SubmitExpertCommentInput,
): Promise<SubmitExpertCommentResult> {
  const now = new Date();

  // DB-011: withActor 로 audit.actor_id GUC 주입 → AuditLog TRIGGER 가 실 expertId 캡처.
  // 미주입 시 TRIGGER 가 'system' 폴백 — graceful (단, 본 흐름은 항상 expertId 보유).
  // Prisma update — 실패 시 throw (Prisma P2025 = row not found).
  const updated = await withActor(input.expertId, (tx) =>
    tx.hITLQueue.update({
      where: { id: input.queueId },
      data: {
        expertComment: input.comment,
        // correctedScore optional — 미포함 시 undefined 로 두면 컬럼 미수정.
        // 명시 null 전달 의도 (보정 점수 제거) 미지원 — Sprint 1 단순화.
        ...(input.correctedScore !== undefined
          ? { correctedScore: input.correctedScore }
          : {}),
        reviewedAt: now,
        reviewedBy: input.expertId,
        status: "completed",
        completedAt: now,
      },
      select: {
        id: true,
        expertComment: true,
        correctedScore: true,
        reviewedAt: true,
        reviewedBy: true,
        status: true,
      },
    }),
  );

  // AuditLog INSERT — graceful (recordAudit 가 내부적으로 throw 안 함).
  // 그러나 _시도_ 자체에서 예외 (예: import 시점 환경 문제) 발생 가능성 방어.
  let auditRecorded = false;
  try {
    await recordAudit({
      actorId: input.expertId,
      action: "hitl_comment_added",
      target: { tableName: "HITLQueue", rowId: input.queueId },
      // R4: 코멘트 본문 / correctedScore 값 자체는 노출 안 함 — 메타데이터만.
      payload: {
        hadCorrection: input.correctedScore !== undefined,
        expertRole: input.expertRole,
      },
    });
    auditRecorded = true;
  } catch (err) {
    console.warn(
      "[FR-C-013] AuditLog INSERT 예외 (graceful — 코멘트는 저장됨):",
      err,
    );
  }

  // 서버 텔레메트리 구조화 로그 — Vercel Logs / Drains 수집 대상.
  // R4: queueId / hadCorrection / expertRole 만 노출. 코멘트 본문 / userId / sessionId 미포함.
  try {
    logHitlCommentSubmittedTelemetry({
      queueId: input.queueId,
      hadCorrection: input.correctedScore !== undefined,
      expertRole: input.expertRole,
    });
  } catch (err) {
    console.warn("[FR-C-013] 텔레메트리 로그 예외 (graceful):", err);
  }

  return {
    queueId: updated.id,
    reviewedAt: updated.reviewedAt ?? now,
    reviewedBy: updated.reviewedBy ?? input.expertId,
    status: "completed",
    expertComment: updated.expertComment ?? input.comment,
    correctedScore: updated.correctedScore ?? null,
    auditRecorded,
  };
}

/** R4 보호: 텔레메트리 페이로드 별도 함수 — 추후 통합 sink 교체 시 단일 진입점. */
function logHitlCommentSubmittedTelemetry(
  properties: Extract<AnalyticsEvent, { name: "hitl_comment_submitted" }>["properties"],
) {
  console.log(
    JSON.stringify({
      level: "info",
      event: "hitl_comment_submitted",
      properties,
    }),
  );
}
