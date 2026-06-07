---
type: source
pillar: product
title: Home Language Coaching Platform PRD v1.0 — Final (Golden Master)
source_path: ../../../raw/54_PRD_V10_Final.md
source_type: prd
authors: [Product, AI, Data, Growth, B2B BizDev]
year: 2026
ingested: 2026-05-09
tags: [PRD, MVP, Epic, KPI, NFR, HITL, 4Phase, 클러스터40-54]
---

# PRD V10 Final (Golden Master) — 요약

> **한 줄 요약.** SRS Readiness Gate 6대 기준 100% PASS 달성한 SRS 전환용 최종 확정판. **21 Epic / 4 Phase / 7대 KPI / 230 SP** (§4.4 표기; Epic 실제 합 219) + HITL 안전 프로토콜 + 4 Extremes + 4중 Lock-in 메커니즘 정의.

기반: V0.1(Gemini 초안) → V0.2 리스크/AC → V0.3 21 Epic + Gantt → V0.4 NFR → V0.5 ERD/API → V0.6 KPI 수치화 → V0.7 SRS Master → V0.8 VPS 결함 패치 → V0.9 18건 결함 반영 → V1.0 Final.

## 1. 핵심 식별

- **공식 제품명**: Home Language Coaching Platform
- **카테고리**: 비의료 B2C 홈 랭귀지 코칭 (Home Language Coaching)
- **타깃 연령**: 만 2~7세 영유아
- **개발 기간**: 2026-06 ~ 2027-01 (28주, 12-14 sprints 병렬)

## 2. 4대 Pain Cluster (P1~P4) → 21 Epic

| # | Pain | 실패 KPI | Needs | Epic |
|---|---|---|---|---|
| **P1** | 진단 기준 부재 | 맘카페 월 20h+, 초진 2-3개월+ | ≤5분 백분위 객관화 | F1-a/b, F2 |
| **P2** | 골든타임 증발 | 방치 4.5개월, 실행률 <50% | 매일 1-3분 미션 즉시 개입 | F3-a/b, F12 |
| **P3** | 홈케어 비표준화 | 1개월 내 80% 이탈 | 62→71점 시계열 가시화 | F4, F5, F6 |
| **P4** | B2B 권유 딜레마 | 민원 연 3-5건, 퇴소 1-2명/분기 | Zero-touch + 원장 명의 | F9-a/b/d, F10 |

## 3. 5 페르소나 (DMU)

| Seg | 페르소나 | DMU 유형 | 규모 | Story |
|---|---|---|---|---|
| **A** | 불안형 탐색자 (엄마) | B2C 의사결정자 | 12-15만 가구 | S1 |
| **C** | 센터 대기자 (엄마) | B2C 핵심 결제자 | 2-3만 가구 | S2 |
| **B** | 데이터형 개입자 (가족) | B2C 유지자 | 3-5만 가구 | S3 |
| **D-1** | 유치원 원장 | B2B 결제권자 | ~5,000 기관 | S4 |
| **D-2** | 보육 교사 | B2B 게이트키퍼 (거부권) | — | S5 |

> ⚠️ **Seg B는 ⚠️ 부분 검증** — H-B 가설 표본 부족. R6 리스크 연동, EXP-2 Plan B (피벗 시나리오) 명시.

## 4. ⭐ 7대 KPI

| 유형 | KPI | 기준선 | 목표 |
|---|---|---|---|
| **🌟 북극성** | **주간 미션 완수율 (W-AUR)** | 20% | **≥ 60%** |
| 보조 | M3 리텐션 (유효 구독) | 20% | ≥ 40% |
| 보조 | 무료→유료 CVR | <3% | ≥ 8% |
| 보조 | 교사 Zero-touch 승인율 | 0% | ≥ 90% |
| 보조 | 오진 치명 수정률 (HITL) | 측정 중 | < 0.5% |
| 보조 | 월간 Churn Rate | 10-15% | ≤ 5% |
| 보조 | 미션 세션 중도 이탈 | 측정 중 | < 10% |

[ADR-001] 북극성으로 W-AUR 선정: O-1(5분 진단)은 일회성 유입 / O-2(주간 미션)는 반복 사용·리텐션 직결.

## 5. 21 Epic — MoSCoW 우선순위

### Must (Phase 0 MVP, 6 Epics, 70 SP)
| Epic | 기능 | SP |
|---|---|---|
| **F1-a** | 3축 AI 음성 분석 엔진 (Linguistic/Articulation/Acoustic) | 20 |
| **F1-b** | 무로그인 5분 진단 웹뷰 | 12 |
| **F2** | 또래 비교 진단 리포트 (백분위+넛지) | 8 |
| **F3-a** | 1분 숏폼 미션 카드 UI | 10 |
| **F3-b** | 적응형 난이도 조절 엔진 (ABA 기반) | 12 |
| **F12** | 게이미피케이션 보상 시스템 | 8 |

### Should (Phase 1 리텐션, 10 Epics, 91 SP)
| Epic | 기능 | SP |
|---|---|---|
| F4 | 주간 발달 추이 리포트 | 12 |
| F5 | 카카오톡/SNS 공유 (성과 뱃지) | 6 |
| F6 | 비동기 전문가 코멘트 대시보드 (HITL) | 15 |
| F7 | 센터 제출용 PDF | 6 |
| F11 | 부모 목소리 복제 동화 | 10 |
| F14 | 거울 모드 (입 모양 비교) | 8 |
| F15 | LLM 대화형 발화 유도 챗봇 | 12 |
| F16 | 오프라인 일반화 푸시 알림 | 4 |
| F17 | 통합 케어로그 (센터+앱) | 8 |
| F18 | 발달 예측 시뮬레이션 | 10 |

### Could (Phase 2 B2B, 5 Epics, 58 SP)
| Epic | 기능 | SP |
|---|---|---|
| F9-a | 원장용 대시보드 UI | 12 |
| F9-b | Zero-touch 화자분리 수집 | 20 |
| F9-c | 원아 일괄등록 + 동의서 발송 | 8 |
| F9-d | AI 쿠션어 알림장 + 명의 커스텀 | 10 |
| F10 | 학부모 동의서 자동 생성/전자서명 | 8 |

### Won't (MVP 명시적 제외)
- 의료적 진단/장애 판정 (DTx 인허가 회피)
- 실시간 원격 진료/텔레메디슨 (의료법 저촉)
- 교정 훈련에 부모 음성 클로닝 (윤리적 딥페이크)
- 일반 성인 발음 교정 (타겟 이탈)

**총 230 SP / 24 sprints (병렬 시 12-14 sprints = 28주)** — raw §4.4 합계행 기준. ⚠️ 단, 위 21 Epic SP 실제 합 = **219** (70+91+58); raw §4.4 합계행이 +11 산술 오차(동일 Epic·동일 SP). 24 sprint·28주 추정은 230 기준.

## 6. 4대 Extremes (가치 선언)

| 극한 | 메시지 | Epic |
|---|---|---|
| **시간** | 3개월 → 5분 (≥17,000배 단축) | F1-a/b, F2 |
| **마찰** | Zero-touch 0회 | F9-b, F9-a |
| **지속** | 1분 숏폼 + 즉각 보상 | F3-a, F12 |
| **증명** | 시계열 + 스크리닝 리포트 | F4, F7, F9-d |

## 7. 가격 모델 (Freemium + Tiered)

| 티어 | 가격 | 포함 |
|---|---|---|
| Lead-Gen | 0원 | AI 진단(1회) + 또래 비교 |
| **Basic** | **월 35,000원** | 주간 미션 + 자동 리포트 + 추이 그래프 |
| Premium | 월 50,000원 | Basic + 전문가 비동기 코멘트 |
| B2B 기관 | 연 500,000원 | 무제한 스크리닝 라이선스 |

## 8. 3개년 SOM 시나리오

| | Year 1 | Year 2 | Year 3 | 누적 |
|---|---:|---:|---:|---:|
| 유료 가구 | 12,000 | 35,000 | 60,000 | — |
| B2C 매출 | ~50억 | ~147억 | ~252억 | **~449억** |
| 핵심 KPI | CVR≥8%, CAC≤3만 | M3≥40% | B2B CAC 1만↓ | LTV:CAC ≥4.0 |

## 9. HITL 안전 프로토콜 (4대 원칙)

| 원칙 | 적용 | SLA | 에스컬레이션 |
|---|---|---|---|
| 자동 에스컬레이션 | AI Confidence < 70 또는 사용자 이의 | 발생 즉시 | 큐 최상단 + 가용 전문가 즉시 배정 |
| 의료적 판단 회피 | "진단" → "스크리닝/백분위", Disclaimer 강제 | 정기/배포 | 금칙어 검출 시 렌더링 차단 |
| 전문가 SLA | 영업일 48h 이내 피드백 | 24h 초과 시 알림 | 마스터 재활사 + CS 강제 이관 |
| 루프백 재학습 | Ground Truth로 모델 파인튜닝 | 월간 | 오진율 0.5% 초과 → 즉시 롤백, 0.3% 이하 후 재배포 |

## 10. 4중 Lock-in 메커니즘

| # | 기제 | Epic | 임팩트 |
|---|---|---|---|
| 1 | **데이터 매몰비용** (성장 포트폴리오 손실 회피) | F4 | Churn ≤5% |
| 2 | **아동 주도 잔존** (도감·보상으로 아이가 부모에게 조름) | F12, F3-b | DAU 유지 |
| 3 | **가족 네트워크** (단톡방 공유 → 구독 중단 허들) | F5 | 리퍼럴 + 업셀 |
| 4 | **B2B2C 바이럴** (원장 알림장 → 학부모 FOMO) | F9-d | CAC → 0 |

## 11. 6 Risk + R6 Plan B

| # | 리스크 | 영향 | 대응 |
|---|---|---|---|
| R1 | 의료법 저촉 | 🔴 | Disclaimer 강제 + 비의료 포지션 |
| R2 | STT 실패율 (소음·유아 발음) | 🟡 | 노이즈 튜닝 + HITL |
| R3 | 교사 거부 (B2B 실패) | 🔴 | Zero-touch 사수 + PoC 검증 |
| R4 | 영유아 음성 정보 유출 | 🔴 | 전자서명 + 7일 파기 + 암호화 |
| R5 | 키즈노트 API 정책 변경 | 🟡 | SMS/카톡 Fallback |
| **R6** | **Seg B 가설 ⚠️ 부분 검증** | 🟡 | EXP-2에서 Seg B 코호트 분리 추적 → M3 미달 시 **Plan B 피벗** (F4 → F18 예측 승격, F12 매몰비용 강화, F5 감성 내러티브) |

## 12. 4대 Experiment

| EXP | 가설 | n | 임계 |
|---|---|---|---|
| EXP-1 전환 톤 | 코칭 톤("상위 N%") > 경고 톤 | 500/2주 | CVR +2%p |
| EXP-2 리포트 락인 | 예측 시뮬레이션이 M3 견인 | 800/4-8주 | M3 ≥ 40% |
| EXP-3 Zero-touch | 패시브 수집 시 도입 수락↑ | 기관 10곳 | 조작 0회 + 수락률 ≥20% |
| EXP-4 가격 앵커링 | 센터 비용 노출 시 결제 시작↑ | 1,000/2주 | 결제 시작률 +5%p |

## 13. NFR 핵심

- **성능**: 진단 API p95 ≤800ms, 보상 UI ≤500ms, 콜드스타트 ≤1.5초
- **신뢰성**: Uptime ≥99.9%, B2B 화자분리 정확도 ≥85%
- **SLA**: MTTR <2h, RPO <1h, RTO <4h, CS <4h, HITL <48h
- **보안**: 음성 원본 ≤7일, AES-256, AI 호출 비용 ≤월구독료의 15%

## 인용 가능 위치

| 주제 | 원본 위치 |
|---|---|
| 4 Pain Cluster | L37~L44 |
| 7대 KPI + ADR-001 | L54~L65 |
| 5 페르소나 + Critical Path | L86~L138 |
| 6 User Story + AC | L186~L264 |
| HITL 안전 프로토콜 | L256~L264 |
| 4 Extremes | L271~L278 |
| 21 Epic MoSCoW | L280~L319 |
| Phase Gantt | L322~L353 |
| 가격 모델 + 3년 시나리오 | L359~L381 |
| Sprint 분해 (230 SP) | L388~L414 |
| NFR | L420~L466 |
| ERD + API | L470~L540 |
| Range In/Out | L545~L549 |
| 6 Risk + R6 Plan B | L552~L570 |
| 가정·의존성 | L572~L588 |
| 4 EXP | L597~L623 |
| 8 벤치마크 | L626~L637 |
| 4중 Lock-in | L640~L648 |
| AOS/DOS 매트릭스 | L657~L665 |
| JTBD 검증 상태 표 | L669~L677 |
| TAM-SAM-SOM | L681~L696 |

## Clinical cross-link

- **카테고리 정의 "Home Language Coaching"** = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 사전 단계 + [[clinical/concepts/아동언어치료-핵심기법]] 4기법의 디지털 변환의 공식 명명.
- F1-a 3축 AI 분석 (Linguistic/Articulation/Acoustic) = [[clinical/entities/U-TAP]] (조음음운) + [[clinical/entities/REVT]] (어휘) 표준화 검사의 디지털 변형.
- F2 또래 비교 백분위 = REVT/U-TAP 정상 규준 절단점의 디지털 표현.
- F6 비동기 전문가 코멘트 = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 매 세션 5-10분 부모 상담의 비동기 전환. 본 PRD가 [[product/concepts/Key-Success-Factors]] § KSF #3을 정확히 구현.
- HITL 안전 프로토콜 + 의료법 회피 = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙1 회피 결정의 PRD 구현.
- F11 부모 목소리 복제 (교정 적용 금지) = ASD 거부감 완화. [[clinical/concepts/자폐-화용중재]] 영역과 부분 매핑.
- F18 발달 예측 시뮬레이션 = [[clinical/concepts/한국-언어치료-트랙비교]] § 재평가 (3-6개월) 의 미래형 변형.

## 관련 product 페이지

- [[product/concepts/MVP-feature-spec]] — 21 Epic + KPI + Phase 종합 (정본)
- [[product/concepts/PRD-evolution]] — V01 → V10 진화 과정
- [[product/concepts/jtbd-insights]] § MVP 5대 우선순위 와의 정합성 검증 (PRD에서 6개 Must로 확장됨)
- [[product/concepts/opportunity-quadrants]] § Q1·Q2 페르소나의 PRD 구현
- [[product/concepts/customer-segmentation]] — Seg D 분리 (D-1 결제권자 / D-2 게이트키퍼)

## 보강 필요 / 한계
- 본 PRD는 시뮬레이션 인터뷰 ([[product/sources/22-23-JTBD-Interview-Results]]) 기반 — Seg B 부분 검증의 직접 결과.
- TAM 추산이 본 PRD §9.0-c에서는 "150만 가구"인데 [[product/sources/13-Market-Sizing]]의 "72-96만 가구"와 차이 — **방법론 차이 정본 비교**: [[product/concepts/customer-segmentation]] § "TAM 정의 모순 — 보수 vs 광의". 본 PRD = 광의 정의 (전체 cohort, 마케팅 잠재력) / 13 = 보수 정의 (관심 30-40% 필터, VC·Unit Economics). 양쪽 SOM 1년차 12K 가구 수렴.
- B2B 기관 5,000개 추정 출처 미명시.
- LTV:CAC ≥4.0 목표가 [[product/concepts/Porter-5-Forces-Analysis]] §3.0 기준선과의 차이 — PRD에서 더 공격적 목표 설정.
