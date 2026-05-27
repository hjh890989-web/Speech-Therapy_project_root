---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-017: Settings hub + 7 sub (consent / privacy-consent / account / child / calibration / notifications / security)"
labels: 'phase:p0, mode:active, domain:fr-q, epic:settings, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-017
- **Epic / Story**: Settings hub (V07 신규 — PIPA 5중 가드 1층 redirect target)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 인증 user 의 통합 설정 hub — `/settings` 인덱스 + 7 sub route (consent / privacy-consent / account / child / calibration / notifications / security). 특히 `/settings/privacy-consent` 는 ADR-16 5중 가드 1층 (`ConsentRedirectGate`) 의 redirect target — 미동의 인증 user 의 PIPA 두 동의 회수 페이지.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.5.5 (Public) 인증 후 라우트 — `/settings/*` hub + 7 sub
  - §12.4 ADR-16 PIPA 5중 가드 (UI 가드 1층)
  - REQ-NF-019 (RBAC + 1년 audit_log)
  - REQ-NF-025 / REQ-NF-026 (PIPA §22-6 + §17 두 동의)
  - REQ-NF-029 (PIPA 5중 가드)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-A FR-Q-017

## ✅ Task Breakdown
- [x] `/settings/page.tsx` — hub 인덱스 (7 sub link 카드 + RBAC 안내)
- [x] `/settings/consent/page.tsx` — 마케팅·푸시 동의 토글 (정보통신망법 §50 옵트인)
- [x] `/settings/privacy-consent/page.tsx` — **PIPA §22-6 + §17 두 체크박스** (PrivacyConsentForm) — 미동의 인증 user redirect target
- [x] `/settings/account/page.tsx` — email / role / 탈퇴 (User SOFT DELETE)
- [x] `/settings/child/page.tsx` — `childAgeMonths` + `preferredPhonemes` 수정 (`updateChildProfile` Server Action)
- [x] `/settings/calibration/page.tsx` — STT 보정 (Web Speech API 마이크 권한 재진단)
- [x] `/settings/notifications/page.tsx` — weeklyReport / cushionNote / parentInvite / consentReminder 4 옵트인
- [x] `/settings/security/page.tsx` — TOTP MFA 등록 + backup codes + 비밀번호 변경
- [x] `/settings/*` 전 노드 `ConsentRedirectGate` 제외 (`privacy-consent` / `account` 는 자체 동의 회수 흐름)

## 🧪 Acceptance Criteria
**Scenario 1: hub 인덱스 정상 진입**
- **Given**: 인증 user 로그인
- **When**: `/settings` 진입
- **Then**: 7 sub link 카드 모두 렌더 + RBAC 에 따라 일부 disabled

**Scenario 2: `/settings/privacy-consent` 동의 회수 (REQ-NF-025/026, ADR-16)**
- **Given**: 인증 user 가 PIPA 미동의 상태로 `/missions` 진입
- **When**: `ConsentRedirectGate` 가 `/settings/privacy-consent?next=/missions` redirect
- **Then**: PrivacyConsentForm 의 두 ✅ 후 → `savePrivacyConsent()` → `/missions` 자동 redirect

**Scenario 3: `/settings/child` 자녀 정보 수정 (REQ-FUNC-039)**
- **Given**: `childAgeMonths=36` user
- **When**: 48 로 변경 + 저장
- **Then**: `updateChildProfile({ childAgeMonths: 48 })` 호출 + AuditLog INSERT + UI revalidate

**Scenario 4: `/settings/security` TOTP MFA 등록**
- **Given**: TOTP 미등록 user
- **When**: QR 스캔 + 6자리 입력 + 검증
- **Then**: Supabase MFA factor INSERT + backup codes 5개 발급 + AuditLog

**Scenario 5: `/settings/notifications` 옵트인 토글 (정보통신망법 §50)**
- **Given**: weeklyReportEmail=false
- **When**: 토글 ON
- **Then**: `User.notificationPreference.weeklyReportEmail = true` UPDATE + 다음 Cron 부터 발송

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: RBAC + 모든 mutation AuditLog 1년+ 보관 (DB-013 TRIGGER)
- **REQ-NF-025/026**: `/settings/privacy-consent` 가 PIPA 두 동의 인증 user 진입점
- **REQ-NF-029**: ADR-16 5중 가드 1층 UI (`ConsentRedirectGate` redirect target)
- **횡단 제약**:
  - [x] CON-04: 모든 sub 카피 무위반 (TEST-016 검증)
  - [x] R4 개인정보: child / account 의 PII 는 AuditLog sanitize 자동 ([REDACTED])
  - [x] R7 PIPA 위반: privacy-consent 가 동의 회수 1차 layer

## 🏁 Definition of Done
- [x] hub + 7 sub 모두 정상 렌더
- [x] `/settings/privacy-consent` 가 ConsentRedirectGate redirect target 으로 동작
- [x] `?next=` 보존 검증 (raw + URL-encoded 둘 다)
- [x] `tsc --strict` 0 errors
- [x] CON-04 무위반 (TEST-016 통과)
- [x] PR 본문에 REQ-NF-019/025/026/029 + ADR-16 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-013 (savePrivacyConsent + updateChildProfile + saveNotificationPreference), API-016 (Auth), FR-C-021 (PrivacyConsentForm), FR-Q-015 (Auth UI)
- **Blocks**: FR-C-019 (`ConsentRedirectGate` 가 `/settings/privacy-consent` redirect 필요), FR-Q-016 (onboarding 완료 후 settings hub 진입)
- **Discope 영향**: 해당 없음
