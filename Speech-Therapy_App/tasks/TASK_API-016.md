---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Auth] API-016: sendMagicLink + /auth/callback + /auth/mfa-challenge + /auth/reset-password (Magic Link + Google OAuth + TOTP)"
labels: 'phase:p0, mode:active, domain:api, epic:auth, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-016
- **Epic / Story**: Auth (Sprint 3 §3 SP3_3 Google OAuth + API-010 §1 Magic Link 통합)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Supabase Auth 통합 — Magic Link + Google OAuth + TOTP MFA + backup codes + 비밀번호 재설정. 익명→인증 마이그레이션의 진입점.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.5.3 Auth 라우트 5종
  - §6.5.2 Sprint 2 SP2_1 (익명 cookie + 인증 마이그레이션)
  - §6.5.3 Sprint 3 SP3_3 (Google OAuth)
  - V06 API-010 §1 + §2
- **Reference 메모리**: `reference_supabase_auth_magic_link.md` — Magic Link 흐름 + PKCE verifier cookies hotfix (`fed9769`)

## ✅ Task Breakdown
- [x] `app/actions/auth/send-magic-link.ts` — `sendMagicLink(email)` Server Action
  - Supabase `signInWithOtp({ email, options: { emailRedirectTo: "/auth/callback" } })`
  - 이메일 rate limit 안내 — 사용자 메시지 graceful
- [x] `/login/page.tsx` + `/signup/page.tsx` — Magic Link form + Google OAuth 버튼
- [x] `/auth/callback/route.ts` — PKCE verifier cookies (`code_verifier` httpOnly), `?next=` redirect 지원
  - hotfix `fed9769` — verifier cookie 누락 fix
- [x] `/auth/mfa-challenge/page.tsx` + TOTP input + backup codes
- [x] `/auth/reset-password/page.tsx` — 이메일 입력 → reset email
- [x] Google OAuth provider 활성 (Supabase Dashboard) + redirect URI 등록
- [x] 익명→인증 마이그레이션 (`Sprint 2 SP2_1`): anonymous_user_id cookie 의 데이터를 인증 user.id 로 머지

## 🧪 Acceptance Criteria
**Scenario 1: Magic Link 발송 (API-010 §1)**
- **Given**: 사용자 email 입력
- **When**: sendMagicLink(email)
- **Then**: 이메일 발송 + UI "이메일을 확인하세요" 표시

**Scenario 2: Magic Link 클릭 후 callback**
- **Given**: 이메일 링크 클릭
- **When**: `/auth/callback?code=xxx&next=/diagnose`
- **Then**: PKCE verifier 검증 → session 생성 → `/diagnose` redirect

**Scenario 3: Google OAuth (SP3_3)**
- **Given**: `/login` Google 버튼 클릭
- **When**: OAuth consent + redirect
- **Then**: callback 통과 → session 생성

**Scenario 4: 익명→인증 마이그레이션 (SP2_1)**
- **Given**: 익명 user (cookie anonymous_user_id="anon-xxx") 데이터 존재
- **When**: 회원가입 완료
- **Then**: 익명 user 의 EvaluationResult / SessionLog / RewardLog 가 새 인증 user.id 로 머지 (UPDATE)

**Scenario 5: TOTP MFA**
- **Given**: TOTP 활성 user
- **When**: 로그인 시 OTP 입력
- **Then**: 6자리 검증 OK → session 발급

**Scenario 6: 비밀번호 재설정**
- **Given**: 사용자 email 입력
- **When**: `/auth/reset-password`
- **Then**: Supabase reset email 발송 + `/auth/callback` 후 새 비밀번호 설정

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: RBAC + 1년+ 감사 로그 (audit_log)
- **횡단 제약**:
  - [x] R4 개인정보: email PII, audit_log 자동 추적
  - [ ] SMTP rate limit (Supabase Free 30/h) — 사용자 측 graceful 안내
  - [ ] 이메일 발송 모바일 검증은 rate limit 으로 이연 (메모리 참조)

## 🏁 Definition of Done
- [x] Magic Link 발송 + callback 검증
- [x] Google OAuth 검증
- [x] TOTP backup codes 검증
- [x] 익명→인증 마이그레이션 단위 테스트 (SP2_1)
- [x] PKCE verifier cookie hotfix 적용 (`fed9769`)
- [x] `tsc --strict` 0 errors

## 🚧 Dependencies & Blockers
- **Depends on**: DB-002 (User), DB-015 (PIPA 컬럼), V06 API-010 (base Supabase Auth)
- **Blocks**: FR-Q-015 (Auth UI), FR-Q-016 (onboarding wizard), 모든 RBAC 라우트
- **Discope 영향**: 해당 없음
