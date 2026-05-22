-- ============================================================================
-- DB-008b 보완 — RewardLog RLS 정책 (Sprint 2 누락 보완, SEC-002 발견)
-- Refs: REQ-NF-019 RBAC + REQ-NF-SEC 사용자 격리.
-- ============================================================================
--
-- 배경:
-- - DB-008b (20260514120000_add_reward_log) 가 enable_rls_policies (20260512123555) 보다
--   후행 추가됨 → RewardLog 가 RLS 비활성 상태로 운영 위험 (cross-user reward 조회 가능).
-- - SEC-002 #72 (commit 227fb7f) 의 sentinel test 가 발견 → 본 PR 로 즉시 보완.
-- - 정책 패턴: RewardProgress (rewards_select_own / rewards_modify_own) 동등 적용.
--
-- 명명 규약:
-- - "reward_log_select_own" — table 명 매핑 (rewards_* 는 RewardProgress 가 점유)
-- - SELECT + INSERT 만 정책 정의 (RewardLog 는 append-only audit log, UPDATE/DELETE 기본 거부)
-- - service_role 키는 RLS 우회 (Cron 정리 / admin 감사용)
-- ============================================================================

ALTER TABLE "RewardLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reward_log_select_own" ON "RewardLog"
  FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "reward_log_insert_own" ON "RewardLog"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- UPDATE / DELETE 는 정책 미정의 → 기본 거부 (REQ-FUNC-024 idempotent append-only 보장).
-- service_role 만 우회 가능.
