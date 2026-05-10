---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-003: STT 실패 시 클라이언트 측 자동 재시도 1회"
labels: 'phase:p0, mode:active, domain:fr-c, epic:f1-a, sprint:2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-003
- **Epic / Story**: F1-a 3축 AI 음성 분석 / S1
- **Phase**: 🟢 P0
- **Mode**: 단순화 (67-D1 — Web Speech API)
- **Discope 적용**: 67-D1 (Edge Runtime 미사용, 클라이언트 측 STT)
- **목적**: Web Speech API 호출이 실패할 때 1회 자동 재시도. 무한 재시도로 인한 사용자 피로 방지 + 성공률 ≥ 98% 보장.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-004 (재시도 1회, 성공률 ≥ 98%)
  - REQ-NF-014 (STT 재시도 성공률)
- **Task 강화판**: §3-5 FR-C-003

## ✅ Task Breakdown
- [ ] `lib/hooks/useSpeechRecognition.ts`에 재시도 로직 추가 (FR-Q-001에서 작성한 훅 확장)
- [ ] `onerror` 이벤트 핸들러 → 1회 자동 재호출
- [ ] 재시도 카운터 `retryCount` (max 1) — 상태로 관리
- [ ] 재시도 사이 200ms 대기 (네트워크 일시적 오류 회피)
- [ ] 사용자 UI: 재시도 중 "다시 듣고 있어요…" shadcn/ui Toast (3초)
- [ ] 2회째도 실패 시 → "마이크를 확인해주세요" Dialog + 수동 재시도 버튼 (REQ-FUNC-006 권한 거부 분기 재사용)
- [ ] 텔레메트리: Vercel Analytics 이벤트 발송
  - `stt_first_attempt_success`
  - `stt_retry_success`
  - `stt_retry_failed`
- [ ] 재시도 종료 후 retryCount 리셋 (다음 발화 시 다시 1회 가능)

## 🧪 Acceptance Criteria
**Scenario 1: 1회 재시도 성공 (REQ-FUNC-004)**
- **Given**: 첫 호출 `onerror` 발생 (예: 임시 네트워크 오류)
- **When**: 재시도 자동 트리거 (200ms 후)
- **Then**: 두 번째 호출 성공, transcript 반환, `stt_retry_success` 이벤트 발송

**Scenario 2: 2회 모두 실패**
- **Given**: 재시도도 실패
- **When**: 사용자 UI 분기
- **Then**: 수동 재시도 버튼 노출, 자동 재시도 종료, `stt_retry_failed` 이벤트

**Scenario 3: 성공률 측정 (REQ-NF-014)**
- **Given**: 100회 부하 테스트 (10% 실패율 시뮬)
- **When**: 재시도 1회 정책 적용
- **Then**: 최종 성공 ≥ 98건 (재시도로 회복)

**Scenario 4: 무한 재시도 방지**
- **Given**: 모든 호출이 실패하는 환경
- **When**: 5회 시도
- **Then**: 자동 재시도는 1회만, 이후는 수동 버튼만 노출

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-014**: 성공률 ≥ 98%
- **REQ-FUNC-004**: 재시도 1회만 (무한 재시도 금지 — 사용자 피로 + 마이크 권한 반복 요청 방지)
- **횡단 제약**:
  - [ ] 텔레메트리 — Vercel Analytics 이벤트 발송 필수 (운영 모니터링)
- **R7 대응**: 클라이언트 측 직접 처리 → Vercel Edge Runtime 미관여

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 단위 테스트 (mock SpeechRecognition)
- [ ] `tsc --strict` 0 errors
- [ ] 100회 부하 시뮬레이션 통과
- [ ] Vercel Analytics 이벤트 3종 등록 + 1회 발송 검증
- [ ] PR 본문에 REQ-FUNC-004 + REQ-NF-014 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-001 (`useSpeechRecognition` 훅 존재), INFRA-005 (Vercel Analytics)
- **Blocks**: TEST-003 (P1 — 단위 테스트), TEST-004 (E2E 시 재시도 시나리오 포함 가능)
- **Discope 영향**: 67-D1 — Edge Runtime 미사용. 클라이언트 측 Web Speech API의 `onerror` 이벤트만 활용
