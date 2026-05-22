// FR-Q-011 (Issue #52) / REQ-FUNC-048 — ROI 시뮬레이터 Client Component.
//
// 입력 슬라이더 3종:
//   - 원아 수 (10~500)
//   - 원아 1인당 월 비용 (₩10,000 ~ ₩50,000, step 1,000)
//   - 전문가 시간당 비용 가정 (₩50,000 ~ ₩200,000, step 5,000) — 원장 자기 시급 입력 대안
//
// 출력 (즉시 재계산):
//   - 월 매출 / 연 매출 / 월 절감 시간 / 연 절감 금액
//   - Recharts BarChart 로 월별 누적 매출 vs 누적 절감 시각화
//
// 이벤트: roi_simulated — 입력 변화 후 debounce 없이 발송 (슬라이더는 onChange 가 throttle 적당).
//
// CON-04: 의료 어휘 0건. "원아", "발음 발달 확인" 등 비즈니스 표현만.

"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { trackEvent } from "@/lib/analytics";
import { calculateRoi, buildMonthlyRoiSeries } from "@/lib/roi";

const DEFAULT_STUDENT_COUNT = 50;
const DEFAULT_MONTHLY_FEE = 20_000;
const DEFAULT_EXPERT_HOURLY_RATE = 100_000;

export function RoiSimulator() {
  const [studentCount, setStudentCount] = useState<number>(DEFAULT_STUDENT_COUNT);
  const [monthlyFee, setMonthlyFee] = useState<number>(DEFAULT_MONTHLY_FEE);
  const [expertHourlyRate, setExpertHourlyRate] = useState<number>(DEFAULT_EXPERT_HOURLY_RATE);

  const roi = useMemo(
    () =>
      calculateRoi({
        studentCount,
        monthlyFeePerStudent: monthlyFee,
        expertHourlyRate,
      }),
    [studentCount, monthlyFee, expertHourlyRate],
  );

  const chartData = useMemo(
    () =>
      buildMonthlyRoiSeries({
        studentCount,
        monthlyFeePerStudent: monthlyFee,
        expertHourlyRate,
      }),
    [studentCount, monthlyFee, expertHourlyRate],
  );

  // 슬라이더 변경 시 roi_simulated 발송. 첫 mount 1회 + 이후 입력 변화 시.
  const lastSentRef = useRef<string>("");
  useEffect(() => {
    const key = `${studentCount}|${monthlyFee}|${roi.monthlyRevenue}`;
    if (lastSentRef.current === key) return;
    lastSentRef.current = key;
    trackEvent("roi_simulated", {
      studentCount,
      monthlyFee,
      monthlyRevenue: roi.monthlyRevenue,
    });
  }, [studentCount, monthlyFee, roi.monthlyRevenue]);

  return (
    <div className="space-y-6" data-testid="roi-simulator">
      <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <legend className="px-1 text-sm font-medium">시뮬레이션 입력</legend>

        <SliderRow
          id="roi-student-count"
          label="원아 수"
          min={10}
          max={500}
          step={5}
          value={studentCount}
          onChange={setStudentCount}
          format={(v) => `${v}명`}
        />
        <SliderRow
          id="roi-monthly-fee"
          label="원아 1인당 월 비용"
          min={10_000}
          max={50_000}
          step={1_000}
          value={monthlyFee}
          onChange={setMonthlyFee}
          format={formatKRW}
        />
        <SliderRow
          id="roi-expert-hourly-rate"
          label="전문가 시간당 비용 (가정)"
          min={50_000}
          max={200_000}
          step={5_000}
          value={expertHourlyRate}
          onChange={setExpertHourlyRate}
          format={formatKRW}
        />
      </fieldset>

      <section
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        aria-label="ROI 산출 결과"
        data-testid="roi-results"
      >
        <ResultCard label="월 매출" value={formatKRW(roi.monthlyRevenue)} testId="roi-monthly-revenue" />
        <ResultCard label="연 매출" value={formatKRW(roi.annualRevenue)} testId="roi-annual-revenue" />
        <ResultCard
          label="월 절감 시간"
          value={`${roi.monthlyTimeSavedHours.toFixed(1)}h`}
          testId="roi-monthly-time-saved"
        />
        <ResultCard label="연 절감 금액" value={formatKRW(roi.annualSavings)} testId="roi-annual-savings" />
      </section>

      <section
        className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
        aria-label="월별 누적 ROI 차트"
      >
        <h2 className="mb-3 text-sm font-medium">월별 누적 (12개월)</h2>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                fontSize={12}
                tickFormatter={(m: number) => `${m}월차`}
              />
              <YAxis fontSize={12} tickFormatter={(v: number) => formatCompactKRW(v)} />
              <Tooltip
                formatter={(value) => formatKRW(typeof value === "number" ? value : Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="cumulativeRevenue" name="누적 매출" fill="#10b981" />
              <Bar dataKey="cumulativeSavings" name="누적 절감" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

interface SliderRowProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
  format: (value: number) => string;
}

function SliderRow({ id, label, min, max, step, value, onChange, format }: SliderRowProps) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums" data-testid={`${id}-value`}>
          {format(value)}
        </span>
      </label>
      <input
        id={id}
        data-testid={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full"
        aria-label={label}
      />
    </div>
  );
}

function ResultCard({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <article
      className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-700"
      data-testid={testId}
    >
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-lg font-bold tabular-nums sm:text-xl">{value}</p>
    </article>
  );
}

function formatKRW(value: number): string {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function formatCompactKRW(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (value >= 10_000) return `${Math.round(value / 10_000)}만`;
  return `${value}`;
}
