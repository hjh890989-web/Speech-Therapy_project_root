-- ============================================================================
-- DB-009 §RLS — HITLQueue 추가 RLS 정책 (#21 잔여, SEC-002 보강)
-- Refs: REQ-NF-019 RBAC + R4 영유아 데이터 보호, FR-C-002/014 (HITL).
-- ============================================================================
--
-- 배경:
-- - 기존 enable_rls_policies (20260512123555) 가 HITLQueue 에 RLS 활성화 +
--   2개 정책 (hitl_select_visible, hitl_update_assigned_expert) 만 정의.
-- - User.role 컬럼 기반 EXISTS 서브쿼리 패턴 → JWT custom claim 기반
--   (auth.jwt() ->> 'role') 패턴을 보조 정책으로 추가 → RBAC 매트릭스 보강.
-- - HITL 큐의 INSERT/DELETE 는 기존 정책에 부재 — 본 PR 로 default deny + admin 만 명시.
--
-- 정책 요약 (신규 5종, 기존 2종과 OR 합성):
--   hitl_queue_select_own       : parent 본인 row SELECT (auth.uid 비교).
--   hitl_queue_select_expert    : expert/admin/principal JWT role 시 모든 row SELECT.
--   hitl_queue_insert_system    : INSERT WITH CHECK (false) — service_role 만 우회 (enqueueForReview).
--   hitl_queue_update_expert    : expert/admin JWT role 만 UPDATE (assign/done/escalate).
--   hitl_queue_delete_admin     : admin JWT role 만 DELETE (비상 cleanup).
--
-- 명명 규약:
-- - "hitl_queue_*" 접두로 기존 "hitl_*" 정책과 명확 구분 (PG 는 같은 테이블에서 정책명 unique).
-- - PG 는 같은 테이블의 동일 커맨드(SELECT/UPDATE)에 여러 정책 정의 시 OR 합성.
--   → 기존 hitl_select_visible 와 신규 hitl_queue_select_expert 가 OR 결합되어
--     "본인 row OR 본인 할당 OR admin User.role OR JWT role(expert/admin/principal)" 으로 확장.
--
-- 운영 적용 절차 (사용자 수동):
-- 1. cd Speech-Therapy_App
-- 2. npx prisma migrate status            # drift 점검 — 본 migration pending 확인
-- 3. npx prisma migrate deploy            # DIRECT_URL 사용
-- 4. Supabase Studio SQL Editor 검증:
--      SELECT polname, polcmd FROM pg_policy
--      WHERE polrelid = 'public."HITLQueue"'::regclass
--      ORDER BY polname;
--    → 기존 2개 + 신규 5개 = 총 7개 정책 노출되어야 함.
-- ============================================================================

-- RLS 는 이미 enable_rls_policies (2026-05-12) 에서 활성화됨 — 재실행 idempotent.
ALTER TABLE "HITLQueue" ENABLE ROW LEVEL SECURITY;

-- 정책 1: 본인 항목 SELECT (parent 가 본인 큐 항목 확인 — FR-C-002 알림 후 상세 페이지 등).
CREATE POLICY "hitl_queue_select_own" ON "HITLQueue"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- 정책 2: expert/admin/principal role 모든 항목 SELECT (HITL admin 큐 페이지 — admin/hitl).
-- JWT custom claim 기반 — Supabase Auth Hook 으로 role 주입 가정 (REQ-NF-019).
CREATE POLICY "hitl_queue_select_expert" ON "HITLQueue"
  FOR SELECT
  USING ((auth.jwt() ->> 'role') IN ('expert', 'admin', 'principal'));

-- 정책 3: INSERT default deny — service_role 만 우회 (lib/hitl.ts::enqueueForReview).
-- WITH CHECK (false) 는 application key 로의 직접 INSERT 를 100% 차단.
CREATE POLICY "hitl_queue_insert_system" ON "HITLQueue"
  FOR INSERT
  WITH CHECK (false);

-- 정책 4: expert/admin role 만 UPDATE (assign/done/escalate).
-- 기존 hitl_update_assigned_expert (assignedExpertId 매칭) 와 OR 합성 — 둘 중 하나 통과 시 UPDATE 허용.
CREATE POLICY "hitl_queue_update_expert" ON "HITLQueue"
  FOR UPDATE
  USING ((auth.jwt() ->> 'role') IN ('expert', 'admin'));

-- 정책 5: admin 만 DELETE (비상 cleanup — 잘못된 큐 항목 제거).
-- 평상시 service_role 만, 비상 admin Studio 작업 허용.
CREATE POLICY "hitl_queue_delete_admin" ON "HITLQueue"
  FOR DELETE
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ============================================================================
-- 회귀 sentinel:
-- - 신규 INSERT helper 가 application key 로 enqueue 시도 → WITH CHECK (false) 차단 → 500.
--   → service_role (lib/supabase/admin) 만 우회 가능 → rbac-rls.test 시나리오 5 화이트리스트 확장 필요.
-- - 기존 hitl_select_visible / hitl_update_assigned_expert 정책은 그대로 유지 — 본 migration 은 추가만.
-- ============================================================================
