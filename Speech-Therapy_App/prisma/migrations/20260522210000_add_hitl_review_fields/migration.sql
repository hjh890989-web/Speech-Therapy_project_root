-- ============================================================================
-- FR-C-013 (#36) — HITLQueue 전문가 검토 (코멘트 PATCH + 보정 점수) 보강 컬럼
-- Refs: REQ-FUNC-003 / HITL-001~003, REQ-NF-019 (감사 추적).
-- ============================================================================
--
-- 배경:
-- - 기존 HITLQueue 에 expertComment / groundTruthScore (Json) 컬럼은 존재하나,
--   "단일 보정 점수 (0~100)" + "검토 actor / 시각" 메타데이터가 부재.
-- - FR-C-013 detail page + PATCH endpoint 가 다음 3개 신규 컬럼을 요구:
--   correctedScore INT (선택, 0~100) — 3축 (groundTruthScore JSON) 와 보완 관계.
--   reviewedAt    TIMESTAMPTZ — 코멘트 PATCH 완료 시각 (lifecycle 의 completedAt 과 분리).
--   reviewedBy    TEXT — 검토 actor (Supabase auth uid). assignedExpertId 와 다를 수 있음 (admin 대리 검토).
--
-- 멱등성 (IF NOT EXISTS) — `prisma migrate deploy` 재실행 안전.
--
-- RLS 영향 없음:
-- - 기존 hitl_queue_update_expert (20260522192300) 정책이 expert/admin JWT role 만 UPDATE 허용 —
--   본 신규 컬럼도 동일 정책으로 보호 (PG 는 컬럼 단위 정책 미세분화 사용 안 함).
--
-- 운영 적용 절차 (사용자 수동 — Claude Code 가 직접 실행 금지):
-- 1. cd Speech-Therapy_App
-- 2. npx prisma migrate status            # drift 점검 — 본 migration pending 확인
-- 3. npx prisma migrate deploy            # DIRECT_URL 사용
-- 4. Supabase Studio SQL Editor 검증:
--      \d "HITLQueue"
--    → correctedScore / reviewedAt / reviewedBy 3개 컬럼 노출 확인.
-- ============================================================================

ALTER TABLE "HITLQueue"
  ADD COLUMN IF NOT EXISTS "correctedScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "reviewedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedBy"     TEXT;

-- correctedScore 범위 (0~100) 는 application layer (Zod) 책임 — DB CHECK 미추가
-- (향후 운영 데이터 분포 검증 후 별도 PR).
