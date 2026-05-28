// FR-Q-003-CONTENT — 난이도 1/2/3 미션 콘텐츠 데이터 (5 자모 × 3 난이도 = 15 sets).
//
// 본 파일은 dailyMissionFixtures 와 1:1 매칭되는 콘텐츠 정의.
// - 난이도 1: 단어 따라하기 (`MissionWordSimple[]`)
// - 난이도 2: 단어 빈칸 채우기 (`MissionWord[]`)
// - 난이도 3: 짧은 문장 만들기 (`MissionSentence[]`)
//
// 5/27 prod 검증 회귀 fix — 기존엔 모든 미션 카드가 /diagnose 로 fallback 되어
// 난이도별 UI 가 동일했음. 본 데이터 + /missions/[missionId]/play 페이지가 분리한다.
// FR-Q-003-CONTENT-V2 — 난이도 1 콘텐츠 추가 (이전엔 fallback timer 만 노출됨).
//
// CON-04: 모든 단어/문장은 자녀 친화 (만 2~7세 발달 적합) + 의료/진단/장애 금칙어 0건.

/// 난이도 1 — 단어 따라하기.
/// `text` 전체 단어, `reading` 음절 분리 표기 (`사·과`) — 부모가 자녀에게 읽어주는 가이드.
export interface MissionWordSimple {
  text: string;
  reading: string;
}

/// 난이도 2 — 단어 빈칸 채우기.
/// `full` 전체 단어, `blank` 빈칸 노출용 (마스킹 표기), `hint` 부모 → 자녀 안내.
export interface MissionWord {
  full: string;
  blank: string;
  hint: string;
}

/// 난이도 3 — 짧은 문장 만들기.
/// `template` 전체 문장, `focusWord` 강조 단어, `reading` 음절 분리 발음 가이드.
export interface MissionSentence {
  template: string;
  focusWord: string;
  reading: string;
}

export type MissionContentSet =
  | { phoneme: string; difficultyLevel: 1; words: MissionWordSimple[] }
  | { phoneme: string; difficultyLevel: 2; words: MissionWord[] }
  | { phoneme: string; difficultyLevel: 3; sentences: MissionSentence[] };

// =============================================================================
// 난이도 1 — 단어 따라하기 (5 자모 × 4~5 단어).
// =============================================================================

const WORDS_SIMPLE_GIYEOK: MissionWordSimple[] = [
  { text: "가방", reading: "가·방" },
  { text: "거북이", reading: "거·북·이" },
  { text: "기차", reading: "기·차" },
  { text: "가위", reading: "가·위" },
];

const WORDS_SIMPLE_NIEUN: MissionWordSimple[] = [
  { text: "나무", reading: "나·무" },
  { text: "나비", reading: "나·비" },
  { text: "노래", reading: "노·래" },
  { text: "너구리", reading: "너·구·리" },
];

const WORDS_SIMPLE_SIOT: MissionWordSimple[] = [
  { text: "사과", reading: "사·과" },
  { text: "사진", reading: "사·진" },
  { text: "신발", reading: "신·발" },
  { text: "사람", reading: "사·람" },
  { text: "수박", reading: "수·박" },
];

const WORDS_SIMPLE_JIEUT: MissionWordSimple[] = [
  { text: "지렁이", reading: "지·렁·이" },
  { text: "자동차", reading: "자·동·차" },
  { text: "주스", reading: "주·스" },
  { text: "장난감", reading: "장·난·감" },
];

const WORDS_SIMPLE_RIEUL: MissionWordSimple[] = [
  { text: "라면", reading: "라·면" },
  { text: "로봇", reading: "로·봇" },
  { text: "라디오", reading: "라·디·오" },
  { text: "리본", reading: "리·본" },
];

// =============================================================================
// 난이도 2 — 단어 빈칸 채우기 (5 자모 × 4~5 단어).
// =============================================================================

const WORDS_GIYEOK: MissionWord[] = [
  { full: "가방", blank: "_방", hint: "학교 갈 때 들어요" },
  { full: "구름", blank: "_름", hint: "하늘에 떠 있어요" },
  { full: "고양이", blank: "_양이", hint: "야옹 하고 울어요" },
  { full: "감자", blank: "_자", hint: "땅 속에서 자라요" },
  { full: "기차", blank: "_차", hint: "칙칙폭폭 달려요" },
];

const WORDS_NIEUN: MissionWord[] = [
  { full: "나비", blank: "_비", hint: "꽃을 좋아해요" },
  { full: "나무", blank: "_무", hint: "공원에 많아요" },
  { full: "노래", blank: "_래", hint: "흥얼흥얼 불러요" },
  { full: "누나", blank: "_나", hint: "남자 형제의 언니" },
  { full: "낙엽", blank: "_엽", hint: "가을에 떨어져요" },
];

const WORDS_SIOT: MissionWord[] = [
  { full: "사과", blank: "_과", hint: "빨간 과일이에요" },
  { full: "사진", blank: "_진", hint: "찰칵 찍어요" },
  { full: "신발", blank: "_발", hint: "발에 신어요" },
  { full: "사람", blank: "_람", hint: "친구나 가족이에요" },
  { full: "수박", blank: "_박", hint: "여름 과일이에요" },
];

const WORDS_JIEUT: MissionWord[] = [
  { full: "지우개", blank: "_우개", hint: "글씨를 지워요" },
  { full: "자전거", blank: "_전거", hint: "두 바퀴로 달려요" },
  { full: "주스", blank: "_스", hint: "꿀꺽 마셔요" },
  { full: "장난감", blank: "_난감", hint: "재미있게 가지고 놀아요" },
  { full: "지렁이", blank: "_렁이", hint: "땅 속에서 꼼지락거려요" },
];

const WORDS_RIEUL: MissionWord[] = [
  { full: "라면", blank: "_면", hint: "후루룩 먹는 면이에요" },
  { full: "로봇", blank: "_봇", hint: "삐빅 움직여요" },
  { full: "레몬", blank: "_몬", hint: "노란 신 과일이에요" },
  { full: "라디오", blank: "_디오", hint: "노래가 흘러나와요" },
  { full: "리본", blank: "_본", hint: "예쁘게 묶어요" },
];

// =============================================================================
// 난이도 3 — 짧은 문장 만들기 (5 자모 × 4~5 문장).
// =============================================================================

const SENTENCES_GIYEOK: MissionSentence[] = [
  { template: "가방을 메요", focusWord: "가방", reading: "가·방·을 메·요" },
  { template: "구름이 떠요", focusWord: "구름", reading: "구·름·이 떠·요" },
  { template: "고양이가 와요", focusWord: "고양이", reading: "고·양·이·가 와·요" },
  { template: "기차가 달려요", focusWord: "기차", reading: "기·차·가 달·려·요" },
];

const SENTENCES_NIEUN: MissionSentence[] = [
  { template: "나비가 날아요", focusWord: "나비", reading: "나·비·가 날·아·요" },
  { template: "나무가 커요", focusWord: "나무", reading: "나·무·가 커·요" },
  { template: "노래를 불러요", focusWord: "노래", reading: "노·래·를 불·러·요" },
  { template: "누나가 웃어요", focusWord: "누나", reading: "누·나·가 웃·어·요" },
];

const SENTENCES_SIOT: MissionSentence[] = [
  { template: "사과를 먹어요", focusWord: "사과", reading: "사·과·를 먹·어·요" },
  { template: "신발을 신어요", focusWord: "신발", reading: "신·발·을 신·어·요" },
  { template: "사람이 와요", focusWord: "사람", reading: "사·람·이 와·요" },
  { template: "수박이 커요", focusWord: "수박", reading: "수·박·이 커·요" },
];

const SENTENCES_JIEUT: MissionSentence[] = [
  { template: "주스를 마셔요", focusWord: "주스", reading: "주·스·를 마·셔·요" },
  { template: "자전거를 타요", focusWord: "자전거", reading: "자·전·거·를 타·요" },
  { template: "장난감을 모아요", focusWord: "장난감", reading: "장·난·감·을 모·아·요" },
  { template: "지우개를 써요", focusWord: "지우개", reading: "지·우·개·를 써·요" },
];

const SENTENCES_RIEUL: MissionSentence[] = [
  { template: "라면을 먹어요", focusWord: "라면", reading: "라·면·을 먹·어·요" },
  { template: "로봇이 움직여요", focusWord: "로봇", reading: "로·봇·이 움·직·여·요" },
  { template: "레몬이 노래요", focusWord: "레몬", reading: "레·몬·이 노·래·요" },
  { template: "리본을 묶어요", focusWord: "리본", reading: "리·본·을 묶·어·요" },
];

// =============================================================================
// Map: `${phoneme}-${level}` → MissionContentSet.
// =============================================================================

const CONTENT_SETS: MissionContentSet[] = [
  { phoneme: "ㄱ", difficultyLevel: 1, words: WORDS_SIMPLE_GIYEOK },
  { phoneme: "ㄴ", difficultyLevel: 1, words: WORDS_SIMPLE_NIEUN },
  { phoneme: "ㅅ", difficultyLevel: 1, words: WORDS_SIMPLE_SIOT },
  { phoneme: "ㅈ", difficultyLevel: 1, words: WORDS_SIMPLE_JIEUT },
  { phoneme: "ㄹ", difficultyLevel: 1, words: WORDS_SIMPLE_RIEUL },
  { phoneme: "ㄱ", difficultyLevel: 2, words: WORDS_GIYEOK },
  { phoneme: "ㄴ", difficultyLevel: 2, words: WORDS_NIEUN },
  { phoneme: "ㅅ", difficultyLevel: 2, words: WORDS_SIOT },
  { phoneme: "ㅈ", difficultyLevel: 2, words: WORDS_JIEUT },
  { phoneme: "ㄹ", difficultyLevel: 2, words: WORDS_RIEUL },
  { phoneme: "ㄱ", difficultyLevel: 3, sentences: SENTENCES_GIYEOK },
  { phoneme: "ㄴ", difficultyLevel: 3, sentences: SENTENCES_NIEUN },
  { phoneme: "ㅅ", difficultyLevel: 3, sentences: SENTENCES_SIOT },
  { phoneme: "ㅈ", difficultyLevel: 3, sentences: SENTENCES_JIEUT },
  { phoneme: "ㄹ", difficultyLevel: 3, sentences: SENTENCES_RIEUL },
];

export const missionContentByPhonemeLevel: Map<string, MissionContentSet> = new Map(
  CONTENT_SETS.map((set) => [`${set.phoneme}-${set.difficultyLevel}`, set]),
);

/// helper — phoneme + level 조회. 매칭 없으면 undefined.
export function getMissionContent(
  phoneme: string,
  level: number,
): MissionContentSet | undefined {
  return missionContentByPhonemeLevel.get(`${phoneme}-${level}`);
}
