---
type: entity
pillar: clinical
entity_kind: assessment
aliases: [수용·표현 어휘력 검사, Receptive & Expressive Vocabulary Test, REVT]
tags: [어휘, 수용표현, 표준화검사, 트랙2, 학령전, 학령기]
---

# REVT (수용·표현 어휘력 검사)

아동의 **수용 어휘력**(REVT-R)과 **표현 어휘력**(REVT-E)을 측정하는 한국 표준화 검사. 어휘 발달 평가의 표준 도구.

- 사용 영역: [[clinical/concepts/언어발달지연]] 의 어휘 영역 평가
- 첫 등장: [[clinical/sources/0-언어치료-실제-세션-상세가이드]] (L156)
- 본문 보강 정독: [[clinical/sources/2026-05-09-한국-영유아-언어평가-DLD-NISE]]

## 검사 개요 (raw/REVT 체크리스트 정독)

| 항목 | 값 |
|---|---|
| 풀이 | Receptive & Expressive Vocabulary Test |
| 개발자 | 김영태·홍경훈·김경희·장혜성·이주연 |
| **적용 연령** | **만 2세 6개월 ~ 만 16세 이상 성인** (광범위) |
| 시행 방식 | **1:1 개별 검사 — 임상가 대면 시행** |
| 자격 | 언어재활사·특수교사·임상심리사 등 표준화 검사 시행 자격자 |
| 시간 | 약 30-45분 |
| 검사 유형 | **어휘 특화 표준화 검사** (어휘만 분리 측정) |

## 검사 구조 — REVT-R + REVT-E 분리

| 하위 검사 | 측정 영역 | 문항 수 | 시행 방식 |
|---|---|---|---|
| **REVT-R** (Receptive) | 수용 어휘력 — 듣고 그림 가리키기 | 약 185문항 | 4지선다 그림 카드 + 검사자 단어 → 아동 가리킴 |
| **REVT-E** (Expressive) | 표현 어휘력 — 그림 보고 명명 | 약 185문항 | 그림 카드 1장 + 아동 명명 발화 |

→ **두 검사는 별도의 자극·문항·규준** (동일 어휘 수용/표현 양쪽 측정 X). 별개 어휘 풀.

## 어휘 영역 구성

- 명사 / 동사 / 형용사 / 부사 / 추상어 등 다양한 품사
- 일상생활 친숙도 + 학령기 교과 어휘 단계적 포함
- 학령전 + 학령기 전체 커버

## 시행 절차

1. **시행 순서**: REVT-R (수용) → REVT-E (표현) (수용이 먼저)
2. **시작점**: 매뉴얼 명시 연령별 시작 문항부터
3. **기저선**: 시작점 통과 안 되면 한 단계 아래 → 연속 통과 시 기저선
4. **천장점**: 연속 실패 시 종료
5. 모든 문항 시행 X — 효율적 측정

## 채점·결과 산출

- **등가연령** (Vocabulary Age): REVT-R / REVT-E 각각 산출
- **백분위 (Percentile Rank)**
- **표준점수 (Standard Score)**: 평균 100, 표준편차 15
- **임상 절단점**: 등가연령이 생활연령 대비 **6개월+ 지체** 시 의심

## PRES와의 보완 관계

| | **PRES** | **REVT** |
|---|---|---|
| 적용 | 2;0 - 6;11 | 2;6 - 성인 |
| 영역 | 의미·구문·화용·음운 통합 | **어휘 특화 (가장 흔히 사용)** |
| 시간 | 60-90분 | 30-45분 |

→ **두 검사 = 보완 관계 (경쟁 X)**. 트랙 2 초기 평가에서 자주 함께 시행.

## Product 사용처 ⭐ MVP linguistic 어휘 매핑

본 도구는 **수용·표현 어휘력**의 한국 표준. MVP F1-a 3축 중 **linguistic 점수의 어휘 하위 영역**:

| Product 페이지 | 매핑 의미 |
|---|---|
| [[product/concepts/MVP-feature-spec]] § F1-a + F4 | linguistic 점수 어휘 영역 = REVT 수용/표현 단순화 |
| [[product/concepts/HITL-system-flow]] § groundTruthScore.linguistic | 전문가 보정 시 **REVT 등가연령 + 백분위** 참조 (기준 표준) |
| [[product/concepts/Key-Success-Factors]] § KSF #2 | 효과 검증 표준 도구 (가장 흔히 사용) |
| [[product/concepts/Value-Chain-Analysis]] § 효과 검증 | "62→71점" 시계열 증명의 임상 비교 표준 |
| [[product/entities/persona-박민정]] (Seg B 데이터형) | ⭐ **등가연령·표준점수 → "수치로 증명" 욕구 직접 충족** |
| [[product/concepts/MVP-feature-spec]] § F4 + F18 | 시계열 추이 + 미래 예측 시뮬레이션의 어휘 영역 임상 토대 |
| [[product/concepts/MVP-feature-spec]] § F15 LLM 챗봇 | REVT-E 그림 → 명명 = F15 챗봇 발화 유도의 임상 동등성 |

→ **MVP 활용**: REVT 그림 자극 → 가리키기 / 명명 = F15 LLM 대화 챗봇의 임상 동등성. 다만 ADR-04에 따라 표현은 "어휘 발달 백분위"로 치환.

## Product 사용처 ⭐ MVP linguistic 어휘 매핑

본 도구는 **수용·표현 어휘력**의 한국 표준. MVP F1-a 3축 중 **linguistic 점수의 어휘 하위 영역**:

| Product 페이지 | 매핑 의미 |
|---|---|
| [[product/concepts/MVP-feature-spec]] § F1-a + F4 | linguistic 점수 어휘 영역 = REVT 수용/표현 단순화 |
| [[product/concepts/HITL-system-flow]] § groundTruthScore.linguistic | 전문가 보정 시 REVT 등가 연령 참조 |
| [[product/concepts/Key-Success-Factors]] § KSF #2 | 효과 검증 표준 도구 (가장 흔히 사용) |
| [[product/concepts/Value-Chain-Analysis]] § 효과 검증 | "62→71점" 시계열 증명의 임상 비교 표준 |
| [[product/entities/persona-박민정]] (Seg B 데이터형) | 등가 연령·정상 규준 → "수치로 증명" 욕구 충족의 임상 기준 |

→ **MVP 활용**: REVT 그림 자극 → 가리키기 / 명명 = MVP F15 LLM 대화 챗봇 (자연 발화 수집)의 임상 동등성. 다만 ADR-04에 따라 표현은 "어휘 발달 백분위"로 치환.

## 보강 완료 ✅ (53차 ingest)

본문 보강 모두 완료 — raw/REVT_체크리스트 정독 + Product cross-link 7건. 추후 보강 후보:
- REVT 표준화 발행년도 (2009 추정).
- 학령기 교과 어휘 단계별 분포 정밀화.
