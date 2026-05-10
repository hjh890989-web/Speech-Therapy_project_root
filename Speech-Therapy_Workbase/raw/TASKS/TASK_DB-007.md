---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-007: weekly_reports 테이블 (주간 추이 + 예측 점수)"
labels: 'phase:p1, mode:active, domain:db, epic:f4'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-007
- **Epic / Story**: F4 주간 발달 추이 리포트 / S3
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 매주 일요일 Vercel Cron 배치로 생성되는 사용자별 주간 집계 결과(꺾은선 그래프 데이터, 예측 다음 주 점수)를 저장. F4 주간 추이 그래프(FR-Q-005)·예측 시뮬레이션(FR-C-011)의 데이터 원천.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §6.1 ERD `weekly_reports` (id, user_id, week_number, score_trend jsonb, predicted_next_score, generated_at)
  - REQ-FUNC-027 (Vercel Cron 자동 생성 + 꺾은선 그래프)
  - REQ-FUNC-028 (다음 주 예상 점수 시뮬레이션)
  - REQ-FUNC-044 (회귀 모델 기반 예측)
  - REQ-NF-004 (RSC 렌더 p95 ≤ 3,000ms)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-1 DB-007

## ✅ Task Breakdown
- [ ] `WeeklyReport` 모델 정의
- [ ] 필드: `id String @id @default(uuid())`, `userId String`, `weekNumber Int` (ISO 8601 주차), `year Int`, `scoreTrend Json` (배열 7일치 음소별 점수), `predictedNextScore Float?`, `predictionConfidence Float?` (회귀 신뢰구간), `articulationAvg Float`, `linguisticAvg Float`, `acousticAvg Float`, `peerPercentileAvg Float`, `sessionCount Int`, `generatedAt DateTime @default(now())`
- [ ] FK: `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
- [ ] 복합 unique: `@@unique([userId, year, weekNumber])` — 사용자당 주차별 1 row 보장
- [ ] 인덱스: `@@index([userId, generatedAt])` (최신 리포트 조회)
- [ ] `scoreTrend` JSON 스키마 정의 (TypeScript 타입):
  ```ts
  type ScoreTrend = {
    date: string; // ISO 8601 day
    phoneme: string;
    articulation: number;
    linguistic: number;
    acoustic: number;
    peerPercentile: number;
  }[]
  ```
- [ ] 마이그레이션 `npx prisma migrate dev --name add_weekly_reports`
- [ ] 헬퍼 함수 `lib/weekly-report.ts`에 `getCurrentWeekNumber()`, `aggregateWeeklyScores(userId, year, week)` 작성

## 🧪 Acceptance Criteria
**Scenario 1: 주간 리포트 INSERT (REQ-FUNC-027)**
- **Given**: 사용자 X의 주차 W에 7일치 evaluation_results 5건
- **When**: `aggregateWeeklyScores(X, year, W)` 후 `prisma.weeklyReport.create({data})`
- **Then**: row 생성, scoreTrend 5개 entry, 평균 4종(articulationAvg 등) 계산 정확

**Scenario 2: 동일 주차 중복 INSERT 차단**
- **Given**: 이미 존재하는 (userId, year, weekNumber) 조합
- **When**: 재 INSERT 시도
- **Then**: Prisma `P2002` Unique constraint 에러 → upsert 패턴으로 갱신

**Scenario 3: 인덱스 활용 — 최신 리포트 조회**
- **Given**: 사용자 1명에 24주 리포트 누적
- **When**: `findFirst({where: {userId}, orderBy: {generatedAt: 'desc'}})`
- **Then**: 응답 ≤ 50ms, 인덱스 EXPLAIN 확인

**Scenario 4: scoreTrend JSON 구조 검증**
- **Given**: 임의 ScoreTrend 객체
- **When**: Zod schema로 검증 (Server Action 진입 시)
- **Then**: 7개 필드(date, phoneme, articulation, linguistic, acoustic, peerPercentile) 모두 존재

**Scenario 5: 데이터 부족 처리 (REQ-FUNC-029 연결)**
- **Given**: 해당 주에 evaluation_results 0건
- **When**: 집계 호출
- **Then**: `null` 반환, 리포트 미생성 (FR-Q-006이 긍정 메시지로 분기)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-004**: RSC 렌더 ≤ 3,000ms — 본 테이블 조회 ≤ 500ms 목표
- **횡단 제약 — JSON 스키마**: scoreTrend 구조 변경 시 마이그레이션 가이드 작성 필수 (Zod 버전 관리)
- **R8 Supabase Free**: row 단위 작음 (≤ 1KB) — 1,000 MAU × 52주 = 52,000 row × 1KB ≈ 52MB. 1GB 무료 티어 내
- **G2 비용 가드**: 본 테이블 자체는 비용 영향 미미. Cron 실행 비용은 INFRA-002 책임

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 마이그레이션 성공 + Prisma Client 타입 갱신
- [ ] `tsc --strict` 0 errors
- [ ] FK Cascade 동작 검증 (User 삭제 시 weekly_reports 함께 삭제)
- [ ] 인덱스 EXPLAIN으로 사용 확인
- [ ] scoreTrend JSON Zod 스키마 단위 테스트
- [ ] ERD §6.1 모든 컬럼 매핑 + 추가 컬럼(prediction_confidence, *_avg, session_count) 문서화

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001, DB-002 (User FK), DB-005 (집계 원천 evaluation_results)
- **Blocks**: API-003 (getWeeklyReport 조회), FR-Q-005 (그래프 UI), FR-C-010 (Cron 배치 생성), FR-C-011 (Gemini 예측), FR-Q-007 (PDF 생성)
- **Discope 영향**: 해당 없음
