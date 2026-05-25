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
      // FR-C-002 (#25) — confidence < 70 시 자동 HITL 트리거 직전에 1회 발송.
      // 본 이벤트는 lib/diagnose/confidence.ts (Gemini swap) 활성화 후
      // 트리거 dormant 해제 비율을 측정하기 위함 (Gemini vs fallback 분기).
      // R4: 자녀 식별 정보 (userId/transcript) 미포함 — confidence 값 + source 만.
      name: "diagnose_confidence_low";
      properties: {
        confidence: number;
        source: "gemini" | "fallback";
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
  | {
      // FR-C-011 — Gemini 실 호출이 차단/실패하여 mock 폴백으로 응답한 경우 1회.
      // R4: userId 노출은 PII 분석 백엔드에서 자동 해시 (server-side 텔레메트리 가정).
      // reason 매트릭스 — graceful 분기 추적 (rate_limited 비중이 높으면 quota 상향 의사결정).
      name: "prediction_fallback_used";
      properties: {
        userId: string;
        reason:
          | "api_key_missing"
          | "rate_limited"
          | "api_error"
          | "timeout"
          | "schema_invalid"
          | "disabled"
          | "insufficient_history";
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
    }
  // === FR-C-010 (#33) — 주간 리포트 cron 생성 텔레메트리 ===
  | {
      // 매주 일요일 cron 의 사용자별 weekly_report upsert 성공 직후.
      // R4 보호: userId 만 노출 (server-side cron 이므로 분석 백엔드에선 자동 해시 적용).
      //   weekStart (YYYY-MM-DD) / sessionCount / wAurAchieved 만 — 자녀 식별 정보 0.
      // 본 PR (FR-C-010) 의 cron 은 PostHog/GA 클라이언트 미사용 → console.log 로 대체하나,
      // 향후 server-side analytics (PostHog Node SDK) 도입 시 본 카탈로그가 type-safe 표면 제공.
      name: "weekly_report_generated";
      properties: {
        userId: string;
        weekStart: string;
        sessionCount: number;
        wAurAchieved: boolean;
      };
    }
  // === FR-C-013 (#36) — HITL 전문가 코멘트 PATCH 텔레메트리 ===
  | {
      // /api/hitl/[id]/comment PATCH 성공 직후 (DB update + audit 완료 후) 1회.
      // R4 보호: 자녀 식별 정보 (userId / email / 코멘트 본문 / transcript) 절대 노출 금지.
      // expertRole 은 admin / principal / expert 중 하나 (proxy.ts allow-list).
      // hadCorrection: correctedScore 가 포함되었는지 — 보정 vs 코멘트만 분기 측정.
      name: "hitl_comment_submitted";
      properties: {
        queueId: string;
        hadCorrection: boolean;
        expertRole: "admin" | "principal" | "expert";
      };
    }
  // === MON-001 (#64) — 퍼널 CVR 일간 ±20% 변동 alert (server-side cron 발송) ===
  | {
      // /api/cron/funnel-alert 가 단일 step 임계 초과 시 발송. 1 alert = N step items.
      // 본 이벤트는 cron 측 telemetry 용 (Slack alert 와 별개 — Vercel Analytics 측정 X,
      // 단 server-side telemetry sink 도입 시 사용 가능).
      // R4: step 명 + 방향 + 변동 폭만 — userId / sessionId 0건.
      name: "funnel_alert_triggered";
      properties: {
        step:
          | "landing"
          | "diagnose_started"
          | "diagnose_completed"
          | "mission_started"
          | "mission_completed"
          | "reward_granted";
        direction: "up" | "down";
        deltaPct: number;
      };
    }
  // === FR-C-014 (#37 잔여) — HITL 수동 에스컬레이션 (admin 버튼 + PATCH /api/hitl/[id]/escalate) ===
  | {
      // admin/principal/expert 가 detail page 에서 수동으로 escalate 버튼 클릭한 시점.
      // R4: queueId 만 노출 (sessionId / userId 미포함). reason 은 zod enum 만 허용 + 폴백 "manual".
      // expertRole: User.role (audit log 와 분리된 별도 KPI 축 — 어떤 role 이 가장 많이 escalate?)
      name: "hitl_manually_escalated";
      properties: {
        queueId: string;
        reason: "expert_judgment" | "sla_at_risk" | "duplicate" | "manual";
        expertRole: "admin" | "principal" | "expert";
      };
    }
  // === REQ-FUNC-007 — 60dB SPL 게이트 (환경 소음 측정 + Toast 알림) ===
  | {
      // useSplMeter 가 persistMs (default 5s) 동안 thresholdDb (default 60) 를 초과한 시점.
      // surface: "diagnose" (FR-Q-001 발화 폼) / "mission" (FR-Q-003 미션 페이지 — #106 잔여 통합).
      // peakDb 는 초과 구간의 관측 최대 dB (SPL-like, splOffsetDb 보정 후). 절대 보정 X.
      // 호출 측 정책: 5분 cooldown 안에 재발해도 이벤트는 1회만 (스팸 방지) — 본 union 은 shape 만 강제.
      // R4 보호: raw audio / FFT data 절대 노출 금지 — 단순 카운트 + dB 메트릭만.
      name: "noise_threshold_exceeded";
      properties: {
        peakDb: number;
        durationMs: number;
        surface: "diagnose" | "mission";
      };
    }
  // === REQ-FUNC-007 잔여 (#106) — SPL calibration UI 1회 완료 ===
  | {
      // /settings/calibration 에서 부모가 "이 환경으로 설정" 버튼 클릭 직후.
      // offsetDb: 새로 저장된 splOffsetDb (60~140 clamp 후).
      // measuredAvgDb: 5초 측정 평균 (Toast 기준 60dB 대비 사용자 환경 위치 분석).
      // R4 보호: raw audio / FFT / userId 0건 — 단순 numeric 메트릭만.
      name: "spl_calibration_completed";
      properties: {
        offsetDb: number;
        measuredAvgDb: number;
      };
    }
  // === FR-Q-009 (#50) — 원장 Route Group 대시보드 첫 paint ===
  | {
      // /admin/principal 페이지 RSC mount 직후 1회 (서버 측 console.log telemetry — Vercel Logs).
      // R4 보호: userId / 자녀 식별 정보 0 — institutionId + 집계 카운트만.
      // classCount / studentCount 0건이면 신규 기관 (등록 미완료) 분기 — onboarding 분석에 사용.
      name: "principal_dashboard_viewed";
      properties: {
        institutionId: string;
        classCount: number;
        studentCount: number;
      };
    }
  // === FR-Q-TEACHER — 선생님 대시보드 첫 paint (/admin/teacher) ===
  | {
      // /admin/teacher 페이지 RSC mount 직후 1회 (서버 측 console.log telemetry — Vercel Logs).
      // R4: teacherId 는 server-side telemetry 해시 가정 (PII 직접 노출 금지).
      // classCount / studentCount 0건이면 신규 선생님 (반 미지정) 분기 — onboarding 분석에 사용.
      name: "teacher_dashboard_viewed";
      properties: {
        teacherId: string;
        classCount: number;
        studentCount: number;
      };
    }
  // === FR-C-016 (#39) — 원아 일괄 등록 (CSV 업로드 후 Server Action 호출 완료) ===
  | {
      // submitBulkImport Server Action 응답 직후 클라이언트에서 1회 발송.
      // totalRows: 사용자가 등록 시도한 전체 행 수 (UI 테이블 length).
      // successCount: Prisma createMany 가 보고한 INSERT 카운트 (멱등성 skip 제외).
      // errorCount: client/server 양쪽 검증에서 reject 된 행 수.
      // R4 보호: 행별 원아 정보 (이름/학번/이메일) 절대 노출 금지 — 집계 메트릭만.
      name: "student_bulk_import_submitted";
      properties: {
        totalRows: number;
        successCount: number;
        errorCount: number;
      };
    }
  // === FR-C-017 (#40 Replace D8) — AI 쿠션어 알림장 생성 + 클립보드 복사 ===
  | {
      // streamCushionNote / generateCushionNote 완료 직후 (route handler 또는 server action).
      // source 분기 — 'gemini': 실 AI 응답, 'template': forced/timeout/banned-term swap.
      // charCount: 최종 텍스트 글자 수 (UI 가 30자 단위 페인트 진행률 표현용).
      // R4: evaluationResultId 만 노출 (자녀 이름/email/transcript 0).
      name: "cushion_note_generated";
      properties: {
        evaluationResultId: string;
        source: "gemini" | "template";
        charCount: number;
      };
    }
  | {
      // 클립보드 복사 버튼 클릭 직후 (shareOrCopy / navigator.clipboard.writeText 결과).
      // method 분기 — share.ts 의 ShareMethod 와 정합 (web_share/clipboard/unsupported).
      // R4: evaluationResultId 만 노출 (텍스트 본문 0).
      name: "cushion_note_copied";
      properties: {
        evaluationResultId: string;
        method: "web_share" | "clipboard" | "unsupported";
      };
    }
  // === FR-Q-004 (#45) — 보상 도감 Card Grid 페이지 mount ===
  | {
      // /rewards/collection 페이지 RSC 결과를 client beacon 이 mount 시 1회 발송.
      // 자녀가 본 시점의 누적 보상 분포를 KPI 화 (도감 진입 → 미션 CTA 클릭률 측정용).
      // R4 보호: userId / 자녀 식별 정보 0 — 단순 카운트 메트릭만.
      // aiArtsCount 는 현재 schema 부재로 항상 0 (Phase 1+ AiDrawing 모델 도입 후 양수 가능).
      name: "reward_collection_viewed";
      properties: {
        stars: number;
        trees: number;
        aiArtsCount: number;
      };
    }
  // === FR-C-008 (#31) — 적응형 난이도 자동 하향 (3연속 실패 → -1, 은밀히) ===
  | {
      // checkAdaptiveDifficulty 가 shouldLower=true 반환 후 호출 측이 적용 직후 1회 발송.
      // "은밀히" 사양 — 사용자 UI 알림은 절대 발송 안 함. 본 이벤트는 백엔드 분석 전용.
      // R4 보호: userId / 자녀 식별 정보 0건 — 음소 + 카운트 + 난이도 변화만.
      // newLevel 은 호출 측 clamp (>= 1) 적용 후 값 — previousLevel 과 같을 수 있음 (이미 1).
      name: "difficulty_adjusted";
      properties: {
        targetPhoneme: "ㄱ" | "ㄴ" | "ㅅ" | "ㅈ" | "ㄹ";
        consecutiveFailures: number;
        previousLevel: number;
        newLevel: number;
      };
    }
  // === FR-C-007 (#30 Replace D5) — 오프라인 감지 Toast (Service Worker / IndexedDB 미사용 단순화) ===
  | {
      // navigator.onLine === false 로 전환된 직후 1회. OfflineToast 가 발송.
      // path: window.location.pathname (어떤 화면에서 가장 자주 발생하는지 분석용).
      // R4 보호: userId / query string / hash 0건 — pathname 만.
      // 본 PR 범위 외: Service Worker 등록 / IndexedDB 소급 보상 — 향후 PWA 트랙에서 별도 처리.
      name: "offline_detected";
      properties: {
        path: string;
      };
    }
  | {
      // navigator.onLine === true 복귀 직후 1회. 직전 offline_detected 이벤트와 pair.
      // offlineDurationMs: 이번 offline → online 사이의 경과 시간 (≥ 0).
      // R4 보호: userId 0건 — 단순 numeric 메트릭만.
      name: "online_restored";
      properties: {
        offlineDurationMs: number;
      };
    }
  // === FR-C-018 (#41) — 동의서 발송 + D+3 리마인더 + 7일 만료 (consent flow) ===
  | {
      // POST /api/consent/sign 정상 처리 후 1회. DB INSERT (또는 멱등 update) 완료 + 이메일 발송 시도 직후.
      // emailSkipped: RESEND_API_KEY 미설정 / NODE_ENV='test' / 발송 실패 모두 true (DB record 우선 정책).
      // R4 보호: parentEmail / childName / token 절대 노출 금지 — consentId + 라벨만.
      name: "consent_sent";
      properties: {
        consentId: string;
        consentType: string;
        emailSkipped: boolean;
      };
    }
  | {
      // 부모가 /consent/[token] 페이지에서 서명 완료 후 1회 (submitConsentSignature Server Action).
      // daysFromSent: 부모가 서명까지 걸린 일수 (sentAt → signedAt 차이, 반올림).
      // R4 보호: token / parentEmail 노출 0건 — consentId + 메트릭만.
      name: "consent_signed";
      properties: {
        consentId: string;
        daysFromSent: number;
      };
    }
  | {
      // D+3 리마인더 cron 의 row 별 발송 성공 직후 1회.
      // daysFromSent: cron 호출 시점의 sentAt 경과 일수 (대개 3 or 4 — graceful 윈도우).
      // R4 보호: parentEmail / childName 0건.
      name: "consent_reminded";
      properties: {
        consentId: string;
        daysFromSent: number;
      };
    }
  | {
      // 7일 만료 cron 이 status='pending' → status='expired' 로 전환한 row 별 1회.
      // R4 보호: parentEmail / childName 0건 — consentId 만.
      name: "consent_expired";
      properties: {
        consentId: string;
      };
    }
  // === API-012 (#13) — Resend 이메일 어댑터 발송 텔레메트리 (Replace 67-D1 + D8) ===
  | {
      // lib/email/resend.ts sendEmail 직후 호출 측이 1회 발송.
      // template: 'parent_invite' / 'consent_signature' / 'cushion_note' / ... (호출 측 라벨).
      // skipped: RESEND_API_KEY 미설정 또는 NODE_ENV='test' 로 실 발송 차단된 경우 true.
      // hasError: Resend SDK 호출 실패 / timeout / banned_term 등 ok=false 분기.
      // R4 보호: 자녀 식별 정보 (이름 / 이메일 / userId) 절대 노출 금지 — 분기 메트릭만.
      name: "email_sent";
      properties: {
        template: string;
        skipped: boolean;
        hasError: boolean;
      };
    }
  // === FR-Q-009 / FR-C-005 — 부모 초대 (Resend + JWT signup link) ===
  | {
      // sendParentInvite Server Action 의 sendEmail 직후 1회 (server-side console.log).
      // R4 보호: parentEmail / childId / token 절대 노출 금지 — institutionId + skip 분기만.
      // emailSkipped: Resend env 미설정 / 5xx / 금칙어 / NODE_ENV='test' 모두 true.
      name: "parent_invite_sent";
      properties: {
        institutionId: string;
        emailSkipped: boolean;
      };
    }
  | {
      // ParentSignupForm 의 completeParentSignup 성공 직후 1회 (client trackEvent).
      // daysFromSent: token iat 와 가입 완료 시각 차 (일 단위). 본 PR 단순화로 0 폴백 — 후속 PR 에서 정확한 산출.
      // R4 보호: parentEmail / childId 0건 — institutionId + 일수 메트릭만.
      name: "parent_invite_accepted";
      properties: {
        institutionId: string;
        daysFromSent: number;
      };
    }
  // === FR-C-017+ — 쿠션어 알림장 이메일 발송 (Resend 통합) ===
  | {
      // sendCushionNoteEmail() 직후 호출 측이 1회 발송.
      // emailSkipped: NODE_ENV='test' / RESEND_API_KEY 미설정 / parentEmail 부재 등 graceful skip.
      // hasError: Resend SDK 실패 / banned_term / timeout 등 ok=false 분기.
      // R4 보호: parentEmail / 자녀 이름 / 본문 노출 금지 — evaluationResultId 만.
      name: "cushion_note_emailed";
      properties: {
        evaluationResultId: string;
        emailSkipped: boolean;
        hasError: boolean;
      };
    }
  // === FR-Q-013 (#54) — 자녀 통합 타임라인 페이지 mount (앱 세션 + 센터 오프라인 placeholder) ===
  | {
      // /admin/timeline/[userId] 페이지 RSC mount 직후 1회 (server-side console.log telemetry).
      // R4 보호: userId 는 server-side 텔레메트리에서 분석 백엔드 자동 해시 가정 (PII 직접 노출 금지).
      // entriesCount: diagnose + mission entry 합계 (≥ 0). hasMissionData / hasDiagnoseData 분기 진단용.
      name: "timeline_viewed";
      properties: {
        userId: string;
        entriesCount: number;
        hasMissionData: boolean;
        hasDiagnoseData: boolean;
      };
    }
  // === FR-Q-007 (#48) — 센터 제출용 PDF 다운로드 (jsPDF 클라이언트 측, Replace) ===
  | {
      // /admin/centers/pdf/[userId] 의 CenterPdfDownloadClient 가 다운로드 트리거 직후 1회.
      // PDF 자체는 클라이언트 브라우저에서 생성 — 서버 저장/업로드 없음.
      // R4 보호: childName / parentEmail / 점수 raw 값 0건 — userId + institutionId 라벨만.
      // institutionId 는 admin (institution 미소속) 호출 분기에서 undefined 가능.
      name: "center_pdf_downloaded";
      properties: {
        userId: string;
        institutionId?: string;
      };
    }
  // === FR-C-PARENT-ONBOARDING — 신규 부모 first-time wizard (4-step) ===
  | {
      // wizard mount 직후 1회 — 본 user 가 wizard 를 처음 (또는 다시) 시작한 시점.
      // hasExistingChildInfo: User.childAgeMonths 가 이미 저장된 사용자인지 분기.
      // R4 보호: userId / 자녀 식별 정보 0건 — 단순 boolean 메트릭만.
      name: "onboarding_started";
      properties: {
        hasExistingChildInfo: boolean;
      };
    }
  | {
      // 각 step 완료 시 1회 — 4단계 funnel CVR 분석용.
      // durationMs: 해당 step 진입 → 다음 버튼 클릭 사이 경과 시간 (≥ 0).
      // R4 보호: userId / 자녀 정보 0건 — step 번호 + 경과 시간만.
      name: "onboarding_step_completed";
      properties: {
        step: 1 | 2 | 3 | 4;
        durationMs: number;
      };
    }
  | {
      // 4단계 모두 완주 후 1회 — markOnboardingCompleted 호출 직후.
      // totalDurationMs: wizard 시작 → 완료까지 누적 시간.
      // skippedSteps: 사용자가 "이번엔 건너뛰기" 로 skip 한 step 카운트 (0~3).
      // R4 보호: userId / 자녀 정보 0건 — 누적 시간 + 카운트만.
      name: "onboarding_completed";
      properties: {
        totalDurationMs: number;
        skippedSteps: number;
      };
    }
  | {
      // 사용자가 "다시 보지 않기" 클릭 시 1회 — markOnboardingSkipped 호출 직후.
      // atStep: skip 시점의 step 번호 (어느 단계 이탈이 가장 많은지 funnel 분석).
      // R4 보호: userId / 자녀 정보 0건 — step 번호만.
      name: "onboarding_skipped";
      properties: {
        atStep: 1 | 2 | 3 | 4;
      };
    }
  // === FR-Q-013 후속 — 선생님 수기 오프라인 entry 입력 텔레메트리 ===
  | {
      // submitOfflineEntry Server Action 의 createOfflineEntry 성공 직후 1회.
      // R4 보호: userId 는 server-side 텔레메트리 백엔드 자동 해시 가정 (자녀 식별 정보 직접 노출 X).
      // noteLength: note 본문 글자 수 — 텍스트 자체 노출 0, 길이 메트릭만.
      // kind: 'practice' | 'observation' | 'note' enum-like (Server Action Zod 강제).
      name: "offline_entry_created";
      properties: {
        userId: string;
        kind: string;
        noteLength: number;
      };
    }
  // === FR-Q-TEACHER + FR-C-017+ — 학부모 알림장 일괄 발송 (반 단위 fan-out) ===
  | {
      // sendClassroomCushionNotes Server Action 종료 직후 1회 (Server-side console.log telemetry).
      // R4 보호: parentEmail / userId / 자녀 이름 절대 노출 금지 — classId + 카운트만.
      // attempted / sent / skipped 합계가 학생 fan-out 총 처리량 (errors 는 별도 — task 분기).
      name: "classroom_cushion_batch_sent";
      properties: {
        classId: string;
        attempted: number;
        sent: number;
        skipped: number;
      };
    }
  // === FR-Q-WEEKLY-REVIEW — 부모용 주간 리뷰 페이지 mount (retention surface) ===
  | {
      // /weekly-review 페이지 mount 직후 client beacon 이 1회 발송 (Strict Mode 가드).
      // R4 보호: userId 는 분석 백엔드에서 자동 해시 가정 — 자녀 이름/email 절대 노출 금지.
      // hasData=false 인 경우 (가입 직후/cron 미실행) 도 발송 — empty state CVR 측정용.
      // wAurAchieved 는 hasData=false 시 항상 false (loader 정책).
      name: "weekly_review_viewed";
      properties: {
        userId: string;
        hasData: boolean;
        wAurAchieved: boolean;
        weekNumber: number;
      };
    }
  // === FR-NAV — 메인 navigation 항목 클릭 텔레메트리 (role 별 동선 분석) ===
  | {
      // MainNavClient 에서 메뉴 항목 (Link) 클릭 직후 1회.
      // destination: 이동 대상 pathname (예: "/weekly-review", "/admin/principal").
      // role: 클릭 시점의 사용자 role — anonymous / parent / teacher / principal / expert / admin.
      // R4 보호: userId / email / 자녀 식별 정보 0건 — destination + role label 만.
      // KPI 활용: role 별 메뉴 클릭 분포 → 어떤 동선이 부족한지 / B2B 운영자 진입 동선 검증.
      name: "nav_clicked";
      properties: {
        destination: string;
        role: "anonymous" | "parent" | "teacher" | "principal" | "expert" | "admin";
      };
    }
  // === FR-C-PARENT-SETTINGS — /settings/child 자녀 프로필 변경 저장 직후 ===
  | {
      // updateChildProfile Server Action 성공 직후 호출 측 (ChildProfileForm) 이 1회 발송.
      // R4 보호: userId 는 분석 백엔드 자동 해시 가정 — 자녀 식별 정보 직접 노출 X.
      //   raw childAgeMonths 값 / 음소 라벨 직접 노출 X — 변경된 필드 _이름_ 만 (boolean 분기).
      // changedFields: 사용자가 실제로 변경한 필드 (no-op 호출은 빈 배열 가능 — 분석 측에서 분기).
      name: "child_profile_updated";
      properties: {
        userId: string;
        changedFields: ("childAgeMonths" | "preferredPhonemes")[];
      };
    }
  // === FR-C-ACCOUNT — /settings/account 본인 데이터 JSON 다운로드 성공 직후 ===
  | {
      // DataExportButton 이 /api/account/export 응답 200 직후 1회 발송.
      // R4 보호: userId 는 분석 백엔드 자동 해시 가정.
      //   recordCounts 는 source 별 row 카운트 (Server Action 결과의 recordCounts 매핑) —
      //   binary download 응답 분리 정책상 client 가 정확한 카운트 회수 어려우면 0 폴백.
      name: "user_data_exported";
      properties: {
        userId: string;
        recordCounts: {
          evaluationResults: number;
          missionSessions: number;
          rewards: number;
        };
      };
    }
  // === FR-C-ACCOUNT — /settings/account 계정 삭제 성공 직후 (DB delete 직후, redirect 직전) ===
  | {
      // AccountDeleteButton 이 deleteAccount Server Action success 직후 1회 발송.
      // R4 보호: userId 는 분석 백엔드 자동 해시 가정 (삭제 직후 캡처된 값).
      //   role 은 Server Action 이 사전 조회한 값 — User row 부재 분기 (멱등) 는 "unknown".
      name: "account_deleted";
      properties: {
        userId: string;
        role: string;
      };
    }
  // === FR-C-ACCOUNT — /settings/account 이메일 변경 요청 (Supabase confirmation 발송) ===
  | {
      // EmailChangeForm 이 requestEmailChange Server Action success 직후 1회 발송.
      // R4 보호: userId 는 server-side 텔레메트리에서 분석 백엔드 자동 해시 가정.
      //   _이메일 본문_ (현재/새 주소) 절대 노출 금지 — userId 만.
      //   본 이벤트는 "변경 요청" 시점 — 사용자가 새 이메일 confirmation 클릭하기 전.
      name: "email_change_requested";
      properties: {
        userId: string;
      };
    }
  // === FR-C-ACCOUNT — /settings/account 비밀번호 reset 링크 발송 요청 ===
  | {
      // RequestPasswordResetButton 이 requestPasswordReset Server Action success 직후 1회 발송.
      // R4 보호: userId 는 server-side 텔레메트리 백엔드 자동 해시 가정.
      //   이메일 주소 절대 노출 금지 — 사용자 식별은 userId 만.
      name: "password_reset_requested";
      properties: {
        userId: string;
      };
    }
  // === FR-NAV-SEARCH — 글로벌 검색 box (admin/teacher/principal 운영자 통합 검색) ===
  | {
      // GlobalSearch client component 가 fetch 응답을 받은 직후 1회 (debounce 300ms 종료 + API 200 후).
      // queryLength: 사용자가 입력한 query 길이 (검색 ergonomics 분석용 — 짧은/긴 query 분포).
      // resultCount: API 가 반환한 results 총 건수 (kind 합산, 최대 60).
      // role: 검색 시점의 운영자 role — admin / principal / teacher 중 하나.
      // R4 보호: query 본문 / userId / 결과 항목 (자녀 이메일/반 이름) 절대 노출 금지 — 메트릭만.
      name: "global_search_executed";
      properties: {
        queryLength: number;
        resultCount: number;
        role: string;
      };
    };

export type AnalyticsEventName = AnalyticsEvent["name"];
