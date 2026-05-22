-- ============================================================================
-- FR-C-014 잔여 (#37) — HITLQueue 수동 에스컬레이션 추적 컬럼.
-- Refs: REQ-FUNC-034 (HITL escalation), REQ-NF-019 (감사 추적), R4 (자녀 보호).
-- ============================================================================
--
-- 배경:
-- - 24h 자동 cron escalation (lib/hitl/escalation.ts) 은 escalatedAt 만 마킹.
-- - 본 PR 의 수동 escalate (admin button → PATCH /api/hitl/[id]/escalate) 는
--   _누가_ + _왜_ 추가 기록 필요 → 새 컬럼 2종 도입.
--
-- 컬럼 명세:
-- - escalatedBy: 수동/자동 escalation 주체 User.id.
--                자동 cron 시 NULL (cron secret 기반, user 부재).
-- - escalationReason: zod enum 'expert_judgment' | 'sla_at_risk' | 'duplicate'
--                     | 'manual' | 'auto_cron_24h'. nullable (기존 row 호환).
--
-- 마이그레이션 안전:
-- - 두 컬럼 모두 nullable + DEFAULT 없음 → 기존 row 즉시 호환, 0 backfill 필요.
-- - 인덱스 추가 없음 — escalatedBy 조회 빈도 낮음 (감사 로그 join 시에만).
--   향후 admin/escalations 페이지 도입 시 별도 PR 로 (createdAt, escalatedBy) index 추가.
--
-- 운영 적용 절차 (사용자 수동):
-- 1. cd Speech-Therapy_App
-- 2. npx prisma migrate status            # 본 migration pending 확인
-- 3. npx prisma migrate deploy            # DIRECT_URL 사용
-- 4. Supabase Studio SQL Editor 검증:
--      SELECT column_name, data_type, is_nullable
--      FROM information_schema.columns
--      WHERE table_name = 'HITLQueue'
--        AND column_name IN ('escalatedBy', 'escalationReason');
--    → 2 row 노출되어야 함 (둘 다 nullable=YES).
-- ============================================================================

ALTER TABLE "HITLQueue"
  ADD COLUMN IF NOT EXISTS "escalatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "escalationReason" TEXT;
