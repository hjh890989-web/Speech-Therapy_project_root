---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Ops] OPS-003: 식약처 사전 검토 신청 (Grill #3A C2) — 건강관리용 SW 가이드라인 적용 여부"
labels: 'phase:p2, mode:external, domain:ops, epic:mfds, sprint:user-pending'
assignees: ''
---

## 🎯 Summary
- **Task ID**: OPS-003
- **Epic / Story**: 식약처 사전 검토 신청 (V07 Grill #3A C2, 외부 의존)
- **Phase**: 🔴 **후순위** (OPS-002 변호사 의견 반영 후, 외부 의존)
- **Mode**: 외부 의존 (코드 산출물 0건)
- **Discope 적용**: 해당 없음
- **목적**: 본 서비스가 한국 식약처의 "건강관리용 소프트웨어 가이드라인" 의 의료기기 / 비의료기기 분류에 어디 해당하는지 식약처에 사전 검토 정식 신청. **신청 trigger = OPS-002 변호사 의견이 "의료기기 분류 가능성 있음" 일 때만**. 변호사가 "비의료기기 명확" 판단 시 본 task 보류.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.7 의료기기법 disclaimer (SEC-008 의 입력)
  - §12.11 출시 체크리스트
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-D OPS-003
- **참조 자료** (사용자 측 사전 검토 필요):
  - 식약처 "건강관리용 소프트웨어 가이드라인 (2022)"
  - 식약처 의료기기 분류 기준 (의료기기법 §3)
- **Grill 메모리**: `project_compliance_grill_3a.md` — C2

## ✅ Task Breakdown
- [ ] (선행 게이트) OPS-002 변호사 자문 결과 = "의료기기 분류 가능성 있음" 확인
- [ ] (사용자 측) 식약처 사전 검토 신청 양식 다운로드 (`mfds.go.kr`)
- [ ] (사용자 측) 신청서 작성 — 서비스 개요 + 기능 명세 + UI 캡처 + disclaimer 문구
- [ ] (사용자 측) 식약처 사전 검토 신청 (수수료 + 약 4~12주 소요)
- [ ] (사용자 측) 식약처 검토 결과 수령 — "의료기기" / "비의료기기" 판정
- [ ] (사용자 측) 결과 → `docs/compliance-mfds-review-result.md` (가칭) 작성
- [ ] (분기) 의료기기 판정 시 → 임상시험 + 인증 절차 (대규모 추가 task) + 서비스 보류
- [ ] (분기) 비의료기기 판정 시 → 현재 disclaimer + 5중 가드 그대로 정식 출시 가능

## 🧪 Acceptance Criteria
**Scenario 1: 선행 게이트 (OPS-002 결과 기반)**
- **Given**: OPS-002 자문 결과
- **When**: 변호사 의견 검토
- **Then**: "의료기기 가능성 있음" → 본 OPS-003 활성 / "비의료기기 명확" → 본 OPS-003 보류

**Scenario 2: 식약처 검토 결과 = "비의료기기"**
- **Given**: 검토 결과서 수령
- **When**: 판정 = "비의료기기"
- **Then**: 현재 SEC-008 disclaimer + 5중 가드 그대로 정식 출시 가능 + §12.11 체크리스트 통과

**Scenario 3: 식약처 검토 결과 = "의료기기"**
- **Given**: 검토 결과서 수령
- **When**: 판정 = "의료기기"
- **Then**: 서비스 보류 + 임상시험 / 의료기기 인증 절차 (대규모 추가 task) — 본 서비스 전체 재설계 필요 가능성

**Scenario 4: 신청 미진행 (영구 보류) 시 risk**
- **Given**: 사용자가 신청 미진행 결정
- **When**: 정식 출시
- **Then**: 의료기기법 위반 시 시정명령 / 제품 회수 / 형사처벌 risk 잔존 (현재 SEC-008 disclaimer 로 완화 시도 중)

**Scenario 5: 부활 조건**
- **Given**: 본 task 가 보류 상태
- **When**: OPS-002 결과로 "의료기기 가능성 있음" 확정
- **Then**: 본 task list 재진입 + 사용자 측 식약처 신청 path 활성

## ⚙️ Technical & Non-Functional Constraints
- **외부 의존**: 식약처 일정 — 평균 4~12주
- **법적 risk**: "비의료기기" 판정 못 받으면 정식 출시 risk 잔존
- **횡단 제약**:
  - [ ] CON-04 금칙어: 식약처 검토 시 disclaimer 문구 적합성 동시 검토
  - [ ] R4 개인정보: 의료기기 분류 시 영유아 음성 처리 추가 규제 가능
- **비용**: 식약처 수수료 + 컨설팅 (선택) — 자세한 비용은 OPS-002 변호사 자문 시 결정
- **부활 조건**: OPS-002 자문 결과가 trigger

## 🏁 Definition of Done
- [ ] OPS-002 변호사 결과로 "의료기기 가능성 있음" 확정
- [ ] 식약처 사전 검토 신청 (사용자 측)
- [ ] 검토 결과서 수령 + `docs/compliance-mfds-review-result.md` 작성
- [ ] 결과 기반 분기 결정 ("비의료기기" → 출시 가능 / "의료기기" → 재설계)
- [ ] §12.11 출시 체크리스트 "식약처 의견" 항목 충족
- [ ] PR 없음 (외부 의존 — `docs/compliance-mfds-review-result.md` commit 만)

## 🚧 Dependencies & Blockers
- **Depends on**: OPS-002 (변호사 자문 결과 = 본 task trigger), SEC-008 (의료기기법 disclaimer 현황)
- **Blocks**: OPS-004 (정식 출시 path), 정식 서비스 출시
- **Discope 영향**: 해당 없음 (외부 의존)
