// FR-Q-011 (Issue #52) / REQ-FUNC-048 — ROI 시뮬레이터 순수 함수.
//
// P2 B2B 트랙. 원장 (institution principal) 이 도입 의사 결정 시
// "원아 수 × 월 비용 vs 상담 시간 절감" 을 정량 비교하기 위한 계산 helper.
//
// 본 모듈은 부수효과 0 — UI / DOM / network 미참조. 단위 테스트 가능.
// CON-04: 의료 금칙어 0 (변수명·문서 전체에 의료 단정 표현 미사용).
//
// 가정 (단순화 모드):
//   - 자동화로 줄어든 발음 발달 확인 상담 시간 = 원아 수 × 0.5 h/월
//     (원아 1인당 매월 30분 상담 시간이 자동 리포트로 대체된다는 가정)
//   - 시간 절감 가치 = monthlyTimeSavedHours × expertHourlyRate
//   - 절감 / 수익은 모두 음수가 될 수 없음 — 입력 음수 시 0 으로 클램프.
//
// 출력은 모두 정수 KRW (₩) — 표시 시 추가 포매팅은 호출 측 책임.

export interface RoiInput {
  /// 원아 수 (1~500). 0 또는 음수 입력 시 0 으로 클램프.
  studentCount: number;
  /// 원아 1인당 월 비용 (₩). 0 또는 음수 입력 시 0 으로 클램프.
  monthlyFeePerStudent: number;
  /// 전문가 시간당 비용 가정 (₩/h). 기본 ₩100,000.
  expertHourlyRate: number;
}

export interface RoiResult {
  /// 월 매출 = studentCount × monthlyFeePerStudent.
  monthlyRevenue: number;
  /// 연 매출 = monthlyRevenue × 12.
  annualRevenue: number;
  /// 월 절감 시간 (h) = studentCount × 0.5.
  monthlyTimeSavedHours: number;
  /// 월 절감 금액 (₩) = monthlyTimeSavedHours × expertHourlyRate.
  monthlySavings: number;
  /// 연 절감 금액 (₩) = monthlySavings × 12.
  annualSavings: number;
}

/// 원아 1인당 월 평균 절감 시간 (h). 변경 시 본 상수만 갱신.
export const HOURS_SAVED_PER_STUDENT_PER_MONTH = 0.5;

/// ROI 계산. 입력 클램프 (≥ 0) 후 정수 ₩ 반올림.
export function calculateRoi(input: RoiInput): RoiResult {
  const studentCount = clampNonNegative(input.studentCount);
  const monthlyFeePerStudent = clampNonNegative(input.monthlyFeePerStudent);
  const expertHourlyRate = clampNonNegative(input.expertHourlyRate);

  const monthlyRevenue = Math.round(studentCount * monthlyFeePerStudent);
  const annualRevenue = monthlyRevenue * 12;

  const monthlyTimeSavedHours = studentCount * HOURS_SAVED_PER_STUDENT_PER_MONTH;
  const monthlySavings = Math.round(monthlyTimeSavedHours * expertHourlyRate);
  const annualSavings = monthlySavings * 12;

  return {
    monthlyRevenue,
    annualRevenue,
    monthlyTimeSavedHours,
    monthlySavings,
    annualSavings,
  };
}

/// 차트용 월별 누적 매출/절감 시리즈. month=1..12.
/// 본 함수는 calculateRoi 의 결과를 기반으로 한 단순 누적 — 향후 변동성 모델로 교체 가능.
export interface MonthlyRoiPoint {
  /// 1~12.
  month: number;
  /// 누적 매출 (₩).
  cumulativeRevenue: number;
  /// 누적 절감 (₩).
  cumulativeSavings: number;
}

export function buildMonthlyRoiSeries(input: RoiInput, months: number = 12): MonthlyRoiPoint[] {
  const result = calculateRoi(input);
  const clampedMonths = Math.max(1, Math.min(12, Math.floor(months)));
  const points: MonthlyRoiPoint[] = [];
  for (let m = 1; m <= clampedMonths; m += 1) {
    points.push({
      month: m,
      cumulativeRevenue: result.monthlyRevenue * m,
      cumulativeSavings: result.monthlySavings * m,
    });
  }
  return points;
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}
