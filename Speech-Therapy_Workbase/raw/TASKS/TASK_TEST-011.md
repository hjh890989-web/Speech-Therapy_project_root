---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-011: 카카오 → 클립보드/Web Share 단일 동작 검증 (Replace 67-D1)"
labels: 'phase:p1, mode:replace, domain:test, epic:f5'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-011
- **Epic / Story**: F5 카카오톡/SNS 공유 / S3
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace 검증 (67-D1)
- **Discope 적용**: 67-D1 (카카오 알림톡 미연동)
- **목적**: FR-C-012의 단순 대체 동작(클립보드 + Web Share + og:image)을 자동화. 카카오 의존성 0 검증 + 자녀 식별 정보 미포함 검증.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-030 (카카오 → 본 태스크는 Replace로 대체)
  - REQ-FUNC-031 (폴백 → 본 태스크는 1차 방식으로 격상)
  - §5 Traceability — TC-S3-004/005
- **Task 강화판**: §3-6 TEST-011 (Replace)
- **검토 보고서**: §1.1 67-D1

## ✅ Task Breakdown
- [ ] `__tests__/integration/share-flow.test.ts`
- [ ] Mock 설정:
  - `navigator.share` mock (Web Share API)
  - `navigator.clipboard.writeText` spy
  - Vercel @vercel/og 응답 mock
- [ ] 시나리오:
  - 1: Web Share API 지원 환경 → `navigator.share` 호출 검증
  - 2: 미지원 환경 → 클립보드 복사 폴백 + Toast
  - 3: 공유 링크 생성 → /share/[token] 페이지 접근 가능
  - 4: 24h 만료 → 25h 후 진입 시 만료 안내
  - 5: og:image 생성 → /api/og?token=... → PNG 응답
  - 6: 자녀 식별 정보 미포함 → 공유 페이지 텍스트에 본명·생년월일 0건
  - 7: 카카오 SDK 의존성 0건 (`@kakao/*` 미설치 검증)
  - 8: Vercel Analytics 이벤트 3종 (share_clicked, method, link_visited)
- [ ] Playwright E2E (선택): 모바일 viewport에서 시스템 공유 시트 호출

## 🧪 Acceptance Criteria
**Scenario 1: 8개 시나리오 통과**
- **Given**: FR-C-012 구현
- **When**: 테스트 실행
- **Then**: 8/8 PASS

**Scenario 2: 카카오 의존성 0 (Replace 핵심)**
- **Given**: package.json
- **When**: `@kakao` 또는 카카오 SDK 검색
- **Then**: 의존성 0건

**Scenario 3: 클립보드 폴백**
- **Given**: navigator.share undefined
- **When**: 공유 클릭
- **Then**: navigator.clipboard.writeText spy 호출 검증

**Scenario 4: og:image PNG**
- **Given**: shareToken
- **When**: GET /api/og?token=...
- **Then**: Content-Type: image/png

**Scenario 5: 자녀 정보 미포함 (R4)**
- **Given**: 공유 페이지
- **When**: 텍스트 정규식 (본명·생년월일 패턴)
- **Then**: 0건

**Scenario 6: 24h 만료**
- **Given**: 25h 전 token
- **When**: 페이지 진입
- **Then**: "링크가 만료되었어요" 메시지

**Scenario 7: Analytics 이벤트**
- **Given**: 공유 동작
- **When**: spy
- **Then**: 3종 이벤트 발송 검증

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-030/031**: 카카오 → Replace
- **격리**: 실제 카카오 호출 불가 (의존성 0)
- **횡단 제약**:
  - [ ] **R4 — 자녀 식별 정보 미포함 강제 검증**
  - [ ] R5 — 카카오 정책 변경 영향 0 (의존성 0이므로)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 8/8 시나리오 통과
- [ ] 카카오 의존성 0 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-030/031 + 67-D1 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-012, MOCK-003 (선택)
- **Blocks**: P1 합격 게이트
- **Discope 영향**: 67-D1 — 카카오 검증 대신 클립보드/Web Share 검증
