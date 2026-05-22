"use client";

// FR-C-014 잔여 (#37) — admin HITL detail page 수동 에스컬레이션 버튼 (Client Component).
//
// 사용 예 (sibling Agent A 의 detail page /admin/hitl/[id]/page.tsx 에서):
//   <HitlEscalateButton queueId={row.id} alreadyEscalated={!!row.escalatedAt} />
//
// 본 컴포넌트 책임:
//   - alreadyEscalated=true → 버튼 disabled + 안내 텍스트.
//   - 클릭 → window.confirm → PATCH /api/hitl/[id]/escalate.
//   - 응답 분기:
//       200 + alreadyEscalated:true → "이미 에스컬레이션됨" UI + router.refresh()
//       200 + alreadyEscalated:false → "에스컬레이션 완료" UI + router.refresh()
//       403 → "권한 부족" 에러 메시지
//       429 → "잠시 후 다시 시도하세요" 안내 (어뷰징 방어 알림)
//       4xx/5xx → 일반 에러 메시지
//
// 어뷰징 방어 (REQ-FUNC-034) UX:
//   - 429 응답 시 retry-after 메시지 노출.
//   - submitting 중 중복 클릭 차단 (disabled).
//
// 텔레메트리:
//   - 서버에서 로그 (lib/events.ts hitl_manually_escalated event) — 브라우저 trackEvent 별도 호출 안 함
//     (Server log 가 진실 소스 — actor role 정확도 + audit 무결성).
//
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지.

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export type EscalateReason = "expert_judgment" | "sla_at_risk" | "duplicate";

export interface HitlEscalateButtonProps {
  /// HITLQueue.id (UUID).
  queueId: string;
  /// 이미 escalatedAt 가 설정되어 있는지 — Server Component 에서 전달.
  alreadyEscalated: boolean;
  /// 사유 (선택). 미지정 시 서버가 폴백 "manual" 처리.
  defaultReason?: EscalateReason;
  /// 버튼 라벨 커스텀. 기본 "수동 에스컬레이션".
  label?: string;
  /// 클릭 직전 confirm 다이얼로그 비활성화 (테스트용).
  skipConfirm?: boolean;
}

type Status = "idle" | "submitting" | "success" | "error" | "rate_limited";

interface EscalateResponse {
  ok?: boolean;
  alreadyEscalated?: boolean;
  queueId?: string;
  escalatedAt?: string;
  slackNotified?: boolean;
  error?: string;
  detail?: string;
  retryAfterSec?: number;
}

export function HitlEscalateButton({
  queueId,
  alreadyEscalated,
  defaultReason,
  label = "수동 에스컬레이션",
  skipConfirm = false,
}: HitlEscalateButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const disabled = alreadyEscalated || status === "submitting";

  const handleClick = useCallback(async () => {
    if (alreadyEscalated || status === "submitting") return;
    if (!skipConfirm) {
      const ok = window.confirm(
        "본 큐를 마스터 전문가로 즉시 에스컬레이션 처리합니다. 계속하시겠습니까?",
      );
      if (!ok) return;
    }

    setStatus("submitting");
    setMessage(null);

    try {
      const res = await fetch(`/api/hitl/${queueId}/escalate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaultReason ? { reason: defaultReason } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as EscalateResponse;

      if (res.status === 200) {
        setStatus("success");
        if (data.alreadyEscalated) {
          setMessage("이미 에스컬레이션 처리된 항목입니다.");
        } else {
          setMessage("에스컬레이션 완료 — 마스터 전문가 알림 발송.");
        }
        router.refresh();
        return;
      }

      if (res.status === 429) {
        setStatus("rate_limited");
        const retry = data.retryAfterSec ?? 60;
        setMessage(`요청이 너무 잦습니다. ${retry}초 후 다시 시도해주세요.`);
        return;
      }

      if (res.status === 403) {
        setStatus("error");
        setMessage("권한이 부족합니다 (expert / principal / admin 만 가능).");
        return;
      }

      setStatus("error");
      setMessage(
        data.error
          ? `오류: ${data.error}${data.detail ? ` (${data.detail})` : ""}`
          : `오류 (HTTP ${res.status})`,
      );
    } catch (err) {
      setStatus("error");
      setMessage(
        `네트워크 오류: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [alreadyEscalated, defaultReason, queueId, router, skipConfirm, status]);

  return (
    <div className="space-y-2" data-testid="hitl-escalate-root">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        data-testid="hitl-escalate-button"
        data-status={status}
        className={
          "inline-flex min-h-[44px] items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors " +
          (disabled
            ? "cursor-not-allowed border-gray-300 bg-gray-100 text-gray-400"
            : "border-red-500 bg-white text-red-700 hover:bg-red-50 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/30")
        }
        aria-disabled={disabled}
        aria-busy={status === "submitting"}
      >
        <span aria-hidden="true">🚨</span>
        {status === "submitting" ? "처리 중..." : label}
      </button>
      {alreadyEscalated && status !== "success" && (
        <p
          className="text-xs text-gray-600 dark:text-gray-400"
          data-testid="hitl-escalate-already"
        >
          이미 에스컬레이션된 항목입니다.
        </p>
      )}
      {message && (
        <p
          className={
            "text-sm " +
            (status === "success"
              ? "text-emerald-700 dark:text-emerald-300"
              : status === "rate_limited"
                ? "text-amber-700 dark:text-amber-300"
                : "text-red-700 dark:text-red-300")
          }
          data-testid="hitl-escalate-message"
          data-status={status}
          role={status === "error" || status === "rate_limited" ? "alert" : undefined}
        >
          {message}
        </p>
      )}
    </div>
  );
}
