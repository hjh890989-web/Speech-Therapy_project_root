-- ============================================================================
-- DB-NEW-F15-1 (V07 신규) — F15 LLM 발화 유도 챗봇 메시지 (Phase 1+)
-- Refs: V07 §4.1 Epic F15, REQ-FUNC-038/039, ADR-03 (7일 폐기), ADR-04 (금칙어 0건),
--       ADR-14 (임상 안전 게이트 — KOPLAC 13항목 + 자문 4주+82만 + F15_CHAT_ENABLED).
-- ============================================================================
--
-- 배경:
-- - F15 자녀 자유 발화 유도 대화 메시지. 단일턴(D6) — 멀티턴 pgvector 는 Phase 2.
-- - R4: INSERT 전 pii-mask(7패턴) + 금칙어 검열 통과분만 저장 (submitChatUtterance, 후속 PR).
-- - 7일 자동 폐기(ADR-03): expiresAt < now 를 chat-cleanup Cron 이 hard-DELETE (텍스트는 외부 의존 0).
-- - userId 는 부모 user.id (자녀 식별 아님).
--
-- ⚠️ 활성: F15_CHAT_ENABLED flag (default false). ADR-14 §10 KOPLAC 13항목(자문 4주+82만) 통과 전 비활성.
--          13항목 #11 IRB(ADR-15 — T4-c 외부협력 시 조건부)·#12 식약처는 해당성 검토 항목이지 무조건 선행조건 아님
--          (2026-05-30 CR: 본문 우선/IRB 조건부 — docs/f15-t4c-irb-analysis §CR).
--          2026-05-30 KOPLAC 검증은 CL-01~04(진단 채점) 한정 — F15 활성 전제 아님.
--
-- 운영 적용 (사용자 측 수동, deploy 본 PR 미실행):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status  # drift 점검
--   3. npx prisma migrate deploy  # DIRECT_URL 사용
--   4. Supabase Studio SQL Editor 검증:
--        SELECT count(*) FROM information_schema.tables
--        WHERE table_schema='public' AND table_name='ChatMessage';
--      → 1 row.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"    TEXT         NOT NULL,
  "role"      TEXT         NOT NULL,
  "content"   TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChatMessage_userId_createdAt_idx" ON "ChatMessage" ("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_expiresAt_idx" ON "ChatMessage" ("expiresAt");

-- ============================================================================
-- 회귀 sentinel:
-- - User.id FK 는 application-level 만 (Prisma User relation 추후 추가 가능, 본 PR 범위 외 — VoiceModel 패턴).
-- - 7일 폐기 Cron 은 후속 PR 의 /api/cron/chat-cleanup 에서 처리 (expiresAt < now hard-DELETE).
-- - submitChatUtterance(INSERT) + /chat UI 도 후속 PR. 본 슬라이스는 모델 + filter + stream API 까지.
-- ============================================================================
