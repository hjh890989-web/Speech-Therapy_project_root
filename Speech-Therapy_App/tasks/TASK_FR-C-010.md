---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-010: 매주 일요일 Vercel Cron weekly_reports 배치 생성"
labels: 'phase:p1, mode:active, domain:fr-c, epic:f4'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-010
- **Epic / Story**: F4 주간 발달 추이 리포트 / S3
- **Phase**: 🟡 P1
- **Mode**: 단순화 (Sprint 1 이후 도입 — 그 전엔 진입 시 SQL 집계)
- **Discope 적용**: 해당 없음 (검토 보고서 §3.4 권고대로 Cron은 P1 도입)
- **목적**: 매주 일요일 03:00 UTC에 Vercel Cron이 모든 활성 사용자의 직전 주 evaluation_results를 집계하여 weekly_reports row를 batch INSERT. F4 주간 추이 리포트의 주차별 SSOT 생성.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-027 (Vercel Cron + 꺾은선 그래프 자동 생성, p95 ≤ 3,000ms)
- **Task 강화판**: §3-5 FR-C-010 (단순화)
- **검토 보고서**: §3.4 (Cron 도입 전 SQL 집계로 시작)

## ✅ Task Breakdown
- [ ] `app/api/cron/weekly-reports/route.ts` GET 핸들러 작성
- [ ] CRON_SECRET 인증 헤더 검증 (외부 호출 차단)
- [ ] 1단계 — 활성 사용자 추출:
  - `prisma.user.findMany({where: {subscriptionTier: {in: ['basic', 'premium']}}})` (무료 사용자도 포함 가능 — 후속 결정)
- [ ] 2단계 — 사용자별 직전 주 데이터 집계:
  - `evaluation_results` WHERE userId AND createdAt BETWEEN lastWeekStart AND lastWeekEnd
  - 음소별 평균 점수 + 백분위 + 세션 카운트
- [ ] 3단계 — scoreTrend JSON 생성 (DB-007의 ScoreTrend 타입)
- [ ] 4단계 — 예측 점수 호출 (FR-C-011 — 옵션):
  - `predictNextScore(userId, scoreTrend)` Gemini 호출
- [ ] 5단계 — `prisma.weeklyReport.upsert({where: {userId_year_weekNumber: {...}}, create, update})` UPSERT
- [ ] 6단계 — 사용자별 푸시 알림 (Web Push API):
  - "주간 리포트가 준비되었어요" 메시지 + 페이지 링크
- [ ] 7단계 — 통계 로깅:
  - 처리 사용자 수, 성공/실패 카운트, 총 소요 시간
- [ ] 에러 처리:
  - 사용자별 실패 격리 (1명 실패가 전체 중단 안 되도록)
  - 5건 이상 실패 시 Slack Alert
- [ ] vercel.json cron 등록: `{"path": "/api/cron/weekly-reports", "schedule": "0 3 * * 0"}` (매주 일요일 03:00 UTC = 한국 12:00)
- [ ] 처리 시간 모니터링: 1,000명 처리 시 ≤ 60s (Vercel Pro 한도)
- [ ] **Sprint 1 이후 도입 시점 명시** — Cron 도입 전엔 FR-Q-005가 SQL 집계로 동작

## 🧪 Acceptance Criteria
**Scenario 1: Cron 정상 동작 (REQ-FUNC-027)**
- **Given**: 사용자 100명 + 직전 주 evaluation_results 누적
- **When**: Vercel Cron 자동 트리거 (또는 수동 GET + CRON_SECRET)
- **Then**: weekly_reports 100 row 생성, 응답 200 OK + `{successCount: 100, failureCount: 0, durationMs}`

**Scenario 2: CRON_SECRET 인증**
- **Given**: 잘못된 헤더
- **When**: 외부 호출
- **Then**: 401 Unauthorized

**Scenario 3: 사용자 격리 (1명 실패가 전체 중단 안 함)**
- **Given**: 사용자 100명 중 1명 데이터 손상
- **When**: 처리
- **Then**: 99명 성공 + 1명 실패 격리, Slack Alert 1회

**Scenario 4: UPSERT 멱등성**
- **Given**: 동일 주차 재실행 (Cron 재시도)
- **When**: 호출
- **Then**: row 갱신만, 중복 INSERT 안 됨

**Scenario 5: 처리 시간 ≤ 60s (Vercel Pro 한도)**
- **Given**: 1,000명 사용자
- **When**: 실행
- **Then**: durationMs < 60,000

**Scenario 6: 푸시 알림 발송**
- **Given**: 처리 완료 + 사용자 푸시 권한
- **When**: 마지막 단계
- **Then**: Web Push 1건 발송 / 사용자 (옵션 기능)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-027**: Vercel Cron + p95 ≤ 3,000ms (페이지 렌더 — 본 Cron 자체는 60s 한도)
- **REQ-NF-007**: Uptime — Cron 실패 시 다음 주 재시도
- **횡단 제약**:
  - [ ] CRON_SECRET 인증
  - [ ] 사용자 데이터 격리 (1인 실패 → 전체 영향 X)
  - [ ] G2 비용 가드 — Cron 실행 시간 모니터링 (Vercel Function 비용)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] vercel.json cron 등록 + 1회 실제 실행 검증
- [ ] CRON_SECRET 환경 변수 등록
- [ ] `tsc --strict` 0 errors
- [ ] 1,000명 시뮬레이션 부하 테스트 통과 (≤ 60s)
- [ ] PR 본문에 REQ-FUNC-027 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-007 (weekly_reports), DB-005 (evaluation_results 집계 원천), API-011 (Gemini 예측 — FR-C-011 통합), INFRA-002 (Cron 등록 인프라)
- **Blocks**: FR-Q-005 (Cron 도입 후 즉시 row 활용), FR-Q-007 (PDF), FR-Q-012 (예측 페이지)
- **Discope 영향**: 해당 없음 (Sprint 1 이후 도입, 그 전엔 SQL 집계 폴백)
