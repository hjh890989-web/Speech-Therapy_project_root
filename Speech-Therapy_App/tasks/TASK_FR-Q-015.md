---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-015: Auth UI 4종 (/login + /signup + /auth/mfa-challenge + /auth/reset-password)"
labels: 'phase:p0, mode:active, domain:fr-q, epic:auth, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-015
- **Epic / Story**: Auth UI (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Supabase Auth 의 4 UI 라우트 — Magic Link + Google OAuth 로그인 / 회원가입 / TOTP MFA / 비밀번호 재설정.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.5.3 Auth 라우트
  - REQ-NF-019 (RBAC)
- **Reference 메모리**: `reference_supabase_auth_magic_link.md`

## ✅ Task Breakdown
- [x] `/login/page.tsx` — email input + Magic Link 발송 + Google OAuth 버튼 + `?next=` 보존
- [x] `/signup/page.tsx` — parent-invite JWT 토큰 옵션 + Magic Link
- [x] `/auth/mfa-challenge/page.tsx` — TOTP 6자리 input + backup codes link
- [x] `/auth/reset-password/page.tsx` — 이메일 input + reset email 발송
- [x] `/login` 와 `/signup` 의 두 버튼 모두 ConsentRedirectGate 제외 (auth 흐름 의도)
- [x] Tailwind + shadcn/ui Form / Button / Input 컴포넌트

## 🧪 Acceptance Criteria
**Scenario 1: Magic Link 발송 UI**
- **Given**: 사용자 email 입력
- **When**: "이메일로 로그인" 버튼 클릭
- **Then**: `sendMagicLink(email)` 호출 + "이메일을 확인하세요" 안내

**Scenario 2: Google OAuth 버튼**
- **Given**: `/login` 진입
- **When**: Google 버튼 클릭
- **Then**: Supabase Google OAuth flow 진입 → `/auth/callback?next=...` redirect

**Scenario 3: `?next=` 보존**
- **Given**: `/login?next=%2Fdiagnose` 진입
- **When**: 로그인 성공
- **Then**: `/diagnose` redirect (URL-encoded 또는 raw 둘 다 허용)

**Scenario 4: TOTP MFA**
- **Given**: TOTP 활성 user 로그인
- **When**: `/auth/mfa-challenge` 진입 + 6자리 입력
- **Then**: 검증 OK → session 발급 + 원래 페이지 redirect

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: RBAC + 1년 audit_log
- **횡단 제약**:
  - [ ] CON-04: Auth UI 카피 검증
  - [x] R4 개인정보: email PII, audit_log 추적

## 🏁 Definition of Done
- [x] 4 페이지 모두 정상 렌더
- [x] Magic Link 발송 + Google OAuth + TOTP 검증
- [x] `?next=` 보존 검증 (raw + URL-encoded 둘 다)
- [x] `tsc --strict` 0 errors

## 🚧 Dependencies & Blockers
- **Depends on**: API-016 (Auth Server Action), API-010 (Supabase Auth)
- **Blocks**: FR-Q-016 (onboarding), FR-Q-017 (settings)
- **Discope 영향**: 해당 없음
