---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Performance] PERF-002: PWA Cold Start ≤ 1.5초 + 보상 UI ≤ 500ms Lighthouse 회귀"
labels: 'phase:p1, mode:active, domain:perf, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: PERF-002
- **Epic / Story**: Foundation 클라이언트 성능
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: PWA Cold Start ≤ 1.5초 + 보상 UI 페인트 ≤ 500ms를 Lighthouse + Web Vitals + Custom Performance 측정으로 자동화. 회귀 시 PR 차단.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-NF-003 (PWA Cold Start ≤ 1.5초)
  - REQ-NF-005 (보상 UI ≤ 500ms)
  - REQ-FUNC-024 (파티클 ≤ 500ms)
- **Task 강화판**: §3-7 PERF-002

## ✅ Task Breakdown
- [ ] Lighthouse CI 통합 (`npm i -D @lhci/cli`)
- [ ] `lighthouserc.json` 설정:
  - URL: Vercel Preview URL (자동 주입)
  - 측정 대상: `/`, `/diagnose`, `/dashboard/missions`, `/rewards`, `/reports/{year}/{week}`
  - threshold:
    - performance ≥ 80 (모바일)
    - LCP ≤ 1,500ms
    - FCP ≤ 1,000ms
- [ ] PWA 카테고리 ≥ 90 검증 (INFRA-003 통합)
- [ ] Custom Performance 측정 (`lib/performance.ts`):
  - `measurePaint(componentName)` — Performance.now() 기반
  - 보상 파티클 첫 페인트 측정
  - 미션 카드 첫 페인트 측정
  - 결과 페이지 LCP 측정
- [ ] 측정 결과 Vercel Analytics로 발송:
  - `paint_time` 이벤트 (component, durationMs)
- [ ] CI 통합:
  - GitHub Actions: PR 시 Lighthouse 자동 실행
  - 결과 PR 코멘트 + 점수 회귀 시 차단
- [ ] Web Vitals threshold 알림:
  - LCP > 1,500ms 1주 평균 → Slack
  - CLS > 0.1 → Slack

## 🧪 Acceptance Criteria
**Scenario 1: Cold Start ≤ 1.5초 (REQ-NF-003)**
- **Given**: 첫 방문 (캐시 없음)
- **When**: Lighthouse 모바일 측정
- **Then**: LCP ≤ 1,500ms

**Scenario 2: 보상 파티클 ≤ 500ms (REQ-NF-005)**
- **Given**: 결과 페이지 도달
- **When**: 파티클 첫 페인트 측정
- **Then**: Performance.now() 기준 ≤ 500ms

**Scenario 3: PWA Lighthouse ≥ 90**
- **Given**: Vercel Production
- **When**: Lighthouse 모바일
- **Then**: PWA 카테고리 ≥ 90

**Scenario 4: 5개 페이지 모두 Performance ≥ 80**
- **Given**: 측정 대상 5개
- **When**: Lighthouse CI
- **Then**: 모두 ≥ 80

**Scenario 5: Web Vitals 회귀 Alert**
- **Given**: LCP 1주 평균 1,600ms
- **When**: 임계 검사
- **Then**: Slack 알림 1회

**Scenario 6: PR 차단 회귀**
- **Given**: PR로 페이지 변경 후 LCP +500ms
- **When**: Lighthouse CI
- **Then**: PR 차단 + 회귀 메시지

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-003/005**: Cold Start + 보상 UI
- **횡단 제약**:
  - [ ] 모바일 우선 — 모바일 viewport 측정만 회귀 차단 기준
  - [ ] 격리 — Vercel Preview URL 사용 (Production 영향 X)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Lighthouse CI 통합 + PR 코멘트 자동
- [ ] PWA ≥ 90 + Performance ≥ 80
- [ ] Custom paint_time 이벤트 수집 활성
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-NF-003/005 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-001, INFRA-003 (PWA), INFRA-005 (Analytics), FR-Q-001, FR-Q-002, FR-Q-003
- **Blocks**: P1 합격 게이트
- **Discope 영향**: 해당 없음
