---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-006: 미션 1~3분 + Drop-off < 10% + 첫 주 ≥ 70% 시뮬레이션"
labels: 'phase:p1, mode:active, domain:test, epic:f3-a'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-006
- **Epic / Story**: F3-a 미션 / S2
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: FR-Q-003 미션 카드 UI + FR-C-008 적응형 난이도의 통합 테스트. Drop-off < 10% + 첫 주 완료율 ≥ 70% 시뮬레이션 + 침묵 감지 트리거 검증.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-016 (1~3분 세션, Drop-off < 10%)
  - REQ-FUNC-018 (첫 주 완료율 ≥ 70%)
  - §5 Traceability — TC-S2-002, TC-S2-004
- **Task 강화판**: §3-6 TEST-006

## ✅ Task Breakdown
- [ ] `__tests__/integration/mission-flow.test.ts`
- [ ] Mock 설정:
  - Mock SpeechRecognition (FR-Q-001 활용)
  - Mock `getCurriculum` (MOCK-002)
  - Mock `grantReward`
- [ ] 시뮬레이션 시나리오:
  - 1: 정상 세션 1~3분 진행 → Drop-off 0건 (단위 테스트)
  - 2: 60초+ 침묵 → 거울 모드/툴팁 트리거 (FR-C-006 검증)
  - 3: 100세션 시뮬 → Drop-off ≤ 10건
  - 4: 첫 주 7일 시뮬 (가상 사용자 100명) → 완료율 ≥ 70건
  - 5: 적응형 난이도 (3연속 실패 → 다음 -1)
  - 6: 미션 완료 → grantReward 호출 + 별 +1
- [ ] Playwright E2E (선택): 실제 미션 페이지 렌더 + 진행 검증
- [ ] Vercel Analytics 이벤트 spy:
  - `mission_started`, `mission_completed`, `mission_dropped_off`

## 🧪 Acceptance Criteria
**Scenario 1: 6개 시나리오 통과**
- **Given**: FR-Q-003 + FR-C-008 + FR-C-006 구현
- **When**: `npm run test`
- **Then**: 6/6 PASS

**Scenario 2: Drop-off < 10% (REQ-FUNC-016)**
- **Given**: 100세션 시뮬
- **When**: 측정
- **Then**: 미완료 ≤ 10건

**Scenario 3: 첫 주 완료율 ≥ 70% (REQ-FUNC-018)**
- **Given**: 100명 신규 가입자 7일 시뮬
- **When**: 코호트 분석
- **Then**: 7일간 미션 완료 누적 ≥ 70명

**Scenario 4: 침묵 감지 트리거 (REQ-FUNC-019)**
- **Given**: 60초+ 무발화
- **When**: useSilenceDetection
- **Then**: 거울 모드 또는 부모 툴팁 트리거 + 이벤트 발송

**Scenario 5: 적응형 난이도 통합**
- **Given**: 3연속 실패
- **When**: 다음 미션 요청
- **Then**: getCurriculum이 difficulty -1 반환

**Scenario 6: 보상 트리거**
- **Given**: 미션 완료
- **When**: grantReward 호출
- **Then**: cumulativeStars +1 검증

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-016**: Drop-off < 10%
- **REQ-FUNC-018**: 첫 주 ≥ 70%
- **격리**: 실제 DB 호출 0건 (MOCK-002 사용)
- **횡단 제약**: 해당 없음

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 6/6 시나리오 통과
- [ ] 커버리지 ≥ 80%
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-016/018/019 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-003, FR-C-008, FR-C-006, FR-C-009, MOCK-002
- **Blocks**: P1 합격 게이트
- **Discope 영향**: 해당 없음
