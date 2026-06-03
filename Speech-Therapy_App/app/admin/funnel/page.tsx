// MON-001 (#64) — /admin/funnel 퍼널 CVR 대시보드 (Server Component).
//
// 책임:
//   - 6단계 퍼널 (landing → diagnose_started → diagnose_completed → mission_started
//     → mission_completed → reward_granted) 의 단계별 카운트 + conversion 시각화.
//   - 기본 range: 최근 7일 (UTC) — 어제까지 (오늘 진행중 데이터 제외).
//   - URL query ?from=YYYY-MM-DD&to=YYYY-MM-DD 지원 (단순 ISO date).
//   - 일자별 카드 + 단순 BarChart (Recharts).
//   - drop-off 가 큰 단계 (직전 대비 conversion < 50%) 는 red 강조.
//
// 접근 제어:
//   - proxy.ts 가 /admin/* 경로 RBAC 이미 적용 (admin / principal / expert).
//   - 본 페이지는 추가 권한 검사 미수행.
//
// R4 (자녀 식별 정보 노출 금지):
//   - 모든 표시값은 집계 카운트 / 비율 / 단계명 만. userId / sessionId / 이름 / email 0건.
//   - lib/analytics/funnel.aggregateFunnel 도 동일 정책으로 반환.
//
// CON-04 금칙어 ("치료" / "진단" / "장애"):
//   - 단계명 한글 라벨 = "발음 확인 시작/완료" (FUNNEL_STEP_LABEL).
//   - 페이지 설명 카피 0건 확인.
//
// Recharts:
//   - 클라이언트 컴포넌트로 분리 (FunnelChart.tsx) — Server Component 에서 import.
//   - 빈 데이터 시 fallback 메시지 표시 + 차트 미렌더.

import {
  addUtcDays,
  aggregateFunnelByDay,
  FUNNEL_STEP_LABEL,
  type FunnelStepName,
  type FunnelSummary,
  toDayStartUtc,
} from "@/lib/analytics/funnel";
import { FunnelDailyChart } from "./FunnelChart";

export const dynamic = "force-dynamic";

// MON-001 후속 (funnel-bottleneck-readiness 감사, 2026-06-03) — 단계별 *측정 신뢰도*.
//   이 dashboard 는 도메인 테이블 역산이라 일부 '직전 대비' 셀이 구조적 아티팩트다.
//   owner 가 가장 낮은 셀을 기계적으로 병목으로 오독하지 않도록, 각 단계의 conversionFromPrev
//   신뢰도를 표에 명시한다(display-only — 집계 로직 불변).
type ReliabilityLevel = "base" | "reliable" | "directional" | "artifact";
const STEP_RELIABILITY: Record<
  FunnelStepName,
  { level: ReliabilityLevel; note: string }
> = {
  landing: {
    level: "base",
    note: "기준 단계(진단 1회+ distinct 사용자). 진짜 랜딩 페이지 진입은 미계측.",
  },
  diagnose_started: {
    level: "artifact",
    note: "주의: landing(distinct user) 대비 row count라 100% 초과 가능. '재진단 강도'이지 유입→진단 전환 아님.",
  },
  diagnose_completed: {
    level: "artifact",
    note: "주의: 시작과 동일 소스(EvaluationResult)를 두 번 세어 항상 100%. 정보량 0 — 병목 판정에 쓰지 말 것.",
  },
  mission_started: {
    level: "directional",
    note: "방향성: 'started'는 완료+스킵 합(진짜 시작 아님) + 멀티데이·코호트 부재. 추이 참고용.",
  },
  mission_completed: {
    level: "reliable",
    note: "상대적 신뢰: 동일 SessionLog 풀(분자/분모) → 오염 적음. 단 의미는 '비-스킵 완주율'.",
  },
  reward_granted: {
    level: "directional",
    note: "방향성: 미션 보상만 필터(진단 별 제외). 재완수=별 1회 멱등이라 반복 완수 시 저평가 가능.",
  },
};

const RELIABILITY_BADGE: Record<ReliabilityLevel, { label: string; cls: string }> = {
  base: { label: "기준", cls: "bg-slate-100 text-slate-600" },
  reliable: { label: "신뢰", cls: "bg-emerald-100 text-emerald-800" },
  directional: { label: "방향성", cls: "bg-amber-100 text-amber-800" },
  artifact: { label: "주의", cls: "bg-rose-100 text-rose-800" },
};

export const metadata = {
  title: "퍼널 CVR 대시보드 — Speech-Therapy",
  description:
    "유입부터 보상까지 6단계 funnel 의 일자별 conversion 추이입니다. 관리자/원장/전문가 전용 화면.",
};

const DEFAULT_RANGE_DAYS = 7;

interface PageProps {
  /// Next.js 16 — searchParams 는 Promise.
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

/// YYYY-MM-DD ISO date 만 허용 (시각 미포함). 잘못된 입력 시 null.
function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const dt = new Date(Date.UTC(y, m, d));
  if (Number.isNaN(dt.getTime())) return null;
  // 합리적 boundary (2024~2030).
  if (dt.getUTCFullYear() < 2024 || dt.getUTCFullYear() > 2030) return null;
  return dt;
}

function resolveDateRange(
  fromParam: string | undefined,
  toParam: string | undefined,
  now: Date = new Date(),
): { from: Date; to: Date; defaulted: boolean } {
  const fromParsed = parseIsoDate(fromParam);
  const toParsed = parseIsoDate(toParam);
  if (fromParsed && toParsed && toParsed.getTime() > fromParsed.getTime()) {
    return { from: fromParsed, to: toParsed, defaulted: false };
  }
  // 기본 — 오늘 자정 (UTC) - 7일 ~ 오늘 자정 (UTC). 오늘 진행중 데이터 제외.
  const todayStart = toDayStartUtc(now);
  const from = addUtcDays(todayStart, -DEFAULT_RANGE_DAYS);
  return { from, to: todayStart, defaulted: true };
}

function pickString(
  v: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function formatPercent(value: number | null): string {
  if (value === null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function sumTotalUsers(days: FunnelSummary[]): number {
  return days.reduce((sum, d) => sum + d.totalUsers, 0);
}

/// 6단계 합산 — 다일 range 의 전체 카운트 / cumulative conversion 추산.
function aggregateAcrossDays(days: FunnelSummary[]): FunnelSummary | null {
  if (days.length === 0) return null;
  const stepNames = days[0].steps.map((s) => s.name);
  const totals = stepNames.map((name) => {
    let total = 0;
    for (const d of days) {
      const s = d.steps.find((x) => x.name === name);
      if (s) total += s.count;
    }
    return { name, count: total };
  });
  const landingTotal = totals[0]?.count ?? 0;
  const steps = totals.map((cur, i) => {
    const prev = i > 0 ? totals[i - 1].count : null;
    const conversionFromPrev = prev === null ? null : prev > 0 ? cur.count / prev : 0;
    const cumulativeConversion =
      i === 0
        ? landingTotal > 0
          ? 1
          : 0
        : landingTotal > 0
          ? cur.count / landingTotal
          : 0;
    return {
      name: cur.name,
      count: cur.count,
      conversionFromPrev,
      cumulativeConversion,
    };
  });
  return {
    date: `${days[0].date} ~ ${days[days.length - 1].date}`,
    steps,
    totalUsers: landingTotal,
  };
}

export default async function FunnelDashboardPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const fromStr = pickString(params.from);
  const toStr = pickString(params.to);
  const range = resolveDateRange(fromStr, toStr);

  const days = await aggregateFunnelByDay({ from: range.from, to: range.to });
  const totals = aggregateAcrossDays(days);
  const totalUsers = sumTotalUsers(days);

  return (
    <main
      data-testid="admin-funnel-page"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="funnel-heading"
    >
      <header className="mb-6">
        <h1 id="funnel-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">
          퍼널 CVR 대시보드
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          유입 → 발음 확인 → 미션 → 보상의 6단계 funnel conversion 추이입니다.
          기간 미지정 시 최근 {DEFAULT_RANGE_DAYS}일 (UTC) 기본값을 사용합니다.
        </p>
        <p className="mt-1 text-xs text-slate-500" data-testid="funnel-range-label">
          기간: {formatRangeLabel(range)} · 총 유입 {totalUsers}명
          {range.defaulted ? " (기본값)" : ""}
        </p>
        <details className="mt-3 text-xs text-slate-500">
          <summary className="cursor-pointer text-slate-600">URL 쿼리 사용법</summary>
          <code className="mt-1 block rounded bg-slate-50 px-2 py-1 text-slate-700">
            /admin/funnel?from=2026-05-15&amp;to=2026-05-22
          </code>
          <p className="mt-1">to 는 exclusive (해당 일자 미포함).</p>
        </details>
      </header>

      {days.length === 0 || totals === null ? (
        <EmptyState />
      ) : (
        <>
          <section aria-labelledby="totals-heading" className="mb-8">
            <h2
              id="totals-heading"
              className="mb-3 text-lg font-semibold text-slate-900"
            >
              기간 합계 — 단계별 conversion
            </h2>
            <FunnelStepsTable summary={totals} />
          </section>

          <section aria-labelledby="daily-chart-heading" className="mb-8">
            <h2
              id="daily-chart-heading"
              className="mb-3 text-lg font-semibold text-slate-900"
            >
              일자별 단계 카운트
            </h2>
            <FunnelDailyChart days={days} />
          </section>
        </>
      )}

      <footer
        aria-label="안내"
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <p className="mb-1 font-semibold text-slate-800">데이터 소스 정책</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>client trackEvent → Vercel Analytics, 서버 이벤트 → AnalyticsEvent 테이블(trackServerEvent).</li>
          <li>본 dashboard 는 그와 별개로 기존 도메인 테이블 (EvaluationResult / SessionLog / RewardLog) 역산.</li>
          <li>자녀 식별 정보 0건 — 모든 표시값은 집계 카운트 + 비율.</li>
          <li>오늘 데이터는 진행중이라 기본 range 에서 제외됩니다.</li>
          <li className="text-rose-700">
            <strong>측정 한계(병목 판정 시 필수)</strong>: &lsquo;발음 확인 시작↔완료&rsquo;는 동일
            소스를 두 번 세어 <strong>항상 100%</strong>(정보량 0). &lsquo;유입→발음 확인 시작&rsquo;은
            distinct user 대비 row count라 <strong>100% 초과 가능</strong>(재진단 강도이지 진입 전환
            아님). 진짜 유입 이탈·미션 열람 후 미시작은 row 자체가 없어 <strong>비가시</strong>.
            &lsquo;측정 신뢰도&rsquo; 열에서 <strong>신뢰/방향성</strong> 단계만 병목 후보로 볼 것.
          </li>
          <li>
            북극성 <strong>W-AUR(주 4회 미션 완료)은 본 funnel 밖</strong>(weekly-aggregator).
            funnel 의 미션 완료는 &lsquo;단일 완료&rsquo;까지만 — retention 병목은 별도 표면에서 확인.
          </li>
        </ul>
      </footer>
    </main>
  );
}

function formatRangeLabel(range: { from: Date; to: Date }): string {
  const f = `${range.from.getUTCFullYear()}-${String(
    range.from.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(range.from.getUTCDate()).padStart(2, "0")}`;
  const t = `${range.to.getUTCFullYear()}-${String(
    range.to.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(range.to.getUTCDate()).padStart(2, "0")}`;
  return `${f} ~ ${t}`;
}

function EmptyState() {
  return (
    <section
      data-testid="funnel-empty-state"
      aria-label="데이터 없음"
      className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700"
    >
      <p className="mb-2 font-semibold text-slate-900">기간 내 funnel 데이터 없음</p>
      <p>해당 기간엔 발음 확인 / 미션 / 보상 이벤트 row 가 0건이에요. 다른 기간을 시도해 보세요.</p>
    </section>
  );
}

function FunnelStepsTable({ summary }: { summary: FunnelSummary }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table
        data-testid="funnel-steps-table"
        className="w-full min-w-[560px] text-left text-sm"
      >
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-3 py-2">단계</th>
            <th scope="col" className="px-3 py-2">카운트</th>
            <th scope="col" className="px-3 py-2">직전 대비</th>
            <th scope="col" className="px-3 py-2">유입 대비 누적</th>
            <th scope="col" className="px-3 py-2">측정 신뢰도</th>
          </tr>
        </thead>
        <tbody>
          {summary.steps.map((step, idx) => {
            const reliability = STEP_RELIABILITY[step.name];
            const badge = RELIABILITY_BADGE[reliability.level];
            // 아티팩트 단계(항상 100%·>100% 가능)는 drop-off 강조 억제 — 오독 방지.
            const dropOff =
              reliability.level !== "artifact" &&
              step.conversionFromPrev !== null &&
              step.conversionFromPrev < 0.5;
            const cellClass = dropOff
              ? "bg-rose-50 text-rose-800 font-semibold"
              : "text-slate-700";
            return (
              <tr
                key={step.name}
                data-testid={`funnel-step-row-${step.name}`}
                data-step-index={idx}
                data-drop-off={dropOff ? "true" : "false"}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-3 py-2 font-medium text-slate-900">
                  <span data-testid={`funnel-step-label-${step.name}`}>
                    {FUNNEL_STEP_LABEL[step.name]}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-700">
                  <span data-testid={`funnel-step-count-${step.name}`}>{step.count}</span>
                </td>
                <td className={`px-3 py-2 ${cellClass}`}>
                  <span data-testid={`funnel-step-conv-${step.name}`}>
                    {formatPercent(step.conversionFromPrev)}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-700">
                  <span data-testid={`funnel-step-cumulative-${step.name}`}>
                    {formatPercent(step.cumulativeConversion)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    data-testid={`funnel-step-reliability-${step.name}`}
                    data-reliability={reliability.level}
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                    title={reliability.note}
                  >
                    {badge.label}
                  </span>
                  <p className="mt-1 max-w-[22rem] text-[11px] leading-snug text-slate-500">
                    {reliability.note}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
