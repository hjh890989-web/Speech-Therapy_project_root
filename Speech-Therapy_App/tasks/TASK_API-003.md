---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Server Action] API-003: getWeeklyReport() DTO + 추이 그래프 데이터 계약"
labels: 'phase:p1, mode:active, domain:api, epic:f4'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-003
- **Epic / Story**: F4 주간 발달 추이 리포트 / S3
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 주간 리포트 조회 Server Action 계약. 꺾은선 그래프 + 예측 점수 + Disclaimer 데이터를 단일 페이로드로 제공. FR-Q-005 그래프 UI·FR-Q-007 PDF 생성의 SSOT.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.5 API Overview — `getWeeklyReport()` (p95 ≤ 3,000ms)
  - REQ-FUNC-027 (꺾은선 그래프 자동 생성)
  - REQ-FUNC-028 (다음 주 예상 점수 시뮬레이션)
  - REQ-FUNC-044 (회귀 모델 기반 예상 점수)
  - REQ-NF-004 (RSC 렌더 p95 ≤ 3,000ms)
- **Task 강화판**: §3-2 API-003

## ✅ Task Breakdown
- [ ] `lib/schemas/weekly-report.ts`에 Zod 입력 스키마:
  - `userId: z.string().uuid()`
  - `weekNumber: z.number().int().min(1).max(53).optional()` (생략 시 최신)
  - `year: z.number().int().min(2026).max(2100).optional()`
  - `includePrediction: z.boolean().default(true)`
- [ ] 출력 스키마:
  - `report: z.object({...})` — DB-007의 weekly_reports row와 1:1
  - `scoreTrend: z.array(z.object({date, phoneme, articulation, linguistic, acoustic, peerPercentile}))`
  - `predictedNextScore: z.number().nullable()`
  - `predictionConfidence: z.number().nullable()`
  - `weekOverWeekChange: z.number()` — 직전 주 대비 변동 (%)
  - `dataSufficiency: z.enum(['full', 'partial', 'insufficient'])` — REQ-FUNC-029 분기 키
  - `disclaimerRequired: z.literal(true)` — UI에 Disclaimer 강제
- [ ] `app/actions/weekly-report.ts`에 `'use server'` + 함수 시그니처
- [ ] 에러 enum: `INVALID_INPUT | REPORT_NOT_FOUND | INTERNAL_ERROR`
- [ ] TypeScript 타입 export

## 🧪 Acceptance Criteria
**Scenario 1: 최신 주간 리포트 조회**
- **Given**: weekNumber 생략, userId X
- **When**: `getWeeklyReport({userId})`
- **Then**: 가장 최근 (year, week) row 반환, scoreTrend 포함

**Scenario 2: 특정 주차 조회**
- **Given**: year=2026, weekNumber=22
- **When**: 호출
- **Then**: 해당 주차 row, weekOverWeekChange 직전 주 대비 계산

**Scenario 3: 데이터 부족 분기 (REQ-FUNC-029)**
- **Given**: 해당 주에 evaluation_results 0~1건
- **When**: 호출
- **Then**: dataSufficiency: 'insufficient', report: null, FR-Q-006이 긍정 메시지로 분기

**Scenario 4: 예측 비활성**
- **Given**: includePrediction: false
- **When**: 호출
- **Then**: predictedNextScore: null

**Scenario 5: Disclaimer 강제 플래그**
- **Given**: 모든 정상 응답
- **When**: OutputSchema 검증
- **Then**: `disclaimerRequired: true` 필수 (false 시 schema reject)

**Scenario 6: 잘못된 weekNumber**
- **Given**: weekNumber: 54
- **When**: 검증
- **Then**: ZodError throw (max 53)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-004**: RSC 렌더 p95 ≤ 3,000ms — 본 호출 자체 ≤ 1,000ms 목표
- **C-TEC-002**: Server Action
- **횡단 제약**:
  - [ ] CON-04 금칙어 — 응답 텍스트 필드 정규식 검증
  - [ ] **Disclaimer 강제**: `disclaimerRequired: literal(true)` 스키마 레벨 강제
  - [ ] CON-04 — scoreTrend의 phoneme 필드는 음운 표기만, 의료 표현 금지
- **R8 보호**: 단일 row 조회 + 7일치 scoreTrend JSON → 응답 ≤ 50KB

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Zod 스키마 단위 테스트
- [ ] `tsc --strict` 0 errors
- [ ] 타입 export 검증
- [ ] Disclaimer literal 검증 통과
- [ ] PR 본문에 REQ-FUNC-027/028/044 + REQ-NF-004 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-007 (weekly_reports)
- **Blocks**: FR-Q-005 (그래프 UI), FR-Q-007 (PDF), FR-C-011 (예측 호출), MOCK-003에 부분 포함
- **Discope 영향**: 해당 없음
