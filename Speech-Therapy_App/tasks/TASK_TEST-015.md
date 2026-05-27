---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-015: e2e/consent-flow.spec.ts PIPA 5중 가드 E2E (chromium-desktop + Pixel 5) 20/20 PASS"
labels: 'phase:p0, mode:active, domain:test, epic:pipa-5-guard, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-015
- **Epic / Story**: PIPA 5중 가드 E2E 검증 (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done (본 sub-session 2026-05-27)
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음 (E2E 필수 — ADR-16 binding 메커니즘 검증)
- **목적**: ADR-16 PIPA 5중 가드 (UI 1층 + Server Action 4층) 의 전체 흐름 E2E 검증. Playwright `chromium-desktop` + `chromium-mobile Pixel 5` 두 프로젝트로 **20/20 PASS** 달성 — 미동의 인증 user redirect / 익명 user boolean 가드 / graceful fallback 3축 검증.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.4 ADR-16 PIPA 5중 가드 (1층 UI + 2~5층 Server Action)
  - §12.4.6 가드 매트릭스
  - REQ-NF-029 PIPA 5중 가드 (NF 핵심)
  - §5.8 RTM — TC-PIPA-001~005
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §3 TEST-015
- **선행 구현**: FR-C-019~024 (ConsentRedirectGate + Server Action 4층)

## ✅ Task Breakdown
- [x] `e2e/consent-flow.spec.ts` 작성:
  - test 1 — 미동의 인증 user `/diagnose` 진입 → `/settings/privacy-consent` redirect 검증
  - test 2 — 미동의 인증 user `/missions` 진입 → redirect 검증
  - test 3 — 미동의 인증 user `/` (홈) 진입 → 허용 검증
  - test 4 — 미동의 인증 user `/privacy` 진입 → 허용 (정책 검토)
  - test 5 — 동의 완료 인증 user `/diagnose` 정상 진입
  - test 6 — 익명 user `/diagnose` 진입 시 두 체크박스 disabled 검증
  - test 7 — 익명 user 두 체크박스 클릭 후 "결과 확인" enable 검증
  - test 8 — 익명 user 미체크 상태 analyzeDiagnosis 호출 시 ConsentRequiredError 검증
  - test 9 — 인증 user updateChildProfile 미동의 graceful (`reason: "consent_required"`)
  - test 10 — 인증 user generateCushion 미동의 SAFE_CUSHION_FALLBACK 반환
- [x] `playwright.config.ts` 두 프로젝트 등록:
  - `chromium-desktop` (1920x1080)
  - `chromium-mobile` (Pixel 5 devicedescriptor)
- [x] 각 test 두 프로젝트 동시 실행 → **20 = 10 test × 2 device**
- [x] CI/CD (GHA) workflow 등록 — main push 시 자동 실행
- [x] 본 sub-session 마감 시점 20/20 PASS 검증 완료

## 🧪 Acceptance Criteria (BDD/GWT — REQ-FUNC G/W/T 인용)
**Scenario 1: 1층 UI 가드 — 미동의 인증 user redirect (REQ-NF-029)**
- **Given**: 인증 user, `pipaUnderageConsentAt=NULL`
- **When**: `/diagnose` 진입
- **Then**: `/settings/privacy-consent` 로 302 redirect, URL 검증 PASS

**Scenario 2: 2층 — 익명 boolean 가드 (REQ-NF-029)**
- **Given**: 익명 user, `pipaUnderageConsent=false`
- **When**: analyzeDiagnosis Server Action 호출
- **Then**: `ConsentRequiredError` throw, UI 에 "동의 필요" 메시지 노출

**Scenario 3: 3층 graceful — updateChildProfile 미동의**
- **Given**: 인증 user 미동의
- **When**: 자녀 정보 수정 시도
- **Then**: graceful response `{success: false, reason: "consent_required"}` 반환, throw 없음

**Scenario 4: 4층 fallback — generateCushion 미동의 (Gemini 미호출)**
- **Given**: 인증 user 미동의
- **When**: 쿠션 텍스트 요청
- **Then**: SAFE_CUSHION_FALLBACK (기본 안전 문구) 반환, Gemini API 호출 0건 (국외 이전 미발생)

**Scenario 5: 5층 — 익명 user analyzeDiagnosis 두 boolean 모두 true 검증**
- **Given**: 익명 user, `pipaUnderageConsent=true`, `overseasTransferConsent=false`
- **When**: analyzeDiagnosis 호출
- **Then**: ConsentRequiredError (overseas 미동의)

**Scenario 6: 모바일 (Pixel 5) — iOS Safari ITP cookie 우회 검증**
- **Given**: chromium-mobile Pixel 5 device
- **When**: anonymous_user_id cookie + localStorage 양쪽 저장
- **Then**: 7일 후에도 localStorage 권위로 식별 유지 (TEST-018 와 연동)

**Scenario 7: 정책 페이지 허용 검증**
- **Given**: 미동의 인증 user
- **When**: `/privacy`, `/terms`, `/settings/account` 진입
- **Then**: redirect 없이 200 정상 표시 (GDPR 잊혀질 권리)

**Scenario 8: 20/20 PASS 회귀 보호**
- **Given**: PR 푸시 시 GHA workflow
- **When**: e2e/consent-flow.spec.ts 실행 (두 device)
- **Then**: 20 test 모두 PASS, 1건 실패 시 PR merge 차단

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-029**: PIPA 5중 가드 (ADR-16) — 본 task 의 핵심 검증
- **REQ-NF-034**: 오진 치명 수정률 < 0.5% (간접 기여)
- **횡단 제약**:
  - [x] **R4 개인정보**: E2E test fixture 에 실제 자녀 정보 0건 (mock 데이터만)
  - [x] **CON-04 금칙어**: test 페이로드/assertion 에 의료 금칙어 0건
  - [x] **Disclaimer**: redirect 후 페이지에 의료기기법 disclaimer 노출 검증
  - [x] **G2 비용**: GHA workflow 무료 한도 내 (2,000분/월)

## 🏁 Definition of Done
- [x] 10 test × 2 device = 20/20 PASS (본 sub-session 검증)
- [x] `playwright.config.ts` 두 프로젝트 정의
- [x] GHA workflow `e2e.yml` 자동 실행
- [x] consent-flow 회귀 보호 PR 차단 룰 적용
- [x] `tsc --strict` 0 errors (test 파일 포함)
- [x] PR 본문에 REQ-NF-029 + ADR-16 + TC-PIPA-001~005 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-019 (ConsentRedirectGate), FR-C-020 (useAnonymousConsent), FR-C-021 (PrivacyConsentForm), FR-C-022~024 (Server Action 2~4층), SEC-009 (5중 가드 통합)
- **Blocks**: (없음 — 본 task 는 final 검증) — SEC-009 의 ✅ Done 도장의 evidence
- **Discope 영향**: 해당 없음
