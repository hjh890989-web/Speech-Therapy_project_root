-- Sprint 3 §2 B — EvaluationResult.acousticFeatures (Json?) 컬럼 추가.
-- Web Audio API 직접 측정 결과 (pitch / duration / energy) 영구 저장.
-- NULL 허용 → 기존 row 와 미지원 환경 모두 호환.

ALTER TABLE "EvaluationResult"
  ADD COLUMN "acousticFeatures" JSONB;
