---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-016: e2e/diagnose-flow.spec.ts — 의료기기법 disclaimer 100% + CON-04 금칙어 0건 자동"
labels: 'phase:p0, mode:active, domain:test, epic:medical-device-act, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-016
- **Epic / Story**: 의료기기법 disclaimer + CON-04 금칙어 자동 검증 (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done (`4f4c845` — result 페이지 "진단" → "발음 확인" fix)
- **Mode**: 명세대로 + 3중 검출 (pre-commit + eslint + e2e)
- **Discope 적용**: 해당 없음
- **목적**: §12.7 의료기기법 정합 — MedicalDisclaimerFooter 전역 footer 100% 노출 검증 + result 페이지 3중 disclaimer 검증 + AGENTS.md §2.1 의 CON-04 금칙어 ("치료" / "진단" / "장애" / "환자" / "병" / "증상" / "처방" / "병원" / "아프" / "문제아") **0건 자동 검출** (pre-commit hook + eslint custom rule + e2e regex scan 3중).

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.7 의료기기법 분류 (자문 대기)
  - REQ-FUNC-011 Disclaimer 100% 노출
  - REQ-FUNC-013 금칙어 0건 (정규식 스캔)
  - CON-04 의료 용어 하드코딩 배제
  - ADR-04 (의료 용어 배제)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §3 TEST-016
- **AGENTS.md §2.1**: 금칙어 정책

## ✅ Task Breakdown
- [x] `e2e/diagnose-flow.spec.ts` 작성:
  - test 1 — `/` (홈) 진입 시 MedicalDisclaimerFooter visible 검증
  - test 2 — `/diagnose` 결과 페이지 진입 시 3중 disclaimer 검증 (상단 "의료적 평가 아님" + 중단 "또래 비교는 의료 평가 아님" + 하단 footer)
  - test 3 — `/reports/[id]` 페이지 disclaimer visible
  - test 4 — `/privacy` + `/terms` 페이지 footer visible
  - test 5 — result 페이지 HTML 전체 regex scan — 금칙어 10종 0건 검증
- [x] `.husky/pre-commit` 금칙어 scanner — `scripts/check-forbidden-terms.ts`:
  - app/* + components/* 전체 .tsx/.ts 의 string literal scan
  - 금칙어 발견 시 commit block (exit 1)
- [x] `eslint.config.mjs` custom rule `no-medical-terms`:
  - JSXText + StringLiteral node 검사
  - 금칙어 발견 시 ESLint error
- [x] result 페이지 "진단" → "발음 확인" CR-2026-004 마이너 fix 검증 (`4f4c845` 의 evidence)
- [x] GHA workflow `e2e.yml` 에 본 spec 포함, main push 시 회귀 보호

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: MedicalDisclaimerFooter 100% 노출 (REQ-FUNC-011)**
- **Given**: 사용자 모든 페이지 진입 (`/`, `/diagnose`, `/reports`, `/missions`, `/settings/*`)
- **When**: 페이지 렌더링
- **Then**: footer `"⚠️ 본 서비스는 의료기기가 아닙니다"` text visible (100% 노출률)

**Scenario 2: result 페이지 3중 disclaimer**
- **Given**: 진단 완료 후 result 페이지
- **When**: 페이지 렌더링
- **Then**: 3개 disclaimer 모두 visible (상단/중단/하단)

**Scenario 3: 금칙어 0건 검출 (REQ-FUNC-013)**
- **Given**: app/* + components/* 전체 코드베이스
- **When**: `scripts/check-forbidden-terms.ts` 실행
- **Then**: 금칙어 10종 ("치료/진단/장애/환자/병/증상/처방/병원/아프/문제아") 0건 검출, exit 0

**Scenario 4: pre-commit hook 차단**
- **Given**: 개발자가 "이 결과는 진단입니다" 텍스트 추가 후 commit
- **When**: `git commit` 실행
- **Then**: pre-commit hook 차단, 에러 "CON-04 violation: forbidden term '진단' in app/diagnose/page.tsx:42"

**Scenario 5: ESLint custom rule**
- **Given**: JSX 에 `<p>치료 효과</p>` 작성
- **When**: `pnpm lint`
- **Then**: ESLint error `no-medical-terms: '치료' is a forbidden medical term`

**Scenario 6: CR-2026-004 정합 검증**
- **Given**: result 페이지 ("진단" → "발음 확인" 으로 교체된 commit `4f4c845`)
- **When**: e2e regex scan
- **Then**: result 페이지에 "진단" 0건, "발음 확인" present

**Scenario 7: 회귀 보호 — PR 차단**
- **Given**: PR 가 금칙어 1건 포함
- **When**: GHA workflow `e2e.yml` 실행
- **Then**: e2e fail → PR merge 차단

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-011**: Disclaimer 100% 노출률
- **REQ-FUNC-013**: 금칙어 0건 (정규식 스캔, 발견 시 렌더링 차단)
- **REQ-NF-028**: 의료기기법 정합 (Disclaimer 강화)
- **CON-04**: 의료 용어 하드코딩 배제 (3중 검출 — pre-commit + eslint + e2e)
- **ADR-04**: 의료 용어 배제 정책
- **횡단 제약**:
  - [x] **R4**: test fixture 에 자녀 식별 정보 0건
  - [x] **Disclaimer**: 본 task 자체가 disclaimer 검증
  - [x] **G2**: GHA 무료 한도 내

## 🏁 Definition of Done
- [x] `e2e/diagnose-flow.spec.ts` PASS (chromium-desktop + Pixel 5)
- [x] `scripts/check-forbidden-terms.ts` pre-commit hook 동작
- [x] `eslint.config.mjs` custom rule `no-medical-terms` 등록
- [x] result 페이지 CR-2026-004 적용 (`4f4c845`)
- [x] 3중 검출 (pre-commit + eslint + e2e) 모두 동작 검증
- [x] `tsc --strict` 0 errors
- [x] PR `4f4c845` 본문에 CON-04 + REQ-FUNC-011/013 + ADR-04 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-026 (MedicalDisclaimerFooter), FR-C-005 (금칙어 검증 helper), FR-Q-018 (`/privacy` + `/terms`)
- **Blocks**: (없음) — SEC-008 의 ✅ Done evidence
- **Discope 영향**: 해당 없음
