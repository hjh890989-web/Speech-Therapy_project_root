---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Security] SEC-008: 의료기기법 disclaimer 전역 footer + /privacy + /terms + CON-04 금칙어 무위반"
labels: 'phase:p0, mode:active, domain:sec, epic:medical-disclaimer, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: SEC-008
- **Epic / Story**: 의료기기법 disclaimer (V07 핵심 신규)
- **Phase**: 🟢 P0 → ✅ Done (`d05fb51`)
- **Mode**: 명세대로 (의료기기법 + CON-04)
- **Discope 적용**: 해당 없음
- **목적**: 한국 의료기기법 위반 risk (의료적 판단으로 오인되는 표현) 차단을 위해 `MedicalDisclaimerFooter` 전역 footer + `/privacy` + `/terms` 링크 + result 페이지 3중 disclaimer + ADR-04 CON-04 금칙어 (`치료/진단/장애`) 무위반 정책. 5중 가드의 4축.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.7 의료기기법 disclaimer 의무
  - REQ-NF-028 (disclaimer 100% 노출)
  - CON-04 금칙어 (`치료/진단/장애`)
  - ADR-04 (Disclaimer 정책)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-B SEC-008
- **Commit**: `d05fb51` (MedicalDisclaimerFooter + ConsentRedirectGate)
- **코드**:
  - `components/MedicalDisclaimerFooter.tsx`
  - `app/(public)/privacy/page.tsx` (placeholder)
  - `app/(public)/terms/page.tsx` (placeholder)

## ✅ Task Breakdown
- [x] `components/MedicalDisclaimerFooter.tsx` — 전역 footer 컴포넌트:
  - 카피: "본 서비스는 의료적 판단을 제공하지 않으며, 부모 정보 제공용 보조 도구입니다."
  - `/privacy` + `/terms` 링크
  - 모든 페이지의 layout 에 마운트
- [x] `app/(public)/layout.tsx` 의 RSC 에 footer 마운트 (모든 public 페이지 적용)
- [x] `app/(authed)/layout.tsx` 에도 마운트 (인증 영역 동일)
- [x] result 페이지 3중 disclaimer — 상단 배지 + 본문 박스 + footer
- [x] `/privacy` placeholder 페이지 (PIPA §30 9 섹션 골격) — FR-Q-018 의존
- [x] `/terms` placeholder 페이지 (약관규제법 §3 8 조 골격) — FR-Q-018 의존
- [x] CON-04 금칙어 사전 검증:
  - pre-commit hook (husky + lint-staged)
  - ESLint custom rule `no-medical-terms`
  - e2e 검증 (TEST-016)
- [x] `4f4c845` 의 result 페이지 카피 정정 ("진단" → "발음 확인")

## 🧪 Acceptance Criteria
**Scenario 1: 전역 footer 100% 노출 (REQ-NF-028)**
- **Given**: 모든 페이지 (public + authed)
- **When**: 페이지 로드
- **Then**: footer 의 disclaimer 카피 + `/privacy` + `/terms` 링크 가시

**Scenario 2: CON-04 금칙어 자동 차단 (`4f4c845`)**
- **Given**: 코드/카피에 "치료/진단/장애" 포함 시도
- **When**: `git commit` (pre-commit hook)
- **Then**: lint-staged 가 차단 + 에러 메시지 + commit 불가

**Scenario 3: result 페이지 3중 disclaimer**
- **Given**: 진단 결과 페이지 렌더링
- **When**: 사용자가 결과 확인
- **Then**: 상단 배지 + 본문 박스 + footer 3개 disclaimer 모두 가시

**Scenario 4: /privacy + /terms placeholder 정합**
- **Given**: footer 의 `/privacy` 또는 `/terms` 링크 클릭
- **When**: 페이지 진입
- **Then**: placeholder 콘텐츠 + "정식 자문 후 교체 예정" 안내 + OPS-004 매핑

**Scenario 5: TEST-016 e2e CON-04 무위반 (`4f4c845`)**
- **Given**: 전체 사이트 크롤 + 정규식 검사
- **When**: Playwright e2e `diagnose-flow.spec.ts` 실행
- **Then**: 코드 산출물 + DOM 어디에도 "치료/진단/장애" 0건

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-028**: disclaimer 100% 노출 — 모든 페이지 footer + result 페이지 3중
- **법적 risk**: 의료기기법 위반 = 시정명령 + 제품 회수 + 형사처벌
- **횡단 제약**:
  - [x] CON-04 금칙어: 본 task 의 핵심 — `치료/진단/장애` 절대 금지
  - [x] CON-05 5중 가드: 본 SEC-008 = 4축 (의료기기법)
  - [x] R4 개인정보: 영유아 의료 표현 0건
  - [x] ADR-04 Disclaimer 정책
- **금칙어 alternative**: "발음 발달 확인", "발음 가이드", "발음 어려움" (AGENTS.md §2.1)

## 🏁 Definition of Done
- [x] `MedicalDisclaimerFooter` 전역 footer 마운트 검증 (모든 public + authed 페이지)
- [x] result 페이지 3중 disclaimer 검증
- [x] `/privacy` + `/terms` placeholder 렌더링 검증
- [x] CON-04 금칙어 0건 자동 (pre-commit + lint + e2e)
- [x] TEST-016 PASS (`4f4c845` 후속)
- [x] PR `d05fb51` + `4f4c845` 본문에 REQ-NF-028 + CON-04 + ADR-04 매핑
- [x] OPS-004 매핑 명시 (정식 교체 의뢰 대기)

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-026 (`MedicalDisclaimerFooter` 컴포넌트), FR-Q-018 (`/privacy` + `/terms` placeholder)
- **Blocks**: SEC-009 (5중 가드 통합), TEST-016 (e2e), OPS-004 (정식 교체)
- **Discope 영향**: 해당 없음
