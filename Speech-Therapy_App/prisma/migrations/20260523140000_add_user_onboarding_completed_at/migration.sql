-- ============================================================================
-- FR-C-PARENT-ONBOARDING (follow-up) — User.onboardingCompletedAt 컬럼 추가.
-- Refs: lib/onboarding/state.ts (localStorage), lib/onboarding/server-state.ts,
--       app/actions/mark-onboarding-completed.ts.
-- ============================================================================
--
-- 목적:
--   - localStorage 단독 마킹은 디바이스/브라우저 전환 시 wizard 재노출 발생.
--   - 본 컬럼이 canonical (서버) 완료 상태 보존 → (public)/layout.tsx 의 자동 redirect
--     판단에 사용. localStorage 는 client snapshot (즉시 UX), DB 는 다중 디바이스 진실원.
--
-- nullable 정책:
--   - 기존 row 는 NULL (= 미완료 / wizard 미실행) — 신규 가입자와 동일하게 wizard 노출.
--   - 한 번 set 되면 새 timestamp 로 갱신 (멱등 — 다시 호출해도 UX 영향 없음).
--
-- 운영 적용 절차 (사용자 수동, 본 PR 미실행):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status   # 본 migration pending 확인
--   3. npx prisma migrate deploy   # DIRECT_URL 사용
--   4. Supabase Studio SQL Editor 검증:
--        SELECT column_name, data_type, is_nullable
--        FROM information_schema.columns
--        WHERE table_name = 'User' AND column_name = 'onboardingCompletedAt';
--      → 1 row (timestamp without time zone, YES) 노출.
-- ============================================================================

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
