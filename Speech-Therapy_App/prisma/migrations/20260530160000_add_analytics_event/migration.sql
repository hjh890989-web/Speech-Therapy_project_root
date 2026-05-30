-- ============================================================================
-- INFRA-005 후속 — 서버 측 분석 이벤트 query-able sink (Phase 1)
-- Refs: MON-001(funnel.ts '옵션 B' 보류분), AGENTS.md §2.2(PII), R4.
-- ============================================================================
--
-- 배경:
-- - client trackEvent(@vercel/analytics)·funnel 도메인 역산은 작동. 그러나 서버 측 trackEvent 는
--   Vercel Analytics(브라우저 SDK) 호출 불가 → prod no-op 유실. 본 테이블이 그 갭을 채운다.
-- - trackServerEvent(lib/analytics-server.ts)가 fire-and-forget + graceful 로 INSERT.
-- - PII/R4: properties 에 자녀 식별 정보 0(호출 측 + 카탈로그 shape 강제). userId=부모 id(선택).
--
-- ⚠️ RLS: 본 테이블은 service-role 전용(클라이언트 직접 접근 0). deploy 시 RLS 기본 deny 정책 적용 권장:
--      ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;  -- (정책 미정의 = 모두 deny, service-role 우회)
--
-- 운영 적용 (사용자 측 수동, deploy 본 PR 미실행):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status
--   3. npx prisma migrate deploy   # DIRECT_URL
--   4. Supabase Studio 검증:
--        SELECT count(*) FROM information_schema.tables
--        WHERE table_schema='public' AND table_name='AnalyticsEvent';  -- → 1 row.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"       TEXT         NOT NULL,
  "properties" JSONB,
  "userId"     TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent" ("name", "createdAt");
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent" ("createdAt");

-- RLS (service-role 전용 — 클라이언트 직접 접근 차단).
ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;
