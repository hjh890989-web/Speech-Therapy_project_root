// 북극성 보조지표 W-LER(주간 문해 활동률, engagement) — owner 라이브 집계.
//
// 근거 ADR: docs/realignment/ADR_NorthStar_2track.md (옵션 C 지향·A 1차). 2트랙 재정렬 2026-06-22.
//   현 W-AUR(waur-trend.ts)은 발음 트랙만 분자·분모로 봐서 문해-only 가정(만8~12)을 구조적으로
//   배제한다. W-LER 은 문해 트랙(만2~12, LiteracyResult)의 주간 활동 참여율을 별도 집계해
//   북극성이 과업의 절반(트랙B)을 인지하게 한다. **발음 W-AUR 산식은 한 줄도 건드리지 않는다(회귀 0).**
//
// ⚠️ 연습-only 불변(트랙B 비대칭): engagement(활동일)만 — 점수·밴드·또래백분위·정상/위험 판정 0건.
//   "완수율/미션/달성/측정/평가/확인(probe)" 프레임 금지(발음 W-AUR 전용). 이름이 프레임을 정하므로
//   W-LER = "활동률(engagement)"이지 "완수율"이 아니다. referenceBand 미산출.
//   target 은 baseline 축적 후 산정 — 현재 추세만(목표선 미표기). W_AUR_TARGET_RATE(0.6) 무근거 차용 금지.
//
// 연령 도메인 분리: 문해 만2~12(childAgeMonths 24~144)만 — 발음 ≤84 와 교차 오염 0.
// R4: userId distinct 만 사용, 자녀 식별 정보 0건. graceful(실패 시 0).

import { prisma } from "@/lib/db";
import { enabledLiteracyGames } from "@/lib/literacy/registry";
import {
  LITERACY_AGE_MIN_MONTHS,
  LITERACY_AGE_MAX_MONTHS,
} from "@/lib/literacy/stages";
import {
  getCurrentWeekNumber,
  previousWeek,
  weekBounds,
} from "@/lib/weekly-report";

/// W-LER 충족 최소 활동일(주). engagement 기준 — "완수"가 아님(ADR §3.1, source of truth).
/// "매주 꾸준히"(습관·리텐션) 가치를 활동일로 반영. baseline 전 placeholder — 변경 시
/// owner 페이지·테스트가 본 상수만 참조(정의 표류 차단, W_AUR_MIN_MISSIONS 가드 패턴 답습).
export const W_LER_MIN_DAYS = 2;

export interface WlerWeek {
  year: number;
  week: number;
  /// 그 주 문해 활동 ≥1건 한 만2~12 distinct 사용자 — 분모(그-주-활성 문해 모집단).
  activeUsers: number;
  /// 그 주 서로 다른 활동일 ≥ W_LER_MIN_DAYS 인 distinct 사용자 — 분자(engagement).
  engagedUsers: number;
  /// engagedUsers / activeUsers (0~1). 분자 ⊆ 분모 이므로 rate ≤ 1.
  rate: number;
}

/// KST 활동일 문자열(YYYY-MM-DD). weekBounds(KST)와 정합(ADR §6 — UTC 근사 대신 KST 보정).
function kstDay(d: Date): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * 단일 (year, week) 의 W-LER 라이브 집계. graceful — 실패 시 0 채움.
 * 분모 = 그 주 활성 플래그 게임 문해 활동을 한 만2~12 distinct 사용자.
 * 분자 = 그 중 서로 다른 활동일(KST) ≥ W_LER_MIN_DAYS 인 distinct 사용자.
 */
export async function computeWlerForWeek(
  year: number,
  week: number,
): Promise<WlerWeek> {
  try {
    const enabledSlugs = enabledLiteracyGames().map((g) => g.slug);
    // 활성 문해 게임 0개(플래그 전부 off) → 집계 대상 없음 → 0 (라이브 회귀 0).
    if (enabledSlugs.length === 0) {
      return { year, week, activeUsers: 0, engagedUsers: 0, rate: 0 };
    }

    const { start, end } = weekBounds(year, week);
    const rows = await prisma.literacyResult.findMany({
      where: {
        gameSlug: { in: enabledSlugs },
        childAgeMonths: {
          gte: LITERACY_AGE_MIN_MONTHS,
          lte: LITERACY_AGE_MAX_MONTHS,
        },
        createdAt: { gte: start, lt: end },
      },
      select: { userId: true, createdAt: true },
    });

    // 사용자별 서로 다른 활동일(KST) 집계.
    const daysByUser = new Map<string, Set<string>>();
    for (const r of rows) {
      let set = daysByUser.get(r.userId);
      if (!set) {
        set = new Set<string>();
        daysByUser.set(r.userId, set);
      }
      set.add(kstDay(r.createdAt));
    }

    const activeUsers = daysByUser.size;
    let engagedUsers = 0;
    for (const days of daysByUser.values()) {
      if (days.size >= W_LER_MIN_DAYS) engagedUsers++;
    }
    const rate = activeUsers > 0 ? engagedUsers / activeUsers : 0;
    return { year, week, activeUsers, engagedUsers, rate };
  } catch (err) {
    console.error("[W-LER] computeWlerForWeek 실패(graceful):", year, week, err);
    return { year, week, activeUsers: 0, engagedUsers: 0, rate: 0 };
  }
}

/**
 * 최근 `weeks` 주(현재 진행중 주 제외, 직전 주부터 과거로)의 W-LER 추세.
 * 반환 순서 = 최신 → 과거. now 주입 가능(테스트 결정성). getRecentWaurTrend 대칭.
 */
export async function getRecentWlerTrend(
  now: Date = new Date(),
  weeks = 12,
): Promise<WlerWeek[]> {
  const current = getCurrentWeekNumber(now);
  const targets: { year: number; week: number }[] = [];
  let cursor = previousWeek(current.year, current.week);
  for (let i = 0; i < weeks; i++) {
    targets.push(cursor);
    cursor = previousWeek(cursor.year, cursor.week);
  }
  return Promise.all(targets.map((t) => computeWlerForWeek(t.year, t.week)));
}
