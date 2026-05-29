// FR-C-003-2 — 미션 카드 DB 조회 레이어 (하이브리드: 메타 DB + 콘텐츠 코드).
//
// 카드 메타는 MissionCard 테이블에서 조회. 실제 콘텐츠 payload(음절/단어/구/문장/대화)는
// 호출부가 getMissionContent(phoneme, level) 로 별도 join (lib/mocks/mission-content.ts).
//
// graceful fallback: DB 미연결/미시드/오류 시 dailyMissionFixtures 로 폴백 →
// 로컬/CI/env 미설정 환경에서도 동작 (기존 missions/page try/catch 패턴 계승).

import { prisma } from "@/lib/db";
import { dailyMissionFixtures, type MissionFixture } from "@/lib/mocks/missions";
import { RewardTypeSchema } from "@/lib/schemas/reward";

// 한국어 음운론 위계 정렬 (seed/fixtures 와 동일): 파열음 → 비음 → 마찰음 → 파찰음 → 유음.
const PHONEME_ORDER = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"];

interface MissionCardRow {
  id: string;
  targetPhoneme: string;
  difficultyLevel: number;
  rewardType: string;
  title: string;
  instructionText: string;
  ageRangeMin: number;
  ageRangeMax: number;
}

/// DB row → fixtures 와 동일한 MissionFixture shape (소비자/추천 로직 타입 호환).
function toFixture(row: MissionCardRow): MissionFixture {
  // rewardType 런타임 검증 — DB 손상/오삽입("gold" 등) 시 안전 기본값 "star".
  // (적대적 검증: unsafe `as` 캐스트가 invalid 값을 소비자로 흘려보내는 위험 차단.)
  const reward = RewardTypeSchema.safeParse(row.rewardType);
  return {
    id: row.id,
    targetPhoneme: row.targetPhoneme,
    difficultyLevel: row.difficultyLevel,
    title: row.title,
    instructionText: row.instructionText,
    rewardType: reward.success ? reward.data : "star",
    ageRangeMin: row.ageRangeMin,
    ageRangeMax: row.ageRangeMax,
  };
}

function sortByHierarchy(cards: MissionFixture[]): MissionFixture[] {
  const idx = (p: string) => {
    const i = PHONEME_ORDER.indexOf(p);
    return i < 0 ? PHONEME_ORDER.length : i;
  };
  return [...cards].sort(
    (a, b) =>
      idx(a.targetPhoneme) - idx(b.targetPhoneme) ||
      a.difficultyLevel - b.difficultyLevel,
  );
}

/// 전체 미션 카드. DB 비어있음/오류 시 fixtures 폴백.
export async function getMissionCards(): Promise<MissionFixture[]> {
  try {
    const rows = await prisma.missionCard.findMany();
    if (rows.length === 0) return [...dailyMissionFixtures];
    return sortByHierarchy(rows.map(toFixture));
  } catch {
    // 폴백도 새 배열 복사 반환 — 정상 경로(정렬된 새 배열)와 참조 일관성 +
    // 공유 fixtures 의도치 않은 mutation 방지.
    return [...dailyMissionFixtures];
  }
}

/// id 로 단일 카드. DB miss/오류 시 fixtures 폴백 → 유효 slug 면 fixtures 반환, 미존재면 null.
export async function getMissionCardById(id: string): Promise<MissionFixture | null> {
  try {
    const row = await prisma.missionCard.findUnique({ where: { id } });
    if (row) return toFixture(row);
  } catch {
    // DB 미연결 등 → fixtures 폴백.
  }
  return dailyMissionFixtures.find((m) => m.id === id) ?? null;
}
