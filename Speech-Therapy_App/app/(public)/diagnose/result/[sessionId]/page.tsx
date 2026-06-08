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
// CL-03 (KOPLAC 검증 완료) — articulation 임상 밴드 해석 (가산, 점수 무변경, ADR-04 치환).
import {
  articulationInterpretation,
  buildDevelopmentalContext,
  type DevelopmentalDisplayContext,
} from "./clinical-interpretation";
// FR-C-LIT-02 (CR-2026-007) — F4 음운변동 제품화: 탐지된 변동을 부모용 음소 핀셋 분석으로 표시(display-only).
import { analyzeErrorPattern, type ErrorPatternAnalysis } from "@/lib/diagnose/clinical";

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
  /// CL-02 발달 위계 — articulation 밴드 *표시* 완화용 음소·연령(점수 숫자 무변경).
  /// mock 데이터엔 null → 밴드 완화 미적용(raw 기준).
  clinicalContext: { phoneme: string; ageMonths: number } | null;
}

// FR-C-001 통합: MOCK sessionId 는 우선 매핑, 그 외엔 evaluation_results 조회.
async function fetchEvaluationResult(sessionId: string): Promise<FetchedResult | null> {
  if (sessionId === mockSuccessHigh.sessionId) {
    return { output: mockSuccessHigh, userId: null, cushionFromDb: mockSuccessHigh.aiCushionText, clinicalContext: null };
  }
  if (sessionId === mockSuccessLow.sessionId) {
    return { output: mockSuccessLow, userId: null, cushionFromDb: mockSuccessLow.aiCushionText, clinicalContext: null };
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
        // CL-04 durable — 단어 표시 + 발달 게이팅 재구성용(레거시 row 는 null → searchParams 폴백).
        intendedWord: row.intendedWord ?? undefined,
        heardWord: row.heardWord ?? undefined,
      },
      userId: row.userId,
      cushionFromDb: row.aiCushionText,
      clinicalContext: { phoneme: row.targetPhoneme, ageMonths: row.childAgeMonths },
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
  // CL-03 — articulation(조음) 임상 밴드 해석 (검증된 U-TAP PCC 절단점 기반).
  // CL-02(display-only) — clinicalContext 있으면 발달 위계로 밴드/카피만 완화(숫자는 raw 유지).
  // CL-04 — 단일 변동 탐지 → 발달 보정 게이팅(atypical/비-타깃 슬롯이면 완화 skip).
  //   durable: DB 저장(intendedWord/heardWord) 우선 → 새로고침/공유에도 안정. 레거시 row(null)는
  //   searchParams 폴백. 둘 다 없거나 변동 미탐지 시 → 기존 phoneme×age 완화 폴백(회귀 아님).
  const effectiveIntended = result.intendedWord ?? intendedWord;
  const effectiveTranscript = result.heardWord ?? transcript;
  let articulationCtx: DevelopmentalDisplayContext | undefined =
    fetched.clinicalContext ?? undefined;
  if (articulationCtx && effectiveIntended && effectiveTranscript) {
    articulationCtx = buildDevelopmentalContext(articulationCtx, effectiveIntended, effectiveTranscript);
  }
  const articulationCopy = articulationInterpretation(result.articulationScore, articulationCtx);
  // FR-C-LIT-02 — 탐지된 단일 음운 변동을 부모용 음소 핀셋 분석으로 표시. 점수/HITL/저장 raw 불변
  //   (display-only): intendedWord/heardWord 재계산이라 errorPattern DB 저장과 무관. 미탐지 시 null → 미표시.
  const errorPattern: ErrorPatternAnalysis | null =
    fetched.clinicalContext && effectiveIntended && effectiveTranscript
      ? analyzeErrorPattern(
          effectiveIntended,
          effectiveTranscript,
          fetched.clinicalContext.phoneme,
          fetched.clinicalContext.ageMonths,
        )
      : null;
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
          {/* 미일치 — CON-04 격려 톤 (불안 완화 + 미션 유도). "틀림" 인상 회피. */}
          {!isPerfectMatch && (
            <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
              비슷하게 말했어요. 미션으로 또박또박 함께 연습해 봐요.
            </p>
          )}
          {/* FR-C-LIT-02 — 음소 핀셋: 탐지된 발음 패턴 + 발달 톤 안내 (ADR-04 금칙어 0, 점수 무변경). */}
          {errorPattern && (
            <div
              data-testid="error-pattern-analysis"
              className="mt-3 rounded-md bg-white/70 px-3 py-2 dark:bg-slate-900/40"
            >
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                <span className="mr-1" aria-hidden>
                  {errorPattern.emoji}
                </span>
                발음 패턴: {errorPattern.label}
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {errorPattern.parentNote}
              </p>
            </div>
          )}
        </section>
      )}

      {/* 3축 점수 카드 (Sprint 3 에서 분리 재설계 예정 — 현재 모두 articulation 동값) */}
      <section className="mb-6" aria-label="3축 점수">
        <div className="grid grid-cols-3 gap-3">
          <ScoreCard label="조음" value={result.articulationScore} />
          <ScoreCard label="언어" value={result.linguisticScore} />
          <ScoreCard label="음향" value={result.acousticScore} />
        </div>
        {/* 부모 명료성 — 점수 척도 안내 (불안형 페르소나 이해도). */}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          각 항목은 100점 만점이에요.
        </p>
        {/* CL-03 (KOPLAC 검증) — 조음 임상 밴드 해석. ADR-04 치환 톤(금칙어 0). */}
        <p
          data-testid="articulation-interpretation"
          className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <span className="mr-1" aria-hidden>
            {articulationCopy.emoji}
          </span>
          {articulationCopy.label}
        </p>
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
            💡 <strong>회원가입하면 별 ⭐ 과 결과가 영구 보존</strong>돼요. 다음 발음 확인 시
            자녀 정보도 자동으로 불러와요.
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
      <p className="text-2xl font-bold tabular-nums">
        {Math.round(value)}
        <span className="ml-0.5 text-sm font-normal text-gray-400 dark:text-gray-500">
          /100
        </span>
      </p>
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
