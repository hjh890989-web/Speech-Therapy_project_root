---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-005: Next.js Middleware 금칙어 정규식 스캐너 (렌더링 차단)"
labels: 'phase:p1, mode:active, domain:fr-c, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-005
- **Epic / Story**: HITL 안전 프로토콜 — 금칙어 회피 / S6
- **Phase**: 🟡 P1
- **Mode**: 단순화 (Sprint 1 인라인 검증 → P1에서 Middleware 통합으로 강화)
- **Discope 적용**: 해당 없음 (Sprint 1엔 컴포넌트 인라인 검증, P1에서 정식 Middleware로 승격)
- **목적**: 모든 RSC/Page 응답을 Next.js Middleware에서 정규식 스캔하여 의료 용어("진단", "장애", "치료", "환자") 발견 시 렌더링 차단·로깅·Slack Alert. R1 의료 규제 회피의 최후 방어선.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-013 (리포트 내 금칙어 0건)
  - REQ-FUNC-HITL-002 (Middleware 금칙어 자동 탐지)
  - CON-04 (의료 용어 하드코딩 배제)
  - ADR-04 (Middleware 금칙어 스캐너)
  - R1 (의료행위 취급 리스크)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-5 FR-C-005

## ✅ Task Breakdown
- [ ] `middleware.ts`의 기존 RBAC 미들웨어(API-010)에 금칙어 스캐너 추가 (또는 별도 미들웨어 체인)
- [ ] 금칙어 정규식 (`lib/forbidden-words.ts`):
  - 1차: `/(진단|장애|치료|환자|병|증상)/g`
  - 2차 (확장): `/(아프|장애아|문제아|이상)/g`
  - 추후 운영 데이터 기반 추가
- [ ] **응답 본문 스캔 패턴**:
  - HTML 응답 (RSC 결과)에 대해 NextResponse 본문을 스트리밍으로 정규식 매칭
  - 발견 시 응답 가로채기 → 안전 페이지로 리다이렉트 또는 텍스트 치환
- [ ] **요청 페이로드 스캔** (Server Action 입력):
  - `analyzeDiagnosis` 입력 transcript도 스캔 (사용자 발화에 의료 용어 포함 시 알림)
  - 단, 사용자 발화는 차단하지 않고 로깅만 (자녀 자연 발화 보호)
- [ ] **AI 응답 스캔** (gemini → DB INSERT 직전):
  - API-011 어댑터 출력 후처리에서 적용 (FR-C-001 5단계와 통합)
- [ ] 차단 시 로깅:
  - `audit_log` 또는 별도 `forbidden_word_log` 테이블에 INSERT
  - Slack Alert (1일 5건 초과 시 임계 알림)
- [ ] 화이트리스트 예외:
  - "치료사", "치료실" 등 직업명/장소명은 허용 (정규식 lookahead/lookbehind 사용)
- [ ] **Sprint 1 인라인 검증과 통합**:
  - FR-Q-002의 인라인 검증을 본 Middleware로 점진 이전
  - Sprint 1 검증 통과 후 본 태스크로 단일화

## 🧪 Acceptance Criteria
**Scenario 1: 금칙어 자동 탐지 (REQ-FUNC-HITL-002)**
- **Given**: aiCushionText에 "진단" 포함된 RSC 응답
- **When**: Middleware 통과
- **Then**: 응답 본문에서 "진단" 발견 → 안전 문구로 치환 또는 차단

**Scenario 2: 화이트리스트 예외**
- **Given**: "치료사" 또는 "치료실" 단어
- **When**: 스캔
- **Then**: 차단되지 않음 (직업명 허용)

**Scenario 3: 사용자 발화는 로깅만**
- **Given**: transcript에 "아파요"
- **When**: Server Action 진입
- **Then**: 로깅만, 차단 없음 (자연 발화 보호)

**Scenario 4: 1일 5건 초과 Slack Alert**
- **Given**: 5건 누적
- **When**: 6번째 발견
- **Then**: Slack 알림 1회 발송 (중복 방지)

**Scenario 5: forbidden_word_log INSERT**
- **Given**: 1건 발견
- **When**: 미들웨어 처리
- **Then**: 로그 row 생성 (요청 경로, 발견 단어, timestamp, 사용자 ID)

**Scenario 6: 성능 영향 ≤ 50ms**
- **Given**: 평균 응답 본문 50KB
- **When**: 정규식 스캔
- **Then**: 처리 시간 ≤ 50ms (REQ-FUNC-010 RSC ≤ 1500ms 영향 미미)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-013**: 금칙어 0건 보장
- **REQ-FUNC-HITL-002**: Middleware 자동 탐지
- **CON-04 / ADR-04**: 의료 용어 배제
- **R1**: 의료행위 취급 회피
- **횡단 제약**:
  - [ ] **CON-04 핵심 구현체** — 본 태스크가 횡단 제약의 실질적 강제 지점
  - [ ] 화이트리스트 정확성 — 직업명/지명 허용 (정규식 정밀도)
  - [ ] 성능 보호 — 스트리밍 스캔 (전체 본문 메모리 로딩 회피)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 정규식 단위 테스트 (TEST-005 책임)
- [ ] 화이트리스트 예외 검증
- [ ] `tsc --strict` 0 errors
- [ ] forbidden_word_log 마이그레이션 + Slack Alert 1회 검증
- [ ] FR-Q-002 인라인 검증을 본 Middleware로 통합
- [ ] PR 본문에 REQ-FUNC-013/HITL-002 + CON-04 + ADR-04 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-010 (Middleware 진입점), DB-011 (forbidden_word_log + RLS)
- **Blocks**: TEST-005, FR-Q-002 (인라인 검증 통합 점), 모든 RSC 페이지 (Middleware 통과 시)
- **Discope 영향**: 해당 없음 (Sprint 1엔 인라인 검증 → P1에서 Middleware로 단일화)
