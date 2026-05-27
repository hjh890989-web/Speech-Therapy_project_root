---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-024: F17 통합 케어로그 + F4 주간 리포트 시각화 단위 테스트"
labels: 'phase:p1, mode:active, domain:test, epic:f17-care-log, sprint:p1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-024
- **Epic / Story**: F17 통합 케어로그 + F4 주간 리포트 시각화 (V07 신규)
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: F17 부모 직접 입력 (자유놀이 시간 + 외부 센터 세션 메모) + 외부 센터 기록 통합 케어로그 + F4 주간 리포트 시각화 단위 테스트. REQ-FUNC-041~043 (자유놀이/외부 세션/통합 view) 와 FR-Q-005 (주간 리포트) 의 차트 정합성 검증.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 F17 (통합 케어로그)
  - REQ-FUNC-041 (부모 직접 입력 자유놀이)
  - REQ-FUNC-042 (외부 센터 세션 메모)
  - REQ-FUNC-043 (통합 view)
  - REQ-FUNC-027 (주간 리포트 — F4)
  - V06 REQ-FUNC-042 (FR-Q-013 / DB-004) 기반 보강
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §3 TEST-024
- **선행 구현**: FR-C-030 (submit_care_log), FR-Q-005 (주간 리포트 view)

## ✅ Task Breakdown
- [ ] `__tests__/unit/care-log.test.ts`:
  - test 1 — submit_care_log Server Action — 부모 입력 텍스트 → care_logs INSERT (자유놀이 시간 type='free_play')
  - test 2 — 외부 센터 세션 메모 INSERT (type='external_session', therapistName 옵션)
  - test 3 — 통합 view 쿼리 — care_logs + evaluation_results JOIN → 시간순 정렬
  - test 4 — 주간 누적 자유놀이 분 단위 집계 (sum aggregation)
  - test 5 — Zod 입력 검증 (description ≤ 500자, duration > 0)
- [ ] `__tests__/integration/weekly-report-care-log.test.ts`:
  - test 1 — 주간 리포트 (F4) 생성 시 care_logs 시각화 데이터 통합
  - test 2 — 자유놀이 시간 차트 데이터 (요일별 분 단위) 정확성
  - test 3 — 외부 센터 세션 메모 timeline 정합
  - test 4 — care_logs 0건일 때 "데이터 부족" 처리 (REQ-FUNC-029 정합)
- [ ] CR-2026-004 정합 — care_logs.description 의 의료 금칙어 검증 (FR-C-005 helper 재사용)

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: 부모 직접 입력 (REQ-FUNC-041)**
- **Given**: user 가 자유놀이 30분 + description "함께 동화책 읽었어요"
- **When**: submit_care_log 호출
- **Then**: care_logs INSERT type='free_play', duration=30, description 저장

**Scenario 2: 외부 센터 세션 메모 (REQ-FUNC-042)**
- **Given**: user 입력 type='external_session', therapistName='김선생님', duration=40
- **When**: submit_care_log
- **Then**: care_logs INSERT + 외부 센터 메타 저장

**Scenario 3: 통합 view 시간순 정렬 (REQ-FUNC-043)**
- **Given**: care_logs 3건 + evaluation_results 2건 (5일간)
- **When**: 통합 view 쿼리
- **Then**: 5건 모두 시간순 정렬 반환, type 컬럼으로 구분 가능

**Scenario 4: 주간 자유놀이 집계 (F4)**
- **Given**: 1주일 자유놀이 7건 (각 30분)
- **When**: 주간 리포트 집계
- **Then**: sum=210분, 요일별 차트 데이터 정합

**Scenario 5: care_logs 0건 데이터 부족 처리 (REQ-FUNC-029)**
- **Given**: care_logs 0건
- **When**: 주간 리포트 생성
- **Then**: 차트 영역에 "기록이 부족합니다" 메시지 노출, 차트 0 데이터

**Scenario 6: Zod 입력 검증**
- **Given**: description 600자 입력 (limit 500자 초과)
- **When**: submit_care_log
- **Then**: ZodError throw, INSERT 0건

**Scenario 7: 금칙어 검증 (CON-04)**
- **Given**: description 에 "치료" 포함
- **When**: submit_care_log
- **Then**: 금칙어 검출 → 사용자에 alert "의료 표현은 사용 불가합니다" + INSERT 차단 (또는 sanitize 후 저장 정책에 따라)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-041~043**: F17 통합 케어로그
- **REQ-FUNC-027**: 주간 리포트 자동 생성 (F4)
- **REQ-FUNC-029**: 데이터 불충분 처리
- **횡단 제약**:
  - [ ] **R4**: care_logs.description 의 인명/식별 정보 sanitize (audit_sanitize_jsonb 재사용 검토)
  - [ ] **CON-04**: description 의 의료 금칙어 검증 (FR-C-005 재사용)
  - [ ] **Disclaimer**: 주간 리포트 페이지에 disclaimer 노출 (FR-Q-005 책임)
  - [ ] **G2**: 무료 한도 내
- **REQ-NF-001**: 주간 리포트 p95 ≤ 800ms

## 🏁 Definition of Done
- [ ] 7 시나리오 단위 + 통합 테스트 PASS
- [ ] Zod 입력 검증 PASS
- [ ] 금칙어 검증 PASS
- [ ] 통합 view 시간순 정렬 정합
- [ ] 데이터 부족 처리 (REQ-FUNC-029) 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-041~043 + REQ-FUNC-027 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-030 (submit_care_log), FR-Q-005 (주간 리포트 view), DB-004 (care_logs schema), FR-C-005 (금칙어 helper)
- **Blocks**: F17 정식 출시 게이트
- **Discope 영향**: 해당 없음
