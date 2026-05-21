// MON-004 / REQ-NF-007 — 서비스 health endpoint.
//
// 응답 구조:
//   {
//     status: "healthy" | "degraded" | "unhealthy",
//     timestamp: ISO 8601,
//     uptimeSec: 프로세스 시작 후 경과 초,
//     services: { db, ai, storage },  // 각: { status, latencyMs?, error? }
//     latencyMs: 본 endpoint 처리 시간
//   }
//
// HTTP status 매핑:
//   - healthy / degraded → 200 (외부 모니터 통과)
//   - unhealthy (DB down) → 503 (외부 모니터 알림 트리거)
//
// 호출 정책:
//   - 외부 monitor (UptimeRobot/BetterStack) 5분 주기 권장 — DB ping 부담 최소
//   - GitHub Actions keep-warm cron 도 본 endpoint 사용 가능
//   - Cache-Control no-store — 매 호출 신선한 결과
//
// AGENTS.md §2.3 — secret 노출 금지: ai/storage 는 env 존재 여부만 확인 (값 미노출).

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const BOOT_TIME = Date.now();
// DB_TIMEOUT_MS = 2000ms — Vercel Hobby + Supabase Free 조합의 cold start (pgBouncer 핸드셰이크 + serverless function 깨우기) 가 1~1.5s 소요됨.
// 800ms 였을 때 cold start 시 false 503 알람 발생 (2026-05-21 prod 검증으로 확인). 2000ms 로 완화해 warm 평균 180ms 와 cold 둘 다 커버.
const DB_TIMEOUT_MS = 2000;

interface HealthService {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptimeSec: number;
  services: {
    db: HealthService;
    ai: HealthService;
    storage: HealthService;
  };
  latencyMs: number;
}

async function checkDb(timeoutMs: number): Promise<HealthService> {
  const start = performance.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`timeout ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
    return { status: "up", latencyMs: Math.round(performance.now() - start) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "down", error: msg.slice(0, 100) };
  }
}

function checkEnvPresence(envName: string): HealthService {
  return process.env[envName]
    ? { status: "up" }
    : { status: "down", error: `${envName} not set` };
}

export async function GET() {
  const start = performance.now();

  const [db, ai, storage] = await Promise.all([
    checkDb(DB_TIMEOUT_MS),
    Promise.resolve(checkEnvPresence("GOOGLE_GENERATIVE_AI_API_KEY")),
    Promise.resolve(checkEnvPresence("NEXT_PUBLIC_SUPABASE_URL")),
  ]);

  // DB down → unhealthy (503). 보조 서비스만 down 이면 degraded (200, 모니터 알림 X).
  const dbDown = db.status === "down";
  const auxDown = ai.status === "down" || storage.status === "down";
  const overall: HealthResponse["status"] = dbDown
    ? "unhealthy"
    : auxDown
      ? "degraded"
      : "healthy";

  const body: HealthResponse = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round((Date.now() - BOOT_TIME) / 1000),
    services: { db, ai, storage },
    latencyMs: Math.round(performance.now() - start),
  };

  return Response.json(body, {
    status: dbDown ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
