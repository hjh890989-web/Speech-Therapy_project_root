---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Server Action] API-013: Onboarding 3종 (savePrivacyConsent + saveChildInfo + markOnboardingCompletedInDb)"
labels: 'phase:p0, mode:active, domain:api, epic:compliance, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-013
- **Epic / Story**: Compliance / Onboarding (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Onboarding wizard Step2 의 PIPA 두 동의 일시 저장 + 자녀 정보 저장 + 완료 마킹의 3 Server Action. PIPA §22-6 + §17 의 데이터 layer 진입점.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.5.1 Server Actions — savePrivacyConsent / saveChildInfo / markOnboardingCompletedInDb
  - §12.2 PIPA §17 흐름 (인증 user — onboarding Step2)
  - REQ-NF-025 (PIPA §22-6) / REQ-NF-026 (PIPA §17)
  - REQ-FUNC-039 (자녀 정보 저장)

## ✅ Task Breakdown
- [x] `app/actions/privacy-consent.ts` — `savePrivacyConsent(input)` Server Action:
  - Zod 입력: `{ pipaUnderageConsent: boolean, overseasTransferConsent: boolean }`
  - 두 boolean 모두 `true` 검증 — 미체크 시 throw `ConsentRequiredError`
  - `withActor(userId, () => prisma.user.update({data: {pipaUnderageConsentAt: new Date(), overseasTransferConsentAt: new Date()}}))`
  - 동의 철회 분기 — `{ revoke: true }` 입력 시 두 컬럼 NULL UPDATE
- [x] `app/actions/save-child-info.ts` — `saveChildInfo(input)` Server Action:
  - Zod: `{ childAgeMonths: number, preferredPhonemes: string[] }`
  - PIPA 가드 미적용 — onboarding 동의 _직전_ 호출 의도 (§12.4.6 가드 매트릭스)
  - User UPDATE
- [x] `app/actions/onboarding.ts` — `markOnboardingCompletedInDb()` Server Action:
  - `prisma.user.update({data: {onboardingCompletedAt: new Date()}})`
  - timestamp only
- [x] Zod 스키마 `lib/schemas/onboarding.ts` 공통화

## 🧪 Acceptance Criteria
**Scenario 1: PIPA 두 동의 저장 (REQ-NF-025/026)**
- **Given**: 사용자 onboarding Step2 에서 두 체크박스 ✅
- **When**: `savePrivacyConsent({pipaUnderageConsent: true, overseasTransferConsent: true})`
- **Then**: User 두 컬럼 now UPDATE + audit_log INSERT

**Scenario 2: 미동의 — ConsentRequiredError throw**
- **Given**: 사용자가 1개 체크박스 만 ✅
- **When**: Server Action 호출
- **Then**: `ConsentRequiredError` throw + DB UPDATE 없음

**Scenario 3: 자녀 정보 저장 (REQ-FUNC-039)**
- **Given**: 동의 _직전_ 상태 (PIPA 컬럼 NULL)
- **When**: `saveChildInfo({childAgeMonths: 36, preferredPhonemes: ["ㅅ", "ㄹ"]})`
- **Then**: User UPDATE 성공 — PIPA 가드 미적용 (의도)

**Scenario 4: onboarding 완료 마킹**
- **Given**: PIPA + 자녀 정보 + calibration 완료
- **When**: `markOnboardingCompletedInDb()`
- **Then**: User.onboardingCompletedAt = now

**Scenario 5: 동의 철회 (GDPR 잊혀질 권리)**
- **Given**: 사용자 `/settings/privacy-consent` 에서 철회
- **When**: `savePrivacyConsent({revoke: true})`
- **Then**: 두 컬럼 NULL + audit_log "revocation" 기록

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-025/026**: PIPA 두 동의 의 binding 진입점
- **횡단 제약**:
  - [x] R4 개인정보: PIPA 컬럼은 timestamp, audit_log 자동 추적
  - [ ] CON-04: 자녀 정보 저장 시 이름 미저장 (R4 정합)
  - [ ] R7 PIPA 위반: 본 Server Action 의 throw 가 1차 차단 layer
- **참고 메모리**: `reference_supabase_auth_magic_link.md` — `/auth/callback` 후 onboarding 진입 흐름

## 🏁 Definition of Done
- [x] 3 Server Action 모두 Zod 검증 + try/catch
- [x] `tsc --strict` 0 errors
- [x] ConsentRequiredError 정의 (`lib/errors.ts`)
- [x] audit_log 자동 capture (withActor + DB-013)
- [x] `f976388` commit 본문에 REQ-NF-025/026 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-015 (User PIPA 컬럼), DB-013 (audit TRIGGER), API-016 (Auth — userId 보장)
- **Blocks**: FR-Q-016 (onboarding wizard), FR-Q-017 (`/settings/privacy-consent`), FR-C-019 (ConsentRedirectGate), SEC-005, SEC-006
- **Discope 영향**: 해당 없음
