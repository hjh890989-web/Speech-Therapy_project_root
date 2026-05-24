-- ============================================================================
-- FR-Q-013 후속 — OfflineEntry 모델 + RLS 정책 + index.
--
-- 책임:
--   - 센터/유치원의 선생님이 자녀의 오프라인 발음 연습/관찰/메모를 수기 기록.
--   - 통합 타임라인 (lib/timeline/aggregator.ts loadUserTimeline) 의 "offline" kind
--     entry source — 앱 세션 (diagnose/mission) 과 merge 노출.
--
-- R4 (자녀 보호):
--   - userId/authorId 는 User UUID 만, 자녀 식별 정보 미저장.
--   - note 본문 PII 자동 검출 X — 입력자(teacher) 책임 + README 안내.
--
-- CON-04 (의료 금칙어):
--   - kind 는 'practice'|'observation'|'note' enum-like — "치료/진단/장애" 미포함.
--   - note 본문은 Server Action 진입 시 hasBannedTerm 검증 (reject).
--
-- RLS 5 정책 (REQ-NF-019):
--   - offline_entry_select_own         : 자녀 본인 (parent userId)
--   - offline_entry_select_teacher     : teacher/principal/admin/expert (모든 role 조회)
--   - offline_entry_insert_teacher     : teacher/principal/admin/expert 만 INSERT
--   - offline_entry_update_teacher     : author 본인 or admin 만 UPDATE
--   - offline_entry_delete_admin       : admin 만 DELETE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) User <-> OfflineEntry FK 의 안전 가드: User.id 가 String 이지만 OfflineEntry
--    의 userId/authorId 도 String 이므로 직접 TEXT 비교 가능. RLS 정책 안에서는
--    auth.uid()::text 패턴을 그대로 사용.
-- ----------------------------------------------------------------------------

CREATE TABLE "OfflineEntry" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "userId"         TEXT         NOT NULL,
  "authorId"       TEXT         NOT NULL,
  "kind"           TEXT         NOT NULL,
  "note"           TEXT         NOT NULL,
  "observedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  "institutionId"  TEXT,

  CONSTRAINT "OfflineEntry_pkey" PRIMARY KEY ("id")
);

-- FK constraints — Cascade on user delete (자녀 탈퇴 시 본인 오프라인 기록 동반 삭제).
ALTER TABLE "OfflineEntry"
  ADD CONSTRAINT "OfflineEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OfflineEntry"
  ADD CONSTRAINT "OfflineEntry_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- 인덱스 — 타임라인 조회 (userId, observedAt desc) + author 조회.
CREATE INDEX "OfflineEntry_userId_observedAt_idx"
  ON "OfflineEntry" ("userId", "observedAt" DESC);

CREATE INDEX "OfflineEntry_authorId_idx"
  ON "OfflineEntry" ("authorId");

-- ----------------------------------------------------------------------------
-- 2) RLS 활성화 + 5 정책.
-- ----------------------------------------------------------------------------

ALTER TABLE "OfflineEntry" ENABLE ROW LEVEL SECURITY;

-- 2-1) SELECT — 자녀 본인 (parent).
CREATE POLICY "offline_entry_select_own" ON "OfflineEntry"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- 2-2) SELECT — teacher/principal/admin/expert.
--   teacher 는 본인 담당 반 자녀만 보아야 하나, RLS 는 role 기반으로만 통과 →
--   application 측 (page.tsx + Server Action) 이 추가 cross-tenant 가드 책임.
CREATE POLICY "offline_entry_select_teacher" ON "OfflineEntry"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User".role IN ('teacher', 'principal', 'admin', 'expert')
    )
  );

-- 2-3) INSERT — teacher/principal/admin/expert.
--   authorId == auth.uid() 도 추가 check (다른 user 명의로 입력 방지).
CREATE POLICY "offline_entry_insert_teacher" ON "OfflineEntry"
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = "authorId"
    AND EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User".role IN ('teacher', 'principal', 'admin', 'expert')
    )
  );

-- 2-4) UPDATE — author 본인 또는 admin.
CREATE POLICY "offline_entry_update_teacher" ON "OfflineEntry"
  FOR UPDATE
  USING (
    auth.uid()::text = "authorId"
    OR EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User".role = 'admin'
    )
  );

-- 2-5) DELETE — admin only (운영 사고 대응용 hard delete).
CREATE POLICY "offline_entry_delete_admin" ON "OfflineEntry"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id = auth.uid()::text
        AND "User".role = 'admin'
    )
  );
