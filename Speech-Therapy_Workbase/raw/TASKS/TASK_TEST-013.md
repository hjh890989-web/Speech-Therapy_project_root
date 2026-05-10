---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-013: Zero-touch 화자분리 + VAD + 7일 폐기 통합 테스트 — 67-D3 보류"
labels: 'phase:p2, mode:hold, domain:test, epic:f9-b'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-013
- **Epic / Story**: F9-b Zero-touch / S5
- **Phase**: 🔴 P2
- **Mode**: ❌ 보류 (Hold) — 67-D3 적용
- **Discope 적용**: 67-D3 (FR-C-015 보류로 본 통합 테스트도 보류)
- **목적**: FR-C-015가 67-D3로 보류되었으므로 본 테스트도 보류. B2B PoC 5건 이후 부활 검토.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-049~053 (Zero-touch 전체)
  - §6.3.2 시퀀스 다이어그램
  - §5 Traceability — TC-S5-001~005
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-6 TEST-013 (보류)
- **검토 보고서**: §1.1 67-D3

## ✅ Task Breakdown (보류 상태)
- [ ] **본 태스크는 67-D3 적용으로 P2엔 미작성**
- [ ] FR-C-015 (Zero-touch)가 보류되어 테스트 대상 없음
- [ ] **부활 시 재작성할 시나리오 (참고만)**:
  - 1: 교실 태블릿 PWA + Web Worker VAD 동작 검증
  - 2: 화자분리 정확도 ≥ 85% (60dB 환경)
  - 3: VAD 청크 전송 ≤ 300ms
  - 4: 마이크 고장 시 PWA 알림 (REQ-FUNC-052)
  - 5: 7일 폐기 Cron 실패 → 재시도 3회 (REQ-FUNC-053)
  - 6: 교사 능동 조작 평균 0회 (REQ-NF-028)
  - 7: 대체 흐름 (1클릭 녹음) 검증 (B2B PoC 단계)
- [ ] **부활 조건**:
  - FR-C-015 본격 구현
  - INFRA-004 Edge Runtime 활성화
  - API-009 audio stream 라우트 활성화
  - 또는 단순 대체 흐름(1클릭 녹음 + 일괄 STT) 채택 시 그에 맞게 재작성

## 🧪 Acceptance Criteria (보류)
**Scenario 1: 보류 상태 명시**
- **Given**: 본 태스크 검사
- **When**: Mode 확인
- **Then**: Hold, 67-D3 적용 명시

**Scenario 2: 의존 태스크도 보류 (FR-C-015, INFRA-004, API-009)**
- **Given**: TASK 강화판 §3 표 검사
- **When**: 검색
- **Then**: 4건 모두 Hold/Replace/명세대로 일관성 유지

**Scenario 3: 부활 조건 명문화**
- **Given**: README + 본 파일
- **When**: 검색
- **Then**: B2B PoC 5건 후 부활 명시

## ⚙️ Technical & Non-Functional Constraints
- **67-D3 적용**: 본 태스크 미작성
- **횡단 제약**: 해당 없음 (보류)
- **부활 시점**: B2B PoC 5건 + Zero-touch 본격 구현 시

## 🏁 Definition of Done (보류)
- [ ] Hold 상태 README 명시
- [ ] 부활 조건 + 재작성 시나리오 문서화
- [ ] PR 본문에 REQ-FUNC-049~053 + 67-D3 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: 부활 시 — FR-C-015, INFRA-004, API-009, FR-C-004 (7일 폐기 활성화)
- **Blocks**: 없음 (보류)
- **Discope 영향**: 67-D3 — 본 통합 테스트 보류
