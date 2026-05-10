---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-003: 마이크 권한 거부 / 60dB 소음 / STT 1회 재시도 단위 테스트"
labels: 'phase:p1, mode:active, domain:test, epic:f1-a'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-003
- **Epic / Story**: F1-a 예외 처리 / S1
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: REQ-FUNC-006(마이크 권한 거부), REQ-FUNC-007(60dB 소음), REQ-FUNC-004(STT 1회 재시도) 예외 시나리오 자동화. 사용자 환경 다양성에 대한 회귀 보장.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-004 (STT 재시도 1회, 성공률 ≥ 98%)
  - REQ-FUNC-006 (마이크 권한 거부 → Dialog)
  - REQ-FUNC-007 (60dB 소음 → Toast)
  - §5 Traceability — TC-S1-004/006/007
- **Task 강화판**: §3-6 TEST-003

## ✅ Task Breakdown
- [ ] `__tests__/hooks/useSpeechRecognition.test.ts` (Vitest + happy-dom)
- [ ] Mock SpeechRecognition API 작성 (`window.SpeechRecognition`)
- [ ] 시나리오:
  - 1: `onerror` "not-allowed" → REQ-FUNC-006 Dialog 트리거 검증
  - 2: AnalyserNode dB 측정 → 60dB 초과 시 REQ-FUNC-007 Toast
  - 3: `onerror` 첫 호출 → 재시도 1회 자동 트리거 검증
  - 4: 재시도 성공 → transcript 반환 + `stt_retry_success` 이벤트
  - 5: 재시도도 실패 → 수동 재시도 버튼 노출 + `stt_retry_failed`
  - 6: 100회 부하 (10% 실패율 시뮬) → 최종 성공률 ≥ 98%
  - 7: 재시도 1회 후 자동 재시도 미발생 (무한 루프 방지)
- [ ] Vercel Analytics 이벤트 spy 검증 (3종)
- [ ] 권한 거부 Dialog 컴포넌트 렌더 검증
- [ ] 60dB 시뮬: AnalyserNode `getByteFrequencyData` mock

## 🧪 Acceptance Criteria
**Scenario 1: 7개 시나리오 통과**
- **Given**: FR-Q-001 + FR-C-003 구현
- **When**: `npm run test`
- **Then**: 7/7 PASS

**Scenario 2: 성공률 ≥ 98% (REQ-FUNC-004)**
- **Given**: 100회 시뮬 (10% 실패 주입)
- **When**: 재시도 1회 정책
- **Then**: 최종 성공 ≥ 98건

**Scenario 3: 권한 거부 Dialog (REQ-FUNC-006)**
- **Given**: onerror 'not-allowed'
- **When**: hook 동작
- **Then**: shadcn/ui Dialog 컴포넌트 렌더, 텍스트 "마이크 권한이 필요합니다"

**Scenario 4: 60dB Toast (REQ-FUNC-007)**
- **Given**: 60dB 측정 mock
- **When**: 60dB 초과 5초 지속
- **Then**: Toast "조용한 곳으로 이동해주세요"

**Scenario 5: 무한 재시도 방지**
- **Given**: 5회 연속 onerror
- **When**: hook 동작
- **Then**: 자동 재시도 1회만, 이후 수동 버튼

**Scenario 6: 텔레메트리 이벤트**
- **Given**: 재시도 시나리오 3종
- **When**: 각각 실행
- **Then**: `stt_first_attempt_success`/`stt_retry_success`/`stt_retry_failed` 이벤트 spy 호출 검증

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-004/006/007**: 예외 처리
- **REQ-NF-014**: 성공률 ≥ 98%
- **격리**: 실제 Web Speech API 호출 0건
- **횡단 제약**: 해당 없음

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 7/7 시나리오 통과
- [ ] 커버리지 ≥ 80% (`useSpeechRecognition` 훅)
- [ ] `tsc --strict` 0 errors
- [ ] CI(Vercel) 통과
- [ ] PR 본문에 REQ-FUNC-004/006/007 + REQ-NF-014 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-001, FR-C-003
- **Blocks**: P1 합격 게이트
- **Discope 영향**: 해당 없음
