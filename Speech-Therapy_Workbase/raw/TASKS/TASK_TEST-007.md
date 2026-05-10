---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-007: 적응형 난이도 하향 + X표시 0회 + 전환 < 0.5초 단위 테스트"
labels: 'phase:p1, mode:active, domain:test, epic:f3-b'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-007
- **Epic / Story**: F3-b 적응형 난이도 / S2
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: FR-C-008(getCurriculum)의 결정 로직 + UI에 X표시 0회 검증. REQ-FUNC-021/022/023 G/W/T를 자동화된 단위 테스트로.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-021 (3연속 실패 → -1, X표시 0회, 전환 < 0.5초)
  - REQ-FUNC-022 (getCurriculum)
  - REQ-FUNC-023 (하향 후 이탈 < 5%)
  - §5 Traceability — TC-S2-007/008/009
- **Task 강화판**: §3-6 TEST-007

## ✅ Task Breakdown
- [ ] `__tests__/actions/curriculum.test.ts`
- [ ] Mock 설정:
  - `prisma.missionCard.findMany` 모킹 (시드 25개 픽스처)
  - MOCK-002의 4종 시나리오 픽스처 활용
- [ ] 시나리오:
  - 1: 3연속 실패 → reason: 'level_down', recommendedDifficulty -1
  - 2: 5연속 성공 → reason: 'level_up', recommendedDifficulty +1
  - 3: 음소 마스터 → reason: 'phoneme_switch', suggestedNextPhoneme 제안
  - 4: 일반 케이스 → reason: 'continue'
  - 5: NO_MISSIONS_AVAILABLE 처리
  - 6: 응답 시간 < 500ms
  - 7: 멱등성 — 동일 입력 → 동일 출력
- [ ] UI 검증 (Playwright 또는 Testing Library):
  - 100회 실패 케이스 → DOM에 'X' 또는 '실패' 0건
  - 격려 카피 ("괜찮아요, 다시 해볼까요?") 노출
- [ ] 전환 지연 측정:
  - 미션 종료 → 다음 미션 표시 < 500ms

## 🧪 Acceptance Criteria
**Scenario 1: 7개 시나리오 통과**
- **Given**: FR-C-008 구현
- **When**: 테스트 실행
- **Then**: 7/7 PASS

**Scenario 2: X표시 0회 (REQ-FUNC-021)**
- **Given**: 100회 실패 케이스 UI 렌더
- **When**: DOM 검색
- **Then**: 'X' 텍스트 또는 `❌` 아이콘 0건

**Scenario 3: 전환 < 0.5초**
- **Given**: 미션 완료 후 다음 요청
- **When**: 시간 측정
- **Then**: 평균 < 500ms

**Scenario 4: 적응형 정확도**
- **Given**: recentSessions 패턴 4종
- **When**: 호출
- **Then**: reason과 difficulty가 명세대로 분기

**Scenario 5: 멱등성**
- **Given**: 동일 입력 5회
- **When**: 호출
- **Then**: 동일 출력 (시드 기반 결정적)

**Scenario 6: 격려 카피**
- **Given**: 실패 후 UI
- **When**: 페이지 텍스트 검사
- **Then**: "괜찮아요" 또는 "다시 해볼까요?" 노출

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-021/022/023**: 적응형 + UX
- **격리**: 실제 DB 호출 0건
- **횡단 제약**:
  - [ ] **자녀 정서 보호** — X표시 0회 강제 검증

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 7/7 시나리오 통과
- [ ] DOM 검색 자동화 — 회귀 시 즉시 발각
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-021~023 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-008, API-002, MOCK-002, FR-Q-003 (UI 검증)
- **Blocks**: P1 합격 게이트
- **Discope 영향**: 해당 없음
