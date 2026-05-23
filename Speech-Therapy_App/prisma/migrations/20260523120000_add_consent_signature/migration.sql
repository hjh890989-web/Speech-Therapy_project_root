-- ============================================================================
-- DB-010 — ConsentSignature (FR-C-018 #41) — 동의서 발송 + D+3 리마인더 + 7일 만료
-- Refs: SRS §3.5, REQ-FUNC-059~061, REQ-NF-019 (감사 로그), CON-04, R4.
-- ============================================================================
--
-- 라이프사이클:
--   pending → signed   (부모 서명 완료 시 status='signed', signedAt=now())
--   pending → expired  (sentAt + 7d 경과 시 status='expired', expiredAt=now())
--
-- 멱등 / cron 운영:
--   - D+3 리마인더 cron: WHERE status='pending' AND sentAt < now-3d AND remindedAt IS NULL
--   - 7d 만료 cron:    WHERE status='pending' AND sentAt < now-7d
--
-- 인덱스 정책:
--   - (status, sentAt): 두 cron 모두 status + 날짜 범위로 스캔 → 복합 인덱스 권장.
--   - (parentEmail):    동일 부모 다회 발급 통계 / 멱등 lookup.
--   - (token) UNIQUE:   서명 페이지 단건 조회 + 무차별 token 대입 방어.
--
-- 운영 적용 절차 (사용자 수동, deploy 본 PR 미실행):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status            # 본 migration pending 확인
--   3. npx prisma migrate deploy            # DIRECT_URL 사용
--   4. Supabase Studio SQL Editor 검증:
--        SELECT column_name, data_type, is_nullable
--        FROM information_schema.columns
--        WHERE table_name = 'ConsentSignature'
--        ORDER BY ordinal_position;
--      → 14 row (id, parentEmail, parentName, childNickname, consentType, status, token,
--               sentAt, remindedAt, signedAt, expiredAt, signedIp, signedUa,
--               institutionId, createdAt, updatedAt) 노출 (15+ 컬럼).
--        SELECT indexname FROM pg_indexes WHERE tablename='ConsentSignature';
--      → 4개 인덱스 (PK, token unique, status_sentAt, parentEmail, token) 노출.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ConsentSignature" (
    "id"            TEXT NOT NULL,
    "parentEmail"   TEXT NOT NULL,
    "parentName"    TEXT NOT NULL,
    "childNickname" TEXT NOT NULL,
    "consentType"   TEXT NOT NULL DEFAULT 'data_usage',
    "status"        TEXT NOT NULL DEFAULT 'pending',
    "token"         TEXT NOT NULL,
    "sentAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remindedAt"    TIMESTAMP(3),
    "signedAt"      TIMESTAMP(3),
    "expiredAt"     TIMESTAMP(3),
    "signedIp"      TEXT,
    "signedUa"      TEXT,
    "institutionId" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentSignature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConsentSignature_token_key" ON "ConsentSignature"("token");
CREATE INDEX IF NOT EXISTS "ConsentSignature_status_sentAt_idx" ON "ConsentSignature"("status", "sentAt");
CREATE INDEX IF NOT EXISTS "ConsentSignature_parentEmail_idx" ON "ConsentSignature"("parentEmail");
CREATE INDEX IF NOT EXISTS "ConsentSignature_token_idx" ON "ConsentSignature"("token");

-- ============================================================================
-- RLS 정책 (REQ-NF-019):
--   - 본 PR 은 ConsentSignature 에 RLS 활성화하나 정책은 _service_role 만 INSERT/UPDATE_ 로 제한.
--     (cron / sign route / server action 모두 service_role 사용 가정.)
--   - SELECT 는 정책 미설정 → default deny (RLS enabled 시) — admin / cron 전용.
--   - 향후 parent self-service (본인 동의서 조회) UI 도입 시 별도 PR 로 SELECT 정책 추가.
-- ============================================================================

ALTER TABLE "ConsentSignature" ENABLE ROW LEVEL SECURITY;

-- service_role 키만 mutate 가능 (cron + server action — 본 PR 의 모든 경로 정합).
-- parent self-service / admin UI 시 별도 SELECT/UPDATE 정책 추가.
