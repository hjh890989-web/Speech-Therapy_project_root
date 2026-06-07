---
type: concept
pillar: product
category: synthesis
aliases: [MVP 기능 스펙, 21 Epic, 4 Phase 로드맵, Home Language Coaching MVP]
tags: [MVP, Epic, KPI, NFR, HITL, Phase, MoSCoW, 클러스터40-54]
---

# MVP Feature Spec — 21 Epic 종합 정본

본 프로젝트(**Home Language Coaching Platform**)의 21 Epic + 4 Phase + 7대 KPI + HITL + 4 Extremes + 4중 Lock-in의 종합 정본.

## 제품 정체

> **"비의료 B2C 홈 랭귀지 코칭 (Home Language Coaching)"**

- 타깃: 만 2-7세 영유아 부모
- 카테고리 신설: DTx 회피 + 트랙2 사전·대기 단계 보완
- 개발 기간: 2026-06 ~ 2027-01 (28주, 12-14 sprints 병렬 개발)

## 4 Pain Cluster → 21 Epic 매핑

| # | Pain | Epic |
|---|---|---|
| **P1** 진단 부재 | 맘카페 월 20h+, 초진 2-3개월+ | **F1-a, F1-b, F2** |
| **P2** 골든타임 증발 | 방치 4.5개월, 실행률 <50% | **F3-a, F3-b, F12** |
| **P3** 홈케어 비표준화 | 1개월 내 80% 이탈 | **F4, F5, F6** |
| **P4** B2B 권유 딜레마 | 민원 연 3-5건 | **F9-a/b/d, F10** |

## ⭐ 7대 KPI (북극성 + 보조)

| 유형 | KPI | 기준 → 목표 |
|---|---|---|
| 🌟 **북극성** | **W-AUR (주간 미션 완수율)** | 20% → **≥60%** |
| 보조 | M3 리텐션 (유효 구독) | 20% → ≥40% |
| 보조 | 무료→유료 CVR | <3% → ≥8% |
| 보조 | 교사 Zero-touch 승인율 | 0% → ≥90% |
| 보조 | 오진 치명 수정률 (HITL) | — → <0.5% |
| 보조 | 월간 Churn | 10-15% → ≤5% |
| 보조 | 미션 중도 이탈 | — → <10% |

[ADR-001] W-AUR 북극성 선정: O-1 진단(일회성 유입) vs O-2 미션 완수(반복 사용·리텐션 직결).

## 21 Epic — MoSCoW + Phase

### Phase 0 MVP (Must, 6 Epics, 70 SP) — 2026-06 ~ 08

| Epic | 기능 | SP | UX 원천 |
|---|---|---:|---|
| **F1-a** | 3축 AI 음성 분석 엔진 (Linguistic/Articulation/Acoustic) | 20 | [[product/entities/송앤스타크]] 5분 3축 |
| **F1-b** | 무로그인 5분 진단 웹뷰 | 12 | 루먼랩 즉각 스크리닝 |
| **F2** | 또래 비교 진단 리포트 (백분위+넛지) | 8 | KT 스콜라스틱 권위 척도 |
| **F3-a** | 1분 숏폼 미션 카드 UI | 10 | [[product/entities/캐치잇플레이]] 숏폼 |
| **F3-b** | 적응형 난이도 조절 엔진 (ABA) | 12 | 두브레인 보이지 않는 조절 + [[product/entities/에이치투케이]] 다이내믹 |
| **F12** | 게이미피케이션 보상 시스템 (이중 보상) | 8 | SKT AI 드로잉 + 마인드허브 나무 |

### Phase 1 리텐션·바이럴 (Should, 10 Epics, 91 SP) — 2026-08 ~ 11

| Epic | 기능 | SP |
|---|---|---:|
| F4 | 주간 발달 추이 리포트 (음소 핀셋 분석) | 12 |
| F5 | 카카오톡/SNS 공유 (성과 뱃지) | 6 |
| F6 | 비동기 전문가 코멘트 대시보드 (HITL) | 15 |
| F7 | 센터 제출용 PDF | 6 |
| F11 | 부모 목소리 복제 동화 (수용형만) | 10 |
| F14 | 거울 모드 (입 모양 비교) | 8 |
| F15 | LLM 대화형 발화 유도 챗봇 | 12 |
| F16 | 오프라인 일반화 푸시 알림 | 4 |
| F17 | 통합 케어로그 (센터+앱) | 8 |
| F18 | 발달 예측 시뮬레이션 | 10 |

### Phase 2 B2B 스케일업 (Could, 5 Epics, 58 SP) — 2026-10 ~ 12

| Epic | 기능 | SP |
|---|---|---:|
| F9-a | 원장 대시보드 UI (1,100% ROI 시뮬) | 12 |
| F9-b | **Zero-touch 화자분리 수집** ⭐ | 20 |
| F9-c | 원아 일괄등록 + 동의서 발송 | 8 |
| F9-d | AI 쿠션어 알림장 + 명의 커스텀 | 10 |
| F10 | 학부모 전자서명 동의서 | 8 |

### Won't (MVP 명시 제외)
- 의료적 진단/장애 판정 (DTx 회피)
- 실시간 원격 진료/텔레메디슨
- 교정 훈련에 부모 음성 클로닝 (① 원칙)
- 일반 성인 발음 교정

**21 Epic SP 합 = 219** (P0 70 / P1 91 / P2 58). ⚠️ PRD V10 §4.4 합계행은 **230**으로 표기하나 동일 21 Epic·동일 SP의 실제 합은 **219** (**+11 산술 오차**, [[product/sources/54-PRD-V10-Final]] § 4.4). 24 sprints·28주 Gantt 추정은 §4.4의 230 기준.

## 4대 Extremes (가치 선언)

| 극한 | 메시지 | Epic |
|---|---|---|
| **시간** | 3개월 → 5분 (≥17,000배) | F1-a/b, F2 |
| **마찰** | Zero-touch 0회 | F9-b, F9-a |
| **지속** | 1분 숏폼 + 즉각 보상 | F3-a, F12 |
| **증명** | 시계열 리포트 + 스크리닝 | F4, F7, F9-d |

## HITL 안전 프로토콜 4 원칙

| 원칙 | 적용 | SLA |
|---|---|---|
| 자동 에스컬레이션 | AI Confidence < 70 또는 사용자 이의 | 발생 즉시 큐 최상단 + 즉시 배정 |
| 의료적 판단 회피 | "진단" → "스크리닝/백분위", Disclaimer 강제 | 정기/배포, 금칙어 검출 시 차단 |
| 전문가 SLA | 영업일 48h 이내 피드백 | 24h 초과 알림, 48h 임박 마스터 이관 |
| 루프백 재학습 | Ground Truth 모델 파인튜닝 | 월간, 0.5% 초과 즉시 롤백 |

## 4중 Lock-in 메커니즘

| # | 기제 | Epic | 임팩트 |
|---|---|---|---|
| 1 | **데이터 매몰비용** | F4 | Churn ≤5% |
| 2 | **아동 주도 잔존** (도감·보상) | F12, F3-b | DAU 유지 |
| 3 | **가족 네트워크** (단톡방) | F5 | 리퍼럴·업셀 |
| 4 | **B2B2C 바이럴** (원장 알림장 → 학부모 FOMO) | F9-d | CAC → 0 |

## UX 4대 모순 해결 원칙 ([[product/sources/33-37-Competitor-UX-Analysis]])

| # | 원칙 | Epic |
|---|---|---|
| ① | **부모 음성 = 수용형만 (F11), 교정 = 제3 캐릭터 (F3)** | F11, F3 |
| ② | **교사 입력 0회**: 수집 = 화자분리 / 교사 = 발송 승인만 | F9-b, F9-d |
| ③ | **이중 보상**: 모든 시도 = 작은 보상, 임상 도달 = 큰 보상 | F12 |
| ④ | **B2C = DTx 톤 / B2B = 오피스 툴 톤** | 전체 UI/UX |

## 4 Experiment

| EXP | 가설 | 임계 | Phase |
|---|---|---|---|
| EXP-1 전환 톤 | 코칭 톤("상위 N%") | CVR +2%p | Phase 0 |
| **EXP-2 리포트 락인** | 예측 시뮬레이션이 M3 견인 | **M3 ≥ 40%** | Phase 1 |
| EXP-3 Zero-touch | 패시브 수집 도입 수락 ↑ | 조작 0회 + 수락률 ≥20% | Phase 2 |
| EXP-4 가격 앵커링 | 센터 비용 노출 시 결제 ↑ | 결제 시작률 +5%p | Phase 0 |

## R6 — Seg B 가설 ⚠️ 부분 검증 + Plan B (§6.7 정본)

EXP-2 결과 M3 < 40%일 경우 피벗 (시스템 차원):

| 피벗 조치 | 대상 | 변경 내용 |
|---|---|---|
| **F4 재설계** | F4 (주간 추이) | 정적 꺾은선 그래프 → **F18 예측 시뮬레이션 최상단 승격**. "다음 주 예상 점수" 핵심 앵커 |
| **F12 보상 강화** | F12 (보상 시스템) | 누적 보상 가시성: 월간 성장 리포트 + 보상 연동 → **"이번 달 나무 레벨 3 도달"** 등 해지 시 손실 체감 극대화 |
| **F5 공유 리디자인** | F5 (가족 공유) | 뱃지 공유 → **아이 성장 스토리 카드** 감성 내러티브. Seg B "증명" → "자랑" 욕구로 프레이밍 이동 |
| **EXP-2b 후속** | 신규 실험 | 피벗 후 4주 재측정 (n=400). M3 ≥35% 시 피벗 확정 / 미달 시 Seg B 축소 + Seg A/C 집중 |

→ 정본: [[product/sources/65-SRS-V06-Final]] § 6.7 / [[product/sources/54-PRD-V10-Final]] § 7.2 R6.

## 가격 모델

| 티어 | 가격 | 포함 | 수익 비중 |
|---|---|---|---|
| Lead-Gen | 0원 | AI 진단 1회 + 또래 비교 | — |
| **Basic** | **월 35,000원** | 주간 미션 + 자동 리포트 + 추이 그래프 | **70%** |
| Premium | 월 50,000원 | Basic + 전문가 비동기 코멘트 | 15% |
| B2B | 연 500,000원 | 무제한 스크리닝 라이선스 | 15% |

## 3개년 SOM 시나리오

| | Y1 | Y2 | Y3 | 누적 |
|---|---:|---:|---:|---:|
| 유료 가구 | 12K | 35K | 60K | — |
| B2C 매출 | ~50억 | ~147억 | ~252억 | **~449억** |
| KPI | CVR≥8% | M3≥40% | LTV:CAC ≥4 | |

## NFR 핵심

| 영역 | 임계 |
|---|---|
| 진단 API | p95 ≤800ms |
| 보상 UI | ≤500ms |
| Cold Start | ≤1.5s |
| Uptime | ≥99.9% |
| 화자분리 정확도 (60dB) | ≥85% |
| MTTR | <2h |
| HITL SLA | <48h |
| 음성 원본 보관 | ≤7일, AES-256 |
| AI 호출 비용 | 월구독료의 ≤15% (5,250원) |

## ⭐ 7 ADR (아키텍처 결정 종합, §6.8)

본 MVP의 7개 핵심 결정. 정본: [[product/concepts/architecture-decisions]].

| ADR | 결정 | 토대 |
|---|---|---|
| ADR-01 | Zero-touch 수집 | F9-b · ADR (R3 회피) |
| ADR-02 | HITL 비동기 감수 | F6 + HITL 4 원칙 (R2 완화) |
| ADR-03 | 원본 음성 7일 폐기 | REQ-FUNC-005 + Vercel Cron (R4·R8 방어) |
| ADR-04 | 의료 용어 배제 | FR-C-005 Middleware 금칙어 (R1 회피) |
| **ADR-05** ⭐ | **Next.js 풀스택 모놀리스** | C-TEC-001~007 (1인/AI 호환) |
| **ADR-06** ⭐ | **Supabase BaaS 통합** | DB-001 1일 부트스트랩 (DevOps 0) |
| **ADR-07** ⭐ | **Vercel AI SDK + Gemini** | Python 서버 0 (운영비 ↓) |

ADR-05~07이 [[product/concepts/MVP-descope-plan]] § 1주차 Action Item ($30/월) 가능케 함.

## 출처
- [[product/sources/54-PRD-V10-Final]] (1차 정본)
- [[product/sources/39-VPS-V09-Final]] (V09 → PRD V10 매핑)
- [[product/sources/33-37-Competitor-UX-Analysis]] (UX 원칙)
- [[product/sources/65-SRS-V06-Final]] § 6.6 Validation + § 6.7 R6 + § 6.8 ADR
- [[product/concepts/jtbd-insights]] § MVP 5대 우선순위 (정합성 검증)
- [[product/concepts/opportunity-quadrants]] § Q1-Q4 (페르소나 구현)
- [[product/concepts/architecture-decisions]] § 7 ADR

## ⭐ 정합성 검증 — JTBD MVP 5대 ↔ PRD MVP 6 Must

| JTBD MVP # ([[product/concepts/jtbd-insights]]) | PRD Phase 0 (Must) | 비고 |
|---|---|---|
| 1. 무료 AI 진단 + 또래 비교 | F1-a + F1-b + F2 (3 Epic) | 더 세분화 |
| 2. 진단 연계 주간 미션 | F3-a + F3-b (2 Epic) | 미션 + 적응형 분리 |
| 3. 주간 추이 리포트 (SNS 공유) | F4 + F5 (Phase 1) | **Phase 1로 이동** ⚠️ |
| 4. 비동기 전문가 코멘트 | F6 (Phase 1) | **Phase 1로 이동** ⚠️ |
| 5. 센터 공유용 PDF | F7 (Phase 1) | **Phase 1로 이동** ⚠️ |
| (JTBD에 없음) | F12 보상 | PRD 추가 — 게이미피케이션 |

> **차이**: JTBD 5대 중 3·4·5는 PRD에서 Phase 1로 이동. **PRD Phase 0 = 진단(F1-a/b/F2) + 미션(F3-a/b) + 보상(F12)** 6 Epic. 진단·미션·보상이 핵심 진입 가치, 리포트·전문가·PDF는 리텐션 단계. JTBD insight의 "방법론이 진짜 구매 이유" (발견 #1)과 정합 — Phase 0에서 진단→미션→보상까지가 핵심 구독 동력.

## Clinical 근거

- F1-a 3축 = [[clinical/entities/U-TAP]] (조음·음운) + [[clinical/entities/REVT]] (어휘) 임상 표준화 검사의 디지털 변형. **각 임상 검사 절단점이 우리 백분위의 Ground Truth**.
- F2 또래 비교 백분위 = REVT/U-TAP 정상 규준 디지털 표현.
- F3-b ABA = [[clinical/concepts/조음장애]] § 단음→대화 6단계 위계의 자동화. 단, "비의료" 포지션 위해 ABA 차용은 backend만.
- F6 비동기 전문가 = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 5-10분 부모 상담의 비동기 전환. KSF #3의 직접 구현.
- F11 부모 음성 (수용형만) = [[clinical/concepts/실어증]] § MIT/CART 임상 원리 (치료자 ≠ 가족 역할 분리).
- F18 발달 예측 = [[clinical/concepts/한국-언어치료-트랙비교]] § 재평가 (3-6개월) 의 미래형.
- HITL 의료법 회피 = 트랙1 (의료기관) 영역과 명시적 분리.

## 보강 필요
- VPS V09의 §10 GTM Copy + §13 영업 시퀀스 + §14 검증 채널은 본 페이지 미반영 — 별도 partial ingest 시 보강.
- SRS V06 ingest로 본 21 Epic이 시스템 레벨 명세로 어떻게 분해되는지 보강 필요.
- TASKS/ 100+ 항목과 본 21 Epic의 매핑 — 별도 [[product/concepts/task-breakdown-overview]] 페이지에서 처리 권장.
