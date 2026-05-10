---
type: concept
pillar: product
category: synthesis
aliases: [expertId 다양성 모니터링, expert pool 편향, Top-3 비율, Gini 계수, HITL 임상 객관성]
tags: [HITL, expertId, 다양성, Gini, Top-3, HHI, Entropy, 모델편향, 임상객관성, MON, 클러스터통합]
---

# expertId 다양성 모니터링 — 알고리즘 + 운영 임계

[[product/concepts/HITL-retraining-pipeline]] § 윤리·법적 § "expertId 다양성 모니터링" 후속 정본. **동일 expertId가 model_retraining_data 50%+ 차지 시 발생하는 모델 편향 + 임상 객관성 침해 ([[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 윤리) 자동 감지 알고리즘**.

> 보강 필요 항목: "expertId 다양성 모니터링 알고리즘 (Gini 계수 또는 Top-3 비율) 결정" — **본 페이지가 그 결정 정본**.

## 문제 정의

### 시나리오

```
HITL 큐 등록 후 → 전문가 검토 → groundTruthScore INSERT
└─ 만약 동일 expertId가 50%+ 보정 시:
   1. ML 편향: 그 한 명의 보정 패턴이 모델 학습 50%+ 영향
   2. 임상 객관성 침해: 1급/2급 자격제도가 다양한 의견을 보장하기 위한 것 무력화
   3. 윤리 위반: 동일 부모-자녀에 대한 동일 전문가 반복 검토 (개인 편견)
   4. 책임 분산 실패: 1건 오진 발생 시 단일 expert 책임 → 법적 리스크
```

→ **REQ-FUNC-034 어뷰징 방어** (월 3회+ 동일 expertId 동일 부모) 와는 다른 차원의 **시스템 전체 다양성 문제**.

## 알고리즘 비교 — 5 후보

### 1. Top-K 비율 (Top Concentration Ratio)

**정의**: Top K명의 expertId가 전체 보정 데이터의 N% 차지

```python
top_3_ratio = sum(top_3_experts_count) / total_count
# 예: Top-3 expertId = 90/300건 = 30% (양호)
#     Top-3 expertId = 200/300건 = 67% (편향 ⚠️)
```

**장점**:
- ✅ 직관적 (산업·금융 표준 — 시장 집중도)
- ✅ 운영자 즉각 이해 가능 ("Top-3가 67% 차지 → 다양성 부족")
- ✅ K 값 조정으로 expert 풀 규모에 적응 (10명 풀 → K=3, 50명 풀 → K=10)

**단점**:
- ❌ K 외 분포 무시 (4번째~10번째 의자 동일 가정)
- ❌ K 임계 결정에 자의성

### 2. Gini 계수 (Inequality Index)

**정의**: 0=완전 평등, 1=완전 불평등

```python
def gini(counts):
    n = len(counts)
    s = sum(counts)
    return (n + 1 - 2 * sum((n + 1 - i) * c for i, c in enumerate(sorted(counts))) / s) / n
# 예: 모든 expert 동일 검토 → 0
#     1명 expert 100% → 1
#     실무 양호 → 0.3-0.5
#     실무 편향 → 0.6+
```

**장점**:
- ✅ 전체 분포 고려 (수학적 엄밀)
- ✅ 단일 수치로 표현 (시계열 추적 가능)
- ✅ 학술 근거 풍부

**단점**:
- ❌ 비전문가 운영자에게 직관 부족 ("0.5가 양호한가?")
- ❌ Phase 1 초기 expert 풀 5-10명 = 통계적으로 작은 표본 → Gini 변동성 큼

### 3. Shannon Entropy (Information Entropy)

**정의**: 분포의 불확실성 = log scale, 0=결정론적 (1명 100%), max=균등

```python
def shannon_entropy(counts):
    total = sum(counts)
    return -sum((c/total) * math.log2(c/total) for c in counts if c > 0)
# 예: 5명 expert 동일 (각 20%) → log2(5) = 2.32 (max)
#     1명 100% → 0
#     실무 양호 (5명 풀) → 1.8+
```

**장점**:
- ✅ 정보이론 기반
- ✅ K 결정 불필요

**단점**:
- ❌ log scale = 운영자 직관 부족
- ❌ expert 풀 크기에 따른 max 변동 (해석 어려움)

### 4. Herfindahl-Hirschman Index (HHI)

**정의**: 시장 집중도 표준. ∑(점유율²) × 10000

```python
def hhi(counts):
    total = sum(counts)
    return sum((c/total)**2 * 10000 for c in counts)
# 예: 5명 expert 균등 (각 20%) → 5 × 400 = 2000
#     1명 50%, 5명 10% → 2500 + 5×100 = 3000
#     1명 80%, 4명 5% → 6400 + 4×25 = 6500 (편향)
# 산업 표준: <1500 비집중 / 1500-2500 보통 / >2500 집중
```

**장점**:
- ✅ 산업 표준 (반독점법 + M&A 심사)
- ✅ 임계값 산업 합의 (1500/2500)
- ✅ 모든 expert 분포 반영 (Gini와 동등)

**단점**:
- ❌ 운영자에게 "산업 집중도" 개념 친숙 필요
- ❌ 5-10명 expert 풀에서는 본질적으로 HHI 높음 (시장 5명 = HHI 2000+ 자연스러움)

### 5. 단순 Threshold (Maximum Single Share)

**정의**: 가장 빈도 높은 expertId가 N% 초과 시 Alert

```python
max_share = max(counts) / sum(counts)
# 예: 5명 expert, 각 60건/40건/30건/30건/30건 → max=60/190=32% (양호)
#     5명 expert, 200건/30건/30건/20건/20건 → max=200/300=67% (Critical ⚠️)
```

**장점**:
- ✅ 가장 직관적 + 운영자 즉각 이해
- ✅ Phase 1 초기 expert 풀 작을 때 적합
- ✅ Slack Alert 카피 간단 ("expertId X가 67% 차지 — 경고")

**단점**:
- ❌ 2위 이하 분포 무시
- ❌ Top-2가 합쳐 80% 같은 패턴 못 잡음

## ⭐ 권장 — 이중 모니터링: Top-3 + 단순 Threshold

### Phase 1 (expert 풀 5-10명)

**1차 (즉각 알림)**: **단순 Threshold (Maximum Single Share)**
- 임계: max_share **> 50%** Warning / **> 70%** Critical
- 이유: 작은 expert 풀에서 가장 직관적 + 운영자 즉각 이해

**2차 (월간 트렌드)**: **Top-3 비율**
- 임계: Top-3 비율 **> 80%** Warning / **> 90%** Critical
- 이유: 5-10명 풀에서 Top-3 비율은 자연스럽게 50-70% — 80%+가 진정한 경고 신호

### Phase 2+ (expert 풀 20명+)

**1차**: **HHI** (산업 표준)
- 임계: HHI **> 2500** Warning / **> 4000** Critical
- 이유: 큰 expert 풀에서는 산업 표준 적용 가능

**2차 (학술 추적)**: **Gini 계수** (시계열 보강)
- 임계: Gini **> 0.5** Warning / **> 0.7** Critical
- 이유: 시계열 변동 추적 + 경영진 보고용

### 결정 사유

| 알고리즘 | Phase 1 권장 | Phase 2 권장 | 이유 |
|---|---|---|---|
| **Top-K 비율** | ⭐ 보조 (Top-3) | ⭐ 보조 | 직관성 + 운영자 친숙 |
| **Gini** | ❌ (작은 표본 변동성) | ⭐ 보조 (시계열) | Phase 2 큰 풀에서 학술 가치 |
| **Shannon Entropy** | ❌ | ❌ | log scale = 직관 부족 |
| **HHI** | ❌ (작은 풀에서 자연 높음) | ⭐ **1차** | Phase 2 산업 표준 적용 |
| **단순 Threshold** | ⭐ **1차** (즉각) | ❌ | Phase 1 가장 직관적 |

## 운영 임계 매트릭스 (전체)

| 영역 | 알고리즘 | Warning | Critical | Alert 채널 | 액션 |
|---|---|---|---|---|---|
| **Phase 1 1차** | Maximum Single Share | > 50% | > 70% | Slack `#ml-alerts` | Warning: 일일 모니터링 강화 / Critical: 해당 expert 일시 큐 우선순위↓ + 다른 expert 우선 배정 |
| **Phase 1 2차** | Top-3 비율 | > 80% | > 90% | Slack `#ml-alerts` 월간 | Critical: expert 풀 확대 영업 + CTO 검토 |
| **Phase 2 1차** | HHI | > 2500 | > 4000 | Slack 일일 + 경영 리뷰 | Critical: 시스템적 expert 풀 다각화 정책 |
| **Phase 2 2차** | Gini | > 0.5 | > 0.7 | Grafana 대시보드 시계열 | 분기별 임상 자문 회의 안건 |

## 자동화 흐름 — Vercel Cron 통합

```typescript
// /api/cron/expert-diversity-monitor.ts
// vercel.json: { "schedule": "0 3 * * *" }  // 매일 03:00 KST

export async function GET() {
  const last30Days = await db.model_retraining_data.findMany({
    where: { createdAt: { gte: subDays(new Date(), 30) } },
    select: { expertId: true }
  });
  
  const counts = countBy(last30Days, 'expertId');
  const total = last30Days.length;
  const phase = await getCurrentPhase();
  
  if (phase === 'PHASE_1') {
    // Phase 1: 단순 Threshold + Top-3
    const maxShare = max(values(counts)) / total;
    const top3Ratio = sum(take(orderBy(values(counts), 'desc'), 3)) / total;
    
    if (maxShare > 0.7) {
      await sendSlackCritical(`🔴 expertId 다양성 Critical — 단일 expert ${(maxShare*100).toFixed(1)}% 차지`);
      await pushUserAssignmentDeprioritize(getMaxExpertId(counts));
    } else if (maxShare > 0.5) {
      await sendSlackWarning(`🟡 expertId 다양성 Warning — 단일 expert ${(maxShare*100).toFixed(1)}% 차지`);
    }
    
    if (top3Ratio > 0.9) {
      await sendSlackCritical(`🔴 Top-3 expertId ${(top3Ratio*100).toFixed(1)}% 집중 — expert 풀 확대 필요`);
      await notifyCTO('expert_pool_expansion_needed');
    }
  } else if (phase === 'PHASE_2') {
    // Phase 2: HHI + Gini
    const hhiValue = hhi(values(counts));
    const giniValue = gini(values(counts));
    
    if (hhiValue > 4000) {
      await sendSlackCritical(`🔴 HHI ${hhiValue.toFixed(0)} — 시장 과집중 (Critical)`);
    } else if (hhiValue > 2500) {
      await sendSlackWarning(`🟡 HHI ${hhiValue.toFixed(0)} — 집중 우려`);
    }
    
    await pushGrafanaMetric('hitl.expert.gini', giniValue);
    await pushGrafanaMetric('hitl.expert.hhi', hhiValue);
    await pushGrafanaMetric('hitl.expert.top3', top3Ratio);
  }
  
  return Response.json({ phase, ...metrics });
}
```

## 88 → 89 Task 신규 (또는 MON-NEW-MR-1 통합 보강)

### 옵션 A: 별도 신규 task

| 신규 ID 후보 | 종류 | 명세 | SP |
|---|---|---|---|
| **MON-NEW-EXP-1** expertId 다양성 Cron | MON | Phase 1 단순 Threshold + Top-3 + Phase 2 HHI + Gini 자동 모니터링 + Slack/Grafana | 1.5 |

### 옵션 B: MON-NEW-MR-1 (HITL 재학습) 통합 ⭐ 권장

기존 [[product/concepts/HITL-retraining-pipeline]] § MON-NEW-MR-1 (ML Ops 대시보드, 2 SP) 에 expertId 다양성 모니터링 sub-feature 통합. **추가 0.5 SP** (총 2 → 2.5 SP).

→ 별도 task 생성보다 통합이 효율적. ML Ops 통합 대시보드의 자연스러운 확장.

## 다양성 위반 시 대응 시나리오

### Scenario 1: 단일 expert 67% 차지 (Critical)

```
[자동]
1. Slack `#ml-alerts` Critical Alert
2. 해당 expertId의 큐 우선순위↓ → 다른 expert 우선 배정
3. CTO 페이저 알림

[수동 (24h 내)]
1. CTO + ML Ops 회의: 사유 진단 (다른 expert 부재 vs 단일 expert 헌신적)
2. expert 풀 가용성 확인 (휴가·이탈 점검)
3. 임상 자문가 (외부) 임시 영입 검토
```

### Scenario 2: Top-3 비율 92% (Critical)

```
[자동]
1. Slack Critical Alert
2. CTO 알림 (expert 풀 확대 필요)

[수동 (1주 내)]
1. expert 풀 확대 영업 (1급/2급 자격자 ~17,000명 풀에서 모집)
2. Premium 50K 모델 전문가 코멘트 운영비 증액 검토
3. Phase 2 진입 가속 검토 (B2B 도입 = 추가 트래픽 = expert 풀 자동 다각화 유인)
```

### Scenario 3: 분기 Gini 0.7+ 지속

```
[수동 (분기별)]
1. 임상 자문 회의 안건 등록
2. expert 풀 다각화 정책 수립 (예: 자격 1급 N명 + 2급 M명 비율 강제)
3. CR Tier 2 처리 — REQ-FUNC-034 강화 가능성 (월 3회+ → 월 2회+ 등)
```

## ⭐ HHI/Gini 임계 실데이터 검증 계획 (F-1 후속, 47차 추가)

[[product/concepts/open-issues-dashboard]] § F-1 후속 처리. **Phase 2 1차 모니터링 = HHI (>2500 Warning, >4000 Critical) / 2차 = Gini (>0.5/>0.7)** 임계는 산업 표준 차용 — Phase 2 진입 1-2개월 후 실데이터 검증 필요.

### 측정 계획 (Phase 2 진입 후)

```
[Phase 2 진입]
   ↓
[Day 1-30]
   매일 measure_hhi_gini()
   ├─ DB query: model_retraining_data WHERE createdAt >= 30d
   ├─ HHI 계산 + Gini 계산 + Top-3 비율
   └─ Slack #ml-metrics 일일 보고
        ↓
[Day 30 종료]
   3 지표 분포 분석
   ├─ HHI 평균/중앙값/95%ile
   ├─ Gini 시계열 추세 (Grafana)
   ├─ 자연 발생 임계 vs 산업 표준 차이
   └─ 운영 안정도 평가 (false positive 빈도)
        ↓
[임계 재검증 결정]
   3 시나리오 (다음 표)
        ↓
[CR Tier 2 처리 (변경 시)]
   - system_config 갱신 (HHI/Gini 임계값)
   - audit_log INSERT
```

### 3 시나리오 — 분포별 임계 조정 (Phase 2 expert 풀 15-25명 가정)

| 시나리오 | 30일 평균 HHI | 의미 | 임계 조정 |
|---|---|---|---|
| **A 정상** | 1,500-2,500 | 산업 표준 적정 / 풀 다각화 양호 | **현 임계 유지** (HHI >2500 Warning / >4000 Critical / Gini >0.5/>0.7) |
| **B 자연 집중** | 3,000+ (false positive 빈발) | 풀 규모 vs 트래픽 불균형 / 산업 표준 너무 엄격 | **임계 완화**: HHI >3500 Warning / >5500 Critical / Gini >0.6/>0.8 |
| **C 과다 분산** | <1,000 | 풀 과다·트래픽 부족 / 임계 무의미 | **임계 강화 안 함, 풀 축소 검토**: 정규직 비율 ↓ + 운영비 절감 |

### Top-3 + HHI/Gini 통합 모니터링

```python
def measure_diversity_phase2(period_days=30):
    """Phase 2 통합 다양성 측정"""
    counts = db.model_retraining_data.count_by_expert(period_days)
    
    return {
        # 1차 (HHI - 산업 표준)
        'hhi': hhi(counts.values()),
        'hhi_warning': sum(counts.values() ** 2 / sum(counts.values()) ** 2 * 10000) > 2500,
        
        # 2차 (Gini - 학술)
        'gini': gini(counts.values()),
        'gini_warning': gini(counts.values()) > 0.5,
        
        # 3차 (Top-3 - Phase 1 호환)
        'top3_ratio': sum(sorted(counts.values(), reverse=True)[:3]) / sum(counts.values()),
        'top3_warning': top3 > 0.6,  # Phase 2에서는 0.6 (Phase 1보다 보수)
        
        # 통합 의사결정
        'all_clear': not (hhi_warning or gini_warning or top3_warning),
        'multi_alert': sum([hhi_warning, gini_warning, top3_warning]) >= 2,  # 2+ 알림 시 Critical
    }
```

→ **3 지표 동시 알림 시 Critical** (단일 지표 false positive 회피).

### 자동화 — Vercel Cron + Grafana

```typescript
// Phase 2 활성 시 일일 모니터링
// vercel.json: { "schedule": "0 3 * * *" }

export async function GET() {
  const phase = await getCurrentPhase();
  if (phase !== 'PHASE_2') {
    return Response.json({ status: 'skip', reason: 'phase_not_2' });
  }
  
  const metrics = await measureDiversityPhase2();
  
  // Grafana 시계열 메트릭 (Phase 2 한정)
  await pushGrafanaMetric('hitl.diversity.hhi', metrics.hhi);
  await pushGrafanaMetric('hitl.diversity.gini', metrics.gini);
  await pushGrafanaMetric('hitl.diversity.top3', metrics.top3_ratio);
  
  // Multi-alert 만 Slack Critical
  if (metrics.multi_alert) {
    await sendSlackCritical(`🔴 Multi-alert: HHI ${metrics.hhi} / Gini ${metrics.gini} / Top-3 ${metrics.top3_ratio}`);
    await notifyCTO('diversity_critical_multi', metrics);
  } else if (metrics.hhi_warning || metrics.gini_warning) {
    await sendSlackWarning(`🟡 단일 지표 경고: HHI ${metrics.hhi} / Gini ${metrics.gini}`);
  }
  
  return Response.json({ status: 'ok', ...metrics });
}
```

### Phase 별 체크포인트 (F-2와 통합)

| 시점 | 검증 항목 | CR Tier |
|---|---|---|
| **Phase 2 Day 30** | HHI/Gini 첫 분포 분석 + 시나리오 A/B/C 분류 | Tier 1-2 |
| **Phase 2 Day 60** | F-2 (재학습 임계) + F-1 (다양성 임계) 통합 검증 | Tier 1-2 |
| **Phase 2 Day 90** | 분기 임상 자문 회의 + cross-tab Gini (E-1) 통합 | Tier 2 |
| **Phase 2 Day 180** | 6개월 정기 재검증 + ADR-15·16 정식 등록 | Tier 2-3 |
| **분기별 (Phase 2+)** | 정기 임계 유지·조정 검토 | Tier 1 |

### Phase 1 → Phase 2 전환 임계 자동 전환

```
Phase 1 활성: 단순 Threshold + Top-3 모니터링
   ↓
[Phase 변경 트리거: B2B PoC 5건 + M3 ≥40% + expert 풀 15명+]
   ↓
Phase 2 활성: HHI + Gini + Top-3 (3 지표) 통합 모니터링
   ├─ system_config: monitoring_algorithm = 'phase2_combined'
   ├─ Grafana 대시보드 활성화
   └─ Vercel Cron 일일 → 매일 03:00 KST
```

→ system_config (ADR-13) 동적 변경으로 Phase 전환 시점 즉시 적용.

### 영향 페이지

| 페이지 | 영향 |
|---|---|
| [[product/concepts/expert-diversity-monitoring]] | 본 페이지 — 임계 변동 시 § Phase 2 권장 임계 갱신 |
| [[product/concepts/HITL-operations-policy]] § 2 | system_config HHI/Gini 임계값 갱신 |
| [[product/concepts/HITL-retraining-pipeline]] § 임계 검증 (F-2) | 통합 검증 (Day 60) |
| [[product/concepts/architecture-decisions]] § ADR-15 IRB 자문위원회 | 임계 변경 시 분기 자문 안건 |
| [[product/concepts/open-issues-dashboard]] § F-1 | ✅ 검증 계획 수립 완료 표시 |

→ **F-1 ✅ 검증 계획 수립 완료** (실 측정·결정은 Phase 2 진입 후).

## ⭐ Phase 2+ 보강 — expertId × 평가 도구 교차 모니터링 (ADR-16 후보)

[[product/concepts/HITL-retraining-pipeline]] § 윤리·법적 § "expert × 도구 편향" 후속. 단일 expert의 도구별 분포 모니터링.

### 문제 시나리오

```
expert E1: U-TAP 보정 50건 + REVT 50건 + PRES 50건 (총 150건, 균등)
  → 좋음. 다양한 도구에 일관된 보정 철학.

expert E1: U-TAP 150건만 (REVT/PRES 0건)
  → ⚠️ E1의 임상 철학이 articulation 영역 모델에만 학습 = 도구 간 편향.

expert E1: U-TAP 100건 / E2: REVT 100건 / E3: PRES 100건
  → ⚠️ 더 큰 문제. 도구별로 단일 expert에 의존 = 도구 간 모델 격차 발생.
```

→ **핵심 위험**: 단일 expert의 도구 편식 + 도구별 단일 expert 의존 둘 다 모델 편향.

### 데이터 구조 보강 (model_retraining_data 확장)

```sql
-- HITL-retraining-pipeline § DB-NEW-MR-1 보강
ALTER TABLE model_retraining_data
ADD COLUMN evaluation_tool VARCHAR(20),  -- 'utap_articulation' | 'revt_vocabulary' | 'pres_receptive' | 'pres_expressive' | 'koplac_pragmatic' | ...
ADD COLUMN target_score_axis VARCHAR(20); -- 'articulation' | 'linguistic' | 'acoustic'

CREATE INDEX idx_mrd_tool ON model_retraining_data(evaluation_tool, expertId, createdAt);
```

### 알고리즘 — Cross-tab Gini

```python
def expert_tool_cross_gini(data, period_days=30):
    """
    expertId × evaluation_tool 매트릭스 → 행별 Gini 계산 → 평균
    Returns: 0=완전 다각화 / 1=완전 편향
    """
    # 1. expertId × tool 매트릭스 구성
    matrix = data.groupby(['expertId', 'evaluation_tool']).size().unstack(fill_value=0)
    
    # 2. 행별 Gini (각 expert의 도구 분포 불평등도)
    expert_ginis = matrix.apply(lambda row: gini(row.values), axis=1)
    
    # 3. 열별 Gini (각 도구의 expert 분포 불평등도)
    tool_ginis = matrix.apply(lambda col: gini(col.values), axis=0)
    
    # 4. 통합 점수 (expert 편향 × 도구 편향)
    return {
        'expert_gini_mean': expert_ginis.mean(),       # 단일 expert가 도구를 골고루 다루는가?
        'tool_gini_mean': tool_ginis.mean(),           # 단일 도구가 expert를 골고루 받는가?
        'combined_score': expert_ginis.mean() * tool_ginis.mean()
    }
```

### 임계 매트릭스

| 지표 | Warning | Critical | 의미 |
|---|---|---|---|
| **expert_gini_mean** | > 0.5 | > 0.7 | 단일 expert가 특정 도구만 보정 |
| **tool_gini_mean** | > 0.5 | > 0.7 | 단일 도구가 특정 expert에만 의존 |
| **combined_score** | > 0.25 | > 0.49 | 두 위험 동시 발생 (가장 위험) |

→ **combined_score = 0.49 (≈ 0.7 × 0.7) 초과** 시 시스템 전체 모델 편향 우려 → CTO Critical 알림.

### 위반 시 대응

| 시나리오 | 대응 |
|---|---|
| **expert_gini > 0.7** (단일 expert 도구 편식) | 해당 expert 큐 분배 시 다양한 도구 자동 할당 (기존 도구 비율 균등화) |
| **tool_gini > 0.7** (특정 도구 단일 의존) | 해당 도구 전문 expert 풀 확대 영업 (특정 도구 지식 우선) |
| **combined > 0.49** | 시스템 전체 다양성 작전 (CTO 결정) — Premium 50K 운영비 증액 검토 |

### 임상 자문 회의 안건

분기별 임상 자문 회의 ([[product/concepts/HITL-operations-policy]] § IRB 자문위원회와 통합) 시 cross-tab 매트릭스 검토:
- expertId별 도구 균등도
- 도구별 expert 다양도
- 분기 추세 (악화 vs 개선)

### 88 → 89 Task 보강 후보

- **MON-NEW-EXP-2** Cross-tab Gini 모니터링 (1.5 SP) — Phase 2 활성화 시 신규 task
  - DB query: expertId × evaluation_tool 매트릭스 추출
  - Gini 계산 (Python or SQL)
  - 임계 위반 시 Slack Alert

→ 누적 보강 후보 통계: F9.4 (5/7) + Phase 1 (15/21) + HITL 재학습 (3/5.5) + F10 (3/3) + Plan B (1/1) + system_config (1/1) + cross-tab (1/1.5) = **29 신규 task / 40 SP / 88 → 117 Task**.

### ADR-16 정식 등록 시점

- **현재**: 알고리즘 설계 완료. ADR 후보 유지.
- **Phase 2 진입 시**: model_retraining_data 누적 데이터 분석 후 임계값 실데이터 검증 → ADR-16 정식 등록 (Phase 2 후반 권장).
- **트리거**: tool_gini > 0.5 첫 발생 시 + expert 풀 15명+ 도달 시.

## 임상 정합

| 매핑 | 의미 |
|---|---|
| **1급/2급 자격제도** ([[clinical/concepts/한국-언어치료-트랙비교]]) | 전문가 자격 다양성 = 임상 객관성 보장. expertId 다양성 모니터링이 그 디지털 운영 메커니즘 |
| **임상 자문 회의 분기별 안건** | Gini 0.7+ 지속 시 분기 임상 자문가 회의에 안건 등록 |
| **U-TAP/REVT/PRES 다양한 임상 척도** | 동일 expert가 모든 평가 도구 보정 = 도구 간 편향 발생 가능. expertId × 평가 도구 교차 모니터링 후속 보강 후보 |

## 보강 필요

- ✅ expert 풀 자체 정량화 — [[product/concepts/HITL-operations-policy]] § 1 (Phase 0: 3-5명 / Phase 1: 5-10명 / Phase 2: 15-25명 + 자격 비율 + 운영비).
- ✅ `getCurrentPhase()` 정의 — [[product/concepts/HITL-operations-policy]] § 2 (env + DB 하이브리드 + system_config 테이블 + RACI Phase 변경 권한).
- Grafana 대시보드 (Phase 2 진입 시) - Vercel Analytics만으로 시계열 추적 가능 여부 검증.
- expertId × 평가 도구 (U-TAP/REVT/PRES) 교차 모니터링 알고리즘 (보강 후보).
- 임상 자문 회의 운영 가이드라인 (분기별 Gini 검토 + expert 풀 정책 결정 권한).

## 출처

- [[product/concepts/HITL-retraining-pipeline]] § 윤리·법적 § "expertId 다양성 모니터링 (Gini 또는 Top-3 비율)"
- [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격제도 (~17,000명 풀)
- [[product/sources/52-PRD-V09-Quality-Improvement]] § REQ-FUNC-034 (어뷰징 방어 — 다른 차원)

## 관련 product 페이지

- [[product/concepts/HITL-system-flow]] § 어뷰징 방어 (REQ-FUNC-034 = 동일 부모 반복 / 본 페이지 = 시스템 전체 다양성)
- [[product/concepts/HITL-retraining-pipeline]] § MON-NEW-MR-1 (옵션 B 통합 권장)
- [[product/concepts/architecture-decisions]] § ADR-11 (HITL 재학습 책임 분리)
- [[product/concepts/change-management-process]] § Tier 2 (Gini 임계 변경 시)

## Clinical 정합

- [[clinical/concepts/한국-언어치료-트랙비교]] § 1급(~7,000명)/2급(~10,000명) 자격제도. expertId 다양성 = 자격 등급별 비율 다각화로 임상 객관성 보장.
- [[clinical/concepts/아동언어치료-핵심기법]] § 4기법 (평행 발화·확장·기다리기·반응적 상호작용). 단일 expert가 4기법 모두 보정 = 한 명의 임상 철학 학습. 다양성 = 4기법 균형 학습.

---

✅ HITL-retraining-pipeline § 보강 필요 항목 1건 해소 (expertId 다양성 알고리즘 결정).
