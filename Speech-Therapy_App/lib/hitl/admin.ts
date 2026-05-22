// FR-Q-008 (#49) — /admin/hitl HITL 큐 list 전용 admin helper.
//
// 책임 (lib/hitl.ts 와 분리):
//   - active(미완료) 큐 조회 — pending + in_review 만, completed/dismissed/escalated 제외
//   - R4 보호 — sessionId / userId truncate 표시 유틸 (UI 가 직접 호출)
//   - confidence 색상 분기 + SLA 잔여시간 / 초과 여부 계산
//
// lib/hitl.ts 는 sibling Agent 들 (escalation Cron 등) 과 동시 수정 충돌
// 회피를 위해 본 파일에 admin 전용 로직만 격리. helper API 만 사용.
//
// 금칙어: "치료" / "진단" / "장애" 사용 금지 (변수명 diagnose* 만 예외).

import { prisma } from "@/lib/db";

/// 한 화면에 표시할 최대 row 수 (Sprint 1 단순화 — 정렬/필터/페이지네이션 없음).
/// Phase 2+ 에서 페이지네이션 도입 시 본 상수 제거 + cursor 기반 전환.
export const HITL_ADMIN_LIST_LIMIT = 100;

/// 신규 큐 + 검토 진행중 만 노출.
/// completed / dismissed / escalated 는 별도 탭/페이지에서 다룸 (FR-C-013 #36).
export const ACTIVE_HITL_STATUSES = ["pending", "in_review"] as const;
export type ActiveHITLStatus = (typeof ACTIVE_HITL_STATUSES)[number];

export interface HitlAdminRow {
  id: string;
  sessionId: string;
  userId: string;
  confidenceScore: number;
  status: string;
  assignedExpertId: string | null;
  slaDueAt: Date;
  escalatedAt: Date | null;
  createdAt: Date;
}

/// active 큐 목록 — createdAt desc.
/// Server Component 내부에서 직접 호출 (page.tsx).
export async function fetchActiveHitlQueue(
  limit: number = HITL_ADMIN_LIST_LIMIT,
): Promise<HitlAdminRow[]> {
  const rows = await prisma.hITLQueue.findMany({
    where: { status: { in: [...ACTIVE_HITL_STATUSES] } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      sessionId: true,
      userId: true,
      confidenceScore: true,
      status: true,
      assignedExpertId: true,
      slaDueAt: true,
      escalatedAt: true,
      createdAt: true,
    },
  });
  return rows;
}

/// R4 — sessionId 풀길이 노출 금지. 앞 8자리 + "…" (모달/링크 시 풀길이 사용 가능).
export function truncateSessionId(id: string): string {
  if (!id) return "";
  if (id.length <= 8) return id;
  return `${id.slice(0, 8)}…`;
}

/// R4 — userId 풀길이 노출 금지 (자녀 식별 보호). 앞 4자리 + "…".
export function truncateUserId(id: string): string {
  if (!id) return "";
  if (id.length <= 4) return id;
  return `${id.slice(0, 4)}…`;
}

export type ConfidenceTone = "low" | "mid" | "high";

/// FR-Q-008 — confidence 색상 분기.
///   < 50 : low (red)
///   50~69 : mid (orange)
///   ≥ 70 : high (green) — 운영 중 < 70 자동 enqueue 이므로 일반적으로 미발생,
///                          수동 등록 / 임계값 조정 시 발생 가능.
export function classifyConfidence(score: number): ConfidenceTone {
  if (score < 50) return "low";
  if (score < 70) return "mid";
  return "high";
}

export const CONFIDENCE_TONE_CLASS: Record<ConfidenceTone, string> = {
  low: "text-rose-700 bg-rose-50 border-rose-200",
  mid: "text-amber-700 bg-amber-50 border-amber-200",
  high: "text-emerald-700 bg-emerald-50 border-emerald-200",
};

export interface SlaPresentation {
  /// hh:mm 잔여 (예: "23:45") — 초과 시 "초과".
  remainingLabel: string;
  /// 마이너스 분 단위 (초과량 표시용). 양수면 잔여, 음수면 초과.
  remainingMinutes: number;
  overdue: boolean;
}

/// SLA 잔여 시간 계산 — hh:mm + 초과 여부.
/// now 주입 가능 (테스트 결정성).
export function presentSla(slaDueAt: Date, now: Date = new Date()): SlaPresentation {
  const diffMs = slaDueAt.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes <= 0) {
    return {
      remainingLabel: "초과",
      remainingMinutes: diffMinutes,
      overdue: true,
    };
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return {
    remainingLabel: `${hh}:${mm}`,
    remainingMinutes: diffMinutes,
    overdue: false,
  };
}

export const STATUS_PILL_CLASS: Record<string, string> = {
  pending: "bg-sky-100 text-sky-800 border-sky-200",
  in_review: "bg-indigo-100 text-indigo-800 border-indigo-200",
  escalated: "bg-rose-100 text-rose-800 border-rose-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  dismissed: "bg-slate-100 text-slate-700 border-slate-200",
};

export const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  in_review: "검토중",
  escalated: "에스컬레이트",
  completed: "검토 완료",
  dismissed: "거부",
};
