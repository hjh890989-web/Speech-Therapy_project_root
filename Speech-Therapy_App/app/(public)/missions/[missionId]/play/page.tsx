// FR-Q-003-CONTENT — 미션 플레이 페이지 (난이도별 콘텐츠 라우팅).
//
// 5/27 prod 검증 회귀 fix —
// 기존엔 /missions 의 모든 카드가 /diagnose?phoneme=X 로 fallback 되어 난이도별 UI 가
// 동일했음. 본 페이지가 missionId 로 fixture 를 lookup → 난이도에 맞는 콘텐츠 inject.
//
// REQ-FUNC-CL-05 — 6단계 임상 위계 라우팅 (CL-05-0 매핑):
// L1 단독음소 → MissionPhonemeIsolation / L2 음절 → MissionSyllable /
// L3 단어 → MissionWordRepeat / L4 구 → MissionPhrase /
// L5 문장 → MissionSentenceBuild / L6 대화 → MissionConversation.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getMissionCardById } from "@/lib/missions/card-repo";
import { getMissionContent } from "@/lib/mocks/mission-content";
import { MissionRunner } from "../../MissionRunner";
import { MissionPhonemeIsolation } from "@/components/missions/MissionPhonemeIsolation";
import { MissionSyllable } from "@/components/missions/MissionSyllable";
import { MissionWordRepeat } from "@/components/missions/MissionWordRepeat";
import { MissionPhrase } from "@/components/missions/MissionPhrase";
import { MissionSentenceBuild } from "@/components/missions/MissionSentenceBuild";
import { MissionConversation } from "@/components/missions/MissionConversation";
import { ParentCoachingTip } from "@/components/missions/ParentCoachingTip";

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

  // FR-C-003 — DB(MissionCard)에서 카드 조회, 미연결/미시드 시 fixtures 폴백.
  // id 는 ASCII slug(mock-s-3) 라 NFC normalize 불필요.
  const mission = await getMissionCardById(missionId);
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
            난이도: <strong>{mission.difficultyLevel}/6</strong>
          </span>
          <span>
            월령: <strong>{mission.ageRangeMin}~{mission.ageRangeMax}개월</strong>
          </span>
        </div>
        {/* FR-Q-003-CONTENT-V2 UX — 미션 vs 진단 역할 분리 안내. */}
        <p
          data-testid="practice-note"
          className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-4 py-2 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
        >
          이 미션은 발음을 입에 익히는 <strong>연습</strong>이에요. 정확도 점수는 미션 완료 후
          <strong> &lsquo;발음 연습&rsquo;</strong> 단계에서 확인할 수 있어요.
        </p>
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
          {content?.difficultyLevel === 1 && (
            <MissionPhonemeIsolation phoneme={content.phoneme} isolation={content.isolation} />
          )}
          {content?.difficultyLevel === 2 && (
            <MissionSyllable phoneme={content.phoneme} syllables={content.syllables} />
          )}
          {content?.difficultyLevel === 3 && (
            <MissionWordRepeat phoneme={content.phoneme} words={content.words} />
          )}
          {content?.difficultyLevel === 4 && (
            <MissionPhrase phoneme={content.phoneme} phrases={content.phrases} />
          )}
          {content?.difficultyLevel === 5 && (
            <MissionSentenceBuild phoneme={content.phoneme} sentences={content.sentences} />
          )}
          {content?.difficultyLevel === 6 && (
            <MissionConversation phoneme={content.phoneme} conversations={content.conversations} />
          )}
        </MissionRunner>
      </section>

      {/* REQ-FUNC-CL-07 — 난이도별 4대 핵심기법 부모 코칭. */}
      <ParentCoachingTip level={mission.difficultyLevel} />
    </main>
  );
}
