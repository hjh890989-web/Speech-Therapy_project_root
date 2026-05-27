---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-016: Onboarding wizard 4 step (PIPA 동의 Step2 포함)"
labels: 'phase:p0, mode:active, domain:fr-q, epic:onboarding, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-016
- **Epic / Story**: Onboarding (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 인증 user 첫 진입 시 wizard 4 step — 환영 / 자녀 정보 + PIPA 동의 / calibration / 완료. PIPA §22-6 + §17 의 인증 user 진입점.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.5.5 — `/onboarding` wizard 4 step
  - §12.2.1 인증 user 흐름 (onboarding Step2)
  - REQ-NF-025/026 (PIPA 두 동의)
  - REQ-FUNC-039 (자녀 정보)

## ✅ Task Breakdown
- [x] `/onboarding/page.tsx` — wizard container (URL `?step=1~4`)
- [x] Step 1 — 환영 + 서비스 소개 + MedicalDisclaimerFooter
- [x] Step 2 — 자녀 정보 (월령) + **PIPA 두 체크박스 inline** (PrivacyConsentForm)
  - `[필수] PIPA §22-6 동의` + `[필수] PIPA §17 국외 이전 동의`
  - 두 체크박스 ✅ 후만 "다음" 버튼 활성
- [x] Step 3 — calibration (preferredPhonemes 선택 — 0~5개)
- [x] Step 4 — 완료 + `markOnboardingCompletedInDb()` 호출 + `/diagnose` redirect
- [x] ConsentRedirectGate 제외 (onboarding 자체 동의 흐름)

## 🧪 Acceptance Criteria
**Scenario 1: 전체 wizard 흐름 (REQ-NF-025/026 + REQ-FUNC-039)**
- **Given**: 신규 인증 user
- **When**: `/onboarding` 진입 → Step1 → Step2 (두 ✅ + 자녀 정보) → Step3 → Step4
- **Then**: User UPDATE — pipaUnderageConsentAt + overseasTransferConsentAt + childAgeMonths + preferredPhonemes + onboardingCompletedAt 모두 갱신

**Scenario 2: Step2 PIPA 미체크 시 "다음" disabled**
- **Given**: Step2 진입
- **When**: 1개 체크박스만 ✅
- **Then**: "다음" 버튼 disabled + "두 동의 모두 필요" 안내

**Scenario 3: Step2 자녀 정보 미입력 시 disabled**
- **Given**: 두 ✅ + 월령 미입력
- **When**: "다음" 버튼
- **Then**: disabled + 월령 input 강조

**Scenario 4: onboarding 완료 → /diagnose redirect**
- **Given**: Step4 완료
- **When**: 자동 redirect
- **Then**: `/diagnose` 진입 (ConsentRedirectGate 통과 — PIPA 동의 확보됨)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-025/026**: PIPA 두 동의 의 인증 user 진입점
- **CON-04**: wizard 카피 무위반 (TEST-016 검증)
- **횡단 제약**:
  - [x] CON-04: 모든 step 카피 검증
  - [x] R4 개인정보: 자녀 이름 미저장, 월령만
  - [x] R7 PIPA 위반: Step2 의 두 ✅ 가 1차 차단 layer

## 🏁 Definition of Done
- [x] 4 step 모두 정상 렌더
- [x] Step2 두 ✅ 필수 검증
- [x] onboarding 완료 후 User 의 7 컬럼 모두 UPDATE 확인
- [x] CON-04 무위반 (TEST-016 통과)
- [x] `tsc --strict` 0 errors
- [x] `f976388` commit 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-013 (savePrivacyConsent + saveChildInfo + markOnboardingCompletedInDb), API-016 (Auth), FR-C-021 (PrivacyConsentForm)
- **Blocks**: ConsentRedirectGate (인증 user 흐름의 진입점)
- **Discope 영향**: 해당 없음
