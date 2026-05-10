---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-005: Middleware 금칙어 정규식 단위 테스트 + 화이트리스트 검증"
labels: 'phase:p1, mode:active, domain:test, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-005
- **Epic / Story**: HITL 안전 프로토콜 / S6
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: FR-C-005(Middleware 금칙어 스캐너)의 정규식 정확도 + 화이트리스트 예외 + 성능(≤ 50ms) 자동화. R1 의료 규제 회피의 회귀 보장.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-013 (금칙어 0건)
  - REQ-FUNC-HITL-002 (Middleware 자동 탐지)
  - CON-04, ADR-04
  - §5 Traceability — TC-S1-013, TC-HITL-002
- **Task 강화판**: §3-6 TEST-005

## ✅ Task Breakdown
- [ ] `__tests__/middleware/forbidden-words.test.ts`
- [ ] 정규식 단위 테스트:
  - 1차 정규식: `/(진단|장애|치료|환자|병|증상)/g` 매칭 검증
  - 2차 정규식: `/(아프|장애아|문제아|이상)/g` 검증
- [ ] 화이트리스트 예외:
  - "치료사", "치료실" 통과 검증 (lookahead 사용)
  - "발음 장애 아닙니다"는 어떻게 처리할지 — 본 태스크에서는 단순 매칭 우선, 화이트리스트는 정확 단어 기준
- [ ] 응답 본문 스캔:
  - HTML 응답 모킹 → 금칙어 포함 시 차단 동작 검증
  - 성능 측정 — 50KB 본문 ≤ 50ms
- [ ] 사용자 발화는 로깅만:
  - transcript "아파요" → 차단 없음, forbidden_word_log 1건 INSERT 검증
- [ ] AI 응답 후처리:
  - aiCushionText에 "진단" → FR-C-001의 5단계 재생성 트리거 검증 (FR-C-001과의 통합)
- [ ] Slack Alert 임계 (1일 5건 초과):
  - 6번째 발견 → Slack 알림 1회, 7번째는 발송 안 됨 (중복 방지 플래그)
- [ ] forbidden_word_log INSERT 검증

## 🧪 Acceptance Criteria
**Scenario 1: 정규식 매칭**
- **Given**: 텍스트 "이는 진단이 아닙니다"
- **When**: 정규식 검사
- **Then**: "진단" 매칭, 차단

**Scenario 2: 화이트리스트 예외**
- **Given**: "치료사 선생님"
- **When**: 검사
- **Then**: 매칭 0건 (직업명 허용)

**Scenario 3: 사용자 발화 로깅만**
- **Given**: transcript "아파요"
- **When**: Server Action 진입
- **Then**: 로깅 1건, 차단 없음

**Scenario 4: 1일 5건 초과 Slack Alert**
- **Given**: 5건 누적 (forbidden_word_log)
- **When**: 6번째 INSERT
- **Then**: Slack 알림 1회 (7번째는 발송 안 됨)

**Scenario 5: 성능 ≤ 50ms**
- **Given**: 50KB 본문
- **When**: Middleware 정규식 처리
- **Then**: ≤ 50ms

**Scenario 6: AI 재생성 트리거**
- **Given**: aiCushionText "진단" 포함
- **When**: FR-C-001 5단계
- **Then**: Gemini 재호출 1회 검증

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-013**: 금칙어 0건
- **REQ-FUNC-HITL-002**: 자동 탐지
- **격리**: 실제 Slack 호출 0건
- **횡단 제약**:
  - [ ] CON-04 정확도 — 화이트리스트 정확도가 R1 회피 + 자연 표현 허용의 균형

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 6/6 시나리오 통과
- [ ] 정규식 커버리지 (15+ 테스트 케이스)
- [ ] 성능 측정 보고서 (50ms 임계)
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-013/HITL-002 + CON-04 + ADR-04 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-005 (Middleware), DB-011 (forbidden_word_log)
- **Blocks**: P1 합격 게이트
- **Discope 영향**: 해당 없음
