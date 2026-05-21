// MON-004 / REQ-NF-007 — 사용자 가시화용 Status Page.
//
// 책임:
//  - /api/health 결과를 사람이 읽기 좋은 형태로 노출
//  - 사용자가 서비스 상태를 직접 확인 가능 (외부 모니터 5분 주기 보조 지표)
//  - 새로고침으로만 갱신 (실시간 polling 없음 — REQ-NF-007 외부 모니터 책임)
//
// 패턴:
//  - Server Component (RSC) — fetch 없이 route handler GET() 을 직접 import 호출 (Next.js 16)
//  - dynamic = "force-dynamic" — 매 요청 fresh
//  - CON-04 호환: "치료/진단/장애" 어휘 0건. 시스템 장애 → "서비스 중단" / "이상" 표현
//
// 접근성:
//  - 상태 배지 role="status" + aria-label
//  - 색맹 대응: 색상 + 이모지 + 텍스트 3중 인디케이터
//  - 모바일: 44px+ 터치 영역, 1열 → 3열 grid

import Link from "next/link";
import { GET as getHealth } from "@/app/api/health/route";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "서비스 상태 — Speech-Therapy",
  description: "Speech-Therapy 의 현재 서비스 운영 상태를 실시간으로 안내합니다.",
};

type ServiceStatus = "up" | "down";
type OverallStatus = "healthy" | "degraded" | "unhealthy";

interface HealthService {
  status: ServiceStatus;
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  status: OverallStatus;
  timestamp: string;
  uptimeSec: number;
  services: {
    db: HealthService;
    ai: HealthService;
    storage: HealthService;
  };
  latencyMs: number;
}

interface OverallPresentation {
  label: string;
  emoji: string;
  tone: string;
  description: string;
}

const OVERALL_PRESENTATION: Record<OverallStatus, OverallPresentation> = {
  healthy: {
    label: "정상 운영",
    emoji: "🟢",
    tone: "bg-emerald-100 text-emerald-900 border-emerald-300",
    description: "모든 서비스가 정상적으로 동작하고 있어요.",
  },
  degraded: {
    label: "일부 저하",
    emoji: "🟡",
    tone: "bg-amber-100 text-amber-900 border-amber-300",
    description: "일부 보조 서비스에 이상이 있지만 핵심 기능은 사용 가능해요.",
  },
  unhealthy: {
    label: "서비스 중단",
    emoji: "🔴",
    tone: "bg-rose-100 text-rose-900 border-rose-300",
    description: "현재 서비스 이용이 어려워요. 잠시 후 다시 시도해 주세요.",
  },
};

const SERVICE_LABEL: Record<keyof HealthResponse["services"], string> = {
  db: "데이터베이스",
  ai: "발음 가이드 엔진",
  storage: "파일 저장소",
};

const SERVICE_PRESENTATION: Record<ServiceStatus, { label: string; emoji: string; tone: string }> = {
  up: {
    label: "정상",
    emoji: "🟢",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  down: {
    label: "이상",
    emoji: "🔴",
    tone: "bg-rose-50 text-rose-800 border-rose-200",
  },
};

/**
 * /api/health 라우트 핸들러를 직접 호출.
 * - HTTP 라운드트립 제거 → 같은 프로세스 함수 호출.
 * - 503 (unhealthy) 도 throw 없이 정상 파싱 (body 가 항상 JSON 일치).
 * - Next.js 16 RSC 친화 패턴.
 */
async function loadHealth(): Promise<{ data: HealthResponse; httpStatus: number }> {
  const res = await getHealth();
  const data = (await res.json()) as HealthResponse;
  return { data, httpStatus: res.status };
}

function formatTimestamp(iso: string): { utc: string; local: string; tz: string } {
  const date = new Date(iso);
  const utc = date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  let local = "";
  let tz = "";
  try {
    local = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    local = iso;
  }
  return { utc, local, tz };
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 ${m % 60}분`;
  const d = Math.floor(h / 24);
  return `${d}일 ${h % 24}시간`;
}

export default async function StatusPage() {
  const { data, httpStatus } = await loadHealth();
  const overall = OVERALL_PRESENTATION[data.status];
  const ts = formatTimestamp(data.timestamp);

  const serviceEntries = (Object.keys(data.services) as Array<keyof HealthResponse["services"]>).map(
    (key) => ({
      key,
      label: SERVICE_LABEL[key],
      service: data.services[key],
    }),
  );

  return (
    <main
      className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12"
      aria-labelledby="status-heading"
      data-testid="status-page"
    >
      <header className="mb-6">
        <h1 id="status-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">
          서비스 상태
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Speech-Therapy 의 현재 운영 상태를 확인할 수 있어요. 새로고침으로 최신 상태를 다시
          가져옵니다.
        </p>
      </header>

      <section
        aria-label="서비스 안내"
        className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
      >
        본 페이지는 시스템 운영 상태만 안내하며, 의료적 정보를 제공하지 않아요. Speech-Therapy 는
        부모님께 발음 발달을 안내하는 보조 도구입니다.
      </section>

      <section
        aria-label="전체 운영 상태"
        className={`mb-8 rounded-xl border-2 p-6 sm:p-8 ${overall.tone}`}
        data-testid="overall-status"
        data-status={data.status}
        data-http-status={httpStatus}
      >
        <div
          role="status"
          aria-live="polite"
          aria-label={`현재 운영 상태: ${overall.label}`}
          className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl shadow-sm sm:h-14 sm:w-14"
          >
            {overall.emoji}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              현재 상태
            </p>
            <p className="text-2xl font-bold sm:text-3xl">{overall.label}</p>
            <p className="mt-1 text-sm sm:text-base">{overall.description}</p>
          </div>
        </div>
      </section>

      <section
        aria-label="갱신 시각 및 가동 시간"
        className="mb-8 grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2"
      >
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            마지막 갱신
          </p>
          <p className="mt-1 font-mono text-sm" data-testid="updated-utc">
            {ts.utc}
          </p>
          {ts.local && (
            <p className="mt-1 text-xs text-slate-500" data-testid="updated-local">
              사용자 시각: {ts.local}
              {ts.tz ? ` (${ts.tz})` : ""}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            서버 가동 시간
          </p>
          <p className="mt-1 text-sm" data-testid="uptime">
            {formatUptime(data.uptimeSec)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            응답 시간 {data.latencyMs}ms
          </p>
        </div>
      </section>

      <section aria-label="개별 서비스 상태" className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">개별 서비스</h2>
        <ul
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          data-testid="services-grid"
        >
          {serviceEntries.map(({ key, label, service }) => {
            const pres = SERVICE_PRESENTATION[service.status];
            return (
              <li
                key={key}
                className={`min-h-[120px] rounded-lg border p-4 ${pres.tone}`}
                data-testid={`service-card-${key}`}
                data-status={service.status}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold">{label}</h3>
                  <span
                    role="status"
                    aria-label={`${label} 상태: ${pres.label}`}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium shadow-sm"
                  >
                    <span aria-hidden="true">{pres.emoji}</span>
                    <span>{pres.label}</span>
                  </span>
                </div>
                {key === "db" && service.latencyMs !== undefined && (
                  <p className="mt-3 text-xs" data-testid="service-latency">
                    응답 시간: {service.latencyMs}ms
                  </p>
                )}
                {service.error && (
                  <p
                    className="mt-2 break-words rounded bg-white/70 p-2 font-mono text-xs"
                    data-testid={`service-error-${key}`}
                  >
                    {service.error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <footer
        aria-label="문의 안내"
        className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700"
      >
        <p className="mb-2 font-semibold">문제가 보이시나요?</p>
        <p>
          서비스 이상이 의심되면{" "}
          <a
            href="mailto:hjh890989@gmail.com?subject=Speech-Therapy%20%EC%84%9C%EB%B9%84%EC%8A%A4%20%EC%83%81%ED%83%9C%20%EB%AC%B8%EC%9D%98"
            className="inline-flex min-h-[44px] items-center text-emerald-700 underline hover:text-emerald-900"
          >
            이메일로 신고하기
          </a>{" "}
          하거나{" "}
          <Link
            href="https://github.com/hjh890989-web/Speech-Therapy_project_root/issues/new"
            className="inline-flex min-h-[44px] items-center text-emerald-700 underline hover:text-emerald-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Issues
          </Link>
          에 알려주세요.
        </p>
      </footer>
    </main>
  );
}
