-- ============================================================================
-- CL-04 durable (errorPattern CR) — EvaluationResult 에 진단 입력 단어 영구 저장
-- Refs: CL-04 적대적 검증 Decision A. REQ-FUNC (진단 결과 페이지 안정성).
-- ============================================================================
--
-- 배경:
-- - 결과 페이지의 단어 표시(intended → heard) + CL-04 발달 변동 게이팅(detectVariation)이 현재
--   searchParams(intendedWord/transcript) 의존 → 새로고침/공유 시 유실되어 표시/완화가 사라짐(비결정).
-- - 진단 시점에 입력 단어를 EvaluationResult 에 저장 → 페이지가 DB 에서 재구성(searchParams 독립).
-- - 단일 대상 단어 + STT 전사 — 자녀 식별 정보 아님(이미 응답·URL·화면에 노출되던 값).
-- - nullable: 기존 row 는 null → 페이지가 searchParams 폴백(회귀 0).
--
-- 운영 적용 (사용자 측 수동, deploy 본 PR 미실행):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status   # drift 점검
--   3. npx prisma migrate deploy   # DIRECT_URL 사용
--   4. Supabase Studio 검증:
--        SELECT column_name FROM information_schema.columns
--        WHERE table_name='EvaluationResult' AND column_name IN ('intendedWord','heardWord');
--      → 2 rows.
-- ============================================================================

ALTER TABLE "EvaluationResult"
  ADD COLUMN IF NOT EXISTS "intendedWord" TEXT,
  ADD COLUMN IF NOT EXISTS "heardWord"    TEXT;
