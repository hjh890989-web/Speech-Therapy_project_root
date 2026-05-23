// FR-Q-013 (#54) — 자녀 통합 타임라인 리스트 (날짜 그룹 + TimelineEntry 카드).
//
// 책임: TimelineEntry[] 를 날짜 그룹 (today/yesterday/thisWeek/older) 으로 partition →
//       그룹 헤더 + TimelineEntryCard 리스트 렌더. 빈 그룹은 미노출.
//
// R4 보호: userId / 자녀 식별 정보 prop 미수신. CON-04: "치료/진단/장애" 금칙어 미사용.

import type { TimelineEntry } from "@/lib/timeline/aggregator";
import {
  TIMELINE_GROUP_LABEL,
  TIMELINE_GROUP_ORDER,
  groupEntriesByDate,
} from "@/lib/timeline/aggregator";
import { TimelineEntryCard } from "@/components/admin/timeline/TimelineEntry";

export interface TimelineListProps {
  entries: TimelineEntry[];
  /// SSR / 테스트 결정성 — 그룹 분류 기준 시각.
  now?: Date;
}

export function TimelineList({ entries, now }: TimelineListProps) {
  const groups = groupEntriesByDate(entries, now);

  return (
    <section
      data-testid="timeline-list"
      aria-labelledby="timeline-heading"
      className="mb-8"
    >
      <h2 id="timeline-heading" className="mb-3 text-lg font-semibold text-slate-900">
        앱 활동 타임라인
      </h2>
      <div className="space-y-6">
        {TIMELINE_GROUP_ORDER.map((groupKey) => {
          const bucket = groups[groupKey];
          if (bucket.length === 0) return null;
          return (
            <div
              key={groupKey}
              data-testid={`timeline-group-${groupKey}`}
              data-count={bucket.length}
            >
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {TIMELINE_GROUP_LABEL[groupKey]}
                <span className="ml-2 font-mono text-[10px] text-slate-400">
                  ({bucket.length})
                </span>
              </h3>
              <ul className="space-y-2">
                {bucket.map((entry) => (
                  <li key={entry.id}>
                    <TimelineEntryCard entry={entry} now={now} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
