"use client";

// FR-Q-LIT-01 (CR-2026-007 / REQ-FUNC-CL-10) — RAN 미니게임 클라이언트 (배열판 + 타이머).
//
// 흐름: 자극(색깔/그림) 선택 → 5×5 배열판 → "시작"(타이머) → 아이가 왼쪽 위부터 빠르게 이름대기 →
//   "끝!"(정지) → 완료 시간 표시. ADR-04: 규준 해석/난독·학습장애 라벨 0 — 시간 + 격려만.
// 측정은 클라이언트 즉시용 — 영속/임상 해석은 KOPLAC 게이트 후(서버 미연동). CON-04 금칙어 0.
//
// 타이머: Date.now() 는 useEffect(setInterval) 안에서만 — render 순수성(react-hooks/purity) 준수.

import { useEffect, useMemo, useState } from "react";

import {
  RAN_COLORS,
  RAN_OBJECTS,
  RAN_COLS,
  RAN_BOARD_SIZE,
  RAN_STIMULUS_LABEL,
  generateRanBoardIndices,
  type RanStimulusType,
} from "@/lib/literacy/ran-content";
import { computeRanResult, formatRanSeconds } from "@/lib/literacy/ran";

type Phase = "ready" | "running" | "done";

export function RanGameClient() {
  const [stimulusType, setStimulusType] = useState<RanStimulusType>("color");
  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsedMs, setElapsedMs] = useState(0);

  // 배열판은 1회 생성 (결정적). 자극 유형은 같은 인덱스 배열을 색/그림으로 렌더만 전환.
  const board = useMemo(() => generateRanBoardIndices(RAN_COLORS.length), []);

  // 타이머 — running 동안만 100ms 간격 갱신. Date.now 는 effect 내부(허용).
  useEffect(() => {
    if (phase !== "running") return;
    const start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 100);
    return () => clearInterval(id);
  }, [phase]);

  const result = computeRanResult(RAN_BOARD_SIZE, elapsedMs);

  return (
    <section data-testid="ran-game" aria-label="빨리 이름대기">
      {/* 자극 유형 선택 (시작 전만) */}
      {phase === "ready" && (
        <div className="mb-4 flex justify-center gap-2" data-testid="ran-type-toggle">
          {(["color", "object"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setStimulusType(t)}
              aria-pressed={stimulusType === t}
              className={`min-h-[44px] rounded-full px-5 py-2 text-sm font-semibold transition ${
                stimulusType === t
                  ? "bg-emerald-600 text-white"
                  : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
              }`}
            >
              {RAN_STIMULUS_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      {/* 배열판 */}
      <div
        className="mx-auto grid max-w-md gap-2 rounded-2xl border-2 border-emerald-200 bg-white p-3 dark:border-emerald-800 dark:bg-slate-900"
        style={{ gridTemplateColumns: `repeat(${RAN_COLS}, minmax(0, 1fr))` }}
        data-testid="ran-board"
        aria-label={`${RAN_STIMULUS_LABEL[stimulusType]} 배열판`}
      >
        {board.map((idx, i) => (
          <div key={i} className="flex aspect-square items-center justify-center">
            {stimulusType === "color" ? (
              <span
                className={`block h-3/4 w-3/4 rounded-full ${RAN_COLORS[idx].className}`}
                role="img"
                aria-label={RAN_COLORS[idx].label}
              />
            ) : (
              <span className="text-2xl sm:text-3xl" role="img" aria-label={RAN_OBJECTS[idx].label}>
                {RAN_OBJECTS[idx].emoji}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 컨트롤 / 타이머 / 결과 */}
      <div className="mt-6 text-center">
        {phase === "ready" && (
          <button
            type="button"
            onClick={() => {
              setElapsedMs(0);
              setPhase("running");
            }}
            data-testid="ran-start"
            className="min-h-[56px] rounded-full bg-emerald-600 px-10 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
          >
            시작 ▶
          </button>
        )}

        {phase === "running" && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300" data-testid="ran-timer">
              {formatRanSeconds(elapsedMs)}초
            </p>
            <button
              type="button"
              onClick={() => setPhase("done")}
              data-testid="ran-stop"
              className="min-h-[56px] rounded-full bg-amber-500 px-10 py-3 text-lg font-bold text-white transition hover:bg-amber-600"
            >
              끝! ⏹
            </button>
          </div>
        )}

        {phase === "done" && (
          <div data-testid="ran-result" aria-live="polite" className="flex flex-col items-center gap-2">
            <p className="text-4xl" aria-hidden="true">🎉</p>
            <p data-testid="ran-result-text" className="text-sm text-gray-700 dark:text-gray-300">
              {result.itemCount}개를 <strong>{formatRanSeconds(result.elapsedMs)}초</strong>에 다 말했어요. 멋져요!
            </p>
            <button
              type="button"
              onClick={() => {
                setElapsedMs(0);
                setPhase("ready");
              }}
              data-testid="ran-again"
              className="mt-2 min-h-[44px] rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
            >
              다시 해보기
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
