"use client";

// 구강 운동 프로브 클라이언트 — MPT 스톱워치 + DDK 탭 카운터 (측정만, 판정 X).
//
// 흐름: ① 길게 소리내기(MPT) — "아~" 시작/정지 스톱워치로 지속 시간 측정.
//   ② 빠르게 말하기(DDK) — 과제 선택 후 5초 동안 아이가 반복, 부모가 들을 때마다 탭 → 회/초.
//   → 측정값만 표시. **또래 비교/판정 없음**(규준 자문 후). 오디오 DSP 없이 부모 매개로 신뢰성 확보.
// CON-04 금칙어 0.

import { useState, useRef } from "react";

import {
  computeDdkRate,
  normalizeMptSeconds,
} from "@/lib/diagnose/oral-motor";
import { DDK_TASKS, MPT_TASK, DDK_DURATION_SEC } from "@/lib/diagnose/oral-motor-content";

type Phase = "intro" | "mpt" | "ddk" | "done";

export function OralMotorClient() {
  const [phase, setPhase] = useState<Phase>("intro");

  // MPT
  const [mptRunning, setMptRunning] = useState(false);
  const mptStartRef = useRef<number | null>(null);
  const [mptSeconds, setMptSeconds] = useState<number | null>(null);

  // DDK
  const [ddkTaskIdx, setDdkTaskIdx] = useState(0);
  const [ddkTaps, setDdkTaps] = useState(0);
  const [ddkRate, setDdkRate] = useState<number | null>(null);

  function startMpt() {
    mptStartRef.current = performance.now();
    setMptRunning(true);
    setMptSeconds(null);
  }
  function stopMpt() {
    if (mptStartRef.current === null) return;
    const elapsed = (performance.now() - mptStartRef.current) / 1000;
    setMptSeconds(normalizeMptSeconds(elapsed));
    setMptRunning(false);
    mptStartRef.current = null;
  }

  function finishDdk() {
    setDdkRate(computeDdkRate(ddkTaps, DDK_DURATION_SEC));
    setPhase("done");
  }

  function restart() {
    setPhase("intro");
    setMptRunning(false);
    mptStartRef.current = null;
    setMptSeconds(null);
    setDdkTaps(0);
    setDdkRate(null);
    setDdkTaskIdx(0);
  }

  // ── 인트로 ──
  if (phase === "intro") {
    return (
      <section data-testid="oral-motor-intro" className="text-center">
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
          두 가지 입 운동을 차례로 측정해 보아요. 부모님이 함께 도와주세요.
        </p>
        <button
          type="button"
          data-testid="oral-motor-start"
          onClick={() => setPhase("mpt")}
          className="min-h-[56px] rounded-full bg-emerald-600 px-10 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
        >
          측정 시작 ▶
        </button>
      </section>
    );
  }

  // ── 1) MPT — 길게 소리내기 ──
  if (phase === "mpt") {
    return (
      <section data-testid="oral-motor-mpt" aria-label="길게 소리내기">
        <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">① {MPT_TASK.label}</h2>
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">{MPT_TASK.hint}</p>
        <div className="mb-5 flex flex-col items-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-800 dark:bg-emerald-950/30">
          <span className="text-6xl" aria-hidden="true">🅰️</span>
          {mptSeconds !== null && (
            <p className="mt-3 text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100" data-testid="oral-motor-mpt-value">
              {mptSeconds}초
            </p>
          )}
        </div>
        <div className="flex justify-center gap-3">
          {!mptRunning ? (
            <button
              type="button"
              data-testid="oral-motor-mpt-start"
              onClick={startMpt}
              className="min-h-[56px] rounded-full bg-emerald-600 px-8 py-3 text-lg font-bold text-white transition hover:bg-emerald-700"
            >
              {mptSeconds === null ? "시작 (아이가 “아~” 시작할 때)" : "다시 측정"}
            </button>
          ) : (
            <button
              type="button"
              data-testid="oral-motor-mpt-stop"
              onClick={stopMpt}
              className="min-h-[56px] animate-pulse rounded-full bg-amber-500 px-8 py-3 text-lg font-bold text-white transition hover:bg-amber-600"
            >
              정지 (소리 멈출 때)
            </button>
          )}
        </div>
        {mptSeconds !== null && !mptRunning && (
          <div className="mt-6 text-center">
            <button
              type="button"
              data-testid="oral-motor-to-ddk"
              onClick={() => setPhase("ddk")}
              className="min-h-[48px] rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
            >
              다음: 빠르게 말하기 →
            </button>
          </div>
        )}
      </section>
    );
  }

  // ── 2) DDK — 빠르게 말하기 ──
  if (phase === "ddk") {
    const task = DDK_TASKS[ddkTaskIdx];
    return (
      <section data-testid="oral-motor-ddk" aria-label="빠르게 말하기">
        <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">② {task.label}</h2>
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{task.hint}</p>

        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {DDK_TASKS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              data-testid="oral-motor-ddk-task"
              aria-pressed={i === ddkTaskIdx}
              onClick={() => {
                setDdkTaskIdx(i);
                setDdkTaps(0);
              }}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                i === ddkTaskIdx
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="mb-2 text-center text-xs text-gray-500 dark:text-gray-400">
          {DDK_DURATION_SEC}초 동안 아이가 반복할 때마다 아래 큰 버튼을 눌러 주세요.
        </p>
        <button
          type="button"
          data-testid="oral-motor-ddk-tap"
          onClick={() => setDdkTaps((n) => n + 1)}
          className="mb-4 flex min-h-[120px] w-full flex-col items-center justify-center rounded-2xl border-2 border-emerald-300 bg-emerald-50 text-gray-900 transition active:scale-[0.99] dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-gray-100"
        >
          <span className="text-5xl font-extrabold tabular-nums" data-testid="oral-motor-ddk-count">{ddkTaps}</span>
          <span className="mt-1 text-sm text-gray-600 dark:text-gray-400">눌러서 세기</span>
        </button>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            data-testid="oral-motor-ddk-reset"
            onClick={() => setDdkTaps(0)}
            className="min-h-[44px] rounded-full border border-gray-300 px-5 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            0으로
          </button>
          <button
            type="button"
            data-testid="oral-motor-ddk-finish"
            onClick={finishDdk}
            className="min-h-[44px] rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            측정 마치기 🎉
          </button>
        </div>
      </section>
    );
  }

  // ── 완료 — 측정값만(판정 없음) ──
  return (
    <section data-testid="oral-motor-done" aria-live="polite">
      <p className="mb-4 text-center text-4xl" aria-hidden="true">🌟</p>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">길게 소리내기(MPT)</span>
          <span className="text-lg font-bold tabular-nums" data-testid="oral-motor-result-mpt">
            {mptSeconds !== null ? `${mptSeconds}초` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">빠르게 말하기(DDK)</span>
          <span className="text-lg font-bold tabular-nums" data-testid="oral-motor-result-ddk">
            {ddkRate !== null ? `${ddkRate} 회/초` : "—"}
          </span>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        측정값이에요. 또래 비교 기준은 준비 중이라 잘하고 못하고를 판정하지 않아요.
      </p>
      <div className="mt-5 text-center">
        <button
          type="button"
          data-testid="oral-motor-restart"
          onClick={restart}
          className="min-h-[44px] rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
        >
          다시 측정하기
        </button>
      </div>
    </section>
  );
}
