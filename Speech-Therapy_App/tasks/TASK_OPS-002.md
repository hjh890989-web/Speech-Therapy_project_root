---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Ops] OPS-002: 변호사 자문 의뢰 (Grill #3A C1) — 30~50만원 / 2~4주 외부 의존"
labels: 'phase:p1, mode:external, domain:ops, epic:legal, sprint:user-pending'
assignees: ''
---

## 🎯 Summary
- **Task ID**: OPS-002
- **Epic / Story**: 변호사 자문 의뢰 (V07 Grill #3A C1, 외부 의존)
- **Phase**: 🟡 **사용자 측 의뢰 대기** (외부 의존)
- **Mode**: 외부 의존 (코드 산출물 0건)
- **Discope 적용**: 해당 없음
- **목적**: 본 sub-session 의 PIPA 5중 가드 + 의료기기법 disclaimer 가 한국 법령 (PIPA / 의료기기법 / 약관규제법 / 전자상거래법) 에 정합하는지 변호사 정식 자문. `docs/compliance-lawyer-consultation-brief.md` 의 자문 brief 활용. **변호사 자문 결과 = OPS-004 의 `/privacy` + `/terms` 정식 교체 + OPS-003 식약처 사전 검토 적용 여부 결정의 입력**.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.10 변호사 자문 의뢰 brief
  - §12.11 출시 체크리스트 (자문 결과 후 정식 출시)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-D OPS-002
- **자문 brief**: `docs/compliance-lawyer-consultation-brief.md`
- **Grill 메모리**: `project_compliance_grill_3a.md` — 4건 상태 (A1~A5 코드 done, 외부 의존만 잔여)

## ✅ Task Breakdown
- [ ] (사용자 측) 변호사 사무소 3곳 견적 비교 (의료헬스케어 / 개인정보 분야)
- [ ] (사용자 측) `docs/compliance-lawyer-consultation-brief.md` 변호사에게 송부
- [ ] (사용자 측) 자문료 입금 — 예상 30~50만원
- [ ] (사용자 측) 자문 회신 수령 — 예상 2~4주
- [ ] (사용자 측) 자문 회신 → `docs/compliance-lawyer-consultation-result.md` (가칭) 작성
- [ ] (코드 측) 자문 결과 반영 → OPS-004 (`/privacy` + `/terms` 정식 교체)
- [ ] (코드 측) 의료기기법 해석 결과 → OPS-003 식약처 사전 검토 필요 여부 결정
- [ ] PIPA 5중 가드 강화 / 약화 권고 사항 → SEC-005~009 재검토

## 🧪 Acceptance Criteria
**Scenario 1: 자문 brief 송부 (사용자 측)**
- **Given**: `docs/compliance-lawyer-consultation-brief.md` 완성본
- **When**: 변호사 사무소에 이메일 송부
- **Then**: 견적 회신 + 자문료 송금 + 진행 확정

**Scenario 2: 자문 회신 수령**
- **Given**: 자문료 입금 + 2~4주 경과
- **When**: 변호사 자문서 수령
- **Then**: 다음 5 항목 명시 회신:
  - (a) PIPA §22-6 부모 대리 동의 형식 적합성
  - (b) PIPA §17 국외 이전 동의 문구 적합성
  - (c) 의료기기법 disclaimer 충분성 (식약처 사전 검토 필요 여부)
  - (d) 약관 (`/terms`) + 개인정보처리방침 (`/privacy`) 정식 안 (변호사 작성 / 사용자 검수)
  - (e) CON-04 금칙어 (`치료/진단/장애`) 완전성

**Scenario 3: 자문 결과 → OPS-003 / OPS-004 분기**
- **Given**: 변호사 자문서 수령
- **When**: (c) 결과 검토
- **Then**: 식약처 사전 검토 필요 = "예" 면 → OPS-003 활성, "아니오" 면 → OPS-003 보류 + OPS-004 단독 진행

**Scenario 4: 자문 미의뢰 (영구 보류) 시 risk 명시**
- **Given**: 사용자가 자문 미진행 결정
- **When**: 정식 출시 시도
- **Then**: §12.11 출시 체크리스트 의 "외부 자문 통과" 항목 미충족 → 정식 출시 보류 + placeholder 유지

**Scenario 5: 부활 조건 (= 사용자 측 의뢰 시점)**
- **Given**: 본 task 가 보류 상태
- **When**: 사용자가 견적 비교 + 자문료 입금
- **Then**: 본 task 의 사용자 측 task list 재개 + 코드 측 OPS-004 / OPS-003 활성 준비

## ⚙️ Technical & Non-Functional Constraints
- **외부 의존**: 본 task 는 코드 산출물 0건 — 사용자 측 시간 / 비용 / 변호사 일정 의존
- **법적 risk**: 자문 없이 정식 출시 시 PIPA / 의료기기법 위반 risk 잔존
- **횡단 제약**:
  - [ ] R4 개인정보: 자문 결과로 강화될 수 있음
  - [ ] CON-04 금칙어: 자문 결과로 alternative 표현 보강
  - [ ] CON-05 5중 가드: 자문 결과로 6중 / 4중 조정 가능
- **비용**: 자문료 30~50만원 (G2 비용 가드레일과 별개 — 1회성 법무 비용)
- **부활 조건**: 사용자 측 의뢰 결정 시점에 본 task list 의 [ ] 재진입

## 🏁 Definition of Done
- [ ] 변호사 견적 비교 (사용자 측, 3곳)
- [ ] 자문료 입금 (사용자 측)
- [ ] 자문서 수령 + `docs/compliance-lawyer-consultation-result.md` 작성
- [ ] 5 항목 명시 자문 (PIPA §22-6, §17, 의료기기법, 약관/방침, 금칙어)
- [ ] 자문 결과 → OPS-003 / OPS-004 분기 결정
- [ ] §12.11 출시 체크리스트 "외부 자문 통과" 항목 충족
- [ ] PR 없음 (외부 의존 — `docs/compliance-lawyer-consultation-result.md` commit 만)

## 🚧 Dependencies & Blockers
- **Depends on**: SEC-005~009 (자문 brief 의 코드 산출물 입력), `docs/compliance-lawyer-consultation-brief.md`
- **Blocks**: OPS-003 (식약처 사전 검토 필요 여부 결정), OPS-004 (`/privacy` + `/terms` 정식 교체), 정식 출시
- **Discope 영향**: 해당 없음 (외부 의존)
