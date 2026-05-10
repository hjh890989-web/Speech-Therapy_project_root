---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Monitoring] MON-002: STT/Gemini 에러율 + 외부 API Fallback Alert"
labels: 'phase:p1, mode:active, domain:mon, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: MON-002
- **Epic / Story**: Foundation 운영 모니터링 / 외부 의존성
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: STT(Web Speech API + Whisper Fallback)와 Gemini API의 에러율을 모니터링 + 1시간 내 5% 초과 시 Slack Alert + 자동 Fallback 트리거. 외부 의존성 장애를 사용자 영향 전에 감지.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-NF-021 (STT 500 에러율 5분 내 3% 초과 → Slack Alert)
  - REQ-NF-024 (외부 API 1h 내 5% 초과 → Fallback)
- **Task 강화판**: §3-7 MON-002

## ✅ Task Breakdown
- [ ] 에러 메트릭 수집:
  - STT 에러: `stt_error` 이벤트 (FR-C-003 발송)
  - Gemini 에러: `gemini_error` 이벤트 (API-011 발송)
  - 카카오/키즈노트 에러: 67-D1·D8로 미연동, 본 태스크에선 Web Share API 에러만
- [ ] 에러율 계산:
  - 5분 윈도우 — STT (REQ-NF-021)
  - 1시간 윈도우 — Gemini, 외부 API (REQ-NF-024)
- [ ] Vercel Cron 또는 Vercel KV 기반 모니터링:
  - 5분 주기로 STT 에러율 검사
  - 1시간 주기로 Gemini 에러율 검사
- [ ] Slack Alert:
  - STT 5분 내 3% 초과 → 경고
  - Gemini 1h 내 5% 초과 → 경고 + Fallback 자동 전환 (D4 — `AI_PROVIDER` 환경 변수 동적 변경 또는 사전 정의된 폴백 경로)
- [ ] Fallback 자동 전환 (REQ-NF-024):
  - Gemini 5% 초과 시 OpenAI/Anthropic 모드로 전환 (API-011의 D4 인터페이스 활용)
  - 자동 전환 시 admin Slack 알림
  - 1시간 후 자동 재시도 — 정상화 시 원래대로 복구
- [ ] 에러 카탈로그 (`lib/error-catalog.ts`):
  - 에러 코드 표준화 (STT_TIMEOUT, GEMINI_RATE_LIMITED 등)
  - Vercel Logs 검색 친화

## 🧪 Acceptance Criteria
**Scenario 1: STT 5분 내 3% 초과 Alert (REQ-NF-021)**
- **Given**: 5분 내 100건 호출 중 4건 에러
- **When**: 모니터링 Cron
- **Then**: Slack 알림 1건

**Scenario 2: Gemini 1h 내 5% 초과 Fallback (REQ-NF-024)**
- **Given**: 1시간 내 100건 중 6건 에러
- **When**: 모니터링
- **Then**: AI_PROVIDER → OpenAI 자동 전환 + admin 알림

**Scenario 3: 정상화 자동 복구**
- **Given**: Fallback 모드 + 1시간 후 Gemini 정상화 검증
- **When**: 자동 재시도
- **Then**: AI_PROVIDER → Gemini 복구

**Scenario 4: 중복 Alert 방지**
- **Given**: 임계 초과 지속 30분
- **When**: 5분마다 검사
- **Then**: Slack 알림 1회만 (재발화 방지 플래그)

**Scenario 5: 에러 카탈로그 일관성**
- **Given**: 모든 에러 코드
- **When**: 정적 분석
- **Then**: lib/error-catalog.ts에 등록 안 된 코드 0건

**Scenario 6: 격리 — Production만 실 알림**
- **Given**: dev/preview 환경
- **When**: 임계 초과
- **Then**: console.log만, Slack 미발송

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-021/024**: 임계 알림
- **D4 검증**: Gemini Fallback 인터페이스 자동 전환 동작 확인
- **횡단 제약**:
  - [ ] CRON_SECRET 인증
  - [ ] 격리 — Production만 실 발송

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] STT 임계 1회 Alert 발송 검증
- [ ] Gemini Fallback 자동 전환 시뮬 통과
- [ ] 에러 카탈로그 등록
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-NF-021/024 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-005 (Analytics 이벤트), INFRA-002 (Cron), API-011 (Gemini Fallback)
- **Blocks**: P1 합격 게이트
- **Discope 영향**: 해당 없음 (D4 검증을 자동 전환 시뮬로 수행)
