# SRS 프롬프트 호환성 검토 보고서
**대상 PRD**: `54_PRD_V10_Final.md` (v1.0 Final)  
**대상 프롬프트**: 이전 프로젝트 SRS 생성 프롬프트  
**검토 일시**: 2026-05-07  
**검토 목적**: 기존 SRS 프롬프트를 본 프로젝트 PRD에 적용 시 호환성 검증 및 수정 사항 도출

---

## 검토 결론 (Executive Summary)

> [!IMPORTANT]
> 프롬프트의 **기본 구조와 ISO 29148 프레임워크는 그대로 사용 가능**합니다.
> 다만, 본 PRD의 구조가 이전 프로젝트(F1~F6, §1~§9)보다 **대폭 확장(F1~F18 + 21 Epic, §1~§11)**되어 있어,
> **매핑 규칙(§4)의 섹션 번호 및 Epic 범위를 반드시 수정**해야 합니다. 수정하지 않으면 11개 Epic이 SRS에서 누락됩니다.

| 영역 | 판정 | 이슈 |
|:---|:---:|:---|
| §1~§3 출력 구조 | ✅ 호환 | 그대로 사용 가능 |
| §4 매핑 규칙 | ⚠️ **수정 필요 (7건)** | 섹션 번호 불일치, Epic 범위 축소, 신규 섹션 누락 |
| §5 필수 규칙 | ⚠️ **수정 필요 (1건)** | 규칙 2번의 "F1~F6" 범위 |
| §6~§8 스타일/출력 | ✅ 호환 | 그대로 사용 가능 |

---

## 상세 검토: §4 매핑 규칙 수정 사항 (7건)

### 수정 1: PRD 기능 범위 확장 (F1~F6 → F1~F18, 21 Epic)

**현재 프롬프트:**
```
[PRD 4. 기능 명세 → SRS 4.1 Functional Requirements]
- PRD: F1~F6 기능 = SRS: 다수의 REQ-FUNC로 분해
```

**수정안:**
```
[PRD §4. 기능 요구사항 (MoSCoW) → SRS 4.1 Functional Requirements]
- PRD: 21개 Epic (F1-a/b, F2, F3-a/b, F4~F7, F9-a/b/c/d, F10~F12, F14~F18)
  = SRS: 다수의 REQ-FUNC로 분해
- PRD: MoSCoW 4단계 (Must 6 / Should 10 / Could 5 / Won't 4)
  = SRS: Priority 컬럼 반영
- PRD: §4.4 Epic별 스프린트 분해 추정
  = SRS: 각 REQ-FUNC의 Effort Estimate 참조
```

> [!CAUTION]
> 이 수정을 하지 않으면 Should(10개)와 Could(5개) Epic **총 15개가 SRS에서 누락**됩니다.

---

### 수정 2: PRD 섹션 번호 전체 재매핑

이전 프로젝트 PRD는 §1~§9 구조였으나, 본 PRD는 §1~§11로 확장되었습니다.

| 프롬프트 현재 매핑 | 본 PRD 실제 섹션 | 수정 필요 |
|:---|:---|:---:|
| PRD 1. 문제 정의 및 목표 | §1. 개요 및 목표 (§1.1~§1.5) | ✅ 호환 |
| PRD 2. 사용자 정의 | §2. 사용자와 역학 관계 (§2.1~§2.4) | ✅ 호환 |
| PRD 3. 사용자 스토리 | §3. 사용자 스토리와 수용 기준 (S1~S6 + HITL 프로토콜) | ⚠️ HITL 추가 |
| PRD 4. 기능 명세 | §4. 기능 요구사항 MoSCoW (§4.0~§4.4) | ⚠️ 범위 확장 |
| PRD 5. 품질/성능 기준 | §5. 비기능 요구사항 NFR | ✅ 호환 |
| PRD 6. 데이터 및 기술 명세 | §6. 시스템 및 데이터 아키텍처 (ERD + API) | ✅ 호환 |
| PRD 7. 범위 및 제약사항 | §7. 범위, 리스크, 가정 및 의존성 | ⚠️ R6 피벗 추가 |
| PRD 8. 검증 계획 | §8. 실험, 롤아웃 및 측정 계획 (EXP-1~4 + 벤치마크 + Lock-in) | ⚠️ 확장 |
| PRD 9. 참고 자료 | §9. 근거 (AOS/DOS + JTBD + TAM-SAM-SOM + Traceability) | ⚠️ 확장 |
| **(없음)** | **§10. ADR (아키텍처 결정 기록)** | 🔴 **신규 추가 필요** |
| **(없음)** | **§11. 용어 사전 (Glossary)** | 🔴 **신규 추가 필요** |

---

### 수정 3: §10 ADR 매핑 규칙 신설

**추가할 매핑 규칙:**
```
[PRD §10. ADR (아키텍처 결정 기록) → SRS 1.x Constraints + Appendix]
- PRD: ADR-01~04 (Zero-touch, HITL, 음성 폐기, 의료 용어 배제)
  → SRS: 1.5 Constraints / Assumptions에 설계 제약으로 반영
  → SRS: Appendix에 ADR 원문 참조 첨부
```

---

### 수정 4: §11 용어 사전 매핑 규칙 신설

**추가할 매핑 규칙:**
```
[PRD §11. 용어 사전 (Glossary) → SRS 1.3 Definitions]
- PRD: §11 Glossary 30개 용어
  → SRS: 1.3 Definitions, Acronyms, Abbreviations에 그대로 이관
```

---

### 수정 5: HITL 공통 설계 원칙 매핑 추가

PRD §3에 Story S1~S6 외에 **HITL 안전 프로토콜 4원칙**이 공통 설계 원칙으로 존재합니다.

**추가할 매핑 규칙:**
```
[PRD §3. HITL 안전 프로토콜 → SRS 4.1 Functional Requirements (Cross-cutting)]
- PRD: HITL 4원칙 (자동 에스컬레이션, 의료 판단 회피, SLA 보장, 루프백 재학습)
  → SRS: REQ-FUNC-HITL-xxx 형태의 크로스커팅 기능 요구사항으로 분해
```

---

### 수정 6: CJM 매핑 및 4대 극한 반영

PRD §2.4(CJM 매핑)과 §4-0(4대 극한)은 이전 프로젝트에 없던 구조입니다.

**추가할 매핑 규칙:**
```
[PRD §2.4 CJM + §4-0 Four Extremes → SRS 2. Stakeholders + 1.1 Purpose]
- PRD: CJM 여정별 성공 지표(KPI)
  → SRS: 2.x Stakeholders의 Interest/Success Criteria로 반영
- PRD: 4대 극한 가치 선언
  → SRS: 1.1 Purpose의 설계 철학 (Design Philosophy)으로 기술
```

---

### 수정 7: R6 피벗 시나리오 반영

PRD §7.2 R6에 구체적 피벗 시나리오(Plan B)가 있으므로 SRS에도 반영해야 합니다.

**추가할 매핑 규칙:**
```
[PRD §7.2 R6 피벗 시나리오 → SRS 1.5 Constraints / Appendix]
- PRD: R6 Plan B (F4 재설계, F12 강화, F5 리디자인, EXP-2b)
  → SRS: Appendix - Contingency Plan으로 명시
```

---

## 상세 검토: §5 필수 규칙 수정 사항 (1건)

### 수정 8: 규칙 2번 Epic 범위 수정

**현재:**
```
2) F1~F6 주요 기능은 반드시 여러 개의 REQ-FUNC로 분해한다.
```

**수정안:**
```
2) 21개 Epic(F1-a/b ~ F18) 전체를 반드시 여러 개의 REQ-FUNC로 분해한다.
   Must(6) → 최소 Epic당 3~5개 REQ-FUNC,
   Should(10) → 최소 Epic당 2~3개 REQ-FUNC,
   Could(5) → 최소 Epic당 2개 REQ-FUNC.
```

---

## 추가 권고: SRS 볼륨 관리

> [!WARNING]
> 본 PRD는 21 Epic × 평균 3개 REQ-FUNC = **최소 63개 기능 요구사항**이 생성됩니다.
> 여기에 NFR, Interface, Data 요구사항을 합산하면 **총 100개 이상의 요구사항**이 예상됩니다.
>
> **권고**: SRS를 **Phase별(Phase 0 / Phase 1 / Phase 2)로 분할 작성**하거나,
> 하나의 문서 내에서 Phase 태그를 달아 관리하는 것을 추천합니다.

---

## 수정 완료 후 사용할 프롬프트 §4 교체 텍스트

아래는 본 프로젝트에 맞게 수정된 **§4 매핑 규칙** 전문입니다:

```
================================================================
# 4. PRD → SRS 매핑 규칙 (필수 준수)

[PRD §1. 개요 및 목표 → SRS 1. Introduction]
- PRD §1.1: 문제 정의 (4대 Pain Cluster) → SRS 1.1 Purpose
- PRD §1.2: Desired Outcome (O-1~O-4) → SRS 1.2 Scope + SRS 4.2 NFR 정량 기준
- PRD §1.3: 북극성/보조 KPI (W-AUR 등 7개) → SRS 4.2 NFR
- PRD §1.4: 차별 가치 (Differential Value) → SRS 1.1 Purpose 하위 설계 철학
- PRD §1.5: 전환 트리거 3대 인사이트 → SRS 2. Stakeholders Interest

[PRD §2. 사용자와 역학 관계 → SRS 2. Stakeholders + 1.3 Definitions]
- PRD §2.1: 페르소나 (Seg A/B/C/D-1/D-2) → SRS 2.x Stakeholder 역할로 변환
- PRD §2.2: DMU 영향력 관계 → SRS 2.x 역할 간 의존성으로 기술
- PRD §2.3: Intervention Dependency → SRS 3. System Context 참조
- PRD §2.4: CJM 매핑 + KPI → SRS 2.x Stakeholders의 Success Criteria

[PRD §3. 사용자 스토리와 AC → SRS 4.1 Functional Requirements]
- PRD: Story S1~S6 = SRS: 요구사항의 Source
- PRD: AC (Given/When/Then) = SRS: Acceptance Criteria
- PRD: Negative AC = SRS: Exception Handling 요구사항
- PRD: HITL 안전 프로토콜 4원칙 = SRS: REQ-FUNC-HITL-xxx 크로스커팅 요구사항

[PRD §4. 기능 요구사항 MoSCoW → SRS 4.1 Functional Requirements]
- PRD: 21개 Epic (Must 6 / Should 10 / Could 5)
  = SRS: 다수의 REQ-FUNC로 분해 (최소 63개)
- PRD: Won't 4건 = SRS: 1.2 Scope Out-of-Scope에 명시
- PRD: MoSCoW → SRS: Priority 컬럼 + Phase 태그
- PRD §4.2: Gantt 로드맵 → SRS: Appendix Implementation Timeline
- PRD §4.3: 수익 구조 → SRS: 1.1 Purpose 비즈니스 컨텍스트
- PRD §4.4: 스프린트 분해 → SRS: 각 REQ-FUNC Effort Estimate 참조

[PRD §5. 비기능 요구사항 → SRS 4.2 Non-Functional Requirements]
- PRD: 성능 6항목, 신뢰성 4항목, SLA 6항목, 보안 3항목, 모니터링 5종
  → SRS 4.2 NFR 표로 전환 (REQ-NF-xxx ID 부여)

[PRD §6. 시스템 및 데이터 아키텍처 → SRS 3. System Context + Appendix]
- PRD §6.1: ERD → Appendix 6.2 Entity & Data Model
- PRD §6.2: API 명세 → SRS 3.3 API Overview + Appendix 6.1 API Endpoint List

[PRD §7. 범위, 리스크, 가정 → SRS 1.2 Scope + 1.5 Constraints]
- PRD §7.1: In/Out Scope → SRS 1.2 Scope
- PRD §7.2: 리스크 R1~R6 → SRS 1.5 Constraints & Risk Mitigation
- PRD §7.2 R6 Plan B: 피벗 시나리오 → Appendix: Contingency Plan
- PRD §7.3: 가정 A1~A4 + 의존성 D1~D4 → SRS 1.5 Assumptions & Dependencies

[PRD §8. 실험, 롤아웃 → Appendix + SRS 4.2 NFR]
- PRD §8.1~8.3: 실험 설계 EXP-1~4 → Appendix: Validation Plan
- PRD §8.4: 벤치마크 8항목 → SRS 4.2 NFR 성능 기준 참조
- PRD §8.5: Lock-in 전략 → SRS 4.1 관련 REQ-FUNC의 Rationale

[PRD §9. 근거 → References]
- PRD §9.0: AOS/DOS 매트릭스 → REF-01
- PRD §9.0-b: JTBD 검증 상태 → REF-02
- PRD §9.0-c: TAM-SAM-SOM → REF-03
- PRD §9.1: Traceability Matrix → REF-04
- PRD §9.3: VPS 원본 → REF-05

[PRD §10. ADR → SRS 1.5 Constraints + Appendix]
- PRD: ADR-01~04 → SRS 1.5 Architectural Constraints
- 각 ADR의 시스템 영향도 → SRS 해당 REQ-FUNC의 Implementation Note

[PRD §11. 용어 사전 → SRS 1.3 Definitions]
- PRD: Glossary 30개 용어 → SRS 1.3에 그대로 이관
================================================================
```

---

## 수정 완료 후 사용할 §5 규칙 2번 교체 텍스트

```
2) 21개 Epic(F1-a/b ~ F18) 전체를 반드시 여러 개의 REQ-FUNC로 분해한다.
   Must(6) → 최소 Epic당 3~5개 REQ-FUNC,
   Should(10) → 최소 Epic당 2~3개 REQ-FUNC,
   Could(5) → 최소 Epic당 2개 REQ-FUNC.
   HITL 프로토콜 4원칙 → REQ-FUNC-HITL-xxx로 별도 분해.
```

---

## 최종 체크리스트

| # | 확인 항목 | 상태 |
|:---:|:---|:---:|
| 1 | §4 매핑 규칙: PRD §1~§11 전체 커버 | ⬜ 수정 후 확인 |
| 2 | §5 규칙 2: Epic 범위 F1~F18 (21개) 반영 | ⬜ 수정 후 확인 |
| 3 | §2 입력: PRD 파일명 `54_PRD_V10_Final.md` 지정 | ⬜ 수정 후 확인 |
| 4 | §8 출력: 경로 `From PRD to SRS/` 지정 | ⬜ 수정 후 확인 |
| 5 | SRS 볼륨: Phase별 분할 또는 Phase 태그 결정 | ⬜ 사용자 결정 필요 |
