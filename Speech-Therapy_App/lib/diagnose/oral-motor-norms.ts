// 구강 운동 연령 규준 — SMST-C(S063) 원문 정량치 + display 참고 밴드 (CR-2026-007 후속).
//
// ⚠️ 정량 규준 출처·검증: 외부 wiki 원문 `c:\VS code_Workspace\Speech_Therapy_Wiki\my-healthcare-workbase\
//    .ingest\txt\S063.txt` 를 **직접 대조·검증**(2026-06-21, 소수점까지 일치). 요약본 아님.
//    - MPT(최대발성지속, 초):      S063.txt 라인 1546~1581 (연령별 '전체' 평균/SD)
//    - AMR /퍼/(회/초):            S063.txt 라인 1684~1718
//    - AMR /터/(회/초):            S063.txt 라인 1762~1796
//    - SMR /퍼터커/(회/초):        S063.txt 라인 2094~2128
//    표본 236명(만 3~12세 정상발달, 성별 차 무의미 → 남녀 '전체' 평균/SD 사용). 본 앱 프로브 연령
//    범위(만 3~7세)만 이식. 2세 규준은 원문 미존재(미이식).
//
// ⚠️ **display 참고 밴드 전용** — 점수/HITL/escalation/저장 raw 불변. 비의료(ADR-04): '판정' 아닌
//    '또래 평균 참고'. 밴드 카피 금칙어("치료/진단/장애/지연/지체/정상/위험") 0. 보수적(낮아도 격려 톤).

export type OralMotorMetric = "mpt" | "amr_pa" | "amr_ta" | "smr_pataka";

interface AgeNorm {
  mean: number;
  sd: number;
}

// 연령(만 나이) → {평균, 표준편차}. 모두 원문 '전체'(남녀 통합) 값.
const NORMS: Record<OralMotorMetric, Record<number, AgeNorm>> = {
  mpt: {
    3: { mean: 7.3, sd: 4.41 },
    4: { mean: 8.56, sd: 4.05 },
    5: { mean: 10.78, sd: 6.87 },
    6: { mean: 11.3, sd: 5.34 },
    7: { mean: 10.36, sd: 3.76 },
  },
  amr_pa: {
    3: { mean: 3.58, sd: 0.81 },
    4: { mean: 3.92, sd: 0.67 },
    5: { mean: 4.09, sd: 0.69 },
    6: { mean: 4.38, sd: 0.62 },
    7: { mean: 4.51, sd: 0.6 },
  },
  amr_ta: {
    3: { mean: 3.5, sd: 0.79 },
    4: { mean: 4.05, sd: 0.71 },
    5: { mean: 4.16, sd: 0.66 },
    6: { mean: 4.52, sd: 0.65 },
    7: { mean: 4.76, sd: 0.58 },
  },
  smr_pataka: {
    3: { mean: 1.15, sd: 0.27 },
    4: { mean: 1.29, sd: 0.26 },
    5: { mean: 1.43, sd: 0.21 },
    6: { mean: 1.6, sd: 0.26 },
    7: { mean: 1.51, sd: 0.3 },
  },
};

export type NormBand = "typical" | "below" | "low";

// 밴드 카피 — ADR-04 치환(금칙어 0). 낮아도 격려 톤(과escalation 회피).
const BAND_COPY: Record<NormBand, { label: string; emoji: string }> = {
  typical: { label: "또래 평균과 비슷해요", emoji: "👍" },
  below: { label: "또래 평균보다 조금 낮아요. 천천히 늘어나요", emoji: "🌱" },
  low: { label: "또래 평균보다 낮은 편이에요. 자주 함께 해보면 좋아요", emoji: "🌱" },
};

export interface NormInterpretation {
  band: NormBand;
  label: string;
  emoji: string;
  /// 해당 연령 또래 평균(참고 표시용).
  mean: number;
}

/// 만 나이(3~7로 clamp) — 프로브 연령 게이트(36~84개월)와 정합.
function ageYear(ageMonths: number): number {
  return Math.max(3, Math.min(7, Math.floor(ageMonths / 12)));
}

function interpret(
  metric: OralMotorMetric,
  value: number,
  ageMonths: number,
): NormInterpretation | null {
  if (!Number.isFinite(value) || !Number.isFinite(ageMonths)) return null;
  const norm = NORMS[metric][ageYear(ageMonths)];
  if (!norm) return null;
  // 모든 지표는 높을수록 또래 평균에 근접(MPT 길이↑·DDK 속도↑). z<-1 부터 '낮은 편'.
  const z = (value - norm.mean) / norm.sd;
  const band: NormBand = z >= -1 ? "typical" : z >= -2 ? "below" : "low";
  return { band, label: BAND_COPY[band].label, emoji: BAND_COPY[band].emoji, mean: norm.mean };
}

/// MPT(초) 또래 평균 참고 밴드. 판정 아님 — display 전용.
export function interpretMpt(seconds: number, ageMonths: number): NormInterpretation | null {
  return interpret("mpt", seconds, ageMonths);
}

/// DDK(회/초) 또래 평균 참고 밴드. taskId(oral-motor-content) → 지표 매핑. display 전용.
export function interpretDdk(
  ratePerSec: number,
  ageMonths: number,
  taskId: string,
): NormInterpretation | null {
  const metric: OralMotorMetric | null =
    taskId === "ddk-pa"
      ? "amr_pa"
      : taskId === "ddk-ta"
        ? "amr_ta"
        : taskId === "ddk-pataka"
          ? "smr_pataka"
          : null;
  if (!metric) return null;
  return interpret(metric, ratePerSec, ageMonths);
}
