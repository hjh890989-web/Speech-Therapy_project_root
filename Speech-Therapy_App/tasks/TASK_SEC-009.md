---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Security] SEC-009: ADR-16 PIPA 5중 가드 통합 — UI + Server Action 4 + 익명 boolean"
labels: 'phase:p0, mode:active, domain:sec, epic:pipa-5-gates, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: SEC-009
- **Epic / Story**: ADR-16 PIPA 5중 가드 통합 (V07 최상위 컴플라이언스)
- **Phase**: 🟢 P0 → ✅ Done (본 sub-session 5 PR — `f976388` + `f9cf258` + `a6378b9` + `41f431e` + `d05fb51`)
- **Mode**: 명세대로 (ADR-16 5층 방어)
- **Discope 적용**: 해당 없음
- **목적**: PIPA 컴플라이언스를 단일 가드만으로 보호하지 않고 5층 방어 (UI redirect / Server Action 인증 / Server Action graceful / Server Action fallback / 익명 user boolean) 로 다중화. ADR-16 결정의 코드 산출물 통합. SEC-005/006/007/008 의 짝.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.4 5중 가드 명세 (§12.4.1 ~ §12.4.5)
  - REQ-NF-029 (5중 가드 통합)
  - ADR-16 (PIPA 5중 가드 결정)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-B SEC-009
- **Commits (본 sub-session 5 PR)**:
  - `f976388` — PIPA §22-6 인증 user (1+2층)
  - `f9cf258` — 익명 user 5층 boolean
  - `a6378b9` — `analyzeDiagnosis` 2층 ConsentRequiredError
  - `41f431e` — `updateChildProfile` 3층 + `generateCushion` 4층 graceful
  - `d05fb51` — `ConsentRedirectGate` UI 1층 + 의료기기법 footer

## ✅ Task Breakdown
- [x] **1층 (UI redirect)**: `ConsentRedirectGate.tsx` — 미동의 인증 user 진입 시 `/settings/privacy-consent` redirect (`d05fb51`)
- [x] **2층 (Server Action 인증)**: `analyzeDiagnosis` 의 `assertConsentedIfAuthenticated` — 미동의 시 `ConsentRequiredError` throw (`a6378b9`)
- [x] **3층 (Server Action graceful)**: `updateChildProfile` — 미동의 시 throw 대신 `{ ok: false, reason: "consent_required" }` 반환 (`41f431e`)
- [x] **4층 (Server Action fallback)**: `generateCushion` — 미동의 시 Gemini 미호출 + `SAFE_CUSHION_FALLBACK` 안전 문구 반환 (`41f431e`)
- [x] **5층 (익명 boolean)**: `analyzeDiagnosis` 가 `input.pipaConsented + overseasConsented` boolean 직접 검사 → 미동의 시 차단 (`f9cf258`)
- [x] 통합 e2e — `e2e/consent-flow.spec.ts` 20/20 PASS (chromium-desktop + chromium-mobile Pixel 5)

## 🧪 Acceptance Criteria
**Scenario 1: 1층 UI redirect (REQ-NF-029)**
- **Given**: 인증 user + `pipaUnderageConsentAt = NULL`
- **When**: `/diagnose` 페이지 진입
- **Then**: `ConsentRedirectGate` 가 `/settings/privacy-consent` 로 즉시 redirect

**Scenario 2: 2층 Server Action 인증 throw (`a6378b9`)**
- **Given**: 1층 우회 + 인증 user 미동의
- **When**: `analyzeDiagnosis` 직접 호출 (Network 탭으로 강제)
- **Then**: `ConsentRequiredError` throw + 5xx 응답 + Slack alert (MON-005)

**Scenario 3: 3층 graceful 반환 (`41f431e`)**
- **Given**: 미동의 인증 user
- **When**: `updateChildProfile(input)` 호출
- **Then**: `{ ok: false, reason: "consent_required" }` 반환 + UI 가 동의 page redirect 안내 (throw 안 함)

**Scenario 4: 4층 SAFE_CUSHION_FALLBACK (`41f431e`)**
- **Given**: 미동의 인증 user
- **When**: `generateCushion` 호출
- **Then**: Gemini 미호출 + 안전 폴백 문구 반환 (서비스 중단 없음)

**Scenario 5: 5층 익명 boolean (`f9cf258`)**
- **Given**: 익명 user + `input.pipaConsented = false`
- **When**: `analyzeDiagnosis` 호출
- **Then**: `ConsentRequiredError` throw (인증 미사용 익명도 cover)

**Scenario 6: 통합 e2e PASS (TEST-015)**
- **Given**: `e2e/consent-flow.spec.ts` 시나리오 10개 × 2 브라우저 = 20
- **When**: Playwright 실행
- **Then**: 20/20 PASS (chromium-desktop + chromium-mobile Pixel 5)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-029**: 5중 가드 통합 — 단일 층 우회 시 다음 층이 즉시 cover
- **법적 risk**: PIPA 위반 1건 = 행정처분 + 형사처벌 risk → 5중 다중화 결정
- **횡단 제약**:
  - [x] R4 개인정보: 영유아 PII 누출 방어 = 5층 모두 핵심
  - [x] CON-04 금칙어: 4층의 `SAFE_CUSHION_FALLBACK` 도 의료 금칙어 무위반
  - [x] CON-05 5중 가드: 본 SEC-009 = 통합 책임자 (SEC-005~008 + 5층 통합)
- **운영**: Slack alert (MON-005) 와 짝 — 2층 throw 발생 시 자동 알림

## 🏁 Definition of Done
- [x] 5층 모두 코드 산출물 + commit hash 매핑
- [x] `e2e/consent-flow.spec.ts` 20/20 PASS (TEST-015)
- [x] 5 PR 모두 main merge + Vercel 배포
- [x] PR 본문에 REQ-NF-029 + ADR-16 + §12.4 매핑
- [x] MON-005 Slack alert 연동 (P1)
- [x] R4 개인정보 보호 검증 — audit_log sanitize 확인

## 🚧 Dependencies & Blockers
- **Depends on**: SEC-005 (PIPA §22-6), SEC-006 (PIPA §17), SEC-007 (PII 마스킹), SEC-008 (의료기기법), FR-C-019~024 (5 가드 코드 산출물), API-014 (PIPA 3+4층 Server Action)
- **Blocks**: TEST-015 (E2E consent-flow), MON-005 (PIPA 위반 알림), OPS-004 (`/privacy` 정식 교체)
- **Discope 영향**: 해당 없음
