---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-003: 데일리 미션 카드 홈 화면 (Tailwind+shadcn/ui 타이머·진행바)"
labels: 'phase:p1, mode:active, domain:fr-q, epic:f3-a'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-003
- **Epic / Story**: F3-a 1분 숏폼 미션 카드 / S2
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 유료 사용자 홈 화면 진입 시 개인화된 데일리 미션 카드를 노출. shadcn/ui 기반 1~3분 미션 UI + 타이머·진행바·발화 안내. M3 리텐션의 핵심 진입 화면.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-015 (개인화 데일리 미션 카드 발급)
  - REQ-FUNC-016 (1~3분 세션, Drop-off < 10%)
  - REQ-FUNC-017 (Tailwind+shadcn/ui 타이머·진행바)
  - REQ-FUNC-018 (첫 7일 완료율 ≥ 70%)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-4 FR-Q-003

## ✅ Task Breakdown
- [ ] `app/(dashboard)/missions/page.tsx` Server Component 생성
- [ ] 서버에서 `getCurriculum({userId, recentSessions})` 호출 → 추천 미션 ID 받음
- [ ] `prisma.missionCard.findUnique({where: {id: recommendedMissionId}})`로 카드 정보 조회
- [ ] Client Component `<MissionRunner>` 분리:
  - shadcn/ui Progress (잔여 시간 시각화)
  - shadcn/ui Card (미션 제목 + instructionText + mediaUri)
  - 타이머 카운트다운 (1~3분, useEffect + clearInterval)
  - "발화 시작" 버튼 → `useSpeechRecognition` 훅 호출 (FR-Q-001 재사용)
  - 발화 완료 시 `analyzeDiagnosis()` Server Action 호출
- [ ] 첫 7일 사용자 분기: 매일 1개 추천 미션 + 진행률 표시 ("오늘의 미션 3/5")
- [ ] 미션 완료 시 보상 트리거 (FR-C-009 재사용)
- [ ] 무미션 상태 (NO_MISSIONS_AVAILABLE): 다른 음소 추천 + 잠시 휴식 안내
- [ ] 미션 카드 디자인:
  - 모바일 우선 (터치 영역 ≥ 44px)
  - 아이 친화적 색상 + 일러스트
  - Disclaimer 1곳 노출 (CON-04)

## 🧪 Acceptance Criteria
**Scenario 1: 개인화 미션 노출 (REQ-FUNC-015)**
- **Given**: 로그인 + recentSessions 5건 있음
- **When**: `/missions` 페이지 진입
- **Then**: 추천 미션 1개 화면 중앙 노출, 잔여 시간 타이머 표시

**Scenario 2: 1~3분 세션 (REQ-FUNC-016)**
- **Given**: 미션 시작
- **When**: 타이머 카운트다운
- **Then**: 60~180초 사이 자동 종료 또는 수동 완료, Drop-off < 10% 측정

**Scenario 3: 첫 주 완료율 (REQ-FUNC-018)**
- **Given**: 신규 가입 후 7일
- **When**: 코호트 분석
- **Then**: 첫 주 미션 완료율 ≥ 70%

**Scenario 4: 침묵 감지 (REQ-FUNC-019 — FR-C-006 연결)**
- **Given**: 미션 진행 중 1분+ 침묵
- **When**: 자동 감지
- **Then**: 거울 모드 또는 부모 개입 툴팁 (FR-Q-014 / FR-C-006 호출)

**Scenario 5: 무미션 상태**
- **Given**: getCurriculum이 NO_MISSIONS_AVAILABLE 반환
- **When**: 페이지 렌더
- **Then**: "오늘은 휴식이 필요해요" + 다른 음소 추천 카드

**Scenario 6: 무로그인 진입 차단**
- **Given**: 미인증
- **When**: GET `/missions`
- **Then**: `/login`으로 리다이렉트 (Middleware)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-016**: 1~3분 세션, Drop-off < 10%
- **REQ-FUNC-018**: 첫 7일 완료율 ≥ 70%
- **REQ-NF-003**: PWA Cold Start ≤ 1.5초
- **C-TEC-004**: Tailwind + shadcn/ui 강제
- **횡단 제약**:
  - [ ] CON-04 — 미션 카피에 의료 용어 0건
  - [ ] Disclaimer 1곳 노출
  - [ ] 모바일 터치 영역 ≥ 44px
- **접근성**: aria-label, 키보드 조작 가능, 색맹 대응

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Lighthouse 모바일 Performance ≥ 80
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] Vercel Preview 배포 통과
- [ ] 금칙어 정규식 스캔 0건
- [ ] PR 본문에 REQ-FUNC-015~018 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-002 (getCurriculum), DB-006 (미션 카드 카탈로그), API-010 (인증 보호 경로), MOCK-002 (FE 선개발)
- **Blocks**: FR-C-008 (적응형 난이도 호출), FR-C-006 (침묵 감지 트리거), TEST-006
- **Discope 영향**: 해당 없음
