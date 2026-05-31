// FR-C-DAILY-STREAK — 연속 활동(출석) streak 계산.
//
// 정의:
//   - "활동일" = 해당 KST 일자에 의미있는 SessionLog 가 ≥1건 있는 날.
//     의미있는 = 미션 완료(durationSec>0) 또는 진단(missionId=null). 건너뛴 미션(durationSec<=0
//     AND missionId!=null)은 제외 — 완수가 아니므로 streak 미인정(W-AUR 진실성 정합).
//   - streak = 오늘(또는 어제)부터 과거로 연속된 활동일 수.
//     · 오늘 활동 있음 → 오늘 포함하여 역방향 카운트(activeToday=true).
//     · 오늘 활동 없고 어제 있음 → 어제까지 카운트(activeToday=false, "오늘 이어가기" nudge).
//     · 최근 활동이 2일+ 전 → 끊김(current=0).
//
// 설계 원칙(auto-memory: 임상 보정과 무관하나 동일 원칙) — raw SessionLog row 는 불변,
//   streak 은 *display 파생*만. escalation/HITL/저장 경로 미관여.
//
// KST 경계: lib/timeline/tz 의 formatKstDate/kstStartOfDay/kstDaysAgoStart 재사용(서버 TZ 의존 0).

import { prisma } from "@/lib/db";
import { formatKstDate, kstStartOfDay, kstDaysAgoStart } from "@/lib/timeline/tz";

/// streak 산출 윈도우 — 60일(표시 동기부여로 충분, 무한 조회 방지).
const STREAK_WINDOW_DAYS = 60;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface MissionStreak {
  /// 연속 활동일 수(0 = 끊김/신규).
  current: number;
  /// 오늘(KST) 이미 활동했는가 — 카피 분기용.
  activeToday: boolean;
}

/**
 * 본인(R4) 연속 활동 streak. 호출 측(missions 페이지)에서 resolveUserId 후 전달.
 *
 * graceful — DB 장애 시 {current:0, activeToday:false}(streak 미표시, 페이지 차단 0).
 * now 주입 가능(테스트 결정성).
 */
export async function getMissionStreak(
  userId: string,
  now: Date = new Date(),
): Promise<MissionStreak> {
  try {
    const rows = await prisma.sessionLog.findMany({
      where: {
        userId,
        startTime: { gte: kstDaysAgoStart(STREAK_WINDOW_DAYS, now) },
        // 의미있는 활동만 — 미션 완료(durationSec>0) 또는 진단(missionId null). 건너뛴 미션 제외.
        OR: [{ durationSec: { gt: 0 } }, { missionId: null }],
      },
      select: { startTime: true },
      orderBy: { startTime: "desc" },
      take: 1000,
    });
    if (rows.length === 0) return { current: 0, activeToday: false };

    const activeDays = new Set(rows.map((r) => formatKstDate(r.startTime)));
    const today = formatKstDate(now);
    const yesterday = formatKstDate(new Date(now.getTime() - ONE_DAY_MS));
    const activeToday = activeDays.has(today);

    // 최근 활동이 today/yesterday 가 아니면 끊김.
    if (!activeToday && !activeDays.has(yesterday)) {
      return { current: 0, activeToday: false };
    }

    // 앵커(오늘 또는 어제)부터 과거로 연속 활동일 카운트.
    let dayStart = kstStartOfDay(activeToday ? now : new Date(now.getTime() - ONE_DAY_MS));
    let current = 0;
    while (activeDays.has(formatKstDate(dayStart))) {
      current++;
      dayStart = new Date(dayStart.getTime() - ONE_DAY_MS);
    }
    return { current, activeToday };
  } catch (err) {
    console.error("[FR-C-DAILY-STREAK] getMissionStreak 실패(graceful):", err);
    return { current: 0, activeToday: false };
  }
}
