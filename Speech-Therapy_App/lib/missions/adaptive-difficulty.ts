// FR-C-008 (#31) — 적응형 난이도 자동 하향 helper (Prisma 기반).
//
// 사양: 같은 user + 같은 phoneme 의 최근 3개 미션 세션 EvaluationResult 가 모두
// articulationScore < FAILURE_THRESHOLD (= 50) 인 경우 다음 추천 미션의 difficultyLevel
// 을 -1 (은밀히, 사용자 알림 없음) 조정한다.
//
// "은밀히" 의미: 본 helper 는 결과만 반환. UI 알림 / toast / 카피 변경은 절대
// 수행하지 않는다. 호출 측에서 difficultyLevel clamp (>= 1) + 분석 이벤트
// (difficulty_adjusted) 발송만 책임진다.
//
// 실패 정의: articulationScore < 50 (HITL_SIMILARITY_THRESHOLD 와 동일).
//   - 경계: score = 50 → "성공" (gate 미발동 시점). score < 50 만 "실패".
//   - 근거: app/actions/diagnosis.ts §HITL gate (articulation < 50 → HITL).
//
// References:
//   - REQ-FUNC-021 (3연속 -1, 은밀히, 전환 < 0.5초)
//   - SRS §3.5 F3-b 적응형 난이도 엔진
//   - 횡단 CON-04 (의료 어휘 0건 — 본 파일 변수명도 "failure" 는 내부 전용)
//   - R4 데이터 격리 (userId 필터 강제)
//
// 신규 Prisma 모델 추가 없음 — 기존 EvaluationResult.articulationScore +
// SessionLog.missionId → MissionCard.targetPhoneme 조인만 사용.

import { prisma } from "@/lib/db";

/// FR-C-008 — articulationScore 가 본 임계 미만이면 "실패" 로 본다.
/// 50 = HITL gate 임계 (app/actions/diagnosis.ts) 와 동일 — 동일 정책 재사용.
export const FAILURE_THRESHOLD = 50;

/// 본 helper 가 검사하는 최근 미션 세션 개수.
/// 3 = REQ-FUNC-021 "3연속 실패" 사양.
export const CONSECUTIVE_FAILURE_WINDOW = 3;

/// 본 helper 가 권장하는 하향 폭. 호출 측이 currentLevel + adjustment 로 적용 후
/// 1 미만으로 떨어지지 않도록 clamp 책임.
const DOWNWARD_ADJUSTMENT = -1;

export interface FailureCheckArgs {
  /// 검사 대상 사용자 (R4 격리 — 다른 user 결과 무시).
  userId: string;
  /// 검사 대상 음소. 다른 phoneme 미션 결과는 무시.
  targetPhoneme: "ㄱ" | "ㄴ" | "ㅅ" | "ㅈ" | "ㄹ";
}

export interface DifficultyAdjustment {
  /// true 이면 호출 측이 currentLevel - 1 (clamp >= 1) 적용 권장.
  shouldLower: boolean;
  /// 최근 윈도우 (CONSECUTIVE_FAILURE_WINDOW) 안의 실패 카운트.
  /// shouldLower=true 시점에는 항상 CONSECUTIVE_FAILURE_WINDOW 와 같다.
  consecutiveFailures: number;
  /// 0 (변동 없음) 또는 -1 (하향). 호출 측이 max(1, current + this) 로 적용.
  recommendedAdjustment: number;
}

/**
 * 같은 user + 같은 phoneme 의 최근 미션 세션 EvaluationResult 를 시간 역순으로
 * CONSECUTIVE_FAILURE_WINDOW (=3) 건 조회 후 모두 실패 (articulationScore <
 * FAILURE_THRESHOLD) 인지 검사한다.
 *
 * 호출 측 책임:
 *   - 결과 clamp (difficultyLevel >= 1)
 *   - 분석 이벤트 "difficulty_adjusted" 발송 (UI 알림 없음 — 은밀히)
 *   - sessions < 3 건이면 shouldLower=false (조건 미충족)
 */
export async function checkAdaptiveDifficulty(
  args: FailureCheckArgs,
): Promise<DifficultyAdjustment> {
  const { userId, targetPhoneme } = args;

  // 최근 CONSECUTIVE_FAILURE_WINDOW 건의 미션 세션 EvaluationResult.
  // SessionLog → MissionCard.targetPhoneme 조인으로 phoneme 필터.
  // - 미션이 아닌 진단 세션 (missionId null) 은 자동 제외 (mission.is { ... } 필터).
  // - R4: userId 직접 필터 (cross-read 차단).
  const recent = await prisma.evaluationResult.findMany({
    where: {
      userId,
      sessionLog: {
        mission: {
          targetPhoneme,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: CONSECUTIVE_FAILURE_WINDOW,
    select: {
      articulationScore: true,
    },
  });

  if (recent.length < CONSECUTIVE_FAILURE_WINDOW) {
    // 신규 user 또는 phoneme 시도 횟수 부족 — 조정 없음.
    return {
      shouldLower: false,
      consecutiveFailures: recent.filter((r) => r.articulationScore < FAILURE_THRESHOLD).length,
      recommendedAdjustment: 0,
    };
  }

  const failureCount = recent.filter((r) => r.articulationScore < FAILURE_THRESHOLD).length;
  const allFailed = failureCount === CONSECUTIVE_FAILURE_WINDOW;

  if (allFailed) {
    return {
      shouldLower: true,
      consecutiveFailures: CONSECUTIVE_FAILURE_WINDOW,
      recommendedAdjustment: DOWNWARD_ADJUSTMENT,
    };
  }

  return {
    shouldLower: false,
    consecutiveFailures: failureCount,
    recommendedAdjustment: 0,
  };
}

/**
 * 호출 측 헬퍼 — 현재 난이도 + adjustment 적용 + 하한 1 clamp.
 *
 * 본 함수는 difficultyLevel 1 미만으로 떨어지지 않도록 보장한다 (사양 하한).
 * 별도 export 로 테스트하기 쉽게 분리.
 */
export function applyAdjustmentWithFloor(
  currentLevel: number,
  adjustment: number,
  minLevel = 1,
): number {
  return Math.max(minLevel, currentLevel + adjustment);
}
