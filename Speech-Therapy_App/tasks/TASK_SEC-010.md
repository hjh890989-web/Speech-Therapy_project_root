---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Security] SEC-010: Supabase Auth Magic Link + Google OAuth + TOTP MFA + backup codes"
labels: 'phase:p0, mode:active, domain:sec, epic:auth, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: SEC-010
- **Epic / Story**: Supabase Auth 통합 (V07 신규 — API-010 §1+§2 + Sprint 3 SP3_3)
- **Phase**: 🟢 P0 → ✅ Done (API-010 §1+§2 + Sprint 3 SP3_3)
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Supabase Auth (PKCE flow) 위에 3 방식 인증 통합 — Magic Link (이메일) + Google OAuth + TOTP MFA + 10 backup codes. 익명 user → 인증 user 마이그레이션 흐름 포함. B2C 결제 + B2B 다중 테넌트 전 단계의 인증 기반.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.5.3 Auth 5종 (Magic Link + Google OAuth + TOTP MFA + reset + callback)
  - API-010 §1+§2 (Magic Link + Google OAuth)
  - Sprint 3 SP3_3 (TOTP MFA + backup codes)
- **Reference 메모리**: `reference_supabase_auth_magic_link.md`
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-B SEC-010
- **Commits**: API-010 §1 (`f976388` 시점 직전), Sprint 3 SP3_3

## ✅ Task Breakdown
- [x] **Magic Link** (API-010 §1):
  - `app/(public)/login/page.tsx` + `LoginForm.tsx`
  - `app/actions/auth.ts` 의 `sendMagicLink(email)` Server Action
  - `app/auth/callback/route.ts` — PKCE code exchange + session cookie
  - 익명 → 인증 마이그레이션 (`anonymousUserId` 의 EvaluationResult/RewardLog 등 UPDATE)
- [x] **Google OAuth** (API-010 §2):
  - Supabase Dashboard OAuth provider 등록
  - LoginForm 의 "Google 로 로그인" 버튼
  - 콜백 URL 동일 (`/auth/callback`)
- [x] **TOTP MFA** (Sprint 3 SP3_3):
  - `/settings/security` 페이지 — TOTP enroll QR
  - `/auth/mfa-challenge` — 로그인 후 6 자리 코드 입력
  - User.totpBackupCodes JSONB — 10 backup codes (1회용)
  - `/admin/security/totp-reset` (FR-Q-019) — 관리자 비상 재설정
- [x] `lib/supabase/server.ts` + `lib/supabase/client.ts` — `@supabase/ssr` 0.10.3 wrapper
- [x] `app/(public)/AuthHeader.tsx` — 로그인/로그아웃 상태 헤더
- [x] `hotfix 1bf88a6` — Magic Link redirect URL (`/auth/callback`) Supabase Dashboard 설정

## 🧪 Acceptance Criteria
**Scenario 1: Magic Link 흐름 (API-010 §1)**
- **Given**: 익명 user + `/login` 페이지에 이메일 입력
- **When**: "로그인 링크 보내기" 클릭
- **Then**: Supabase Auth 이메일 발송 + `/auth/callback?code=...` 클릭 시 session cookie 설정 + 익명 → 인증 마이그레이션

**Scenario 2: Google OAuth (API-010 §2)**
- **Given**: 로그인 페이지의 Google 버튼 클릭
- **When**: Google consent 후 콜백
- **Then**: `/auth/callback` 가 PKCE exchange + session 설정 + 익명 마이그레이션

**Scenario 3: TOTP MFA enroll (Sprint 3 SP3_3)**
- **Given**: 인증 user + `/settings/security` 진입
- **When**: "MFA 활성화" 클릭 + QR scan + 6자리 입력
- **Then**: `User.totpSecret` 설정 + `totpBackupCodes` 10개 표시 + 다운로드

**Scenario 4: backup code 로그인**
- **Given**: TOTP 활성화 user + 디바이스 분실
- **When**: `/auth/mfa-challenge` 의 "backup code" 입력
- **Then**: 1회용 코드 검증 후 로그인 + 해당 코드 invalidate

**Scenario 5: 익명 → 인증 마이그레이션**
- **Given**: 익명 user 의 RewardLog 5건 + EvaluationResult 3건
- **When**: Magic Link 클릭 후 callback
- **Then**: 모든 row 의 userId 가 Supabase auth.users.id 로 UPDATE + localStorage 정리

**Scenario 6: 관리자 비상 재설정 (FR-Q-019)**
- **Given**: 사용자가 TOTP + backup codes 모두 분실
- **When**: 관리자 가 `/admin/security/totp-reset` 에서 해당 user 강제 재설정
- **Then**: TOTP 해제 + audit_log INSERT + 사용자 재 enroll 가능

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: 감사 로그 1년+ 보관 — 인증 / MFA 변경 이력 모두 audit_log
- **횡단 제약**:
  - [x] R4 개인정보: 인증으로 user 식별 — RLS 정책 강제
  - [x] CON-05 5중 가드: 인증 user 는 1+2+3+4 층 cover, 익명 user 는 5층 cover
  - [x] G2 비용: Supabase Free tier (1,000 MAU)
- **이메일 rate limit**: Supabase 무료 티어 — 운영 시 Resend / SES 자체 도메인 권장
- **PKCE**: SSR 환경에서 `@supabase/ssr` 가 자동 처리 (token 누출 방어)

## 🏁 Definition of Done
- [x] Magic Link 흐름 검증 (PC 시크릿 모드 + 익명 마이그레이션)
- [x] Google OAuth 검증 (Google consent + callback)
- [x] TOTP MFA enroll + login challenge 검증
- [x] backup codes 다운로드 + 1회용 검증
- [x] 관리자 비상 재설정 (`/admin/security/totp-reset`) 검증
- [x] `tsc --strict` 0 errors
- [x] PR 본문에 §3.5.3 + API-010 §1+§2 + Sprint 3 SP3_3 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-016 (Auth 5종 Route Handler), DB-002 (User), DB-015 (totpBackupCodes 컬럼)
- **Blocks**: SEC-009 (인증 user 5중 가드), FR-Q-015 (Auth UI), FR-Q-017 (`/settings/security`), 모든 B2C/B2B 결제 흐름
- **Discope 영향**: 해당 없음 (인증 도입 = Sprint 2 anonymousUserId 위에 누적)
