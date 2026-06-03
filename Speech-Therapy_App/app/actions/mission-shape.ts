// FR-C-MISSION-COMPLETION — recordMissionCompletion Server Action 의 비-async 표면.
//
// FR-PERF-3-USE-SERVER-REFACTOR — "use server" 파일은 async 함수만 export 가능하므로
// interface / type / const 는 본 shape 모듈로 분리 (submit-chat-utterance-shape 패턴).

/// 미션 완료 종류. MissionRunner.finish(reason) 와 1:1.
///  - timer_ended : 타이머 만료(정상 완료)
///  - manual_done : "완료" 클릭(30초 진실성 가드 통과분만)
///  - skipped     : "건너뛰기"(완료로 카운트하지 않음 — durationSec=0)
export type MissionCompletedReason = "timer_ended" | "manual_done" | "skipped";

export interface RecordMissionCompletionInput {
  /// MissionCard.id (SessionLog.missionId FK). 미시드 카드면 graceful no-op.
  missionId: string;
  /// 미션 시작→종료 경과 초(클라이언트 측정, 0~86400). skipped 는 저장 시 0 으로 강제.
  elapsedSec: number;
  completedReason: MissionCompletedReason;
  /// localStorage 권위 익명 id(useAnonymousUserId). 인증 사용자는 무시(auth 우선).
  anonymousUserId?: string;
}

export type RecordMissionCompletionResult =
  | {
      success: true;
      sessionId: string;
      /// durationSec > 0 (정상 완료 = W-AUR 카운트 대상)인가. skipped → false.
      counted: boolean;
      /// 별 +1 신규 적립 여부(FR-C-MISSION-REWARD-WIRING). skipped/일일중복/적립실패 → false.
      starGranted: boolean;
      /// FR-C-STREAK-MILESTONE — 이번 완료로 *첫 도달*한 연속 마일스톤(3/7/14/30). 없으면 undefined.
      milestoneReached?: number;
      /// 마일스톤 보너스 별 수(milestoneReached 있을 때만).
      bonusStars?: number;
      /// 7일+ 마일스톤 나무 1 성장 여부(milestoneReached 있을 때만).
      treeGranted?: boolean;
    }
  | {
      success: false;
      reason: "invalid_input" | "internal_error";
      message?: string;
    };
