---
type: concept
pillar: product
category: timeline
aliases: [SRS V01-V06, Software Requirements Specification 진화, SRS 타임라인]
tags: [SRS, evolution, timeline, V01-V06, ISO29148, 클러스터55-67]
---

# SRS Evolution — V01 → V06 진화 타임라인

Software Requirements Specification의 6차례 진화 + 검증 단계. **V06 = Next.js Full-stack Implementation-Ready 정본**.

## 진화 표 (raw 55-65 + V06 Revision History) + 검토 단계 명시

| raw | 단계 | 내용 |
|---|---|---|
| **55** | **사전 호환성 검토** ⭐ | 이전 프로젝트 SRS 프롬프트 → 본 PRD V10 적용 시 **8 수정사항 사전 도출**. 누락 시 15 Epic 사라짐. → [[product/sources/SRS-V01-V05-Multi-LLM-Workflow]] § 1단계 |
| **56** | **SRS Generation Prompt** | ISO 29148 + 7대 출력 구조 + 10대 필수 규칙. Senior Requirements Engineer 역할 정의 |
| **57** | **V01 Opus Draft** (760줄) | Opus 1차 — 65 REQ-FUNC + 30 REQ-NF + 8 API. **Atomic G/W/T 형식**. ⚠️ 4 구조 다이어그램(UseCase·ERD·Class·Component) 누락 |
| **58** | **V01 Opus Review + Action Plan** | 8 검증 → 6 충족 + 1 부분 + 1 미충족. **4 Mermaid 추가 Action** |
| **59** | **V02 Opus + Diagrams** (947줄) | V01 + 4 누락 다이어그램 보완 → Opus 트랙 완전 |
| **60** | **V03 Gemini Draft** (450줄) | Gemini 병렬 — ~45 REQ-FUNC (Feature grouped) + Epic 코드 ID + **1:1 Traceability** + EXP-1~4 + ADR + Gantt. ⚠️ 6 다이어그램 누락 |
| **61** | **V03 Gemini Review + Remediation** | 8 검증 → 6 충족 + 2 미충족 (4 구조 + 시퀀스 부족). **6 Mermaid 추가 Remediation** |
| **62** | **V04 Gemini + Diagrams** (686줄) | V03 + 6 누락 보완 → Gemini 트랙 완전 |
| **63** | **SRS Comparison: Opus vs Gemini** ⭐ | **8 기준 비교 매트릭스** — Opus 5 Winner (FR·NFR·API·구조·ISO 29148) / Gemini 2 Winner (Traceability·Sequence) / 1 Tie. **Best-of-Breed V04 Master 권고** |
| **64** | **V05 Merged Master Final** (919줄) | **Best-of-Breed 통합**. Opus 65 atomic FR + 30 NFR + 8 API + Gemini 1:1 Traceability + Reward Fallback/HITL Edge sequences + EXP/ADR/Gantt Appendix. **99 요구사항, 10 다이어그램, 919줄** |
| **65** | **V06 Next.js Full-stack Final** ⭐ (955줄) | **V05 → V06 후속 변환** (비즈니스 의도 vs 기술 결정 분리). C-TEC-001~007 + ADR-05~07 신규 (Next.js 모놀리스 · Supabase BaaS · Vercel AI SDK + Gemini) + R7/R8 신규 (Vercel Timeout / Supabase 무료 한도) |

## 진화 패턴

### Phase 1: 멀티 LLM 병렬 (V01-V04)
```
PRD V10 → SRS 변환 검토 (55-56)
   ↓
[V01-V02 Opus 트랙]   [V03-V04 Gemini 트랙]   ── 병렬 작성
   948줄                687줄
   ↓
[V01-V02 검토] (58)    [V03-V04 검토] (61)
   ↓
[다이어그램 보강] (59, 62)
```

### Phase 2: 비교 → 통합 (V05)
```
[Opus vs Gemini 비교] (63)
   ↓
V05 Merged Master Final (64)
"Best-of-Breed":
- Opus: 65 원자 G/W/T 요구사항
- Gemini: 1:1 Traceability + 시퀀스 + EXP/ADR/Gantt
= 99 요구사항 + 10 다이어그램 + 8 API
```

> ⚠️ 위 V05/V06 "99 요구사항"(및 V01 "65 REQ-FUNC")은 raw 표기 기준 — **HITL 4 이중계상**(Phase 1 "23"에 HITL 4가 이미 포함된 "65 묶음"에 HITL 4를 재가산). 실 distinct = 61 REQ-FUNC + 4 HITL + 30 REQ-NF = **95** ([[product/concepts/requirements-traceability-matrix]]).

### Phase 3: 기술 스택 전면 전환 (V06) ⭐
```
V05 (전통 FE/BE 분리)
   ↓
[C-TEC-001~007 적용]
   ↓
V06 Next.js Full-stack
- FE/BE 분리 폐기 → Next.js App Router 모놀리스
- REST → Server Actions / Route Handlers
- DB → Supabase (PostgreSQL + pgvector)
- LLM → Vercel AI SDK + Gemini
- 모바일 → PWA + Capacitor
- 배포 → Vercel 단일화
- ADR 3건 + Risk 2건 (R7 Vercel Timeout / R8 Supabase 무료 제한) 신규
```

## V06 (V05 기술 스택) 핵심 변경 ⭐

| 영역 | V01-V05 (기존) | **V06 (Next.js Full-stack)** |
|---|---|---|
| 아키텍처 | FE/BE 분리 | **단일 풀스택 모놀리스** (C-TEC-001) |
| 서버 로직 | REST API (Express/NestJS 등) | **Server Actions + Route Handlers** (C-TEC-002) |
| DB | (다양한 옵션) | **Prisma + Supabase PostgreSQL + pgvector** (C-TEC-003) |
| UI | (다양) | **Tailwind CSS + shadcn/ui** 강제 (C-TEC-004) |
| LLM | (다양) | **Vercel AI SDK** (Python 서버 금지) (C-TEC-005) |
| LLM 모델 | (미명시) | **Google Gemini API 기본** (C-TEC-006) |
| 배포 | (다양) | **Vercel 단일** + Git Push 자동 (C-TEC-007) |
| 모바일 | 네이티브 (RN/Swift/Kotlin) | **PWA + Capacitor** |

→ V06 정본: [[product/sources/65-SRS-V06-Final]] / 아키텍처 정본: [[product/concepts/tech-architecture]]

## V06 검증 (66, 67)

### 66 PRD↔SRS Mapping Review — **9 항목 PASS**
> "PRD V10의 비즈니스 의도 100% 보존 + V05 기술 제약 충실 반영. **Implementation-Ready**."
→ [[product/sources/66-PRD-to-SRS-Mapping-Review]]

### 67 MVP Descope Review — 바이브 코딩 관점
> "SRS는 훌륭하나, 개발 순서 재편 필요. 실시간 오디오·앱 배포·Zero-touch는 1주차에서 의도적 제외."
→ [[product/sources/67-MVP-Descope-Review]] / [[product/concepts/MVP-descope-plan]]

## VPS-evolution + PRD-evolution + SRS-evolution 통합 그래프

```
VPS V01-V09 (raw 25-32, 39)
   ↓ 카테고리 명명 + DMU 분리 + 21 Sub-feature
PRD V01-V10 (raw 40-54)
   ↓ 21 Epic + 7 KPI + HITL + Phase 0/1/2
SRS V01-V06 (raw 55-65)
   ↓ ISO 29148 + 95 요구사항 (61 REQ-FUNC + 4 HITL + 30 REQ-NF; raw 표기 99 = HITL 이중계상) + Next.js Full-stack
[Implementation Ready]
   ↓
TASKS/ 100+ (별도 인덱스 page 필요)
```

## 학습 포인트 (워크플로 시사)

| 패턴 | 의미 |
|---|---|
| **멀티 LLM 병렬 + 비교 + 통합** (Opus + Gemini → V05 Merged) | 단일 LLM 편향 회피, Best-of-Breed |
| **검토 단계 명시화** (Action Plan, Remediation) | 매 버전마다 정식 검토 사이클 |
| **기술 스택 vs 요구사항 분리** (V05 = 요구사항 / V06 = 스택 전환) | 비즈니스 의도 보존 + 기술 제약 분리 |
| **Implementation-Ready 게이트** (66 매핑 검증) | SRS 완성 후 별도 검증 단계 |
| **Reality Check** (67 Descope) | 바이브 코더 현실 반영 → 1주차 단순화 |

## 출처
- [[product/sources/65-SRS-V06-Final]] § Revision History (L10-L21)
- raw 55~67 파일명 sequence
- [[product/sources/66-PRD-to-SRS-Mapping-Review]]
- [[product/sources/67-MVP-Descope-Review]]

## 관련 product 페이지

- [[product/concepts/VPS-evolution]] — VPS V01-V09 (PRD 기반)
- [[product/concepts/PRD-evolution]] — PRD V01-V10 (SRS 기반)
- [[product/concepts/MVP-feature-spec]] — 21 Epic 정본
- [[product/concepts/tech-architecture]] — V06의 C-TEC 정본
- [[product/concepts/MVP-descope-plan]] — 67 Descope 정본

## Clinical 기둥 cross-link
- [[product/concepts/MVP-clinical-foundation]] — V06 SRS 임상 토대 통합본 (F1-a·F11·F15 임상 근거)
- [[clinical/concepts/조음장애]] — F1-a articulation 인수 기준 임상 토대
- [[clinical/concepts/언어발달지연]] — F1-b 5분 진단 인수 기준 임상 토대

## 보강 필요
- V01-V05 중간본 정독 — Action Plan(58), Remediation Plan(61), Comparison(63) 의 구체적 결함 항목.
- 55 (Prompt Compatibility) + 56 (Generation Prompt) 정독 — 프롬프트 엔지니어링 학습 가치.
- V05 (raw 64) 정독 — V06으로 전환되기 전 마지막 기술 중립 버전.
