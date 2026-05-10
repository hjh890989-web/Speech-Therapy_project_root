---
type: entity
pillar: clinical
entity_kind: assessment
aliases: [취학전 아동 수용/표현 언어발달 검사, Preschool Receptive-Expressive Language Scale, PRES]
tags: [학령전아동, 수용표현, 표준화검사, 트랙2]
---

# PRES (취학전 아동 수용·표현 언어발달 검사)

학령전 아동의 **수용·표현 언어발달**을 표준화된 절차로 평가하는 한국 검사. 트랙 2 초기 평가에서 자주 사용.

- 사용 영역: [[clinical/concepts/언어발달지연]] 학령전 평가
- 첫 등장: [[clinical/sources/0-언어치료-실제-세션-상세가이드]] (L156)
- 본문 보강 정독: [[clinical/sources/2026-05-09-한국-영유아-언어평가-DLD-NISE]]

## 검사 개요 (raw/PRES 체크리스트 정독)

| 항목 | 값 |
|---|---|
| 풀이 | Preschool Receptive-Expressive Language Scale |
| 개발자 | 김영태·성태제·이윤경 (1995) |
| **적용 연령** | **만 2세 0개월 ~ 6세 11개월** (24-83개월) |
| 시행 방식 | **1:1 개별 검사 — 임상가 대면 시행** (SELSI와 차이) |
| 자격 | 언어재활사·특수교사·임상심리사 등 표준화 검사 시행 자격자 |
| 시간 | 약 60-90분 |
| 검사 유형 | **종합 진단 (Comprehensive Diagnostic)** — 선별검사 X |
| 임상적 의의 | **1995년 한국 최초 학령전 표준화 종합 언어검사**. 미국 검사 번안 한계 극복 — 한국어 조사·어순·종결어미 반영 |

## 검사 구조

| 영역 | 문항 수 | 평가 비중 (대략) |
|---|---|---|
| **수용언어 (Receptive)** | 약 90문항 | 의미 ~30% / 구문 ~30% / 화용 ~20% / 음운 ~20% |
| **표현언어 (Expressive)** | 약 90문항 | 동일 4영역 분배 |

## 시행 절차

1. **시작점**: 아동 생활연령 구간에서 시작 (1번 문항부터 X)
   - 예: 4세 0개월 = 4세 시작 문항부터
2. **기저선 (basal)**: 시작점 통과 안 되면 한 단계 아래 연령 구간으로 → 연속 3문항 통과 시 기저선 확보
3. **천장점 (ceiling)**: 연속 3문항 실패 시 종료
4. **시행 순서**: **수용언어 → 표현언어** (수용이 표현보다 먼저 발달, 검사 부담 ↓)

→ 90문항 모두 시행 X → 효율적 측정.

## 채점·결과 산출

- **등가연령** (Language Age): 수용·표현 각각 산출
- **백분위 (Percentile Rank)**: 또래 100명 중 위치
- **표준점수 (Standard Score)**: 평균 100, 표준편차 15
- **임상 절단점**:
  - **-1.25 SD 이상** = 정상 범위
  - **-1.25 ~ -2 SD** = 약간 지체 (관찰 권장)
  - **-2 SD 이하** = 심한 지체 (즉각 중재)

## REVT와의 보완 관계

| | **PRES** | **REVT** |
|---|---|---|
| 적용 | 2;0 - 6;11 | 2;6 - 성인 |
| 영역 | 의미·구문·화용·음운 통합 | **어휘 특화** |
| 검사 시간 | 60-90분 | 30-45분 |

→ 트랙 2 초기 평가에서 **PRES (종합) + REVT (어휘 특화) 자주 함께 시행**.

## SELSI와의 차이

| | **SELSI** | **PRES** |
|---|---|---|
| 적용 | 4-35개월 | 2;0-6;11 |
| 시행 | 양육자 보고식 | 1:1 직접 |
| 검사 유형 | **선별 (Screening)** | **종합 진단** |
| 시간 | 30분 | 60-90분 |

→ **SELSI = 빠른 선별 / PRES = 정밀 진단**. 영유아 만 2-3세 = 두 검사 병행 가능.

## Product 사용처 ⭐ MVP linguistic 점수 매핑

본 도구는 **학령전 수용·표현 언어발달** 표준 평가. MVP F1-a 3축 중 **linguistic 점수의 임상 토대**:

| Product 페이지 | 매핑 의미 |
|---|---|
| [[product/concepts/MVP-feature-spec]] § F1-a (3축 AI 분석) | linguistic 점수 = 수용·표현 언어발달 (PRES 영역 단순화) |
| [[product/concepts/HITL-system-flow]] § groundTruthScore 3축 | **groundTruthScore.linguistic** = 본 영역 전문가 보정 레이블 |
| [[product/concepts/Key-Success-Factors]] § KSF #2 | 효과 검증 임상 표준 (PRES 절단점 = 백분위 산출 근거) |
| [[product/concepts/MVP-feature-spec]] § F4 주간 리포트 | PRES 등가연령·백분위 시계열 = "62→71점" 그래프 임상 토대 |
| [[product/concepts/MVP-feature-spec]] § F3-b 적응형 난이도 | PRES 4 영역별 평가 비중 → F3-b 영역별 난이도 조정 |
| [[product/sources/54-PRD-V10-Final]] § Won't | "장애 등급 판정" 회피 — PRES는 의료 진단 도구 / 우리는 백분위만 차용 |
| [[product/concepts/architecture-decisions]] § ADR-04 | PRES "지체·심한 지체" → MVP "스크리닝·백분위" 치환 강제 |

→ **MVP 비매핑 영역**: PRES의 의미·구문·화용·음운 4영역 중 화용·음운은 별도 (KOPLAC + U-TAP).

## Product 사용처 ⭐ MVP linguistic 점수 매핑

본 도구는 **학령전 수용·표현 언어발달** 표준 평가. MVP F1-a 3축 중 **linguistic 점수의 임상 토대**:

| Product 페이지 | 매핑 의미 |
|---|---|
| [[product/concepts/MVP-feature-spec]] § F1-a (3축 AI 분석) | linguistic 점수 = 수용·표현 언어발달 (PRES 영역 단순화) |
| [[product/concepts/HITL-system-flow]] § groundTruthScore 3축 | **groundTruthScore.linguistic** = 본 영역 전문가 보정 레이블 |
| [[product/concepts/Key-Success-Factors]] § KSF #2 | 효과 검증 임상 표준 (PRES 절단점 = 백분위 산출 근거) |
| [[product/sources/54-PRD-V10-Final]] § Won't | "장애 등급 판정" 회피 — PRES는 의료 진단 도구 / 우리는 백분위만 차용 |

→ **MVP 비매핑 영역**: PRES의 의미·구문·화용·음운 4영역 중 화용·음운은 별도 (KOPLAC + U-TAP).

## 보강 완료 ✅ (53차 ingest)

본문 보강 모두 완료 — raw/PRES_체크리스트 정독 + Product cross-link 7건. 추후 보강 후보:
- PRES 4 영역 정확한 비중 (raw 5 § 제1부 § 4 본문 정밀 정독 시).
- 자유발화 분석 보조 (SLP가 종종 함께 사용) 가이드.
