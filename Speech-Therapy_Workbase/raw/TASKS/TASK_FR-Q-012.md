---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-012: 다음 주 예상 점수 + 신뢰구간 시각화"
labels: 'phase:p1, mode:active, domain:fr-q, epic:f18'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-012
- **Epic / Story**: F18 예측 시뮬레이션 / S3
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 다음 주 예상 점수와 신뢰구간을 별도 시뮬레이션 페이지에서 시각화. EXP-2(M3 리텐션 ≥ 40%) 핵심 검증 대상. "예측 클릭 유저 익월 유지율 +20%p" 가설.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-028 (Gemini 예상 점수 시뮬레이션)
  - REQ-FUNC-044 (회귀 모델 기반 다음 주 예상 점수 + 신뢰구간)
  - §6.6 EXP-2 (예측 시뮬레이션 → M3 리텐션)
- **Task 강화판**: §3-4 FR-Q-012

## ✅ Task Breakdown
- [ ] `app/(dashboard)/predictions/page.tsx` Server Component
- [ ] FR-C-011의 `predictNextScore` Server Action 호출
- [ ] 예측 결과 시각화:
  - 메인 카드: "다음 주 예상 평균 76점" (큰 숫자 + Tailwind text-6xl)
  - 신뢰구간 시각화: 76 ± 5 → 71 ~ 81 범위 막대그래프
  - "지금 점수 67 → 예상 76 = +9점 향상" 향상 폭 표시
- [ ] 시뮬레이션 슬라이더 (선택):
  - "주 5회 미션 시 예상" / "주 3회 미션 시 예상" 토글 (회귀 모델 입력 변경)
- [ ] CTA: "이번 주 미션 시작" → `/missions` 이동
- [ ] Vercel Analytics 이벤트:
  - `prediction_page_viewed`
  - `prediction_cta_clicked` (EXP-2 핵심 지표)
- [ ] 데이터 부족 시 FR-Q-006 EmptyState 분기
- [ ] Disclaimer ≥ 2곳 노출 (예측은 보장 아님 명시)

## 🧪 Acceptance Criteria
**Scenario 1: 예측 점수 + 신뢰구간 표시 (REQ-FUNC-044)**
- **Given**: predictedNextScore: 76, confidence: 0.85
- **When**: 페이지 진입
- **Then**: "76점" + "71~81 범위" 막대그래프 + 신뢰도 85% 표시

**Scenario 2: 향상 폭 계산**
- **Given**: 현재 평균 67, 예측 76
- **When**: 렌더
- **Then**: "+9점 향상 예상" 카피 + 초록 화살표 ↑

**Scenario 3: CTA 클릭 트래킹 (EXP-2 핵심)**
- **Given**: 예측 페이지
- **When**: "미션 시작" 클릭
- **Then**: `prediction_cta_clicked` 이벤트 발송 + `/missions` 리다이렉트

**Scenario 4: 데이터 부족 분기**
- **Given**: weekly_reports row 없음
- **When**: 진입
- **Then**: FR-Q-006 EmptyState 컴포넌트 노출

**Scenario 5: Disclaimer 강제**
- **Given**: 페이지 렌더
- **When**: DOM 검색
- **Then**: "예측은 보장이 아닙니다" Disclaimer ≥ 2곳

**Scenario 6: 시뮬레이션 슬라이더**
- **Given**: 슬라이더 "주 5회" → "주 3회" 변경
- **When**: 토글
- **Then**: predictedNextScore 재계산 (Gemini 재호출 또는 사전 캐시)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-044**: 예상 점수 + 신뢰구간 표시
- **EXP-2 KPI**: 클릭 유저 M3 리텐션 ≥ 40%
- **횡단 제약**:
  - [ ] **R1 의료 규제**: "예측은 보장이 아닙니다" Disclaimer 강제
  - [ ] CON-04 — "치료 효과" 등 의료 표현 금지, "발달 향상" 등 중립 표현
  - [ ] G5 Rate Limiter — 슬라이더 시뮬 시 Gemini 호출 빈도 제한
- **접근성**: 신뢰구간 막대 aria-describedby로 텍스트 요약

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Lighthouse 모바일 Performance ≥ 80
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] Vercel Analytics 2종 이벤트 발송 검증
- [ ] EXP-2 측정용 코호트 추적 활성
- [ ] PR 본문에 REQ-FUNC-028/044 + EXP-2 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-003 (getWeeklyReport — predictedNextScore 포함), FR-C-011 (Gemini 예측), API-011 (Gemini 어댑터), INFRA-005 (Analytics)
- **Blocks**: EXP-2 검증 인프라
- **Discope 영향**: 해당 없음
