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
    }
  // === 주간 리포트 (FR-Q-005 + FR-Q-006) ===
  | {
      // FR-Q-006 — 데이터 부족 EmptyState 노출 (3 variants).
      name: "empty_state_viewed";
      properties: {
        variant: "new_user" | "week_empty" | "long_absent";
        weekSessionCount: number;
      };
    }
  | {
      // FR-Q-006 Scenario 4 — EmptyState CTA 클릭.
      name: "empty_state_cta_clicked";
      properties: {
        variant: "new_user" | "week_empty" | "long_absent";
        cta: "start_mission" | "start_diagnose";
      };
    }
  | {
      // FR-Q-005 Scenario 2 / REQ-FUNC-028 — 다음 주 예상 점수 카드 클릭.
      // FR-C-011 (Gemini 회귀) 통합 전에는 mock 예상치 (직전 주 평균 + 5점) 사용 — confidence: null.
      name: "prediction_clicked";
      properties: {
        predictedScore: number;
        confidence: number | null;
        weekNumber: number;
      };
    }
  // === STT 재시도 (FR-C-003 / REQ-NF-014) ===
  | {
      // 첫 호출 성공 (재시도 안 함).
      name: "stt_first_attempt_success";
      properties: Record<string, never>;
    }
  | {
      // 첫 호출 실패 후 200ms 자동 재시도 성공.
      name: "stt_retry_success";
      properties: {
        // 첫 호출의 에러 분류 (텔레메트리 분석용).
        firstAttemptError: "no_speech" | "network" | "aborted";
      };
    }
  | {
      // 재시도도 실패 — 사용자에게 수동 재시도 UI 노출.
      name: "stt_retry_failed";
      properties: {
        finalError: "no_speech" | "network" | "aborted" | "unknown";
      };
    }
  // === FR-C-011 Gemini 회귀 예측 (REQ-FUNC-045) ===
  | {
      // 예측 산출 완료 (Server Action 호출 후).
      name: "prediction_calculated";
      properties: {
        predicted: number;
        confidence: number;
        cached: boolean;
        staleFromRateLimit: boolean;
      };
    }
  | {
      // 시뮬레이션 옵션 변경 시 (missionFrequency 슬라이더).
      name: "prediction_simulation_changed";
      properties: {
        missionFrequency: "low" | "normal" | "high";
      };
    }
  // === FR-Q-012 — /predictions 상세 페이지 (EXP-2 검증 핵심) ===
  | {
      // 페이지 mount 1회 (Strict Mode 가드).
      name: "prediction_page_viewed";
      properties: {
        predicted: number;
        confidence: number;
        improvementDelta: number;
      };
    }
  | {
      // EXP-2 핵심 KPI — 예측 페이지에서 CTA 클릭 → /missions 이동.
      // "예측 클릭 유저 익월 유지율 +20%p" 가설 측정용.
      name: "prediction_cta_clicked";
      properties: {
        predicted: number;
        improvementDelta: number;
      };
    }
  // === FR-C-012 — 결과/보상 공유 (Replace 67-D1, REQ-FUNC-030/031) ===
  | {
      // 공유 버튼 클릭 → 실제 공유 수단(web_share / clipboard / unsupported) 분기 결과까지 포함.
      // 카카오 의존성 0 (67-D1 Replace) — 실 채널은 OS share sheet / clipboard 만.
      name: "share_clicked";
      properties: {
        method: "web_share" | "clipboard" | "unsupported";
        // user cancel (AbortError) 시 false. 폴백/성공 모두 true.
        succeeded: boolean;
        surface: "result" | "reward" | "weekly_report";
      };
    }
  // === FR-Q-011 — ROI 시뮬레이터 (Issue #52 / REQ-FUNC-048) ===
  | {
      // 슬라이더 변경 또는 첫 산출 시 발송. 입력 + 산출 매출 함께 기록.
      name: "roi_simulated";
      properties: {
        studentCount: number;
        monthlyFee: number;
        monthlyRevenue: number;
      };
    }
  // === MON-002 — STT/Gemini 에러 메트릭 (REQ-NF-021/024) ===
  | {
      // STT 호출 실패 — 5분 윈도우 3% 임계.
      name: "stt_error";
      properties: {
        code: "stt_no_speech" | "stt_network" | "stt_aborted" | "stt_permission_denied" | "stt_audio_capture" | "stt_unknown";
      };
    }
  | {
      // Gemini 호출 실패 — 1시간 윈도우 5% 임계.
      name: "gemini_error";
      properties: {
        code: "gemini_rate_limited" | "gemini_429" | "gemini_timeout" | "gemini_schema_invalid" | "gemini_5xx" | "gemini_unknown";
      };
    }
  // === FR-Q-014 (#55) — 카메라 거울 모드 (입 모양 가이드, 단순 self-view) ===
  | {
      // 거울 모드 활성화 시점 (getUserMedia 호출 직전 / 권한 prompt 직전).
      // trigger 분기:
      //   - "manual": 사용자가 버튼 클릭으로 직접 활성화
      //   - "silence_intervention": FR-C-006 침묵 감지 → mirror intervention 자동 활성화 (sibling Agent C)
      // PII 보호: 카메라 stream / 영상 frame 절대 외부 전송 금지 — 본 이벤트는 활성 카운트만.
      name: "mirror_mode_activated";
      properties: {
        missionId?: string;
        trigger: "manual" | "silence_intervention";
      };
    }
  | {
      // 카메라 권한 거부 또는 디바이스 부재 시 — 미션 진행 차단 안 함, fallback UI 노출 카운트.
      // errorName 은 DOMException.name 매핑 (NotAllowedError / NotFoundError / other).
      name: "mirror_mode_denied";
      properties: {
        missionId?: string;
        errorName: "NotAllowedError" | "NotFoundError" | "other";
      };
    }
  // === API-005 (#6) + FR-C-002 (#25) — HITL 큐 등록 텔레메트리 (수동/외부 enqueue + 자동 트리거 공통) ===
  | {
      // 두 경로 공통:
      //   1) POST /api/hitl/queue (외부 호출자 / admin 도구) 성공 직전
      //   2) confidence < 70 자동 트리거 (lib/hitl/enqueue.ts maybeEnqueueHitl) 성공 직후
      // R4 보호: 자녀 식별 정보 (userId / email / transcript / audioUrl / 이름) 절대 노출 금지.
      // targetPhoneme 은 자동 트리거 경로에서만 캡처 (외부 enqueue API 입력엔 없음) — optional.
      name: "hitl_enqueued";
      properties: {
        queueId: string; // HITLQueue.id (UUID)
        sessionId: string; // EvaluationResult.sessionId (HITLQueue.sessionId UNIQUE)
        confidenceScore: number; // 0~100
        slackNotified: boolean;
        targetPhoneme?: "ㄱ" | "ㄴ" | "ㅅ" | "ㅈ" | "ㄹ"; // FR-C-002 자동 트리거에서만
      };
    };

export type AnalyticsEventName = AnalyticsEvent["name"];
