// 경량 health-check endpoint.
// 외부 의존성 (DB / Gemini / Slack) 없음 — 단순히 컨테이너 활성화 상태만 반환.
// 용도:
//  - GitHub Actions keep-warm cron 의 ping target (Vercel Hobby cron 슬롯 절약)
//  - 모니터링 / uptime 체크 도구 연동

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
