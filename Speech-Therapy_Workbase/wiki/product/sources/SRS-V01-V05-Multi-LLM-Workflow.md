---
type: source
pillar: product
title: SRS V01-V05 Multi-LLM Workflow — 호환성·프롬프트·검토·비교·통합 5 메타 통합
source_path: ../../../raw/55_SRS_Prompt_Compatibility_Review.md
source_path_b: ../../../raw/56_SRS_Generation_Prompt.md
source_path_c: ../../../raw/58_SRS_V01_Draft_Opus_Review_and_Action_Plan.md
source_path_d: ../../../raw/61_SRS_V03_Draft_Gemini_Review_and_Remediation_Plan.md
source_path_e: ../../../raw/63_SRS_Comparison_Analysis_Opus_vs_Gemini.md
source_type: meta_workflow
authors: []
year: 2026
ingested: 2026-05-09
tags: [SRS, MultiLLM, BestOfBreed, Opus, Gemini, ISO29148, 워크플로, 클러스터55-67]
---

# SRS V01-V05 Multi-LLM Workflow — 5 메타 통합

> **한 줄 요약.** PRD V10 → SRS V05 변환 워크플로의 5 메타 파일 통합. **사전 호환성 검토(55) → 표준 프롬프트(56) → Opus 트랙(V01-V02) + Gemini 트랙(V03-V04) 병렬 → 각 트랙 검토(58·61) → 비교 분석(63) → Best-of-Breed V05 통합**. 단일 LLM 편향 회피 + 강점 결합으로 Implementation-Ready SRS 도달.

> ⚠️ 본 문서는 메타 파일 5종(642줄) 정독 기반. V01-V05 본문 (57·59·60·62·64, 총 3,762줄)은 부분 정독만.

## 워크플로 6 단계

```
PRD V10 (54)
   ↓
[1단계] 사전 호환성 검토 (55)
   "이전 프로젝트 SRS 프롬프트가 본 PRD에 적용 가능한가?"
   → 8개 수정사항 도출
   ↓
[2단계] 표준 프롬프트 (56)
   ISO 29148 준수 + 매핑 규칙 + 10개 필수 규칙
   ↓
[3단계] 멀티 LLM 병렬 작성
   ┌─ Opus 트랙 (V01 Draft → V02 + Diagrams)
   └─ Gemini 트랙 (V03 Draft → V04 + Diagrams)
   ↓
[4단계] 각 트랙 검토 + Action Plan
   - 58: V01 Opus 검토 (8 기준, 4 다이어그램 누락)
   - 61: V03 Gemini 검토 (8 기준, 6 다이어그램 누락)
   ↓
[5단계] 비교 분석 (63)
   8 기준 × Opus vs Gemini 매트릭스
   → "Best-of-Breed" 권고
   ↓
[6단계] V05 Merged Master (64) → V06 Tech Stack 전환 (65)
```

## ⭐ 1단계 · 사전 호환성 검토 (55)

> **목적**: 이전 프로젝트 SRS 프롬프트(F1~F6, §1~§9)를 본 PRD V10(F1~F18 21 Epic, §1~§11)에 적용 시 누락 방지.

### 8 수정사항

| # | 수정 영역 | 이슈 |
|---|---|---|
| 1 | PRD 기능 범위 | F1~F6 → F1~F18 (21 Epic). **누락 시 Should/Could 15 Epic 사라짐** |
| 2 | 섹션 번호 | §1~§9 → §1~§11 전체 재매핑 (§10 ADR + §11 Glossary 신규 추가) |
| 3 | §10 ADR 매핑 | PRD ADR-01~04 → SRS 1.5 Constraints + Appendix |
| 4 | §11 용어 사전 | PRD Glossary 30개 → SRS 1.3 Definitions |
| 5 | HITL 4 원칙 | PRD §3 → SRS REQ-FUNC-HITL-xxx 크로스커팅 |
| 6 | CJM + 4 극한 | PRD §2.4 + §4-0 → SRS 2.x Stakeholders + 1.1 Design Philosophy |
| 7 | R6 피벗 시나리오 | PRD §7.2 → SRS Appendix Contingency Plan |
| 8 | §5 규칙 2번 Epic 범위 | "F1~F6" → "21 Epic 전체" |

### SRS 볼륨 예측 (사전)
> 21 Epic × 평균 3 REQ-FUNC = **최소 63개 기능 요구사항**. NFR + Interface + Data 합산 시 **100개 이상 요구사항 예상**. → 6 Part 분할 권고.

## ⭐ 2단계 · 표준 프롬프트 (56)

> **역할 정의**: "ISO/IEC/IEEE 29148:2018에 정통한 Senior Requirements Engineer"

### SRS 출력 7대 구조 (절대 변경 금지)
1. Introduction (1.1 Purpose / 1.2 Scope / 1.3 Definitions / 1.4 References / 1.5 Constraints)
2. Stakeholders (Role · Responsibility · Interest · Success Criteria)
3. System Context and Interfaces (3.1-3.4)
4. Specific Requirements (4.1 FR + 4.2 NFR)
5. Traceability Matrix (Story ↔ REQ ↔ TC)
6. Appendix (6.1 API + 6.2 Entity + 6.3 Sequences + 6.4 Timeline + 6.5 Validation + 6.6 Contingency + 6.7 ADR)

### 10대 필수 규칙
1. Story S1~S6 → FR Source 연결
2. **21 Epic 전체 분해**: Must 6 → Epic당 3-5 REQ-FUNC, Should 10 → 2-3개, Could 5 → 2개
3. p95·SLA·비용 → NFR 이동
4. 모든 API → System Context + Appendix 양쪽
5. 엔터티/스키마 → 표 구조화
6. **시퀀스 다이어그램 3.4 + 6.3 두 곳**: 핵심 (진단→미션→리포트→HITL) + 상세 (B2B Zero-touch, 전자서명, 보상)
7. In/Out Scope 명시 (Won't 4건 포함)
8. ADR + 리스크 + 가정 + 의존성 → Constraints/Assumptions 통합
9. References → REF-XX 형식 ID
10. **Atomic Requirement** (REQ-FUNC-xxx / REQ-NF-xxx) + Phase 태그 (P0/P1/P2)

### 작성 스타일
- 정확·간결·중복 금지
- "빠르게/적절히/원활히" 등 모호 표현 금지
- 한국어 본문 + 영문 ID/API/기술 용어
- 분할 작성 옵션: Part 1-6

## ⭐ 3-4단계 · Opus 트랙 + Gemini 트랙 병렬 + 검토

### Opus 트랙: V01 → V02 (with Diagrams)

| 단계 | 결과 |
|---|---|
| V01 (raw 57, **760줄**) | **65 REQ-FUNC** + 4 HITL + **30 REQ-NF** + 8 API. Atomic G/W/T 형식. ISO 29148 충실. 단, **UseCase·ERD·Class·Component 4 다이어그램 누락**. |
| **검토 (raw 58, 48줄)**: 8 기준 — 6 충족 / 1 부분(ERD 표만) / **1 미충족 (4 구조 다이어그램)** | Action Plan: Mermaid 4종 추가 |
| V02 (raw 59, **947줄**) | V01 + 4 누락 다이어그램 보완 → 완전 |

### Gemini 트랙: V03 → V04 (with Diagrams)

| 단계 | 결과 |
|---|---|
| V03 (raw 60, **450줄**) | **~45 REQ-FUNC** + 16 REQ-NF + 4 API. Feature-based 그룹화. **Epic 코드 ID** (REQ-FUNC-F1a-001) + **1:1 Traceability** + Validation Plan(EXP 1-4) + ADR + Gantt. 단, **6 다이어그램 누락 + 시퀀스 2개만**. |
| **검토 (raw 61, 50줄)**: 6 충족 / 2 미충족 (4 구조 다이어그램 + 시퀀스 부족) | Remediation Plan: Mermaid 6종 추가 (UseCase + Component + ERD + Class + 2 시퀀스) |
| V04 (raw 62, **686줄**) | V03 + 6 누락 보완 → 완전 |

## ⭐ 5단계 · 비교 분석 (63)

### 8 기준 비교 매트릭스

| Criteria | V02 Opus | V03 Gemini | Winner |
|---|---|---|---|
| 1. Story·AC → REQ-FUNC | 🟢 **65 atomic** G/W/T | 🟡 ~45 grouped | **Opus** |
| 2. KPI·NFR | 🟢 **30 + 비즈니스 KPI** (W-AUR, M3) | 🟡 16 technical only | **Opus** |
| 3. API 목록 | 🟢 **8 endpoints** | 🟡 4 endpoints | **Opus** |
| 4. Entity·Schema | 🟢 Full | 🟢 Full | Tie |
| 5. Traceability | 🟡 Range-based | 🟢 **1:1 Mapping QA-ready** | **Gemini** |
| 6. 핵심 다이어그램 | 🟢 Complete | 🟢 Complete | Tie |
| 7. Sequence (3-5) | 🟡 4 (main flow) | 🟢 **4 (edge case)** Reward Fallback + HITL | **Gemini** |
| 8. ISO 29148 준수 | 🟢 High (rigorous structure) | 🟡 Moderate | **Opus** |

### Opus 강점 (Technical Specification Leader)
- **Atomicity**: 65 독립 G/W/T = 개발자 구현·자동화 테스트 ideal
- **Business Alignment**: 비즈니스 KPI (Retention, CVR) → 기술 제약 직접 통합
- **Stakeholder Depth**: HITL Expert + System Admin 등 백엔드 actor
- **Visual**: Stakeholder DMU Dependency 다이어그램 (Opus 고유)
- **약점**: Validation Plan + Roadmap 부족

### Gemini 강점 (Strategic Integration Leader)
- **Traceability**: 1:1 row mapping (Stories ↔ Requirements)
- **Edge case 시퀀스**: Network disconnection / Reward recovery
- **Roadmap**: Gantt + EXP 1-4 + ADR
- **약점**: FR 그룹화 → 기술 정밀도 손실

## ⭐ 6단계 · Best-of-Breed V05 Merged Master (64)

| Component | Source | Reason |
|---|---|---|
| **Functional Requirements** | **Opus** | 65 atomic G/W/T 정밀도 |
| **Non-Functional** | **Opus** | 비즈니스 KPI 포함 |
| **API Specification** | **Opus** | 8 endpoints 완전 |
| **Traceability Matrix** | **Gemini** | 1:1 QA-ready 매핑 |
| **Sequence Diagrams** | **Gemini** | Edge case (Reward Fallback, HITL) |
| **Appendix (Roadmap/ADR)** | **Gemini** | Gantt + EXP + ADR 전략 컨텍스트 |

→ V05 Merged Master (raw 64, **919줄**) = Opus 65 FR + 30 NFR + 8 API + Gemini 1:1 Traceability + Edge sequences + EXP/ADR/Gantt Appendix.

→ 다음: V05 → **V06 Next.js Full-stack 전환** (raw 65, C-TEC-001~007 적용 + ADR-05~07 신규).

## ⭐ 멀티 LLM 워크플로 학습 포인트

### 패턴 1: 사전 호환성 검토
> 이전 프롬프트를 새 PRD에 적용하기 전 **8개 수정사항 사전 도출**. 누락 시 15 Epic 손실 → 사후 수정 비용 폭증.

### 패턴 2: 표준 프롬프트의 7대 구조 + 10대 규칙
> 명확한 역할 정의 ("ISO 29148 정통 Senior Requirements Engineer") + **불변 출력 구조** + 정량 규칙 (Epic당 REQ 개수). 단일 LLM도 강한 출력.

### 패턴 3: 멀티 LLM 병렬 작성
> Opus(precision) + Gemini(strategy) **병렬 트랙**. 단일 LLM 편향 회피.

### 패턴 4: 각 트랙 명시적 검토 (8 기준)
> 같은 8 검증 기준으로 양 트랙 평가. **무엇이 누락되었는가** 명시 + Action Plan으로 구체화.

### 패턴 5: 8 기준 비교 매트릭스
> Winner / Tie 명시. **각 기준의 우위 LLM 결정** = 정량적 융합 근거.

### 패턴 6: Best-of-Breed 통합
> 강점만 골라 **컴포넌트 단위 융합**. "Opus 65 FR + Gemini 1:1 Traceability + Gemini Edge sequences..."

### 패턴 7: 통합 후 기술 스택 전환
> V05 (technology-neutral) → V06 (Next.js full-stack) **별도 단계**. 비즈니스 의도 = V05 / 기술 결정 = V06 분리.

## 인용 가능 위치

| 메타 | 원본 |
|---|---|
| 8 호환성 수정사항 | 55 전체 (258줄) |
| ISO 29148 7대 구조 + 10 규칙 | 56 (216줄) |
| V01 Opus 8 검증 + 4 다이어그램 누락 | 58 (48줄) |
| V03 Gemini 8 검증 + 6 다이어그램 누락 | 61 (50줄) |
| Opus vs Gemini 8 기준 비교 + Best-of-Breed | 63 (70줄) |

## Clinical cross-link

- 본 메타 워크플로는 **임상 cross-link 없음** — 순수 프로세스/메타 자료.
- 다만 V05 Merged의 7 ADR (ADR-01~04 비즈니스/규제 + ADR-05~07 V06 신규 기술) 은 [[product/concepts/architecture-decisions]] 에서 임상 매핑 (ADR-04 의료 용어 배제 → 트랙1 회피 등).

## 관련 product 페이지

- [[product/concepts/multi-llm-workflow]] — 본 source의 정본 (워크플로 정본)
- [[product/concepts/SRS-evolution]] — V01-V06 진화 timeline (보강됨)
- [[product/sources/65-SRS-V06-Final]] — V05 Merged Master → V06 Next.js 전환 결과
- [[product/sources/66-PRD-to-SRS-Mapping-Review]] — V06 최종 검증 (9 기준 PASS)
- [[product/sources/54-PRD-V10-Final]] — Source PRD

## 보강 필요
- V01-V05 본문 (57·59·60·62·64) 직접 정독 — 본 source는 메타만. 실제 G/W/T 차이는 본문 비교 필요.
- raw 64 V05 Merged Master Final (919줄) 정독 — V06으로 전환 전 마지막 기술 중립 버전. **현재 wiki는 V06만 정본화**.
- 다른 도메인에서 본 워크플로 재사용 가능성 검증 — 일반화된 멀티 LLM 워크플로 추출 가치.
- V01 Opus + V03 Gemini 외에 V01 Sonnet, V01 GPT-4o 등 추가 LLM 트랙은 PRD 진화에서만 보임 (SRS는 2 LLM only).
