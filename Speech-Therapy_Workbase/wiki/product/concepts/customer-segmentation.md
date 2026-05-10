---
type: concept
pillar: product
category: synthesis
aliases: [TAM-SAM-SOM, 시장 세분화, Market Segmentation, 고객 세그먼테이션]
tags: [세그먼테이션, TAM, SAM, SOM, 페르소나, 클러스터10-23]
---

# Customer Segmentation — 통합

본 프로젝트의 시장 구조와 고객 세그먼트 종합. TAM-SAM-SOM, 4세그먼트 매트릭스, 13개 페르소나 스펙트럼을 하나의 페이지로.

## TAM-SAM-SOM

> ⚠️ **TAM 정의는 출처별로 두 가지 — 본 위키는 13의 보수 정의(72-96만)를 정본으로 사용**. PRD/VPS의 광의 정의(150만)와의 차이는 아래 § "TAM 정의 모순 — 보수 vs 광의" 표 참조.

### 본 위키 정본 (13의 보수 정의)

| 구분 | 정의 | 가구 수 | 연 매출 |
|---|---|---:|---:|
| TAM | 만 0-7세 부모 중 언어 관심·우려 | 72-96만 | 3,024-4,032억 |
| SAM | TAM 중 경계선+심화 + 온라인 수용 | 17-25만 | 714-1,050억 |
| **SOM (1년차)** | SAM 중 마케팅·파일럿 도달 | **5,000-12,500** | **21-52.5억** |

산출 근거 등 상세는 [[product/sources/14-Market-Segmentation]] / [[product/sources/13-Market-Sizing]] § TAM-SAM-SOM 산정 로직.

### TAM 정의 모순 — 보수 vs 광의 (방법론 차이)

| 항목 | **보수 정의 (13 정본)** ⭐ | **광의 정의 (PRD/VPS)** |
|---|---|---|
| **출처 페이지** | [[product/sources/13-Market-Sizing]] L90 / [[product/concepts/customer-segmentation]] / [[product/sources/14-Market-Segmentation]] | [[product/sources/54-PRD-V10-Final]] §9.0-c / [[product/sources/52-PRD-V09-Quality-Improvement]] §9.0-c / [[product/sources/39-VPS-V09-Final]] |
| **TAM 정의** | 만 0-7세 영유아 가구 × **부모 관심 30-40% 필터** | 만 2-7세 영유아 가구 **전체 cohort** |
| **TAM 가구 수** | **72-96만** | **150만** |
| **이론 근거** | "관심 없는 부모는 결제 의지 없음" → 잠재 수요만 카운트 | "전체 시장 잠재력" → 마케팅으로 관심 환기 가능 |
| **SAM 산식** | TAM × 경계선+심화 10-15% × 온라인 수용 70% | (PRD V0.9 §9.0-c) TAM × 발달 지연 우려 15% = ~22.5만 |
| **SAM 결과** | **17-25만** | **22.5만** (수렴) |
| **SOM 결과** | 5K-12.5K (1년차) | **12K** (1년차, 8% CVR) |
| **사용 권장 맥락** | **VC·투자 검토** (보수 보고) / Unit Economics 검증 / Porter-5F 정량 보강 | **마케팅 잠재력** / Lock-in 4중 전략 적용 가능 인구 |

→ **양쪽 모두 SOM 1년차는 12K 가구 수렴**. TAM 차이는 "잠재력 vs 즉각 도달 가능 시장"의 정의 차이. **본 위키는 보수 정본 (13) 우선 — 13 명시 메모 ("13의 정의가 더 보수·정확") 따름**.

→ 추가 맥락: [[product/concepts/Porter-5-Forces-Analysis]] LTV:CAC 9.0x 정량 보강은 보수 TAM 기준. PRD V0.9 §1.3 W-AUR ≥60% / M3 ≥40% / CVR ≥8% 등 KPI는 광의 TAM 기준 시장 점유율 시뮬레이션.

## 4 세그먼트 매트릭스

축: **개입 의지 × 심각도**

| | 개입 낮음 (관망) | 개입 높음 (적극) |
|:---|:---|:---|
| **심각도 높음** | **Seg C · 센터 대기자** (2-3만) | **Seg B · 적극적 개입자** (3-5만) |
| **심각도 낮음** | **Seg D · 기관 연계** (1-2만) | **Seg A · 불안형 탐색자** (12-15만) ★ |

## 우선순위 + 페르소나 매핑

| 세그 | 규모 | SOM 기여 | Phase | 대표 페르소나 (사분면) |
|---|---|---|---|---|
| **A · 불안형 탐색자** | 12-15만 | **60-70%** | 1 (0-6개월) | [[product/entities/persona-이지수]] (Q1), [[product/entities/persona-김태희]] (Q2), [[product/entities/persona-정유나]] (**Q4 ⚠️**) |
| **B · 적극적 개입자** | 3-5만 | 15-20% | 3 (6-12개월) | [[product/entities/persona-박민정]] (Q2, Seg A→B) |
| **C · 센터 대기자** | 2-3만 | 10-15% | 2 (3-9개월) | [[product/entities/persona-최수현]] (Q1) |
| **D · 기관 연계** | 1-2만 | 5-10% | 4 (12개월+) | [[product/entities/persona-오한솔]] (Q1, DOS 1위), [[product/entities/persona-손지훈]] (Q1) |
| Non-user | (SAM 70-80%) | 0% | 별도 마케팅 | [[product/entities/persona-김민지]] (Q4, 외부 충격 필요) |

> ⭐ **PRD V10 ([[product/sources/54-PRD-V10-Final]]) 에서의 Seg 재구조화**:
> - **Seg D 분리**: D-1 (유치원 원장 = B2B 결제권자, ~5,000 기관) + D-2 (보육 교사 = B2B 게이트키퍼, 거부권 보유)
> - **Seg B 위치 재정의**: "데이터형 부모" → "데이터형 가족 (아빠/조부모)" — Phase 1 리텐션 결정자
> - **Critical Path**: Seg A (불안 엄마) → Seg C (결제) → Seg B (가족 납득) → Seg D-1 (원장 결제) → Seg D-2 (교사 Zero-touch 수용)
> - **Seg B ⚠️ 부분 검증**: H-B 가설 표본 부족 → R6 리스크 + EXP-2 Plan B 피벗 시나리오 ([[product/concepts/MVP-feature-spec]] § R6).

→ 사분면 정본: [[product/concepts/opportunity-quadrants]]. Core-5 정유나는 라벨상 핵심이지만 **AOS·DOS 기준 Q4 부차적**으로 재조정.

## 페르소나 스펙트럼 (13명)

```
Core (5)         "이상적 주력 고객"
  ├ 이지수      Seg A · 검색만 3개월 · 진입 장벽 + 볼륨
  ├ 박민정      Seg A→B · 데이터 직성 · 고LTV·바이럴
  ├ 최수현      Seg C · 센터 대기 4개월 · 전문가 신뢰
  ├ 김태희      Seg A~B · 쌍둥이 비용 부담 · Triage
  └ 정유나      Seg A · 성장 기록 · 인스타 바이럴

Adjacent (3)     "유사 니즈 + 다른 맥락 → B2B2C·파트너"
  ├ 오한솔      유치원 원장 · 1명 → 80가구
  ├ 손지훈      아동심리상담사 · 전문가 추천 앱
  └ 이미란      다문화 가정 · 이중언어 차별화

Extreme (2)      "제약 사용자 → 포용적 설계 기준"
  ├ [[product/entities/persona-황보름]] ⭐ ASD 경계선 · 비전형 발화 · AI 다양화 (Q2)
  └ [[product/entities/persona-강지방]] ⭐ 농촌 · 구형폰 · 경량+오프라인 (Q2 황금 교차점 AOS 4.0)

Non-user (3)     "회피 집단 → 진입 장벽 학습"
  ├ [[product/entities/persona-윤성민]] 아버지 · 비용 저항 · 아빠 콘텐츠 우회 (Goal 부재 / 이탈 방어 게이트)
  ├ [[product/entities/persona-송혜경]] 외할머니 · AI 불신 · 소아과 앵커 (Q3 과잉투자 경계 DOS -0.4)
  └ [[product/entities/persona-김민지]] 유튜브 거짓 안심 · 충격 요법 마케팅 (Q4)
```

## 9개 제품 설계 시사점 (페르소나 기반)

| 인사이트 | 근거 | 설계 |
|---|---|---|
| 진입 장벽 = 호들갑 부담 | 이지수 | 무료·비공개 진단, 익명 옵션 |
| 리텐션 = 수치 가시화 | 박민정 | 음소별 추이, 주간 변화 |
| 전문가 신뢰 앵커 | 최수현·송혜경 | 언어재활사 검토 배지 + 소아과 파트너십 |
| 간결함 | 김태희 | 5분 활동, 알림 최소 |
| 아버지 이탈 방지 | 윤성민 | 파트너 공유 리포트, 아빠 콘텐츠 |
| 비전형 발화 대응 | 황보름 | AI 다양화 + 치료사 리뷰 |
| 저사양·지방 접근성 | 강지방 | 경량 + 오프라인 + LTE 절약 |
| B2B2C 채널 | 오한솔·손지훈 | 기관용 스크리닝 + 전문가 파트너 |
| 유튜브 거짓 안심 타파 | 김민지 | "영상 vs 상호작용" 효과 비교 |

## 4 Phase 접근 전략

| Phase | 기간 | 타깃 | 핵심 활동 | KPI |
|---|---|---|---|---|
| 1 | 0-6개월 | Seg A | 무료 진단 퍼널 (맘카페·인스타) | 전환율 ≥8% |
| 2 | 3-9개월 | Seg C | 센터 보완 + 센터 파트너십 | M3 유지 |
| 3 | 6-12개월 | Seg B | 프리미엄 업셀 (전문가 코칭 + 심화 리포트) | ARPU 5만+ |
| 4 | 12개월+ | Seg D | B2B2C 기관 연계 | 기관 도입 수 |

→ [[product/concepts/Key-Success-Factors]] § 5개 KSF의 우선순위와 매핑됨.

## 세그먼트 간 흐름

```
Seg D (기관 추천) ─→ Seg A
Seg A (진단 "개입 필요") ─→ Seg C
Seg A (경계선 + 자발 구독) ─→ Seg B
Seg C (대기 중 효과 체감) ─→ Seg B
```

## 출처
- [[product/sources/14-Market-Segmentation]] (TAM-SAM-SOM, 4세그먼트, Seg A 상세)
- [[product/sources/15-Persona-Spectrum]] (13개 페르소나)
- [[product/sources/12-Problem-Definition-Final]] (회색지대 부모 30-50만 = SAM 17-25만의 일부)

## Clinical 근거
- 심각도 축의 임상 정의: [[clinical/concepts/언어발달지연]] § 평가 도구 절단점에 따른 등급.
- Seg C "센터 대기" → [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙 2 평가→치료 단계.
- Seg D "기관 연계" → 유치원 사전 스크리닝 = [[clinical/entities/SELSI]] 의 비공식 적용.
- 황보름 (Extreme-1) → [[clinical/concepts/자폐-화용중재]] § ASD 발화 패턴.
- 이미란 (Adjacent-3) → [[clinical/concepts/언어발달지연]] § 이중언어 환경 차별 진단.

## 보강 필요
- Seg A 12-15만 가구의 active 도달 가능성 검증 (맘카페 monthly active 등).
- 페르소나는 합성 — JTBD 인터뷰(raw 22, 23) ingest 시 실제 데이터 보정.
- Adjacent 손지훈 (아동심리상담사)의 시장 규모 미산정.
