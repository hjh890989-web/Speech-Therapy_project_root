---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-026: MedicalDisclaimerFooter 전역 + /privacy /terms 링크 (의료기기법)"
labels: 'phase:p0, mode:active, domain:fr-c, epic:compliance, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-026
- **Epic / Story**: Compliance / 의료기기법 disclaimer (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 의료기기법 분류 회피의 핵심 — `MedicalDisclaimerFooter.tsx` 를 root layout 에 전역 마운트하여 모든 페이지에 "본 서비스는 의료기기가 아닙니다" 명시 + `/privacy` + `/terms` 링크 노출. diagnose result 페이지에는 추가로 3중 disclaimer (상단 + 중단 + footer).

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.7 의료기기법 분류 (자문 대기) — disclaimer 카피 표준
  - §12.5 처리방침 + 이용약관 placeholder
  - REQ-NF-028 (의료기기법 disclaimer)
  - CON-04 (의료 금칙어 무위반)
  - ADR-04 (의료 표현 회피)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-026
- **Commit**: `d05fb51` (의료기기법 footer + ConsentRedirectGate UI)

## ✅ Task Breakdown
- [x] `components/legal/MedicalDisclaimerFooter.tsx` 작성 (Server Component, no `'use client'`)
  - 카피 (§12.7 표준): "⚠️ 본 서비스는 의료기기가 아닙니다. ... 의학적 평가가 아닌 발달 안내"
  - 링크: `/privacy` (개인정보 처리방침) + `/terms` (이용약관)
- [x] `app/layout.tsx` (root) 에 마운트 — 모든 페이지 자동 노출
- [x] result 페이지 (`/diagnose/result` 또는 RSC) — 3중 disclaimer:
  1. **상단**: "본 결과는 의료적 평가가 아닌 발달 참고 자료"
  2. **중단**: "참고: 같은 월령대 데이터와 비교한 결과입니다. 의료적 평가가 아닙니다."
  3. **하단**: MedicalDisclaimerFooter (전역) 자동 노출
- [x] 카피 자체 CON-04 의료 금칙어 무위반 검증 ("치료/진단/장애/환자/병/증상/처방/병원/아프/문제아" 0건)
- [x] `4f4c845` commit — result 페이지 "진단" → "발음 확인" fix 정합
- [x] 접근성: `<footer role="contentinfo">` + `<a aria-label>` + 스크린리더 정합

## 🧪 Acceptance Criteria
**Scenario 1: 모든 페이지에 전역 footer 노출 (REQ-NF-028)**
- **Given**: 사용자가 `/`, `/diagnose`, `/missions`, `/reports`, `/settings/*` 등 접속
- **When**: 페이지 렌더
- **Then**: 하단에 MedicalDisclaimerFooter + `/privacy` + `/terms` 링크 자동 노출

**Scenario 2: result 페이지 3중 disclaimer**
- **Given**: `/diagnose/result` 또는 RSC result 노출
- **When**: 페이지 렌더
- **Then**: 상단 + 중단 + 하단 disclaimer 3건 모두 노출

**Scenario 3: CON-04 금칙어 자동 검증 무위반**
- **Given**: 본 컴포넌트 + 3중 disclaimer 카피
- **When**: pre-commit + eslint + E2E 정규식 스캔
- **Then**: "치료/진단/장애/환자/병/증상/처방/병원/아프/문제아" 0건

**Scenario 4: /privacy + /terms 링크 클릭 → 페이지 이동**
- **Given**: footer 의 두 링크
- **When**: 사용자 클릭
- **Then**: 각각 `/privacy` (PIPA §30 9 섹션) + `/terms` (약관규제법 §3 8 조) 페이지 정상 렌더

**Scenario 5: 의료기기법 분류 회피 (ADR-04 정합)**
- **Given**: 본 disclaimer 노출
- **When**: 식약처 시정 명령 risk 평가
- **Then**: "발달 가이드용 보조 도구" / "의료기기 아님" 명시 → risk mitigation

**Scenario 6: 접근성 — screen reader 정합**
- **Given**: 시각장애 user
- **When**: footer 진입
- **Then**: `<footer role="contentinfo">` + `<a aria-label="개인정보 처리방침">` 정상 announce

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-028**: 의료기기법 disclaimer 전역 노출
- **CON-04**: 본 컴포넌트 자체 의료 금칙어 무위반
- **ADR-04**: 의료 표현 회피의 핵심 UI 산출물
- **횡단 제약**:
  - [x] CON-04 의료 금칙어: 카피 자체 + pre-commit + eslint + E2E 자동 검증
  - [x] R7 PIPA 위반: `/privacy` + `/terms` 링크 제공 — 정책 접근권 보장
  - [ ] R4 개인정보: 본 컴포넌트는 PII 무관
- **자문 대기**: SRS V07 §12.7 — 식약처 "건강관리용 소프트웨어 가이드라인" 적용 여부는 변호사 자문 후

## 🏁 Definition of Done
- [x] `MedicalDisclaimerFooter` 6 scenario 통과
- [x] CON-04 자동 검증 (pre-commit + eslint + E2E)
- [x] `tsc --strict` 0 errors
- [x] root layout 마운트 검증 — 전체 페이지 노출
- [x] result 페이지 3중 disclaimer 검증
- [x] `d05fb51` commit 본문에 REQ-NF-028 + CON-04 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-018 (/privacy + /terms placeholder 페이지)
- **Blocks**: SEC-008 (의료기기법 disclaimer 전역 footer 통합), TEST-016 (diagnose-flow CON-04 검증)
- **Discope 영향**: 해당 없음
