"use server";

// FR-C-MISSION-COMPLETION — 미션 완료 서버 영속화 (W-AUR 측정 기반).
//
// 배경(Phase-1 백로그 조사, 2026-05-31):
//   북극성 KPI(W-AUR = 주간 미션 완수율)의 *측정 기반 자체*가 부재했다. 미션 완료는
//   클라이언트 trackEvent('mission_completed')(MissionRunner) 한 곳뿐 — 브라우저 SDK 로만 가고
//   DB 영속화 0. 그 결과 funnel mission_completed·nav badge missionPendingToday 가 영구 0(데드).
//   본 Server Action 이 미션 완료를 SessionLog row(missionId 세팅)로 영속화해 측정 기반을 깐다.
//
// 의미 정합(기존 컨벤션 재사용 — 본 PR 은 측정 기반만, W-AUR *정의 전환*은 별도):
//   - 진단 세션      : SessionLog.missionId = null, durationSec = 0 (diagnosis.ts)
//   - 미션 정상 완료 : missionId 세팅, durationSec = elapsedSec(> 0)
//                      → funnel mission_completed(durationSec>0) + nav badge 완료 처리
//   - 미션 건너뛰기  : missionId 세팅, durationSec = 0
//                      → nav badge '오늘 미완료'(durationSec<=0) 로 노출, 완수 카운트 제외
//   (근거: lib/analytics/funnel.ts 의 completed=durationSec>0 / lib/nav/badge-counts.ts
//    countMissionPendingToday=durationSec<=0. MissionRunner 30초 진실성 가드와 정합.)
//
// PIPA: 미션은 진단/국외이전/음성 미관여 → consent 무관. User row 는 FK(onDelete:Cascade) 보장용
//   최소 provisioning 만 하고 동의 일시는 건드리지 않는다(diagnosis 의 consent upsert 와 구분).

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { withActor } from "@/lib/db/with-actor";
import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatKstDate } from "@/lib/timeline/tz";
import { grantReward } from "@/app/actions/reward";
import { getMissionStreak } from "@/lib/missions/streak";
import { trackServerEvent } from "@/lib/analytics-server";
import {
  STREAK_MILESTONE_BONUS,
  STREAK_TREE_MIN_MILESTONE,
} from "@/lib/missions/streak-milestones";

import type {
  RecordMissionCompletionInput,
  RecordMissionCompletionResult,
} from "./mission-shape";

const InputSchema = z.object({
  missionId: z.string().min(1, "missionId 가 필요해요.").max(128),
  elapsedSec: z.number().int().min(0).max(86_400),
  completedReason: z.enum(["timer_ended", "manual_done", "skipped"]),
  anonymousUserId: z.string().min(1).max(128).optional(),
});

/**
 * userId 우선순위 — diagnosis.resolveUserId 와 동일 권위(/rewards·진단과 동일 id 보장).
 *  1. Supabase 인증 사용자
 *  2. input.anonymousUserId (localStorage 권위, useAnonymousUserId)
 *  3. cookie anonymous_user_id (proxy.ts 발급 — 폴백)
 *  4. randomUUID (방어적, 정상 흐름 미도달)
 */
async function resolveUserId(anonymousUserId?: string): Promise<string> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch {
    // Supabase env 미설정 등 — 익명 폴백.
  }
  if (anonymousUserId) return anonymousUserId;
  const cookieStore = await cookies();
  const cookieUserId = cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
  if (cookieUserId) return cookieUserId;
  return randomUUID();
}

/**
 * 미션 완료 1건을 SessionLog 로 영속화 (W-AUR 측정 기반).
 *
 * MissionRunner.finish(reason) 직후 클라이언트가 fire-and-forget 으로 호출.
 * 절대 throw 하지 않음 — 미션 UX(완료 화면 전환)를 차단하지 않는다(diagnosis 패턴).
 *  - 미시드 카드(MissionCard FK 위반) / DB 장애 → graceful internal_error.
 */
export async function recordMissionCompletion(
  rawInput: RecordMissionCompletionInput,
): Promise<RecordMissionCompletionResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      reason: "invalid_input",
      message: parsed.error.issues[0]?.message,
    };
  }
  const { missionId, elapsedSec, completedReason, anonymousUserId } = parsed.data;

  // W-AUR 진실성 가드 — skipped 는 완수로 카운트하지 않음(durationSec=0).
  const durationSec = completedReason === "skipped" ? 0 : elapsedSec;

  const userId = await resolveUserId(anonymousUserId);
  const sessionId = randomUUID();

  try {
    // User row 보장 — SessionLog.userId FK(onDelete:Cascade). 진단 없이 미션만 한 익명 사용자도
    //   provisioning. 동의 일시는 미변경(미션은 consent 무관). update:{} = "있으면 그대로".
    await withActor(userId, (tx) =>
      tx.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, role: "parent" },
      }),
    );

    await prisma.sessionLog.create({
      data: { id: sessionId, userId, missionId, durationSec },
    });
  } catch (err) {
    // FK 위반(미시드 카드) / DB 장애 — graceful(미션 UX 차단 0).
    console.error("[FR-C-MISSION-COMPLETION] sessionLog INSERT failed:", err);
    return { success: false, reason: "internal_error" };
  }

  // FR-C-MISSION-REWARD-WIRING — 정상 완료(durationSec>0)만 별 +1.
  //   멱등키 = mission-{missionId}-{KST 일자} → 같은 미션 같은 날 재완수는 1회만(파밍 차단),
  //   다음 날 재완수는 새 별(일일 리텐션 유지). skipped/일일중복/적립실패는 starGranted=false.
  //   적립 실패는 graceful — 측정 기반(SessionLog)은 이미 영속됐고 보상은 보조.
  let starGranted = false;
  if (durationSec > 0) {
    try {
      const out = await grantReward({
        userId,
        rewardType: "star",
        amount: 1,
        idempotencyKey: `mission-${missionId}-${formatKstDate(new Date())}`,
      });
      starGranted = !out.wasSkipped;
    } catch (err) {
      console.error("[FR-C-MISSION-COMPLETION] 별 적립 실패(graceful):", err);
    }
  }

  // FR-C-STREAK-MILESTONE — 연속 활동 마일스톤(3/7/14/30) 첫 도달 시 보너스.
  //   정상 완료(durationSec>0)만. SessionLog INSERT 후라 getMissionStreak 가 오늘 포함 streak 반환.
  //   멱등키 streak-{milestone}-{userId} (일자 없음) → 평생 1회(파밍 차단). 7일+ 는 나무 1 성장
  //   (incrementTreeGrowth 첫 프로덕션 트리거 → /rewards/collection '나무 0' 해소).
  //   간접 레버(일일 재방문→주4회 W-AUR)라 streak_milestone_reached 텔레메트리로 전환 측정.
  //   전부 graceful — 측정 기반(SessionLog)·기본 별은 이미 영속, 보너스는 보조.
  let milestoneReached: number | undefined;
  let bonusStars: number | undefined;
  let milestoneTreeGranted = false;
  if (durationSec > 0) {
    try {
      const streak = await getMissionStreak(userId);
      const bonus = STREAK_MILESTONE_BONUS[streak.current];
      if (bonus) {
        const bonusOut = await grantReward({
          userId,
          rewardType: "star",
          amount: bonus,
          idempotencyKey: `streak-${streak.current}-${userId}`,
        });
        // 멱등 wasSkipped=false 일 때만 = 이 마일스톤 *첫 도달*.
        if (!bonusOut.wasSkipped) {
          if (streak.current >= STREAK_TREE_MIN_MILESTONE) {
            const treeOut = await grantReward({
              userId,
              rewardType: "tree",
              amount: 1,
              idempotencyKey: `streak-tree-${streak.current}-${userId}`,
            });
            milestoneTreeGranted = !treeOut.wasSkipped;
          }
          milestoneReached = streak.current;
          bonusStars = bonus;
          void trackServerEvent(
            "streak_milestone_reached",
            { milestone: streak.current, bonusStars: bonus, treeGranted: milestoneTreeGranted },
            userId,
          );
        }
      }
    } catch (err) {
      console.error("[FR-C-STREAK-MILESTONE] 마일스톤 보너스 실패(graceful):", err);
    }
  }

  return {
    success: true,
    sessionId,
    counted: durationSec > 0,
    starGranted,
    milestoneReached,
    bonusStars,
    treeGranted: milestoneReached !== undefined ? milestoneTreeGranted : undefined,
  };
}
