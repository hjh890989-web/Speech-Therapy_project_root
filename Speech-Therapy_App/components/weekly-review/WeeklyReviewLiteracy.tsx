// FR-Q-LIT (CR-2026-009 / Phase 4) — 주간 리뷰 '문해력 활동' 카드 (Server Component).
//
// 한 주 읽기·말 놀이 활동량(총 횟수·활동일·단계/놀이별 분포)을 부모에게 안내.
// 연습-only: 점수/등급/판정 미표시 — 활동 빈도만(격려 톤). summary=null 이면 페이지가 미렌더.
// CON-04: '치료/진단/장애' 0건. 라벨은 stages.ts/registry 의 부모 친화 명칭.

import type { LiteracyWeeklySummary } from "@/lib/reports/literacy-weekly";
import { LITERACY_GAMES } from "@/lib/literacy/registry";

function gameTitle(slug: string): string {
  return LITERACY_GAMES.find((g) => g.slug === slug)?.title ?? slug;
}

export function WeeklyReviewLiteracy({ summary }: { summary: LiteracyWeeklySummary }) {
  return (
    <section
      data-testid="weekly-review-literacy"
      aria-label="이번 주 읽기·말 놀이"
      className="rounded-lg border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/30"
    >
      <h2 className="text-base font-bold text-violet-900 dark:text-violet-100">
        📚 이번 주 읽기·말 놀이
      </h2>
      <p
        data-testid="weekly-review-literacy-summary"
        className="mt-1 text-sm text-violet-800 dark:text-violet-200"
      >
        이번 주에 <strong>{summary.totalSessions}번</strong>, <strong>{summary.activeDays}일</strong>{" "}
        함께 놀았어요. 꾸준히 잘하고 있어요!
      </p>

      {/* 놀이별 분포 — 단계(학년 함의) 라벨 대신 놀이 이름만 표시(clin-2: 구인-태그 stage 오해 회피). */}
      {summary.byGame.length > 0 && (
        <ul className="mt-3 space-y-1" data-testid="weekly-review-literacy-games">
          {summary.byGame.map((g) => (
            <li
              key={g.gameSlug}
              className="flex items-center justify-between text-sm text-violet-900 dark:text-violet-100"
            >
              <span>{gameTitle(g.gameSlug)}</span>
              <span className="tabular-nums text-violet-700 dark:text-violet-300">{g.count}번</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
