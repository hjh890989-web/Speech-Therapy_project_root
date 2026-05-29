---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C-HITL] FR-C-HITL-005: sync_retraining_data TRIGGER + R4 sanitize + F10 동의 Tier T4-a/b/c 적재"
labels: 'phase:p1, mode:active, domain:fr-c-hitl, epic:hitl-retraining, sprint:p1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-HITL-005
- **Epic / Story**: HITL 재학습 데이터 sync (V07 신규)
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음 (Phase 1+ 본격 활성)
- **목적**: `sync_retraining_data` PostgreSQL TRIGGER — `HITLQueue.groundTruthScore` UPDATE 시 `model_retraining_data` 자동 INSERT. (1) DB-013 `audit_sanitize_jsonb` 재사용으로 R4 sanitize 강제, (2) F10 동의 Tier T4-a/b/c 만 적재 (T1~T3 skip), (3) `diffPct` 자동 계산. ADR-11 RACI 의 1단계 "system (TRIGGER)" 책임.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §5.3 재학습 파이프라인 (Wiki HITL-retraining-pipeline 흡수)
  - §5.3.2 `sync_retraining_data` PostgreSQL TRIGGER
  - §5.3.4 RACI 1단계 — system (TRIGGER) R 책임
  - REQ-FUNC-HITL-005 (재학습 데이터 자동 INSERT 트리거)
  - ADR-11 (HITL 재학습 파이프라인)
  - R4 (영유아 개인정보 보호)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-C FR-C-HITL-005
- **선행 DB 명세**: [`TASK_DB-016.md`](TASK_DB-016.md) (model_retraining_data 스키마)

## ✅ Task Breakdown
- [ ] `prisma/migrations/20260601000000_add_model_retraining_data/migration.sql` 에 함수 정의 추가:
  - `sync_retraining_data()` PL/pgSQL 함수:
    1. `NEW.groundTruthScore IS NOT NULL AND OLD.groundTruthScore IS NULL` 조건 가드
    2. `EvaluationResult` 조회 → `aiScore` JSONB 추출 (sessionId 매칭)
    3. `diffPct = ABS((NEW.groundTruthScore->>'articulation')::float - (aiScore->>'articulation')::float)`
    4. `User.consentTier` 조회 → `T4-a` / `T4-b` / `T4-c` 만 다음 단계 진행, 외 case 는 `RAISE NOTICE` 후 RETURN NEW (INSERT skip)
    5. `audit_sanitize_jsonb(NEW.groundTruthScore)` 호출로 R4 sanitize 적용 → sanitized JSONB 획득
    6. `INSERT INTO model_retraining_data (sessionId, aiScore, groundTruthScore, expertId, diffPct, consentTier, sanitized, createdAt) VALUES (...)` — sanitized=true 명시
- [ ] TRIGGER 정의:
  ```sql
  CREATE TRIGGER sync_retraining_data_trigger
  AFTER UPDATE OF "groundTruthScore" ON "HITLQueue"
  FOR EACH ROW
  WHEN (NEW."groundTruthScore" IS NOT NULL AND OLD."groundTruthScore" IS DISTINCT FROM NEW."groundTruthScore")
  EXECUTE FUNCTION sync_retraining_data();
  ```
- [ ] migration 작성 + Supabase Studio SQL Editor prod 적용 (INFRA-008 패턴)
- [ ] `pg_trigger` + `pg_proc` 검증 SQL — 함수/트리거 실제 존재 확인
- [ ] `lib/hitl/retraining.ts` helper — 단위 테스트 진입점 (mock DB transaction)
- [ ] expert UPDATE → AuditLog (DB-013) + model_retraining_data 동시 발생 검증

## 🧪 Acceptance Criteria (BDD/GWT — REQ-FUNC G/W/T 인용)
**Scenario 1: 정상 expert 보정 → 자동 INSERT (REQ-FUNC-HITL-005)**
- **Given**: HITLQueue row, groundTruthScore NULL, User.consentTier='T4-a'
- **When**: expert 가 groundTruthScore UPDATE
- **Then**: model_retraining_data INSERT 1건, sanitized=true, diffPct 계산 완료 (예: 0.7%), expertId/sessionId 정확

**Scenario 2: F10 미동의 (T1/T2/T3) → skip**
- **Given**: User.consentTier='T2', expert UPDATE 발생
- **When**: TRIGGER 발화
- **Then**: model_retraining_data INSERT 0건, RAISE NOTICE 로그만 (silent skip)

**Scenario 3: R4 sanitize — 인명 [REDACTED] 치환**
- **Given**: groundTruthScore JSONB 에 `{"expertComment": "홍길동 어머님 자녀 발화"}` 포함
- **When**: TRIGGER 실행 (consentTier='T4-a')
- **Then**: model_retraining_data.groundTruthScore.expertComment 내 인명 토큰이 `[REDACTED]` 치환 (audit_sanitize_jsonb 재사용 확인)

**Scenario 4: diffPct 임계치 계산**
- **Given**: aiScore.articulation=80.0, groundTruthScore.articulation=85.0
- **When**: TRIGGER 계산
- **Then**: diffPct = |80-85| = 5.0 (FR-C-HITL-006 의 게이트 1 검증 입력값)

**Scenario 5: groundTruthScore IS NULL 유지 시 — TRIGGER no-op**
- **Given**: HITLQueue UPDATE 가 status 만 변경, groundTruthScore=NULL 유지
- **When**: TRIGGER WHEN 절 평가
- **Then**: INSERT 0건 (불필요 발화 차단)

**Scenario 6: 멱등성 — 동일 sessionId 재INSERT 차단**
- **Given**: 이미 model_retraining_data 에 sessionId='s1' row 존재
- **When**: expert 가 groundTruthScore 재UPDATE
- **Then**: UNIQUE constraint 위반 → ON CONFLICT DO NOTHING 또는 UPDATE (정책에 따라)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-HITL-005**: 재학습 데이터 자동 INSERT 트리거 (system R 책임)
- **ADR-11**: HITL 재학습 파이프라인 RACI — 1단계 system (TRIGGER)
- **횡단 제약**:
  - [ ] **R4 sanitize**: TRIGGER 내부 `audit_sanitize_jsonb` 호출 의무 (자녀 식별 정보 0건)
  - [ ] **CON-04 금칙어**: expertComment 의 의료 금칙어는 별도 검증 (FR-C-005 또는 사전 차단)
  - [ ] **CON-03 7일 폐기**: 본 테이블은 영구 보관 (보정 데이터 — raw audio 없음, F10 T4 동의 기반)
  - [ ] **F10 동의 Tier**: T4-a/b/c 만 적재 (T1~T3 IRB 미동의 → skip)
  - [ ] **G2 비용**: TRIGGER 는 Postgres 내부, Vercel function 호출 0건

## 🏁 Definition of Done
- [ ] migration `20260601000000_add_model_retraining_data` Supabase Studio prod 적용 성공
- [ ] `pg_proc` 에 `sync_retraining_data` 함수 존재 검증
- [ ] `pg_trigger` 에 `sync_retraining_data_trigger` 등록 검증
- [ ] expert 1명 보정 시 row INSERT 단위 테스트 (`__tests__/integration/hitl-retraining.test.ts`)
- [ ] F10 T1 미충족 시 skip 검증 (RAISE NOTICE 로그 확인)
- [ ] R4 sanitize 검증 — 인명 키 `[REDACTED]` 치환 (audit_sanitize_jsonb 재사용)
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-HITL-005 + ADR-11 + R4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-016 (model_retraining_data 스키마), DB-013 (audit_sanitize_jsonb 재사용), DB-009 (HITLQueue), DB-005 (EvaluationResult), DB-015 (User.consentTier column — F10 T1~T4)
- **Blocks**: FR-C-HITL-006 (3 게이트 Cron 의 INSERT 결과 입력), FR-C-HITL-007 (다양성 모니터링의 row 통계 원본), TEST-022 (3 게이트 단위 테스트)
- **Discope 영향**: 해당 없음 (Phase 1+ 본격 활성)

---

## 📌 2026-05-29 구현 상태 조사 (workflow `whs18oh77`, 4축 병렬 + 직접 검증)

> wiki 방향성 검토의 "HITL 재학습 = skeleton only" 는 **부정확**. 빌드는 거의 완성, 실제 미완은 데이터 수집 1점.

### ✅ 이미 빌드+테스트 완료 (명세 대비)
- 3게이트 로직: [`lib/hitl/retraining-gate.ts`](../lib/hitl/retraining-gate.ts) `evaluateRetrainingGate` + 임계상수(diffPct≥0.5% / cumulative≥500 / HHI≤0.3) + TEST-022 8건.
- expert 다양성: [`lib/hitl/expert-diversity.ts`](../lib/hitl/expert-diversity.ts) HHI/Gini + Phase1/2 판정 + 8건.
- cron route: [`app/api/cron/hitl-retraining-gate/route.ts`](../app/api/cron/hitl-retraining-gate/route.ts) + 통합 7건. external-crons.yml 스케줄 등록(`30 3 * * *`).
- TRIGGER: [`migration 20260527180000`](../prisma/migrations/20260527180000_add_model_retraining_data/migration.sql) `sync_retraining_data` (AFTER UPDATE OF groundTruthScore) + diffPct + R4 sanitize.

### 🔴 검증된 결함 2 (보류 사유)
1. **데이터 수집 no-op (CONFIRMED)**: [`lib/hitl/admin-actions.ts:72-96`](../lib/hitl/admin-actions.ts#L72) `submitExpertComment` 가 `correctedScore` 만 UPDATE, **`groundTruthScore`(3축) 미기록**. TRIGGER 는 `AFTER UPDATE OF groundTruthScore` 라 영원히 발화 안 함 → `model_retraining_data` 0건 → 게이트/다양성/cron 전부 빈 입력. **이 task(005)의 Scenario 1·Task Breakdown #5 가 미구현** (TRIGGER SQL 은 있으나 입력 경로 부재).
2. **R4 결합 (CONFIRMED)**: migration.sql:124-125 `v_consent_tier := 'T4-c'` **하드코딩** (`User.f10ResearchConsentTier`/`consentTier` 컬럼 부재 — DB-015 미반영). 본 task Scenario 2(T1~T3 skip)·Task Breakdown #4 미구현. → groundTruthScore 를 그냥 배선하면 **F10 미동의 데이터까지 T4-c 로 적재 = PIPA/R4 위반**.

### ⛔ 결론 — 보류 (2026-05-29 admin 결정)
- 안전 수집 활성화 = **(a) groundTruthScore 배선 + (b) `User.consentTier` 컬럼(DDL) + (c) TRIGGER 분기(미동의 skip)** 가 한 묶음. 그러나 동의를 *실제로 받는* F10 연구동의 인프라가 부재 → 지금 배선해도 수집 0건(동면) + DDL/PIPA surface 증가.
- **→ 데이터 수집 활성화는 F10 연구동의(PIPA) 트랙과 함께 설계·구현.** 본 조사 시점엔 보류. (게이트/다양성/TRIGGER 빌드는 그대로 자산.)
- 잔여 gap 상세(멱등성 가드 / expert-diversity 별도 cron / admin 모니터링 페이지 / getCurrentPhase ADR-13 / system_config 테이블 부재)는 FR-C-HITL-006/007 에 동일 보류 적용.
