---
type: entity
pillar: clinical
entity_kind: assessment
aliases: [우리말 조음음운평가, Urimal Test of Articulation and Phonology, U-TAP]
tags: [조음음운, 표준화검사, 트랙2, 학령전, 학령기]
---

# U-TAP (우리말 조음음운평가)

아동의 **조음 정확도와 음운 변동**을 평가하는 한국 표준화 검사. 트랙 2 평가에서 [[clinical/concepts/조음장애]] 의 핵심 진단 도구.

- 사용 영역: [[clinical/concepts/조음장애]] 진단 / [[clinical/concepts/언어발달지연]] 평가의 일부로 시행
- 첫 등장: [[clinical/sources/0-언어치료-실제-세션-상세가이드]] (L156)
- 본문 보강 정독: [[clinical/sources/2026-05-09-한국-영유아-언어평가-DLD-NISE]]

## 검사 개요 (raw/U-TAP 체크리스트 정독)

### 원판 U-TAP

| 항목 | 값 |
|---|---|
| 풀이 | Urimal Test of Articulation and Phonology |
| 개발자 | 김영태·신문자 |
| **적용 연령** | **만 2세 6개월 ~ 6세 11개월** |
| 시행 방식 | **1:1 개별 검사 — 임상가 대면 시행** |
| 자격 | 언어재활사·특수교사 등 표준화 검사 시행 자격자 |
| 검사 단위 | **단어 수준** (43개 자극 단어 추정) |

### U-TAP2 (2020 개정판) ⭐

| 항목 | 차이점 |
|---|---|
| 개발자 | 김영태·신문자·**김수진·하지완** (4인 공저) |
| **적용 연령** | **만 2;6 ~ 7세** (1세 확장) |
| 검사 단위 | **단어 수준 + 문장 수준** (자발화에 가까운 평가 추가) |
| 규준 | 갱신 |
| 채점 시스템 | 디지털 채점 지원 |

→ **U-TAP2 = MVP에 가장 적합한 표준** (만 2-7세 영유아 정합 + 문장 수준 = AI 음성 분석 정합).

## 검사 구조

### 단어 수준 검사
- 약 43개 자극 단어 (음운적으로 균형 설계)
- 한국어 자음 19개 + 단모음 + 이중모음 모두 측정
- 어두 / 어중 / 어말 위치 정확도 분리 측정

### 문장 수준 검사 (U-TAP2)
- 짧은 그림 시퀀스 → 정해진 문장 산출 유도
- 자발화에 가까운 평가 = 자연 발화 환경 정합

## 음운 변동 평가 ⭐ (MVP HITL groundTruthScore.articulation 핵심)

| 음운 변동 (Phonological Process) | 정의 | 임상 의미 |
|---|---|---|
| **Stopping** | 마찰음 → 파열음 (예: /ㅅ/ → /ㄷ/) | 만 3-4세까지 정상, 이후 지속 시 우려 |
| **Fronting** | 후방 자음 → 전방 (예: /ㄱ/ → /ㄷ/) | 만 3세 이전 정상 |
| **Cluster Reduction** | 자음군 축약 (예: 한국어 받침 단순화) | 한국어 영유아 흔한 패턴 |
| **Liquid Replacement** | 유음 (/ㄹ/) 다른 자음으로 대체 | 만 5-6세 발달 |
| **Final Consonant Deletion** | 종성 탈락 (예: "닭" → "다") | NISE-B § 종성 처리 능력 평가 정합 |

→ **F1-a articulation AI 모델 = 한국어 영유아 음운변동 분류 모델**. U-TAP 5+ 변동 분류가 직접 학습 데이터.

## 한국어 자음 발달 순서 (참고)

| 발달 시기 | 자음 그룹 |
|---|---|
| 만 2세 | /ㅁ ㅂ ㅍ ㄴ ㄷ ㅌ/ (양순음·치조파열음) |
| 만 3세 | /ㄱ ㅋ ㅎ/ (연구개·성문음) |
| 만 4-5세 | /ㅅ ㅈ ㅊ/ (마찰·파찰음) |
| 만 6-7세 | /ㄹ/ (유음 — 가장 늦음) |

→ **F3-b 적응형 난이도 엔진의 임상 토대**: 아동 연령별 자음 도전 난이도 자동 조정.

## 채점·결과 산출

### PCC (Percentage of Consonants Correct)
- **자음정확도 = 정확 산출 자음 수 / 전체 자음 수 × 100**
- **임상 절단점**:
  - **PCC 80%+** = 정상 범위
  - **PCC 65-80%** = 약간 지연
  - **PCC < 65%** = 지연 (즉각 중재 권장)

### 음운변동률
- 각 변동 (Stopping / Fronting / Cluster Reduction 등) 발생 빈도 %
- 연령별 정상 범위 비교

### 백분위
- 또래 100명 중 위치

## 시행 절차

1. **시행 순서**: 단어 수준 → 문장 수준 (U-TAP2)
2. **단어 검사**: 그림 자극 + 아동 명명 발화 → 검사자 전사 (IPA 또는 한글 표기)
3. **문장 검사** (U-TAP2): 그림 시퀀스 + 정해진 문장 산출
4. **전사 원칙**: 정확 산출 / 대치 (replacement) / 생략 / 왜곡 분리 표기
5. **자극 단어 특성**: 일상 친숙도 + 음운 균형 + 의미 단순

## Product 사용처 ⭐⭐ MVP 가장 직접적 매핑

본 도구는 **조음음운평가의 한국 표준**. MVP F1-a 3축 중 **articulation 점수의 임상 토대 = 가장 강력한 매핑**:

| Product 페이지 | 매핑 의미 |
|---|---|
| [[product/concepts/MVP-feature-spec]] § F1-a (3축 AI) | **articulation 점수 = U-TAP 음운변동 + PCC 디지털 단순화** |
| [[product/concepts/HITL-system-flow]] § groundTruthScore.articulation | ⭐⭐ **전문가 보정 시 U-TAP 5+ 음운변동 + PCC 참조** = REQ-FUNC-HITL-003 |
| [[product/concepts/expert-diversity-monitoring]] § Phase 2+ cross-tab | **U-TAP = articulation 영역 표준 도구** (cross-tab Gini 계산의 evaluation_tool 핵심) |
| [[product/concepts/Key-Success-Factors]] § KSF #2 | 효과 검증 핵심 (조음 = 음성 직접 분석 가능 영역) |
| [[clinical/concepts/조음장애]] § Product cross-link | 6단계 위계 = F3-b 적응형 난이도 임상 근거 |
| [[product/concepts/MVP-feature-spec]] § F3-b 적응형 난이도 | **한국어 자음 발달 순서 (만 2/3/4-5/6-7세) = F3-b 연령별 난이도 자동 조정** |
| [[product/entities/persona-박민정]] (Seg B) | PCC 80%/65% 절단점 → "발음 정확도 시계열 증명" 직접 |
| [[product/concepts/Value-Chain-Analysis]] § 효과 검증 | "62→71점" = PCC 65→80% 시계열 증명 |

→ **MVP 핵심 도구**: U-TAP2 단어+문장 수준 → AI 음성 직접 분석으로 자동화. 표현은 "조음 정확도" 또는 "발음 백분위" (ADR-04 의료 용어 배제 정합).

## Product 사용처 ⭐⭐ MVP 가장 직접적 매핑

본 도구는 **조음음운평가의 한국 표준**. MVP F1-a 3축 중 **articulation 점수의 임상 토대 = 가장 강력한 매핑**:

| Product 페이지 | 매핑 의미 |
|---|---|
| [[product/concepts/MVP-feature-spec]] § F1-a (3축 AI) | **articulation 점수 = U-TAP 음운변동 분석의 디지털 단순화** |
| [[product/concepts/HITL-system-flow]] § groundTruthScore.articulation | **전문가 보정 시 U-TAP 음운변동(stopping/fronting/cluster reduction) 참조** = REQ-FUNC-HITL-003 |
| [[product/concepts/Key-Success-Factors]] § KSF #2 | 효과 검증 핵심 (조음 = 음성 직접 분석 가능 영역) |
| [[clinical/concepts/조음장애]] § Product cross-link | 6단계 위계 = F3-b 적응형 난이도 임상 근거 |
| [[product/entities/persona-박민정]] (Seg B) | "발음 정확도 시계열 증명" 요구 |
| [[product/concepts/Value-Chain-Analysis]] § 효과 검증 | "62→71점" 시계열 증명의 가장 측정 가능한 영역 |

→ **MVP 핵심 도구**: U-TAP 단어 수준 + 문장 수준 → AI 음성 직접 분석으로 자동화. 표현은 "조음 정확도" 또는 "발음 백분위" (ADR-04 의료 용어 배제 정합).

## 보강 완료 ✅ (53차 ingest)

본문 보강 모두 완료 — raw/U-TAP_체크리스트 정독 + Product cross-link 8건 (다른 entity보다 +1, MVP 가장 직접). 추후 보강 후보:
- 원판 U-TAP 발행년도 정확화 (2004 추정).
- 자음군 축약·종성 탈락 한국어 특수 패턴 (영어와 차이) 정밀화.
- F1-a AI 모델 학습 시 U-TAP 데이터 라이선스 협상 가능성 (저작권 검증, 김영태 외 4인 공저).
