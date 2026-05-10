---
type: concept
pillar: product
category: synthesis
aliases: [HITL 루프백 재학습, model_retraining_data 스키마, ML Ops 가이드, REQ-FUNC-HITL-004]
tags: [HITL, MLOps, 재학습, model_retraining_data, REQ-FUNC-HITL-004, 0.5%500건0.3%게이트, DB-NEW, 클러스터통합]
---

# HITL 루프백 재학습 파이프라인 — 스키마 + 운영 가이드

[[product/concepts/HITL-system-flow]] § 4번째 원칙 "루프백 재학습" + REQ-FUNC-HITL-004의 시스템 정본. 본 페이지는 (1) `model_retraining_data` 테이블 스키마 (2) 0.5% / 500건 / 0.3% **3단계 게이트 운영 책임** (3) ML Ops 자동화 흐름 (4) DB-NEW task 분해 제안.

> 본 페이지는 **88 Task 미정규화** 영역의 시스템 정본 ([[product/concepts/requirements-traceability-matrix]] § 보강 필요).

## 핵심 가치 명제

| 항목 | 값 |
|---|---|
| **트리거** | 전문가가 AI 결과 보정 → 보정 레이블이 ground truth |
| **목표 임계 1** | AI 치명적 오진율 **<0.3%** (재배포 기준) |
| **롤백 임계** | 오진율 **0.5% 초과** → 서빙 즉시 롤백 |
| **재학습 데이터 임계** | 보정 데이터 **500건 이상** → 파인튜닝 재개 |
| **운영 주기** | 월간 모니터링 (REQ-NF-022 LTV:CAC 주간 리뷰와 통합 가능) |

→ V09 Quality §3 § HITL 안전 프로토콜 4번째 원칙의 시스템 정본.

## DB 스키마 — `model_retraining_data` 테이블

### 신규 task 후보: **DB-NEW-MR-1**

```sql
CREATE TABLE model_retraining_data (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 원본 추적
  sessionId       UUID NOT NULL REFERENCES session_logs(session_id),
  evaluationId    UUID NOT NULL REFERENCES evaluation_results(result_id),
  hitlQueueId     UUID NOT NULL REFERENCES hitl_queue(queue_id),
  
  -- AI 1차 결과
  aiArticulation  FLOAT NOT NULL,
  aiLinguistic    FLOAT NOT NULL,
  aiAcoustic      FLOAT NOT NULL,
  aiConfidence    FLOAT NOT NULL,
  
  -- 전문가 보정 (Ground Truth)
  expertId        UUID NOT NULL,
  gtArticulation  FLOAT NOT NULL,
  gtLinguistic    FLOAT NOT NULL,
  gtAcoustic      FLOAT NOT NULL,
  
  -- 차이값 (자동 계산)
  diffArticulation FLOAT GENERATED ALWAYS AS (gtArticulation - aiArticulation) STORED,
  diffLinguistic   FLOAT GENERATED ALWAYS AS (gtLinguistic - aiLinguistic) STORED,
  diffAcoustic     FLOAT GENERATED ALWAYS AS (gtAcoustic - aiAcoustic) STORED,
  isCriticalError  BOOLEAN GENERATED ALWAYS AS (
    abs(gtArticulation - aiArticulation) > 20 OR
    abs(gtLinguistic - aiLinguistic) > 20 OR
    abs(gtAcoustic - aiAcoustic) > 20
  ) STORED,
  
  -- 메타
  audioVectorUri  TEXT,                      -- 7일 폐기 후 NULL (ADR-03)
  childAgeMonths  INT,
  targetSound     VARCHAR(20),
  
  -- 감사 추적
  createdAt       TIMESTAMP DEFAULT NOW(),
  retrainingBatchId UUID,                    -- 재학습 배치에 포함되면 NOT NULL
  retrainedAt     TIMESTAMP                  -- 파인튜닝 데이터로 사용된 시점
);

-- 인덱스
CREATE INDEX idx_mrd_critical ON model_retraining_data(isCriticalError, createdAt) WHERE isCriticalError = true;
CREATE INDEX idx_mrd_batch ON model_retraining_data(retrainingBatchId) WHERE retrainingBatchId IS NOT NULL;
CREATE INDEX idx_mrd_unbatched ON model_retraining_data(retrainingBatchId, createdAt) WHERE retrainingBatchId IS NULL;

-- 자동 INSERT 트리거 (HITL-system-flow PostgreSQL 트리거 확장)
CREATE OR REPLACE FUNCTION sync_retraining_data()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.groundTruthScore IS NOT NULL THEN
    INSERT INTO model_retraining_data (
      sessionId, evaluationId, hitlQueueId,
      aiArticulation, aiLinguistic, aiAcoustic, aiConfidence,
      expertId, gtArticulation, gtLinguistic, gtAcoustic,
      audioVectorUri, childAgeMonths, targetSound
    )
    SELECT 
      NEW.sessionId, er.result_id, NEW.queueId,
      er.articulation_score, er.linguistic_score, er.acoustic_score, NEW.confidence,
      NEW.expertId,
      (NEW.groundTruthScore->>'articulation')::float,
      (NEW.groundTruthScore->>'linguistic')::float,
      (NEW.groundTruthScore->>'acoustic')::float,
      sl.audio_vector_uri, u.child_age_months, sl.target_sound
    FROM evaluation_results er
    JOIN session_logs sl ON er.session_id = sl.session_id
    JOIN users u ON sl.user_id = u.user_id
    WHERE er.session_id = NEW.sessionId;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_retraining_data
AFTER UPDATE OF status ON hitl_queue
FOR EACH ROW EXECUTE FUNCTION sync_retraining_data();
```

→ HITL-system-flow § PostgreSQL 트리거의 두번째 트리거. Studio UPDATE → evaluation_results sync (1차) + model_retraining_data INSERT (2차).

## 3단계 게이트 운영 흐름

```
[1] 일상 모니터링 (REQ-NF-022 + MON-003 통합)
    SELECT count(*) FILTER (WHERE isCriticalError = true) / count(*) AS error_rate
    FROM model_retraining_data
    WHERE createdAt >= NOW() - INTERVAL '30 days';
    
    ┌─ error_rate < 0.3%   ── 정상 운영 (모델 유지)
    │
    ├─ error_rate ≥ 0.3%, < 0.5%   ── 🟡 Warning (Slack #ml-alerts)
    │                                  배치 데이터 누적 가속화
    │
    └─ error_rate ≥ 0.5%   ── 🔴 즉시 롤백 (Vercel 환경 변수 모델 버전 다운)
                              + Slack Critical Alert (담당자 페이저)

[2] 재학습 트리거 (배치 ≥ 500건)
    SELECT count(*) FROM model_retraining_data WHERE retrainingBatchId IS NULL;
    
    ─ count ≥ 500   ── 🟢 파인튜닝 재개 가능 (운영 책임자 승인 후)
                       SQL: UPDATE model_retraining_data SET retrainingBatchId = uuid_generate_v4()
                       WHERE retrainingBatchId IS NULL ORDER BY createdAt LIMIT 500;
                       Vercel AI SDK 또는 Gemini fine-tuning API 호출

[3] 재배포 게이트 (오진율 ≤ 0.3% 검증)
    Hold-out 검증 셋 (별도 100건):
    
    ┌─ error_rate ≤ 0.3%   ── ✅ 재배포 (Vercel 환경 변수 신 모델 버전)
    │                          retrainingBatchId batch에 retrainedAt = NOW()
    │
    └─ error_rate > 0.3%   ── ❌ 재배포 거부 (이전 모델 유지)
                              + Slack Alert (재학습 데이터 추가 필요)
```

## 운영 책임 매트릭스 (RACI)

| 역할 | [1] 모니터링 | [2] 재학습 트리거 | [3] 재배포 결정 |
|---|---|---|---|
| **ML Ops 엔지니어** | R (실행) | R (실행) | R (Hold-out 검증) |
| **CTO / 기술 리드** | A (책임) | A (승인) | **A (승인)** ⭐ |
| **언어재활사 (HITL pool)** | C (자문) | C (보정 데이터 품질 자문) | C (재배포 후 검토) |
| **CEO** | I (보고) | I | **I (재배포 통보)** |
| **CS팀** | I | I | I |

→ R = Responsible / A = Accountable / C = Consulted / I = Informed.

## 신규 task 분해 제안 (3종)

| 신규 ID 후보 | 종류 | 명세 | SP |
|---|---|---|---|
| **DB-NEW-MR-1** `model_retraining_data` 테이블 | DB | 위 스키마 + 트리거 + 인덱스 3종 | 1.5 |
| **API-NEW-MR-1** `/api/admin/retraining-batch` | API | 관리자 전용 (Supabase Auth admin) — 배치 생성 + 재학습 트리거 + 재배포 게이트 | 2 |
| **MON-NEW-MR-1** ML Ops 대시보드 | MON | error_rate 30일 추세 + 미배치 데이터 카운트 + Slack Alert (>0.3% Warning / >0.5% Critical) | 2 |
| **합계** | — | **HITL 루프백 재학습 = 5.5 SP** | 5.5 |

→ 88 → 91 Task 보강 가능성. F9.4 (5) + Phase 1 (15) + 본 (3) = **23 신규 task / 33.5 SP / 88 → 111 Task**.

## REQ-FUNC 보강 후보

REQ-FUNC-HITL-004 (현 추상) → 구체화:

| 보강 ID 후보 | 명세 (Atomic G/W/T) |
|---|---|
| **REQ-FUNC-HITL-004a** | Given hitl_queue.status='completed' / When PostgreSQL 트리거 발화 / Then model_retraining_data INSERT + isCriticalError 자동 계산 |
| **REQ-FUNC-HITL-004b** | Given 30일 error_rate ≥ 0.5% / When 모니터링 Cron 발화 / Then Vercel 환경 변수 MODEL_VERSION 자동 다운그레이드 + Slack Critical |
| **REQ-FUNC-HITL-004c** | Given 미배치 데이터 ≥ 500건 / When 운영자 승인 / Then 배치 ID 할당 + Vercel AI SDK fine-tuning API 호출 |
| **REQ-FUNC-HITL-004d** | Given 재학습 완료 / When Hold-out 100건 검증 / Then error_rate ≤ 0.3% 시 자동 재배포 / 초과 시 거부 + Slack Alert |

→ HITL 4 원칙 → 7 원칙 (또는 1 원칙 4 sub-원칙) 가능성. SRS V07 후속 개정 시 REQ-FUNC-HITL-001~007로 확장.

## 비용·도구

| 도구 | 용도 | 한도·비용 |
|---|---|---|
| **Vercel Cron** | 일 1회 모니터링 | Free 1 cron (충분) |
| **Vercel AI SDK** | fine-tuning API 호출 | Gemini Pro 1.5 fine-tuning (예정 출시) |
| **Slack Webhook** | Warning/Critical Alert | Free 무제한 |
| **Supabase Studio** | 운영자 SQL 직접 실행 | Free |
| **PostgreSQL 트리거** | 자동 INSERT | Supabase Free |

→ 추가 운영비 **$0/월** (Phase 1 검증) → 재학습 활성화 시 Gemini fine-tuning API 비용 별도 (Vercel AI SDK 가격 정책 출시 후 명확화).

## ⚠️ 윤리·법적 고려사항

| 영역 | 고려 |
|---|---|
| **개인정보 (R4)** | audioVectorUri 7일 폐기 (ADR-03) → model_retraining_data에는 **익명화된 점수만** 보존. 음성 원본 영구 보관 금지. |
| **임상 객관성** | 동일 expertId 보정 데이터가 50%+ 차지 시 → 모델 편향 우려. expertId 다양성 모니터링 추가. |
| **재학습 데이터 동의** | 부모 동의서에 "익명화된 발달 데이터 임상 연구 활용 동의" 옵션 필수. (R4 + GDPR 정합) |
| **모델 버전 관리** | 재배포 후 7일간 이전 모델 병행 운영 (Canary 5% 트래픽). 회귀 발생 시 즉시 롤백 가능. |

## 자동화 흐름 — Vercel Cron 통합

```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/ml-ops-monitor",
    "schedule": "0 2 * * *"  // 매일 02:00 KST
  }]
}

// /api/cron/ml-ops-monitor.ts
export async function GET() {
  const errorRate = await calculateErrorRate30d();
  const unbatchedCount = await countUnbatched();
  
  if (errorRate >= 0.5) {
    await sendSlackCritical(`🔴 오진율 ${errorRate}% 초과. 모델 롤백 필요.`);
    await rollbackModelVersion();  // Vercel 환경 변수 다운그레이드
  } else if (errorRate >= 0.3) {
    await sendSlackWarning(`🟡 오진율 ${errorRate}% — 주의 임계. 데이터 누적 가속.`);
  }
  
  if (unbatchedCount >= 500) {
    await sendSlackInfo(`🟢 미배치 데이터 ${unbatchedCount}건 — 재학습 가능.`);
  }
  
  return Response.json({ errorRate, unbatchedCount, status: 'ok' });
}
```

## ⭐ 임계 실데이터 검증 계획 (F-2 후속, 45차 추가)

[[product/concepts/open-issues-dashboard]] § F-2 후속 처리. **0.5% / 500건 / 0.3% 임계는 가설** — Phase 1 진입 후 첫 30일 isCriticalError 비율 분포 측정 후 재검증.

### 측정 계획

```
[Phase 1 진입]
   ↓
[Day 1-30]
   매일 measure_critical_error_rate()
   ├─ DB query: model_retraining_data WHERE createdAt >= 30d AGO
   ├─ COUNT(*) FILTER (WHERE isCriticalError = true) / COUNT(*) AS rate
   └─ Slack #ml-metrics 일일 보고 (Phase 1 검증 모드)
        ↓
[Day 30 종료]
   isCriticalError 분포 분석
   ├─ 평균 / 중앙값 / 95%ile
   ├─ 일별 변동 추세
   ├─ 도구별 (cross-tab) 분포
   └─ expert별 (cross-tab) 분포
        ↓
[임계 재검증 결정]
   3 시나리오 (다음 표)
        ↓
[CR Tier 2 처리 (변경 시)]
   - system_config 갱신 (rollback_error_threshold + redeploy_error_threshold)
   - audit_log 변경 사유 INSERT
```

### 3 시나리오 — 분포별 임계 조정

| 시나리오 | 30일 평균 | 의미 | 임계 조정 |
|---|---|---|---|
| **A 정상** | 0.2-0.4% | 모델 정확도 양호 / 임계 적정 | **현 임계 유지** (롤백 0.5% / 재배포 0.3% / 누적 500건) |
| **B 모델 부정확** | 1%+ | 모델 자체 정확도 부족 / 임계 너무 엄격 | **임계 완화**: 롤백 1.5% / 재배포 1% / 누적 1,000건 (안정화 후 점진 강화) |
| **C 모델 우수** | <0.1% | 모델 정확도 우수 / 임계 관대 | **임계 강화**: 롤백 0.2% / 재배포 0.1% / 누적 300건 (품질 압박) |

→ system_config 동적 변경 (ADR-13)으로 즉시 적용 가능.

### 검증 신뢰도 보강

```python
# Day 30 시점 신뢰도 검증
def validate_threshold_reliability(period_days=30):
    samples = db.model_retraining_data.count(period_days)
    if samples < 200:
        # 표본 부족 → Phase 1 활성도 ↑ 시점까지 임계 결정 보류
        return {'status': 'insufficient_data', 'min_samples': 200}
    
    error_rates = []  # 도구별 / expert별 분포
    confidence_interval = bootstrap_ci(error_rates, n=1000)
    
    return {
        'mean': np.mean(error_rates),
        'median': np.median(error_rates),
        'p95': np.percentile(error_rates, 95),
        'ci_95': confidence_interval,
        'recommendation': suggest_threshold(error_rates)
    }
```

### 표본 부족 처리 (Phase 1 초반)

```
Day 1-15:  표본 < 100 → 임계 결정 보류 (현 가설 임계 유지)
Day 15-30: 표본 100-300 → 일일 추세 모니터링만 (변경 결정 미루기)
Day 30+:   표본 200+ → 임계 재검증 + CR Tier 2 처리 가능
Day 60+:   표본 500+ → 도구별 / expert별 cross-tab 임계 차등화 가능
Day 90+:   표본 1,000+ → 임계 운영 안정화 (분기별 재검증만)
```

### 자동화 — Vercel Cron 통합

```typescript
// /api/cron/threshold-validation.ts
// vercel.json: { "schedule": "0 4 * * 1" }  // 매주 월요일 04:00 KST

export async function GET() {
  const result = await validateThresholdReliability(30);
  
  if (result.status === 'insufficient_data') {
    await sendSlackInfo(`📊 표본 부족 (${result.samples}/200) — 임계 결정 보류`);
    return Response.json(result);
  }
  
  const currentThreshold = await getSystemConfig('rollback_error_threshold');
  const recommended = result.recommendation;
  
  if (Math.abs(recommended - currentThreshold) > 0.2) {  // 큰 차이
    await sendSlackWarning(`⚠️ 임계 재조정 권고 — 현 ${currentThreshold}% / 권고 ${recommended}%. CR Tier 2 처리 검토.`);
    await notifyCTO('threshold_adjustment_recommended', result);
  }
  
  return Response.json({ status: 'ok', ...result });
}
```

### Phase 별 검증 체크포인트

| 시점 | 검증 항목 | CR Tier |
|---|---|---|
| **Day 30** | 첫 임계 분포 분석 + 시나리오 A/B/C 분류 | Tier 1-2 |
| **Day 60** | 도구별 cross-tab 분포 추가 | Tier 1 |
| **Day 90** | 분기 임상 자문 회의 안건 (임계 정책 확정) | Tier 2 |
| **Phase 2 진입 직전** | 최종 임계 + cross-tab Gini 통합 | Tier 3 (시스템 영향) |
| **분기별 (Phase 2+)** | 정기 재검증 (운영 안정화) | Tier 1 |

### 영향 페이지

| 페이지 | 영향 |
|---|---|
| [[product/concepts/HITL-retraining-pipeline]] | 본 페이지 — 임계 변동 시 § 3 게이트 임계 갱신 |
| [[product/concepts/HITL-operations-policy]] § 2 | system_config 임계값 갱신 |
| [[product/concepts/architecture-decisions]] § ADR-11 | 자동 롤백·재배포 임계 변경 시 ADR-11 시스템 영향 갱신 |
| [[product/concepts/open-issues-dashboard]] § F-2 | ✅ 검증 계획 수립 완료 표시 |

→ **F-2 ✅ 검증 계획 수립 완료** (실 측정·결정은 Phase 1 진입 후).

## ADR 후보

- **ADR-XX HITL 재학습 책임 분리** — 자동 롤백 (시스템) vs 수동 재학습 트리거 (운영자 승인) 의사결정 분리. 자동 재학습 시 무한 루프 위험.

## RACI 검증 — 의사결정 권한

| 결정 | 자동 vs 수동 | 사유 |
|---|---|---|
| **롤백** (>0.5%) | **자동 + Slack Critical** | 사용자 노출 위험 즉각 차단 |
| **재학습 시작** (≥500건) | **수동 (CTO 승인)** | 데이터 품질 + 비용 검토 필요 |
| **재배포** (≤0.3% Hold-out) | **자동** (Hold-out 통과 시) | 검증 통과 후 결정 트리거는 명확 |
| **재배포 거부** (>0.3% Hold-out) | **자동 + Slack** | 데이터 추가 필요 명시 |

## Persona 매핑

| Persona | 역할 |
|---|---|
| [[product/entities/persona-황보름]] (ASD 경계선) | **재학습 데이터 핵심 기여자** — 비전형 발화 = isCriticalError 발생률 가장 높음. 모델 다양화 직접 기여 |
| [[product/entities/persona-박민정]] (Seg B 데이터형) | 정확도 향상 = 신뢰도 핵심. 재학습 후 정확도 개선이 리텐션 직접 영향 |
| [[product/entities/persona-최수현]] (Seg C 대기자) | 전문가 검토 자체가 신뢰 앵커 — model_retraining_data INSERT는 사용자 비가시 |

## 출처

- [[product/concepts/HITL-system-flow]] § 4번째 원칙 + 9 단계 흐름 § 루프백 재학습
- [[product/sources/52-PRD-V09-Quality-Improvement]] § 3 HITL 4 원칙 (P2-② F-03)
- [[product/sources/65-SRS-V06-Final]] § REQ-FUNC-HITL-004
- [[product/concepts/architecture-decisions]] § ADR-02 (HITL) + ADR-03 (7일 폐기)

## 관련 product 페이지

- [[product/concepts/HITL-system-flow]] — 9 단계 흐름 정본
- [[product/concepts/architecture-decisions]] — ADR-02, ADR-03 + ADR-XX 후보
- [[product/concepts/requirements-traceability-matrix]] — RTM § 보강 필요 (model_retraining_data) 해소 대상
- [[product/concepts/MVP-feature-spec]] § F6 (HITL Epic)
- [[product/concepts/F9.4-ROI-simulator]] + [[product/concepts/Phase-1-future-tasks-decomposition]] — 같은 패턴 (88 Task 보강 제안)

## Clinical 정합

- **재학습 데이터의 임상 가치** = [[clinical/entities/U-TAP]] § 음운변동 분석 + [[clinical/entities/REVT]] § 어휘 등가 연령 + [[clinical/entities/PRES]] § 수용·표현. 한국 영유아 발달 ground truth가 글로벌 STT 모델보다 정밀한 한국어 특화 모델 학습.
- **expertId 다양성 모니터링** = [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격제도. 1급(경력 5년+)과 2급(신규)의 보정 차이가 과대 시 임상 객관성 침해 — 모니터링 필수.
- **부모 동의서 임상 연구 활용 옵션** = [[clinical/sources/0-언어치료-실제-세션-상세가이드]] § 데이터 수집 동의 패턴 정합.

## 보강 필요

- 사용자 확정 후 신규 3 task 등록 (DB-NEW-MR-1 + API-NEW-MR-1 + MON-NEW-MR-1).
- ADR-XX HITL 재학습 책임 분리 정식 등록.
- REQ-FUNC-HITL-004a~d 4 sub-원칙으로 SRS V07 후속 개정.
- Vercel AI SDK fine-tuning API 가격 정책 출시 후 비용 모델 정확화.
- ✅ expertId 다양성 모니터링 알고리즘 결정 — [[product/concepts/expert-diversity-monitoring]] (Phase 1: 단순 Threshold + Top-3 / Phase 2: HHI + Gini 이중 모니터링 + 자동화 흐름 + 위반 시 대응 시나리오 3종).
- 100가정 파일럿 후 첫 30일 isCriticalError 비율 실측 → 0.3%/0.5% 임계 재검증.
- ✅ 부모 동의서 "임상 연구 활용 옵션" — [[product/concepts/F10-research-consent]] (T1-T4 4-Tier Opt-in + T4-a/b/c granular consent + DB-010 보강 + 트리거 갱신 + 마이그레이션 + GDPR/한국법 정합).
