---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Security] SEC-005: PIPA §22-6 만 14세 미만 부모 대리 동의 — UI + Server Action + DB 영속"
labels: 'phase:p0, mode:active, domain:sec, epic:pipa, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: SEC-005
- **Epic / Story**: PIPA §22-6 부모 대리 동의 (V07 핵심 신규)
- **Phase**: 🟢 P0 → ✅ Done (`f976388` + `f9cf258`)
- **Mode**: 명세대로 (PIPA §22-6 법적 강행 규정)
- **Discope 적용**: 해당 없음
- **목적**: 영유아 (만 14세 미만) 의 개인정보 처리 시 보호자(부모) 대리 동의를 UI + Server Action + DB column 의 3 레이어로 영속화. PIPA §22-6 + REQ-NF-025 위반 시 행정처분 + 형사처벌 risk → 핵심 컴플라이언스 가드 5중 가드 중 1축.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.3 PIPA §22-6 만 14세 미만 부모 대리 동의 의무
  - REQ-NF-025 (부모 대리 동의 영속)
  - §6.1.1 User schema — `pipaUnderageConsentAt` DateTime?
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-B SEC-005
- **Commits**:
  - `f976388` — PIPA §22-6 인증 user (Server Action 영속)
  - `f9cf258` — 익명 user PIPA 적용 (localStorage marker)

## ✅ Task Breakdown
- [x] DB-015 의존: `User.pipaUnderageConsentAt DateTime?` 컬럼 추가 (`20260527140000_add_user_pipa_consent_columns`)
- [x] `PrivacyConsentForm` UI 컴포넌트 — 만 14세 미만 자녀 대리 동의 inline 체크박스
- [x] `savePrivacyConsent` Server Action (API-013) — `pipaUnderageConsentAt = now()` 영속
- [x] 익명 user: `useAnonymousConsent` hook + `localStorage.pipa_consented_at` (FR-C-020)
- [x] `DiagnosisForm` 의 "결과 확인" 버튼 — 미동의 시 `disabled` (`f9cf258`)
- [x] `analyzeDiagnosis` Server Action 가드 — 미동의 인증 user 차단 (FR-C-022 2층)
- [x] `/settings/privacy-consent` 페이지 — 동의 일시 확인 + 재동의 / 철회 UI

## 🧪 Acceptance Criteria
**Scenario 1: 신규 인증 user 동의 흐름 (REQ-NF-025)**
- **Given**: 인증 user 로그인 + `pipaUnderageConsentAt = NULL`
- **When**: 진단 페이지 진입
- **Then**: `ConsentRedirectGate` 가 `/settings/privacy-consent` 로 redirect (1층 가드)

**Scenario 2: PIPA 동의 영속 검증 (`f976388`)**
- **Given**: `/settings/privacy-consent` 에서 체크박스 + 제출
- **When**: `savePrivacyConsent` Server Action 호출
- **Then**: `User.pipaUnderageConsentAt = now()` UPDATE + audit_log INSERT + redirect to original page

**Scenario 3: 익명 user localStorage marker (`f9cf258`)**
- **Given**: 익명 user (인증 미사용) + localStorage 미설정
- **When**: 진단 폼의 동의 체크박스 + 제출
- **Then**: `localStorage.pipa_consented_at = ISO timestamp` + 진단 진행 가능

**Scenario 4: 미동의 시 차단 (5층 가드)**
- **Given**: 익명 user + localStorage marker 부재
- **When**: 진단 폼의 "결과 확인" 버튼
- **Then**: `disabled` 상태 (클릭 불가) + 안내 문구 표시

**Scenario 5: 5/27 검증 사례 (Studio SQL 재시도)**
- **Given**: 1차 migration 적용 보고했으나 컬럼 미존재
- **When**: 진단 SQL 로 컬럼 확인
- **Then**: 1차 false → 2차 재시도 → true 확정 (INFRA-008 패턴 학습)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-025**: PIPA §22-6 부모 대리 동의 영속 (DB column + audit_log)
- **법적 강행 규정**: 위반 시 행정처분 + 형사처벌 risk
- **횡단 제약**:
  - [x] R4 개인정보: 만 14세 미만 영유아 보호 = R4 의 핵심 메커니즘
  - [x] CON-04 금칙어: 동의 UI 카피에서 "치료/진단/장애" 사용 금지 (`발음 발달 확인`)
  - [x] CON-05 5중 가드: 본 SEC-005 = 1축
- **익명 vs 인증**: 두 path 모두 영속 (인증=DB, 익명=localStorage marker)

## 🏁 Definition of Done
- [x] DB-015 의 `pipaUnderageConsentAt` 컬럼 prod 적용 (INFRA-008)
- [x] `savePrivacyConsent` Server Action 단위 테스트 통과
- [x] `PrivacyConsentForm` 컴포넌트 렌더링 + 체크박스 상호작용 e2e
- [x] 익명 user `useAnonymousConsent` hook localStorage 영속 검증
- [x] `analyzeDiagnosis` 미동의 차단 검증 (FR-C-022)
- [x] PR `f976388` + `f9cf258` 본문에 REQ-NF-025 매핑
- [x] TEST-015 consent-flow.spec.ts 20/20 PASS

## 🚧 Dependencies & Blockers
- **Depends on**: DB-015 (User PIPA 컬럼), INFRA-008 (Studio SQL 적용), FR-C-020 (익명 hook), FR-C-021 (PrivacyConsentForm)
- **Blocks**: SEC-009 (5중 가드 통합), TEST-015 (E2E consent-flow), OPS-004 (`/privacy` 정식 교체 시 약관 매핑)
- **Discope 영향**: 해당 없음
