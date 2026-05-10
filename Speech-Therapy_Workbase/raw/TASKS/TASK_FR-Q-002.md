---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-002: 또래 비교 리포트 RSC + Disclaimer 100% 노출"
labels: 'phase:p0, mode:active, domain:fr-q, epic:f2, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-002
- **Epic / Story**: F2 또래 비교 진단 리포트 / S1
- **Phase**: 🟢 P0
- **Mode**: 단순화 (Sprint 1엔 Middleware 금칙어 대신 인라인 검증)
- **Discope 적용**: 해당 없음 (FR-C-005 일부만 P1으로 디퍼 — 본 페이지는 인라인 검증 사용)
- **목적**: 5분 진단 결과를 "상위 N%" 넛지 카피·또래 백분위 차트·Disclaimer와 함께 React Server Component로 렌더링. 유료 전환 CTA의 진입점.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-010 (RSC p95 ≤ 1,500ms)
  - REQ-FUNC-011 (Disclaimer 100% 노출)
  - REQ-FUNC-012 (또래 비교 리포트 + 넛지 카피)
  - REQ-FUNC-013 (금칙어 0건)
  - REQ-FUNC-014 (유료 전환 CTA)
- **Task 강화판**: §3-4 FR-Q-002

## ✅ Task Breakdown
- [ ] `app/(public)/diagnose/result/[sessionId]/page.tsx` RSC 페이지 생성
- [ ] 서버에서 `prisma.evaluationResult.findUnique({where: {sessionId}})` 호출
- [ ] 백분위 시각화: shadcn/ui Progress + 가로 바 차트 (Recharts 또는 단순 div + Tailwind)
- [ ] 넛지 카피 자동 생성 (peerPercentile 기반):
  - `≥ 80`: "또래의 상위 20% 안에 들어요!"
  - `40~79`: "또래와 비슷한 수준이에요"
  - `< 40`: "조금 더 연습하면 좋아요" (불안 자극 회피)
- [ ] Disclaimer 박스: 상단 + 하단 + 차트 옆 = 3곳 노출 (강제 가시성 보장)
  - 카피: "본 결과는 의료적 판단이 아닌 발달 참고 자료입니다."
- [ ] 인라인 금칙어 검증: 페이지 렌더 직전 `aiCushionText` 정규식 스캔, 발견 시 안전 문구로 대체
- [ ] 유료 전환 CTA: 페이지 하단 "주간 미션 시작하기" 버튼 (Sprint 1엔 단순 anchor, Stripe 결제는 P1)
- [ ] 메타데이터: `metadata.title = "발음 발달 결과"` (SEO + 공유)
- [ ] 공유 링크: `?ref=share` query param 보존 (퍼널 분석)

## 🧪 Acceptance Criteria
**Scenario 1: 결과 렌더링 (REQ-FUNC-010)**
- **Given**: 유효 sessionId, evaluation_results 1 row 존재
- **When**: 페이지 GET
- **Then**: HTML LCP ≤ 1,500ms (Vercel Analytics 측정)

**Scenario 2: Disclaimer 100% 노출 (REQ-FUNC-011)**
- **Given**: 페이지 렌더 완료
- **When**: DOM 검색 `[data-testid="disclaimer"]`
- **Then**: 3개 요소 발견, 모두 visible

**Scenario 3: 넛지 카피 분기 (REQ-FUNC-012)**
- **Given**: peerPercentile 85
- **When**: 페이지 렌더
- **Then**: "또래의 상위 20% 안에 들어요!" 정확히 표시

**Scenario 4: 금칙어 0건 (REQ-FUNC-013)**
- **Given**: aiCushionText에 "진단" 포함된 row (오류 시나리오)
- **When**: 페이지 렌더
- **Then**: 정규식 차단 → 안전 문구 "잘 발음하고 있어요"로 대체, 원본 미노출

**Scenario 5: 유료 전환 CTA (REQ-FUNC-014)**
- **Given**: 무료 진단 결과 페이지
- **When**: 스크롤 다운
- **Then**: "주간 미션 시작하기" CTA 노출

**Scenario 6: 잘못된 sessionId**
- **Given**: 존재하지 않는 sessionId
- **When**: 페이지 GET
- **Then**: 404 페이지 또는 "결과를 찾을 수 없습니다" + 진단 재시도 CTA

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-010**: RSC p95 ≤ 1,500ms — DB 쿼리 ≤ 100ms + 렌더 ≤ 100ms 목표
- **REQ-FUNC-011**: Disclaimer 노출률 100% (NeverHide 보장)
- **횡단 제약**:
  - [ ] **CON-04 금칙어**: 인라인 정규식 검증 (Middleware는 P1)
  - [ ] **Disclaimer 3중 노출**: 상단 / 차트 옆 / 하단
  - [ ] **R1 의료 규제**: 비의료 카피 강제 (예: "치료" → "연습", "환자" → "아이")
- **접근성**: 차트에 `aria-label` 필수, 색맹 대응 (색상 + 패턴)
- **공유 친화**: og:image 자동 생성 (Vercel OG SDK) — Sprint 2로 디퍼 가능

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Lighthouse 모바일 Performance ≥ 80
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] 금칙어 정규식 단위 테스트 추가
- [ ] Disclaimer 3중 노출 E2E 검증 (TEST-004)
- [ ] Vercel Preview 배포 통과

## 🚧 Dependencies & Blockers
- **Depends on**: DB-005 (evaluation_results 조회), API-001 (응답 구조), FR-C-001 (데이터 생성)
- **Blocks**: TEST-004 (5분 체류 + Disclaimer E2E 대상), FR-C-009 (보상 INSERT는 결과 화면 도달 시점)
- **Discope 영향**: 해당 없음 (Sprint 1엔 Middleware 미적용 → 인라인 검증으로 단순화)
