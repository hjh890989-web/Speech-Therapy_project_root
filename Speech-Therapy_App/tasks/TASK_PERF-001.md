---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Performance] PERF-001: Server Action k6 부하 테스트 (analyzeDiagnosis p95 ≤ 800ms)"
labels: 'phase:p1, mode:active, domain:perf, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: PERF-001
- **Epic / Story**: Foundation 성능 검증
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 핵심 Server Action 3종(`analyzeDiagnosis`, `getCurriculum`, `getWeeklyReport`)의 p95 임계치를 k6 부하 테스트로 자동화. CI 통합으로 회귀 즉시 발각.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-NF-001 (analyzeDiagnosis p95 ≤ 800ms)
  - REQ-NF-004 (getWeeklyReport RSC p95 ≤ 3,000ms)
  - REQ-NF-006 (원아 일괄 파싱 p95 ≤ 3,000ms)
- **Task 강화판**: §3-7 PERF-001

## ✅ Task Breakdown
- [ ] `k6` 또는 `autocannon` 설치 (Docker 또는 Local CLI)
- [ ] `tests/load/diagnosis.k6.js` 스크립트:
  - 시나리오: 100 VUs (Virtual Users) × 5분
  - Target: `analyzeDiagnosis` Server Action 엔드포인트
  - 입력: 다양한 transcript + 월령 + 음소
  - threshold: `p(95) < 800` (REQ-NF-001)
- [ ] `tests/load/weekly-report.k6.js`:
  - 50 VUs × 3분
  - Target: `/reports/{year}/{week}` RSC GET
  - threshold: `p(95) < 3000`
- [ ] `tests/load/curriculum.k6.js`:
  - 100 VUs × 3분
  - threshold: `p(95) < 500`
- [ ] CI 통합 (GitHub Actions 또는 Vercel CI):
  - PR 시 Vercel Preview URL 대상 자동 실행
  - 실패 시 PR 차단
- [ ] 결과 리포트 — HTML 또는 InfluxDB
- [ ] 비용 가드: 부하 테스트 시 Gemini RPM 한도 초과 위험 → SEC-004 우회용 별도 테스트 키 (mock 또는 stub 환경)
- [ ] 성능 회귀 임계 — 직전 측정 대비 +20% 이상 시 Slack Alert

## 🧪 Acceptance Criteria
**Scenario 1: analyzeDiagnosis p95 ≤ 800ms (REQ-NF-001)**
- **Given**: 100 VUs × 5분
- **When**: k6 실행
- **Then**: p95 < 800ms, threshold pass

**Scenario 2: getWeeklyReport p95 ≤ 3,000ms (REQ-NF-004)**
- **Given**: 50 VUs × 3분
- **When**: 부하 테스트
- **Then**: p95 < 3,000ms

**Scenario 3: getCurriculum p95 ≤ 500ms (REQ-FUNC-021)**
- **Given**: 100 VUs × 3분
- **When**: 부하 테스트
- **Then**: p95 < 500ms

**Scenario 4: CI 통합 — PR 시 자동 실행**
- **Given**: PR 생성
- **When**: GitHub Actions
- **Then**: k6 결과 PR 코멘트로 게시, 실패 시 차단

**Scenario 5: 회귀 임계 Alert**
- **Given**: 직전 p95 600ms → 이번 750ms
- **When**: 측정
- **Then**: +20% 미달이지만 Slack 알림 (단순 정보)

**Scenario 6: Gemini Rate Limit 보호**
- **Given**: 부하 테스트 시 SEC-004 통과
- **When**: 100 VUs 동시
- **Then**: stub Gemini로 우회, 실 API 호출 0건

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-001/004/006**: 성능 임계
- **격리**: 실 Gemini API 호출 0건 (stub 사용)
- **횡단 제약**:
  - [ ] G5 보호 — 부하 테스트 중 Rate Limiter 우회 검증
- **G2 비용 가드**: 부하 테스트가 Vercel Function 비용 초래 — Preview URL에서만 실행

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 3개 Server Action threshold 모두 PASS
- [ ] CI 통합 + PR 코멘트 자동 게시
- [ ] `tsc --strict` 0 errors (k6 스크립트는 JS이지만 별도 검증)
- [ ] 회귀 Alert 1회 검증
- [ ] PR 본문에 REQ-NF-001/004/006 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-001, FR-C-008, FR-C-010, INFRA-001 (Preview URL)
- **Blocks**: P1 합격 게이트 (성능 회귀 보장)
- **Discope 영향**: 해당 없음
