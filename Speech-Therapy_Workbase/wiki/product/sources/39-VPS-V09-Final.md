---
type: source
pillar: product
title: Value Proposition Sheet (VPS) V09 — UX Reinforce Final
source_path: ../../../raw/39_VPS_V09_final_UX_reinforce.md
source_type: vps
authors: []
year: 2026
ingested: 2026-05-09
ingested_partial: true
tags: [VPS, ProblemSolutionFit, Canvas, JTBD, GTM, BizModel, 클러스터24-39]
---

# VPS V09 Final — 요약 (부분 정독)

> **한 줄 요약.** PRD/SRS/사업계획 작성을 위한 Business & User 전략 통합 마스터. **B2B2C DMU 5세분화** + **MVP Sub-feature 단위 상세화**. 26개 사전 분석 보고서를 통합한 V09는 [[product/sources/54-PRD-V10-Final]] 의 직접 기반.

> ✅ **§10/§13/§14 추가 정독 완료** (2026-05-09 30차): §10 GTM Copy + §13 영업 시퀀스 + §14 검증/파트너십/Unfair Advantage/BMC 9-Block. **결론: V09 §10/§13/§14 = V08 본문과 거의 1:1 동일** (V09는 V08 영업 무기 + BMC + 해자 그대로 계승. 신규 추가 0건). 정독은 [[product/sources/31-32-VPS-V07-V08-Detail]] § V08 분석으로 적용 완료.

> ✅ **§4-2/§4-5/§4-6/§9 추가 정독 완료** (2026-05-09 41차, Open Issues G-1 해소): V08 → V09 진정한 차이점 영역. V09 정독 완성도 ≈ 65% (350+225 / 841줄).

## V08 → V09 §4 Epic 리팩토링 V2 ⭐ (41차 정독)

### §4-2 분리/병합 (V09 신규 변경 핵심)

**분리 (3건)** — 단일 책임 (BE 또는 FE) 원칙 적용:

| 기존 V08 Epic | 문제점 | V09 리팩토링 결과 |
|---|---|---|
| **F1** AI 음성 진단 | Backend 엔진 + Frontend 웹뷰 혼재 | **F1-a** (BE 엔진) + **F1-b** (FE 웹뷰) |
| **F3** 맞춤 미션 | 숏폼 UI + 적응형 난이도 알고리즘 혼재 | **F3-a** (FE 미션 UI) + **F3-b** (BE 난이도 엔진) |
| **F9** 원장 대시보드 | 대시보드 UI + 화자분리 + 등록 + 알림장 혼재 | **F9-a** (FE UI) + **F9-b** (BE 화자분리) + **F9-c** (BE 등록/동의) + **F9-d** (FE 알림장) |

**병합 (2건)** — 의존성 단순화 + 동일 책임자 일관성:

| 기존 V08 Epic | 병합 근거 | V09 결과 |
|---|---|---|
| **F12 + F13** (AI 드로잉 + 나만의 나무) | 둘 다 보상 시스템. 동일 FE 담당자 일관 설계 | **F12** 통합 (게이미피케이션 보상) |
| **F19 + F20** (AI 쿠션어 + 원장 명의) | 둘 다 F9 대시보드 내부. 독립 시 의존성 복잡 | **F9-d** 병합 (서브피처) |

### §4-3 4 모순 해결 원칙 ⭐ (V09 신규 — Quick Reference)

| # | 모순 주제 | 해결 원칙 | 적용 Epic |
|---|---|---|---|
| **①** | 부모 목소리 vs 캐릭터 | 일방향 콘텐츠 (동화)만 부모 목소리. **교정 훈련은 중립 캐릭터** | F3-a, F11, F15 → **ADR-09 정합** |
| **②** | Zero-touch vs 체크박스 | 데이터 Input 100% 마이크. **교사는 승인만** | F9-b → **ADR-01 정합** |
| **③** | 은밀한 난이도 vs 강한 보상 | 모든 시도 → 작은 보상. **완벽 성공 → 큰 보상 (이중 보상)** | F3-a, F3-b, F12 |
| **④** | 임상 권위 vs 행정 편의 | **B2C 앱 = DTx 톤 / B2B 대시보드 = 오피스 툴 톤** | F2, F4, F9-a, F9-d → **ADR-04 정합** |

→ **4 모순 원칙 = ADR-01·04·09 등 위키 ADR의 직접 임상·UX 토대**.

### §4-5 14 경쟁사 18 시사점 → 21 Epic 매핑

| 경쟁사 분석 | 시사점 수 | 매핑 Epic |
|---|---|---|
| 33 통신 3사 (LGU+·SKT·KT) | 5 | F11 부모 음성·F12 즉각 보상·F15 챗봇·F9-b 화자분리·F1-a 임상 표준 |
| 34 에듀테크 (와우키키·H2K·캐치잇·에듀템·윙스) | 5 | F14 거울모드·F18 예측·F3-a 숏폼·F1-a 음소·F9-d Seamless |
| 35 DTx (마인드허브·뉴다이브·드림에이아이·두브레인·루먼랩) | 5 | F12 누적 보상·F16 푸시·F17 케어로그·F3-b ABA·F1-b 초조기 스크리닝 |
| 36 B2B2C (키즈노트·자란다·째깍악어) | 3 | F9-d 쿠션어·F9-d 명의 커스텀·F9-b Zero-touch |

→ **18 시사점 → 21 Epic 빠짐없이 매핑 (§4-5 자체 명시)**. 정본 [[product/sources/33-37-Competitor-UX-Analysis]].

### §4-6 21 Epic 총괄 카운트 (V09 정식화)

| Phase | Epic 수 | Backend | Frontend |
|---|---|---|---|
| **Phase 0 (MVP)** | 6 | F1-a, F3-b | F1-b, F2, F3-a, F12 |
| **Phase 1 (리텐션)** | 10 | F6, F11, F15, F16, F18 | F4, F5, F7, F14, F17 |
| **Phase 2 (B2B)** | 5 | F9-b, F9-c, F10 | F9-a, F9-d |
| **합계** | **21** | **10** | **11** |

→ **단일 책임 원칙** 적용: 각 Epic이 BE 또는 FE 단일. RTM ([[product/concepts/requirements-traceability-matrix]]) 의 21 Epic 정본의 토대.

### §9 페르소나 커버리지 V2 (V09 강화 — DMU 5분리 정식화)

V08 § §9에서 시작한 페르소나 커버리지 → V09에서 **신규 7 Epic (F12 + F14~F18 + F9-d) 추가 매핑**:

| DMU | 신규 V09 추가 혜택 |
|---|---|
| **Seg A** | F15 LLM 챗봇 (자연 발화 유도) + F12 AI 드로잉 (거부감 제거) |
| **Seg C** | F17 통합 케어로그 + F16 오프라인 푸시 (일상 전이) |
| **Seg B** | F18 "다음 주 예상 점수" + F14 거울 모드 (교정 체험 깊이) |
| **Seg D-1** | F9-d AI 쿠션어 알림장 + F9-a.2 명의 커스텀 |
| **Seg D-2** | F9-b.3 발송 승인만 (모순 ② 적용) |

→ **검증 결론**: V08 F1~F10 대비 V09는 신규 7 Epic으로 각 페르소나의 **2차 Pain Point** (아이 거부감 / 일상 전이 / 구독 연장 / 교사 감정 소모) 까지 100% 커버.

## V09 정독 결론 (V08 → V09 진정한 차이점 명확화)

| 영역 | V08 | **V09 (신규)** |
|---|---|---|
| §4 Job-Feature 매핑 | F1~F10 (10 Epic) | **§4-2 분리/병합 → 21 Epic + §4-3 4 모순 원칙 + §4-5 18 시사점 매핑** |
| §6 Sub-feature | F1.1~F10.1 (V08 도입) | **V2 Refactored — 단일 책임 원칙 적용 정밀화** |
| §9 페르소나 커버리지 | Seg D-1/D-2 분리 (V08 도입) | **신규 7 Epic 매핑 + 2차 Pain Point 100% 커버** |
| §10/§13/§14 | 영업 무기 + BMC + 해자 | **V08과 1:1 동일** (30차 정독 검증) |

→ **V09의 본질** = V07 4단계 + V08 Sub-feature/§9 + **§4 Epic 리팩토링 V2 + §4-3 모순 원칙 + 14 경쟁사 18 시사점 매핑** 의 통합. V09 = PRD V10의 직접 기반.

## V09 §10/§13/§14 = V08 1:1 동일 ✅ (30차 정독 검증)

raw 39 L616-L808 정독 결과:

| 섹션 | V09 본문 | V08과의 차이 |
|---|---|---|
| **§10 GTM Copy** | Seg A·C·B·D-1/D-2 4 헤드라인 + 서브카피 | V08과 텍스트 동일 (Seg D를 D-1/D-2 통합 표기는 양쪽 동일) |
| **§13-1 B2C 시퀀스** | 4단계 (문 열기 → Pain 공감 → 가치 검증 → 최종 결제) | V08과 텍스트 동일 |
| **§13-2 B2B2C 시퀀스** | 4단계 (접점 → Pain 공감 → PoC → 락인) + **F9.4 ROI + F9.2 Zero-touch 프레임** | V08과 텍스트 동일 |
| **§14-1 MVP 4 핵심 가설** | CTR ≥15% + CVR ≥8% + B2B 수락 ≥20% + M3 ≥40% | V08과 동일 |
| **§14-2 Wedge Channel** | 유치원 연합회 + 소아청소년과 + 맘카페 인플루언서 | V08과 동일 |
| **§14-3 Unfair Advantage** | ① 발달 궤적 데이터 (★★★★★) + ② B2B2C 선점 (★★★★☆) + ③ 조음 NLP (★★★★☆) | V08과 동일 |
| **§14-4 BMC 9-Block** | KP·KA·VP·CR·CS / KR·CH / CS_비용·RS | V08과 동일 |
| **§15 리스크** | 규제 + 개인정보 + 품질 (HITL) | V08과 동일 |

→ V08 → V09 §10/§13/§14는 **변경 0건**. **V09의 진정한 차이점은 §4 Job-Feature 매핑 V2 + §6 Sub-feature V2 + §9 페르소나 커버리지 (DMU 5분리)** 영역.

## V09 핵심 진화점 (vs 초기 V01)

| 항목 | 초기 V01-V07 | **V09 final** |
|---|---|---|
| **DMU 세분화** | Seg A·C 2종 | **A·C·B·D-1·D-2 5종** (B2B2C 분리) |
| **MVP 세분화** | F1-F10 (10개) | **F1-a/b, F3-a/b, F9-a/b/c/d 등 21개 Sub-feature** |
| **카테고리 명명** | "비의료 B2C 교육" 잠정 | **"홈 랭귀지 코칭 (Home Language Coaching)"** 공식 |
| **포지셔닝 선언** | DTx 회피 | "비의료 B2C 홈 랭귀지 코칭" |
| **JTBD 검증** | 추론 | 5 페르소나 중 **4 완전 + 1 ⚠️ 부분(Seg B)** |

## §1 Problem-Solution Fit

### 4대 Core Pain (PRD P1-P4와 동일)
- 진단 기준 부재 → Seg A 막연한 불안
- 골든타임 증발 → Seg C 죄책감 + 교재 비용 ↑
- 홈케어 비표준화 → Seg B 효과 증명 불가, 1개월 80% 이탈
- 치료 권유 딜레마 → Seg D-1 민원, Seg D-2 업무

### 5 페르소나 JTBD 선언문 (When/Want/So/But)

| Seg | 검증 | 핵심 |
|---|---|---|
| A | ✅ 완전 | "맘카페 비교로 불안 극에 달할 때 → 즉각 객관 데이터로 위치 확인 → 과민 아님 확신 + 즉시 조치" |
| C | ✅ 완전 | "3-6개월 대기 속절없을 때 → 골든타임 낭비 안 하는 홈케어 → 치료사에 제출 + 즉각 본 치료 진입" |
| B | ⚠️ **부분** | "포기하고 싶을 때 → 62→71점 객관 시각화 → 동력 유지 + 가족 인정 받음" → R6 |
| D-1 | ✅ 완전 | "민원 책임 전가 시 → 제3자 객관 데이터로 도입 → 민원 방어 + 프리미엄 차별화" |
| D-2 | ✅ 완전 | "학부모 면담 시 → 객관 결과지로 부드럽게 권유 → 컴플레인 없이 자연스레 책임 이전" |

### Critical Path (DMU Dynamics)
```
Seg A 불안형 엄마 → Seg C 결제 → Seg B 가족 납득 → Seg D-1 원장 결제
                                                       ↓
                                                Seg D-2 교사 (게이트키퍼, 거부권)
```

→ [[product/sources/54-PRD-V10-Final]] § 2.2 Critical Path 동일 구조.

## §3 Proof — TAM 산정 (V09 시점)

VPS V09에서는 TAM을 ~150만 가구로 추산 (만 2-7세 영유아 전체). [[product/sources/14-Market-Segmentation]] (TAM 72-96만)과 차이 — V09는 **만 2-7세 좁힘 + 부모 관심 비율 미적용**으로 정의 차이.

→ [[product/sources/13-Market-Sizing]] 의 산정 로직과 비교 검증 필요.

## V09 → PRD V10 매핑 정합성

VPS V09의 §6(MVP Sub-feature) → PRD V10의 21 Epic이 거의 1:1 매핑:
- F1 진단 → F1-a (3축 엔진) + F1-b (웹뷰)
- F3 미션 → F3-a (숏폼 UI) + F3-b (적응형 난이도)
- F9 B2B → F9-a (대시보드) + F9-b (Zero-touch) + F9-c (일괄등록) + F9-d (알림장)
- F2, F4, F5, F6, F7, F11, F12, F14, F15, F16, F17, F18, F10 = 동일

## VPS의 자체 가치 (PRD에 흡수되지 않은 부분)

| 영역 | V09 고유 |
|---|---|
| §10 GTM & UX/UI Copy | 페르소나별 광고 카피·앱 카피 (PRD에는 요약만) |
| §13 영업 진입 시퀀스 | B2B 기관 영업 단계별 터치포인트 |
| §14 사업 검증·파트너십 | 채널 전략, 100가정 파일럿 모집 채널 |
| §15 리스크 관리 | PRD R1-R6 외 추가 마케팅·법적 리스크 |
| §11.D 가격 수용성 근거 | "센터 5-8만원 앵커, 3.5만은 불안 해소 보험금" 심리 분석 |

→ 이 영역들은 PRD ingest로는 보강 안 됨. 필요 시 별도 partial ingest.

## 인용 가능 위치 (정독 부분만)

| 주제 | 원본 위치 |
|---|---|
| 시장 구조 + 포터 5F | L42~L57 |
| 4대 Core Pain | L62~L67 |
| 비의료 B2C 홈 랭귀지 코칭 카테고리 선언 | L69 |
| 5 페르소나 JTBD 선언문 | L83~L117 |
| Critical Path | L137~L146 |

## Clinical cross-link

- "비의료 B2C 홈 랭귀지 코칭" 카테고리 명명 = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 진입 직전 단계 + [[clinical/concepts/아동언어치료-핵심기법]] 의 공식 명명.
- §1.4 5 JTBD 선언문 = [[product/sources/22-23-JTBD-Interview-Results]] 시뮬 인터뷰의 정형화된 형태.

## 관련 product 페이지

- [[product/concepts/VPS-evolution]] — V01 → V09 진화 timeline
- [[product/sources/54-PRD-V10-Final]] — V09를 흡수한 다음 단계
- [[product/concepts/MVP-feature-spec]] — 21 Epic + KPI 종합

## 보강 필요
- ✅ **§10 GTM Copy / §13 영업 시퀀스 / §14 검증** — 30차 정독 완료. V08과 1:1 동일 검증.
- ✅ **§4-2 Epic 리팩토링 + §4-3 4 모순 원칙 + §4-5 경쟁사→Epic 추적 + §4-6 21 Epic 총괄 + §9 페르소나 커버리지 V2** — 41차 정독 완료. V09 진정한 차이점 명확화.
- §11 Biz Model — V08 §11 (A-G 7부)과 1:1 동일 (V09에 변경점 없음).
- ⚠️ §2 Canvas + §3 Proof + §5 공통 설계 + §6 Sub-feature V2 + §7 우선순위 + §8 타임라인 — 부분 미독 (PRD V10 흡수 검증 + V08 V2 Refactored 합성으로 narrative 신뢰도 확보).
- TAM 산정 정의 차이 검증 ([[product/sources/13-Market-Sizing]] 와 일관성).
- VPS V01-V08 중간본은 timeline 페이지 ([[product/concepts/VPS-evolution]])에서 narrative만.
