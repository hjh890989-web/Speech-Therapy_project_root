---
type: source
pillar: product
source_type: prd
category: PRD-evolution
aliases: [PRD V09 Quality, raw 52, 18 결함 반영, Measurability Testability 검증]
tags: [PRD, V09, V0.9, quality-improvement, measurability, testability, 18-findings, ADR, NFR, CJM-KPI, HITL-재학습, 클러스터52]
---

# PRD V09 Quality Improvement — 18 결함 반영 SRS-Ready 확정판

raw 52 (62KB / 692줄). **V08(raw 51 18건 발견) → V09 Quality(전체 반영) → PRD V10 Final(raw 54)** 의 다리 역할. V08 전체 구조를 **Measurability & Testability** 관점에서 리뷰하여 발견된 **18 결함을 모두 반영**한 SRS 전환 직전 baseline.

> 정독 범위: §1 개요·목표 / §2 사용자·DMU·CJM / §3 Story AC + HITL 안전 프로토콜 / §4 MoSCoW / §5 NFR / §6 ERD + API / §7 리스크·가정·의존성 / §8 실험·롤아웃·벤치마크·Lock-in / §9 Proof / §10 ADR

## 18 결함 반영 분류 (P0 / P1 / P2)

V09 v0.8 (51 7대 패치) → v0.9 (52 18 결함) 변경 헤더 명시 (Revision History L20):

> "품질 리뷰 18건 결함 반영: **CJM KPI 8건 수치화(P0)**, **Lock-in KPI 등록·가정→실험 연결·모니터링 보강(P1)**, **AC 측정 경로·HITL 재학습 기준·산술 교정·Traceability 보완·NFR 연결(P2)**"

| 우선순위 | 항목 수 | 결함 ID (raw 51 정밀) | 적용 섹션 |
|---|---|---|---|
| **P0** | 8 | **C-01 ~ C-08 CJM KPI 수치화** | §2.4 (4 페르소나 × CJM 단계 KPI) |
| **P1** | 3 | F-08 Lock-in KPI 미등록 + F-10 가정→EXP 미연결 + F-04 모니터링 누락 | §8.5 / §7.3 / §5 |
| **P2** | 5 | F-01 기준선 N/A + F-02 S3-AC3 경로 + F-03 HITL 재학습 + F-07 산술 (1,000→17,000배) + F-09 Traceability 누락 | §1.3 / §3 / §3 공통 / §1.4 / §9.1 |
| **P3** | 2 | **F-05 Cold Start AC 미연결 + F-06 SLA CS 도구 명시** | §5 NFR (텍스트 수정만) |
| **합계** | **18** ✅ | (raw 51 정밀 매칭) | |

> ✅ **raw 51 재정독 (2026-05-09) 결과** ([[product/sources/PRD-Intermediate-Reviews-Meta]] § 51 정밀 매칭): 18건 = P0(8) + P1(3) + P2(5) + P3(2) 정확. 이전 위키 추정 "16 명시 + 2 추정 (§1.5 + §2.3)" 정정 — **실제로는 P3 (F-05/F-06) = NFR 텍스트 수정 2건**이 V0.9 v0.9 변경 헤더의 P0/P1/P2 분류에서 누락된 것 (§5 NFR 본문에는 흡수됨). §1.5 + §2.3은 보강 영역이지만 18 결함 카테고리 외 추가 영역.

## P0 — CJM KPI 8건 수치화 (§2.4)

V08까지 정성적이던 페르소나 여정 단계의 KPI를 **모두 측정 가능 수치**로 변환. 4 페르소나 × CJM 단계별 정량화 (총 16 셀, 그 중 핵심 8 셀):

| 페르소나 | CJM 단계 | 신규 수치 KPI |
|---|---|---|
| **Seg A** | 1 의심·탐색 | 무료 진단 후 유료 CVR `≥8%` |
| Seg A | 2 대기·절망 | 첫 미션 진입률 `≥50%` (진단 완료 → 24h 내) |
| Seg A | 3 체념·유지 | WAU `≥60%` (W-AUR 동기화) |
| Seg A | 4 기관 갈등 | 외부 공유 클릭률 `≥15%` |
| **Seg C** | 2 골든타임 | 첫 주 미션 완료율 `≥70%` |
| Seg C | 3 체념·유지 | M2 미션 지속률 `≥50%` (2개월차) |
| **Seg B** | 3 체념·유지 | M3 리텐션 `≥40%` |
| Seg B | 4 기관 갈등 | 가족 단톡방 공유 성공률 `≥95%` |
| **Seg D-1/2** | 1 의심·탐색 | 교사 수동 조작 `평균 0회` |
| Seg D | 3 체념·유지 | 법정대리인 서명 완료율 `≥85%` |
| Seg D | 4 기관 갈등 | 무입력 알림장 발송 승인율 `≥90%` |

→ 모든 CJM 단계가 **정량 KPI를 통해 측정 가능**해짐. Phase 0/1/2 합격 게이트와 자연스럽게 매핑됨 ([[product/sources/TASKS-TEST-Phase-0-1-2-Complete]]).

## P1-① Lock-in KPI 등록 (§8.5)

V08 §11-F (Lock-in & Land Expand)는 정성 narrative만 있었음. V09 Quality는 **4중 Lock-in 전략별 타겟 임팩트 KPI 신규**:

| Lock-in 전략 | 핵심 기제 | 구현 Epic | **신규 타겟 KPI** |
|---|---|---|---|
| **1. 데이터 매몰비용** | 시계열 데이터 = 손실 회피 | F4 | **자발적 Churn `≤5%`** + M3 도달 견인 |
| **2. 아동 주도 잔존** | 아이가 부모에게 앱 실행을 조름 (Bottom-up) | F12 + F3-b | **DAU 유지율** + 중도 이탈률 `<10%` |
| **3. 가족 네트워크** | 가족 단톡방 공유 = 구독 중단 심리 허들 | F5 | **인당 리퍼럴** + 조부모 스폰서십 업셀링 |
| **4. B2B2C FOMO** | 원장 알림장 → 미결제 학부모 FOMO | F9-d | **CAC 0원 수렴** 오가닉 바이럴 |

→ 4중 Lock-in 정본은 [[product/concepts/MVP-feature-spec]] § "4중 Lock-in 메커니즘".

## P1-② 가정 → 실험 연결 (§7.3)

V08까지 가정(Assumptions)과 실험(EXP)이 별도 섹션. V09 Quality는 **A1-A4 가정 → EXP/측정 경로 연결**:

| 가정 ID | 가설 | 검증 실험 ID |
|---|---|---|
| **A1. 가격 수용성** | 월 3.5만 vs 센터 5-8만 → 지불 저항 낮음 | **EXP-4** (가격 앵커링) |
| **A2. 바이럴 확산력** | 맘카페 자발 공유 → 유입 CTR ≥15% | **§8.1 B2C Beta CTR** |
| **A3. 환경 제공 의지** | 부모가 매일 1-3분 기기 제공 | **EXP-1** + **W-AUR** |
| **A4. B2B 효용 체감** | 기관이 Zero-touch 즉시 도입 | **EXP-3** (Zero-touch PoC) |

→ 가정의 검증 책임이 명시적으로 EXP에 매핑됨. **A3 미달 시 F14 거울 모드 조기 투입**, **A4 미달 시 인센티브 별도 설계** 등 컨틴전시 명문화.

## P1-③ 모니터링 보강 (§5)

V08까지 NFR에 모니터링 섹션 약함. V09 Quality는 **5종 대시보드 + 알림 임계치 명문화**:

| 대시보드 | 지표 + 임계치 | 알림 |
|---|---|---|
| **퍼널 전환** | 웹뷰 → 진단 → 결제 일간 변동 `±20%` | Alert |
| **시스템 품질** | STT 에러(500) 5분 내 `3%` 초과 | Slack 즉각 |
| **비즈니스** | LTV:CAC `< 3.0` 하락 | 주간 그로스 리뷰 |
| **HITL 큐 운영** | 24h 초과 큐 `3건` 이상 | Slack + 가용 전문가 자동 배정 |
| **B2B API 연동** | 키즈노트/카카오 1h 내 `5%` 초과 | Fallback 자동 전환 + Slack |

→ 88 Task의 MON-001~004 (모니터링 4종)와 직접 매핑.

## P2-① AC 측정 경로 (§3 Story S1-S6)

V08의 Story AC는 정성 → V09 Quality는 **모든 AC에 측정 임계치 + Neg AC 추가**:

| Story | 신규 측정 임계치 + Neg AC |
|---|---|
| **S1 진단 (Seg A)** | AC-1 `≤300초` / AC-2 처리 실패율 `<2%` / AC-3 p95 `≤1,500ms` / AC-4 면책 노출 `100%` / Neg AC: 마이크 거부 + 60dB 소음 가이드 |
| **S2 미션 (Seg C)** | AC-1 Drop-off `<10%` / AC-2 X표시 `0회` 전환 `<0.5초` / AC-3 보상 렌더 `≤500ms` / AC-4 첫 주 완료율 `≥70%` / Neg AC: 1분 침묵 → 거울 모드 + 오프라인 캐시 |
| **S3 리포트 (Seg B)** | AC-1 p95 `≤3,000ms` / AC-2 카톡 성공률 `≥95%` / AC-3 Amplitude 코호트 클릭 vs 비클릭 익월 `+20%p↑` / Neg AC: 데이터 부족 → 격려 표출 + 카카오 장애 → 클립보드 폴백 |
| **S4 대시보드 (Seg D-1)** | AC-1 100명 엑셀 p95 `≤3,000ms` / AC-2 헤더 변경 `≤1초` / AC-3 서명 `≥85%` / Neg AC: 엑셀 오류 인라인 수정 + 7일 만료 재발송 |
| **S5 Zero-touch (Seg D-2)** | AC-1 능동 조작 `평균 0회` / AC-2 화자분리 `≥85%` (60dB) / AC-3 무수정 승인율 `≥90%` / AC-4 원본 `≤7일` + AES-256 / Neg AC: 마이크 고장 푸시 + 7일 폐기 실패 강제 삭제 큐 |
| **S6 HITL 공통** | AC-1 Confidence `<70` 자동 큐 / AC-2 SLA `48h` / AC-3 치명적 수정률 `<0.5%` / Neg AC-1: **24h 경과 자동 에스컬레이션 + 가용 전문가 재배정** / Neg AC-2: 월 3회 초과 어뷰징 자동 반려 |

→ Story 6종 × 4-6 AC = **30+ 측정 가능 임계치**. SRS REQ-FUNC 변환 직접 기반.

## P2-② HITL 재학습 기준 명문화 (§3 공통 설계 원칙 — 4번째 원칙)

V09 Quality 신규 추가된 **"루프백 재학습" 원칙** (§3 § HITL 안전 프로토콜):

```
적용 방식: 전문가 수동 보정 레이블(Ground Truth)을 모델 파인튜닝 데이터로 환류
적용 Feature: F1-a (AI 엔진)
위반 탐지: AI 초안 vs 전문가 최종 결과 불일치(치명적 오진율) 비율
알림 SLA: 월간

에스컬레이션 (3단계 명문화):
  ① 오진율 0.5% 초과 → 서빙 즉시 롤백
  ② 보정 데이터 500건 이상 누적 후 파인튜닝 재개
  ③ 오진율 0.3% 이하 확인 후 재배포

인터뷰 근거: Seg B "점점 더 정확해진다는 과학적 근거 필요"
```

→ TEST-014 9 시나리오 + ADR-02 HITL 정합. ML Ops 절차 명문화.

## P2-③ 산술 교정 (§1.4)

V08 차별 가치 표에서 시간 단축 비교 산식 누락. V09 Quality는 **명시적 산술**:

| 비교 축 | 기존 | 우리 | 개선 폭 (계산) |
|---|---|---|---|
| 시간 | 오프라인 초진 `2~3개월+` | `≤5분` | **시간 단축 ≥17,000배** = `2개월 ≈ 87,000분 ÷ 5분` |
| 비용 | 센터 1회 `5~8만원` | Basic 월 `3.5만원` | **30~56% 절감** |
| 마찰 | 교사 수기 `주 3h+` | Zero-touch `0회` | **현장 마찰 100% 제거** |

## P2-④ Traceability 보완 (§9.1)

V09 Quality 신규 — **PRD 섹션 → 근거 문서 매핑** (이전 V08 부록 26 보고서 Traceability를 PRD 본문으로 통합):

| PRD 섹션 | 근거 문서 |
|---|---|
| §1 개요·목표 | 문제정의서 + FGI/JTBD |
| §2 페르소나 | CJM 통합본 + Persona Spectrum |
| §3 AC | JTBD 분석 + AOS/DOS |
| §4 기능/Epic | 경쟁사 UX 분석 4건 (33-37) |
| §5 NFR | SLA 벤치마크 + 클라우드 인프라 |
| §7 리스크 | 규제 분석 + DTx 우회 |
| §8 실험 | VPS §14 실험 설계 |
| §10 ADR | 전 섹션 종합 |

## P2-⑤ NFR ↔ AC 연결 (§5)

V08까지 NFR과 Story AC가 별도. V09 Quality는 **NFR 성능 표에 "연결 AC" 컬럼 신규**:

| NFR 항목 | 임계치 | **연결 AC** |
|---|---|---|
| 진단/분석 API 응답 | p95 `≤800ms` | S1-AC3 |
| STT 청크 전송 지연 | `≤300ms` | S1-AC2 |
| 모바일 Cold Start | `≤1.5초` | 공통 (QA 별도) |
| 주간 리포트 렌더 | p95 `≤3,000ms` | S3-AC1 |
| 보상 UI 렌더 | `≤500ms` | S2-AC3 |
| 원아 일괄 업로드 | p95 `≤3,000ms` | S4-AC1 |

→ NFR 임계치 위반 = Story AC 위반 = 합격 게이트 실패. 연쇄 추적 가능.

## §1.3 북극성 KPI ADR-001 보강 (V0.8 → V0.9 유지)

V0.8에서 추가된 ADR-001을 V0.9에서 유지 + KPI 표 보강:

| 유형 | KPI | 기준선 | 목표 | 측정 도구 |
|---|---|---|---|---|
| **🌟 북극성** | **W-AUR (주간 미션 완수율)** | 20% | **≥60%** | App DB + Amplitude |
| 보조 | M3 리텐션 | 20% | ≥40% | 결제 DB + Cohort |
| 보조 | 무료 → 유료 CVR | <3% | ≥8% | Funnel |
| 보조 | 교사 Zero-touch 승인율 | 0% | ≥90% | Backend 로그 |
| 보조 | **HITL 치명적 수정률** | (Phase 0 측정) | **<0.5%** | 전문가 대시보드 |
| 보조 | 월간 Churn | 업계 10-15% | ≤5% | 결제 DB |
| 보조 | 미션 중도 이탈률 | (Phase 0 측정) | <10% | 세션 로그 |

> ADR-001 근거: AOS 9.0 O-1(5분 진단)은 일회성 유입 / O-2(주간 미션 완수)는 **반복 사용 + 리텐션 + MRR 견인** → 비즈니스 성장 근본 동력.

## §10 ADR-01~04 (V0.8 도입 → V0.9 유지)

| ADR | 결정 | 근거 |
|---|---|---|
| **ADR-01** | Zero-touch 음성 수집 전면 도입 | Seg D-2 "1초도 추가로 낼 시간 없다" / R3 |
| **ADR-02** | 비동기 전문가 감수 (HITL) 구축 | 단 1건 오진 = 규제 + 맘카페 민원 / R2 |
| **ADR-03** | 원본 음성 즉각 폐기 (7일) | R4 개인정보·아동보호법 |
| **ADR-04** | 의료 용어 하드코딩 배제 (진단/장애 → 스크리닝/백분위) | R1 DTx 인허가 회피 + Seg D-1 |

→ V10에서 ADR-001 (북극성) + 4 ADR 유지 → V05/V06에서 ADR-05~07 (Next.js·Supabase·Gemini) 추가. 정본 [[product/concepts/architecture-decisions]].

## §6 ERD 7 엔터티 (V09 Quality 정리)

```
USER (1) ──┬─< SESSION_LOG ──< EVALUATION_RESULT
           │                       (3축 점수, 백분위, hitl_reviewed)
INSTITUTION (1) ──< USER
MISSION_CARD ──< SESSION_LOG (triggers)
WEEKLY_REPORT ──< EVALUATION_RESULT (aggregates)
REWARD_PROGRESS ──< USER (cumulative_stars, tree_growth_level)
```

→ DB-001~011 (88 Task) 직접 기반. EVALUATION_RESULT.hitl_reviewed = ADR-02 + TEST-014 9 시나리오 직접 매핑.

## §6.2 4 API (V09 Quality 정리)

| API | 메서드 | 구분 | 제약 |
|---|---|---|---|
| `/v1/diagnosis/analyze` | POST | 내부 | 응답 p95 ≤800ms |
| `/v1/mission/curriculum` | GET | 내부 | 연속 실패 3회 즉시 하향 |
| `/v1/b2b/approval` | PATCH | 외부 | 키즈노트 API (V05 → 클립보드 우회로 D8 Descope) |
| `/v1/consent/sign` | POST | 외부 | 카카오톡 서명 (V05 → 일반 웹 폼으로 [추가 E2] Descope) |

→ V09 Quality 단계까지는 키즈노트/카카오 외부 API 의존 유지 → V10 + 67 MVP Descope에서 우회 (D8/추가 E2).

## V09 Quality → V10 Final 변환

V09 Quality (52) → PRD V10 Final (54)에서 추가:

1. **6 SRS Readiness Gate** 100% 달성 (44 4 LLM 매트릭스 검증)
2. **R7/R8 추가** (Vercel Timeout / Supabase 무료 한도 — 이는 V05 → V06 SRS 단계에서 강화)
3. **21 Epic의 SP 분배** (230 SP / 24 sprints; ⚠️ Epic 실제 합 219 — [[product/sources/54-PRD-V10-Final]] § 4.4 합계행 +11 오차)
4. **Detailed Sprint 1 Backlog** (88 Task 분해)

V09 Quality는 **마지막 기술 중립 PRD**. V10에서 본격적 SRS 변환.

## 워크플로 시사 (반복되는 패턴)

| 패턴 | V07-V08 적용 | **V08 → V09 Quality 적용** |
|---|---|---|
| **자기-인용 보강 사이클** | V07 "Sub-feature 미완 명시" → V08 직접 실행 | V08 운영 후 51 18 Findings 발견 → V09 Quality 직접 반영 |
| **정성 → 정량 전환** | KSF Top 4, AOS/DOS 사분면 | **CJM 16 셀 모두 측정 KPI** + AC 30+ 임계치 + NFR ↔ AC 연결 |
| **재무 논리 무기화** | §11-E ROI 시뮬레이터 (V08) | (계승) |
| **추적 가능성 (Traceability)** | V08 부록 26 보고서 매핑 | **§9.1 PRD 섹션 ↔ 근거 문서 + §9.2 Claim ↔ EXP 검증 매트릭스** |
| **메타 검토 → 정식 반영** | 51 18 Findings (외부 LLM 메타) | **52 v0.9 Quality (자체 반영)** |

→ "메타 검토 → 자체 반영"이 V09에서 1회 → SRS V05/V06에서 다시 반복 (Comparison → V05 Merged → V06 Tech Stack 전환).

## 출처
- raw/52_PRD_V09_Quality_Improvement.md L1-L692
  - L8-L21 Revision History (v0.1-v0.9 변경)
  - L20 v0.9 18 결함 분류 헤더
  - L142-L173 §2.4 CJM 페르소나 4종 KPI 수치화 (P0)
  - L184-L264 §3 Story S1-S6 + HITL 4 원칙 (P2)
  - L386-L431 §5 NFR + 모니터링 5종 (P1·P2)
  - L527-L544 §7.3 가정·의존성 + EXP 매핑 (P1)
  - L595-L603 §8.5 Lock-in KPI 4중 (P1)
  - L655-L666 §9.1 Traceability (P2)
  - L687-L692 §10 ADR-01~04

## 관련 product 페이지

- [[product/concepts/PRD-evolution]] — V01-V10 진화 정본 + V0.9 위치
- [[product/sources/PRD-Intermediate-Reviews-Meta]] — 51 18 Findings 메타 (이 source의 직접 입력)
- [[product/sources/54-PRD-V10-Final]] — V0.9 → V10 Final 변환
- [[product/sources/65-SRS-V06-Final]] — V0.9 ERD/API → SRS REQ-FUNC 변환
- [[product/concepts/architecture-decisions]] — ADR-001 + ADR-01~04 (V0.8 도입 V0.9 유지)
- [[product/concepts/MVP-feature-spec]] — 21 Epic + 4중 Lock-in (V0.9 §8.5)
- [[product/sources/TASKS-TEST-Phase-0-1-2-Complete]] — Story AC ↔ TEST 시나리오 매핑

## Clinical cross-link

- §3 § HITL 안전 프로토콜 4번째 원칙 "루프백 재학습" → [[clinical/concepts/아동언어치료-핵심기법]] 부모 코칭 데이터 환류 패턴.
- §1.1 Pain 4 Cluster (P1 진단 부재 / P2 골든타임 / P3 홈케어 / P4 B2B) → [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 대기 6개월 + 트랙1 의료 영역 회피.
- §10 ADR-04 의료 용어 배제 (진단/장애 → 스크리닝/백분위) → [[clinical/concepts/언어발달지연]] 임상 용어와의 의도적 분리.

## 보강 필요
- 51 18 Findings 정밀 매칭 (16건 명시 + 2건 추정 영역) — [[product/sources/PRD-Intermediate-Reviews-Meta]] §51 부분 재정독.
- §2.3 Intervention Dependency 다이어그램 (CP1 → CP5 + W1-W4 리스크 연쇄) — V0.8 → V0.9 추가 추정. raw 51 정독으로 확정.
- §9.2 핵심 주장 ↔ 검증 지표 매트릭스 (4 Claim) — 88 Task의 TEST 매핑 + KPI Daemon 매핑.
- A3 가정 미달 시 "F14 거울 모드 조기 투입" 컨틴전시 → 88 Task FR-Q/FR-C 신규 항목 검토.
