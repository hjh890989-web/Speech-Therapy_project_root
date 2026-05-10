---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-008: PWA 오프라인 소급 보상 통합 테스트 — D5 보류"
labels: 'phase:p1, mode:hold, domain:test, epic:f3-a'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-008
- **Epic / Story**: F3-a / S2 (오프라인 회복)
- **Phase**: 🟡 P1
- **Mode**: ❌ 보류 (Hold) — D5 적용으로 FR-C-007이 단순 대체됨
- **Discope 적용**: D5 (PWA 오프라인 소급 보상 → 단순 에러 토스트로 대체)
- **목적**: FR-C-007이 D5로 보류되었으므로 본 테스트도 보류. P1 후반 EXP-2 통과 후 본격 도입 시 부활.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-020 (네트워크 단절 → SW 캐시 + 소급 보상)
  - §6.3.1 시퀀스
  - §5 Traceability — TC-S2-006
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-6 TEST-008 (보류)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §1.2 [추가 D5]

## ✅ Task Breakdown (보류 상태)
- [ ] **본 태스크는 D5 적용으로 P1엔 미작성** — Service Worker IndexedDB + Background Sync 미구축
- [ ] FR-C-007이 단순 에러 토스트 + 재시도 버튼으로 대체된 사항을 README에 명시
- [ ] FR-C-007의 단순 대체 동작은 TEST-006의 일부 시나리오에 흡수 검증:
  - 네트워크 에러 시 Toast 노출 → TEST-006 추가 케이스로 처리
- [ ] **부활 조건 (P1 후반)**:
  - EXP-2(M3 리텐션 ≥ 40%) 검증 후 본격 SW 도입 결정 시
  - iOS Safari Background Sync 지원 확인 후 (또는 워크어라운드 마련 후)
- [ ] 부활 시 재작성할 시나리오 (참고만):
  - 1: 네트워크 단절 → IndexedDB 캐시 INSERT 검증
  - 2: 온라인 복구 → Background Sync 트리거 + 서버 INSERT
  - 3: 멱등성 — 동일 미션 결과 중복 동기화 차단
  - 4: 캐시 정리 — 동기화 완료 후 IndexedDB row 삭제
  - 5: 충돌 해소 — 오프라인 별 +5와 온라인 별 +3 동시 발생 시 합산
  - 6: 사용자 알림 — "놓친 별들을 가져왔어요!" Toast

## 🧪 Acceptance Criteria (보류)
- **Scenario 1: 보류 상태 명시**
  - **Given**: P1 진행 중
  - **When**: TEST-008 파일 검사
  - **Then**: Mode: Hold, 부활 조건 README에 명시

## ⚙️ Technical & Non-Functional Constraints
- **D5 적용**: SW IndexedDB 미구축으로 본 통합 테스트도 미작성
- **횡단 제약**: 해당 없음 (보류)
- **부활 시점**: EXP-2 통과 + iOS Safari 호환성 확보 후

## 🏁 Definition of Done (보류)
- [ ] 본 태스크가 Hold 상태임을 README에 명시
- [ ] FR-C-007 단순 대체 동작이 TEST-006에 흡수됨 검증
- [ ] 부활 조건 명문화

## 🚧 Dependencies & Blockers
- **Depends on**: 부활 시 — FR-C-007 본격 구현, INFRA-003 SW 활성화
- **Blocks**: 없음 (보류 상태)
- **Discope 영향**: D5 — 본 테스트 자체가 보류. P1 후반 EXP-2 통과 시 부활
