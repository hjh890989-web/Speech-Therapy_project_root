---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-004: 보상 도감 Card Grid (별·나무·AI그림 누적 시각화)"
labels: 'phase:p1, mode:active, domain:fr-q, epic:f12'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-004
- **Epic / Story**: F12 게이미피케이션 보상 / S2
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 사용자별 누적 보상(별, 나무 성장 단계, AI 그림 컬렉션)을 shadcn/ui Card Grid로 시각화. 자녀와 부모가 함께 보며 성취감을 공유 → 리텐션·SNS 공유 트리거.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-026 (누적 보상 도감 UI — shadcn/ui Card Grid)
  - REQ-FUNC-024~025 (파티클·DB 저장)
- **Task 강화판**: §3-4 FR-Q-004

## ✅ Task Breakdown
- [ ] `app/(dashboard)/rewards/page.tsx` Server Component 생성
- [ ] 서버에서 `prisma.rewardProgress.findUnique({where: {userId}})` 조회
- [ ] Client Component `<RewardCollection>`:
  - shadcn/ui Card Grid 3열 (모바일) / 6열 (데스크톱)
  - 카드 1: 별 누적 수 + 등급 표기 (10개=새싹, 50개=꽃, 100개=나무)
  - 카드 2: 나무 성장 SVG (treeGrowthLevel 0~10 단계 일러스트)
  - 카드 3: AI 그림 컬렉션 (aiDrawingCount 개수 + 클릭 시 갤러리 모달)
- [ ] 각 카드에 진행률 ProgressBar (다음 단계까지 N개 남음)
- [ ] 자녀 친화적 디자인:
  - 큰 글자, 밝은 색상, 일러스트 강조
  - 등급 달성 시 컨페티 애니메이션 (Framer Motion)
- [ ] SNS 공유 버튼 (FR-C-012 연결): "친구에게 자랑하기"
- [ ] 무보상 상태: "첫 별을 받아볼까요?" → 미션 페이지 CTA

## 🧪 Acceptance Criteria
**Scenario 1: 보상 도감 렌더 (REQ-FUNC-026)**
- **Given**: cumulativeStars: 27, treeGrowthLevel: 3, aiDrawingCount: 5
- **When**: `/rewards` 진입
- **Then**: 3개 카드 모두 정확한 수치 표시, 진행률 게이지 활성

**Scenario 2: 등급 달성 컨페티**
- **Given**: cumulativeStars 49 → 50 도달 직후
- **When**: 페이지 진입
- **Then**: 컨페티 애니메이션 1회 + "꽃" 등급 배지

**Scenario 3: 무보상 분기**
- **Given**: rewardProgress row 없음
- **When**: 진입
- **Then**: 빈 상태 + "첫 별을 받아볼까요?" CTA → 미션 페이지

**Scenario 4: AI 그림 갤러리 모달**
- **Given**: aiDrawingCount: 5
- **When**: 카드 클릭
- **Then**: shadcn/ui Dialog 열림 + 5개 AI 그림 캐러셀

**Scenario 5: 모바일 반응형**
- **Given**: 모바일 viewport
- **When**: 페이지 로드
- **Then**: 3열 grid, 카드 터치 영역 ≥ 44px

**Scenario 6: 무로그인 차단**
- **Given**: 미인증
- **When**: GET `/rewards`
- **Then**: `/login` 리다이렉트

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-005**: 보상 UI 렌더 ≤ 500ms
- **C-TEC-004**: Tailwind + shadcn/ui Card 강제
- **횡단 제약**:
  - [ ] CON-04 — 카피에 의료 용어 0건
  - [ ] 자녀 안전 — AI 그림 콘텐츠 안전성 검수 (별도 콘텐츠 정책)
- **접근성**: 색맹 대응 (등급 색 + 패턴), aria-label

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Lighthouse 모바일 Performance ≥ 80
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] Framer Motion 컨페티 1회 검증
- [ ] PR 본문에 REQ-FUNC-024~026 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-008 (reward_progress), API-010 (인증)
- **Blocks**: FR-C-012 (SNS 공유 트리거)
- **Discope 영향**: 해당 없음
