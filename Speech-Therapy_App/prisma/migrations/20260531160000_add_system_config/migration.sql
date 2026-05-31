-- ============================================================================
-- ADR-13 — SystemConfig (런타임 키-밸류 토글 + 멱등성 타임스탬프)
-- Refs: ADR-13 (getCurrentPhase 하이브리드), FR-C-HITL-006 (재학습 멱등성), FR-C-HITL-007 (다양성 phase).
-- ============================================================================
--
-- 배경:
-- - HITL 재학습/다양성 Cron 의 멱등성 가드 — 마지막 트리거/알림 시각 저장 (7일 내 재발화 차단).
-- - 운영 phase 토글 (phase1/phase2) — lib/config/system-config.ts getCurrentPhase 의 DB 소스.
-- - 값은 문자열 (ISO 타임스탬프 / 'phase1'|'phase2' / 'true'|'false').
--
-- R4: 운영 설정만 저장 — 사용자/자녀 식별 정보 0건.
--
-- 운영 적용 (사용자 측 수동, deploy 본 PR 미실행):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status   # drift 점검
--   3. npx prisma migrate deploy   # DIRECT_URL 사용
--   4. 검증: SELECT count(*) FROM information_schema.tables
--            WHERE table_schema='public' AND table_name='SystemConfig';  -- 1 row
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SystemConfig" (
  "key"       TEXT         NOT NULL,
  "value"     TEXT         NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);
