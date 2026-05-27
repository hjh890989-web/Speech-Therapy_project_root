---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-021: PrivacyConsentForm + DiagnosisForm inline 체크박스 (PIPA UI)"
labels: 'phase:p0, mode:active, domain:fr-c, epic:compliance, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-021
- **Epic / Story**: Compliance / PIPA UI (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 인증 + 익명 user 의 PIPA 동의 UI 단일화. `PrivacyConsentForm` (`/settings/privacy-consent` + onboarding Step2) + `DiagnosisForm` (`/diagnose` 페이지 inline) 의 두 체크박스 + "결과 확인" / "동의 저장" 버튼 disabled 상태 제어. PIPA §22-6 + §17 카피 표준 (§12.2.2) 노출.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.2.2 동의 항목 (UI 카피 표준)
  - §12.4.1 1층 — UI 가드 진입점
  - REQ-NF-025 (PIPA §22-6) / REQ-NF-026 (PIPA §17)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-021

## ✅ Task Breakdown
- [x] `components/consent/PrivacyConsentForm.tsx` 작성 (`'use client'`)
  - 두 체크박스 + "동의 저장" 버튼 (둘 다 ✅ 시만 enabled)
  - 인증 user: `savePrivacyConsent` Server Action 호출 (API-013)
  - onboarding Step2 + `/settings/privacy-consent` 두 곳에서 재사용
- [x] `components/diagnose/DiagnosisForm.tsx` 의 inline 두 체크박스 (익명 user 진입점)
  - `useAnonymousConsent` (FR-C-020) 와 binding
  - "결과 확인" 버튼 — 두 체크박스 + transcript 입력 모두 충족 시만 enabled
- [x] PIPA §22-6 카피 (§12.2.2 표준):
  - "[필수] 만 14세 미만 자녀의 개인정보 처리에 동의합니다 (PIPA §22조 6항). 자녀 (만 2~7세) 의 발화 텍스트 (transcript), 월령, 발달 점수 등 개인정보를 Speech-Therapy 가 발달 가이드 목적으로 처리하는 데 법정대리인 (부모) 의 동의가 필요해요."
- [x] PIPA §17 카피 (§12.2.2 표준):
  - "[필수] 개인정보 국외 이전에 동의합니다 (PIPA §17조). 발화 텍스트와 발달 점수가 외부 AI 서비스로 이전돼요: Google Cloud Speech (미국, 음성 → 텍스트) + Google AI Studio Gemini (미국 / 글로벌, 안내 문구 생성). 보존 기간: 각 서비스 정책에 따름. 동의 철회는 본 페이지 또는 계정 삭제로 가능."
- [x] 동의 철회 토글 — `/settings/privacy-consent` 에서 "동의 철회" 버튼 (GDPR 잊혀질 권리)
- [x] 카피 자체 CON-04 의료 금칙어 무위반 검증 ("치료/진단/장애" 0건)

## 🧪 Acceptance Criteria
**Scenario 1: 두 체크박스 미체크 시 버튼 disabled (REQ-NF-025/026)**
- **Given**: PrivacyConsentForm 초기 상태 (둘 다 unchecked)
- **When**: 사용자 페이지 진입
- **Then**: "동의 저장" 버튼 disabled

**Scenario 2: 한 체크박스만 ✅ 시 버튼 disabled**
- **Given**: PIPA §22-6 만 ✅
- **When**: 사용자 클릭 시도
- **Then**: 버튼 disabled — 두 동의 모두 필수

**Scenario 3: 두 체크박스 ✅ 시 버튼 enabled + Server Action 호출**
- **Given**: 두 체크박스 ✅ + 인증 user
- **When**: "동의 저장" 클릭
- **Then**: `savePrivacyConsent({pipaUnderageConsent: true, overseasTransferConsent: true})` 호출 → User UPDATE

**Scenario 4: 익명 user — /diagnose inline 체크박스 + transcript 입력 (5층 가드 입력)**
- **Given**: 익명 user `/diagnose` 페이지
- **When**: 두 체크박스 ✅ + transcript 입력
- **Then**: "결과 확인" 버튼 enabled → `analyzeDiagnosis(input)` 익명 분기 호출

**Scenario 5: CON-04 금칙어 무위반 자동 검증**
- **Given**: 본 컴포넌트의 모든 카피
- **When**: 정규식 스캔 `/(치료|진단|장애|환자)/`
- **Then**: 0건 — pre-commit + eslint + E2E 검증 통과

**Scenario 6: 동의 철회 (GDPR)**
- **Given**: 인증 user `/settings/privacy-consent` 에 진입 (이미 동의 상태)
- **When**: "동의 철회" 버튼 클릭
- **Then**: `savePrivacyConsent({revoke: true})` 호출 → User 두 컬럼 NULL UPDATE

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-025/026**: PIPA 두 동의 UI source
- **CON-04**: 카피 자체 의료 금칙어 무위반 (pre-commit + eslint)
- **횡단 제약**:
  - [x] R7 PIPA 위반: 본 UI 가 동의 1차 진입점
  - [x] CON-04: 카피 자체 "치료/진단/장애" 0건
  - [x] R4 개인정보: 자녀 이름 미수집 — transcript + 월령 + 점수만
- **접근성**: `<label htmlFor>` + 키보드 포커스 + screen reader 정합

## 🏁 Definition of Done
- [x] PrivacyConsentForm + DiagnosisForm 6 scenario 통과
- [x] CON-04 금칙어 자동 검증 통과
- [x] `tsc --strict` 0 errors
- [x] E2E `consent-flow.spec.ts` 20/20 PASS (인증 + 익명 + desktop + mobile)
- [x] 키보드 접근성 검증 (Tab + Enter)

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-020 (useAnonymousConsent), API-013 (savePrivacyConsent), DB-015 (User PIPA 컬럼)
- **Blocks**: FR-C-022 (analyzeDiagnosis 2+5층 — 본 UI 의 입력), FR-Q-016 (onboarding wizard Step2), FR-Q-017 (`/settings/privacy-consent`), TEST-015 (consent-flow E2E)
- **Discope 영향**: 해당 없음
