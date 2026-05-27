-- ============================================================================
-- DB-016 + FR-C-HITL-005 (V07 신규) — HITL 재학습 데이터 적재 + TRIGGER
-- Refs: V07 §5.3 (재학습 파이프라인), REQ-FUNC-HITL-005/006, ADR-11, R4.
-- ============================================================================
--
-- 배경:
-- - V07 의 §5.3 HITL 재학습 파이프라인 — expert 가 groundTruthScore 보정 후
--   AI 모델 재학습 자동 트리거 (3 게이트: diffPct ≥ 0.5% + cumulative ≥ 500 + HHI ≤ 0.3).
-- - 본 PR 은 _데이터 적재 layer_ — 3 게이트 검증 Cron 은 FR-C-HITL-006 별도 PR.
--
-- 구조:
--   1) "ModelRetrainingData" 테이블 — Prisma model 정합 (id / sessionId / aiScore /
--      groundTruthScore / expertId / diffPct / consentTier / sanitized / createdAt)
--   2) sync_retraining_data() 함수 — HITLQueue.groundTruthScore IS NOT NULL UPDATE 시
--      자동 INSERT. R4 sanitize 통과 + F10 consent Tier 미충족 row skip.
--   3) TRIGGER `sync_retraining_data_trigger` — HITLQueue AFTER UPDATE.
--
-- F10 동의 Tier 분기 (V07 §5.3.2):
--   - 현재 User 에 `f10ResearchConsentTier` 컬럼 부재 — 본 PR 은 default "T4-c" 적재.
--   - 추후 F10 PR 에서 User.f10ResearchConsentTier 컬럼 + TRIGGER 분기 추가.
--   - 본 sanitized=true row 만 외부 ML 위탁 (FR-C-HITL-006).
--
-- R4 (자녀 보호) sanitize:
--   - aiScore / groundTruthScore JSONB 의 의심 키 [REDACTED] 강제 치환.
--   - audit_sanitize_jsonb 함수 재사용 (20260522210000_audit_log_triggers PR).
--
-- 운영 적용 (사용자 측 수동, deploy 본 PR 미실행):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status      # drift 점검 — 본 migration pending 확인
--   3. npx prisma migrate deploy      # DIRECT_URL 사용
--   4. Supabase Studio SQL Editor 검증:
--        SELECT proname FROM pg_proc WHERE proname = 'sync_retraining_data';
--        SELECT tgname FROM pg_trigger WHERE tgname = 'sync_retraining_data_trigger';
--      → 1 함수 + 1 TRIGGER 노출.
-- ============================================================================

-- ============================================================================
-- 1) ModelRetrainingData 테이블 + 인덱스
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ModelRetrainingData" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "sessionId"        TEXT         NOT NULL,
  "aiScore"          JSONB        NOT NULL,
  "groundTruthScore" JSONB        NOT NULL,
  "expertId"         TEXT         NOT NULL,
  "diffPct"          DOUBLE PRECISION NOT NULL,
  "consentTier"      TEXT         NOT NULL,
  "sanitized"        BOOLEAN      NOT NULL DEFAULT FALSE,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "ModelRetrainingData_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ModelRetrainingData_sessionId_key" UNIQUE ("sessionId")
);

CREATE INDEX IF NOT EXISTS "ModelRetrainingData_createdAt_idx"
  ON "ModelRetrainingData" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ModelRetrainingData_expertId_createdAt_idx"
  ON "ModelRetrainingData" ("expertId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ModelRetrainingData_diffPct_idx"
  ON "ModelRetrainingData" ("diffPct");

-- ============================================================================
-- 2) sync_retraining_data() — HITLQueue UPDATE 시 자동 INSERT 함수
-- ============================================================================
--
-- 동작:
-- 1) NEW.groundTruthScore IS NOT NULL AND OLD.groundTruthScore IS DISTINCT FROM
--    NEW.groundTruthScore — 보정 신규/변경 시에만 발화.
-- 2) EvaluationResult 조회 → aiScore (3축 + peerPercentile + confidence) 추출.
-- 3) diffPct 계산 — articulationScore 기준 (groundTruth - ai) / ai × 100 절댓값.
-- 4) F10 consentTier 임시 default "T4-c" (User 컬럼 추가 후 분기).
-- 5) audit_sanitize_jsonb 통과 후 INSERT — sanitized=true.
-- 6) ON CONFLICT(sessionId) DO UPDATE — 보정 재발생 (expert 가 두 번째 수정) 시 갱신.

CREATE OR REPLACE FUNCTION sync_retraining_data()
RETURNS TRIGGER AS $$
DECLARE
  v_ai_score         JSONB;
  v_ai_articulation  DOUBLE PRECISION;
  v_gt_articulation  DOUBLE PRECISION;
  v_diff_pct         DOUBLE PRECISION;
  v_expert_id        TEXT;
  v_consent_tier     TEXT;
BEGIN
  -- (1) 보정 신규/변경만 처리.
  IF NEW."groundTruthScore" IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD."groundTruthScore" IS NOT DISTINCT FROM NEW."groundTruthScore" THEN
    RETURN NEW;
  END IF;

  -- (2) EvaluationResult 의 aiScore 추출.
  SELECT jsonb_build_object(
    'articulation',   "articulationScore",
    'linguistic',     "linguisticScore",
    'acoustic',       "acousticScore",
    'peerPercentile', "peerPercentile",
    'confidence',     "confidence"
  )
  INTO v_ai_score
  FROM "EvaluationResult"
  WHERE "sessionId" = NEW."sessionId";

  -- EvaluationResult 미존재 (race condition) — skip.
  IF v_ai_score IS NULL THEN
    RETURN NEW;
  END IF;

  -- (3) diffPct = |gt.articulation - ai.articulation| / ai.articulation × 100.
  v_ai_articulation := (v_ai_score->>'articulation')::DOUBLE PRECISION;
  v_gt_articulation := (NEW."groundTruthScore"->>'articulation')::DOUBLE PRECISION;
  IF v_ai_articulation IS NULL OR v_gt_articulation IS NULL OR v_ai_articulation = 0 THEN
    v_diff_pct := 0;
  ELSE
    v_diff_pct := ABS(v_gt_articulation - v_ai_articulation) / v_ai_articulation * 100;
  END IF;

  -- (4) expertId — reviewedBy 우선 (admin 대리 검토 fallback), 미설정 시 assignedExpertId.
  v_expert_id := COALESCE(NEW."reviewedBy", NEW."assignedExpertId", 'system');

  -- (5) F10 consentTier — 임시 default. User.f10ResearchConsentTier 컬럼 추가 후 분기.
  v_consent_tier := 'T4-c';

  -- (6) sanitized INSERT — ON CONFLICT 재발생 분기.
  INSERT INTO "ModelRetrainingData" (
    "id", "sessionId", "aiScore", "groundTruthScore",
    "expertId", "diffPct", "consentTier", "sanitized", "createdAt"
  ) VALUES (
    gen_random_uuid(),
    NEW."sessionId",
    audit_sanitize_jsonb(v_ai_score),
    audit_sanitize_jsonb(NEW."groundTruthScore"),
    v_expert_id,
    v_diff_pct,
    v_consent_tier,
    TRUE,
    now()
  )
  ON CONFLICT ("sessionId") DO UPDATE
    SET "groundTruthScore" = EXCLUDED."groundTruthScore",
        "diffPct"          = EXCLUDED."diffPct",
        "expertId"         = EXCLUDED."expertId",
        "sanitized"        = EXCLUDED."sanitized",
        "createdAt"        = EXCLUDED."createdAt";

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3) TRIGGER 등록 — HITLQueue 의 groundTruthScore 변경 추적
-- ============================================================================

DROP TRIGGER IF EXISTS sync_retraining_data_trigger ON "HITLQueue";
CREATE TRIGGER sync_retraining_data_trigger
  AFTER UPDATE OF "groundTruthScore" ON "HITLQueue"
  FOR EACH ROW
  EXECUTE FUNCTION sync_retraining_data();

-- ============================================================================
-- 회귀 sentinel:
-- - audit_sanitize_jsonb (20260522210000_audit_log_triggers) 가 선행 필요.
-- - F10 consentTier 컬럼 추가는 별도 PR (User.f10ResearchConsentTier).
-- - 3 게이트 검증 Cron (FR-C-HITL-006) 은 별도 PR.
-- - expert HHI/Gini 다양성 (FR-C-HITL-007) 은 별도 PR.
-- ============================================================================
