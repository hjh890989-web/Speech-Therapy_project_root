"use client";

// FR-C-013 (#36) — HITL 전문가 코멘트 + 보정 점수 입력 폼.
//
// 사용:
//   detail page (app/admin/hitl/[id]/page.tsx) 가 import.
//   props 로 queueId 전달 + 기존 expertComment / correctedScore 표시.
//
// 상태:
//   idle → submitting → success | error
//
// 제출 후:
//   - 성공 → router.refresh() — Server Component 가 최신 row 다시 fetch
//   - 실패 → 상태 error + 사용자에게 사유 노출
//
// RBAC:
//   본 컴포넌트는 사용자 role 검증 안 함 — proxy.ts 가 /admin 경로 진입 이미 통과.
//   PATCH endpoint 가 server-side 에서 재검증.
//
// 금칙어: "치료" / "진단" / "장애" 사용 금지 (placeholder / label / 에러 메시지 포함).

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface HitlCommentFormProps {
  /** HITLQueue.id (UUID). path param 으로 PATCH endpoint 호출에 사용. */
  queueId: string;
  /** 기존 expertComment — 재검토 시 prefill. */
  existingComment?: string | null;
  /** 기존 correctedScore (0~100) — 재검토 시 prefill. */
  existingCorrectedScore?: number | null;
}

const COMMENT_MAX = 2000;
const SCORE_MIN = 0;
const SCORE_MAX = 100;

type SubmitStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; reviewedAt: string }
  | { state: "error"; message: string };

export function HitlCommentForm({
  queueId,
  existingComment,
  existingCorrectedScore,
}: HitlCommentFormProps) {
  const router = useRouter();
  const [comment, setComment] = useState<string>(existingComment ?? "");
  const [includeScore, setIncludeScore] = useState<boolean>(
    typeof existingCorrectedScore === "number",
  );
  const [score, setScore] = useState<number>(
    typeof existingCorrectedScore === "number" ? existingCorrectedScore : 70,
  );
  const [status, setStatus] = useState<SubmitStatus>({ state: "idle" });

  const remaining = COMMENT_MAX - comment.length;
  const isSubmitting = status.state === "submitting";
  const isCommentValid = comment.trim().length >= 1 && comment.length <= COMMENT_MAX;
  const canSubmit = isCommentValid && !isSubmitting;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus({ state: "submitting" });

    try {
      const body: { expertComment: string; correctedScore?: number } = {
        expertComment: comment,
      };
      if (includeScore) {
        body.correctedScore = score;
      }
      const res = await fetch(`/api/hitl/${encodeURIComponent(queueId)}/comment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let detail = `${res.status}`;
        try {
          const json = await res.json();
          if (typeof json?.error === "string") detail = json.error;
        } catch {
          // body 가 JSON 이 아니면 status code 만 노출.
        }
        setStatus({
          state: "error",
          message: `저장 실패 (${detail}) — 잠시 후 다시 시도해 주세요.`,
        });
        return;
      }
      const json = (await res.json()) as { reviewedAt: string };
      setStatus({ state: "success", reviewedAt: json.reviewedAt });
      // Server Component refresh — 최신 row 재조회.
      router.refresh();
    } catch (err) {
      setStatus({
        state: "error",
        message: `네트워크 오류 — ${err instanceof Error ? err.message : "재시도 필요"}`,
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="hitl-comment-form"
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
      aria-labelledby="hitl-comment-heading"
    >
      <h2 id="hitl-comment-heading" className="text-base font-semibold text-slate-900">
        전문가 코멘트 작성
      </h2>

      <div className="space-y-1">
        <label htmlFor="hitl-comment-textarea" className="block text-sm font-medium text-slate-700">
          코멘트 <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="hitl-comment-textarea"
          data-testid="hitl-comment-textarea"
          className="min-h-[120px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          value={comment}
          maxLength={COMMENT_MAX}
          onChange={(e) => setComment(e.target.value)}
          placeholder="발음 발달 확인 결과에 대한 전문가 의견을 입력해 주세요."
          aria-describedby="hitl-comment-help"
          required
        />
        <p id="hitl-comment-help" className="text-xs text-slate-500">
          남은 글자 수: <span data-testid="hitl-comment-remaining">{remaining}</span> /{" "}
          {COMMENT_MAX}
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            data-testid="hitl-score-toggle"
            checked={includeScore}
            onChange={(e) => setIncludeScore(e.target.checked)}
            className="h-4 w-4"
          />
          보정 종합 점수 포함 (0~100, 선택)
        </label>
        {includeScore && (
          <div className="flex items-center gap-3">
            <input
              type="range"
              data-testid="hitl-score-slider"
              min={SCORE_MIN}
              max={SCORE_MAX}
              step={1}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="flex-1"
              aria-label="보정 점수 슬라이더"
            />
            <span
              data-testid="hitl-score-value"
              className="min-w-[40px] text-right font-mono text-sm font-semibold text-slate-900"
            >
              {score}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          data-testid="hitl-comment-submit"
          disabled={!canSubmit}
          className="inline-flex min-h-[40px] items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "저장 중…" : "코멘트 저장"}
        </button>
        {status.state === "success" && (
          <span
            data-testid="hitl-comment-success"
            className="text-sm font-medium text-emerald-700"
          >
            저장 완료 ({new Date(status.reviewedAt).toLocaleString("ko-KR")})
          </span>
        )}
        {status.state === "error" && (
          <span data-testid="hitl-comment-error" role="alert" className="text-sm text-rose-700">
            {status.message}
          </span>
        )}
      </div>
    </form>
  );
}
