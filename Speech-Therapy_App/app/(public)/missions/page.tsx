// FR-Q-003 + FR-C-008 — 데일리 미션 (적응형 난이도 통합).
//
// Sprint 2 통합:
// - cookie 의 anonymousUserId 로 최근 10 SessionLog + EvaluationResult 조회
// - articulationScore ≥ 70 → success, lib/curriculum 의 streak 분석
// - 3연속 실패 → level_down (은밀히, REQ-FUNC-021), 5연속 성공 → level_up
// - dailyMissionFixtures 에서 (phoneme + difficulty) 매칭 → 추천
// - 신규 사용자 / 세션 없음 → mockContinue 폴백
//
// CON-04: 실패/X표시 어휘 금지. 격려 카피만 사용.

import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ANONYMOUS_USER_COOKIE } from "@/lib/anonymous-user";
import { dailyMissionFixtures, type MissionFixture } from "@/lib/mocks/missions";
import { mockContinue } from "@/lib/mocks/curriculum";
import { analyzeStreaks, decideRecommendation } from "@/lib/curriculum";
import {
  pickRecommendedMission,
  findMostFrequentPhoneme,
  SUCCESS_THRESHOLD,
  type MissionRecommendation,
} from "@/lib/mission-recommender";
import type { SessionResult } from "@/lib/schemas/curriculum";

export const metadata = {
  title: "오늘의 미션 — Speech-Therapy",
  description: "오늘 우리 아이의 발음 발달 단계에 맞춘 짧은 미션 카드입니다.",
};

export const dynamic = "force-dynamic";

const PHONEME_TITLE: Record<string, string> = {
  ㄱ: "거북이 소리",
  ㄴ: "나비 소리",
  ㅅ: "사과 소리",
  ㅈ: "지렁이 소리",
};

const SUPPORTED_PHONEMES = ["ㅅ", "ㅈ", "ㄱ", "ㄴ", "ㄹ"] as const;
type SupportedPhoneme = (typeof SUPPORTED_PHONEMES)[number];

function isSupportedPhoneme(p: string | null): p is SupportedPhoneme {
  return p !== null && (SUPPORTED_PHONEMES as ReadonlyArray<string>).includes(p);
}

async function computeRecommendation(userId: string | undefined): Promise<MissionRecommendation> {
  // 폴백: 익명 미사용자 → mockContinue 기반 (Sprint 1 단순화 흐름 유지).
  const fallback = pickRecommendedMission(
    { difficulty: 2, phoneme: "ㅅ", reason: "continue" },
    dailyMissionFixtures,
  ) ?? {
    mission: dailyMissionFixtures[0],
    reason: "continue" as const,
    copy: "오늘의 추천",
  };

  if (!userId) return fallback;

  try {
    const recentSessions = await prisma.sessionLog.findMany({
      where: { userId },
      take: 10,
      orderBy: { startTime: "desc" },
      include: { evaluationResult: true },
    });

    const evaluated = recentSessions.filter((s) => s.evaluationResult !== null);
    if (evaluated.length === 0) return fallback;

    // 진단 세션은 missionId 가 null — analyzeStreaks 는 missionId 안 보므로 dummy 채움.
    const sessions: SessionResult[] = evaluated.map((s) => ({
      sessionId: s.id,
      missionId: s.missionId ?? s.id,
      success: s.evaluationResult!.articulationScore >= SUCCESS_THRESHOLD,
      timestamp: s.startTime.toISOString(),
    }));

    // 가장 자주 발화한 음소 (없으면 ㅅ 폴백).
    const phonemes = evaluated.map((s) => s.evaluationResult!.targetPhoneme);
    const topPhonemeRaw = findMostFrequentPhoneme(phonemes);
    const preferredPhoneme: SupportedPhoneme = isSupportedPhoneme(topPhonemeRaw) ? topPhonemeRaw : "ㅅ";

    const streak = analyzeStreaks(sessions, 2, preferredPhoneme);
    const decision = decideRecommendation(streak, 2, preferredPhoneme);

    return (
      pickRecommendedMission(decision, dailyMissionFixtures) ?? fallback
    );
  } catch (err) {
    console.error("missions: 추천 계산 실패", err);
    return fallback;
  }
}

export default async function MissionsPage() {
  // FR-C-008: 익명 사용자 cookie → SessionLog 분석 → 적응형 추천.
  const cookieStore = await cookies();
  const userId = cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
  const recommendation = await computeRecommendation(userId);
  const recommended = recommendation.mission;

  // Sprint 1 호환: mockContinue 매칭 결과가 없을 때를 위한 안전망.
  const mockRecommended =
    dailyMissionFixtures.find((m) => m.id === mockContinue.recommendedMissionId) ??
    dailyMissionFixtures[0];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Disclaimer 1중 — CON-04 */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 미션은 부모님께 발달 확인 정보를 안내하는 보조 도구입니다. 의료적 판단이 아닙니다.
      </p>

      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">오늘의 미션</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          짧고 즐거운 발음 미션이에요. 하루 1~3분만 함께해 보세요.
        </p>
      </header>

      {/* 추천 미션 1개 강조 — FR-C-008 적응형 카피 */}
      <section className="mb-10 rounded-lg border-2 border-emerald-500 bg-emerald-50 p-5 dark:bg-emerald-950/30">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {recommendation.copy}
        </p>
        <h2 className="mb-2 text-xl font-bold">{recommended.title}</h2>
        <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
          {recommended.instructionText}
        </p>
        <div className="mb-4 flex gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span>음소: <strong>{recommended.targetPhoneme}</strong></span>
          <span>난이도: <strong>{recommended.difficultyLevel}/5</strong></span>
          <span>월령: <strong>{recommended.ageRangeMin}~{recommended.ageRangeMax}개월</strong></span>
        </div>
        <Link
          href={`/diagnose?phoneme=${encodeURIComponent(recommended.targetPhoneme)}`}
          className="inline-block min-h-[44px] rounded-md bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
        >
          미션 시작하기
        </Link>
      </section>

      {/* 전체 카드 그리드 */}
      <section aria-label="미션 카드 그리드">
        <h2 className="mb-3 text-lg font-semibold">다른 미션 둘러보기</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dailyMissionFixtures
            .filter((m: MissionFixture) => m.id !== recommended.id && m.id !== mockRecommended.id)
            .map((mission) => (
              <article
                key={mission.id}
                className="rounded-lg border border-gray-200 p-4 transition hover:border-emerald-400 dark:border-gray-700"
              >
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  {PHONEME_TITLE[mission.targetPhoneme] ?? `${mission.targetPhoneme} 소리`}
                </p>
                <h3 className="mb-2 text-base font-semibold">{mission.title}</h3>
                <p className="mb-3 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                  {mission.instructionText}
                </p>
                <div className="mb-3 flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>난이도 {mission.difficultyLevel}</span>
                  <span>·</span>
                  <span>{mission.ageRangeMin}~{mission.ageRangeMax}개월</span>
                </div>
                <Link
                  href={`/diagnose?phoneme=${encodeURIComponent(mission.targetPhoneme)}`}
                  className="inline-block min-h-[44px] rounded-md border border-emerald-500 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  시작
                </Link>
              </article>
            ))}
        </div>
      </section>

      <Link
        href="/rewards"
        className="mt-10 inline-block text-sm text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        오늘까지 모은 보상 보기
      </Link>
    </main>
  );
}
