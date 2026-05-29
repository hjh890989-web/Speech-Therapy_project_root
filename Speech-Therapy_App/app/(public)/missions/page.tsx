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
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dailyMissionFixtures, type MissionFixture } from "@/lib/mocks/missions";
import { MissionRunner } from "./MissionRunner";
import { getMissionContent } from "@/lib/mocks/mission-content";
import { MissionPhonemeIsolation } from "@/components/missions/MissionPhonemeIsolation";
import { MissionSyllable } from "@/components/missions/MissionSyllable";
import { MissionWordRepeat } from "@/components/missions/MissionWordRepeat";
import { MissionPhrase } from "@/components/missions/MissionPhrase";
import { MissionSentenceBuild } from "@/components/missions/MissionSentenceBuild";
import { MissionConversation } from "@/components/missions/MissionConversation";
import { ParentCoachingTip } from "@/components/missions/ParentCoachingTip";
import { mockContinue } from "@/lib/mocks/curriculum";
import { analyzeStreaks, decideRecommendation } from "@/lib/curriculum";
import {
  pickRecommendedMission,
  findMostFrequentPhoneme,
  shouldRecommendRest,
  SUCCESS_THRESHOLD,
  type MissionRecommendation,
  type RecentActivity,
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

// FR-Q-003 Scenario 5 — 휴식 권유 시 EmptyState 렌더용 분기 타입.
type RecommendationState =
  | { kind: "available"; recommendation: MissionRecommendation }
  | { kind: "rest_needed"; alternativePhoneme?: string };

async function computeRecommendation(userId: string | undefined): Promise<RecommendationState> {
  // 폴백: 익명 미사용자 → mockContinue 기반 (Sprint 1 단순화 흐름 유지).
  const fallbackRecommendation: MissionRecommendation =
    pickRecommendedMission(
      { difficulty: 2, phoneme: "ㅅ", reason: "continue" },
      dailyMissionFixtures,
    ) ?? {
      mission: dailyMissionFixtures[0],
      reason: "continue" as const,
      copy: "오늘의 추천",
    };
  const fallback: RecommendationState = { kind: "available", recommendation: fallbackRecommendation };

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

    // Scenario 5 — 4시간 윈도우 5+ 성공이면 휴식 권유.
    const activity: RecentActivity[] = evaluated.map((s) => ({
      success: s.evaluationResult!.articulationScore >= SUCCESS_THRESHOLD,
      timestamp: s.startTime.toISOString(),
      targetPhoneme: s.evaluationResult!.targetPhoneme,
    }));
    const restCheck = shouldRecommendRest(activity);
    if (restCheck.rest) {
      return { kind: "rest_needed", alternativePhoneme: restCheck.alternativePhoneme };
    }

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

    const recommendation = pickRecommendedMission(decision, dailyMissionFixtures);
    if (recommendation) return { kind: "available", recommendation };
    return fallback;
  } catch (err) {
    console.error("missions: 추천 계산 실패", err);
    return fallback;
  }
}

async function resolveUserId(): Promise<string | undefined> {
  // 1순위: 인증된 Supabase 사용자.
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  } catch {
    // env 미설정 시 익명 폴백.
  }
  // 2순위: 익명 cookie.
  const cookieStore = await cookies();
  return cookieStore.get(ANONYMOUS_USER_COOKIE)?.value;
}

export default async function MissionsPage() {
  // FR-C-008: 인증/익명 사용자 cookie → SessionLog 분석 → 적응형 추천.
  const userId = await resolveUserId();
  const state = await computeRecommendation(userId);

  // Sprint 1 호환: mockContinue 매칭 결과가 없을 때를 위한 안전망.
  const mockRecommended =
    dailyMissionFixtures.find((m) => m.id === mockContinue.recommendedMissionId) ??
    dailyMissionFixtures[0];

  const headerSection = (
    <>
      {/* Disclaimer 1중 — CON-04 */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 미션은 부모님께 발달 확인 정보를 안내하는 보조 도구입니다. 의료적 평가가 아닙니다.
      </p>
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">오늘의 미션</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          짧고 즐거운 발음 미션이에요. 하루 1~3분만 함께해 보세요.
        </p>
        {/* FR-Q-003-CONTENT-V2 UX — 미션 = 연습, 진단 = 점수 측정 역할 분리. */}
        <p className="text-xs text-gray-500 dark:text-gray-500">
          미션은 발음을 입에 익히는 <strong>연습</strong>이고, 정확도 점수는 미션 완료 후
          <strong> &lsquo;발음 연습&rsquo;</strong>에서 받아요.
        </p>
      </header>
    </>
  );

  // FR-Q-003 Scenario 5 — 휴식 권유 (NO_MISSIONS_AVAILABLE) 분기.
  if (state.kind === "rest_needed") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {headerSection}
        <RestEmptyState alternativePhoneme={state.alternativePhoneme} />
      </main>
    );
  }

  const recommended = state.recommendation.mission;
  // FR-Q-003-CONTENT-V2 — 추천 영역 inline MissionRunner 도 콘텐츠 inject.
  // (이전엔 carousel children 미통합 → 추천 영역 "시작" 시 콘텐츠 없음. 카드 그리드의
  // /missions/<id>/play 흐름과 동일한 콘텐츠 노출로 정합화.)
  const recContent = getMissionContent(recommended.targetPhoneme, recommended.difficultyLevel);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {headerSection}

      {/* 추천 미션 1개 강조 — FR-C-008 적응형 카피 */}
      <section className="mb-10 rounded-lg border-2 border-emerald-500 bg-emerald-50 p-5 dark:bg-emerald-950/30">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {state.recommendation.copy}
        </p>
        <h2 className="mb-2 text-xl font-bold">{recommended.title}</h2>
        <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
          {recommended.instructionText}
        </p>
        <div className="mb-4 flex gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span>음소: <strong>{recommended.targetPhoneme}</strong></span>
          <span>난이도: <strong>{recommended.difficultyLevel}/6</strong></span>
          <span>월령: <strong>{recommended.ageRangeMin}~{recommended.ageRangeMax}개월</strong></span>
        </div>
        <MissionRunner
          missionId={recommended.id}
          targetPhoneme={recommended.targetPhoneme}
          difficultyLevel={recommended.difficultyLevel}
        >
          {recContent?.difficultyLevel === 1 && (
            <MissionPhonemeIsolation phoneme={recContent.phoneme} isolation={recContent.isolation} />
          )}
          {recContent?.difficultyLevel === 2 && (
            <MissionSyllable phoneme={recContent.phoneme} syllables={recContent.syllables} />
          )}
          {recContent?.difficultyLevel === 3 && (
            <MissionWordRepeat phoneme={recContent.phoneme} words={recContent.words} />
          )}
          {recContent?.difficultyLevel === 4 && (
            <MissionPhrase phoneme={recContent.phoneme} phrases={recContent.phrases} />
          )}
          {recContent?.difficultyLevel === 5 && (
            <MissionSentenceBuild phoneme={recContent.phoneme} sentences={recContent.sentences} />
          )}
          {recContent?.difficultyLevel === 6 && (
            <MissionConversation phoneme={recContent.phoneme} conversations={recContent.conversations} />
          )}
        </MissionRunner>
        {/* REQ-FUNC-CL-07 — 난이도별 4대 핵심기법 부모 코칭. */}
        <ParentCoachingTip level={recommended.difficultyLevel} />
      </section>

      {/* 전체 카드 그리드 — 5 자모 × 3 난이도 = 15개 모두 노출.
          (2026-05-27 fix — recommended/mockRecommended filter 제거. 사용자가 "왜 ㄱ 따라하기 /
          ㅅ 문장 만들기 안 보이지?" 혼란 회피. 추천 카드는 시각 강조 ring 으로 분리.) */}
      <section aria-label="미션 카드 그리드">
        <h2 className="mb-3 text-lg font-semibold">전체 미션 둘러보기</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dailyMissionFixtures.map((mission) => {
            const isRecommended =
              mission.id === recommended.id || mission.id === mockRecommended.id;
            return (
              <article
                key={mission.id}
                className={`rounded-lg border p-4 transition hover:border-emerald-400 dark:border-gray-700 ${
                  isRecommended
                    ? "border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900/40"
                    : "border-gray-200"
                }`}
              >
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  {PHONEME_TITLE[mission.targetPhoneme] ?? `${mission.targetPhoneme} 소리`}
                  {isRecommended && (
                    <span className="ml-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                      ★ 오늘의 추천
                    </span>
                  )}
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
                {/* FR-Q-003-CONTENT — 난이도별 콘텐츠 분기. 5/27 prod 검증 회귀 fix
                    (이전엔 모든 카드가 /diagnose 로 fallback). */}
                <Link
                  href={`/missions/${encodeURIComponent(mission.id)}/play`}
                  className="inline-block min-h-[44px] rounded-md border border-emerald-500 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  시작
                </Link>
              </article>
            );
          })}
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

// FR-Q-003 Scenario 5 — 휴식 권유 EmptyState. CON-04 의료/실패 어휘 미사용.
function RestEmptyState({ alternativePhoneme }: { alternativePhoneme?: string }) {
  const altFixture = alternativePhoneme
    ? dailyMissionFixtures.find(
        (m) => m.targetPhoneme === alternativePhoneme && m.difficultyLevel === 1,
      ) ?? null
    : null;

  return (
    <section
      data-testid="missions-rest-empty"
      className="rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-950/20"
    >
      <p className="mb-2 text-4xl" aria-hidden="true">🌿</p>
      <h2 className="mb-2 text-lg font-semibold">오늘은 충분히 잘 했어요</h2>
      <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
        잠시 쉬면서 아이와 함께 다른 놀이를 해도 좋아요.
      </p>
      {altFixture && (
        <div className="mx-auto max-w-sm rounded-md border border-emerald-200 bg-white p-4 text-left dark:border-emerald-800 dark:bg-gray-900">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
            새로운 발음을 가볍게 만나볼까요?
          </p>
          <h3 className="mb-2 text-sm font-semibold">{altFixture.title}</h3>
          <Link
            href={`/diagnose?phoneme=${encodeURIComponent(altFixture.targetPhoneme)}`}
            className="inline-block min-h-[44px] rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
          >
            {altFixture.targetPhoneme} 소리 만나기
          </Link>
        </div>
      )}
      <Link
        href="/rewards"
        className="mt-6 inline-block text-sm text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        오늘까지 모은 보상 보기
      </Link>
    </section>
  );
}
