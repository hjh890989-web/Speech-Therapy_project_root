// REQ-FUNC-CL-05 — 6단계 임상 위계 미션 콘텐츠 데이터 (5 자모 × 6 단계 = 30 sets).
//
// 임상 위계 (wiki clinical/concepts/조음장애 §난이도 위계, CL-05-0 확정):
//   1 단독 음소 → 2 음절 → 3 단어 → 4 구 → 5 문장 → 6 대화
//
// 본 파일은 dailyMissionFixtures 와 phoneme+level 로 매칭되는 콘텐츠 정의.
// - L1 단독 음소: `MissionPhonemeIsolation` (음소 소리 + 입모양 힌트)
// - L2 음절:      `MissionSyllable[]` (사·시·수 단음절 카드)
// - L3 단어:      `MissionWordSimple[]` (단어 따라하기) — 구 V07 의 L1 이동
// - L4 구:        `MissionPhrase[]` (짧은 구, 빨간 사과)
// - L5 문장:      `MissionSentence[]` (짧은 문장) — 구 V07 의 L3 이동
// - L6 대화:      `MissionConversation[]` (턴테이킹 발화 유도)
//
// 빈칸 채우기(`MissionWord` / getWordFillVariant)는 L3 단어의 선택 변형으로 보존
// (CL-05-0 D3) — 6단계 Map 과 별개. 임상적으로 빈칸은 단어 레벨 과제이지 구(L4) 아님.
//
// CON-04: 모든 콘텐츠는 자녀 친화 (만 2~7세 발달 적합) + 의료/진단/장애 금칙어 0건.

// === 단계별 타입 ===

/// L1 — 단독 음소. `phoneme` 대상 자음, `mouthHint` 입모양/발성 가이드.
export interface MissionPhonemeIsolation {
  phoneme: string;
  mouthHint: string;
}

/// L2 — 음절. `text` 단음절 (가/사/라 등).
export interface MissionSyllable {
  text: string;
}

/// L3 — 단어 따라하기. `text` 전체 단어, `reading` 음절 분리 표기 (`사·과`).
export interface MissionWordSimple {
  text: string;
  reading: string;
}

/// L3 변형(보존) — 단어 빈칸 채우기. `full` 전체 단어, `blank` 마스킹 표기, `hint` 안내.
export interface MissionWord {
  full: string;
  blank: string;
  hint: string;
}

/// L4 — 구. `phrase` 짧은 구, `focusWord` 강조 단어(phrase 안에 포함), `reading` 음절 분리.
export interface MissionPhrase {
  phrase: string;
  focusWord: string;
  reading: string;
}

/// L5 — 짧은 문장. `template` 전체 문장, `focusWord` 강조 단어, `reading` 음절 분리.
export interface MissionSentence {
  template: string;
  focusWord: string;
  reading: string;
}

/// L6 — 대화. `prompt` 부모가 던지는 질문, `focusWord` 대상 단어, `turnHint` 턴테이킹 안내.
export interface MissionConversation {
  prompt: string;
  focusWord: string;
  turnHint: string;
}

export type MissionContentSet =
  | { phoneme: string; difficultyLevel: 1; isolation: MissionPhonemeIsolation }
  | { phoneme: string; difficultyLevel: 2; syllables: MissionSyllable[] }
  | { phoneme: string; difficultyLevel: 3; words: MissionWordSimple[] }
  | { phoneme: string; difficultyLevel: 4; phrases: MissionPhrase[] }
  | { phoneme: string; difficultyLevel: 5; sentences: MissionSentence[] }
  | { phoneme: string; difficultyLevel: 6; conversations: MissionConversation[] };

// =============================================================================
// L1 — 단독 음소 (5 자모).
// =============================================================================

const ISOLATION: Record<string, MissionPhonemeIsolation> = {
  ㄱ: { phoneme: "ㄱ", mouthHint: "혀 뒤쪽을 입천장 안쪽에 붙였다가 '그~' 하고 떼면서 소리 내요" },
  ㄴ: { phoneme: "ㄴ", mouthHint: "혀끝을 윗니 뒤에 붙이고 '느~' 하고 코로 소리 내요" },
  ㅅ: { phoneme: "ㅅ", mouthHint: "윗니와 아랫니를 살짝 붙이고 '스~' 하고 바람을 길게 내보내요" },
  ㅈ: { phoneme: "ㅈ", mouthHint: "혀 앞부분을 입천장에 붙였다가 '즈~' 하고 떼면서 소리 내요" },
  ㄹ: { phoneme: "ㄹ", mouthHint: "혀끝을 입천장에 살짝 댔다가 '르~' 하고 굴리듯 소리 내요" },
};

// =============================================================================
// L2 — 음절 (5 자모 × 4 음절).
// =============================================================================

const SYLLABLES: Record<string, MissionSyllable[]> = {
  ㄱ: [{ text: "가" }, { text: "거" }, { text: "고" }, { text: "구" }],
  ㄴ: [{ text: "나" }, { text: "너" }, { text: "노" }, { text: "누" }],
  ㅅ: [{ text: "사" }, { text: "서" }, { text: "소" }, { text: "수" }],
  ㅈ: [{ text: "자" }, { text: "저" }, { text: "조" }, { text: "주" }],
  ㄹ: [{ text: "라" }, { text: "러" }, { text: "로" }, { text: "루" }],
};

// =============================================================================
// L3 — 단어 따라하기 (구 V07 L1 데이터 이동, 5 자모 × 4~5 단어).
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
// L3 변형(보존) — 단어 빈칸 채우기 (구 V07 L2 데이터, getWordFillVariant 로 노출).
// =============================================================================

const WORDS_FILL_GIYEOK: MissionWord[] = [
  { full: "가방", blank: "_방", hint: "학교 갈 때 들어요" },
  { full: "구름", blank: "_름", hint: "하늘에 떠 있어요" },
  { full: "고양이", blank: "_양이", hint: "야옹 하고 울어요" },
  { full: "감자", blank: "_자", hint: "땅 속에서 자라요" },
  { full: "기차", blank: "_차", hint: "칙칙폭폭 달려요" },
];

const WORDS_FILL_NIEUN: MissionWord[] = [
  { full: "나비", blank: "_비", hint: "꽃을 좋아해요" },
  { full: "나무", blank: "_무", hint: "공원에 많아요" },
  { full: "노래", blank: "_래", hint: "흥얼흥얼 불러요" },
  { full: "누나", blank: "_나", hint: "남자 형제의 언니" },
  { full: "낙엽", blank: "_엽", hint: "가을에 떨어져요" },
];

const WORDS_FILL_SIOT: MissionWord[] = [
  { full: "사과", blank: "_과", hint: "빨간 과일이에요" },
  { full: "사진", blank: "_진", hint: "찰칵 찍어요" },
  { full: "신발", blank: "_발", hint: "발에 신어요" },
  { full: "사람", blank: "_람", hint: "친구나 가족이에요" },
  { full: "수박", blank: "_박", hint: "여름 과일이에요" },
];

const WORDS_FILL_JIEUT: MissionWord[] = [
  { full: "지우개", blank: "_우개", hint: "글씨를 지워요" },
  { full: "자전거", blank: "_전거", hint: "두 바퀴로 달려요" },
  { full: "주스", blank: "_스", hint: "꿀꺽 마셔요" },
  { full: "장난감", blank: "_난감", hint: "재미있게 가지고 놀아요" },
  { full: "지렁이", blank: "_렁이", hint: "땅 속에서 꼼지락거려요" },
];

const WORDS_FILL_RIEUL: MissionWord[] = [
  { full: "라면", blank: "_면", hint: "후루룩 먹는 면이에요" },
  { full: "로봇", blank: "_봇", hint: "삐빅 움직여요" },
  { full: "레몬", blank: "_몬", hint: "노란 신 과일이에요" },
  { full: "라디오", blank: "_디오", hint: "노래가 흘러나와요" },
  { full: "리본", blank: "_본", hint: "예쁘게 묶어요" },
];

const WORD_FILL_BY_PHONEME: Record<string, MissionWord[]> = {
  ㄱ: WORDS_FILL_GIYEOK,
  ㄴ: WORDS_FILL_NIEUN,
  ㅅ: WORDS_FILL_SIOT,
  ㅈ: WORDS_FILL_JIEUT,
  ㄹ: WORDS_FILL_RIEUL,
};

// =============================================================================
// L4 — 구 (5 자모 × 4 구).
// =============================================================================

const PHRASES_GIYEOK: MissionPhrase[] = [
  { phrase: "큰 가방", focusWord: "가방", reading: "큰 가·방" },
  { phrase: "빠른 기차", focusWord: "기차", reading: "빠·른 기·차" },
  { phrase: "노란 가위", focusWord: "가위", reading: "노·란 가·위" },
  { phrase: "느린 거북이", focusWord: "거북이", reading: "느·린 거·북·이" },
];

const PHRASES_NIEUN: MissionPhrase[] = [
  { phrase: "큰 나무", focusWord: "나무", reading: "큰 나·무" },
  { phrase: "예쁜 나비", focusWord: "나비", reading: "예·쁜 나·비" },
  { phrase: "신나는 노래", focusWord: "노래", reading: "신·나·는 노·래" },
  { phrase: "작은 너구리", focusWord: "너구리", reading: "작·은 너·구·리" },
];

const PHRASES_SIOT: MissionPhrase[] = [
  { phrase: "빨간 사과", focusWord: "사과", reading: "빨·간 사·과" },
  { phrase: "새 신발", focusWord: "신발", reading: "새 신·발" },
  { phrase: "큰 수박", focusWord: "수박", reading: "큰 수·박" },
  { phrase: "멋진 사진", focusWord: "사진", reading: "멋·진 사·진" },
];

const PHRASES_JIEUT: MissionPhrase[] = [
  { phrase: "빠른 자동차", focusWord: "자동차", reading: "빠·른 자·동·차" },
  { phrase: "시원한 주스", focusWord: "주스", reading: "시·원·한 주·스" },
  { phrase: "재밌는 장난감", focusWord: "장난감", reading: "재·밌·는 장·난·감" },
  { phrase: "긴 지렁이", focusWord: "지렁이", reading: "긴 지·렁·이" },
];

const PHRASES_RIEUL: MissionPhrase[] = [
  { phrase: "뜨거운 라면", focusWord: "라면", reading: "뜨·거·운 라·면" },
  { phrase: "큰 로봇", focusWord: "로봇", reading: "큰 로·봇" },
  { phrase: "예쁜 리본", focusWord: "리본", reading: "예·쁜 리·본" },
  { phrase: "작은 라디오", focusWord: "라디오", reading: "작·은 라·디·오" },
];

// =============================================================================
// L5 — 짧은 문장 (구 V07 L3 데이터 이동, 5 자모 × 4 문장).
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
// L6 — 대화 (5 자모 × 3 턴테이킹 질문).
// =============================================================================

const CONVERSATIONS_GIYEOK: MissionConversation[] = [
  { prompt: "가방 안에 뭐가 있어?", focusWord: "가방", turnHint: "아이가 답하면 '그 다음엔 뭘 넣고 싶어?' 하고 이어 물어보세요" },
  { prompt: "기차는 어디로 갈까?", focusWord: "기차", turnHint: "아이 대답을 따라 '거기서 누굴 만날까?' 하고 이어가세요" },
  { prompt: "거북이는 어떻게 걸어?", focusWord: "거북이", turnHint: "아이가 흉내 내면 '우와 천천히 가네!' 하고 반응해 주세요" },
];

const CONVERSATIONS_NIEUN: MissionConversation[] = [
  { prompt: "나비는 어디에 앉을까?", focusWord: "나비", turnHint: "아이 답에 '무슨 색 꽃일까?' 하고 이어가세요" },
  { prompt: "무슨 노래 부르고 싶어?", focusWord: "노래", turnHint: "아이가 고르면 함께 흥얼흥얼 불러 주세요" },
  { prompt: "나무에 누가 사는지 말해 볼까?", focusWord: "나무", turnHint: "아이 답에 '또 누가 있을까?' 하고 이어가세요" },
];

const CONVERSATIONS_SIOT: MissionConversation[] = [
  { prompt: "무슨 과일 좋아해?", focusWord: "사과", turnHint: "아이가 답하면 '그건 무슨 색이야?' 하고 이어 물어보세요" },
  { prompt: "새 신발 신으면 어디 가고 싶어?", focusWord: "신발", turnHint: "아이 답에 '거기서 뭐 할까?' 하고 이어가세요" },
  { prompt: "수박은 어떤 맛일까?", focusWord: "수박", turnHint: "아이가 답하면 '또 무슨 맛 과일 알아?' 하고 이어가세요" },
];

const CONVERSATIONS_JIEUT: MissionConversation[] = [
  { prompt: "자동차 타고 어디 갈까?", focusWord: "자동차", turnHint: "아이 답에 '거기서 뭐 볼까?' 하고 이어가세요" },
  { prompt: "무슨 주스 마시고 싶어?", focusWord: "주스", turnHint: "아이가 고르면 '그건 무슨 색이야?' 하고 이어가세요" },
  { prompt: "어떤 장난감 가지고 놀까?", focusWord: "장난감", turnHint: "아이 답에 '같이 놀자!' 하고 반응해 주세요" },
];

const CONVERSATIONS_RIEUL: MissionConversation[] = [
  { prompt: "라면에 뭐 넣고 싶어?", focusWord: "라면", turnHint: "아이 답에 '그럼 더 맛있겠다!' 하고 반응해 주세요" },
  { prompt: "로봇은 무엇을 할 수 있을까?", focusWord: "로봇", turnHint: "아이 답에 '또 뭘 할 수 있을까?' 하고 이어가세요" },
  { prompt: "리본은 어디에 달까?", focusWord: "리본", turnHint: "아이 답에 '무슨 색 리본이 좋아?' 하고 이어가세요" },
];

// =============================================================================
// Map: `${phoneme}-${level}` → MissionContentSet (5 자모 × 6 단계 = 30 sets).
// =============================================================================

const PHONEMES = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"] as const;

const WORDS_SIMPLE_BY_PHONEME: Record<string, MissionWordSimple[]> = {
  ㄱ: WORDS_SIMPLE_GIYEOK,
  ㄴ: WORDS_SIMPLE_NIEUN,
  ㅅ: WORDS_SIMPLE_SIOT,
  ㅈ: WORDS_SIMPLE_JIEUT,
  ㄹ: WORDS_SIMPLE_RIEUL,
};

const PHRASES_BY_PHONEME: Record<string, MissionPhrase[]> = {
  ㄱ: PHRASES_GIYEOK,
  ㄴ: PHRASES_NIEUN,
  ㅅ: PHRASES_SIOT,
  ㅈ: PHRASES_JIEUT,
  ㄹ: PHRASES_RIEUL,
};

const SENTENCES_BY_PHONEME: Record<string, MissionSentence[]> = {
  ㄱ: SENTENCES_GIYEOK,
  ㄴ: SENTENCES_NIEUN,
  ㅅ: SENTENCES_SIOT,
  ㅈ: SENTENCES_JIEUT,
  ㄹ: SENTENCES_RIEUL,
};

const CONVERSATIONS_BY_PHONEME: Record<string, MissionConversation[]> = {
  ㄱ: CONVERSATIONS_GIYEOK,
  ㄴ: CONVERSATIONS_NIEUN,
  ㅅ: CONVERSATIONS_SIOT,
  ㅈ: CONVERSATIONS_JIEUT,
  ㄹ: CONVERSATIONS_RIEUL,
};

const CONTENT_SETS: MissionContentSet[] = PHONEMES.flatMap((phoneme) => [
  { phoneme, difficultyLevel: 1, isolation: ISOLATION[phoneme] },
  { phoneme, difficultyLevel: 2, syllables: SYLLABLES[phoneme] },
  { phoneme, difficultyLevel: 3, words: WORDS_SIMPLE_BY_PHONEME[phoneme] },
  { phoneme, difficultyLevel: 4, phrases: PHRASES_BY_PHONEME[phoneme] },
  { phoneme, difficultyLevel: 5, sentences: SENTENCES_BY_PHONEME[phoneme] },
  { phoneme, difficultyLevel: 6, conversations: CONVERSATIONS_BY_PHONEME[phoneme] },
]);

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

/// L3 단어 변형(보존) — 빈칸 채우기 데이터 조회. CL-05-0 D3 — 6단계 Map 과 별개.
export function getWordFillVariant(phoneme: string): MissionWord[] | undefined {
  return WORD_FILL_BY_PHONEME[phoneme];
}
