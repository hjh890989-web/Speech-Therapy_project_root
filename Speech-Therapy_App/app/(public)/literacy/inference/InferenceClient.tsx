"use client";

// FR-Q-LIT-01 (CR-2026-007 / REQ-FUNC-CL-11) — 추론 4수준 미니게임 클라이언트 (가이드형).
//
// 흐름: 상황 들려주기 → 4수준 질문(사실→추론→비판→평가)을 한 번에 하나씩 → 아이가 소리 내어 대답 →
//   부모가 "다음"으로 진행 → 끝. **채점/정답 단정 X** — 함께 생각 나누기(유도만, F15 철학).
// LLM 자유생성 없음(자체 시나리오) — 아이 대상 안전 + 통제. 영속/임상 활성은 KOPLAC 게이트 후.
// CON-04 금칙어 0. 타이머/Date.now 없음.

import { useState } from "react";

import {
  INFERENCE_SCENARIOS,
  INFERENCE_LEVEL_LABEL,
} from "@/lib/literacy/inference-content";

const TOTAL = 4; // 4수준 질문 수

export function InferenceClient() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  // -1 = 상황 인트로 / 0~3 = 질문 / 4 = 완료.
  const [step, setStep] = useState(-1);

  const scenario = INFERENCE_SCENARIOS[scenarioIndex];

  function restart() {
    setStep(-1);
  }
  function nextScenario() {
    setScenarioIndex((i) => (i + 1) % INFERENCE_SCENARIOS.length);
    setStep(-1);
  }

  return (
    <section data-testid="inference-game" aria-label="생각 나누기">
      {/* 상황 — 항상 표시 */}
      <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">이야기</p>
        <p className="mt-1 text-lg leading-relaxed text-gray-900 dark:text-gray-100" data-testid="inference-situation">
          {scenario.situation}
        </p>
      </div>

      {/* 인트로 */}
      {step === -1 && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setStep(0)}
            data-testid="inference-start"
            className="min-h-[56px] rounded-full bg-emerald-600 px-10 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
          >
            함께 생각해 보기 ▶
          </button>
        </div>
      )}

      {/* 질문 (0~3) */}
      {step >= 0 && step < TOTAL && (
        <div data-testid="inference-question" aria-live="polite">
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            {step + 1} / {TOTAL} · {INFERENCE_LEVEL_LABEL[scenario.questions[step].level]}
          </p>
          <p className="mb-6 text-xl font-semibold text-gray-900 dark:text-gray-100" data-testid="inference-prompt">
            {scenario.questions[step].prompt}
          </p>
          <p className="mb-5 text-center text-sm text-gray-500 dark:text-gray-400">
            아이가 자유롭게 대답하면, 따뜻하게 들어주고 다음으로 넘어가요.
          </p>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              data-testid="inference-next"
              className="min-h-[56px] rounded-full bg-emerald-600 px-10 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
            >
              {step < TOTAL - 1 ? "다음 질문 →" : "다 했어요! 🎉"}
            </button>
          </div>
        </div>
      )}

      {/* 완료 */}
      {step === TOTAL && (
        <div data-testid="inference-done" aria-live="polite" className="text-center">
          <p className="text-4xl" aria-hidden="true">🌟</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            이야기로 멋진 생각을 나눴어요. 잘했어요!
          </p>
          <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={nextScenario}
              data-testid="inference-next-scenario"
              className="min-h-[44px] rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              다른 이야기 →
            </button>
            <button
              type="button"
              onClick={restart}
              data-testid="inference-restart"
              className="min-h-[44px] rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
            >
              다시 해보기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
