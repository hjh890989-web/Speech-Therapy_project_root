// 문해력 5단계 발달 사다리 — CR-2026-009 (학령기 전면확장, 만 2~12세) 정본 모델.
//
// 단일 진실원(single source of truth): 연령(월령) → 발달 단계 매핑 + 단계별 핵심 구인.
// 발음 diagnose(만 2~7세, 84개월 상한)와 **분리된 literacy 전용 연령 도메인**(24~144개월).
//   - 발음 발달은 만 7세경 완성 → 단일 타깃. 문해 구인은 발달 순서가 연령에 묶여(음운인식→해독→
//     유창성→이해) 단계별로 다른 구인이 대응하므로 더 세분화가 필요(설계서 tasks/13 §2).
//
// ⚠️ 임상 게이트(project 규칙 + DECISION_LOG): S0~S4 전 단계는 임상 규준 검증(Phase 2) /
//    KOPLAC 자문 통과 전까지 '연습(놀이)-only' — 점수·등급·정상/위험 판정 미산출.
//    bandShippable=true 로 플립되기 전에는 참고밴드(display)를 노출하지 않는다.
//    raw 점수·HITL·escalation·저장은 본 모델과 무관(별도 활동).
// CON-04: 단계명/설명에 금칙어("치료/진단/장애") 0건 — 부모 친화 톤.

/// literacy 전용 연령 도메인(월령, 포함). 발음 diagnose 상한(84)과 독립.
export const LITERACY_AGE_MIN_MONTHS = 24; // 만 2세 0개월
export const LITERACY_AGE_MAX_MONTHS = 144; // 만 12세 0개월 (학령기 전면확장)

export type LiteracyStageId = "S0" | "S1" | "S2" | "S3" | "S4";

export interface LiteracyStage {
  id: LiteracyStageId;
  /// 부모 친화 단계명(금칙어 0).
  title: string;
  /// 한 줄 설명(부모 친화).
  blurb: string;
  /// 단계 연령 하한(월령, 포함).
  ageMinMonths: number;
  /// 단계 연령 상한(월령, 포함).
  ageMaxMonths: number;
  /// 표시용 대략 연령/학년 라벨.
  ageLabel: string;
  /// 이 단계의 핵심 구인 키워드(registry 게임 stage 태그와 정합).
  constructs: readonly string[];
  /// 임상 규준 참고밴드 출시 가능 여부 — false 면 '연습-only'.
  /// ⚠️ Phase 2 규준검증(2026-06-22) 결과 출시 가능 모집단 밴드 0건 → 전 단계 false 유지 확정.
  ///    코퍼스 정량치는 전부 연구표본/NISE 2025 예비검사(비표준화)/임상대조. 플립 경로 = KOLRA·
  ///    BASA-R 정식 매뉴얼 규준표 확보 또는 NISE 2026 표준화 최종규준 발표(설계서 tasks/13 §5).
  bandShippable: boolean;
}

// 연령 밴드는 24~144개월을 단조·비중첩·연속으로 분할(라우팅 결정성 보장).
// 구인은 단계 전속이 아니다 — 경계 인접 구인(예: 음운인식 만5~7)은 게임 자체 연령게이트가 처리.
export const LITERACY_STAGES: readonly LiteracyStage[] = [
  {
    id: "S0",
    title: "발현적 문해",
    blurb: "그림책과 말놀이로 글자와 이야기에 친해지는 시기예요.",
    ageMinMonths: 24, // 만 2세
    ageMaxMonths: 59, // 만 4세 11개월
    ageLabel: "만 2~4세",
    constructs: ["어휘", "음절 음운인식", "인쇄물 개념", "듣기이해", "이야기 듣기"],
    bandShippable: false,
  },
  {
    id: "S1",
    title: "읽기 입문",
    blurb: "소리를 나누고 글자와 소리를 맞추며 읽기를 준비해요.",
    ageMinMonths: 60, // 만 5세
    ageMaxMonths: 83, // 만 6세 11개월
    ageLabel: "만 5~6세(취학 전)",
    constructs: ["음소 음운인식", "자소-음소 대응", "글자·단어 인지", "빠른 이름대기(RAN)"],
    bandShippable: false,
  },
  {
    id: "S2",
    title: "해독·철자",
    blurb: "글자 규칙을 익혀 또박또박 읽고 바르게 써 보아요.",
    ageMinMonths: 84, // 만 7세(초1)
    ageMaxMonths: 107, // 만 8세 11개월(초2)
    ageLabel: "초1~2",
    constructs: ["해독(음운규칙)", "단어재인 자동화", "철자·받아쓰기"],
    bandShippable: false,
  },
  {
    id: "S3",
    title: "유창성·이해",
    blurb: "리듬을 살려 읽고 글의 내용을 이해해 보아요.",
    ageMinMonths: 108, // 만 9세(초3)
    ageMaxMonths: 131, // 만 10세 11개월(초4)
    ageLabel: "초3~4",
    constructs: ["읽기유창성", "사실적 읽기이해"],
    bandShippable: false,
  },
  {
    id: "S4",
    title: "읽기로 배우기",
    blurb: "글로 새로운 것을 배우고 깊이 생각하며 읽어요.",
    ageMinMonths: 132, // 만 11세(초5)
    ageMaxMonths: 144, // 만 12세(초6)
    ageLabel: "초5~6",
    constructs: ["추론·평가 읽기이해", "형태소인식", "어휘 심화", "이야기쓰기"],
    bandShippable: false,
  },
];

/// literacy 연령 도메인(24~144개월) 내인가.
export function isLiteracyAgeEligible(ageMonths: number): boolean {
  return (
    Number.isFinite(ageMonths) &&
    ageMonths >= LITERACY_AGE_MIN_MONTHS &&
    ageMonths <= LITERACY_AGE_MAX_MONTHS
  );
}

/// 월령 → 해당 발달 단계(결정적 순수 함수). 도메인(24~144) 밖이면 null.
export function stageForAgeMonths(ageMonths: number): LiteracyStage | null {
  if (!isLiteracyAgeEligible(ageMonths)) return null;
  return (
    LITERACY_STAGES.find(
      (s) => ageMonths >= s.ageMinMonths && ageMonths <= s.ageMaxMonths,
    ) ?? null
  );
}

/// stage id → 단계 메타(없으면 null).
export function getStageById(id: LiteracyStageId): LiteracyStage | null {
  return LITERACY_STAGES.find((s) => s.id === id) ?? null;
}
