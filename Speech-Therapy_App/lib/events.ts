// INFRA-005-D — 이벤트 카탈로그 (MVP 핵심 일부).
//
// 본 카탈로그는 trackEvent 호출 시 type-safe 한 이름 + properties shape 을 강제하기 위함.
// 새 이벤트 추가 시 본 파일의 union 에 명시 후 lib/analytics.ts 의 trackEvent 가 자동 추론.
//
// 명명 규칙: snake_case, 동사_명사 (예: diagnose_started).
// 카테고리: diagnose / reward / auth / mission (Phase 1+).
//
// PII 절대 금지: email, name, raw transcript 등 노출 금지. userId 는 해싱된 anonymous_id 만 허용.

export type AnalyticsEvent =
  // === 진단 플로우 (FR-Q-001) ===
  | {
      name: "diagnose_started";
      properties: {
        targetPhoneme: "ㄱ" | "ㄴ" | "ㅅ" | "ㅈ" | "ㄹ";
        childAgeMonths: number;
      };
    }
  | {
      name: "diagnose_audio_recorded";
      properties: {
        durationMs: number;
        phase: "stt" | "audio"; // 2단계 발화 흐름 (SP3_2A 옵션 A)
      };
    }
  | {
      name: "diagnose_completed";
      properties: {
        articulationScore: number;
        linguisticScore: number;
        acousticScore: number;
        requiresHITL: boolean;
        elapsedMs: number;
      };
    }
  | {
      name: "diagnose_failed";
      properties: {
        reason:
          | "stt_unsupported"
          | "permission_denied"
          | "no_speech"
          | "network"
          | "validation"
          | "server_error";
      };
    }
  // === 결과 페이지 (FR-Q-002) ===
  | {
      name: "result_viewed";
      properties: {
        peerPercentile: number;
        hasHITL: boolean;
      };
    }
  | {
      name: "cta_clicked";
      properties: {
        cta: "weekly_mission" | "rewards" | "auth_signin";
      };
    }
  // === 보상 (FR-C-009) ===
  | {
      name: "reward_granted";
      properties: {
        rewardType: "star" | "tree";
        amount: number;
        wasSkipped: boolean; // 멱등성 차단
      };
    }
  // === 인증 (FR-C-005) ===
  | {
      name: "auth_signin_started";
      properties: {
        provider: "google";
      };
    }
  | {
      name: "auth_signin_completed";
      properties: {
        provider: "google";
        isFirstSignin: boolean;
      };
    }
  // === 미션 (FR-Q-003) ===
  | {
      name: "mission_started";
      properties: {
        missionId: string;
        targetPhoneme: "ㄱ" | "ㄴ" | "ㅅ" | "ㅈ" | "ㄹ";
        difficultyLevel: number;
        plannedDurationSec: number;
      };
    }
  | {
      name: "mission_completed";
      properties: {
        missionId: string;
        elapsedSec: number;
        completedReason: "timer_ended" | "manual_done" | "skipped";
      };
    }
  | {
      // FR-Q-003 Scenario 4 / REQ-FUNC-019 — useSilenceDetection intervention 발화.
      name: "mission_silence_intervention";
      properties: {
        missionId: string;
        intervention: "mirror" | "tooltip";
        silenceMs: number;
      };
    };

export type AnalyticsEventName = AnalyticsEvent["name"];
