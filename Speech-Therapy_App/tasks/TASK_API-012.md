---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[External] API-012: 카카오/키즈노트 → Resend 이메일 + 클립보드 폴백 (Replace 67-D1·D8)"
labels: 'phase:p2, mode:replace, domain:api, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-012
- **Epic / Story**: Foundation 외부 API / 알림 인프라
- **Phase**: 🔴 P2
- **Mode**: 🔵 Replace (67-D1 + D8 적용)
- **Discope 적용**: 67-D1 (카카오 알림톡 미연동), D8 (키즈노트 미연동)
- **목적**: SRS의 카카오/키즈노트 외부 API 클라이언트를 미구현하고 **Resend 이메일 + 클립보드 복사 + Web Share API**로 모든 알림 시나리오를 대체. 외부 종속성·심사 부담 0 + 정책 변경 영향 0 (R5 회피).

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.3 External Systems (카카오톡 알림톡, 키즈노트 API)
  - REQ-FUNC-030 (성과 뱃지 카카오 발송)
  - REQ-FUNC-058 (알림장 키즈노트 발송)
  - REQ-FUNC-059 (전자서명 카카오 발송)
  - R5 (키즈노트 정책 변경 리스크)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-2 API-012 (Replace)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §1.1 67-D1, §1.2 [추가 D8]

## ✅ Task Breakdown
- [ ] **카카오/키즈노트 SDK 미설치** (Replace 핵심)
- [ ] `lib/notifications/resend.ts` Resend 어댑터:
  - `npm i resend` 설치
  - `sendEmail({to, subject, html, replyTo})` 표준 인터페이스
  - 템플릿: `lib/notifications/templates/`
    - `consent-signature.tsx` (전자서명 링크)
    - `consent-signed-confirmation.tsx` (서명 완료 확인)
    - `hitl-review-completed.tsx` (전문가 검토 완료)
    - `weekly-report-ready.tsx` (주간 리포트 준비)
- [ ] `lib/notifications/clipboard.ts` 클라이언트 측 헬퍼:
  - `generateClipboardText({type, data})` — 카카오/키즈노트 메시지를 plain text 또는 markdown으로
  - 사용자가 직접 복사 후 카카오톡/키즈노트에 붙여넣기
- [ ] `lib/notifications/web-share.ts`:
  - Web Share API 래퍼 (FR-C-012 활용)
- [ ] 통일된 알림 인터페이스 `lib/notifications/index.ts`:
  - `notify({channel: 'email' | 'clipboard' | 'web-share', recipient, payload})`
  - 채널별 분기 처리
- [ ] **R5 보호 명시**:
  - 카카오·키즈노트 정책 변경 시 영향 0건
  - SDK 의존성 0건 검증 CI
- [ ] Slack 웹훅 어댑터 (lib/notifications/slack.ts):
  - 운영용 Slack DM/채널 메시지 (이미 API-005에서 사용 중 — 통합 정리)

## 🧪 Acceptance Criteria
**Scenario 1: Resend 이메일 발송**
- **Given**: 동의서 서명 완료
- **When**: `notify({channel: 'email', ...})`
- **Then**: Resend API 1회 호출, 이메일 1건 도달

**Scenario 2: 클립보드 텍스트 생성 (D8)**
- **Given**: 알림장 초안
- **When**: `generateClipboardText({type: 'b2b-notification', data})`
- **Then**: Plain text 반환, 자녀 본명 0건

**Scenario 3: 카카오 의존성 0 (67-D1)**
- **Given**: package.json
- **When**: 카카오 SDK 검색
- **Then**: 의존성 0건

**Scenario 4: 키즈노트 의존성 0 (D8)**
- **Given**: package.json
- **When**: 키즈노트 SDK 검색
- **Then**: 의존성 0건

**Scenario 5: 통일 인터페이스 동작**
- **Given**: 4개 채널 (email, clipboard, web-share, slack)
- **When**: `notify({channel, ...})`
- **Then**: 각 채널 헬퍼로 라우팅

**Scenario 6: R5 보호 — 정책 변경 영향 0**
- **Given**: 가상의 카카오 정책 변경
- **When**: 본 태스크의 어댑터
- **Then**: 영향 0건 (의존성 0이므로)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-030/058/059**: 외부 발송 → Replace로 단순화
- **R5**: 키즈노트 정책 변경 리스크 → 의존성 0으로 완화
- **횡단 제약**:
  - [ ] **카카오/키즈노트 의존성 0 강제** (CI 검증)
  - [ ] R4 — 이메일 페이로드에 자녀 식별 정보 미포함
  - [ ] CON-04 — 모든 메시지 텍스트 금칙어 0건
- **G2 비용 가드**: Resend Free 100/일 (3,000/월 무료)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Resend 이메일 1회 발송 검증
- [ ] 4종 채널 어댑터 모두 동작
- [ ] 카카오/키즈노트 의존성 0 CI 검증
- [ ] `tsc --strict` 0 errors
- [ ] 67-D1 + D8 적용 사유 README 명시
- [ ] PR 본문에 REQ-FUNC-030/058/059 + R5 + 67-D1 + D8 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-001 (RESEND_API_KEY 환경 변수)
- **Blocks**: API-005/006 (Slack 통합), API-008 (Resend 이메일), FR-C-012/017/018 (모든 알림 시나리오)
- **Discope 영향**: 67-D1 + D8 — 카카오/키즈노트 미연동. Resend + 클립보드 + Web Share + Slack 4종 채널로 단순화. B2B 5건 + 외부 제휴 가능 시 점진 도입
