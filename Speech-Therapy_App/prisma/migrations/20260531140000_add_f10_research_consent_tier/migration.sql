-- ============================================================================
-- F10 연구동의 Tier (Lean) — User.f10ResearchConsentTier + sync_retraining_data 게이팅
-- Refs: SRS §5.3 (재학습), ADR-15(IRB), 20260527180000_add_model_retraining_data 의 TODO(line 19-20,124-125).
-- ============================================================================
--
-- 배경(no-regret 컴플라이언스 fix):
-- - 기존 sync_retraining_data TRIGGER 는 consentTier 를 'T4-c' 로 하드코딩 → HITL 보정 데이터가
--   *실제 동의와 무관하게* T4-c(최고 연구동의)로 적재되는 잠재 컴플라이언스 갭.
-- - 본 PR: (1) User.f10ResearchConsentTier 컬럼 신설, (2) TRIGGER 가 대상(subject) 부모의 실제 tier 를
--   조회해 **연구 동의(T4-a/b/c) 미충족 시 INSERT skip** + 실제 tier 적재.
-- - 동의 수집 UI(부모 tier 선택/철회)는 후속(Full PR). 본 Lean 은 컬럼 + TRIGGER 게이팅만.
--
-- 게이팅 규칙(보수적 = over-protective no-regret):
-- - T4-a / T4-b / T4-c (연구 동의) → 재학습 적재 허용(실제 tier 로 표기).
-- - NULL / T1 / T2 / T3 → skip(재학습 미적재).
-- - ⚠️ 스펙 모호: SRS §5.3 DDL(line 1030)은 "T4-a/b/c 미동의 시 skip"(T4 기준)인데, tier 의미상
--   T3=내부 모델개선이라 T3 가 재학습 동의로 읽힐 여지. 보수적 T4 채택 — 스펙 저자 확정 시 T3 으로 loosen 가능.
--
-- 기존 row: 본 마이그레이션은 과거 'T4-c' 적재 row 를 backfill/삭제하지 않음(pre-launch 실데이터 ~0 가정).
--   철회 시 즉시 제거(ADR-15)는 Full PR(동의 UI)에서 처리.
--
-- ⚠️ 운영 적용 (사용자 측 수동):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status
--   3. npx prisma migrate deploy   # DIRECT_URL
--   4. 검증: SELECT column_name FROM information_schema.columns
--            WHERE table_name='User' AND column_name='f10ResearchConsentTier';  -- 1 row
-- ============================================================================

-- (1) User 컬럼 — nullable(default NULL = 연구 미동의).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "f10ResearchConsentTier" TEXT;

-- (2) sync_retraining_data() 재정의 — 하드코딩 tier 제거 + 실제 tier 조회·게이팅.
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

  -- (1.5) F10 연구동의 게이트 — 대상(subject) 부모의 실제 동의 Tier 조회(하드코딩 'T4-c' 해소).
  --   보수적 게이팅: T4-a/b/c 만 재학습 적재. NULL/T1/T2/T3 → skip(연구 미동의 데이터 미적재).
  SELECT "f10ResearchConsentTier" INTO v_consent_tier
  FROM "User" WHERE "id" = NEW."userId";

  IF v_consent_tier IS NULL OR v_consent_tier NOT IN ('T4-a', 'T4-b', 'T4-c') THEN
    RETURN NEW; -- 연구 동의 미충족 — 재학습 적재 skip.
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

  -- (4) expertId — reviewedBy 우선(admin 대리 검토 fallback), 미설정 시 assignedExpertId.
  v_expert_id := COALESCE(NEW."reviewedBy", NEW."assignedExpertId", 'system');

  -- (5) sanitized INSERT — consentTier = 실제 동의 tier(v_consent_tier).
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
        "consentTier"      = EXCLUDED."consentTier",
        "sanitized"        = EXCLUDED."sanitized",
        "createdAt"        = EXCLUDED."createdAt";

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER 등록은 기존(20260527180000) 그대로 — 함수만 교체(CREATE OR REPLACE).
