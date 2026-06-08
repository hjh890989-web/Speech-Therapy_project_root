"use client";

// FR-Q-LIT-01 (CR-2026-007 / REQ-FUNC-CL-10) — 읽기 유창성 미니게임 클라이언트 (지문 + 타이머).
//
// 흐름: 글 종류(이야기/설명) 선택 → 지문 표시 → "시작"(타이머) → 아이가 또박또박 끝까지 읽기 →
//   "끝!"(정지) → 완독 시간 + 분당 음절 수. ADR-04: 규준 해석/난독·학습장애 라벨 0 — 속도 + 격려만.
// 측정은 클라이언트 즉시용 — 영속/임상 해석은 KOPLAC 게이트 후(서버 미연동). CON-04 금칙어 0.
// 타이머: Date.now() 는 useEffect(setInterval) 안에서만 — render 순수성(react-hooks/purity) 준수.

import { useEffect, useMemo, useState } from "react";

import {
  FLUENCY_PASSAGES,
  PASSAGE_TYPE_LABEL,
  pickFluencyPassage,
  type PassageType,
} from "@/lib/literacy/reading-fluency-content";
import { computeFluencyResult, formatFluencySeconds } from "@/lib/literacy/reading-fluency";

type Phase = "ready" | "running" | "done";

export function ReadingFluencyClient() {
  const [type, setType] = useState<PassageType>("story");
  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsedMs, setElapsedMs] = useState(0);

  // 선택 종류의 레벨 1 지문 (없으면 폴백). 종류 바뀔 때만 재계산.
  const passage = useMemo(
    () => FLUENCY_PASSAGES.find((p) => p.type === type && p.level === 1) ?? pickFluencyPassage(1),
    [type],
  );

  // 타이머 — running 동안만 100ms 간격 갱신. Date.now 는 effect 내부(허용).
  useEffect(() => {
    if (phase !== "running") return;
    const start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 100);
    return () => clearInterval(id);
  }, [phase]);

  const result = computeFluencyResult(passage.syllableCount, elapsedMs);

  return (
    <section data-testid="fluency-game" aria-label="또박또박 읽기">
      {/* 글 종류 선택 (시작 전만) */}
      {phase === "ready" && (
        <div className="mb-4 flex justify-center gap-2" data-testid="fluency-type-toggle">
          {(["story", "explanatory"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`min-h-[44px] rounded-full px-5 py-2 text-sm font-semibold transition ${
                type === t
                  ? "bg-emerald-600 text-white"
                  : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
              }`}
            >
              {PASSAGE_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      {/* 지문 */}
      <div className="rounded-2xl border-2 border-emerald-200 bg-white p-6 dark:border-emerald-800 dark:bg-slate-900">
        <p
          className="text-xl leading-loose tracking-wide text-gray-900 dark:text-gray-100"
          data-testid="fluency-passage"
        >
          {passage.text}
        </p>
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
            data-testid="fluency-start"
            className="min-h-[56px] rounded-full bg-emerald-600 px-10 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
          >
            시작 ▶
          </button>
        )}

        {phase === "running" && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300" data-testid="fluency-timer">
              {formatFluencySeconds(elapsedMs)}초
            </p>
            <button
              type="button"
              onClick={() => setPhase("done")}
              data-testid="fluency-stop"
              className="min-h-[56px] rounded-full bg-amber-500 px-10 py-3 text-lg font-bold text-white transition hover:bg-amber-600"
            >
              다 읽었어요! ⏹
            </button>
          </div>
        )}

        {phase === "done" && (
          <div data-testid="fluency-result" aria-live="polite" className="flex flex-col items-center gap-2">
            <p className="text-4xl" aria-hidden="true">🎉</p>
            <p data-testid="fluency-result-text" className="text-sm text-gray-700 dark:text-gray-300">
              이 글을 <strong>{formatFluencySeconds(result.elapsedMs)}초</strong>에 다 읽었어요.
              (분당 {result.syllablesPerMin}음절) 잘했어요!
            </p>
            <button
              type="button"
              onClick={() => {
                setElapsedMs(0);
                setPhase("ready");
              }}
              data-testid="fluency-again"
              className="mt-2 min-h-[44px] rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
            >
              다시 읽기
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
