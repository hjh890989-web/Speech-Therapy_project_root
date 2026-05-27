-- ============================================================================
-- DB-017 (V07 신규) — F11 부모 음성 클로닝 모델 메타데이터
-- Refs: V07 §4.1 F11, REQ-FUNC-036/037, ADR-03 (7일 폐기), ADR-09 (윤리 차단).
-- ============================================================================
--
-- 배경:
-- - V07 의 §4.1 F11 부모 음성 클로닝 동화 — ElevenLabs TTS 가 발급한 voice ID 메타데이터.
-- - 7일 만료 Cron 이 expiresAt < now AND deletedAt IS NULL 조회 → ElevenLabs DELETE.
-- - 화이트리스트 (storybook / lullaby) 만 음성 적용 허용 — 교정 페이지 적용 0건 자동 검증.
--
-- 운영 적용 (사용자 측 수동, deploy 본 PR 미실행):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status  # drift 점검
--   3. npx prisma migrate deploy  # DIRECT_URL 사용
--   4. Supabase Studio SQL Editor 검증:
--        SELECT count(*) FROM information_schema.tables
--        WHERE table_schema='public' AND table_name='VoiceModel';
--      → 1 row.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "VoiceModel" (
  "id"                  UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"              TEXT         NOT NULL,
  "modelHash"           TEXT         NOT NULL,
  "label"               TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "expiresAt"           TIMESTAMP(3) NOT NULL,
  "appliedContentTypes" TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "deletedAt"           TIMESTAMP(3),

  CONSTRAINT "VoiceModel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VoiceModel_modelHash_key" UNIQUE ("modelHash")
);

CREATE INDEX IF NOT EXISTS "VoiceModel_userId_idx" ON "VoiceModel" ("userId");
CREATE INDEX IF NOT EXISTS "VoiceModel_expiresAt_idx" ON "VoiceModel" ("expiresAt");
CREATE INDEX IF NOT EXISTS "VoiceModel_userId_deletedAt_idx" ON "VoiceModel" ("userId", "deletedAt");

-- ============================================================================
-- 회귀 sentinel:
-- - User.id FK 는 application-level 만 (Prisma User relation 추후 추가 가능, 본 PR 범위 외).
-- - audit_log_triggers 적용은 별도 PR 검토 (VoiceModel 자체에 PII 부재 — 우선순위 낮음).
-- - 7일 폐기 Cron 은 FR-C-027 별도 PR 의 /api/cron/voice-model-cleanup 에서 처리.
-- ============================================================================
