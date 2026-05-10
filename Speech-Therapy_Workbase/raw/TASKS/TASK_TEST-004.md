---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-004: 5분 체류 + Disclaimer 100% E2E (Playwright)"
labels: 'phase:p0, mode:active, domain:test, epic:f1-b, sprint:2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-004
- **Epic / Story**: F1-b 무로그인 5분 진단 / S1
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: FR-Q-001 → FR-C-001 → FR-Q-002 사용자 여정 E2E 검증. 핵심 KPI 자동화: 5분 체류 + Disclaimer 3중 노출 + 결과 페이지 도달.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-008~011 (무로그인 SSR, 5분 체류, RSC 렌더, Disclaimer 100%)
  - §5 Traceability Matrix — TC-S1-008~011
- **Task 강화판**: §3-6 TEST-004

## ✅ Task Breakdown
- [ ] `npm i -D @playwright/test` 설치
- [ ] `npx playwright install chromium`
- [ ] `playwright.config.ts` 작성:
  - `baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'`
  - projects: `chromium-mobile` (iPhone 13 viewport), `chromium-desktop`
  - `headless: true`, `retries: 2`
- [ ] `e2e/diagnosis-flow.spec.ts` 생성
- [ ] Web Speech API mocking via Playwright `page.addInitScript`:
  - `window.SpeechRecognition`을 가짜 클래스로 주입
  - `start()` 호출 시 즉시 `onresult` 트리거 + transcript "사과"
- [ ] Server Action mock: query param `?mock=success-high`로 MOCK-001 활용
- [ ] 시나리오:
  - 1. 무로그인 `/diagnose` 진입 → SSR 렌더 + LCP ≤ 1.5s
  - 2. 입력 폼 input 카운트 ≤ 3
  - 3. 월령(36) + 음소(ㅅ) 입력 → "발화 시작" 클릭
  - 4. Mock SpeechRecognition 트리거 → transcript "사과"
  - 5. Server Action 호출 → 결과 페이지 이동
  - 6. 결과 페이지 진입 시각 - 진단 시작 시각 ≤ 300초
  - 7. `[data-testid="disclaimer"]` 3개 발견 + 모두 visible
  - 8. 금칙어 정규식 페이지 텍스트 스캔 → 0건
- [ ] CI: GitHub Actions 또는 Vercel CI에서 Preview URL 대상 자동 실행
- [ ] HTML 리포트 아티팩트 저장 (실패 시 디버그)

## 🧪 Acceptance Criteria
**Scenario 1: 5분 체류 (REQ-FUNC-009)**
- **Given**: 사용자 `/diagnose` 진입 시점 t0
- **When**: 결과 페이지 도달 시점 t1
- **Then**: t1 - t0 ≤ 300,000ms (300초)

**Scenario 2: Disclaimer 3중 노출 (REQ-FUNC-011)**
- **Given**: 결과 페이지 렌더 완료
- **When**: `page.locator('[data-testid="disclaimer"]').count()`
- **Then**: 3 반환, 각 요소 `isVisible()` true

**Scenario 3: 입력 폼 ≤ 3 항목 (REQ-FUNC-008)**
- **Given**: `/diagnose` 진입
- **When**: 폼 input 카운트
- **Then**: ≤ 3 (월령, 음소, 동의 체크)

**Scenario 4: 금칙어 0건 (REQ-FUNC-013)**
- **Given**: 결과 페이지
- **When**: 페이지 텍스트 정규식 `/(진단|장애|치료|환자)/`
- **Then**: 0건

**Scenario 5: 모바일 + 데스크톱 양쪽 통과**
- **Given**: 두 projects
- **When**: 전체 시나리오 실행
- **Then**: 양쪽 PASS

**Scenario 6: SSR LCP (REQ-FUNC-010)**
- **Given**: 첫 페이지 로드
- **When**: Performance API 측정
- **Then**: LCP ≤ 1,500ms (Vercel Pro 환경 기준)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-009**: 5분 체류 ≤ 300초
- **REQ-FUNC-010**: RSC LCP p95 ≤ 1,500ms
- **REQ-FUNC-011**: Disclaimer 100% — 3개 모두 visible
- **횡단 제약 검증**:
  - [ ] CON-04 금칙어 — 페이지 텍스트 정규식 스캔 0건
  - [ ] Disclaimer 가시성 — `isVisible()` + `data-testid` 명시

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Playwright HTML Report 생성
- [ ] 모바일 + 데스크톱 양쪽 PASS
- [ ] `tsc --strict` 0 errors
- [ ] Vercel Preview 자동 실행 통합
- [ ] PR 본문에 REQ-FUNC-008~013 + TC-S1-008~011 매핑
- [ ] 실패 시 스크린샷 + trace 자동 저장

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-001, FR-Q-002, FR-C-001, MOCK-001, INFRA-001 (Preview URL)
- **Blocks**: Sprint 1 합격 게이트
- **Discope 영향**: 해당 없음
