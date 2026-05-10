---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[INFRA] INFRA-005: Vercel Analytics + Web Vitals + 이벤트 트래킹 어댑터"
labels: 'phase:p1, mode:active, domain:infra, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: INFRA-005
- **Epic / Story**: Foundation 분석/모니터링
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Vercel Analytics + Speed Insights(Web Vitals) 통합 + 사용자 정의 이벤트 어댑터(`trackEvent`)로 EXP-1/2/4 검증 + 퍼널·코호트 분석 인프라 구축. 모든 FR-Q/FR-C가 본 어댑터를 통해 텔레메트리 발송.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-045 (시뮬레이션 클릭 트래킹)
  - REQ-NF-020 (퍼널 전환 대시보드)
  - §6.6 EXP-1~4 검증
- **Task 강화판**: §3-7 INFRA-005

## ✅ Task Breakdown
- [ ] `npm i @vercel/analytics @vercel/speed-insights` 설치
- [ ] `app/layout.tsx` 통합:
  - `<Analytics />` (페이지 뷰 자동)
  - `<SpeedInsights />` (Web Vitals 자동)
- [ ] `lib/analytics.ts` 어댑터 작성:
  - `trackEvent(name, properties?)` — 이벤트 발송 단일 진입점
  - 환경별 분리: Production만 실제 발송, dev/preview는 console.log만
  - PII 마스킹 — userId, email 자동 해싱
- [ ] 표준 이벤트 카탈로그 정의 (`lib/events.ts`):
  - 진단 퍼널: `diagnosis_started`, `diagnosis_completed`, `diagnosis_failed`
  - 보상: `reward_granted`, `reward_milestone`
  - HITL: `hitl_auto_enqueued`, `hitl_completed`
  - 미션: `mission_started`, `mission_completed`, `mission_dropped_off`
  - STT: `stt_first_attempt_success`, `stt_retry_success`, `stt_retry_failed`
  - 침묵: `silence_detected`, `silence_intervention_clicked`
  - 예측: `prediction_calculated`, `prediction_simulation_changed`, `prediction_cta_clicked`
  - 공유: `share_button_clicked`, `share_method`, `share_link_visited`
  - 빈 상태: `empty_state_viewed`, `empty_state_cta_clicked`
  - PDF: `pdf_downloaded`
  - 네트워크: `network_error_during_mission`, `manual_retry_clicked`
  - 난이도: `difficulty_level_down/up`, `phoneme_switched`
  - 센터: `center_record_added`, `timeline_viewed`
- [ ] 코호트 분석 KPI 대시보드:
  - Vercel Analytics Custom Dashboard (또는 별도 BI 도구 — Posthog Free 검토)
  - EXP-1: CVR ≥ 8% (코칭 톤 vs DTx 톤 A/B)
  - EXP-2: M3 리텐션 ≥ 40% (예측 시뮬 클릭 코호트)
  - EXP-4: 결제 시작률 +5%p (앵커링 가격)
- [ ] `next.config.js`에 `experimental.instrumentationHook` 활성화 (필요 시)

## 🧪 Acceptance Criteria
**Scenario 1: Vercel Analytics 활성화 (REQ-NF-020)**
- **Given**: 페이지 진입
- **When**: Vercel Dashboard 확인
- **Then**: Pageview 1건 기록

**Scenario 2: Web Vitals 자동 수집**
- **Given**: 5분 사용
- **When**: Speed Insights 대시보드
- **Then**: LCP, FID, CLS 데이터 수집됨

**Scenario 3: trackEvent 어댑터 동작**
- **Given**: dev 환경
- **When**: `trackEvent('diagnosis_started', {...})`
- **Then**: console.log 출력, 실제 발송 0건

**Scenario 4: Production 발송**
- **Given**: Production 환경
- **When**: 동일 호출
- **Then**: Vercel Analytics에 이벤트 1건 기록

**Scenario 5: PII 마스킹**
- **Given**: properties에 email 포함
- **When**: trackEvent 호출
- **Then**: 발송 페이로드에 email 해싱 처리됨

**Scenario 6: 이벤트 카탈로그 누락 검증**
- **Given**: 모든 FR-Q/FR-C 코드
- **When**: 정적 분석
- **Then**: trackEvent 호출 시 카탈로그 외 이름 사용 0건 (TS 타입으로 강제)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-020**: 일간 CVR ±20% 시 Alert
- **REQ-FUNC-045**: 트래킹 발송 검증
- **횡단 제약**:
  - [ ] **PII 마스킹** — userId, email 등 식별자 해싱
  - [ ] R4 — 자녀 식별 정보 이벤트 페이로드 미포함
  - [ ] 카탈로그 강제 — TS 타입으로 이벤트 이름 통일
- **G2 비용 가드**: Vercel Analytics Free 100K 이벤트/월 (Pro 필요 시 검토)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 이벤트 카탈로그 30+ 정의
- [ ] PII 마스킹 단위 테스트
- [ ] Web Vitals 대시보드 활성
- [ ] `tsc --strict` 0 errors (이벤트 타입 강제)
- [ ] PR 본문에 REQ-NF-020 + REQ-FUNC-045 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-001 (Vercel 배포)
- **Blocks**: 모든 FR-Q/FR-C 텔레메트리 (FR-C-003/006/008/011/012, FR-Q-005/006/012/013), MON-001/002/003 (대시보드)
- **Discope 영향**: 해당 없음
