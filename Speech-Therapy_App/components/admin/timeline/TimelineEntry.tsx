// FR-Q-013 (#54) — 자녀 통합 타임라인 단일 entry 카드 (Server Component).
//
// 책임: TimelineEntry (discriminated union) 1건을 분기별 아이콘 + 카피 + 시각으로 표시.
// R4 보호: userId / 자녀 식별 정보 prop 미수신 — entry 본문 + 시각만.
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지 — "발음 발달 확인" / "미션" 카피.

import type { TimelineEntry } from "@/lib/timeline/aggregator";
import { formatTimelineRelative } from "@/lib/timeline/aggregator";

export interface TimelineEntryProps {
  entry: TimelineEntry;
  /// 테스트 / SSR 정합성용 — 미지정 시 new Date(). 본 컴포넌트는 hover/state 없음.
  now?: Date;
}

function formatScore(value: number): string {
  return Math.round(value).toString();
}

/** OfflineEntry kind 라벨 — repo OFFLINE_ENTRY_KINDS 와 정합. */
const OFFLINE_KIND_LABEL: Record<string, string> = {
  practice: "발음 연습",
  observation: "관찰",
  note: "메모",
};

export function TimelineEntryCard({ entry, now }: TimelineEntryProps) {
  const when = formatTimelineRelative(entry.createdAt, now);

  if (entry.kind === "diagnose") {
    return (
      <article
        data-testid={`timeline-entry-${entry.id}`}
        data-kind="diagnose"
        className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-base"
        >
          {/* 🎤 — 발화/발음 발달 확인 */}
          <span role="img" aria-label="발음 확인">
            🎤
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            발음 발달 확인 — <span data-testid="timeline-phoneme">{entry.targetPhoneme}</span>
          </p>
          <p className="mt-1 text-xs text-slate-600">
            <span data-testid="timeline-articulation-score">
              발음 {formatScore(entry.articulationScore)}점
            </span>
            <span aria-hidden="true"> · </span>
            <span>언어 {formatScore(entry.linguisticScore)}점</span>
            <span aria-hidden="true"> · </span>
            <span>음향 {formatScore(entry.acousticScore)}점</span>
          </p>
        </div>
        <time
          dateTime={entry.createdAt.toISOString()}
          data-testid="timeline-when"
          className="shrink-0 text-xs font-mono text-slate-500"
        >
          {when}
        </time>
      </article>
    );
  }

  if (entry.kind === "mission") {
    return (
      <article
        data-testid={`timeline-entry-${entry.id}`}
        data-kind="mission"
        className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base"
        >
          {/* 🎯 — 미션 (FR-Q-003) */}
          <span role="img" aria-label="미션">
            🎯
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            미션 완료 —{" "}
            <span data-testid="timeline-duration">
              {Math.max(0, Math.round(entry.durationSec))}초
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-600">앱 발음 미션 활동을 마쳤어요.</p>
        </div>
        <time
          dateTime={entry.createdAt.toISOString()}
          data-testid="timeline-when"
          className="shrink-0 text-xs font-mono text-slate-500"
        >
          {when}
        </time>
      </article>
    );
  }

  // offline — FR-Q-013 후속.
  return (
    <article
      data-testid={`timeline-entry-${entry.id}`}
      data-kind="offline"
      data-offline-kind={entry.offlineKind}
      className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-base"
      >
        {/* 📝 — 선생님 수기 기록 */}
        <span role="img" aria-label="선생님 기록">
          📝
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">
          센터 기록 —{" "}
          <span data-testid="timeline-offline-kind">
            {OFFLINE_KIND_LABEL[entry.offlineKind] ?? entry.offlineKind}
          </span>
        </p>
        <p
          data-testid="timeline-offline-note"
          className="mt-1 whitespace-pre-wrap text-xs text-slate-600"
        >
          {entry.note}
        </p>
      </div>
      <time
        dateTime={entry.createdAt.toISOString()}
        data-testid="timeline-when"
        className="shrink-0 text-xs font-mono text-slate-500"
      >
        {when}
      </time>
    </article>
  );
}
