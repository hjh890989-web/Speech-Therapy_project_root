"use client";

// 소리 변신 놀이 클라이언트 (가이드형) — CR-2026-007 후속.
//
// 흐름: 글자(예: 손에)를 보여주고 → "자연스럽게 읽으면 어떤 소리가 날까요?" 두 보기 중 함께 고르기 →
//   부모 '다음'. **채점/정답 단정 없이 유도만**(vocabulary 범주 고르기·F15 철학).
// LLM 없음(자체 콘텐츠). 타이머/Date.now 없음. CON-04 금칙어 0.

import { useState } from "react";

import { buildPhonoRulesSession, buildPhonoChoices } from "@/lib/literacy/phono-rules";
import { PHONO_RULE_LABEL } from "@/lib/literacy/phono-rules-content";

const SESSION = buildPhonoRulesSession();

export function PhonoRulesClient() {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function restart() {
    setIdx(0);
    setPicked(null);
    setDone(false);
  }

  if (done) {
    return (
      <section data-testid="phono-rules-done" aria-live="polite" className="text-center">
        <p className="text-4xl" aria-hidden="true">🌟</p>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          소리의 변신을 멋지게 알아챘어요. 잘했어요!
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={restart}
            data-testid="phono-rules-restart"
            className="min-h-[44px] rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
          >
            다시 해보기
          </button>
        </div>
      </section>
    );
  }

  const item = SESSION[idx];
  const choices = buildPhonoChoices(item, idx);
  const last = idx >= SESSION.length - 1;

  return (
    <section data-testid="phono-rules-game" aria-label="소리 변신 놀이">
      <p className="mb-2 text-center text-xs text-gray-500 dark:text-gray-400">
        {idx + 1} / {SESSION.length} · {PHONO_RULE_LABEL[item.rule]}
      </p>

      <div className="mb-5 flex flex-col items-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-7 dark:border-emerald-800 dark:bg-emerald-950/30">
        <p className="text-xs text-emerald-700 dark:text-emerald-300">이렇게 쓰여요</p>
        <p className="mt-1 text-4xl font-bold text-gray-900 dark:text-gray-100" data-testid="phono-rules-written">
          {item.written}
        </p>
      </div>

      <p className="mb-4 text-center text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="phono-rules-prompt">
        자연스럽게 읽으면 어떤 소리가 날까요?
      </p>
      <div className="mb-5 flex justify-center gap-3" role="group" aria-label="보기">
        {choices.map((c) => {
          const isPicked = picked === c.text;
          return (
            <button
              key={c.text}
              type="button"
              data-testid="phono-rules-choice"
              data-natural={c.natural ? "true" : "false"}
              aria-pressed={isPicked}
              onClick={() => setPicked(c.text)}
              className={`min-h-[64px] min-w-[96px] rounded-2xl border-2 px-5 py-3 text-2xl font-bold transition ${
                isPicked
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                  : "border-gray-200 bg-white hover:border-emerald-300 dark:border-gray-700 dark:bg-slate-900"
              }`}
            >
              {c.text}
            </button>
          );
        })}
      </div>
      <p className="mb-5 text-center text-sm text-gray-500 dark:text-gray-400">
        아이와 함께 소리 내어 읽어 보고 골라요. 어떤 답이든 함께 소리 내보면 좋아요.
      </p>
      <div className="text-center">
        <button
          type="button"
          data-testid="phono-rules-next"
          onClick={() => {
            setPicked(null);
            if (last) setDone(true);
            else setIdx((i) => i + 1);
          }}
          className="min-h-[56px] rounded-full bg-emerald-600 px-10 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
        >
          {last ? "다 했어요! 🎉" : "다음 →"}
        </button>
      </div>
    </section>
  );
}
