"use client";

// FR-Q-TEACHER + FR-C-017+ — 반 단위 학부모 알림장 일괄 발송 버튼 (Client Component).
//
// 책임:
//   - 클릭 → confirm dialog → sendClassroomCushionNotes Server Action 호출
//   - 응답 status 분기:
//     · ok            → "N건 발송 / M건 skip / K건 실패" 토스트
//     · rate_limited  → "직전 1시간 안에 발송 이력" 안내 (재시도 안내)
//     · forbidden     → "권한이 없어요" 안내
//     · not_found     → "반을 찾을 수 없어요" 안내
//     · unauthorized  → "로그인이 필요합니다" 안내
//     · invalid_input → "반 정보가 비어있어요" 안내
//   - 상태: idle / sending / sent / error / rate_limited
//   - student 수 0이면 버튼 disabled (입력값 정합성)
//
// R4: 응답에 email/이름 노출 0 (Server Action 의 status + 카운트만 표시).
// CON-04 (의료 금칙어): 카피에 "치료" / "진단" / "장애" 사용 금지.
// confirm dialog skip 옵션 (skipConfirm prop) — 테스트 결정성 보장.

import { useCallback, useState } from "react";

import { sendClassroomCushionNotes } from "@/app/actions/classroom-cushion";

export interface SendClassroomCushionButtonProps {
  /// Class.id (UUID).
  classId: string;
  /// 본 반 학생 수 — 0이면 버튼 disabled + 안내 (서버에서도 attempted=0 안전 처리).
  studentCount: number;
  /// 클릭 직전 window.confirm 비활성화 (테스트 결정성).
  skipConfirm?: boolean;
}

type Status = "idle" | "sending" | "sent" | "error" | "rate_limited";

export function SendClassroomCushionButton({
  classId,
  studentCount,
  skipConfirm = false,
}: SendClassroomCushionButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const noStudents = studentCount <= 0;
  const disabled = noStudents || status === "sending";

  const handleClick = useCallback(async () => {
    if (disabled) return;

    if (!skipConfirm) {
      const ok = window.confirm(
        `${studentCount}명 부모에게 이번 주 알림장을 발송할까요? 직전 1시간 안에 이미 발송했다면 자동으로 차단돼요.`,
      );
      if (!ok) return;
    }

    setStatus("sending");
    setMessage(null);

    try {
      const result = await sendClassroomCushionNotes({ classId });

      if (result.status === "ok") {
        setStatus("sent");
        setMessage(
          `${result.sent}건 발송 / ${result.skipped}건 skip / ${result.errors}건 실패 (시도 ${result.attempted}명)`,
        );
        return;
      }

      if (result.status === "rate_limited") {
        setStatus("rate_limited");
        const retry = result.retryAfterSec ?? 3600;
        const mins = Math.max(1, Math.ceil(retry / 60));
        setMessage(
          `직전 1시간 안에 이미 발송 이력이 있어요. 약 ${mins}분 후 다시 시도해 주세요.`,
        );
        return;
      }

      if (result.status === "forbidden") {
        setStatus("error");
        setMessage("발송 권한이 없어요. 본인이 담당한 반인지 확인해 주세요.");
        return;
      }

      if (result.status === "not_found") {
        setStatus("error");
        setMessage("반 정보를 찾을 수 없어요. 페이지를 새로고침해 주세요.");
        return;
      }

      if (result.status === "unauthorized") {
        setStatus("error");
        setMessage("로그인이 필요해요. 다시 로그인해 주세요.");
        return;
      }

      setStatus("error");
      setMessage("입력값이 비어있어요.");
    } catch (err) {
      setStatus("error");
      setMessage(
        `네트워크 오류: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [classId, disabled, skipConfirm, studentCount]);

  return (
    <div
      className="mt-3 space-y-1.5"
      data-testid={`send-classroom-cushion-root-${classId}`}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        data-testid={`send-classroom-cushion-button-${classId}`}
        data-status={status}
        aria-disabled={disabled}
        aria-busy={status === "sending"}
        className={
          "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors " +
          (disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50")
        }
      >
        <span aria-hidden="true">✉️</span>
        {status === "sending"
          ? "발송 중..."
          : `이번 주 알림장 보내기 (${studentCount}명)`}
      </button>
      {noStudents ? (
        <p
          className="text-xs text-slate-500"
          data-testid={`send-classroom-cushion-empty-${classId}`}
        >
          본 반에 등록된 부모가 없어 발송 대상이 없어요.
        </p>
      ) : null}
      {message ? (
        <p
          data-testid={`send-classroom-cushion-message-${classId}`}
          data-status={status}
          role={
            status === "error" || status === "rate_limited" ? "alert" : "status"
          }
          aria-live="polite"
          className={
            "text-xs " +
            (status === "sent"
              ? "text-emerald-700"
              : status === "rate_limited"
                ? "text-amber-700"
                : status === "error"
                  ? "text-red-700"
                  : "text-slate-600")
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
