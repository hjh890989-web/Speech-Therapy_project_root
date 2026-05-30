---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-005: 주간 발달 추이 꺾은선 그래프 + 예측 점수 표시"
labels: 'phase:p1, mode:active, domain:fr-q, epic:f4'
assignees: ''
---

> ✅ **완료 (2026-05-30 검증).** Acceptance Criteria 6개 전부 `/reports` RSC 페이지에 구현·테스트(TEST-010 통과):
> 차트(WeeklyReportChart) · WoW delta · 예측(PredictionCard) · 데이터부족 분기(ReportEmptyState) · Disclaimer ≥2.
> **단순화 모드** 채택 — `aggregateWeeklyScores` 라이브 집계(Cron `/api/cron/weekly-reports` 는 vercel.json 스케줄).
> 폐기된 `getWeeklyReport()` Server Action stub(아무도 호출 안 함, DB-007 stored 접근 방식)은 제거함.

## 🎯 Summary
- **Task ID**: FR-Q-005
- **Epic / Story**: F4 주간 발달 추이 리포트 / S3
- **Phase**: 🟡 P1
- **Mode**: 단순화 (Sprint 1 이후 도입 — Cron 없이 사용자 진입 시 SQL 집계로 시작)
- **Discope 적용**: 해당 없음
- **목적**: VPS V09의 핵심 가치 STEP 3("62→71점 시계열 수치 증명")을 시각화. 음소별 백분위 꺾은선 + 다음 주 예상 점수로 부모의 노력 가시화 → M3 리텐션 견인.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-027 (Vercel Cron 자동 생성)
  - REQ-FUNC-028 (예상 점수 시뮬레이션, 클릭 유저 익월 유지율 +20%p)
  - REQ-NF-004 (RSC 렌더 p95 ≤ 3,000ms)
- **Task 강화판**: §3-4 FR-Q-005 (단순화 모드)
- **검토 보고서**: §3.4 (Cron 도입 전 SQL 집계로 시작)

## ✅ Task Breakdown
- [ ] `app/(dashboard)/reports/[year]/[week]/page.tsx` RSC 페이지
- [ ] 서버에서 `getWeeklyReport({userId, year, weekNumber})` 호출
- [ ] **단순화 모드 — Sprint 1 이후 즉시 도입**:
  - DB-007 weekly_reports row가 없으면 → 진입 시점에 evaluation_results를 SQL 집계 → 임시 응답 (Cron 도입 전)
  - DB-007 row 있으면 → 즉시 반환 (Cron 도입 후)
- [ ] 차트 라이브러리: Recharts (`npm i recharts`) 또는 Chart.js
- [ ] LineChart 구성:
  - x축: 일자 (7일치)
  - y축: 백분위 0~100
  - 음소별 다중 라인 (ㅅ ㅈ ㄱ 등 색상 구분)
  - 호버 시 툴팁 (날짜 + 백분위 + 점수)
- [ ] 예측 점수 표시 (FR-C-011 연결):
  - "다음 주 예상 76점" + 신뢰구간 ±5점 배지
  - 클릭 시 Vercel Analytics 이벤트 `prediction_clicked` 트래킹
- [ ] week-over-week 변동 표시: "+9점 ↑" 화살표
- [ ] Disclaimer 박스 페이지 상단 + 하단 (REQ-FUNC-013 + 본 페이지 자체 표기)
- [ ] PDF 다운로드 버튼 (FR-Q-007 연결)
- [ ] 데이터 부족 시 FR-Q-006 컴포넌트 분기 렌더

## 🧪 Acceptance Criteria
**Scenario 1: 정상 그래프 렌더 (REQ-FUNC-027)**
- **Given**: weekly_reports row + scoreTrend 7일치
- **When**: 페이지 진입
- **Then**: LineChart 렌더, 음소별 라인 표시, RSC LCP ≤ 3,000ms

**Scenario 2: 예측 클릭 트래킹 (REQ-FUNC-028)**
- **Given**: predictedNextScore 76
- **When**: 사용자 클릭
- **Then**: `prediction_clicked` 이벤트 Vercel Analytics 발송 + 시뮬레이션 페이지 이동

**Scenario 3: 데이터 부족 분기 (REQ-FUNC-029)**
- **Given**: dataSufficiency: 'insufficient'
- **When**: 진입
- **Then**: 그래프 대신 FR-Q-006의 긍정 메시지 컴포넌트 노출

**Scenario 4: week-over-week 변동**
- **Given**: 직전 주 평균 65, 이번 주 74
- **When**: 렌더
- **Then**: "+9점 ↑" 표시, 색상 초록 (음수면 부드러운 회색 — 불안 자극 회피)

**Scenario 5: 모바일 반응형**
- **Given**: 모바일 viewport
- **When**: 차트 렌더
- **Then**: 가로 스크롤 또는 축 라벨 회전, 가독성 유지

**Scenario 6: Disclaimer 노출 (REQ-FUNC-011 패턴)**
- **Given**: 페이지 렌더
- **When**: DOM 검색
- **Then**: `[data-testid="disclaimer"]` ≥ 2개

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-004**: RSC 렌더 p95 ≤ 3,000ms
- **REQ-FUNC-028 KPI**: 예측 클릭 유저 익월 유지율 ≥ 20%p ↑ (EXP-2 검증 대상)
- **C-TEC-004**: Tailwind + shadcn/ui
- **횡단 제약**:
  - [ ] CON-04 — 음소 라벨에 의료 용어 0건
  - [ ] Disclaimer ≥ 2곳 노출
  - [ ] R1 — 그래프 해석 카피에 "정상/비정상" 표현 금지
- **접근성**: 차트 aria-describedby로 텍스트 요약 제공 (시각 장애 대응)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Lighthouse 모바일 Performance ≥ 80
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] Recharts 한글 폰트 검증
- [ ] PR 본문에 REQ-FUNC-027/028/029 + REQ-NF-004 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-007 (또는 SQL 집계 폴백), API-003 (getWeeklyReport), API-010 (인증)
- **Blocks**: FR-Q-007 (PDF 생성), FR-Q-012 (예측 시뮬레이션 페이지), FR-C-011 (Gemini 예측 호출)
- **Discope 영향**: Cron 미도입 시 SQL 집계로 시작 → INFRA-002 활성화 후 weekly_reports row 활용으로 전환
