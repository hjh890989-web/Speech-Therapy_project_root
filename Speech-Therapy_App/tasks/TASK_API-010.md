---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Auth] API-010: Supabase Auth + Next.js Middleware RBAC 라우팅 가드"
labels: 'phase:p1, mode:active, domain:api, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-010
- **Epic / Story**: Foundation 보안 (REQ-NF-019)
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Supabase Auth(OAuth + Magic Link) 통합 + Next.js Middleware로 역할 기반(parent/teacher/principal/expert/admin) 라우팅 가드 구현. 무로그인 진단 → 가입 전환 + 유료 결제·B2B 어드민 진입 차단.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.3 External Systems — Supabase Auth (OAuth, Magic Link)
  - §3.4 Client Apps — 무로그인→가입 전환
  - REQ-NF-019 (RBAC + Middleware + RLS)
- **Task 강화판**: §3-2 API-010

## ✅ Task Breakdown
- [ ] `npm i @supabase/ssr @supabase/supabase-js` 설치
- [ ] Supabase Auth 설정:
  - Email Magic Link 활성화
  - OAuth 제공자: Google, Apple (Apple은 P1 후반)
  - Email Templates 한글화 (회원가입 확인, 비밀번호 재설정)
- [ ] `lib/supabase/server.ts` (Server Component용), `lib/supabase/client.ts` (Client Component용) 작성
- [ ] `middleware.ts` (프로젝트 루트):
  - 모든 요청에서 Supabase 세션 갱신 (`getUser()`)
  - 보호 경로 체크:
    - `/dashboard/*` → authenticated only
    - `/(dashboard)/*` (B2B) → principal/teacher only
    - `/(admin)/*` → expert/admin only
    - `/api/admin/*` → admin only
  - 세션 만료 시 `/login` 리다이렉트 (returnUrl 보존)
- [ ] 회원가입 → users 테이블 row 자동 생성 (Supabase Auth Trigger 또는 webhook):
  - role 기본값 'parent'
  - email Supabase Auth와 동기화
- [ ] 무로그인 익명 사용자 → 가입 시 anonymous_user_id를 user_id로 마이그레이션:
  - localStorage `anonymous_user_id` 추출
  - `prisma.evaluationResult.updateMany({where: {anonymousUserId}, data: {userId: newUser.id}})`
  - reward_progress, session_logs도 동일 마이그레이션
- [ ] `app/login/page.tsx`, `app/signup/page.tsx`, `app/auth/callback/route.ts` 작성
- [ ] 로그아웃 Server Action

## 🧪 Acceptance Criteria
**Scenario 1: Magic Link 회원가입 → users INSERT**
- **Given**: 신규 이메일
- **When**: Magic Link 클릭 → 콜백 처리
- **Then**: Supabase Auth 사용자 + Prisma users row 동시 생성 (role: parent 기본)

**Scenario 2: 미인증 사용자 보호 경로 차단**
- **Given**: 로그인 안 됨
- **When**: GET `/dashboard`
- **Then**: 302 리다이렉트 → `/login?returnUrl=/dashboard`

**Scenario 3: 역할별 차단 (parent → admin 경로)**
- **Given**: parent 인증
- **When**: GET `/admin/users`
- **Then**: 403 Forbidden 또는 `/` 리다이렉트

**Scenario 4: 익명 사용자 가입 시 데이터 마이그레이션**
- **Given**: anonymous_user_id로 evaluation_results 3건 누적
- **When**: 가입 완료
- **Then**: 3건 모두 userId가 신규 uuid로 갱신, anonymous_user_id null

**Scenario 5: 세션 만료 처리**
- **Given**: 세션 토큰 만료
- **When**: 임의 보호 페이지 진입
- **Then**: Magic Link 재요청 안내 또는 자동 갱신 (refresh token)

**Scenario 6: OAuth Google 가입**
- **Given**: Google OAuth 클릭
- **When**: 콜백 후 첫 접근
- **Then**: users row 생성 (role: parent), 진단 결과 페이지로 리다이렉트

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: RBAC + Middleware
- **REQ-NF-007**: Uptime 99.9% — Supabase Auth 의존
- **C-TEC-002**: Middleware는 Edge Runtime 가능 (단, Next.js 15에서 RSC와 호환)
- **횡단 제약**:
  - [ ] R4 보호 — 자녀 정보 본인만 접근
  - [ ] 보안 — Magic Link 토큰 1회용 + 1시간 만료
  - [ ] CSRF — Supabase SSR 헬퍼가 자동 처리
- **G2 비용 가드**: Supabase Auth Free 50,000 MAU까지 무료

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Magic Link + Google OAuth 양쪽 동작
- [ ] Middleware 보호 경로 5+ 라우트 검증
- [ ] 익명 → 가입 마이그레이션 통합 테스트
- [ ] `tsc --strict` 0 errors
- [ ] Email Templates 한글화
- [ ] PR 본문에 REQ-NF-019 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-002 (users + role enum), DB-011 (RLS — 페어 작업), INFRA-001 (Supabase 환경 변수)
- **Blocks**: 모든 보호 경로 (dashboard, admin, B2B), API-006 (expert 인증 필요), SEC-002 (RBAC 통합)
- **Discope 영향**: 해당 없음
