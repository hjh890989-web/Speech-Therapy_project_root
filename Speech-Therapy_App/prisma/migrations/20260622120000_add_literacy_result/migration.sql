-- ============================================================================
-- CR-2026-009 — LiteracyResult 모델 + RLS 정책 + index.
--
-- 문해력 5단계(lib/literacy/stages.ts) 놀이/probe 결과 영속. 발음 EvaluationResult 와
-- 분리된 별도 테이블 — 발음 채점/HITL/escalation 과 무관(별도 활동).
--
-- 임상 안전 경계 (project 규칙 — 임상 보정은 display 레이어에만):
--   - "rawScore" 는 원점수 — 보정 금지.
--   - "referenceBand" 는 display 전용. 임상 규준 검증(Phase 2: 출시가능 밴드 0건) 통과
--     전까지 NULL(연습-only).
--
-- R4 (자녀 보호): "userId"(User UUID) 만, 자녀 식별 정보 미저장. "childAgeMonths"(월령)만.
-- CON-04: 컬럼/값에 "치료/진단/장애" 금칙어 0.
--
-- RLS 3 정책 (REQ-NF-019, EvaluationResult 선례):
--   - literacy_result_select_own   : 본인(parent userId) 또는 admin
--   - literacy_result_insert_own   : 본인만 INSERT (다른 user 명의 차단)
--   - literacy_result_delete_admin : admin 만 DELETE (운영 사고 대응)
--
-- 적용: `npx prisma migrate deploy` (DIRECT_URL). `prisma migrate dev` 는 schema 정합
--   확인 후 본 migration 을 그대로 적용한다(RLS 는 Prisma 미생성 — 본 raw SQL 이 정본).
-- ============================================================================

CREATE TABLE "LiteracyResult" (
  "id"             UUID             NOT NULL DEFAULT gen_random_uuid(),
  "userId"         TEXT             NOT NULL,
  "stage"          TEXT             NOT NULL,
  "gameSlug"       TEXT             NOT NULL,
  "rawScore"       DOUBLE PRECISION NOT NULL,
  "rawTotal"       DOUBLE PRECISION,
  "childAgeMonths" INTEGER          NOT NULL,
  "referenceBand"  TEXT,
  "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LiteracyResult_pkey" PRIMARY KEY ("id")
);

-- FK — 자녀(보호자) 탈퇴 시 본인 문해력 결과 동반 삭제.
ALTER TABLE "LiteracyResult"
  ADD CONSTRAINT "LiteracyResult_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 인덱스 — 사용자별 시계열 조회(주간 리포트 집계 partition) + 단계/구인 분석.
CREATE INDEX "LiteracyResult_userId_createdAt_idx"
  ON "LiteracyResult" ("userId", "createdAt");

CREATE INDEX "LiteracyResult_stage_gameSlug_idx"
  ON "LiteracyResult" ("stage", "gameSlug");

-- ----------------------------------------------------------------------------
-- RLS 활성화 + 정책.
-- ----------------------------------------------------------------------------

ALTER TABLE "LiteracyResult" ENABLE ROW LEVEL SECURITY;

-- SELECT — 본인(자녀 보호자) 또는 admin(분석/운영).
CREATE POLICY "literacy_result_select_own" ON "LiteracyResult"
  FOR SELECT
  USING (
    auth.uid()::text = "userId"
    OR EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User".role = 'admin'
    )
  );

-- INSERT — 본인만 (다른 user 명의 INSERT 차단).
CREATE POLICY "literacy_result_insert_own" ON "LiteracyResult"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- DELETE — admin only (운영 사고 대응 hard delete).
CREATE POLICY "literacy_result_delete_admin" ON "LiteracyResult"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User".role = 'admin'
    )
  );
