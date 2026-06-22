// FR-Q-WEEKLY-REVIEW — 부모용 주간 리뷰 페이지 Prisma 액세스 helper.
//
// 책임:
//   1) latest: 가장 최근 WeeklyReport 1건 (orderBy generatedAt desc, take 1)
//   2) history: 그 외 직전 3건 (총 4주까지 trend chart 입력) — 같은 한 번의 findMany 로 합본 후 분리
//   3) wAurAchieved: latest 의 missionCompletedCount >= W_AUR_MIN_MISSIONS (4) — FR-C-WAUR-SWITCH
//   4) hasData: latest !== null
//
// RBAC (R4):
//   - cross-user 차단은 호출 측 (page) 의 Supabase auth.id 만 사용한다는 가정.
//   - 본 모듈은 userId 인자를 그대로 where 절에 사용 — 외부 입력 신뢰 X (호출 측 책임).
//
// 빈 상태:
//   - 가입 직후 / cron 미실행 / 활동 0건 → latest=null, history=[], wAurAchieved=false, hasData=false.
//
// 성능:
//   - 단일 findMany 1회 — N+1 회피.
//   - 4건 take 로 worst case 작은 페이로드.
//
// Type 정합:
//   - WeeklyReport 의 Json scoreTrend 컬럼은 Prisma 의 JsonValue — 본 helper 는 그대로 전달.
//   - 상위 UI 컴포넌트가 ScoreTrend type 으로 narrow 처리.

import { prisma } from "@/lib/db";
import { W_AUR_MIN_MISSIONS } from "@/lib/reports/weekly-aggregator";
import { weekBounds } from "@/lib/weekly-report";
import { enabledLiteracyGames } from "@/lib/literacy/registry";
import {
  aggregateLiteracyWeekly,
  type LiteracyWeeklySummary,
} from "@/lib/reports/literacy-weekly";

/// WeeklyReport 1건의 helper 친화 shape (Prisma row shape 와 호환).
/// `WeeklyReport` Prisma row 를 그대로 사용해도 되지만, 테스트 환경에서 Prisma client
/// import 없이 mock 데이터를 구성할 수 있도록 별도 export.
export interface WeeklyReviewRow {
  id: string;
  userId: string;
  year: number;
  weekNumber: number;
  articulationAvg: number;
  linguisticAvg: number;
  acousticAvg: number;
  peerPercentileAvg: number;
  /// 진단 세션 수(점수 표본 분모).
  sessionCount: number;
  /// FR-C-WAUR-SWITCH — 미션 완료수(W-AUR 신호). 기존 row 는 default 0.
  missionCompletedCount: number;
  predictedNextScore: number | null;
  predictionConfidence: number | null;
  generatedAt: Date;
  /// FR-WEEKLY-UNREAD — 부모가 /weekly-review 페이지를 열어 본 시각. null = 미열람.
  /// page 측이 latest.viewedAt === null 분기에서 UPDATE 트리거 + nav badge dot 산출.
  viewedAt: Date | null;
  /// JsonValue — UI 측 ScoreTrend 로 narrow.
  scoreTrend: unknown;
}

export interface WeeklyReviewData {
  /// 가장 최근 WeeklyReport 1건. cron 미실행 / 활동 0건이면 null.
  latest: WeeklyReviewRow | null;
  /// latest 를 제외한 직전 주들 — trend chart 입력 (최대 3건, latest + history 합치면 ≤ 4건).
  /// generatedAt desc 정렬 — chart 측에서 reverse 후 X축 시간순 변환 책임.
  history: WeeklyReviewRow[];
  /// latest.missionCompletedCount >= W_AUR_MIN_MISSIONS (false if latest null). FR-C-WAUR-SWITCH.
  wAurAchieved: boolean;
  /// latest !== null.
  hasData: boolean;
}

/**
 * 부모용 주간 리뷰 페이지 데이터 로더.
 *
 * @param userId Supabase auth user.id — 호출 측에서 본인 ID 만 전달해야 함 (R4 cross-user 차단).
 * @returns 빈 데이터일 때도 항상 정의된 객체 반환 — page 측은 hasData 분기.
 */
export async function loadWeeklyReview(userId: string): Promise<WeeklyReviewData> {
  if (!userId) {
    return { latest: null, history: [], wAurAchieved: false, hasData: false };
  }

  // 단일 findMany 1회 — 4건 take 로 page LCP 보호.
  let rows: WeeklyReviewRow[] = [];
  try {
    rows = (await prisma.weeklyReport.findMany({
      where: { userId },
      orderBy: { generatedAt: "desc" },
      take: 4,
    })) as unknown as WeeklyReviewRow[];
  } catch (err) {
    // DB 일시 장애 / env 미설정 (worktree 등) → 빈 상태 graceful.
    console.error("loadWeeklyReview: findMany failed", err);
    return { latest: null, history: [], wAurAchieved: false, hasData: false };
  }

  if (rows.length === 0) {
    return { latest: null, history: [], wAurAchieved: false, hasData: false };
  }

  const [latest, ...history] = rows;
  // W-AUR = 미션완료수 기반(FR-C-WAUR-SWITCH). 전환 이전 row 는 missionCompletedCount=0 → false.
  const wAurAchieved = latest.missionCompletedCount >= W_AUR_MIN_MISSIONS;
  return {
    latest,
    history,
    wAurAchieved,
    hasData: true,
  };
}

/**
 * FR-Q-LIT (Phase 4) — 한 주 문해력 놀이 활동량 요약 (parent 리포트 '문해력' 축).
 *
 * 발음 WeeklyReport(cron 스냅샷)와 별개로 LiteracyResult 를 해당 주 구간에서 on-read 집계.
 * 영속 데이터가 없으면(놀이 플래그 off → prod dormant) null → 카드 미렌더(graceful, 회귀 0).
 *
 * @param userId Supabase auth user.id — 호출 측 본인 ID 만(R4 cross-user 차단).
 * @param year/week 표시 주차(보통 latest WeeklyReport 의 year/week, 없으면 현재 주차).
 * @returns 활동 0건 또는 DB 장애 시 null.
 */
export async function loadLiteracyWeekly(
  userId: string,
  year: number,
  week: number,
): Promise<LiteracyWeeklySummary | null> {
  if (!userId) return null;
  // flag-1 — 영속 행 존재가 아니라 **현재 활성(플래그 on) 게임**으로 게이팅.
  //   게임 on→영속→off flip 시 과거 행으로 카드가 잔존하지 않도록(불변식: off 면 노출 0).
  //   전부 off 면 빈 집합 → rows 필터 후 0건 → aggregate null → 카드 미렌더.
  const enabledSlugs = new Set(enabledLiteracyGames().map((g) => g.slug));
  if (enabledSlugs.size === 0) return null;
  const { start, end } = weekBounds(year, week);
  try {
    const rows = await prisma.literacyResult.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: { stage: true, gameSlug: true, createdAt: true },
    });
    return aggregateLiteracyWeekly(rows.filter((r) => enabledSlugs.has(r.gameSlug)));
  } catch (err) {
    // DB 일시 장애 / env 미설정(worktree 등) → graceful null.
    console.error("loadLiteracyWeekly: findMany failed", err);
    return null;
  }
}
