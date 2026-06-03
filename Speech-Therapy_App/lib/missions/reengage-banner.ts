// FR-C-REENGAGE-BANNER — /missions 진입 시 적응형 재유도 배너 variant 선택 (순수 함수).
//
// 목적(리텐션 레버): W-AUR 분자(주간 미션 완료수)의 가장 가까운 hot 코호트에 진입 세션 내
//   1-friction-step 액션을 제시 → 완료 전환↑. 이미 호출 중인 streak / weeklyGoal /
//   resumableMissionId 신호를 "텍스트 게이지"에서 "액션 배너"로 승격(net-new 쿼리 0~1).
//
// 우선순위(1종만 노출):
//   1) resume      — 오늘 시작·미완료 미션 이어하기 (가장 강한 완료 신호, 딥링크).
//   2) streak      — 연속 유지 중인데 오늘 미활동 → 끊김 방지 (loss-framed, streak≥2).
//   3) weekly_goal — 이번 주 목표 1~2회 임박 + 미달성 → 목표 지향.
//   그 외(신규/오늘 충분히 활동 + 목표 여유·달성) → null. 기존 게이지/affirmation 이 담당.
//
// 설계 원칙(streak.ts 와 동일): raw SessionLog 불변, 배너는 *display 파생*만.
//   완료 동선(30초 가드 + 멱등 recordMissionCompletion)에 절대 관여 안 함.
//
// CON-04: 모든 카피에 "치료/진단/장애" + 실패 어휘 0건 — 격려·유도 표현만.
// R4: 입력은 본인(userId) 파생 신호만 — 자녀 식별 정보 0.

import type { MissionStreak } from "./streak";
import type { WeeklyMissionGoal } from "./weekly-goal";

export type ReengageBannerVariant = "resume" | "streak" | "weekly_goal";

export interface ReengageBanner {
  /// 노출된 배너 종류 (텔레메트리 + UI 분기).
  variant: ReengageBannerVariant;
  /// CTA 딥링크 — resume 만 특정 미션 play 경로. 그 외 undefined(호출 측이 in-page 앵커 폴백).
  href?: string;
  /// 격려·유도 카피 (CON-04 클린).
  message: string;
  /// CTA 버튼 라벨.
  cta: string;
}

export interface ReengageBannerInput {
  streak: MissionStreak;
  weeklyGoal: WeeklyMissionGoal;
  /// 오늘 시작·미완료(durationSec<=0, 오늘 완료 이력 없음) 미션 id. 없으면 undefined.
  /// 호출 측(getResumableMission)이 '오늘 완료' suppression + 카드 존재 검증을 마친 값.
  resumableMissionId?: string;
  /// 익명/신규(userId 부재) → 항상 null no-op (R4 — 본인 신호 없을 때 유도 안 함).
  hasUser: boolean;
}

/**
 * 우선순위 1종 배너 선택 (해당 없으면 null).
 *
 * 순수 함수 — 입력 신호만으로 결정적 산출(테스트 용이, DB/시간 의존 0).
 */
export function pickReengageBanner(
  input: ReengageBannerInput,
): ReengageBanner | null {
  if (!input.hasUser) return null;
  const { streak, weeklyGoal, resumableMissionId } = input;

  // 1) 오늘 시작·미완료 이어하기 — 가장 강한 완료 신호(딥링크). 새 미션 아닌 '마무리'라 distinct 오염 X.
  if (resumableMissionId) {
    return {
      variant: "resume",
      href: `/missions/${encodeURIComponent(resumableMissionId)}/play`,
      message: "시작한 미션이 아직 남아 있어요. 1분이면 가볍게 마무리할 수 있어요.",
      cta: "이어서 하기",
    };
  }

  // 2) 연속 유지 중인데 오늘 아직 미활동 → 끊김 방지. (1일은 게이지가 담당 → streak≥2 부터.)
  if (!streak.activeToday && streak.current >= 2) {
    return {
      variant: "streak",
      message: `${streak.current}일 연속 이어오고 있어요. 오늘도 미션으로 이어가 볼까요?`,
      cta: "오늘 미션 하기",
    };
  }

  // 3) 이번 주 목표 임박(1~2회 남음) + 미달성 → 목표 지향 유도.
  //    (카피는 '한 번 더' = 안 한 미션 유도 — 동일 미션 재완료로 W-AUR 부풀리지 않도록.)
  if (!weeklyGoal.achieved && weeklyGoal.remaining >= 1 && weeklyGoal.remaining <= 2) {
    return {
      variant: "weekly_goal",
      message: `이번 주 목표까지 ${weeklyGoal.remaining}회 남았어요. 지금 새 미션 하나 더 해볼까요?`,
      cta: "미션 하나 더",
    };
  }

  return null;
}
