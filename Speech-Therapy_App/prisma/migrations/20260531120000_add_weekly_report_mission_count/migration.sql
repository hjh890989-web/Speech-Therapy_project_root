-- FR-C-WAUR-SWITCH (2026-05-31) — WeeklyReport.missionCompletedCount (W-AUR 미션 기반 전환).
--
-- 북극성 KPI W-AUR 을 "주 N회 진단 세션(evaluationResult)" → "주 N회 미션 완료" 로 전환(PRD §1).
-- 미션 완료수(SessionLog missionId!=null AND durationSec>0)를 주별 영속해, loader/prediction history 가
-- 저장된 row 에서 wAurAchieved(>= W_AUR_MIN_MISSIONS)를 재유도하도록 한다.
-- sessionCount(진단 회수)는 점수 평균/추세의 표본수로 보존 — 미션수로 덮어쓰지 않음.
--
-- 비파괴 backfill: 기존 row 는 DEFAULT 0 (전환 이전 주는 미션 미집계 → wAurAchieved=false 로 재구성).
-- 과거 주 실제 미션 활동 역집계(SessionLog group-by backfill)는 선택적 별도 작업 — 본 범위 외.
--
-- ⚠️ 운영 적용 (사용자 측 수동, deploy 본 PR 미실행):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status   # drift 점검
--   3. npx prisma migrate deploy

-- 상수 DEFAULT(0) → Postgres 11+ 메타데이터 변경(테이블 rewrite 없음, 최소 lock). IF NOT EXISTS=재실행 안전.
ALTER TABLE "WeeklyReport" ADD COLUMN IF NOT EXISTS "missionCompletedCount" INTEGER NOT NULL DEFAULT 0;
