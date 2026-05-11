---
type: concept
pillar: product
category: framework
aliases: [Multi-LLM Workflow, Best-of-Breed, 멀티 LLM 작성 패턴, Opus + Gemini 병렬]
tags: [MultiLLM, BestOfBreed, 워크플로, 프롬프트엔지니어링, 검토패턴, ISO29148, 클러스터55-67]
---

# Multi-LLM Workflow — Best-of-Breed 작성 패턴 정본

복잡한 기술 문서(SRS·PRD·VPS)를 **여러 LLM 병렬 작성 → 명시적 검토 → 비교 매트릭스 → Best-of-Breed 통합** 으로 단일 LLM 편향을 회피하는 작성 워크플로의 정본.

본 프로젝트에서 **VPS V01-V09**(Sonnet + Gemini), **PRD V01-V10**(Gemini + Cursor + Opus + GPT-4o + Sonnet), **SRS V01-V05**(Opus + Gemini)에서 일관 적용됨.

## ⭐ 7 단계 워크플로

```
[1] 사전 호환성 검토
    "이전 프롬프트가 새 입력에 적용 가능한가?"
    → 수정사항 사전 도출 (누락 비용 회피)
        ↓
[2] 표준 프롬프트 (역할 + 불변 출력 구조 + 정량 규칙)
        ↓
[3] 멀티 LLM 병렬 작성
    LLM A 트랙 (예: Opus 정밀)        LLM B 트랙 (예: Gemini 전략)
    Draft → Diagrams 보강             Draft → Diagrams 보강
        ↓                                   ↓
[4] 각 트랙 명시적 검토 (동일 N 기준)
    A 트랙 Action Plan                B 트랙 Remediation Plan
        ↓                                   ↓
[5] 비교 분석 매트릭스 (Winner per 기준)
        ↓
[6] Best-of-Breed 통합
    "A 트랙의 X + B 트랙의 Y + 강점 골라"
        ↓
[7] (선택) 후속 변환 (예: 기술 스택 전환)
    비즈니스 의도 = N단계 / 기술 결정 = N+1단계 분리
```

## 단계별 설계 원리

### [1] 사전 호환성 검토 ⭐
> **목적**: 이전 프롬프트·템플릿을 새 입력에 적용하기 전 **누락 위험 사전 도출**.

본 프로젝트 사례 ([[product/sources/SRS-V01-V05-Multi-LLM-Workflow]] § 1단계, raw 55):
- 이전 프롬프트 PRD §1~§9 → 본 PRD §1~§11 (확장)
- F1~F6 → F1~F18 (21 Epic) ← 누락 시 **15 Epic 사라짐**
- §10 ADR + §11 Glossary 신규 추가 필요
- HITL 4 원칙 + R6 Plan B + CJM + 4 극한 = 5개 신규 매핑 규칙 추가
- 8 수정사항 도출 → 사후 수정 비용 회피

**원칙**: 새 도메인·새 입력에 옛 프롬프트 직접 적용 금지. 사전 정합성 검증 필수.

### [2] 표준 프롬프트 — 역할 + 출력 구조 + 정량 규칙
> **목적**: 단일 LLM 출력의 일관성·완전성 확보.

3대 구성 요소:
1. **역할 정의**: "ISO/IEC/IEEE 29148:2018에 정통한 Senior Requirements Engineer"
2. **불변 출력 구조** (절대 변경 금지): SRS 7장 (Introduction → Stakeholders → System Context → Specific Requirements → Traceability → Appendix)
3. **정량 규칙** (10대): "Must 6 Epic당 3-5 REQ-FUNC", "Should 10 Epic당 2-3", "Atomic Requirement", "Phase 태그 P0/P1/P2"

**스타일 규칙**:
- "빠르게/적절히" 등 모호 표현 금지
- 한국어 본문 + 영문 ID/API/기술 용어
- 분할 작성 옵션 (Part 1-N) 명시

### [3] 멀티 LLM 병렬 작성
> **목적**: 단일 LLM 편향 회피 + 강점 결합 가능성 확보.

| LLM | 강점 |
|---|---|
| **Opus** | 정밀도 + 원자성 (Atomic G/W/T) + 구조 엄격성 |
| **Gemini** | 전략 통합 + 1:1 Traceability + Edge case 시각화 |
| Sonnet | 균형 + 수치화 (KPI 정량) |
| Cursor | 리스크 감지 + AC 강화 |
| GPT-4o | 흐름 최적화 + 논리 교정 |
| Master | 통합 + Best-of-Breed |

본 프로젝트 활용 ([[product/concepts/PRD-evolution]]):
- **VPS V01-V06**: Sonnet ↔ Gemini ↔ Merged. **2 사이클**: ① V01 Sonnet ↔ V02 Gemini (1차 7-Block / JobMVP 신규) → ② V03 Sonnet ↔ V04 Gemini (BMC 정합 추가) → V05 Merged (Best-of-Breed Dashboard) → V06 Merged (Business Operations 4 섹션 신규). 정독 검증 [[product/sources/24-30-VPS-V01-V06-Detail]].
- **PRD V01-V10**: 5종 LLM 병렬 + 4 Quality Gate 사이클
- **SRS V01-V05**: Opus 트랙 + Gemini 트랙 + 비교 + Merge

### [4] 명시적 검토 (동일 N 기준) ⭐
> **목적**: 각 LLM 결과물을 **동일한 검증 기준**으로 평가하여 **누락 정량화**.

본 프로젝트 8 검증 기준 (SRS):
1. PRD Story·AC → REQ-FUNC 반영
2. KPI·성능 목표 → REQ-NF 반영
3. API 목록 → 인터페이스 섹션
4. 엔터티·스키마 → Appendix 표
5. Traceability Matrix
6. UseCase + ERD + Class + Component 핵심 다이어그램
7. Sequence Diagram 3-5개
8. ISO 29148 구조 준수

각 LLM 결과: 🟢 충족 / 🟡 부분 / 🔴 미충족 → **Action Plan/Remediation Plan**으로 후속 작업 명문화.

본 프로젝트 사례:
- V01 Opus 검토 (raw 58): 6 충족 + 1 부분 + **1 미충족 (4 구조 다이어그램)** → 4 Mermaid 추가 Action
- V03 Gemini 검토 (raw 61): 6 충족 + **2 미충족 (4 구조 다이어그램 + 시퀀스 부족)** → 6 Mermaid 추가 Remediation

**원칙**: 검토 = 점수가 아니라 **누락 항목 + 후속 작업의 구체적 명문화**.

### [5] 비교 매트릭스 (Winner per 기준)
> **목적**: 각 기준에서 **어느 LLM이 우위인지 정량 판정** = Best-of-Breed 융합 근거.

본 프로젝트 사례 (raw 63 Opus vs Gemini):

| Criteria | A | B | Winner |
|---|---|---|---|
| 1. Story·AC 분해 | 🟢 65 atomic | 🟡 ~45 grouped | **Opus** |
| 2. KPI·NFR | 🟢 30 + Biz | 🟡 16 tech only | **Opus** |
| 3. API 목록 | 🟢 8 | 🟡 4 | **Opus** |
| 4. Entity·Schema | 🟢 | 🟢 | Tie |
| 5. Traceability | 🟡 Range | 🟢 **1:1 QA-ready** | **Gemini** |
| 6. 핵심 다이어그램 | 🟢 | 🟢 | Tie |
| 7. Sequence | 🟡 Main | 🟢 **Edge cases** | **Gemini** |
| 8. ISO 29148 | 🟢 High | 🟡 Moderate | **Opus** |

**결론**: Opus는 **Technical Specification Leader** / Gemini는 **Strategic Integration Leader**.

### [6] Best-of-Breed 통합 ⭐
> **목적**: 컴포넌트 단위 융합으로 **각 LLM의 강점만 결합**.

본 프로젝트 V04 Merged Master (raw 63 권고 → raw 64 실현):

| Component | Source | Reason |
|---|---|---|
| Functional Requirements | **Opus** | 65 atomic G/W/T 정밀도 |
| Non-Functional | **Opus** | 비즈니스 KPI 포함 |
| API Specification | **Opus** | 8 endpoints 완전 |
| Traceability Matrix | **Gemini** | 1:1 QA-ready |
| Sequence Diagrams | **Gemini** | Edge cases |
| Appendix (Roadmap/ADR) | **Gemini** | Gantt + EXP + ADR |

→ V05 Merged Master = **919줄** (Opus 948 + Gemini 687 단순 합산 ≈ 1,635줄에서 중복 제거).

**원칙**: 단순 평균이 아니라 **컴포넌트별 우위 LLM 선택**. Winner 기준의 직접 결과.

### [7] 후속 변환 (선택)
> **목적**: 비즈니스 의도 (V05) 와 기술 결정 (V06) 의 **분리**.

본 프로젝트:
- **V05**: 기술 중립 SRS (REST API + 일반 BE)
- **V06**: Next.js Full-stack 전환 (C-TEC-001~007 + ADR-05~07 신규)

→ V05 단계는 **PRD 비즈니스 의도의 기술 명세화** / V06 단계는 **구체 기술 스택 결정**. 분리 시 **재변환 가능** (Java/Spring 또는 Django 풀스택 등).

## ⭐ PRD V01-V10 사례 (16차 ingest 보강)

> 정본: [[product/sources/PRD-Intermediate-Reviews-Meta]] (5 메타 통합)

PRD는 본 워크플로의 **가장 풍부한 사례** — **5 단계 정량 사이클**.

### 1단계: 4 LLM 병렬 작성 (V01-V04)

| LLM | V | 강점 |
|---|---|---|
| Gemini | V01 | CJM journey + **HITL Story 6** |
| Cursor | V02 | **Critical Path + EXP-4** |
| **Opus** ⭐ | V02 | **21 Epic + Gantt + 6 ER + 실험 게이트** |
| GPT-4o | V03 | **Won't + WAU** |

### 2단계: 9 항목 매트릭스 비교 (raw 44, 184줄)

9 평가 항목 × 4 LLM × ⭐ 정량 — **단일 매트릭스로 모든 차이 시각화**.

### 3단계: VPS↔PRD 매핑 검증 (raw 47, 186줄)

**7 변환 규칙별 점검** → 매핑 완성도 **85%** + 3건 부분 결함:
- JTBD 괴리 (Seg B)
- 수익 모델 미반영
- Proof 원본 수치 미인용

### 4단계: V07 Patch (raw 49, 190줄)

7 결함 → **위치 + 현재 + 수정안 + 근거** 4부 구조 패치 → V08.

### 5단계: V08 Quality Review (raw 51, 180줄)

**5 체크리스트 + 추가 발견** = 18건 결함 (P0 CJM KPI 8 + P1·P2·P3 10).
- ⭐ **"추가 발견" 컬럼**: 명시 체크리스트 외 발견 (CJM KPI가 P0!)

### 6단계: V09 Readiness Gate (raw 53, 170줄)

**6 대항목 38 세부 항목 0/0.5/1점 → 정량 채점**:
- 종합 97% PASS (≥85%)
- 감점 2건 모두 SRS 단계로 이관

### 7단계: V10 Final (Golden Master)

V09 감점 2건 모두 패치 → **SRS Readiness Gate 100%** → SRS 진입.

---

### PRD vs SRS 워크플로 비교

| 단계 | SRS (raw 55-65) | PRD (raw 40-54) |
|---|---|---|
| 사전 검토 | 55 호환성 검토 | (VPS↔PRD는 47 매핑) |
| 프롬프트 | 56 표준 프롬프트 | (VPS 포맷 명세 — V07 Master) |
| 멀티 LLM 병렬 | 2 트랙 (Opus + Gemini) | **5 트랙** (Gemini + Cursor + Opus + GPT-4o + 후속 Sonnet) |
| 검토 | 58 + 61 (각 트랙) | **44 9 항목 매트릭스 (4 LLM 한꺼번에)** |
| 비교 | 63 8 기준 | (44에 통합) |
| Best-of-Breed | V05 Merged | V05 Merged (Opus 골격) |
| 후속 변환 | V05 → V06 (기술 스택) | V07 Patch (47) → V08 Quality (51) → V09 Gate (53) — **3 사이클** |

→ **PRD는 5 LLM + 5 Quality Gate** (SRS는 2 LLM + 3 Gate). 더 풍부한 사례.

## 본 프로젝트 워크플로 활용 사례

| 자료 | LLM | Quality Gate |
|---|---|---|
| [[product/concepts/VPS-evolution]] V01-V09 | Sonnet ↔ Gemini ↔ Merged | 9 버전 (5 LLM 작성 + 4 통합/재구조) |
| [[product/concepts/PRD-evolution]] V01-V10 | Gemini → Cursor → Opus → GPT-4o → Master → Sonnet → Master → Improvement → Quality → Master | **10 버전 + 4 Quality Gate** (V07 SRS Master, V08 VPS 결함, V09 18 결함, V10 Readiness Gate) |
| [[product/concepts/SRS-evolution]] V01-V06 | Opus 트랙 + Gemini 트랙 + Comparison + Merged + Tech 전환 | **6 버전 + 2 검토 + 1 비교 + 1 매핑 검증** |

## 비용 vs 품질

| 단일 LLM (V01만) | 멀티 LLM Best-of-Breed |
|---|---|
| 작성 시간: 1 unit | 5-7 unit (병렬·검토·비교·통합) |
| 누락 발견 시점: 사후 (개발 중) | **사전 (V05 단계)** |
| 편향 위험: 높음 | **낮음 (양 LLM 강점 융합)** |
| Implementation-Ready 도달 | 추가 1-2 사이클 필요 | **66 매핑 검증 PASS** ([[product/sources/66-PRD-to-SRS-Mapping-Review]]) |

→ 멀티 LLM 비용 5-7배 ↑ 이지만 **Implementation-Ready 도달 = 사후 재작업 비용 ↓ + 1인 개발 시 SRS 누락 사고 방지**.

## ⚠️ 한계와 trade-off

| 한계 | 의미 |
|---|---|
| **각 LLM 강점 분류 어려움** | "Opus = 정밀, Gemini = 전략" 은 사후 관찰. 사전 예측 어려움 |
| **검토 8 기준 자체의 적정성** | 8 기준이 모든 누락을 포착하는가? 9, 10번째 기준 필요할 수도 |
| **비교 매트릭스의 Winner 판정** | 평가자(meta LLM)의 편향 가능성 |
| **통합 비용** | Best-of-Breed 융합 자체가 별도 LLM 작업 (Master 트랙) |
| **본 프로젝트 = 1인/AI 의존 컨텍스트** | 팀 작업에서는 LLM 간 협업 비용 다름 |

## 출처
- [[product/sources/SRS-V01-V05-Multi-LLM-Workflow]] (1차 정본 — 5 메타 통합)
- [[product/concepts/SRS-evolution]] § V01-V06 timeline
- [[product/concepts/PRD-evolution]] § V01-V10 (10 LLM + 4 Quality Gate)
- [[product/concepts/VPS-evolution]] § V01-V09

## 관련 product 페이지

- [[product/sources/65-SRS-V06-Final]] — Best-of-Breed V05 → V06 변환 결과
- [[product/sources/66-PRD-to-SRS-Mapping-Review]] — 최종 9 기준 PASS 검증
- [[product/concepts/architecture-decisions]] — V05/V06 신규 ADR-05~07

## Clinical 기둥 cross-link
- [[product/concepts/MVP-clinical-foundation]] — 본 멀티 LLM 워크플로의 임상 콘텐츠 생성 응용 가능성 토대
- [[clinical/concepts/내러티브-담화-추론-중재]] — F15 LLM 자문 챗봇 콘텐츠 생성에 본 워크플로 적용 가능 임상 영역

## 보강 필요
- 다른 LLM 조합 (Claude + GPT-4o, Sonnet + Gemini 등) 의 강점 비교 일반화.
- "Editor" 메타 LLM 도입 가능성 (검토·비교 단계의 자동화).
- 본 워크플로의 **반복 적용 시간 비용** 정량 측정 (현재는 사례 기반).
- VPS·PRD·SRS 외 도메인 (마케팅 카피, 코드 리팩터링 등) 적용 가능성.
- 단일 LLM이 충분한 영역 vs 멀티 LLM 필수 영역의 **임계 복잡도** 정의.
