// INFRA-002 — Vercel Cron 인증 헬퍼.
//
// Vercel Cron Jobs 는 CRON_SECRET 환경변수가 설정되어 있으면 자동으로
// `Authorization: Bearer ${CRON_SECRET}` 헤더를 추가해 endpoint 호출.
// 외부 트래픽이 cron path 를 임의 호출하지 못하도록 본 헬퍼로 차단한다.
//
// 환경 변수 미설정 시: dev / preview 환경에서만 통과 (production 은 차단).

export interface CronAuthResult {
  ok: boolean;
  reason?: "missing_secret_in_production" | "invalid_authorization";
}

export function verifyCronSecret(request: Request): CronAuthResult {
  const secret = process.env.CRON_SECRET;
  const isProduction =
    process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProduction) {
      // Production 에서 CRON_SECRET 누락 → 외부 차단.
      return { ok: false, reason: "missing_secret_in_production" };
    }
    // dev/preview 는 통과 (수동 trigger 편의).
    return { ok: true };
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return { ok: false, reason: "invalid_authorization" };
  }
  return { ok: true };
}
