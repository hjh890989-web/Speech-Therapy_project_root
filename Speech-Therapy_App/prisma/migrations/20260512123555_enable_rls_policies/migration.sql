-- ============================================================================
-- DB-011: Row Level Security (RLS) 정책 + Audit Log 활성화
-- Refs: REQ-NF-019 RBAC + B2B 다중 테넌트 격리.
-- ============================================================================
--
-- 적용 모델:
-- - 모든 테이블에 RLS 활성화 (anon/authenticated 키로 접근 시 정책 통과 필수)
-- - User.id 는 Prisma String 으로 저장되지만 Supabase auth.uid() 는 uuid 반환
--   → 비교 시 auth.uid()::text = id 패턴 사용
-- - service_role 키는 RLS 우회 (관리·시드·Cron 용)
-- ============================================================================

-- ============================================================================
-- 1) 모든 테이블 RLS 활성화
-- ============================================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Institution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissionCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WeeklyReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RewardProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HITLQueue" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2) User — 본인 row 만 조회/수정
-- ============================================================================

CREATE POLICY "users_select_own" ON "User"
  FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "users_update_own" ON "User"
  FOR UPDATE
  USING (auth.uid()::text = id);

-- INSERT 는 회원가입 트리거 (Supabase Auth → User row 생성)가 service_role 로 처리.

-- ============================================================================
-- 3) Institution — 본인 소속 기관만 조회 (parent/teacher/principal)
-- ============================================================================

CREATE POLICY "institutions_select_own" ON "Institution"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User"."institutionId" = "Institution".id
    )
  );

-- principal 만 본인 기관 UPDATE 가능 (이름·로고 수정 등).
CREATE POLICY "institutions_update_principal" ON "Institution"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User"."institutionId" = "Institution".id
        AND "User".role = 'principal'
    )
  );

-- ============================================================================
-- 4) Class — 같은 기관 사용자만 조회. teacher/principal 만 수정
-- ============================================================================

CREATE POLICY "classes_select_same_institution" ON "Class"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User"."institutionId" = "Class"."institutionId"
    )
  );

CREATE POLICY "classes_modify_staff" ON "Class"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User"."institutionId" = "Class"."institutionId"
        AND "User".role IN ('teacher', 'principal')
    )
  );

-- ============================================================================
-- 5) SessionLog — 본인 row 만 (parent), expert/admin 은 service_role 통해 우회
-- ============================================================================

CREATE POLICY "sessions_select_own" ON "SessionLog"
  FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "sessions_insert_own" ON "SessionLog"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- ============================================================================
-- 6) EvaluationResult — 본인 row 조회. HITL expert 는 본인에게 할당된 큐 row 만
-- ============================================================================

CREATE POLICY "evaluations_select_own" ON "EvaluationResult"
  FOR SELECT
  USING (
    auth.uid()::text = "userId"
    OR EXISTS (
      SELECT 1 FROM "HITLQueue"
      WHERE "HITLQueue"."sessionId" = "EvaluationResult"."sessionId"
        AND "HITLQueue"."assignedExpertId" = auth.uid()::text
    )
  );

CREATE POLICY "evaluations_insert_own" ON "EvaluationResult"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- ============================================================================
-- 7) MissionCard — 모든 authenticated 사용자 조회 가능, 관리는 admin only
-- ============================================================================

CREATE POLICY "missions_select_authenticated" ON "MissionCard"
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "missions_modify_admin" ON "MissionCard"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User".role = 'admin'
    )
  );

-- ============================================================================
-- 8) WeeklyReport — 본인만
-- ============================================================================

CREATE POLICY "reports_select_own" ON "WeeklyReport"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- INSERT/UPDATE 는 Vercel Cron (service_role) 만.

-- ============================================================================
-- 9) RewardProgress — 본인만
-- ============================================================================

CREATE POLICY "rewards_select_own" ON "RewardProgress"
  FOR SELECT
  USING (auth.uid()::text = "userId");

CREATE POLICY "rewards_modify_own" ON "RewardProgress"
  FOR ALL
  USING (auth.uid()::text = "userId");

-- ============================================================================
-- 10) HITLQueue — subject(parent) 본인 큐, expert 본인 할당 큐, admin 전체
-- ============================================================================

CREATE POLICY "hitl_select_visible" ON "HITLQueue"
  FOR SELECT
  USING (
    auth.uid()::text = "userId"
    OR auth.uid()::text = "assignedExpertId"
    OR EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User".role = 'admin'
    )
  );

-- expert 만 본인 할당 row UPDATE (코멘트 추가).
CREATE POLICY "hitl_update_assigned_expert" ON "HITLQueue"
  FOR UPDATE
  USING (auth.uid()::text = "assignedExpertId");

-- ============================================================================
-- 11) Audit Log 테이블 (REQ-NF-019) — admin / RLS 관련 변경 감사
-- ============================================================================

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorId"   TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  "tableName" TEXT        NOT NULL,
  "rowId"     TEXT,
  diff        JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx"
  ON "AuditLog" ("actorId", "createdAt" DESC);

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- admin 만 audit log 조회.
CREATE POLICY "audit_select_admin" ON "AuditLog"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User".role = 'admin'
    )
  );

-- INSERT 는 service_role 만 (트리거 또는 백엔드 코드).
