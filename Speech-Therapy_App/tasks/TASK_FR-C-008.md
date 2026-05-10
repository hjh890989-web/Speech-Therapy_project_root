---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-008: 적응형 난이도 하향 (3연속 실패 → 은밀히 -1)"
labels: 'phase:p1, mode:active, domain:fr-c, epic:f3-b'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-008
- **Epic / Story**: F3-b 적응형 난이도 조절 엔진 / S2
- **Phase**: 🟡 P1
- **Mode**: 단순화 (Sprint 1 정적 난이도 → P1에서 데이터 기반 적응형으로)
- **Discope 적용**: 해당 없음
- **목적**: 사용자 세션 이력에서 3회 연속 실패 시 다음 추천 미션의 난이도를 -1 자동 하향. 자녀가 좌절감을 느끼지 않도록 X표시·실패음 0회 + 전환 지연 < 0.5초.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-021 (3연속 실패 → 은밀히 -1, X표시 0회, 전환 지연 < 0.5초)
  - REQ-FUNC-022 (getCurriculum Server Action)
  - REQ-FUNC-023 (하향 후 이탈률 < 5%)
- **Task 강화판**: §3-5 FR-C-008

## ✅ Task Breakdown
- [ ] `app/actions/curriculum.ts`에 `getCurriculum(input)` 구현부 작성 (`'use server'`)
- [ ] 1단계 — 입력 검증: API-002 Zod `InputSchema.parse(input)`
- [ ] 2단계 — recentSessions 분석:
  - 마지막 3세션 모두 success: false → `level_down`
  - 마지막 5세션 모두 success: true → `level_up`
  - 그 외 → `continue`
- [ ] 3단계 — 다음 미션 조회:
  - `prisma.missionCard.findMany({where: {targetPhoneme, difficultyLevel: newLevel, ageRangeMin/Max}})`
  - 무작위 1개 선택 (시드 기반 결정적)
- [ ] 4단계 — phoneme_switch 분기:
  - 동일 음소 5단계 모두 마스터 시 다른 음소 추천
  - mission_cards에서 다음 우선순위 음소 결정
- [ ] 5단계 — 출력 스키마 검증
- [ ] **은밀한 하향 UI 협력**:
  - FR-Q-003 미션 페이지에서 X표시·실패음 사용 금지 (CSS class 없음)
  - 실패 시에도 격려 카피 표시 ("괜찮아요, 다시 해볼까요?")
  - 난이도 변경 안내 안 함 (사용자가 인지 못 함)
- [ ] 텔레메트리:
  - `difficulty_level_down`
  - `difficulty_level_up`
  - `phoneme_switched`
  - 각각 사용자 세그먼트 + 시점 기록

## 🧪 Acceptance Criteria
**Scenario 1: 3연속 실패 → -1 (REQ-FUNC-021)**
- **Given**: recentSessions 마지막 3건 모두 success: false (난이도 3)
- **When**: `getCurriculum()` 호출
- **Then**: recommendedDifficulty: 2, reason: 'level_down'

**Scenario 2: 5연속 성공 → +1**
- **Given**: 마지막 5건 모두 success: true (난이도 2)
- **When**: 호출
- **Then**: recommendedDifficulty: 3, reason: 'level_up'

**Scenario 3: 음소 마스터 → switch**
- **Given**: ㅅ 음소 5단계 마스터
- **When**: 호출
- **Then**: suggestedNextPhoneme: 'ㅈ', reason: 'phoneme_switch'

**Scenario 4: X표시 0회 (REQ-FUNC-021)**
- **Given**: 100회 실패 케이스
- **When**: UI 렌더 검증
- **Then**: 'X' 또는 '실패' 텍스트/아이콘 0건

**Scenario 5: 전환 지연 < 0.5초**
- **Given**: getCurriculum 호출
- **When**: 응답 시간 측정
- **Then**: 평균 < 500ms

**Scenario 6: 하향 후 이탈률 (REQ-FUNC-023)**
- **Given**: 코호트 분석 (level_down 받은 사용자)
- **When**: 다음 24h 이탈 측정
- **Then**: 이탈률 < 5%

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-021**: 3연속 실패 → -1, X표시 0회, 전환 지연 < 0.5초
- **REQ-FUNC-023**: 하향 후 이탈률 < 5%
- **C-TEC-002**: Server Action
- **횡단 제약**:
  - [ ] **자녀 정서 보호** — 실패 인식 노출 금지
  - [ ] CON-04 — 추천 사유 메시지에 의료 용어 0건
  - [ ] 멱등성 — 동일 입력 → 동일 출력 (시드 기반 결정적 선택)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] TEST-007 (적응형 난이도 단위 테스트) 통과
- [ ] X표시 0회 UI 검증 (TEST-007 + 수동)
- [ ] `tsc --strict` 0 errors
- [ ] Vercel Analytics 3종 이벤트 발송 검증
- [ ] PR 본문에 REQ-FUNC-021~023 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-002 (DTO), DB-006 (mission_cards 시드)
- **Blocks**: TEST-007, FR-Q-003 (미션 페이지가 본 액션 호출), MOCK-002
- **Discope 영향**: 해당 없음
