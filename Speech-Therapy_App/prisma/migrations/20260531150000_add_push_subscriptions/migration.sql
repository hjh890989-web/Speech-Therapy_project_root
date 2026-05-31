-- ============================================================================
-- DB-018 (V07 신규) — F16 오프라인 일반화 푸시 알림 구독 (push_subscriptions)
-- Refs: V07 §4.1 Epic F16, REQ-FUNC-040 (Web Push 일 1회 18:00 + 옵트인 only),
--       ADR-10 (D5 PWA 부활 의존), 정보통신망법 §50 (영리성 옵트인).
-- ============================================================================
--
-- 배경:
-- - Web Push 구독 정보 (endpoint + p256dh + auth) 영속. 옵트인 source of truth = row 존재.
-- - dispatch Cron(/api/push/dispatch) 이 활성 구독 조회 → web-push 발송 + lastSentAt 갱신.
-- - 옵트아웃(unsubscribe_push) = row DELETE → 즉시 발송 중단 (정보통신망법 §50 정합).
-- - 게이트: F16_PUSH_ENABLED + VAPID 키 (lib/push/config.ts). 기본 off — D5 부활 시 활성.
--
-- R4: endpoint 는 push gateway URL (PII 아님). p256dh/auth 는 구독 payload 암호화 키.
-- FK: User.id 참조는 application-level (VoiceModel / ChatMessage 동일 컨벤션 — Prisma @relation 미선언).
--
-- 운영 적용 (사용자 측 수동, deploy 본 PR 미실행):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status   # drift 점검
--   3. npx prisma migrate deploy   # DIRECT_URL 사용
--   4. 검증: SELECT count(*) FROM information_schema.tables
--            WHERE table_schema='public' AND table_name='PushSubscription';  -- 1 row
-- ============================================================================

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"       TEXT         NOT NULL,
  "endpoint"     TEXT         NOT NULL,
  "p256dh"       TEXT         NOT NULL,
  "auth"         TEXT         NOT NULL,
  "lastSentAt"   TIMESTAMP(3),
  "dismissCount" INTEGER      NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint")
);

CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription" ("userId");
CREATE INDEX IF NOT EXISTS "PushSubscription_lastSentAt_idx" ON "PushSubscription" ("lastSentAt");

-- ============================================================================
-- 회귀 sentinel:
-- - User.id FK 는 application-level (VoiceModel/ChatMessage 동일). 추후 Prisma relation 추가 가능.
-- - 옵트인 단일 진실원 = 본 row. notificationPreference.f16PushEnabled 미러는 미사용
--   (이메일 선호 update 의 normalize round-trip clobber 회피 — Full UI PR 에서 폼 분리 후 도입).
-- - dispatch / dismiss 는 API-020 의 /api/push/* Route Handler 에서 처리.
-- ============================================================================
