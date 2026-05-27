// FR-Q-003-CONTENT — 미션 플레이 페이지 (난이도별 콘텐츠 라우팅).
//
// 5/27 prod 검증 회귀 fix —
// 기존엔 /missions 의 모든 카드가 /diagnose?phoneme=X 로 fallback 되어 난이도별 UI 가
// 동일했음. 본 페이지가 missionId 로 fixture 를 lookup → 난이도에 맞는 콘텐츠 inject.
//
// 난이도 1 → 콘텐츠 없음 (MissionRunner 단독, 기존 발음 진단 흐름)
// 난이도 2 → MissionWordFill (단어 빈칸 채우기)
// 난이도 3 → MissionSentenceBuild (짧은 문장 만들기)

import Link from "next/link";
import { notFound } from "next/navigation";
import { dailyMissionFixtures } from "@/lib/mocks/missions";
import { getMissionContent } from "@/lib/mocks/mission-content";
import { MissionRunner } from "../../MissionRunner";
import { MissionWordFill } from "@/components/missions/MissionWordFill";
import { MissionSentenceBuild } from "@/components/missions/MissionSentenceBuild";

interface PageProps {
  params: Promise<{ missionId: string }>;
}

export const metadata = {
  title: "미션 — Speech-Therapy",
  description: "오늘의 미션을 함께 진행해 보세요.",
};

export const dynamic = "force-dynamic";

export default async function MissionPlayPage({ params }: PageProps) {
  const { missionId } = await params;

  // 한국어 자음이 fixture id 에 포함됨 (예: `mock-ㅅ-2`). URL encoding/decoding 과정에서
  // unicode normalization (NFC vs NFD) 차이 가능 → 양쪽 NFC normalize 후 비교.
  const normalizedId = missionId.normalize("NFC");
  const mission = dailyMissionFixtures.find(
    (m) => m.id.normalize("NFC") === normalizedId,
  );
  if (!mission) {
    notFound();
  }

  const content = getMissionContent(mission.targetPhoneme, mission.difficultyLevel);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12" data-testid="mission-play-page">
      {/* CON-04 disclaimer 1중 */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 미션은 부모님께 발달 확인 정보를 안내하는 보조 도구입니다. 의료적 평가가 아닙니다.
      </p>

      <Link
        href="/missions"
        className="mb-4 inline-block text-sm text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        ← 미션 목록으로
      </Link>

      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">{mission.title}</h1>
        <p className="text-sm text-gray-700 dark:text-gray-300">{mission.instructionText}</p>
        <div className="flex gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span>
            음소: <strong>{mission.targetPhoneme}</strong>
          </span>
          <span>
            난이도: <strong>{mission.difficultyLevel}/5</strong>
          </span>
          <span>
            월령: <strong>{mission.ageRangeMin}~{mission.ageRangeMax}개월</strong>
          </span>
        </div>
      </header>

      <section
        className="rounded-lg border-2 border-emerald-500 bg-emerald-50 p-5 dark:bg-emerald-950/30"
        data-testid="mission-play-section"
      >
        <MissionRunner
          missionId={mission.id}
          targetPhoneme={mission.targetPhoneme}
          difficultyLevel={mission.difficultyLevel}
        >
          {content?.difficultyLevel === 2 && (
            <MissionWordFill phoneme={content.phoneme} words={content.words} />
          )}
          {content?.difficultyLevel === 3 && (
            <MissionSentenceBuild phoneme={content.phoneme} sentences={content.sentences} />
          )}
        </MissionRunner>
      </section>
    </main>
  );
}
