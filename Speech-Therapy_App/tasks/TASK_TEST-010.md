---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-010: 주간 Cron 리포트 생성 + RSC p95 ≤ 3,000ms 통합 테스트"
labels: 'phase:p1, mode:active, domain:test, epic:f4'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-010
- **Epic / Story**: F4 주간 추이 리포트 / S3
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: FR-C-010(Vercel Cron) + FR-Q-005/006(RSC) + FR-Q-007(PDF) 통합 테스트. 1,000명 사용자 시뮬 + p95 ≤ 3,000ms + 데이터 부족 분기 + 멱등성 검증.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-027 (주간 Cron + 그래프 자동 생성)
  - REQ-FUNC-029 (데이터 부족 처리)
  - REQ-NF-004 (RSC p95 ≤ 3,000ms)
  - §5 Traceability — TC-S3-001~003
- **Task 강화판**: §3-6 TEST-010

## ✅ Task Breakdown
- [ ] `__tests__/integration/weekly-report-flow.test.ts`
- [ ] Mock 설정:
  - SQLite in-memory (Cron 검증용)
  - Mock Gemini (FR-C-011 예측 호출)
- [ ] 시나리오:
  - 1: 100명 사용자 + 7일치 evaluation_results → Cron 실행 → weekly_reports 100 row INSERT
  - 2: 멱등성 — 동일 주차 재실행 → 중복 INSERT 0
  - 3: 데이터 부족 사용자 분기 — evaluation_results 0건 → row 미생성
  - 4: 사용자별 격리 — 1명 실패 → 99명 성공 + Slack Alert
  - 5: 처리 시간 — 1,000명 ≤ 60초
  - 6: RSC 페이지 렌더 — DB-007 row 활용 시 p95 ≤ 3,000ms (Playwright LCP)
  - 7: 데이터 부족 시 FR-Q-006 EmptyState 분기
  - 8: PDF 다운로드 — jsPDF 클라이언트 측 정상 동작
- [ ] CRON_SECRET 인증 검증
- [ ] Slack Alert 발송 검증 (5건+ 실패 시)
- [ ] 푸시 알림 발송 검증 (옵션 — Mock)

## 🧪 Acceptance Criteria
**Scenario 1: 8개 시나리오 통과**
- **Given**: FR-C-010 + FR-Q-005/006/007 구현
- **When**: `npm run test`
- **Then**: 8/8 PASS

**Scenario 2: Cron 처리 시간 ≤ 60초**
- **Given**: 1,000명 시뮬
- **When**: Cron 실행
- **Then**: durationMs < 60,000

**Scenario 3: RSC p95 ≤ 3,000ms (REQ-NF-004)**
- **Given**: weekly_reports row 존재
- **When**: 페이지 진입 (Playwright)
- **Then**: LCP p95 ≤ 3,000ms

**Scenario 4: 멱등성 (UPSERT)**
- **Given**: 동일 (userId, year, week) 재실행
- **When**: Cron
- **Then**: row 갱신만, 중복 0

**Scenario 5: 데이터 부족 분기 (REQ-FUNC-029)**
- **Given**: 사용자 X 평가 0건
- **When**: 진입
- **Then**: FR-Q-006 EmptyState 노출

**Scenario 6: PDF 다운로드 (REQ-FUNC-035)**
- **Given**: weekly_reports row + Playwright
- **When**: PDF 버튼 클릭
- **Then**: 파일 다운로드 1건 + 한글 정상

**Scenario 7: 격리 — 1명 실패가 전체 영향 X**
- **Given**: 100명 중 1명 데이터 손상
- **When**: Cron
- **Then**: 99명 성공 + Slack Alert 1회

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-027/029**: Cron + 데이터 부족 처리
- **REQ-NF-004**: RSC p95 ≤ 3,000ms
- **격리**: 실제 Vercel Cron 호출 0건 (in-memory)
- **횡단 제약**:
  - [ ] CRON_SECRET 검증
  - [ ] 사용자 데이터 격리

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 8/8 시나리오 통과
- [ ] 1,000명 부하 시뮬 통과
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-027/029/035 + REQ-NF-004 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-010, FR-Q-005, FR-Q-006, FR-Q-007, DB-007, API-003
- **Blocks**: P1 합격 게이트
- **Discope 영향**: 해당 없음
