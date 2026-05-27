---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-019: ConsentRedirectGate UI 가드 (PIPA 5중 가드 1층)"
labels: 'phase:p0, mode:active, domain:fr-c, epic:compliance, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-019
- **Epic / Story**: Compliance / PIPA 5중 가드 1층 (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: ADR-16 PIPA 5중 가드의 1층 — Client Component `ConsentRedirectGate.tsx` 를 layout 진입 시 작동시켜 미동의 인증 user 가 보호 경로 (`/diagnose`, `/missions`, `/reports`, `/rewards`, `/settings/*`) 진입 시 `/settings/privacy-consent` 로 자동 redirect. 정책 페이지 (`/privacy`, `/terms`) + GDPR 잊혀질 권리 페이지 (`/settings/account`) + 인증 흐름 (`/login*`, `/signup*`, `/auth/*`, `/onboarding`) 은 통과 허용.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.4.1 1층 — UI 가드 (`ConsentRedirectGate`)
  - §12.4.6 가드 매트릭스
  - REQ-NF-029 (PIPA 5중 가드)
  - ADR-16 PIPA 5중 가드
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-019
- **Commit**: `d05fb51` (의료기기법 footer + ConsentRedirectGate UI)

## ✅ Task Breakdown
- [x] `components/consent/ConsentRedirectGate.tsx` Client Component 작성 (`'use client'`)
  - props: `{ userId: string | null, pipaUnderageConsentAt: Date | null, overseasTransferConsentAt: Date | null, pathname: string }`
  - 미동의 (둘 중 하나라도 NULL) + 보호 경로 매칭 시 `router.replace('/settings/privacy-consent')`
- [x] 보호 경로 정의 (`PROTECTED_PATHS`): `/diagnose`, `/missions`, `/reports`, `/rewards`, `/settings/*` (단 `/settings/privacy-consent` + `/settings/account` 제외)
- [x] 허용 경로 (`ALLOW_PATHS`): `/`, `/privacy`, `/terms`, `/settings/privacy-consent`, `/settings/account`, `/login*`, `/signup*`, `/auth/*`, `/onboarding`
- [x] `app/(public)/layout.tsx` + `app/(authed)/layout.tsx` 에 마운트 — Server Component 에서 User 조회 후 props 주입
- [x] `usePathname()` (Next.js 16) 으로 SPA 이동 감지 + `useEffect` 트리거
- [x] 익명 user (userId == null) 은 본 가드 미적용 — FR-C-020 `useAnonymousConsent` 가 담당

## 🧪 Acceptance Criteria
**Scenario 1: 미동의 인증 user → /diagnose 진입 차단 (§12.4.1)**
- **Given**: User.pipaUnderageConsentAt = NULL + User.overseasTransferConsentAt = NULL
- **When**: 사용자가 `/diagnose` 접속
- **Then**: `/settings/privacy-consent` 로 redirect

**Scenario 2: 동의 user → 정상 통과**
- **Given**: 두 컬럼 모두 timestamp 존재
- **When**: 사용자가 `/diagnose` 접속
- **Then**: `/diagnose` 페이지 정상 렌더링

**Scenario 3: 정책 페이지는 미동의 user 도 허용 (GDPR)**
- **Given**: 미동의 인증 user
- **When**: `/privacy` 또는 `/terms` 접속
- **Then**: redirect 없음 — 정책 검토 후 동의 가능

**Scenario 4: /settings/account 는 미동의 user 도 허용 (GDPR 잊혀질 권리)**
- **Given**: 미동의 인증 user
- **When**: `/settings/account` 접속
- **Then**: redirect 없음 — 계정 삭제 가능

**Scenario 5: 홈 (/) 은 미동의 user 도 허용 (둘러보기 출구)**
- **Given**: 미동의 인증 user
- **When**: `/` 접속
- **Then**: redirect 없음

**Scenario 6: 익명 user 는 본 가드 미적용**
- **Given**: userId == null (익명)
- **When**: `/diagnose` 접속
- **Then**: redirect 없음 — FR-C-020 가 담당 (inline 체크박스)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-029**: PIPA 5중 가드 — 본 컴포넌트가 1층 (UI 차단)
- **ADR-16**: 5중 가드의 binding 메커니즘 중 가장 사용자 가시 layer
- **횡단 제약**:
  - [x] R7 PIPA 위반: 미동의 user 의 진단 시작 1차 UI 차단
  - [x] CON-04 의료 disclaimer: redirect 대상 페이지 (`/settings/privacy-consent`) 자체에 PIPA 카피만 노출 — 의료 표현 금지 정합
  - [ ] R4 개인정보: 본 컴포넌트는 redirect 만, DB 영향 없음
- **성능**: Client-side redirect — Vercel Edge 미사용, layout 진입 1회 useEffect 실행 (p95 < 50ms)

## 🏁 Definition of Done
- [x] `ConsentRedirectGate.tsx` 5 scenario 통과
- [x] `app/(public)/layout.tsx` + `app/(authed)/layout.tsx` 마운트 검증
- [x] `tsc --strict` 0 errors
- [x] E2E `consent-flow.spec.ts` 20/20 PASS (chromium-desktop + Pixel 5)
- [x] `d05fb51` commit 본문에 REQ-NF-029 + ADR-16 매핑
- [x] usePathname SPA 이동 시 정상 트리거 검증

## 🚧 Dependencies & Blockers
- **Depends on**: DB-015 (User PIPA 컬럼), API-013 (savePrivacyConsent), API-016 (Auth — userId 보장), FR-Q-017 (`/settings/privacy-consent` 페이지)
- **Blocks**: SEC-005, SEC-009 (5중 가드 통합), TEST-015 (consent-flow E2E)
- **Discope 영향**: 해당 없음
