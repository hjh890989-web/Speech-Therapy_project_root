---
type: source
pillar: product
title: PRD 중간본 검토 메타 4종 (V01-V09 진화 사이클 정본)
source_path: ../../../raw/44_PRD_comparison_analysis.md
source_path_b: ../../../raw/47_VPS_PRD_mapping_review.md
source_path_c: ../../../raw/49_PRD_V07_Patch_Improvements.md
source_path_d: ../../../raw/51_PRD_V08_Quality_Review.md
source_path_e: ../../../raw/53_PRD_V09_Final_Readiness_Gate.md
source_type: meta_workflow
authors: []
year: 2026
ingested: 2026-05-09
tags: [PRD, BestOfBreed, ReadinessGate, QualityReview, VPS-PRD-Mapping, 클러스터40-54]
---

# PRD V01-V09 진화 사이클 5 메타 통합

PRD V01 → V10 진화의 **5 검토 사이클** 정본. 멀티 LLM 작성 + Best-of-Breed 통합 + 4단계 Quality Gate 의 구체 매커니즘 정본화.

## 진화 5 단계 사이클

```
[V01-V04 멀티 LLM 병렬 작성]
   Gemini · Cursor · Opus · GPT-4o
        ↓
[44 비교 분석] — 9 항목 매트릭스 + Best-of-Breed 권고
        ↓
[V05-V07 통합 + 마스터화]
        ↓
[47 VPS↔PRD Mapping Review] — 85% 매핑 완성도, 3건 결함
        ↓
[49 V07 Patch] — 7건 패치 (ADR + 수익모델 + AOS/DOS + JTBD 검증 + TAM-SAM-SOM + R6)
        ↓
[V08 Improvement]
        ↓
[51 V08 Quality Review] — 5 체크리스트 + 18건 결함 (CJM KPI 8건이 P0)
        ↓
[V09 Quality Improvement]
        ↓
[53 V09 Readiness Gate] — 6대 기준 38 세부 항목 점수화, 97% PASS
        ↓
V10 Final Golden Master
```

---

## 1. PRD Comparison Analysis (raw 44) — 4 LLM 매트릭스

### 종합 스코어카드 (9 항목 × 4 LLM)

| 항목 | V01 Gemini | V02 Cursor | V02 Opus | V03 GPT |
|---|:-:|:-:|:-:|:-:|
| Pain/Needs 수치화 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| JTBD → AC | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| KPI 체계 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 차별 가치 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Proof 설계 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| 구조적 가시성 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| 데이터·인터페이스 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| 리스크 관리 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| **전체 완성도** | **⭐⭐⭐☆** | **⭐⭐⭐⭐☆** | **⭐⭐⭐⭐⭐** | **⭐⭐** |

### 4 LLM 고유 강점 (Best-of-Breed 융합 후보)

| LLM | 핵심 강점 |
|---|---|
| **V01 Gemini** | CJM journey 다이어그램(감정 점수 시각화), **HITL 독립 Story 6** (SLA 48h, 오진율 0.5%) |
| **V02 Cursor** | **Critical Path + 리스크 노드 Mermaid** (게이트 5 + 연쇄 영향 시각화), 안전·법적 AC 내장 (Disclaimer 100%, 7일), **EXP-4 가격 앵커링** |
| **V02 Opus** | **21 Epic 전체 + Gantt 로드맵**, NFR↔AC 역추적, 6 엔터티 ER (MISSION_CARD + WEEKLY_REPORT 추가), **실험 흐름 게이트 Mermaid** (EXP-1→2→3→Full Scale), 리스크 영향도 등급 (🔴/🟡), **Proof 6 주장** (A~F) |
| **V03 GPT** | **Won't (하지 않을 것) 명시**, **WAU 북극성 KPI**, 사용자당 비용 (≤5,000원/월) 관점 |

### Best-of-Breed 통합 전략 (V05 Merged Master로 실현)

| 보강 항목 | 차용 소스 | 이유 |
|---|---|---|
| Story 6 (HITL) | **V01 Gemini** | 규제 리스크 대응 필수 (SLA 48h, 오진율 0.5%) |
| Critical Path + 리스크 노드 | **V02 Cursor** | 의사결정자 설득 (게이트 실패 연쇄 시각화) |
| S1-AC4 안전 게이트 (Disclaimer 100%) | **V02 Cursor** | 의료법 우회 핵심 AC 스토리 내장 |
| 가격 앵커링 EXP-4 | **V02 Cursor** | VPS WTP 전략 검증 유일 실험 |
| **기본 골격** | **V02 Opus** | 21 Epic + Gantt + NFR↔AC + 6 엔터티 ER + Proof 6 |
| Won't (W) 명시 | **V03 GPT** | 범위 크리프 방지 |
| 북극성 KPI WAU 검토 | **V03 GPT** | M3 vs WAU 의사결정 근거 |

→ V05 Merged → V07 Master → V10 Final 의 토대.

---

## 2. VPS↔PRD Mapping Review (raw 47) — 매핑 완성도 85%

### 7개 변환 규칙 점검

| 매핑 항목 | 판정 | 이슈 |
|---|---|---|
| Pain/Needs → §1, §2, §7 | ✅ 양호 | 4대 Pain + 실패 KPI 수치화 1:1 매핑 |
| **JTBD → §3 (AC)** | ⚠️ 부분 결함 | **Seg B Story가 JTBD 원문과 괴리** |
| Desired Outcome → §1.2/1.3/§8 | ✅ 양호 | 북극성·보조 KPI + 기준선·목표값·주기 |
| **Value Proposition → §4, §6** | ⚠️ 부분 결함 | **VPS §11 수익 모델 미반영** |
| Competitor → §5, §7 | ✅ 양호 | 대안 대비 SLO NFR 반영 |
| Differential Value → §1.4 | ✅ 양호 | 정량 비교표 신설 |
| **Proof → §9, §8** | ⚠️ 부분 결함 | **AOS/DOS 원본 수치 미인용** |

### 3건 부분 결함 상세

#### Seg B Story 괴리 ⚠️
- **VPS 원문**: "62→71점 객관 숫자로 시각화 + 가족에게 양육 성취감을 인정받음"
- **PRD V07**: "훈련 효과를 가족에게 증명하고 **구독을 지속**" — 비즈니스 용어로 치환
- **문제**: 사용자 심리 동기 ("양육 성취감 인정") 희석

#### VPS §11 수익 모델 미반영 ⚠️
- VPS §11: 4티어 (Free·Basic 3.5만·Premium 5만·B2B 50만/년) + 수익 비중 70/15/15% + 3개년 SOM (Y1 12K → Y3 60K, 누적 449억)
- PRD V07: §1.4에 가격 언급만, **독립 비즈니스 모델 섹션 부재**

#### Proof 원본 수치 미인용 ⚠️
- VPS §3 AOS/DOS 원본 점수 (O-1 AOS 9.0, O-2 AOS 9.0 등) 미인용
- VPS §3 JTBD 검증 상태 (Seg B ⚠️ 부분 검증) 미반영
- TAM 150만 / SAM 22.5만 / SOM 15만 / 12K 가구 미인용

### ⭐ 북극성 KPI 변경 주의
- VPS는 북극성 명시 없음 → PRD에서 **W-AUR ≥60% 신규 설정**
- VPS AOS 9.0 최고점은 O-1 (5분 진단)이지만 PRD는 O-2 (대기 미션)을 북극성으로 채택
- **선정 근거 미명시** → ADR 보충 권고

---

## 3. PRD V07 Patch (raw 49) — 7건 결함 패치

47 매핑 검토에서 발견한 결함을 V07 → V08로 진화시키며 패치.

### 7 패치 항목

| # | 영역 | 패치 |
|---|---|---|
| **#1** | §3 Story S3 (Seg B) | `so that` 절을 "**양육의 성취감을 인정받고** 구독 동기 유지" 로 복원 |
| **#2** | §1.3 북극성 KPI ADR | **ADR-001 신규**: AOS 9.0 O-1 vs O-2 채택 근거. "O-1=일회성 유입 / O-2=반복 사용 리텐션 직결 선행 지표" |
| **#3** | §4.3 비즈니스 모델 신설 | **Freemium 4티어** + 수익 비중 70/15/15% + **3개년 SOM 시나리오** (Y1 12K → Y3 60K, **누적 449억**) |
| **#4** | §6.1 ERD | **REWARD_PROGRESS 엔터티 추가** (cumulative_stars, tree_growth_level, ai_drawing_count, last_reward_type, updated_at) |
| **#5** | §9.0 신설 | **AOS/DOS 매트릭스 인용** — O-1~O-5 (AOS 9.0/9.0/7.0/6.5/1.0, DOS 8.5/9.0/6.5/6.5/4.8) + PRD 연결 KPI |
| **#6** | §9.0-b 신설 | **JTBD 검증 상태 표** — H-A/C/D-1/D-2 ✅완전 + **H-B ⚠️부분** (R6 리스크 연동) |
| **#7a** | §9.0-c 신설 | **TAM 150만 → SAM 22.5만 → SOM 15만 → 초기 1년 12K** Mermaid + 산정 근거 |
| **#7b** | §7.1 R6 신설 | "Seg B 가설 미완전 검증" 리스크 + EXP-2 Plan B |

→ 47의 3건 부분 결함 모두 해결 + 시장 규모·검증 상태·기회 점수 정량화.

---

## 4. PRD V08 Quality Review (raw 51) — 18건 결함

> ✅ **2026-05-09 raw 51 직접 정독 검증 완료**: 본 메타의 18건 분류 (P0 8 + P1 3 + P2 5 + P3 2)가 raw 51 (10KB, 181줄) 본문과 1:1 정확 매칭. 위키 다른 페이지에 있던 "16 명시 + 2 추정 (§1.5 + §2.3)" 표기는 잘못된 추정이었음 — V09 v0.9 변경 헤더가 P0/P1/P2만 명시하고 P3 (F-05/F-06 NFR 텍스트 수정 2건)을 누락한 것. P3는 V09 Quality §5 NFR 본문에 흡수만 됨. 정정 완료 ([[product/sources/52-PRD-V09-Quality-Improvement]] + [[product/concepts/PRD-evolution]]).

### 5 체크리스트 + 추가 1건 매트릭스

| 영역 | 합격 | 결함 | 심각도 |
|---|:-:|:-:|:-:|
| 1. Outcome–KPI 연계 | 4/5 | 1 | 🟡 Mid |
| 2. AC (GWT) 적절성 | 30/32 | 2 | 🟡 Mid |
| 3. 비기능 요구사항 | 14/17 | 3 | 🟡 Mid |
| 4. Differential Value | 7/8 | 1 | 🟢 Low |
| 5. Proof & 검증 연결 | 12/15 | 3 | 🟡 Mid |
| **CJM KPI 수치화 (추가)** | 8/16 | **8** | 🔴 **High** |
| **합계** | — | **18건** | — |

### ⭐ P0 — CJM KPI 8건 수치화 (체크리스트 5 영역 모두 영향)

§2.4 CJM 매핑 테이블의 "성공 지표" 열에 **목표 수치 없이 정성적 문구**:

| # | 위치 | 현재 (정성) | 수정안 (정량) |
|---|---|---|---|
| C-01 | Seg A / 2단계 | "진단 직후 첫 미션 진입률" | **첫 미션 진입률 ≥50%** (24h 내) |
| C-02 | Seg A / 3단계 | "WAU" | **WAU ≥60%** (§1.3 W-AUR 동기화) |
| C-03 | Seg A / 4단계 | "리포트 외부 공유 활성도" | **월간 외부 공유 클릭률 ≥15%** |
| C-04 | Seg C / 1단계 | "앱 최초 탐색 체류" | **최초 세션 ≥3분** |
| C-05 | Seg C / 3단계 | "월간 미션 지속률" | **M2 미션 지속률 ≥50%** |
| C-06 | Seg C / 4단계 | "케어로그 누적 빈도" | **주 2회+ 기록 유지율 ≥40%** |
| C-07 | Seg B / 1단계 | "상세 분석 지표 열람률" | **3축 펼침 클릭률 ≥30%** |
| C-08 | Seg B / 2단계 | "난이도 엔진 작동 대비 이탈" | **하향 후 이탈률 <5%** |

→ 8 셀 모두 정량화 → SRS 단계 성공/실패 판정 가능.

### P1 결함 3건

| # | 결함 | 수정안 |
|---|---|---|
| F-04 | §5 모니터링 누락 | **HITL 큐**(24h 초과 3건+ Alert) + **B2B API**(에러율 1h 5%+ Fallback) |
| F-08 | Lock-in KPI §1.3 미등록 | **월간 Churn ≤5%** + **미션 중도 이탈 <10%** 보조 KPI 등록 |
| F-10 | 가정 → 실험 미연결 | A1→**EXP-4** (가격), A2→**§8.1 Beta** (바이럴), A3→**EXP-1/W-AUR** (환경 의지), A4→**EXP-3** (B2B 효용) |

### P2 결함 5건

| # | 결함 | 수정안 |
|---|---|---|
| F-01 | 오진율 기준선 N/A | "**Phase 0 종료 시 측정 (초기 벤치마크)**" + 재검증 프로세스 |
| F-02 | S3-AC3 측정 경로 | "**Amplitude 코호트 분석**: 클릭자 vs 비클릭자 분리, 익월 결제율 차이 ≥20%p↑" |
| F-03 | HITL 루프백 재학습 기준 | "**오진율 0.5% 초과 → 즉시 롤백, 보정 데이터 500건 누적 후 파인튜닝, 0.3% 이하 재배포**" |
| F-07 | "1,000배" 산술 부정확 | **17,000배** (2개월 ≈ 87,000분 ÷ 5분) 또는 보수적 ≥10,000배 |
| F-09 | Traceability 누락 | §5 NFR + §8 실험 + §10 ADR 추가 3행 |

### P3 결함 2건 (텍스트 수정)

| # | 결함 | 수정안 |
|---|---|---|
| F-05 | Cold Start AC 미연결 | "공통 (앱 UX 기본 요건)" + QA 별도 |
| F-06 | CS 응답 측정 도구 누락 | "**Zendesk/Freshdesk SLA 트래킹**" |

---

## 5. PRD V09 Final Readiness Gate (raw 53) — 종합 97% PASS ⭐

### 6대 기준 38 세부 항목 점수화

| # | 대항목 | 세부 항목 | 점수 | % | 판정 |
|---|---|:-:|:-:|:-:|:-:|
| 1 | 목표·지표 | 6 | 6.0 | **100%** | ✅ |
| 2 | 스토리·AC | 8 | 8.0 | **100%** | ✅ |
| 3 | 기능 요구 | 6 | 5.5 | **92%** | ✅ |
| 4 | 비기능 | 7 | 7.0 | **100%** | ✅ |
| 5 | 리스크·가정 | 7 | 6.5 | **93%** | ✅ |
| 6 | 범위 In/Out | 4 | 4.0 | **100%** | ✅ |
| | **종합** | **38** | **37.0** | **97%** | ✅ **PASS** |

> **SRS 전환 게이트 통과 기준**: 종합 ≥85%, 개별 ≥70% — 크게 상회.

### 감점 2건 (각 0.5점)

| # | 감점 사유 | 조치 시점 |
|---|---|---|
| 3-5 | Epic 스프린트 분해 (SP 추정) 미기재 | **SRS 단계** (V10 §4.4에서 230 SP 분해로 해결) |
| 5-7 | Seg B Plan B 구체 Epic 변경안 미기재 | **SRS 또는 Phase 1** (V10 §7.2 R6 Plan B로 해결) |

→ 두 감점 모두 V10에서 패치 → SRS Readiness Gate 100%.

### 채점 방식 (학습 가치)

```
세부 항목 0/0.5/1점 → 대항목 평균 × 100 → 백분율
종합 = 6 대항목 평균
PASS 조건: 종합 ≥85% AND 개별 ≥70%
```

→ 정량 채점으로 **Readiness Gate 객관화** = SRS 전환 의사결정의 근거.

### 선택적 보강 제안 (점수 영향 X)

- 용어 사전 (Glossary) — V10 §11에서 실현
- 변경 관리 프로세스 (CR → 리뷰 → 머지) — 미실현 (보강 후보)

---

## ⭐ 진화 사이클 학습 포인트

### 패턴 1: 4 LLM 병렬 → 비교 → Best-of-Breed
- **단일 LLM 편향 회피**: V03 GPT의 깊이 부족 vs V02 Opus의 압도적 골격
- **9 평가 항목 매트릭스**: 각 LLM 별 ⭐ 정량 평가
- **6 항목 차용 전략**: V02 Opus(기본) + V01 Gemini(HITL) + V02 Cursor(Critical Path + EXP-4) + V03 GPT(Won't + WAU 검토)

### 패턴 2: 7 변환 규칙 매핑 검증 (47)
- VPS → PRD 변환의 **7 규칙별 점검**:
  1. Pain/Needs → 실패 KPI 재서술
  2. JTBD → Story·GWT
  3. Outcome → 북극성/보조 KPI
  4. VP → 기능·흐름·API
  5. Competitor → SLO 기준선
  6. Differential Value → SLO 명문화
  7. Proof → 실험·측정 도구 연결
- **3건 부분 결함 발견** = 매핑 완성도 85%
- **북극성 KPI 변경 주의**: VPS 명시 없을 시 ADR로 근거 문서화 강제.

### 패턴 3: 7건 패치 (49)
- 각 결함을 **위치 + 현재 + 수정안 + 근거** 형식으로 명문화
- ADR 신규, 섹션 신설(§4.3 BM, §9.0 AOS, §9.0-b JTBD, §9.0-c TAM), 엔터티 추가
- **시장 규모·검증 상태·기회 점수 정량화** = SRS 전환 전 필수 정합성

### 패턴 4: 5 체크리스트 + 추가 발견 (51)
- 체크리스트 영역마다 합격/결함 카운트
- ⭐ **"추가 발견" 컬럼**: 명시된 체크리스트 외 발견 항목 (CJM KPI 8건이 P0!)
- **18건 결함 우선순위 P0~P3** 명문화
- 각 결함을 **위치 + 현재 + 문제 + 수정안** 4부 구조

### 패턴 5: 정량 채점 + Readiness Gate (53)
- **38 세부 항목 × 0/0.5/1점 = 객관 점수**
- 6 대항목별 백분율 → PASS 조건 (≥85% + 개별 ≥70%)
- **감점 항목 → 조치 시점 명문화** (현 단계 vs 다음 단계 이관)
- "감점 2건 모두 SRS 단계 보강 가능" = 즉시 진입 결정

## ⭐ Quality Gate 패턴 일반화

```
[작성] → [매핑 검토 (전 단계와의 정합)] → [패치]
   → [품질 리뷰 (5 체크리스트 + 추가)] → [개선]
   → [Readiness Gate (정량 채점)]
   → [전환 결정 ≥85% PASS] → [다음 문서]
```

→ **단순 작성 → 검토 → 수정의 사이클이 아니라 정량 점수화로 객관화된 5 단계 게이트**.

이 패턴은 [[product/concepts/SRS-evolution]] 의 V01-V06 + [[product/sources/SRS-V01-V05-Multi-LLM-Workflow]] 7 단계 워크플로의 **PRD 차원 사례**.

## 인용 가능 위치

| 메타 | 원본 | 줄 |
|---|---|---|
| 44 PRD Comparison (4 LLM × 9 항목) | raw 44 | 184 |
| 47 VPS↔PRD Mapping (7 규칙 + 3 결함) | raw 47 | 186 |
| 49 V07 Patch (7건) | raw 49 | 190 |
| 51 V08 Quality (18건 + CJM 8건) | raw 51 | 180 |
| 53 V09 Readiness Gate (38 항목 97%) | raw 53 | 170 |

## Clinical cross-link

- **VPS↔PRD Seg B JTBD 괴리** ([[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 부모 동기) → "양육 성취감 인정"이 **임상적 부모 코칭 모델**의 핵심 정서. 비즈니스 용어로 치환 시 임상 정합성 손실.
- **44 §3에서 V01 Gemini만 HITL 독립 Story** = ADR-02 ([[product/concepts/architecture-decisions]]) 의 임상 안전망. 1급/2급 자격제도의 디지털 운영 모델.
- **51 F-03 HITL 루프백 재학습 기준** = 임상 평가 도구 ([[clinical/entities/U-TAP]]) 의 정상 규준 갱신 사이클과 동일 원리. AI도 임상 표준의 reliability 보강 필요.
- **49 §9.0-c TAM 150만** = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 SAM 22.5만 (15%)의 임상적 근거.

## 관련 product 페이지

- [[product/concepts/PRD-evolution]] — V01-V10 timeline (본 source가 정본 보강)
- [[product/concepts/multi-llm-workflow]] — Best-of-Breed 7 단계 (44 + 47 + 49 + 51 + 53 = PRD 사례)
- [[product/concepts/architecture-decisions]] — ADR-001 (북극성 KPI 선정 근거)
- [[product/sources/54-PRD-V10-Final]] — V09 → V10 (감점 2건 모두 패치)
- [[product/sources/SRS-V01-V05-Multi-LLM-Workflow]] — SRS 차원 동일 패턴

## 보강 필요
- **VPS V01-V08 중간본** (raw 25-32) 메타 정독 — 멀티 LLM 작성 (Sonnet ↔ Gemini ↔ Merged) 유사 패턴 학습 가치.
- **52 V09 Quality Improvement** (raw 52, 692줄) — 51의 18건 결함을 V09에 어떻게 반영했는지 구체.
- **48 V07 Master for SRS** (raw 48) — 47 매핑 검토의 직접 대상.
- **40-46 본문** (V01-V06) 정독 — 44의 4 LLM 비교 매트릭스 검증.
- **변경 관리 프로세스** (Change Request → 리뷰 → 머지) 정의 — 53 선택적 보강 제안.
