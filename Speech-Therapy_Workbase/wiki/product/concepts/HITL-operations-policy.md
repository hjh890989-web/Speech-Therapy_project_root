---
type: concept
pillar: product
category: synthesis
aliases: [HITL 운영 정책, expert pool 정량화, getCurrentPhase 메커니즘, Phase Flag, HITL operations]
tags: [HITL, expertPool, Phase, Flag, env, DB, 운영정책, IRB, 1급2급, HIIT-연관, 클러스터통합]
---

# HITL 운영 정책 — Expert Pool 정량화 + Phase Flag 메커니즘

[[product/concepts/expert-diversity-monitoring]] § 보강 필요 항목 + [[product/concepts/HITL-retraining-pipeline]] § 운영 보강 통합. **Phase 1/2 expert 풀 규모 + 자격 등급별 비율 + getCurrentPhase() 기술 메커니즘 + IRB 절차**.

> 보강 필요 항목 3건 일괄 해소: expert 풀 자체 정량화 + getCurrentPhase() 정의 + T4-c 외부 공유 IRB 절차.

## 1. Expert Pool 정량화 — Phase별 권장 규모

### Phase 0 (MVP 검증, ~3개월)

| 항목 | 값 | 사유 |
|---|---|---|
| **expert 풀 규모** | **3-5명** | 100가정 파일럿 = 일 큐 ~3-5건. 풀 3명이면 1인당 일 1-2건 = 부담 적음 |
| **자격 비율** | 1급 ≥ 1명 / 2급 2-4명 | 1급 자격 (경력 5년+) = 마스터 재활사 (24h+ 미해결 시 자동 에스컬레이션 받는 사람). 2급은 일반 큐 |
| **계약 형태** | 프리랜서 시간제 (시급 5만원) | Phase 0 트래픽 변동 큼. 정규직 인력 비효율 |
| **운영비/월** | ~150만 (5명 × 30시간 × 1만원 평균) | MRR 12K 가구 × 0.7 (Basic) × 35K = 2.94억 → 운영비 0.5% 미만 |

### Phase 1 (리텐션, ~6개월)

| 항목 | 값 | 사유 |
|---|---|---|
| **expert 풀 규모** | **5-10명** | M3 ≥40% 가구 1만+ 가정 시 큐 일 ~10-15건 |
| **자격 비율** | 1급 ≥ 2명 / 2급 3-8명 | HITL 4 원칙 § 24h 자동 에스컬레이션 = 1급 풀 필수 |
| **다양성 모니터링 (Phase 1 1차)** | **단순 Threshold (Maximum Single Share)** ⭐ | >50% Warning / >70% Critical |
| **다양성 모니터링 (Phase 1 2차)** | Top-3 비율 | >80% Warning / >90% Critical |
| **계약 형태** | 프리랜서 + 파트타임 1-2명 | 2급 중 정기 활성도 높은 1-2명을 파트타임 (월 80h 보장) |
| **운영비/월** | ~400만 (10명 평균) | 자녀 트래픽 ↑ 시 단계별 확대 |

### Phase 2 (B2B 스케일업, ~6개월+)

| 항목 | 값 | 사유 |
|---|---|---|
| **expert 풀 규모** | **15-25명** | B2B 도입 5-10 기관 × 평균 80가구 = 추가 큐 일 ~30건+ |
| **자격 비율** | 1급 ≥ 5명 / 2급 10-20명 | B2B 결과지 = 원장·교사 발송 → 신뢰도 높이려 1급 비율 ↑ |
| **다양성 모니터링 (Phase 2 1차)** | **HHI** (시장 집중도) ⭐ | >2500 Warning / >4000 Critical |
| **다양성 모니터링 (Phase 2 2차)** | Gini 계수 | >0.5 Warning / >0.7 Critical (시계열 Grafana) |
| **계약 형태** | 정규직 1-2명 + 파트타임 5-7명 + 프리랜서 풀 | 안정적 1-2급 자격자 정규직 + 트래픽 변동 흡수 풀 |
| **운영비/월** | ~1,500만 (25명 평균) | B2B 매출 증가 분배 가능 |

### ⭐ Expert 정규직 vs 프리랜서 비율 결정 (C-4 후속, 52차 추가)

[[product/concepts/open-issues-dashboard]] § C-4 후속 처리. Phase별 expert 풀 구성의 회계·법무·운영 영향 정량 분석.

#### 3 고용 형태 비교

| 항목 | **정규직** | **파트타임 (단기 근로)** | **프리랜서 (사업자등록)** |
|---|---|---|---|
| **회계 부담** | 시급 5만 + **30% 추가** (4대 보험 + 퇴직금 + 연차수당) | 시급 5만 + **15% 추가** (4대 보험 일부) | 시급 5만 + **0% 추가** (3.3% 원천세, 회사 부담 X) |
| **법무 보호** | 근로기준법 + 부당해고 보호 | 단기근로법 (주 15시간 미만 = 4대 보험 면제) | 위탁계약 (해지 자유, 근로자 보호 X) |
| **계약 해지** | 부당해고 시 회사 책임 | 단기 갱신 자유 | 즉시 해지 가능 |
| **운영 안정성** | 가장 높음 (1인당 일 5+건 처리) | 중간 (월 80h 보장) | 낮음 (트래픽 변동 의존) |
| **트래픽 변동 흡수** | 낮음 (고정 인력비) | 중간 | 가장 높음 (수요 따라 확대·축소) |
| **자격 등급 적합** | 1급 (10년+) | 1급 + 2급 | 2급 |

#### Phase별 권장 비율

| Phase | 정규직 | 파트타임 | 프리랜서 | 합계 | 월 운영비 |
|---|---|---|---|---|---|
| **Phase 0 (3-5명)** | 0 | 0 | 3-5 | 3-5 | ~150만 (프리랜서만) |
| **Phase 1 (5-10명)** | 0-1 | 1-2 | 4-7 | 5-10 | ~400만 |
| **Phase 2 시작 (10-15명)** | 1 (시니어 1급) | 4 (1급 2 + 2급 2) | 5-10 | 10-15 | ~750만 |
| **Phase 2 후반 (15-25명)** | 2 (시니어 1급) | 7 (1급 3 + 2급 4) | 6-16 | 15-25 | **~1,500만** |

→ **권장**: Phase 2 진입 시 정규직 1명 + 파트타임 4명 = **고정 5명** + 프리랜서 변동 = 트래픽 흡수.

#### 회계·법무 영향 정량

```
Phase 2 시작 (총 10-15명) 가정:
  정규직 1명: 5만/h × 160h × 1.3 = 1,040만 / 月
  파트타임 4명: 5만/h × 80h × 1.15 × 4 = 1,840만 / 月
  프리랜서 5명 평균: 5만/h × 30h × 5 = 750만 / 月
  합계: 약 3,630만 / 月 (× 12 = 4.4억 / 年)

→ Phase 2 매출 50억 (Year 2 SOM) 대비 8.7% (관리 가능 수준).
→ Phase 1 운영비 ~400만 → Phase 2 진입 시 9배 증가 (트래픽 증가 매출 50억 대비).
```

#### 채용 RACI

| 결정 | Responsible | Accountable | Consulted |
|---|---|---|---|
| **정규직 채용** | HR + CTO | **CEO** ⭐ (Tier 3) | 임상 자문 + 법무 |
| **파트타임 영입** | CTO + ML Ops | CTO (Tier 2) | 1급 재활사 (자격 검증) |
| **프리랜서 위탁** | ML Ops | CTO (Tier 2) | — |

#### 위험 요소 + 완화

| 위험 | 완화 |
|---|---|
| **정규직 부당해고 분쟁** | 채용 시 명확한 KPI 합의 + 90일 수습 + 법무 자문 |
| **프리랜서 위탁 = 사실상 근로자 인정 (위장도급)** | 위탁 계약 = (1) 사업자등록 (2) 자기 PC/사무실 (3) 시간·장소 자유 (4) 다른 의뢰인 가능 — 4 요건 충족 |
| **파트타임 4대 보험 적용 누락** | 주 15시간 이상 = 4대 보험 의무 → 자동 가입 처리 |
| **외부 IRB 협력 시 정규직 자격 요구** | LOI 체결 시 학술 발표 공동 저자 = 정규직 우선 (1급 자격자) |

#### 시나리오별 RACI 결정

```
시나리오 A: Phase 2 시작 (트래픽 안정 가정)
  → 정규직 1명 + 파트타임 4명 + 프리랜서 5-10명 = 10-15명
  → CEO Tier 3 결정 (정규직 1) + CTO Tier 2 결정 (파트타임 4)

시나리오 B: 트래픽 급증 (B2B PoC 5건+ 동시 도입)
  → 프리랜서 풀 확대 우선 (10 → 15-20명) + 파트타임 1-2명 추가
  → CTO Tier 2 결정 (긴급)

시나리오 C: 트래픽 정체 (Phase 1 후반 M3 < 30%)
  → Plan B 발동 (R6) + 프리랜서 축소 (5명 → 3명)
  → CTO Tier 2 결정
```

#### 영향 페이지

| 페이지 | 영향 |
|---|---|
| [[product/concepts/HITL-operations-policy]] § 1 (본 보강) | Phase별 비율 + 회계·법무 영향 |
| [[product/concepts/expert-diversity-monitoring]] § 임상 자문 | 자격 등급별 비율 정합 |
| [[product/concepts/architecture-decisions]] § ADR-XX | 정규직 채용 시 Tier 3 (Phase 변경과 동일) |
| [[product/concepts/open-issues-dashboard]] § C-4 | ✅ 정규직 vs 프리랜서 비율 결정 완료 |

→ **C-4 ✅ 정규직 vs 프리랜서 비율 결정 완료** (실 적용은 Phase 2 진입 시점 결정).

### 풀 확대 트리거

```
Phase 1 시작 시 5명 → 다음 조건 1건 충족 시 풀 확대:
  ① 일 큐 등록 > 3 × 풀 규모 (1인당 부담 한계 초과)
  ② 단순 Threshold > 70% Critical (다양성 부족)
  ③ Top-3 비율 > 90% Critical (집중도 과다)
  ④ HITL SLA 위반 (24h 초과 > 2건/월)
  ⑤ M3 리텐션 ≥ 40% + Premium 50K 구독자 ≥ 100명 (경영 안정)
```

→ **트리거 자동 감지** (Vercel Cron 일 1회) → CTO 알림 → 1주 내 풀 확대 영업 시작.

## 2. getCurrentPhase() 메커니즘 — 환경 변수 + DB 하이브리드

### 옵션 비교

| 옵션 | 장점 | 단점 |
|---|---|---|
| **A. 환경 변수만** (Vercel `PHASE=1`) | 단순 / 배포 시점 변경 / 비용 0 | 동적 변경 불가 (재배포 필요) / 다중 인스턴스 동시 변경 어려움 |
| **B. DB 설정 테이블만** (`system_config.phase`) | 동적 변경 / 다중 인스턴스 즉시 반영 / 감사 추적 (audit_log) | DB 호출 비용 (캐싱 필요) / Phase 변경 권한 관리 |
| **C. Feature Flag 외부** (LaunchDarkly) | 풀 솔루션 (rollout·canary·user-targeting) | 외부 의존성 / 비용 (~$10/월) / 본 MVP에서 과잉 |
| **⭐ 권장: A + B 하이브리드** | env = 기본값 (배포 단위) + DB = 동적 오버라이드 | 복잡성 약간 ↑ |

### 권장 구현

```typescript
// /lib/phase.ts
export async function getCurrentPhase(): Promise<'PHASE_0' | 'PHASE_1' | 'PHASE_2'> {
  // 1차: DB 설정 테이블 (캐싱 60초)
  const dbPhase = await cachedDbConfig.get('current_phase');
  if (dbPhase && ['PHASE_0', 'PHASE_1', 'PHASE_2'].includes(dbPhase)) {
    return dbPhase as PhaseEnum;
  }
  
  // 2차: 환경 변수 fallback
  const envPhase = process.env.PHASE || 'PHASE_0';
  return envPhase as PhaseEnum;
}

// /api/admin/update-phase (CTO 전용)
export async function POST(req: Request) {
  const { newPhase, reason } = await req.json();
  await db.system_config.upsert({
    key: 'current_phase',
    value: newPhase
  });
  await db.audit_log.create({
    event: 'phase_changed',
    fromValue: getCurrentPhase(),
    toValue: newPhase,
    actor: getCurrentUser().id,
    reason
  });
  await invalidateCache('current_phase');
  return Response.json({ status: 'ok' });
}
```

### system_config 테이블 (신규)

```sql
CREATE TABLE system_config (
  key             VARCHAR(50) PRIMARY KEY,
  value           VARCHAR(100) NOT NULL,
  updatedBy       UUID REFERENCES users(user_id),
  updatedAt       TIMESTAMP DEFAULT NOW()
);

-- 초기 데이터
INSERT INTO system_config (key, value) VALUES 
  ('current_phase', 'PHASE_0'),
  ('expert_pool_size', '3'),
  ('hitl_confidence_threshold', '70'),
  ('retraining_data_threshold', '500'),
  ('rollback_error_threshold', '0.5'),
  ('redeploy_error_threshold', '0.3');
```

→ **system_config 테이블 = 운영 정책 일원화**. expert_pool_size · HITL 임계 등 모두 한 테이블에서 동적 변경 가능.

### Phase 변경 권한 (RACI)

| 변경 | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Phase 0 → 1 | ML Ops | **CTO** ⭐ | 임상 자문 | CEO + 전체 팀 |
| Phase 1 → 2 | ML Ops + B2B 영업 | **CEO + CTO** ⭐⭐ | 임상 자문 + 법무 | 전체 팀 |
| Phase 2 → 다음 | (해당 시점 결정) | (해당 시점 결정) | — | — |

→ Phase 변경 = **CR Tier 3 (Strategic)** ([[product/concepts/change-management-process]] 정합).

## 3. T4-c 외부 공유 IRB 절차

[[product/concepts/F10-research-consent]] § T4-c (외부 임상 협력) 동의 시 IRB (Institutional Review Board) 검토 절차:

### IRB 트리거 조건

T4-c 동의 부모 데이터 + 다음 1건 이상:
- 학술 논문 게재 예정
- 외부 기관 (대학·연구소) 데이터 공유
- 컨퍼런스·심포지엄 발표 (익명 통계 포함)

### IRB 절차 (5 단계)

```
[1] 외부 협력 제안 (외부 기관 또는 내부 R&D)
       ↓
[2] T4-c 동의 부모 코호트 식별 (DB 쿼리)
       ↓
[3] 데이터 익명화 검증 (researcher 검토 + 매니저 자동 검증)
       - 부모·자녀 식별 정보 0건
       - audioVectorUri 7일 폐기 완료
       - 점수 통계만 추출
       ↓
[4] IRB 검토 (외부 협력 시 외부 기관 IRB / 내부 시 자문위원회)
       - 평균 2-4주 소요
       - 외부 기관 IRB 비용: 기관별 (대학 IRB 평균 50만원)
       - 결과: 승인 / 조건부 승인 / 거부
       ↓
[5] 매니저 최종 승인 + 데이터 공유
       - audit_log INSERT (event='external_share', batchId, recipient)
       - 부모에게 통보 (T4-c 동의자 한정)
```

### IRB 제외 영역

다음 영역은 IRB 검토 불필요 (내부 R&D만):
- T4-a 모델 정확도 개선 (HITL 재학습)
- 외부 공유 없는 통계 보고 (CEO 보고용)
- T4-b 학술 발표는 IRB 필요 / T4-a는 불필요

### IRB 운영 정책

| 항목 | 권장 |
|---|---|
| 내부 자문위원회 구성 | CTO + 1급 언어재활사 1명 + 법무 자문 1명 + 외부 임상가 1명 (분기별 회의) |
| 외부 기관 IRB 동시 검토 | 외부 협력 시 본 IRB + 외부 기관 IRB 양쪽 승인 |
| 비용 | 분기 자문 회의 ~30만 + 외부 IRB 별도 |
| 승인 SLA | 외부 협력 검토 ≤ 4주 |
| 회수권 | 부모 T4-c 철회 시 즉시 미공유 차단 (소급 미적용 — 이미 공유된 통계는 영향 없음) |

## ⭐ IRB 외부 기관 사전 확보 계획 (C-3 후속, 51차 추가)

[[product/concepts/open-issues-dashboard]] § C-3 후속 처리. **Phase 2 진입 1개월 전 외부 기관 LOI (Letter of Intent) 사전 확보** + 협력 범위 + IRB 절차 협의.

### 타깃 기관 4 카테고리

| 카테고리 | 기관 후보 | 협력 범위 |
|---|---|---|
| **A. 언어치료학과 (대학)** | 한림대 / 연세대 / 이화여대 / 한국외대 등 | T4-a (모델 개선 데이터 공유) + T4-b (학술 발표 공동 저자) + IRB 양쪽 검토 |
| **B. 학회·임상 협회** | 한국언어재활사협회 / 한국언어청각임상학회 / 한국아동학회 | 1급/2급 자격자 풀 영입 + 학술 발표 + 분기 자문 회의 (ADR-15) |
| **C. 임상 자문가** | 1급 언어재활사 (경력 10년+) / ASD 전문 임상가 | 자문위원회 분기 회의 + F15 KOPLAC 영감 자문 (38차) |
| **D. 의료 브릿지 (회피 영역, 단 신뢰 채널)** | 지역 소아청소년과 | 영업 채널 + 임상 자문 (B2C 진입 트래픽). **데이터 공유 X** |

→ **A + B = 핵심 IRB 협력 / C = 자문위원회 / D = 영업 채널만**.

### LOI (Letter of Intent) 내용

LOI 표준 템플릿 — 외부 기관별 협의 자료:

```markdown
# Letter of Intent — Home Language Coaching Platform 외부 협력

## 1. 본 프로젝트 개요
- 영유아 만 2-7세 언어 발달 모니터링 + 부모 코칭 플랫폼
- 비의료/교육 카테고리 (DTx 회피, ADR-04)
- 1급/2급 자격자 풀 비동기 운영 (HITL)

## 2. 협력 범위 (Tier 분류)
- T4-a (모델 정확도 개선): 익명화 발달 데이터 공유 → 한국어 영유아 STT/NLP 모델 정밀화
- T4-b (학술 발표): 공동 저자 / 익명 통계 학회 발표
- T4-c (외부 임상 협력): 협력 IRB 검토 후 외부 기관과 데이터 공유

## 3. 데이터 공유 정책 (GDPR + 한국 개인정보보호법 정합)
- 음성 원본: 7일 폐기 (ADR-03)
- 익명화 점수만 공유 (부모·자녀 식별 정보 0건)
- 부모 명시적 동의 (T4-c) 후만 공유
- 부모 철회권 보장 (마이페이지 즉시 변경)

## 4. IRB 절차
- 본 프로젝트 자문위원회 (CTO + 1급 재활사 + 법무 + 외부 임상가, 분기 회의)
- 외부 기관 IRB 검토 (대학·학회별 ≤4주)
- 양쪽 승인 후 매니저 최종 승인 + audit_log

## 5. 협력 기간 및 갱신
- 초기 협력 6개월 (Phase 2 첫 6개월)
- 분기 검토 + 갱신
- 종료 시 데이터 회수 / 미공유 처리

## 6. 양측 책임
- 우리: 기술 인프라 + GDPR/한국법 정합 + 자문위원회 운영
- 외부: 임상 자문 + 자격 검증 + IRB 검토

## 7. 분쟁 해결
- 1차 자문위원회 협의
- 2차 외부 변호사 중재
- 한국 법원 관할 (서울중앙지방법원)
```

### 타임라인 (Phase 2 진입 6개월 전부터)

```
[Phase 1 후반 (Phase 2 진입 6개월 전)]
   ↓
[T-6개월] 타깃 기관 선정 (CTO + 임상 자문)
   ├─ A 카테고리 3-5 대학 + B 카테고리 2-3 학회 + C 카테고리 1급 재활사 5-10명 후보
   └─ 우호적 임상가 통한 비공식 사전 접촉
        ↓
[T-4개월] 비공식 미팅 + LOI 1차 협의
   ├─ 본 프로젝트 발표 + 비전 공유
   ├─ LOI 초안 검토 (외부 기관 의견 반영)
   └─ 분기별 검토 합의
        ↓
[T-2개월] LOI 정식 체결
   ├─ A 1-2 대학 + B 1 학회 + C 3-5 자문가
   └─ 분기 자문위원회 운영 합의
        ↓
[T-1개월] IRB 절차 협의 시작
   ├─ 외부 기관 IRB 위원회 사전 협의
   ├─ 데이터 공유 표준 (익명화 절차) 합의
   └─ 분쟁 시 절차 합의
        ↓
[T0: Phase 2 진입]
   ├─ 자문위원회 분기 1회 시작
   ├─ T4-c 동의 부모 식별 시작
   └─ 외부 IRB 본 검토 가능 (필요 시)
        ↓
[T+3개월: Phase 2 진입 후 3개월]
   ├─ 첫 외부 협력 검토 (IRB 양쪽 승인)
   └─ 분기 검토 + LOI 갱신
        ↓
[T+6개월: 6개월 협력 종료]
   ├─ 효과 검증 (학술 발표 N건 / 모델 개선 N% 등)
   ├─ 갱신 결정 (CR Tier 3, CEO 책임)
   └─ LOI 6개월 갱신 또는 종료 (데이터 회수 절차)
```

### 위험 요소 5종 + 완화

| 위험 | 완화 |
|---|---|
| **외부 기관 의지 부족** | 1급 재활사 풀 통한 사전 우호적 접촉 + 학술 가치 강조 (한국 영유아 데이터 부족 영역) |
| **대학별 IRB 절차 차이** | T-4개월부터 1-2 대학 우선 확보 + 절차 가장 간편한 곳부터 시작 |
| **데이터 공유 범위 협상 갈등** | LOI Tier 분류 (T4-a / T4-b / T4-c 명시) — 단계적 확대 |
| **GDPR/한국법 위반 우려** | 법무 자문 + LOI § 데이터 공유 정책에 GDPR Art. 6/7/17/25 + 한국 §22/§39-3 명시 |
| **외부 기관 IRB 거부** | 본 자문위원회 + 외부 기관 IRB 양쪽 검토 — 외부 거부 시 공유 차단 (소급 미적용) |

### Phase 2 진입 LOI 검증 게이트

Phase 2 진입 결정 직전 다음 모두 충족 시 진입 권장:
- [ ] LOI 정식 체결: A 1+ 대학 + B 1+ 학회 + C 3+ 자문가
- [ ] 외부 기관 IRB 절차 합의 (대학별 절차 명세)
- [ ] 자문위원회 분기 회의 운영 합의 (CTO + 외부 임상가 + 법무)
- [ ] T4-c 동의 부모 100명+ (실 외부 공유 가능 인구)
- [ ] 법무 자문 GDPR + 한국법 정합 검증 완료

→ Open Issues § Phase 2 진입 체크리스트 (C-3 + C-4 + 본 항목) 모두 처리 후 진입.

### 비용 모델

| 항목 | 비용 |
|---|---|
| LOI 체결 비용 (법무 자문) | 1회 ~100만 (변호사 검토) |
| 외부 기관 IRB 비용 | 대학별 ~50만/회 |
| 분기 자문위원회 회의 | ~30만/회 × 4 = 연 120만 |
| 비공식 미팅 (T-6 ~ T-2) | ~50만 (식대·교통) |
| **합계 (Phase 2 첫 1년)** | **약 800-1,000만** |

→ Phase 2 매출 50억 (Year 2 SOM) 대비 **0.02% 미만**. ROI = 학술 권위 + 1급/2급 자격자 풀 영입 + 외부 협력 → 모델 정확도 ↑ + 신뢰도 ↑.

### 영향 페이지

| 페이지 | 영향 |
|---|---|
| [[product/concepts/HITL-operations-policy]] § 3 IRB | LOI 사전 확보 보강 (본 추가) |
| [[product/concepts/F10-research-consent]] § T4-c | 외부 협력 채널 사전 확보 명시 |
| [[product/concepts/expert-diversity-monitoring]] § 임상 자문 | 자문가 다양성 = LOI 체결 자문가 풀 |
| [[product/concepts/architecture-decisions]] § ADR-15 | IRB 자문위원회 운영 = LOI 정식 체결 후 활성화 |
| [[product/concepts/open-issues-dashboard]] § C-3 | ✅ LOI 사전 확보 계획 결정 완료 |

→ **C-3 ✅ LOI 사전 확보 계획 결정 완료** (실 체결은 Phase 2 진입 6개월 전부터).

## 4. 통합 운영 흐름 — Phase × Expert × IRB

```
Phase 0 (3-5명 풀)
   ├─ 단순 Threshold 모니터링
   ├─ T4 동의 수집 (소량) — IRB 미트리거
   └─ Phase 0 종료 시점:
       ├─ M3 ≥40% 달성 → Phase 1 진입 (CR Tier 3)
       └─ HITL 큐 운영 안정 → expert 풀 확대 시작

Phase 1 (5-10명 풀)
   ├─ 단순 Threshold + Top-3 모니터링
   ├─ T4-a 동의 데이터 → 재학습 (IRB 미트리거 — 내부 R&D)
   ├─ T4-b 학술 발표 검토 → IRB 트리거 (분기 1회 가능)
   └─ Phase 1 종료 시점:
       ├─ B2B PoC 5건 통과 → Phase 2 진입 (CR Tier 3)
       └─ HHI 모니터링 도입 준비 + IRB 외부 협력 채널 확보

Phase 2 (15-25명 풀)
   ├─ HHI + Gini 모니터링 (Grafana)
   ├─ T4-c 외부 공유 활성 → IRB 정기 운영
   └─ Phase 2 종료 시점:
       ├─ 매출 50억 달성 → 다음 Phase (해당 시점 결정)
       └─ 정규직 expert 풀 확대 + 임상 연구 협력 정착
```

## ⭐ system_config RBAC 정책 세분화 (C-1 후속, 50차 추가)

[[product/concepts/open-issues-dashboard]] § C-1 후속 처리. **system_config 테이블 변경 권한 세분화** + audit_log 강제 + Slack 자동 알림.

### 권한 레벨 매트릭스

| 역할 | 변경 가능 항목 | CR Tier | 사유 |
|---|---|---|---|
| **CEO** | `current_phase` (전환 결정) + 모든 항목 (긴급) | Tier 3 | Phase 변경 = Strategic |
| **CTO** ⭐ | `current_phase` (T1 시작) / `expert_pool_size` / `hitl_confidence_threshold` / `rollback_error_threshold` / `redeploy_error_threshold` / `retraining_data_threshold` / 모든 임계값 | Tier 2-3 | ML Ops + 시스템 결정 |
| **ML Ops 엔지니어** | `rollback_error_threshold` / `redeploy_error_threshold` / `retraining_data_threshold` (CTO 승인 후) | Tier 2 | 데이터 검증 결과 반영 |
| **PM** | `expert_pool_size` 모니터링 (변경 권한 없음, **읽기 전용**) | — | 운영 보고용 |
| **그 외 (개발자·CS·디자이너)** | 모든 system_config = **읽기 전용** | — | 운영 보안 |

→ **CEO + CTO만 변경 권한 보유. ML Ops는 CTO 승인 후 일부 임계값 변경 가능. 그 외 모두 읽기 전용**.

### Supabase RLS 구현

```sql
-- system_config 테이블 RBAC
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자 = 읽기 가능
CREATE POLICY "system_config_read"
  ON system_config FOR SELECT
  TO authenticated
  USING (true);

-- 변경 권한 = CEO + CTO 전용
CREATE POLICY "system_config_write_cto_ceo"
  ON system_config FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('CEO', 'CTO')
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('CEO', 'CTO')
  );

-- ML Ops = 일부 항목만 (CTO 승인 후)
CREATE POLICY "system_config_write_mlops_thresholds"
  ON system_config FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'ML_OPS' AND
    key IN ('rollback_error_threshold', 'redeploy_error_threshold', 'retraining_data_threshold') AND
    EXISTS (
      SELECT 1 FROM cto_approvals 
      WHERE config_key = system_config.key AND approved_at >= NOW() - INTERVAL '7 days'
    )
  );
```

### 변경 흐름 — 강제 audit_log + Slack

```typescript
// /api/admin/update-system-config (CTO/CEO/ML Ops)
export async function POST(req: Request) {
  const { key, value, reason } = await req.json();
  const user = await getCurrentUser();
  
  // 1. 권한 검증 (Supabase RLS 자동 처리)
  
  // 2. 변경 사유 강제 (≥10 chars)
  if (!reason || reason.length < 10) {
    return Response.json({ error: 'reason_required_min_10_chars' }, { status: 400 });
  }
  
  // 3. CTO 승인 검증 (ML Ops가 임계값 변경 시)
  if (user.role === 'ML_OPS' && THRESHOLD_KEYS.includes(key)) {
    const approval = await db.cto_approvals.findRecent(key, 7);  // 7일 내 승인
    if (!approval) {
      return Response.json({ error: 'cto_approval_required' }, { status: 403 });
    }
  }
  
  // 4. 변경 전 값 조회
  const prevValue = await db.system_config.get(key);
  
  // 5. 변경 적용
  await db.system_config.upsert({ key, value, updatedBy: user.id });
  
  // 6. audit_log 강제 INSERT
  await db.audit_log.create({
    event: 'system_config_changed',
    config_key: key,
    from_value: prevValue,
    to_value: value,
    actor: user.id,
    role: user.role,
    reason,
    ip: req.headers['x-forwarded-for'],
    user_agent: req.headers['user-agent']
  });
  
  // 7. Slack #ops-alerts 자동 발송
  await sendSlackOpsAlert({
    text: `🔧 system_config 변경: \`${key}\` ${prevValue} → ${value}`,
    actor: user.email,
    role: user.role,
    reason,
    ts: new Date().toISOString()
  });
  
  // 8. 7일 rollback 가능성 보장
  await scheduleRollbackOption(key, prevValue, 7);
  
  // 9. 캐시 무효화
  await invalidateCache('system_config');
  
  return Response.json({ status: 'ok', prevValue, newValue: value });
}
```

### 보안 메커니즘 5종

| 메커니즘 | 구현 |
|---|---|
| **1. Supabase RLS** | role 기반 정책 (CEO/CTO/ML_OPS) — DB 레벨 강제 |
| **2. CTO 승인 (ML Ops)** | `cto_approvals` 테이블 + 7일 유효 |
| **3. 변경 사유 ≥10 chars** | API 검증 |
| **4. audit_log 강제** | event + 변경 전후 값 + actor + role + IP + UA |
| **5. 7일 Rollback 가능** | 변경 후 7일간 즉시 되돌릴 수 있는 옵션 자동 생성 |

### Slack #ops-alerts 자동 발송 규칙

```
[Tier 1 (Minor)] expert_pool_size 변경
   → Slack Info (조용한 알림)

[Tier 2 (Major)] hitl_confidence_threshold 변경
   → Slack Warning + 실패 시 Slack Critical
   
[Tier 3 (Strategic)] current_phase 변경
   → Slack Critical + CEO/CTO 페이저 + 전체 팀 알림

[보안 위반] 비인가 사용자 시도
   → Slack #security-alerts + CTO 즉시 알림
```

### 권한 침해 시 대응

| 위반 | 대응 |
|---|---|
| **비인가 사용자 변경 시도** | DB RLS 자동 차단 + Slack #security-alerts 즉시 발송 + audit_log 강제 |
| **ML Ops가 CTO 승인 없이 변경** | DB 제약 위반 → 자동 차단 + 시도 기록 |
| **CTO/CEO 변경 후 결과 의문** | 7일 내 CEO 권한으로 즉시 rollback (Tier 3 비상 대응) |
| **2FA 미완료 변경 시도** | Supabase Auth 2FA 강제 + 미완료 시 차단 |

### 정기 검토

| 주기 | 검토 항목 |
|---|---|
| **주간** | system_config 변경 audit_log 검토 (PM 보고) |
| **월간** | 2FA 적용률 + 권한 침해 시도 수 (CTO 보고) |
| **분기** | RBAC 정책 적정성 (CEO + CTO 회의) |
| **CR Tier 3** | RBAC 정책 자체 변경 (CEO 결정) |

### ADR-13 보강

기존 ADR-13 "system_config 테이블" 의 § 시스템 영향 영역 보강:

> **시스템 영향 (49차 + 50차 보강)**: system_config 테이블 + 60초 캐싱 + audit_log 강제 + RBAC (CEO + CTO 변경 권한 / ML Ops CTO 승인 후 일부 / 그 외 읽기 전용) + Supabase RLS 5 정책 + Slack #ops-alerts 자동 발송 + 7일 rollback 가능 + 2FA 강제 (변경 시) + Phase 전환 hybrid (49차).

### 영향 페이지

| 페이지 | 영향 |
|---|---|
| [[product/concepts/HITL-operations-policy]] § 2 | system_config RBAC 정책 (본 보강) |
| [[product/concepts/architecture-decisions]] § ADR-13 | 시스템 영향 영역 보강 (50차) |
| [[product/concepts/change-management-process]] § Tier 1-3 | system_config 변경 = Tier 분류 표준 사례 |
| [[product/concepts/open-issues-dashboard]] § C-1 | ✅ RBAC 정책 결정 완료 표시 |

→ **C-1 ✅ RBAC 정책 결정 완료** (실 적용은 system_config 테이블 도입 시 = DB-NEW-OPS-1).

## ⭐ Phase 변경 시 Sprint 처리 정책 (C-2 후속, 49차 추가)

[[product/concepts/open-issues-dashboard]] § C-2 후속 처리. **Phase 0 → 1 또는 1 → 2 전환 시 진행 중인 Sprint 및 사용자 코호트 처리 정책**.

### 핵심 옵션 비교

| 옵션 | 적용 방식 | 장점 | 단점 |
|---|---|---|---|
| **A. Sprint 완료 후 적용** | 진행 중 Sprint = Phase 0 유지 / 다음 Sprint = Phase 1 | Sprint 단위 cohort 일관성 + 분석 용이 | Phase 변경 결정 후 1-2주 지연 |
| **B. 즉시 적용 (사용자 단위)** | 신규 가입 = Phase 1 / 기존 = Phase 0 혼재 | 즉시 효력 + 신규 가입 가속 | cohort 혼재 → 분석 복잡 |
| **⭐ C. 하이브리드 (권장)** | 신규 가입 = Phase 1 즉시 적용 / 기존 = 다음 Sprint 시작 시 전환 | 최선의 상호 보완 | 코호트 분리 추적 필요 (DB 쿼리 정밀화) |

→ **권장 = 옵션 C**. Phase 1 신규 기능의 즉시 효력 + 기존 사용자의 cohort 일관성 동시 확보.

### 옵션 C 구현 — 하이브리드 Phase 전환

```sql
-- system_config (ADR-13) 보강 컬럼
ALTER TABLE system_config
ADD COLUMN phase_transition_started_at TIMESTAMP,
ADD COLUMN phase_transition_completed_at TIMESTAMP;

-- 사용자 Phase 자동 분기
CREATE OR REPLACE FUNCTION user_current_phase(user_created_at TIMESTAMP)
RETURNS VARCHAR AS $$
DECLARE
  current_phase VARCHAR;
  transition_started TIMESTAMP;
BEGIN
  SELECT value INTO current_phase FROM system_config WHERE key = 'current_phase';
  SELECT phase_transition_started_at INTO transition_started FROM system_config 
    WHERE key = 'current_phase';
  
  -- Phase 변경 진행 중이면:
  IF transition_started IS NOT NULL THEN
    -- 신규 가입 (전환 시작 후): 즉시 새 Phase
    IF user_created_at >= transition_started THEN
      RETURN current_phase;  -- 신규 = 새 Phase 즉시 적용
    -- 기존 가입 (전환 시작 전): Sprint 완료 후 전환
    ELSE
      -- Sprint 종료까지 = 이전 Phase 유지
      IF NOW() < (SELECT phase_transition_completed_at FROM system_config WHERE key = 'current_phase') THEN
        RETURN previous_phase;  -- 기존 = 이전 Phase 유지
      ELSE
        RETURN current_phase;  -- Sprint 완료 후 전환
      END IF;
    END IF;
  ELSE
    RETURN current_phase;  -- 전환 비진행 = 모든 사용자 동일
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Phase 전환 4단계 흐름

```
[T0: Phase 변경 결정 (CR Tier 3)]
   ↓
[T1: 전환 시작 (system_config.phase_transition_started_at = NOW())]
   ├─ current_phase = 'PHASE_2' (예시)
   ├─ 신규 가입자 = Phase 2 즉시 적용
   └─ 기존 가입자 = Phase 1 유지 (다음 Sprint 종료까지)
        ↓
[T2: Sprint 완료 (~2주)]
   ├─ 모든 기존 가입자 = Phase 2 자동 전환
   └─ system_config.phase_transition_completed_at = NOW()
        ↓
[T3: 전환 완료 (system_config 정상 운영)]
   - 신규/기존 모두 Phase 2 일관 적용
   - audit_log INSERT (전환 완료 기록)
```

### Sprint 코호트 분석 보강

```python
def analyze_phase_transition_impact():
    """Phase 변경 후 신규/기존 cohort 분리 분석"""
    return {
        'new_users_phase2': db.query("user_created_at >= phase_transition_started"),
        'existing_users_phase1_to_phase2': db.query("user_created_at < phase_transition_started"),
        
        # Phase별 KPI 차이 검증
        'new_users_w_aur': calculate_w_aur(new_users),
        'existing_users_w_aur': calculate_w_aur(existing_users),
        
        # 신규 vs 기존 cohort 차이가 크면 → 분석 분리 또는 점진 전환
        'cohort_divergence': abs(new_w_aur - existing_w_aur)
    }
```

### Phase 변경 RACI (CR Tier 3)

| 결정 | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Phase 0 → 1 (option C 적용) | ML Ops + PM | **CTO** | 임상 자문 + 법무 | CEO + 전체 팀 |
| Phase 1 → 2 (option C 적용) | ML Ops + B2B 영업 + PM | **CEO + CTO** | 임상 자문 + 법무 | 전체 팀 |
| Sprint 완료 시점 (T2) | ML Ops 자동 | CTO | — | 전체 팀 |

### 전환 시 위험 요소

| 위험 | 완화 |
|---|---|
| **신규/기존 cohort 분석 복잡성** | DB 쿼리 정밀화 + Amplitude 별도 dashboard |
| **신규 가입자가 새 기능 거부** | Phase 2 새 기능 = Opt-in 가능 (예: F9.4 ROI 계산기 무로그인 = 옵션) |
| **기존 가입자가 갑작스러운 전환** | T2 (Sprint 완료) 1주 전 in-app 알림 + 이메일 안내 |
| **Sprint 도중 Phase 변경 결정 변경** | T1 진입 후 변경 = Tier 3 재검토 (Tier 2 미허용) |

### 영향 페이지

| 페이지 | 영향 |
|---|---|
| [[product/concepts/HITL-operations-policy]] § 2 | system_config phase_transition_*at 컬럼 보강 |
| [[product/concepts/architecture-decisions]] § ADR-13 | 시스템 영향 영역에 Phase 전환 흐름 추가 |
| [[product/concepts/change-management-process]] § Tier 3 | Phase 변경 = 옵션 C 하이브리드 적용 명시 |
| [[product/concepts/open-issues-dashboard]] § C-2 | ✅ 정책 결정 완료 표시 |

→ **C-2 ✅ Phase 변경 정책 결정 완료** (실 적용은 Phase 0 → 1 또는 1 → 2 시점).

## 5. RTM 보강 (운영 정책 영역)

| 항목 | 매핑 |
|---|---|
| **Phase Flag** | system_config 테이블 (DB-NEW-OPS-1 후보) + env fallback |
| **expert 풀 규모** | system_config.expert_pool_size + DB-009 hitl_queue 분배 로직 |
| **다양성 모니터링** | MON-NEW-MR-1 (Phase 1 단순+Top-3 / Phase 2 HHI+Gini 분기) |
| **IRB 절차** | F10-research-consent § T4-c + 본 페이지 § 5 단계 |
| **풀 확대 트리거** | Vercel Cron (HITL-retraining-pipeline § 자동화 흐름과 통합) |

→ **신규 Task 후보 1건**: DB-NEW-OPS-1 system_config 테이블 (1 SP).

## 6. KPI 신규 후보 (운영 정책)

| KPI | 임계 | 측정 |
|---|---|---|
| Expert 풀 활성도 (월간 1+ 검토 expert 비율) | ≥80% | DB query (expertId × 검토 건수) |
| Phase 변경 SLA | Phase 결정 후 ≤2주 머지 | audit_log 기반 |
| IRB 외부 협력 SLA | 검토 ≤4주 | IRB log |
| T4-c 부모 철회율 | ≤10% | DB query (researchExternalShare 변경 추적) |

## 7. ADR 후보

- **ADR-XX system_config 테이블 도입** — 운영 정책 일원화 (env + DB 하이브리드). 누적 ADR 후보 6종 (F9.4 + F11 + F16 + HITL 재학습 + 변경 관리 + system_config) → 현 12 + 6 = **18 ADR 가능성**.

## 출처

- [[product/concepts/expert-diversity-monitoring]] § Phase 1/2 권장 임계
- [[product/concepts/HITL-retraining-pipeline]] § RACI + 자동화 흐름
- [[product/concepts/F10-research-consent]] § T4-c 외부 공유 동의
- [[product/concepts/change-management-process]] § Tier 3 (Phase 변경)
- [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격제도

## 관련 product 페이지

- [[product/concepts/expert-diversity-monitoring]] — Phase별 알고리즘
- [[product/concepts/HITL-retraining-pipeline]] — RACI + 자동화
- [[product/concepts/F10-research-consent]] — T4-a/b/c 동의
- [[product/concepts/architecture-decisions]] § ADR-11 (HITL 재학습 책임 분리)
- [[product/concepts/change-management-process]] — Phase 변경 = Tier 3

## Clinical 정합

- **1급/2급 자격제도** ([[clinical/concepts/한국-언어치료-트랙비교]]): expert 풀 1급 비율은 HITL 24h 자동 에스컬레이션 + Premium 50K 차별화 핵심.
- **임상 자문 분기 회의** ([[product/concepts/F15-clinical-consultation-checklist]] § 자문가 다양성): IRB 자문위원회 분기 운영과 통합 가능 (1급 + 외부 임상가 + 법무).

## 보강 필요

- system_config 테이블 보안 (CTO 외 변경 금지) — RBAC 정책 정합.
- Phase 변경 시 Sprint 운영 영향 분석 (예: Phase 1 → 2 전환 시 진행 중 Sprint 처리).
- IRB 외부 기관 사전 확보 (외부 임상 협력 채널) — 대학·학회 LOI 가능성.
- Expert 풀 정규직 vs 프리랜서 비율 결정의 회계·법무 영향.
- 청소년 (만 13세+) 본인 동의 검토 — 본 위키 영유아 외 영역 미적용 가능.

---

✅ HITL 운영 정책 보강 필요 3건 일괄 해소:
- expert 풀 정량화 ✅
- getCurrentPhase() 메커니즘 ✅
- T4-c 외부 공유 IRB 절차 ✅
