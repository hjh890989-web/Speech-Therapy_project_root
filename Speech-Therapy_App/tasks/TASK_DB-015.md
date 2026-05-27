---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-015: User PIPA 컬럼 마이그레이션 (pipaUnderageConsentAt + overseasTransferConsentAt + 6 신규)"
labels: 'phase:p0, mode:active, domain:db, epic:compliance, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-015
- **Epic / Story**: Compliance / PIPA (V07 신규 핵심)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: PIPA §22-6 (만 14세 미만 부모 대리 동의) + §17 (국외 이전 동의) 의 일시 영속화. 인증 + 익명 user 동일 컬럼 사용. 5중 가드 (ADR-16) 의 데이터 layer 근원.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §6.1.1 기존 7 Entity — User V07 보강 컬럼
  - §12.2 PIPA §17 국외 이전 동의 흐름
  - §12.3 PIPA §22-6 만 14세 미만 부모 대리 동의
  - REQ-NF-025 (PIPA §22-6) / REQ-NF-026 (PIPA §17)
  - ADR-16 (PIPA 5중 가드)
- **ERD**: V07 §6.1.1 — User + 8 신규 컬럼
- **Migration**: `prisma/migrations/20260527140000_add_user_pipa_consent_columns/`

## ✅ Task Breakdown
- [x] `prisma/schema.prisma` User model 에 8 컬럼 추가:
  - `pipaUnderageConsentAt DateTime?` ⭐ (PIPA §22-6)
  - `overseasTransferConsentAt DateTime?` ⭐ (PIPA §17)
  - `preferredPhonemes String[] @default([])`
  - `notificationPreference Json? @default("{}")`
  - `onboardingCompletedAt DateTime?`
  - `totpBackupCodes String[] @default([])`
  - `institutionId String?` + relation
  - `classId String?` + relation
- [x] Prisma migration 생성: `20260527140000_add_user_pipa_consent_columns`
- [x] Supabase Studio SQL Editor 로 prod 적용 (INFRA-008 패턴):
  ```sql
  ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "pipaUnderageConsentAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "overseasTransferConsentAt" TIMESTAMP(3),
    ...
  ```
- [x] `@@index([pipaUnderageConsentAt])` + `@@index([institutionId])` 추가
- [x] audit_log_triggers (DB-013) 의 `audit_user_changes` TRIGGER 가 본 컬럼 변경 자동 capture
- [x] R4 sanitize 대상 키 (`realname`, `ssn`, `rrn`, `email`, `phone`, `address`, `birthdate`) 와 충돌 없음 확인

## 🧪 Acceptance Criteria
**Scenario 1: PIPA 두 동의 일시 저장 (REQ-NF-025/026)**
- **Given**: 사용자 onboarding Step2 에서 두 체크박스 ✅
- **When**: `savePrivacyConsent` Server Action 호출
- **Then**: User.pipaUnderageConsentAt = now, User.overseasTransferConsentAt = now

**Scenario 2: 미동의 user 의 NULL 상태**
- **Given**: 신규 가입 직후 user
- **When**: User 조회
- **Then**: 두 컬럼 모두 NULL → `assertConsentedIfAuthenticated()` ConsentRequiredError throw

**Scenario 3: 동의 철회 시 NULL 복귀 (GDPR 잊혀질 권리)**
- **Given**: `/settings/privacy-consent` 에서 사용자가 철회 클릭
- **When**: `savePrivacyConsent({ revoke: true })` 호출
- **Then**: 두 컬럼 NULL UPDATE + audit_log INSERT (oldData: 일시 → newData: null)

**Scenario 4: 익명 user 도 동일 컬럼 사용**
- **Given**: 익명 user.userId = "anon-xxx" 의 `/diagnose` 두 체크박스 ✅
- **When**: analyzeDiagnosis 의 익명 분기 — User upsert (5층 가드)
- **Then**: User row INSERT 시 두 컬럼 now 저장 (인증/익명 동일 column)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-025**: PIPA §22-6 만 14세 미만 부모 대리 동의
- **REQ-NF-026**: PIPA §17 국외 이전 동의 (Google Cloud Speech US + Gemini US/global)
- **ADR-16**: PIPA 5중 가드 — 본 컬럼이 가드 의 binding 데이터
- **횡단 제약**:
  - [x] R4 개인정보: 두 컬럼은 PII 아님 (timestamp), audit TRIGGER 로 추적
  - [x] R7 PIPA 위반: 본 컬럼이 미동의 user 차단 의 1차 source
- **참고 메모리**: `feedback_pc_sync_pattern.md` — Supabase Studio prod migration 사용자 1회 직접 실행

## 🏁 Definition of Done
- [x] Prisma migration 성공 (dev + prod)
- [x] `tsc --strict` 0 errors
- [x] `@@index` 2개 검증
- [x] audit_log_triggers 자동 capture 검증
- [x] User UPDATE 시 oldData/newData 의 두 컬럼 변경 추적성 확보
- [x] Server Action `savePrivacyConsent` (API-013) 와 정합

## 🚧 Dependencies & Blockers
- **Depends on**: DB-002 (User base), DB-013 (audit TRIGGER), INFRA-008 (Supabase Studio)
- **Blocks**: API-013 (savePrivacyConsent), FR-C-019 (ConsentRedirectGate), FR-C-022 (analyzeDiagnosis 2+5층), SEC-005, SEC-006, SEC-009
- **Discope 영향**: 해당 없음
