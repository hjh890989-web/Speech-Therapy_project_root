---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-006: 미션 1분+ 침묵 감지 → 거울 모드/부모 개입 툴팁"
labels: 'phase:p1, mode:active, domain:fr-c, epic:f3-a'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-006
- **Epic / Story**: F3-a 미션 / S2 (CJM-B 이탈점 방어)
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 미션 진행 중 1분 이상 발화가 감지되지 않으면 자동으로 거울 모드(FR-Q-014)를 띄우거나 "부모님과 함께 해보세요" 툴팁을 노출. CJM의 핵심 이탈점("3주 무변화 시 포기")의 1차 방어선.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-019 (침묵 감지 → 거울 모드/부모 개입 툴팁)
- **Task 강화판**: §3-5 FR-C-006

## ✅ Task Breakdown
- [ ] `lib/hooks/useSilenceDetection.ts` 커스텀 훅 작성
- [ ] Web Audio API `AnalyserNode`로 마이크 입력 dB 측정
  - 또는 `useSpeechRecognition` 훅의 `onspeechstart` / `onspeechend` 이벤트 활용
- [ ] 침묵 임계: 60초 동안 dB < 30 또는 onspeechstart 이벤트 0건
- [ ] FR-Q-003 미션 페이지 (`<MissionRunner>`)에 통합:
  - 침묵 감지 시 분기 (확률적):
    - 50% → 거울 모드 자동 표시 (FR-Q-014 호출)
    - 50% → 부모 개입 툴팁 ("부모님과 함께 해보세요" + Confetti)
- [ ] 툴팁 콘텐츠:
  - shadcn/ui Toast or Tooltip
  - 친화적 카피: "어렵죠? 엄마/아빠와 같이 해볼까요?"
  - "함께 하기" 버튼 (페어런트 모드 진입)
- [ ] Vercel Analytics 이벤트:
  - `silence_detected`
  - `silence_intervention_shown`
  - `silence_intervention_clicked`
- [ ] 침묵 카운터 리셋: 발화 감지 즉시 리셋 (오작동 방지)

## 🧪 Acceptance Criteria
**Scenario 1: 60초+ 침묵 감지 (REQ-FUNC-019)**
- **Given**: 미션 시작 후 60초 발화 없음
- **When**: 침묵 감지 트리거
- **Then**: 거울 모드 또는 부모 개입 툴팁 자동 표시

**Scenario 2: 발화 즉시 리셋**
- **Given**: 50초 침묵 후 발화 1초
- **When**: speechstart 이벤트
- **Then**: 침묵 카운터 0으로 리셋, 툴팁 미발생

**Scenario 3: 분기 확률 50:50**
- **Given**: 100회 침묵 트리거
- **When**: 분기 통계
- **Then**: 거울 모드 ~50회, 툴팁 ~50회 (±10%)

**Scenario 4: 부모 개입 툴팁 클릭 트래킹**
- **Given**: 툴팁 노출
- **When**: 사용자 "함께 하기" 클릭
- **Then**: `silence_intervention_clicked` 이벤트 발송 + 페어런트 모드 진입

**Scenario 5: 마이크 권한 미허용 시 처리**
- **Given**: 마이크 권한 거부
- **When**: useSilenceDetection 훅 진입
- **Then**: 침묵 감지 비활성, 30초 시점에 단순 격려 메시지 표시

**Scenario 6: 미션 종료 시 cleanup**
- **Given**: 컴포넌트 unmount
- **When**: cleanup
- **Then**: AnalyserNode 정리, 메모리 누수 0

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-019**: 침묵 감지 자동 팝업
- **횡단 제약**:
  - [ ] CON-04 — 툴팁 카피 의료 용어 0건
  - [ ] R4 — Web Audio API 사용은 마이크 입력만, 녹음/저장 안 함
- **접근성**: 시각 장애 대응 — 음성 안내 옵션
- **성능**: AnalyserNode 측정 주기 100ms (CPU 영향 ≤ 5%)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 60초 침묵 감지 정확도 검증
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] 메모리 누수 검증 (10회 미션 후 메모리 증가 ≤ 1MB)
- [ ] Vercel Analytics 3종 이벤트 등록
- [ ] PR 본문에 REQ-FUNC-019 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-003 (미션 페이지), FR-Q-014 (거울 모드), INFRA-005 (Analytics)
- **Blocks**: 없음
- **Discope 영향**: 해당 없음
