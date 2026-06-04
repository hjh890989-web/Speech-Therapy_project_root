// FR-LANDING — 랜딩 시안 공통 카피 단일 소스.
//
// 시안 A/B/C 가 동일 카피를 쓰도록(디자인만 다르게 비교) 하기 위한 콘텐츠 모듈.
// 모든 문자열은 CON-04 금칙어(치료/진단/장애) 미사용 — lib/forbidden-words 스캐너 테스트로 보증.
// 순수 데이터만 export — "use client" 불필요. server/client 양쪽 import 안전.

export const HERO = {
  headline: "우리 아이 발음, 회원가입 없이 5분 안에 또래와 비교해 확인해요",
  sub: "월령과 음소를 고르고 한 단어만 들려주면, 또래와 비교한 발음 발달 단계를 바로 안내해 드려요.",
  // icon/text 분리 — 시안별로 이모지 표시 여부 선택(B 미니멀은 text 만).
  microcopy: [
    { icon: "🎙️", text: "음성 원본 미저장" },
    { icon: "🌟", text: "무가입" },
    { icon: "⏱️", text: "약 5분" },
  ],
  primaryCta: "5분 발음 확인 시작하기",
  secondaryCta: "서비스가 어떻게 도와주는지 보기",
} as const;

export const STEPS = [
  {
    num: "1",
    title: "월령·음소 고르기",
    body: "아이 개월 수와 확인하고 싶은 소리(ㄱ·ㄴ·ㅅ·ㅈ·ㄹ)를 한 번만 골라요.",
  },
  {
    num: "2",
    title: "한 단어만 들려주기",
    body: "아이가 단어 하나를 말하면 그 소리를 텍스트로 바꿔 발달 단계를 살펴봐요. 음성 원본은 저장하지 않아요.",
  },
  {
    num: "3",
    title: "또래 비교 결과 받기",
    body: "“또래와 비슷한 수준이에요” 같은 안내와 함께, 이어서 할 수 있는 짧은 미션을 추천해 드려요.",
  },
] as const;

export const HOW_HEADING = "이렇게 진행돼요";
export const HOW_CTA = "지금 5분 발음 확인 해보기";

// 실제 결과 페이지(clinical-interpretation) 밴드 카피와 동일 — 과대약속 방지.
export const RESULT_PREVIEWS = [
  { icon: "🌟", text: "또래와 비슷한 발음 수준이에요" },
  { icon: "👍", text: "조금 더 연습하면 더 또렷해질 거예요" },
  { icon: "🌱", text: "미션으로 꾸준히 함께 연습하면 도움이 돼요" },
] as const;

export const URGENCY = {
  heading: "센터 예약을 기다리는 두세 달, 그냥 흘려보내지 않아도 돼요",
  body: "상담이나 예약을 기다리는 동안에도 가정에서 할 수 있는 일이 있어요. 하루 1~3분, 아이와 함께 짧은 발음 놀이 미션을 이어가면 매일의 작은 변화가 쌓여요. 부담 없이 오늘부터 시작해 보세요.",
  reassurance: "무엇을 해야 할지 막막했다면, 오늘 5분이 그 시작이 될 수 있어요.",
  cta: "오늘 5분 미션 시작하기",
  missionsLink: "매일 미션이 궁금하다면 → 오늘의 미션 보기",
} as const;

export const VALUE_HEADING = "5분 확인 그 다음, 매일 즐겁게 이어가요";

export const VALUE_CARDS: ReadonlyArray<{
  emoji: string;
  title: string;
  body: string;
  cta: "missions" | "rewards" | "reports" | null;
  linkLabel: string | null;
}> = [
  {
    emoji: "🎯",
    title: "하루 1~3분 발음 미션",
    body: "짧고 즐거운 발음 놀이예요. 아이 발달 단계에 맞춰 미션이 자동으로 조정돼요.",
    cta: "missions",
    linkLabel: "오늘의 미션 보기 →",
  },
  {
    emoji: "🌟",
    title: "별·나무·AI 그림 모으기",
    body: "미션을 완료할 때마다 별을 모으고 나무를 키워요. 아이의 동기를 자연스럽게 이어가요.",
    cta: "rewards",
    linkLabel: "보상 도감 보기 →",
  },
  {
    emoji: "🔥",
    title: "함께한 날들이 쌓여요",
    body: "매일 이어가면 연속 기록이 쌓이고, 다음 보너스까지의 진행도를 한눈에 볼 수 있어요.",
    cta: null,
    linkLabel: null,
  },
  {
    emoji: "📈",
    title: "지난 한 주의 발달 추이",
    body: "발음 발달 추이를 또래 비교와 함께 그래프로 정리해 드려요. 가족과 함께 변화를 확인하기 좋아요.",
    cta: "reports",
    linkLabel: "주간 리포트 살펴보기 →",
  },
];

export const COMING_SOON = {
  emoji: "💬",
  title: "이야기 친구",
  badge: "곧 만나요",
  body: "아이와 자연스럽게 대화하며 발음을 연습하는 AI 친구를 준비하고 있어요.",
} as const;

export const TRUST_HEADING = "안심하고 사용할 수 있도록";

export const TRUST_PILLARS = [
  {
    emoji: "🤝",
    title: "AI 분석에 전문가 검수를 더했어요",
    body: "발음 분석은 AI가 빠르게 처리하고, 판단이 어려운 경우에는 전문가가 한 번 더 살펴봐요. 부모님께 더 신뢰할 수 있는 안내를 드리기 위해서예요.",
  },
  {
    emoji: "🔒",
    title: "아이 목소리 원본은 저장하지 않아요",
    body: "음성은 텍스트로 바뀐 뒤 그 텍스트와 점수만 안전하게 다뤄요. 음성 원본은 서버에 저장하지 않아요.",
  },
  {
    emoji: "📊",
    title: "느낌이 아니라 또래 비교로 안내해요",
    body: "막연한 걱정 대신, 같은 월령 또래와 비교한 발달 단계로 안내해 드려요.",
  },
  {
    emoji: "🌱",
    title: "의료적 평가가 아닌, 부모님을 돕는 보조 도구예요",
    body: "본 서비스는 의료적 평가를 제공하지 않으며, 부모님께 발달 확인 정보를 안내하기 위한 보조 도구입니다. 발달이 우려되는 경우 전문가 상담을 권장해 드려요.",
  },
] as const;

export const FAQ_HEADING = "자주 묻는 질문";
export const FAQ_CTA = "궁금증이 풀렸다면, 5분 발음 확인 시작하기";

export const LANDING_FAQ = [
  {
    q: "이건 의료적 평가인가요?",
    a: "아니에요. 만 2~7세 자녀의 발음 발달을 부모님께서 또래와 비교해 직접 확인하실 수 있도록 돕는 보조 도구예요. 발달이 우려되는 경우에는 전문가 상담을 권장해 드려요.",
  },
  {
    q: "아이 목소리는 저장되나요?",
    a: "음성 원본은 서버에 저장하지 않아요. 음성은 텍스트로 변환된 뒤, 그 텍스트와 발달 점수만 안전하게 다뤄요.",
  },
  {
    q: "비용이 드나요? 가입해야 하나요?",
    a: "5분 발음 확인은 회원가입 없이 무료로 바로 시작할 수 있어요. 가입은 선택이며, 가입하시면 무가입으로 모은 별과 결과가 새 계정에 그대로 옮겨져요.",
  },
  {
    q: "결과가 정확한가요?",
    a: "발음 분석은 AI가 처리하고, 판단이 어려운 경우에는 전문가가 한 번 더 살펴봐요. 같은 월령 또래와 비교한 발달 단계로 안내해 드리며, 이는 의료적 평가가 아닌 부모님을 위한 참고 정보예요.",
  },
  {
    q: "몇 살부터 할 수 있나요?",
    a: "만 2세부터 7세(약 24~84개월) 자녀를 위한 서비스예요. 시작할 때 아이의 개월 수를 입력하면 그에 맞춰 안내해 드려요.",
  },
  {
    q: "매일 얼마나 해야 하나요?",
    a: "하루 1~3분이면 충분해요. 짧고 즐거운 발음 미션을 아이와 함께 이어가면 매일의 작은 변화가 쌓여요.",
  },
] as const;

export const FINAL = {
  heading: "오늘 5분이면 충분해요",
  sub: "회원가입 없이 바로 시작하고, 마음에 들면 그때 가입해도 돼요. 가입하면 무가입으로 모은 별과 결과가 새 계정에 그대로 옮겨져요.",
  primaryCta: "무료로 5분 발음 확인 시작하기",
  secondaryCta: "이메일로 가입하고 기록 이어가기",
} as const;

export const DISCLAIMER =
  "본 서비스는 의료적 평가가 아닌, 부모님께 발달 확인 정보를 안내하는 보조 도구입니다.";

export const INSTITUTION_PROMPT =
  "어린이집·유치원 등 기관에서 단체 도입이 궁금하신가요?";
export const INSTITUTION_CTA = "기관 문의하기 →";
