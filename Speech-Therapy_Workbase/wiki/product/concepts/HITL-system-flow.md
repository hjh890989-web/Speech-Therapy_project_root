---
type: concept
pillar: product
category: synthesis
aliases: [HITL 시스템 흐름, Human-in-the-Loop 통합, HITL 운영 정본, 비동기 전문가 감수]
tags: [HITL, ADR-02, API-005, API-006, TEST-014, PostgreSQL-트리거, Supabase-Studio, Resend, 루프백, 에스컬레이션, 어뷰징방어, 클러스터통합]
---

# HITL 시스템 흐름 — 자동 이관부터 루프백 재학습까지

PRD V09 Quality §3 HITL **4 원칙** + ADR-02 + Sprint 1 핵심 Task 5종 (DB-009 / API-005 / API-006 / FR-C-002 / TEST-014) 통합 정본. **AI 95% + 전문가 5% 하이브리드 임상 안전망** ([[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격자 ~17,000명의 비동기 디지털 운영 모델).

## 정의 — HITL이 풀어야 하는 문제

| 문제 | HITL이 막는 것 | 출처 |
|---|---|---|
| AI 단독 100% 신뢰 시 1건 치명적 오진 발생 | **규제 리스크 + 맘카페 집단 민원** | ADR-02 / 리스크 R2 |
| 부모 이의제기 폭주 시 모두 재처리 | **고비용 컨택센터 운영** | API-005 / FR-C-002 |
| 동일 전문가 반복 검토 | **임상 객관성 침해** ([[clinical/concepts/한국-언어치료-트랙비교]] 1급/2급 윤리) | API-006 / TEST-014 |
| 전문가 보정 결과가 모델에 반영 안됨 | **시간이 갈수록 AI 정체** | V09 Quality §3 4번째 원칙 |

→ HITL 시스템은 단순한 "관리자 검토 큐"가 아니라 **품질·법적·임상·ML Ops 4축의 통합 안전망**.

## 4 원칙 (V09 Quality §3 — PRD V10 흡수)

| 원칙 | 적용 방식 | 구현 |
|---|---|---|
| **1. 자동 에스컬레이션** | AI Confidence < 70 또는 사용자 이의 시 → 큐 자동 이관 | API-005 (POST `/api/hitl/queue`) |
| **2. 의료적 판단 회피** | UI 텍스트 정규식 스캐닝 (진단/장애 등 금칙어 차단) | TEST-005 + ADR-04 |
| **3. 전문가 SLA 보장** | 영업일 48시간 이내 청취 + 코멘트 발행 | API-006 + DB-009 + Cron (FR-C-014) |
| **4. 루프백 재학습** ⭐ | 전문가 보정 레이블 = Ground Truth → 파인튜닝 데이터 환류 | model_retraining_data + ML Ops |

## 시스템 흐름 다이어그램

```
[1] AI 1차 판정
    └─ /api/diagnosis/analyze (API-001) → confidence score 산출

[2] 자동 게이트 (FR-C-001 → FR-C-002)
    confidence ≥ 70 ──→ 즉시 결과 반환 + evaluation_results.hitl_reviewed = false
    confidence < 70 ──┐
    OR 부모 이의제기  ┘
                       │
                       ▼
[3] 큐 등록 (API-005, D4 Replace)
    POST /api/hitl/queue
    ├─ DB-009 hitl_queue INSERT (slaDueAt = now + 48h)
    ├─ Slack 웹훅 발송 ≤2초 (자녀 식별 정보 미포함, sessionId만)
    └─ slackNotified=false 시 graceful degradation (200 OK 유지)

[4] 전문가 검토 (API-006, D4 1차 도구 = Supabase Studio)
    경로 (a) Supabase Studio 직접 SQL UPDATE  ⭐ 1차
    경로 (b) PATCH /api/hitl/comment              fallback
    
    ├─ Zod 입력: {queueId, expertComment, groundTruthScore: {articulation, linguistic, acoustic}, expertId}
    └─ DB UPDATE hitl_queue SET status='completed'

[5] PostgreSQL 트리거 (자동 sync) ⭐
    AFTER UPDATE OF status ON hitl_queue
    └─ NEW.status='completed'
        ├─ evaluation_results.hitlReviewed = true 자동 sync
        └─ audit_log INSERT (감사 추적)

[6] 사용자 알림
    └─ Resend (Free 100/일) 또는 Sendgrid Free
        "전문가가 결과를 검토했습니다" 이메일 발송

[7] Cron 에스컬레이션 (FR-C-014, P1)
    24h 임박 (slaDueAt - 24h < now) → 마스터 재활사 Slack DM
    48h 초과 (slaDueAt < now)        → status='escalated' + admin Critical Alert

[8] 어뷰징 방어 (REQ-FUNC-034)
    동일 expertId 월 3회+ 동일 부모 검토 → 자동 admin 알림 (임상 객관성)
    동일 userId 월 4번째 이의제기      → 자동 dismissed + CS 알림

[9] 루프백 재학습 (REQ-FUNC-HITL-004) ⭐ V09 Quality 신규
    groundTruthScore JSON → model_retraining_data 테이블 누적
    
    3단계 게이트:
    ① 오진율 0.5% 초과       → 서빙 즉시 롤백
    ② 보정 데이터 500건 이상 → 파인튜닝 재개
    ③ 오진율 0.3% 이하       → 재배포
```

## 88 Task 매핑 — Sprint 1 코어 의존 5종

| Task | 역할 | Phase | Mode |
|---|---|---|---|
| **DB-009** `hitl_queue` 테이블 | 큐 + slaDueAt + escalatedAt + status | P0 | 명세대로 |
| **FR-C-001** `analyzeAudio` Server Action | confidence score 산출 → requiresHITL boolean | P0 | 명세대로 |
| **FR-C-002** `enqueueForReview` Server Action | requiresHITL=true → API-005 호출 | P1 | D4 Replace |
| **API-005** POST `/api/hitl/queue` | DB INSERT + Slack 웹훅 | P1 | 🔵 D4 Replace (Supabase Realtime → Slack + Studio) |
| **API-006** PATCH `/api/hitl/comment` | 전문가 코멘트 + groundTruthScore | P1 | 🔵 D4 Replace (Studio 1차 + PATCH fallback) |

→ Sprint 1 코어 8 정본 [[product/sources/TASKS-Sprint-1-Core-Detail]] / 의존 잔여 [[product/sources/TASKS-Sprint-1-Remaining-Detail]] / API 4종 [[product/sources/TASKS-API-Routes-MOCK-Dependencies]].

> ⚠️ **Sprint 1 합격 의존 고리**: Sprint 1은 FR-C-002 미구현 가능 (P1)이지만, **FR-C-001의 `requiresHITL=true` 응답까지는 검증 필수** (이후 API-005 등록은 P1 후속). API-005 자체는 Sprint 1 P1.

## D4 Descope (Realtime → Slack + Studio) — V05/V06 ADR-05 결합

V09 Quality 단계 (V0.9): Supabase Realtime 큐 + 어드민 페이지 가정.

PRD V10 + 67 MVP Descope (D4): **Realtime/어드민 → Slack 웹훅 + Supabase Studio 직접 UPDATE**.

| 영역 | V09 Quality (가정) | **V10 + D4 (실제)** |
|---|---|---|
| 큐 알림 | Supabase Realtime 구독 | **Slack 웹훅** |
| 코멘트 입력 | 자체 어드민 페이지 (HITL 대시보드) | **Supabase Studio SQL UPDATE 1차** + PATCH fallback |
| sync 메커니즘 | 어드민 페이지 → DB 호출 | **PostgreSQL 트리거** (Studio UPDATE → evaluation_results 자동 sync + audit_log INSERT) |
| 사용자 알림 | (PRD 미명시) | **Resend Free 100/일** |
| 비용 | (자체 인프라 운영) | **G2: Resend Free + Slack Free + Supabase Free** = $0/월 |

→ D4 Descope = **Sprint 1 핵심 단순화**. 운영 가이드: `docs/hitl-operations.md` (별도 정독 가치).

## Quality Gate — TEST-014 9 시나리오

P1 Phase 1 합격 게이트의 핵심 (가장 상세 100줄):

| # | 시나리오 | 검증 |
|---|---|---|
| 1 | confidence < 70 자동 등록 | DB INSERT + Slack 1건 + slaDueAt = +48h |
| 2 | **24h 임박** | Cron → 마스터 재활사 Slack DM 1건 + escalatedAt |
| 3 | **48h 초과** | status='escalated' + admin Critical Alert |
| 4 | **PostgreSQL 트리거 검증** | Studio UPDATE → evaluation_results.hitlReviewed=true 자동 sync |
| 5 | 사용자 알림 | Resend 발송 spy |
| 6 | **어뷰징 방어** (REQ-FUNC-034) | 동일 userId 월 4번째 dismissed → 자동 dismissed + CS 알림 |
| 7 | **루프백 데이터 누적** (REQ-FUNC-HITL-004) | groundTruthScore JSON → model_retraining_data |
| 8 | 멱등성 | 동일 queueId 재 PATCH → 1회 처리 |
| 9 | expertId 어뷰징 | 1일 51건 → admin 알림 (동일 expertId 과부하) |

→ TEST-014 = **HITL 시스템 회귀 보장 인프라**. 정본 [[product/sources/TASKS-TEST-Phase-0-1-2-Complete]] § TEST-014.

## REQ-FUNC 매핑 (SRS V06)

| REQ ID | 내용 | 구현 |
|---|---|---|
| REQ-FUNC-003 | confidence score 산출 | API-001 / FR-C-001 |
| REQ-FUNC-032 | requiresHITL=true 자동 큐 이관 | FR-C-002 + API-005 |
| REQ-FUNC-033 | 48h SLA 보장 | API-006 + Cron (FR-C-014) |
| REQ-FUNC-034 | 어뷰징 방어 (월 3회+ 동일 expertId / 4회+ 동일 userId) | API-006 + TEST-014 |
| **REQ-FUNC-HITL-001** | 즉시 이관 (Slack 웹훅 ≤2초) | API-005 |
| **REQ-FUNC-HITL-002** | expert_comment 의료 용어 자동 검증 (CON-04) | API-006 + ADR-04 정합 |
| **REQ-FUNC-HITL-003** | groundTruthScore 3축 (articulation/linguistic/acoustic) | API-006 |
| **REQ-FUNC-HITL-004** | 루프백 재학습 (model_retraining_data) | TEST-014 §7 |
| REQ-NF-012 | HITL 피드백 ≤ 48h | API-006 + Cron |

→ SRS V06 정본 [[product/sources/65-SRS-V06-Final]] § REQ-FUNC 61종 + HITL 4종 + REQ-NF 30종.

## 데이터 모델 — DB-009 hitl_queue 핵심 컬럼

```sql
CREATE TABLE hitl_queue (
  queueId         UUID PRIMARY KEY,
  sessionId       UUID NOT NULL,
  userId          UUID NOT NULL,           -- 어뷰징 방어 (월 4회 dismissed)
  expertId        UUID,                    -- 어뷰징 방어 (월 3회 동일 부모)
  
  status          VARCHAR(20) DEFAULT 'pending',  -- pending/completed/escalated/dismissed
  confidence      FLOAT NOT NULL,
  expertComment   TEXT,
  groundTruthScore JSONB,                  -- {articulation, linguistic, acoustic}
  
  slaDueAt        TIMESTAMP NOT NULL,      -- now + 48h (영업일 기준)
  escalatedAt     TIMESTAMP,               -- 24h 임박 또는 48h 초과 시
  slackNotified   BOOLEAN DEFAULT false,   -- graceful degradation
  
  createdAt       TIMESTAMP DEFAULT NOW(),
  updatedAt       TIMESTAMP DEFAULT NOW()
);

-- ⭐ PostgreSQL 트리거: Studio UPDATE → evaluation_results 자동 sync
CREATE OR REPLACE FUNCTION sync_hitl_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE evaluation_results
    SET hitlReviewed = true, expertCommentSnapshot = NEW.expertComment
    WHERE sessionId = NEW.sessionId;
    
    INSERT INTO audit_log (event, queueId, expertId, timestamp)
    VALUES ('hitl_completed', NEW.queueId, NEW.expertId, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_hitl_review
AFTER UPDATE OF status ON hitl_queue
FOR EACH ROW EXECUTE FUNCTION sync_hitl_review();
```

→ 정본 SRS V06 §6 ERD + DB-009 task 명세. ML 재학습 누적은 별도 `model_retraining_data` (REQ-FUNC-HITL-004 / 88 Task 미정규화 — 보강 필요).

## 4 인증 패턴 — HITL 영역 적용

| API | 인증 | 역할 |
|---|---|---|
| **API-005** POST `/api/hitl/queue` | **Bearer ${INTERNAL_API_SECRET}** | 내부 호출 (FR-C-002 → API-005) |
| **API-006** PATCH `/api/hitl/comment` | **Supabase Auth + RLS** | expert/admin 역할 |

→ 4 인증 패턴 정본 [[product/sources/TASKS-API-Routes-MOCK-Dependencies]] § "4 API 인증 패턴 정본".

## 비용 모델 — G2 Free Tier

| 도구 | 한도 | 용도 |
|---|---|---|
| **Slack Webhook** | Free 무제한 | 큐 알림 + 24h DM + 48h Critical Alert |
| **Supabase Studio** | Free (대시보드) | 전문가 1차 도구 — SQL UPDATE 직접 실행 |
| **PostgreSQL 트리거** | Free (Supabase 자체) | 자동 sync (evaluation_results + audit_log) |
| **Resend** | Free 100/일 | 사용자 "검토 완료" 이메일 |
| Sendgrid (옵션) | Free 100/일 | Resend Fallback |

→ HITL 시스템 운영비 = **$0/월** ([[product/concepts/MVP-descope-plan]] § "운영비 $30/월" 의 핵심 기여 영역).

## 임상 안전망 — Clinical 정합

| HITL 메커니즘 | 임상 정합 |
|---|---|
| **48h SLA** | [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 사설 센터의 "1주 단위 부모 상담"을 디지털 비동기로 구현 (1/3 단축) |
| **expertId 어뷰징 방어** (월 3회+ 동일 부모) | [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격제도의 임상 객관성 + 윤리 강령 디지털 운영 |
| **루프백 재학습** (groundTruthScore) | [[clinical/concepts/아동언어치료-핵심기법]] § 4기법 정밀화 → AI 모델 환류 |
| **groundTruthScore 3축** (articulation/linguistic/acoustic) | [[clinical/entities/U-TAP]] (조음) + [[clinical/entities/REVT]] (어휘) + [[clinical/entities/PRES]] (수용표현) 3 평가 도구의 디지털 단순화 |
| **사용자 알림 ≤48h** | Seg A "궁금증 빠른 해소" 인터뷰 근거 (V09 Quality §3) → 맘카페 회귀 차단 |

→ AI 자동화 95% + 인간 전문가 5% 하이브리드는 KSF #3 "비동기 코칭" 정합 ([[product/concepts/Key-Success-Factors]]).

## ADR 의존성

| ADR | HITL 영역 |
|---|---|
| **ADR-02 HITL 비동기 감수** | HITL 시스템의 정책 기반 |
| **ADR-03 7일 폐기** | hitl_queue.audioVectorUri 7일 후 삭제 (R4 + 음성 원본 개인정보) |
| **ADR-04 의료 용어 배제** | expert_comment 정규식 검증 (REQ-FUNC-HITL-002) |
| **ADR-05 Next.js 모놀리스** | API-005/006 = Route Handler |
| **ADR-06 Supabase BaaS** | hitl_queue + RLS + Studio 직접 도구 + PostgreSQL 트리거 |

→ ADR 정본 [[product/concepts/architecture-decisions]].

## D4 Descope 부활 조건

V05/V06에서 D4 도입 시 부활 조건 명시 없음. 본 정본에서 후보 제시:

- 일 큐 등록 수 > **20건** 지속 (Studio 운영 한계)
- 전문가 풀 > **10명** (Slack DM 분산 불가)
- 부모 이의제기 어드민 페이지 필요성 입증 (B2B PoC 30곳 이상)

→ MVP-descope-plan 정본 [[product/concepts/MVP-descope-plan]] § 8 Descope 부활 조건.

## 워크플로 패턴 — V09 Quality 4 원칙의 구현 진화

| 단계 | V09 Quality (PRD) | V10 + Sprint 1 (구현) |
|---|---|---|
| 자동 에스컬레이션 | "Confidence < 70 → 큐 이관" 추상 | API-005 + Slack 웹훅 + slaDueAt = +48h 구체 |
| 의료적 판단 회피 | "UI 정규식 스캐닝" | TEST-005 + ADR-04 정합 검증 |
| SLA 48h | "초과 시 마스터 재활사 강제 이관" | Cron (FR-C-014) + 24h 임박/48h escalated 2단계 + admin Critical Alert |
| 루프백 재학습 | "보정 레이블 환류" 추상 | model_retraining_data + 0.5%/500건/0.3% 3단계 게이트 + TEST-014 §7 |

→ "정성 → 정량" 진화 패턴은 V07-V08, V09-V09 Quality에서도 반복 ([[product/concepts/multi-llm-workflow]]).

## 보강 필요

- **`model_retraining_data` 테이블 스키마** ✅ 보강 완료 → [[product/concepts/HITL-retraining-pipeline]] (스키마 + 자동 INSERT 트리거 + 3 신규 task DB-NEW-MR-1/API-NEW-MR-1/MON-NEW-MR-1 5.5 SP + RACI + ADR-XX 후보).
- **0.5%/500건/0.3% 게이트의 운영 책임자** — ML Ops 담당자 + Slack/Cron 트리거. PRD V10 또는 별도 Runbook 가능.
- **`docs/hitl-operations.md`** (Supabase Studio 가이드) — 별도 정독 가치.
- **2026-08 이후 D4 부활 시점** — 큐 등록 수 모니터링 임계 + 부활 ADR 신규 작성.
- **HITL 사용자 (부모) 이의제기 UI** — 현 명세 미상. PRD V10 §3 "사용자 이의 제기 시" 구체 경로 필요.
- **expert pool 수급 정책** ([[product/sources/52-PRD-V09-Quality-Improvement]] D3 의존성) — 런칭 전 프리랜서 재활사 풀 구축 + 큐 지연 시 자동 할당/보상 룰.

## 출처

- [[product/sources/52-PRD-V09-Quality-Improvement]] § 3 HITL 4 원칙
- [[product/sources/TASKS-Sprint-1-Remaining-Detail]] § API-005
- [[product/sources/TASKS-API-Routes-MOCK-Dependencies]] § API-006 + PostgreSQL 트리거
- [[product/sources/TASKS-TEST-Phase-0-1-2-Complete]] § TEST-014 9 시나리오
- [[product/sources/65-SRS-V06-Final]] § REQ-FUNC 32~34 + REQ-FUNC-HITL-001~004 + REQ-NF-012
- [[product/concepts/architecture-decisions]] § ADR-02 HITL

## 관련 product 페이지

- [[product/concepts/architecture-decisions]] — ADR-02 HITL 정책 기반
- [[product/concepts/MVP-feature-spec]] — F6 (HITL 대시보드) Epic 정본
- [[product/concepts/MVP-descope-plan]] — D4 Descope (Realtime → Slack + Studio)
- [[product/concepts/task-breakdown-overview]] — 88 Task 인덱스의 HITL 영역
- [[product/concepts/tech-architecture]] — C-TEC-002 Server Actions/Route Handlers + C-TEC-003 Supabase

## Clinical cross-link 정합

- [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격제도 ~17,000명 = **HITL 전문가 풀 수급 인프라**
- [[clinical/concepts/아동언어치료-핵심기법]] § 4기법 = **expertComment 코멘트 작성 가이드라인** (전문가 운영 규약)
- [[clinical/entities/U-TAP]] + [[clinical/entities/REVT]] + [[clinical/entities/PRES]] = **groundTruthScore 3축의 임상 표준 도구** (디지털 단순화 대상)
