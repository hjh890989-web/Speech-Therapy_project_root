-- SEC-COMP-PIPA (Grill #3A A1+A2) — User 에 PIPA 동의 일시 컬럼 2개 추가.
--
-- 본 마이그레이션:
-- 1) pipaUnderageConsentAt — PIPA §22-6 만 14세 미만 부모 대리 동의 일시
-- 2) overseasTransferConsentAt — PIPA §17 개인정보 국외 이전 동의 일시
--
-- 기존 사용자: 둘 다 null 로 초기화 (미동의 상태). /settings/privacy-consent 에서 직접 체크 후 갱신.
-- null 인 parent 는 진단 / Gemini / STT 호출 차단 (정책은 lib + Server Action 측 가드).

ALTER TABLE "User"
  ADD COLUMN "pipaUnderageConsentAt"     TIMESTAMP(3),
  ADD COLUMN "overseasTransferConsentAt" TIMESTAMP(3);
