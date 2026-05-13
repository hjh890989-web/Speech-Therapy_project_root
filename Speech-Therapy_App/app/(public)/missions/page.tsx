// FR-Q-003 — 데일리 미션 카드 (Sprint 1 단순화).
// REQ-FUNC-015~017. shadcn/ui · 인증 · Framer Motion 은 별도 PR.
// Sprint 1 범위:
//  - lib/mocks/missions 정적 픽스처 12개 카드 그리드
//  - 추천 미션 1개 (mockContinue 의 recommendedMissionId 기반) 상단 강조
//  - 각 카드 클릭 → /diagnose?phoneme=X 라우팅 (phoneme pre-select 효과)
//  - Disclaimer 1중, CON-04 금칙어 검수 통과

import Link from "next/link";
import { dailyMissionFixtures } from "@/lib/mocks/missions";
import { mockContinue } from "@/lib/mocks/curriculum";

export const metadata = {
  title: "오늘의 미션 — Speech-Therapy",
  description: "오늘 우리 아이의 발음 발달 단계에 맞춘 짧은 미션 카드입니다.",
};

const PHONEME_TITLE: Record<string, string> = {
  ㄱ: "거북이 소리",
  ㄴ: "나비 소리",
  ㅅ: "사과 소리",
  ㅈ: "지렁이 소리",
};

export default function MissionsPage() {
  // Sprint 1: recommended 는 mockContinue 의 recommendedMissionId 또는
  // fallback 으로 첫 번째 fixture. 실제 추천은 FR-C-008 + API-002 가 책임.
  const recommended =
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

      {/* 추천 미션 1개 강조 */}
      <section className="mb-10 rounded-lg border-2 border-emerald-500 bg-emerald-50 p-5 dark:bg-emerald-950/30">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          오늘의 추천
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
            .filter((m) => m.id !== recommended.id)
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
