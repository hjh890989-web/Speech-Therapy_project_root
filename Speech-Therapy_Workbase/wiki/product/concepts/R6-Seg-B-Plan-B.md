---
type: concept
pillar: product
category: synthesis
aliases: [R6 Plan B, Seg B 피벗 시나리오, EXP-2 실패 대응, F4 → F18 재구성]
tags: [R6, SegB, PlanB, EXP-2, 피벗, F4, F18, 예측-시뮬레이션, 영향분석, CR-Tier2, raw53감점, 클러스터통합]
---

# R6 Seg B Plan B — EXP-2 실패 시 Epic 변경 시나리오

raw 53 감점 5-7 (PRD V09 Final Readiness Gate 점수표) 후속 처리 — **EXP-2 (리포트 리텐션 A/B) M3 ≥40% 미달 시 구체적 Epic 변경안**. PRD V10 §7.2 R6 "리포트 구성 피벗"의 추상 권고를 구체적 Epic·Task·KPI 재배분 시나리오로 명문화. **CR Tier 2 처리 권고**.

> raw 53 감점 5-7 (0.5점): "Seg B 가설 미검증(R6) 시 '리포트 구성 피벗'이라 언급되어 있으나, 구체적으로 어떤 Epic을 어떻게 변경할지(예: F4 리포트를 F18 예측 시뮬레이션 중심으로 재구성 등)의 피벗 시나리오까지는 기술되어 있지 않습니다. SRS 단계에서 보강 가능한 수준입니다." → **본 페이지가 그 보강 정본**.

## 배경 — R6 트리거 정의

### Seg B 검증 상태 (현재)

| 항목 | 값 |
|---|---|
| **JTBD 가설 ID** | H-B |
| **검증 상태** | ⚠️ **부분 검증** |
| **표본 부족 사유** | JTBD 인터뷰 시뮬레이션 6명 중 Seg B (데이터형 가족 = 아빠/조부모) 직접 응답자 부족 |
| **연관 리스크** | R6 (Seg B 가설 미완전 검증, 🟡 Mid) |
| **검증 실험** | EXP-2 (리포트 리텐션 A/B Test, n=800, 4-8주) |
| **성공 기준** | M3 (3개월차) 리텐션 유지율 ≥ 40% |
| **위키 정본** | [[product/sources/52-PRD-V09-Quality-Improvement]] § 7.2 R6 + [[product/sources/22-23-JTBD-Interview-Results]] |

### EXP-2 실패 정의 (Plan B 트리거)

| 시나리오 | 임계 | 액션 |
|---|---|---|
| **A (성공)** | Seg B 코호트 M3 ≥ 40% | F4 + F18 현 설계 유지. Plan B 미발동. |
| **B (경계)** | Seg B 코호트 M3 30~40% | F4 본문 카피 + F5 가족 공유 강화 (소규모 CR). Plan B 부분 발동. |
| **C (실패)** | Seg B 코호트 **M3 < 30%** | ⚠️ **R6 본격 발동 → 본 Plan B 전면 적용**. F4 → F18 재구성. CR Tier 2. |

→ Phase 1 EXP-2 종료 시점 (4-8주 후) 자동 평가. M3 < 30% 조건 충족 시 본 Plan B로 전환.

## Plan B 핵심 가설 — F18 (발달 예측) 중심 재구성

### 진단 (현 F4 단독의 한계)

| 한계 | 사유 | Seg B 영향 |
|---|---|---|
| **F4 = 정적 시계열 그래프** | "62 → 65 → 71" 꺾은선 시각화만 | "그래프 한 번 보고 끝" → 다음 주 재방문 동기 부족 |
| **과거 지향** | 이미 발생한 점수만 표시 | "데이터 집착형" Seg B는 **미래 예측·시뮬레이션** 욕구가 더 강함 |
| **수치 시각화 = Seg A·C도 동일** | 차별화 부족 | Premium 50K 결제 동기 약함 |

→ **가설**: Seg B "데이터 집착" + "가족 공유 자랑" Pain 의 진정한 해소는 **"다음 주 점수 예상" + "미래 손실 회피"** 감성. F4 정적 그래프만으로는 부족.

### 변경안 — F18 → F4-Plus 통합 Epic 승격

```
기존 (현 V09 Quality):
  F4 (12 SP, P1 Should)  - 주간 발달 추이 리포트
  F18 (4 SP, P1 Should)  - 발달 예측 시뮬레이션
  → 별개 Epic, F4가 핵심 / F18은 보조

Plan B (R6 발동 시):
  F4-Plus (16 SP, P1 Must)  - 시계열 + 예측 통합 단일 Epic
    ├─ F4-Plus.1: 주간 시계열 (현 F4 흡수, 6 SP)
    ├─ F4-Plus.2: 익월 예측 시뮬레이션 (현 F18 흡수, 6 SP)
    └─ F4-Plus.3: "미래 손실 회피" 망상 카피 + 가족 공유 통합 (4 SP)
```

### 새 Lock-in 메커니즘

| 현 Lock-in #1 | **Plan B Lock-in #1** |
|---|---|
| **데이터 매몰비용** | **데이터 매몰 + 미래 손실 회피** |
| 시계열 Data Log을 잃기 싫어 해지 포기 | 시계열 Data Log + **"다음 달 예측 점수가 +N% 상승 예정"** 미래 가치 손실 회피 |
| Loss Aversion (이미 누적된 손실) | Loss Aversion + **Anticipation** (예상되는 미래 가치 손실) |

→ Lock-in 효과 **2배 강화** (현재 + 미래 양쪽 회피 심리 동시 자극).

## 구체적 Epic·Task·REQ 변경 매트릭스

### Epic 변경

| Epic | 현 (V09 Quality) | **Plan B** | 차이 |
|---|---|---|---|
| **F4** | 12 SP, P1 Should | (해체, F4-Plus.1로 통합) | -12 |
| **F18** | 4 SP, P1 Should | (해체, F4-Plus.2로 통합) | -4 |
| **F4-Plus** | (없음) | **16 SP, P1 Must** ⭐ | +16 |
| **합계** | 16 SP (별개 Epic 2개) | 16 SP (통합 Epic 1개, P1 Must 승격) | SP 동일, **응집도 ↑** |

### Task 변경 (88 Task → 89 Task 가정)

| Task ID | 현 매핑 | **Plan B 매핑** | 변경 |
|---|---|---|---|
| FR-Q-005, 006 | F4 | F4-Plus.1 | Epic 재할당만 |
| FR-Q-012 | F18 | F4-Plus.2 | Epic 재할당만 |
| FR-C-010, 011 | F4·F18 | F4-Plus.1·F4-Plus.2 | Epic 재할당만 |
| **FR-C-NEW-PB-1** "미래 손실 회피 카피 통합" | (없음) | **F4-Plus.3 신규** | +1 task (1 SP) |

→ 88 Task → 89 Task. F4-Plus는 기존 4 task 통합 + 1 신규 = 5 task.

### REQ-FUNC 변경

| REQ ID | 현 (SRS V06) | **Plan B (SRS V07 후속)** |
|---|---|---|
| REQ-FUNC-027~029 | F4 | F4-Plus.1 (시계열) |
| REQ-FUNC-044~045 | F18 | F4-Plus.2 (예측) |
| **REQ-FUNC-NEW-PB-1** | (없음) | F4-Plus.3 — Given Seg B 부모 + 첫 리포트 진입 / When 예측 점수 +N% 노출 / Then "다음 달 시뮬레이션 잠금 해제" 카피 + 가족 공유 CTA → 익월 결제 +25%p (vs 비노출 코호트) |

### KPI 변경

| KPI | 현 (V09 Quality) | **Plan B** |
|---|---|---|
| **북극성 (W-AUR)** | ≥60% | 동일 (변경 없음) |
| **M3 리텐션** | ≥40% | ≥40% (Plan B 시 검증 재실행) |
| **시뮬레이션 클릭률 → 익월 결제** | +20%p (REQ-FUNC-029 / EXP-2) | **+25%p ↑ 강화** (Plan B 신규 KPI) |
| **F4-Plus.3 카피 노출 → 가족 공유** | (없음) | **≥30%** 신규 KPI |
| **Premium 구독 전환율 (Seg B)** | (없음) | **≥10%** 신규 KPI (F4-Plus 통합 = Premium 차별화 강화) |

## ADR 영향 분석

| 기존 ADR | 영향 | 조치 |
|---|---|---|
| **ADR-07 Vercel AI SDK + Gemini** | F4-Plus.2 예측 = Gemini 회귀 모델 직접 호출 (현 F18 명세와 동일) | 영향 없음 |
| **ADR-04 의료 용어 배제** | "예측 점수" 표현 = 의료 진단 회피 정합 | 영향 없음 |
| **ADR-12 변경 관리 3-Tier** | 본 Plan B = **CR Tier 2** (Major: Epic 통합 + 신규 task + KPI 추가) | 적용 |

→ 신규 ADR 불필요. 기존 7~12 ADR 모두 정합.

## Persona 영향

| Persona | 현 매핑 | **Plan B 매핑** |
|---|---|---|
| **박민정 (Core-2, Seg A→B)** | "데이터로 직성" → F4 시계열 | "데이터로 직성 + 미래 예측 망상" → F4-Plus 통합 / **Premium 50K 직접 타깃** |
| **윤성민 (Non-user, 아빠)** | F5 카톡 공유 (Lock-in #3) | **F4-Plus.3 가족 공유 통합** → Lock-in #3 강화 (단일 화면에서 공유 트리거) |
| **송혜경 (외할머니)** | (직접 영향 없음) | **F4-Plus.2 예측 = 미래 시뮬레이션 = 의료/디지털 회의 약화** (보조 효과) |
| **김태희 (쌍둥이)** | F12 보상 (간결함) | F4-Plus.3 + Triage 다자녀 비교 통합 가능성 (CR Tier 1 후속) |

→ **Seg B 박민정 직접 강화 + 가족 네트워크 (윤성민·송혜경) 부수 효과**.

## CR Tier 2 처리 흐름 (CR 워크플로 적용)

```
[1] 변경 제안 (Proposal)
    ├─ 트리거: EXP-2 종료 시점 자동 평가 (M3 < 30%)
    ├─ 발견 채널: Sprint Retro + Amplitude 코호트 분석
    └─ 산출: CR-YYYY-NNN-R6-PlanB

[2] 영향 분석 (RTM)
    ├─ Tier: 2 (Major)
    ├─ 영향 차원: REQ + Epic + Task + Persona + KPI
    └─ RTM 갱신: 88→89 Task, 21→20 Epic (F4·F18 통합), KPI +3종

[3] 리뷰 (2 리뷰어 + Quality Gate)
    ├─ 1차: PM (Seg B 검증 결과 검토)
    ├─ 2차: CTO (Vercel AI SDK 회귀 모델 비용·정확도 검증)
    └─ Quality Gate: 5 체크리스트 재실행 (특히 §3 Story AC §5 NFR §9 Traceability)

[4] 승인 (Approval)
    ├─ Plan B 발동 = SRS V06 → V07 minor (vX.Y)
    └─ Revision History `v0.10` 또는 `v1.1` 신규

[5] 머지 (Merge)
    ├─ MVP-feature-spec § 21 Epic → 20 Epic (F4-Plus 신규)
    ├─ requirements-traceability-matrix § 모든 차원 갱신
    ├─ task-breakdown-overview § F4-Plus 매핑 추가
    └─ HITL-system-flow / change-management-process 영향 없음

[6] 검증 (Readiness Gate 재실행)
    ├─ 38 항목 점수 재산출 (현 97% → 목표 ≥97% 유지)
    └─ 새 결함 발견 시 → [1]로 되돌림

[7] 통보
    └─ 영향 받은 모든 차원 (Seg B 관련 페이지 8건) 자동 알림
```

## Plan B 미발동 시나리오 (성공 시)

EXP-2 종료 시 Seg B 코호트 M3 ≥ 40% 달성 시:
- 현 F4 + F18 별개 Epic 유지
- 본 Plan B 페이지 = **이력 보존** (CR 거버넌스 사례로 유효)
- raw 53 감점 5-7 = ✅ 해소 (Plan B 명문화로 형식 충족)

## 위키 영향 매트릭스

| 페이지 | Plan B 시 변경 | 우선순위 |
|---|---|---|
| [[product/concepts/MVP-feature-spec]] | F4 + F18 → F4-Plus 통합. 21 Epic → 20 Epic | High |
| [[product/concepts/requirements-traceability-matrix]] | RTM 5축 갱신 | High |
| [[product/concepts/task-breakdown-overview]] | 88→89 Task. F4-Plus 매핑 신규 | High |
| [[product/sources/65-SRS-V06-Final]] | REQ-FUNC-NEW-PB-1 + AC 추가 | High (SRS V07) |
| [[product/sources/52-PRD-V09-Quality-Improvement]] | §7.2 R6 → "Plan B 발동" 표시 | Medium |
| [[product/concepts/customer-segmentation]] | Seg B 페르소나 매핑 강화 (F4-Plus) | Medium |
| [[product/entities/persona-박민정]] | F4-Plus 직접 타깃 명시 + Premium 50K | Medium |
| [[product/concepts/architecture-decisions]] | ADR 신규 없음 (기존 정합) | Low |

→ **High 4 + Medium 3 + Low 1 = 8 페이지 영향**. CR Tier 2 영향 분석 표준.

## ⭐ EXP-2 자동 평가 메커니즘 (F-3 후속, 48차 추가)

[[product/concepts/open-issues-dashboard]] § F-3 후속 처리. **Plan B 트리거의 자동화** — Phase 1 EXP-2 종료 시점 (4-8주 후) 자동 평가 + Slack Alert + CR Tier 2 자동 트리거.

### 자동화 흐름

```
[Phase 1 진입]
   ↓
[Day 28 (4주차) 시작]
   매일 measure_seg_b_cohort_m3()
   ├─ DB query: 결제 DB + Amplitude 코호트
   ├─ Seg B 식별 (페르소나 박민정 매핑 또는 행동 패턴)
   ├─ M3 (90일 시점) 리텐션 = 활성 / 신규 가입 비율
   └─ Slack #ml-metrics 일일 보고 (검증 모드)
        ↓
[Day 56 (8주차) 종료]
   EXP-2 결과 자동 분석
   ├─ Seg B 코호트 M3 측정 + 신뢰구간 95%
   ├─ 표본 검증 (코호트 ≥ 200명)
   ├─ 자동 4 시나리오 분류
   └─ Slack Alert + CR Tier 2 자동 트리거 (필요 시)
```

### 4 시나리오 — 자동 분류

| 시나리오 | M3 결과 | 자동 액션 |
|---|---|---|
| **A 성공** | M3 ≥ 40% | ✅ Slack Info: "EXP-2 통과 (Seg B M3=N%) — 현 F4+F18 유지" |
| **B 경계** | M3 30~40% | 🟡 Slack Warning: "EXP-2 경계 — 소규모 CR (F4 카피 강화 + F5 가족 공유) 권고" |
| **C 실패 (Plan B 트리거)** | M3 < 30% | 🔴 Slack Critical + **CR Tier 2 자동 시작**: F4+F18 → F4-Plus 통합 + 8 페이지 영향 매트릭스 자동 알림 |
| **D 표본 부족** | n < 200 | ⚠️ Slack Info: "표본 부족 (N명) — Day 84 (12주차)까지 연장 측정" |

### Vercel Cron 자동 평가 (Phase 1 한정)

```typescript
// /api/cron/exp2-evaluator.ts
// vercel.json: { "schedule": "0 5 * * 1" }  // 매주 월요일 05:00 KST

export async function GET() {
  const phase = await getCurrentPhase();
  const phaseStartDay = await getSystemConfig('phase_1_start_day');
  const daysSincePhase = daysBetween(phaseStartDay, new Date());
  
  // Phase 1이 아니거나 28일 미만 = skip
  if (phase !== 'PHASE_1' || daysSincePhase < 28) {
    return Response.json({ status: 'skip', reason: 'too_early' });
  }
  
  const segBCohort = await db.payments.findSegBCohort({
    minDays: 90,  // M3 측정 가능 (Day 56 = Phase 1 시작 후 56일)
    persona: ['Seg B', '박민정형']
  });
  
  if (segBCohort.length < 200) {
    await sendSlackInfo(`📊 Seg B 코호트 부족 (${segBCohort.length}/200) — Day 84까지 연장`);
    return Response.json({ status: 'insufficient_cohort', n: segBCohort.length });
  }
  
  const m3 = calculateM3Retention(segBCohort);
  const ci = bootstrapCI(segBCohort, n=1000);
  
  // 자동 4 시나리오 분류
  if (m3 >= 0.4) {
    await sendSlackInfo(`✅ EXP-2 통과 — Seg B M3=${(m3*100).toFixed(1)}% (CI ${ci.low}-${ci.high})`);
  } else if (m3 >= 0.3) {
    await sendSlackWarning(`🟡 EXP-2 경계 — Seg B M3=${(m3*100).toFixed(1)}% / 권고: 소규모 CR (F4 카피 + F5 강화)`);
  } else {
    // ⚠️ Critical — CR Tier 2 자동 트리거
    await sendSlackCritical(`🔴 EXP-2 실패 — Seg B M3=${(m3*100).toFixed(1)}% / Plan B 발동 권고`);
    await triggerPlanBCRTier2({
      m3Result: m3,
      cohortSize: segBCohort.length,
      affectedPages: 8,
      autoNotifyCTO: true,
      ckmId: `CR-${date()}-R6-PlanB`
    });
  }
  
  return Response.json({ status: 'ok', m3, n: segBCohort.length });
}
```

### CR Tier 2 자동 트리거 흐름

```
[EXP-2 자동 평가] M3 < 30%
   ↓
[자동 트리거]
   ├─ CR-YYYY-NNN-R6-PlanB 자동 생성
   ├─ Slack Critical → CTO + PM 알림
   ├─ 8 영향 페이지 (RTM 기반) 자동 추출
   └─ Quality Gate 5 체크리스트 사전 알림
        ↓
[수동 결정 (CR Tier 2 7단계)]
   ├─ [1] 영향 분석 검토
   ├─ [2] 2 리뷰어 (PM + CTO)
   ├─ [3] 승인 → SRS V07 minor
   ├─ [4] 머지 (8 페이지 일괄 갱신)
   ├─ [5] Readiness Gate 재실행
   └─ [6] Plan B 발효
        ↓
[영향 페이지 자동 갱신 (Plan B 머지 후)]
   - MVP-feature-spec § 21 Epic → 20 Epic (F4-Plus 통합)
   - RTM 5축 갱신
   - task-breakdown-overview § 88→89 Task
   - SRS V06 → V07 (REQ-FUNC-NEW-PB-1 추가)
   ...
```

### 영향 페이지 자동 갱신 매트릭스 (Plan B 머지 시)

| 페이지 | 자동 갱신 영역 |
|---|---|
| [[product/concepts/MVP-feature-spec]] | F4 + F18 → F4-Plus 통합 + 21 → 20 Epic |
| [[product/concepts/requirements-traceability-matrix]] | 5축 갱신 |
| [[product/concepts/task-breakdown-overview]] | 88 → 89 Task + F4-Plus 매핑 |
| [[product/sources/65-SRS-V06-Final]] | REQ-FUNC-NEW-PB-1 + AC 추가 |
| [[product/sources/52-PRD-V09-Quality-Improvement]] | §7.2 R6 → "Plan B 발동" 표시 |
| [[product/concepts/customer-segmentation]] | Seg B F4-Plus 매핑 강화 |
| [[product/entities/persona-박민정]] | F4-Plus 직접 타깃 + Premium 50K |
| [[product/concepts/architecture-decisions]] | 영향 없음 (기존 7~12 ADR 정합) |

→ **EXP-2 종료 시점에 Plan B 발동 시 8 페이지 일괄 갱신 자동화** = CR Tier 2 처리의 표준 사이클.

### 표본 부족 처리

```
Day 28 (4주):  코호트 < 100 → 일반 Slack Info (계속 누적)
Day 56 (8주):  코호트 100-200 → 일일 추세 모니터링만 (변경 결정 미루기)
Day 84 (12주): 코호트 200+ → 자동 평가 시작
Day 120 (17주): 코호트 < 200 지속 → ⚠️ Phase 1 활성도 부족 = 별도 영업 결정 필요
```

### Phase 별 체크포인트 (F-2/F-1과 통합)

| 시점 | 검증 항목 |
|---|---|
| **Phase 1 Day 28** | EXP-2 자동 평가 시작 + Seg B 코호트 추적 시작 |
| **Phase 1 Day 56** | EXP-2 종료 + 4 시나리오 자동 분류 |
| **Phase 1 Day 84** | (Plan B 발동 시) Plan B 머지 완료 + Readiness Gate 재실행 |
| **Phase 1 Day 120+** | Plan B 효과 검증 (Plan C 트리거 검토) |

### Plan C 자동 트리거 (이중 안전망)

```
Plan B 발동 후 Day 30 (Phase 1 Day 84)
   ↓
[Plan B 효과 측정]
   M3 측정 (Plan B F4-Plus 시점)
        ↓
[자동 분류]
   ├─ M3 ≥ 40% → ✅ Plan B 성공
   ├─ M3 30~40% → 🟡 Plan B 부분 효과 (운영 안정화)
   └─ M3 < 30% → 🔴 Plan C 트리거 (Tier 3, VPS 재검토)
        ↓
[Plan C Tier 3 자동 트리거]
   - Slack Critical + CEO 알림 (Tier 3 책임)
   - 멀티 LLM 사이클 시작 (multi-llm-workflow)
   - VPS 단계 재검토 (Seg B 디스코프 / B2C → B2B 가속 / 신규 페르소나)
```

### 영향 페이지 (4개)

| 페이지 | 영향 |
|---|---|
| [[product/concepts/R6-Seg-B-Plan-B]] | 본 페이지 — EXP-2 자동 평가 명세 추가 |
| [[product/concepts/change-management-process]] § Tier 2 | Plan B = CR Tier 2 자동 트리거 사례 |
| [[product/concepts/HITL-operations-policy]] § 2 | system_config phase_1_start_day 보강 |
| [[product/concepts/open-issues-dashboard]] § F-3 | ✅ 자동 평가 메커니즘 설계 완료 표시 |

→ **F-3 ✅ 자동 평가 메커니즘 설계 완료** (실 트리거는 Phase 1 진입 후 Day 56).

## 보강 — Plan B의 Plan C (이중 안전망)

만약 Plan B 발동 후에도 Seg B M3 < 30% 지속 시:

| Plan C 시나리오 | 액션 |
|---|---|
| **Seg B 자체 디스코프** | Seg B 직접 타깃 포기. Premium 50K = Seg A·C 고관여층 차별화로 재정의. F11 부모 음성 + F6 HITL 코멘트 강화 |
| **B2C → B2B 가속** | Phase 1 (리텐션) 단축 + Phase 2 (B2B) 조기 진입. Seg D-1 오한솔 직접 영업 강화 |
| **타겟 페르소나 추가** | Seg B Pain 보완형 신규 페르소나 발굴 (예: 의료 전문직 부모 세그먼트 후속 연구) |

→ Plan C는 Tier 3 (Strategic) — VPS 단계 재검토 + 멀티 LLM 사이클 필요. **본 페이지는 Plan B까지만 명문화. Plan C는 발동 시 별도 작업**.

## 출처

- raw/53_PRD_V09_Final_Readiness_Gate.md § 5-7 감점 사유 (0.5점)
- [[product/sources/52-PRD-V09-Quality-Improvement]] § 7.2 R6 + § 9.0-b H-B JTBD ⚠️ 부분 검증
- [[product/sources/22-23-JTBD-Interview-Results]] § Seg B 표본 부족
- [[product/sources/PRD-Intermediate-Reviews-Meta]] § 4 raw 51 18 Findings § F-08 Lock-in KPI

## 관련 product 페이지

- [[product/concepts/change-management-process]] — CR Tier 2 처리 흐름 적용 사례
- [[product/concepts/MVP-feature-spec]] § F4 + F18 + Lock-in #1
- [[product/concepts/requirements-traceability-matrix]] — 영향 분석 도구
- [[product/entities/persona-박민정]] — Seg B 직접 타깃
- [[product/concepts/architecture-decisions]] § ADR-12 (변경 관리 3-Tier 적용)

## Clinical 정합

- F4-Plus.2 예측 시뮬레이션 = REVT/U-TAP/PRES 등가 연령 예측의 디지털 변형 ([[clinical/entities/REVT]] § 등가 연령 산출). ADR-04 의료 용어 배제로 "예상 점수"로 표현.
- 본 Plan B 발동 시 임상 자문 1회 — Premium 50K 차별화 가치 (전문가 코멘트 F6 + 시계열 F4-Plus 통합)에 대한 임상 효과 의견 청취.

## 보강 필요

- EXP-2 종료 시점 정확히 정의 (Phase 1 진입 후 4주 / 8주 / 12주 어느 시점?).
- Seg B 코호트 분리 추적 자동화 (Amplitude 통합) — TEST-NEW-F18-1 부분 흡수.
- F4-Plus 화면 UI 설계 (현 F4 + F18 분리 와이어프레임 → 통합 단일 화면).
- Premium 50K 차별화 비즈니스 가치 정량화 (Plan B 발동 시 Premium 가입 가설 ROI).
- Plan C 시나리오 별도 페이지 (Tier 3 발동 시).

---

✅ **raw 53 감점 5-7 후속 처리 완료**. raw 53 38 항목 점수표 모든 영역 ✅ 해소:
- 3-5 (Epic SP 분해) ✅ SRS V06 + 88 Task 분해로 해소 (97% → 사실상 99%)
- **5-7 (Seg B Plan B Epic 변경안)** ✅ 본 페이지로 명문화 (97% → 100% 가능)
