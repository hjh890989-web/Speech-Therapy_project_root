---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-016: model_retraining_data + sync_retraining_data TRIGGER (HITL 재학습)"
labels: 'phase:p1, mode:active, domain:db, epic:hitl, sprint:p1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-016
- **Epic / Story**: HITL 재학습 (V07 신규)
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음 (Phase 1+ 본격 활성)
- **목적**: 전문가 보정 데이터의 자동 적재 — HITLQueue.groundTruthScore UPDATE 시 PostgreSQL TRIGGER 가 `model_retraining_data` 에 INSERT. 3 게이트 (diffPct ≥ 0.5% + cumulative ≥ 500 + HHI ≤ 0.3) 통과 시만 위탁 ML 엔지니어 알림 (ADR-11).

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §5.3 재학습 파이프라인 (Wiki HITL-retraining-pipeline 흡수)
  - §5.3.1 model_retraining_data 스키마
  - §5.3.2 sync_retraining_data PostgreSQL TRIGGER
  - REQ-FUNC-HITL-005 (재학습 데이터 자동 INSERT 트리거)
  - ADR-11 (HITL 재학습 파이프라인)
- **ERD**: V07 §6.1.2 — model_retraining_data

## ✅ Task Breakdown
- [ ] `prisma/schema.prisma` 에 `ModelRetrainingData` model 추가:
  - `sessionId String @unique` (FK to EvaluationResult)
  - `aiScore Json` (3축 + peerPercentile)
  - `groundTruthScore Json` (expert 보정)
  - `expertId String` (FK to User)
  - `diffPct Float` (AI ↔ expert 점수 차이 %)
  - `consentTier String` (F10 T1~T4)
  - `sanitized Boolean @default(false)` (R4 적용 여부)
  - `createdAt DateTime @default(now())`
- [ ] `@@index([createdAt(sort: Desc)])` + `@@index([expertId, createdAt])` 인덱스
- [ ] `sync_retraining_data()` 함수 — HITLQueue.groundTruthScore IS NOT NULL UPDATE 시 trigger:
  1. EvaluationResult 조회 → aiScore 추출
  2. diffPct 계산 = |aiScore.articulation - groundTruthScore.articulation| / aiScore.articulation × 100
  3. F10 동의 Tier 확인 (T4-a/b/c 만 INSERT) — User 의 consentTier column 활용
  4. R4 sanitize 후 (audit_sanitize_jsonb 재사용) INSERT
- [ ] TRIGGER `AFTER UPDATE OF "groundTruthScore" ON "HITLQueue" FOR EACH ROW EXECUTE FUNCTION sync_retraining_data()`
- [ ] migration `20260601000000_add_model_retraining_data` 작성 + Supabase Studio 적용

## 🧪 Acceptance Criteria
**Scenario 1: expert 보정 시 자동 INSERT (REQ-FUNC-HITL-005)**
- **Given**: HITLQueue row 의 groundTruthScore NULL → expert UPDATE
- **When**: TRIGGER 발화
- **Then**: model_retraining_data INSERT 1건 (sanitized=true, diffPct 계산 완료)

**Scenario 2: F10 동의 미충족 시 skip (REQ-FUNC-HITL-005)**
- **Given**: 사용자 consentTier = T1 (재학습 미동의)
- **When**: expert UPDATE → TRIGGER 발화
- **Then**: model_retraining_data INSERT skip (consent 미충족 로그만)

**Scenario 3: R4 sanitize 검증**
- **Given**: groundTruthScore JSONB 에 `expertComment: "홍길동 어머님이..."` 포함
- **When**: TRIGGER sanitize
- **Then**: comment 내 인명 `[REDACTED]` 치환 (audit_sanitize_jsonb 재사용)

## ⚙️ Technical & Non-Functional Constraints
- **ADR-11**: HITL 재학습 파이프라인 — 3 게이트 통과 시만 실 재학습
- **REQ-FUNC-HITL-006**: 재학습 3 게이트 (0.5% / 500건 / 0.3% HHI)
- **횡단 제약**:
  - [ ] R4 sanitize: TRIGGER 내부 호출 의무
  - [ ] CON-03 7일 폐기: 본 테이블은 영구 보관 (보정 데이터, raw audio 없음)
  - [ ] F10 동의 Tier: T4-a/b/c 만 적재

## 🏁 Definition of Done
- [ ] Prisma migration 성공 (dev + prod)
- [ ] TRIGGER + 함수 `pg_proc` 검증
- [ ] expert 1명 보정 시 row INSERT 단위 테스트
- [ ] F10 T1 미충족 시 skip 검증
- [ ] `tsc --strict` 0 errors
- [ ] §5.3 정합성 — diffPct / consentTier / sanitized 컬럼 정확성

## 🚧 Dependencies & Blockers
- **Depends on**: DB-009 (HITLQueue), DB-005 (EvaluationResult), DB-013 (audit_sanitize_jsonb 재사용), F10 consent T1~T4 정의
- **Blocks**: FR-C-HITL-005 (sync_retraining_data TRIGGER 활용), FR-C-HITL-006 (3 게이트 Cron), TEST-022 (3 게이트 단위 테스트)
- **Discope 영향**: 해당 없음 (Phase 1+ 본격 활성)
