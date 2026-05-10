---
type: entity
pillar: clinical
entity_kind: assessment
aliases: [영유아 언어발달 선별검사, Sequenced Language Scale for Infants, SELSI]
tags: [영유아, 선별검사, 표준화검사, 트랙2]
---

# SELSI (영유아 언어발달 선별검사)

영유아의 언어발달 수준을 선별하는 한국 표준화 검사. 사설 센터/복지관 기반 아동 발달 언어치료(트랙 2)의 초기 상담·평가 단계에서 사용.

- 사용 영역: [[clinical/concepts/언어발달지연]] 등 아동 발달 평가
- 첫 등장: [[clinical/sources/0-언어치료-실제-세션-상세가이드]] (L156)
- 본문 보강 정독: [[clinical/sources/2026-05-09-한국-영유아-언어평가-DLD-NISE]]

## 검사 개요 (raw/SELSI 체크리스트 정독)

| 항목 | 값 |
|---|---|
| 풀이 | Sequenced Language Scale for Infants |
| 개발자 | 김영태·김경희·윤혜련·김화수 |
| **적용 연령** | **만 4-35개월** (4개월부터 35개월까지) |
| 시행 방식 | **양육자 보고 (parent report) + 임상가 일부 직접 관찰** |
| 자격 | 언어재활사·특수교사·임상심리사 등 표준화 검사 시행 자격자 |
| 시간 | 약 30분 |
| 검사 유형 | **선별검사 (Screening)** — 종합 진단 X (PRES와 차이) |

## 검사 구조

### 영역
- **수용언어 (Receptive Language)**: 의미·음운·구문·화용 4영역 통합 평가
- **표현언어 (Expressive Language)**: 동일 4영역 통합 평가

### 발달 구간
- 4개월 단위로 문항 배치 (4-7개월 / 8-11개월 / 12-15개월 / ... / 32-35개월)
- 각 문항 = 해당 연령 또래의 약 50-75%가 통과 가능한 수준

## 시행 절차

1. **시작점**: 아동 생활연령 한 단계 아래 구간
2. **기초선 (basal)**: 시작점에서 연속 3문항 통과 → 그 아래 구간 = 기초선 / 통과 안 되면 더 아래로
3. **천장점 (ceiling)**: 연속 3문항 실패 시 종료
4. **순서**: 수용 → 표현 (또는 양육자 면담 흐름 따라 교차)

## 채점 — +/-/NO 3원 채점

| 표기 | 의미 |
|---|---|
| **+** | 통과 (양육자가 명확히 "할 수 있다" 응답) |
| **-** | 실패 (양육자가 "못한다" 응답) |
| **NO** | 관찰 기회 없음 / 미확인 |

→ NO는 별도 처리 (등가연령 산출 시 제외 또는 보완 질문).

## 결과 산출

- **등가연령** (Language Age): 발달 수준이 어느 월령에 해당하는가
- **발달 수준**: 평균 (10.39) ± 표준편차 (0.81) 기준
  - **-1 SD 이하** (≤ 7.03) = **경계선 수준** (관찰 권장)
  - **-2 SD 이하** (≤ 5.04) = **지연/지체** (즉각 중재 요망)

## Product 사용처 ⭐ MVP 직접 매핑

본 도구는 **트랙 2 영유아 선별검사** 표준으로, MVP **F1-a 5분 무료 진단의 임상 토대**:

| Product 페이지 | 매핑 의미 |
|---|---|
| [[product/concepts/MVP-feature-spec]] § F1-a (5분 무료 진단) | "표준 30분 SELSI → 5분 간이 진단" 정량적 단축 근거 |
| [[product/concepts/MVP-feature-spec]] § F1-b 무로그인 웹뷰 | **양육자 보고식 = 음성 직접 수집 없이도 가능** = F1-b 입력 ≤3 항목 정합 |
| [[product/concepts/Key-Success-Factors]] § KSF #2 | 효과 검증 임상 표준 도구 (REVT·U-TAP·PRES와 동급) |
| [[product/concepts/Porter-5-Forces-Analysis]] § 산업 구조 | 영유아 선별의 표준 = 회색지대 부모가 만나기 전 단계 ([[product/concepts/problem-definition]] § 회색지대) |
| [[product/concepts/customer-segmentation]] § Seg A | 불안형 부모가 SELSI를 받기 전 단계 = MVP 진입점 |
| [[product/concepts/HITL-system-flow]] § groundTruthScore.linguistic | 언어 발달 점수 = SELSI 수용/표현 영역의 단순화된 디지털 매핑 |
| [[product/concepts/architecture-decisions]] § ADR-04 (의료 용어 배제) | SELSI "지연·지체" 단어 → MVP "스크리닝·백분위" 치환 |

→ **MVP 직접 활용 가능성**: 보호자 보고식 = F1-a 양육자 입력 폼 직접 영감 (5분 진단의 핵심 메커니즘).

## Product 사용처 ⭐ MVP 직접 매핑

본 도구는 **트랙 2 영유아 선별검사** 표준으로, MVP **F1-a 5분 무료 진단의 임상 토대**:

| Product 페이지 | 매핑 의미 |
|---|---|
| [[product/concepts/MVP-feature-spec]] § F1-a (5분 무료 진단) | "표준 60-90분 SELSI → 5분 간이 진단" 정량적 단축 근거 |
| [[product/concepts/Key-Success-Factors]] § KSF #2 | 효과 검증 임상 표준 도구 (REVT·U-TAP·PRES와 동급) |
| [[product/concepts/Porter-5-Forces-Analysis]] § 산업 구조 | 영유아 선별의 표준 = 회색지대 부모가 만나기 전 단계 ([[product/concepts/problem-definition]] § 회색지대) |
| [[product/concepts/customer-segmentation]] § Seg A | 불안형 부모가 SELSI를 받기 전 단계 = MVP 진입점 |
| [[product/concepts/HITL-system-flow]] § groundTruthScore.linguistic | 언어 발달 점수 = SELSI 수용/표현 영역의 단순화된 디지털 매핑 |

→ **MVP 직접 활용 가능성**: 보호자 보고식 vs 직접 관찰 — F1-a 음성 직접 수집은 후자에 가까움 (그러나 ADR-04로 의료 용어 배제, "스크리닝/백분위" 표현).

## 보강 완료 ✅ (53차 ingest)

본문 보강 모두 완료 — raw/SELSI_체크리스트 본문 직접 정독 + Product cross-link 7건 양방향 활성. 추후 보강 후보:
- 한국 표준화 출판년도 정확화 (책 출판년도 미명시)
- 60dB+ 환경 시행 가이드라인 (B2B Zero-touch 정합 검증)
