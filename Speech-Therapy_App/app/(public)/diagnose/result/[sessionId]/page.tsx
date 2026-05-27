// FR-Q-002 — 또래 비교 리포트 RSC.
// REQ-FUNC-010~014: SSR p95 ≤ 1.5s / Disclaimer 100% (3중) / 넛지 카피 / 금칙어 0건 / 유료 전환 CTA.
// Sprint 1 단계: DB 조회는 FR-C-001 구현 후 활성. 현재는 MOCK 매핑으로 동작.
// FR-C-001 가 만들어지면 본 페이지의 fetchEvaluationResult 만 prisma 조회로 교체.

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCachedUser } from "@/lib/auth/cached-get-user";
import { mockSuccessHigh, mockSuccessLow } from "@/lib/mocks/diagnosis";
import type { DiagnosisOutput } from "@/lib/schemas/diagnosis";
import { RewardOnMount } from "./RewardOnMount";
import { CushionAsync } from "./CushionAsync";
import { ResultViewedBeacon, TrackedCTALink } from "./ResultAnalytics";

interface PageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = {
  title: "발음 발달 결과 — Speech-Therapy",
  description: "또래 비교 결과를 부모님께 안내합니다. 본 결과는 의료적 평가가 아닌 발달 참고 자료입니다.",
};

interface FetchedResult {
  output: DiagnosisOutput;
  /// FR-C-009 reward 호출용. mock 데이터엔 null → 보상 미발급.
  userId: string | null;
  /// DB 의 aiCushionText 원본 (null = 아직 생성 안 됨 → CushionAsync 가 후속 호출).
  cushionFromDb: string | null;
}

// FR-C-001 통합: MOCK sessionId 는 우선 매핑, 그 외엔 evaluation_results 조회.
async function fetchEvaluationResult(sessionId: string): Promise<FetchedResult | null> {
  if (sessionId === mockSuccessHigh.sessionId) {
    return { output: mockSuccessHigh, userId: null, cushionFromDb: mockSuccessHigh.aiCushionText };
  }
  if (sessionId === mockSuccessLow.sessionId) {
    return { output: mockSuccessLow, userId: null, cushionFromDb: mockSuccessLow.aiCushionText };
  }
  try {
    const row = await prisma.evaluationResult.findUnique({ where: { sessionId } });
    if (!row) return null;
    return {
      output: {
        sessionId: row.sessionId,
        articulationScore: row.articulationScore,
        linguisticScore: row.linguisticScore,
        acousticScore: row.acousticScore,
        peerPercentile: row.peerPercentile,
        confidence: row.confidence,
        aiCushionText: row.aiCushionText ?? "",
        requiresHITL: !row.hitlReviewed && row.confidence < 70,
        disclaimerRequired: true,
      },
      userId: row.userId,
      cushionFromDb: row.aiCushionText,
    };
  } catch (err) {
    // DB 일시 장애 시 사용자에게는 404 가 자연스러움. 로깅만.
    console.error("evaluationResult fetch failed:", err);
    return null;
  }
}

function getNudgeCopy(peerPercentile: number): string {
  // 99% 이상은 "상위 0%" 같은 어색한 표현 회피.
  if (peerPercentile >= 99) return "또래 중 최상위에 가까워요!";
  if (peerPercentile >= 80) {
    const top = Math.max(1, 100 - Math.round(peerPercentile));
    return `또래의 상위 ${top}% 안에 들어요.`;
  }
  if (peerPercentile >= 40) return "또래와 비슷한 수준이에요.";
  return "조금 더 연습하면 좋아져요.";
}

/// peerPercentile 의 시각 분기 — emerald (high) / sky (mid) / amber (low).
/// 의료 단정 표현 회피 — 점수 자체보다 격려 톤 강조 (CON-04).
function getBandStyles(peerPercentile: number): { bar: string; copy: string; emoji: string } {
  if (peerPercentile >= 80)
    return {
      bar: "bg-emerald-500",
      copy: "text-emerald-700 dark:text-emerald-300",
      emoji: "🌟",
    };
  if (peerPercentile >= 40)
    return {
      bar: "bg-sky-500",
      copy: "text-sky-700 dark:text-sky-300",
      emoji: "👍",
    };
  return {
    bar: "bg-amber-500",
    copy: "text-amber-700 dark:text-amber-300",
    emoji: "🌱",
  };
}

export default async function DiagnosisResultPage({ params, searchParams }: PageProps) {
  const { sessionId } = await params;
  const sp = await searchParams;
  const phoneme = typeof sp.phoneme === "string" ? sp.phoneme : "ㅅ";
  const age = typeof sp.age === "string" ? sp.age : "";
  const transcript = typeof sp.transcript === "string" ? sp.transcript : "";
  const intendedWord = typeof sp.intendedWord === "string" ? sp.intendedWord : "";

  const fetched = await fetchEvaluationResult(sessionId);
  if (!fetched) notFound();
  const result = fetched.output;

  // 익명 / 인증 분기 — Supabase auth.uid 만 신뢰. mock 또는 비로그인 = 익명.
  // 익명 user 에게는 회원가입 안내 + 별 영구 보존 카피 노출.
  const authUser = await getCachedUser();
  const isAuthenticated = authUser !== null;

  const nudgeCopy = getNudgeCopy(result.peerPercentile);
  const band = getBandStyles(result.peerPercentile);
  const heardWord = result.heardWord ?? transcript;
  const displayIntended = result.intendedWord ?? intendedWord;
  const isPerfectMatch =
    displayIntended.length > 0 && heardWord.length > 0 && displayIntended === heardWord;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* Disclaimer #1 — 상단 */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 결과는 의료적 평가가 아닌 발달 참고 자료입니다.
      </p>

      {/* FR-C-009 — 실 사용자만 별 적립. mock 데이터엔 미발급. */}
      {fetched.userId && <RewardOnMount userId={fetched.userId} sessionId={sessionId} />}

      {/* INFRA-005-FU #104 — 페이지 mount 1회 result_viewed 발송. */}
      <ResultViewedBeacon
        peerPercentile={result.peerPercentile}
        hasHITL={result.requiresHITL}
      />

      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">{phoneme} 발음 확인 결과</h1>
        {age && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{age} 개월</p>
        )}
      </header>

      {/* Sprint 2 §2 — 의도 vs 실현 비교 */}
      {displayIntended && (
        <section
          className={`mb-6 rounded-lg border p-4 ${
            isPerfectMatch
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
              : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
          }`}
          aria-label="발음 비교"
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">의도한 단어</p>
              <p className="mt-1 text-lg font-semibold">{displayIntended}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">들린 단어</p>
              <p className="mt-1 text-lg font-semibold">
                {heardWord || "—"}
                {isPerfectMatch && (
                  <span className="ml-2 text-sm text-emerald-700 dark:text-emerald-300">
                    ✓ 일치
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 3축 점수 카드 (Sprint 3 에서 분리 재설계 예정 — 현재 모두 articulation 동값) */}
      <section className="mb-6 grid grid-cols-3 gap-3" aria-label="3축 점수">
        <ScoreCard label="조음" value={result.articulationScore} />
        <ScoreCard label="언어" value={result.linguisticScore} />
        <ScoreCard label="음향" value={result.acousticScore} />
      </section>

      {/* 또래 백분위 + 시각 바 + Disclaimer #2 (차트 옆) */}
      <section className="mb-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm">또래 백분위</p>
          <p className={`text-3xl font-bold tabular-nums ${band.copy}`}>
            {Math.round(result.peerPercentile)}%
          </p>
        </div>
        <PercentileBar value={result.peerPercentile} barClassName={band.bar} />
        <p
          data-testid="result-nudge-copy"
          className={`mt-3 text-sm font-medium ${band.copy}`}
        >
          <span className="mr-1" aria-hidden>
            {band.emoji}
          </span>
          {nudgeCopy}
        </p>
        <CushionAsync sessionId={sessionId} initialText={fetched.cushionFromDb} />
        <p
          data-testid="disclaimer"
          className="mt-3 text-xs text-gray-500 dark:text-gray-400"
        >
          참고: 같은 월령대 데이터와 비교한 결과입니다. 의료적 평가가 아닙니다.
        </p>
      </section>

      {result.requiresHITL && (
        <p className="mb-6 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          더 정확한 안내를 위해 전문가 검토 단계로 전달했습니다. 결과는 이메일로 알려드릴게요.
        </p>
      )}

      {/* 유료 전환 CTA — REQ-FUNC-014 */}
      <section className="mb-10 rounded-lg bg-emerald-50 p-4 dark:bg-emerald-950/30">
        <h2 className="text-lg font-semibold">매일 1분 미션으로 이어가기</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          오늘의 발음에 맞춘 데일리 미션으로 차근차근 즐겁게 이어갈 수 있어요.
        </p>
        {/* 익명 user — 회원가입 안내 (별 / 결과 영구 보존). */}
        {!isAuthenticated && (
          <p
            data-testid="result-anonymous-signup-hint"
            className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
          >
            💡 <strong>회원가입하면 별 ⭐ 과 결과가 영구 보존</strong>돼요. 다음 진단 시 자녀
            정보도 자동으로 불러와요.
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {!isAuthenticated && (
            <TrackedCTALink
              href="/login?next=/missions"
              cta="auth_signin"
              className="inline-block rounded-md border border-emerald-600 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800"
            >
              회원가입 / 로그인
            </TrackedCTALink>
          )}
          <TrackedCTALink
            href="/missions"
            cta="weekly_mission"
            className="inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            주간 미션 시작하기
          </TrackedCTALink>
        </div>
      </section>

      <Link
        href="/diagnose"
        className="mb-8 inline-block text-sm text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        다시 발음 확인하기
      </Link>

      {/* Disclaimer #3 — 하단 */}
      <p
        data-testid="disclaimer"
        className="mt-2 rounded-md border border-gray-200 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400"
      >
        본 결과는 의료적 평가가 아니며, 발달이 우려되는 경우 전문가 상담을 권장합니다.
      </p>
    </main>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-700">
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{Math.round(value)}</p>
    </div>
  );
}

function PercentileBar({
  value,
  barClassName = "bg-emerald-500",
}: {
  value: number;
  /// score band 별 색상 차별화 (getBandStyles 반환의 bar). default emerald.
  barClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
      role="img"
      aria-label={`또래 백분위 ${Math.round(clamped)} 퍼센트`}
    >
      <div
        className={`h-full rounded-full transition-all ${barClassName}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
