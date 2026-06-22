"use client";

// 다중 단어/위치 조음 프로브 클라이언트 — 음소 선택 → 위치별 단어 STT → 위치별 집계 (측정/확인만).
//
// 흐름: ① 소리(음소) 선택 → ② 그 소리가 든 여러 낱말(어두/어중)을 차례로 말하기(기존 STT 훅 재사용,
//   단어별 점수 = 기존 computePhoneticSimilarity) → ③ 전체/위치별 평균 표시. **판정/HITL/저장 없음**.
// 기존 단일단어 진단 흐름 미사용(독립). CON-04 금칙어 0.
//
// 점수는 effect+state 대신 STT 상태에서 **렌더 중 파생**(you-might-not-need-an-effect) — 단어 전환은
// stt.reset() 으로 transcript 를 비워 파생값이 자연히 null 로 돌아감.

import { useState } from "react";

import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";
import { computePhoneticSimilarity } from "@/lib/phonetic-similarity";
import {
  aggregateArticulationProbe,
  type ProbeWordResult,
} from "@/lib/diagnose/articulation-probe";
import {
  getProbeWords,
  PROBE_PHONEMES,
  PROBE_POSITION_LABEL,
} from "@/lib/diagnose/articulation-probe-content";

type Phase = "select" | "probe" | "done";

export function ArticulationProbeClient() {
  const [phase, setPhase] = useState<Phase>("select");
  const [phoneme, setPhoneme] = useState<string>("ㅅ");
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<ProbeWordResult[]>([]);

  const stt = useSpeechRecognition();
  const words = getProbeWords(phoneme);
  const current = words[idx];

  // 점수 파생(렌더 중) — 현재 단어 STT 결과가 있으면 기존 phonetic-similarity 로 산출. 없으면 null.
  const captured =
    phase === "probe" && current && stt.status === "result" && stt.transcript.trim().length > 0
      ? { transcript: stt.transcript, score: computePhoneticSimilarity(current.word, stt.transcript) }
      : null;

  function startPhoneme(p: string) {
    setPhoneme(p);
    setIdx(0);
    setResults([]);
    stt.reset();
    setPhase("probe");
  }

  function recordCurrent() {
    stt.reset();
    stt.start();
  }

  function nextWord() {
    if (!current) return;
    // gc-1 — 건너뛴(미발화) 단어는 결과에 기록하지 않는다. score 0 으로 push 하면
    //   aggregateArticulationProbe valid 필터(Number.isFinite(0)=true)가 평균을 끌어내림(UI '건너뛰기 무해' 안내와 모순).
    //   실발화(captured 존재)만 집계 — count·평균이 실제 측정만 반영.
    if (captured) {
      setResults((prev) => [...prev, { word: current.word, position: current.position, score: captured.score }]);
    }
    stt.reset();
    if (idx >= words.length - 1) setPhase("done");
    else setIdx((i) => i + 1);
  }

  function restart() {
    setPhase("select");
    setIdx(0);
    setResults([]);
    stt.reset();
  }

  // ── 1) 소리 선택 ──
  if (phase === "select") {
    return (
      <section data-testid="articulation-probe-select" aria-label="소리 고르기">
        <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
          확인하고 싶은 소리를 하나 골라 주세요.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {PROBE_PHONEMES.map((p) => (
            <button
              key={p}
              type="button"
              data-testid="articulation-probe-phoneme"
              onClick={() => startPhoneme(p)}
              className="min-h-[72px] min-w-[72px] rounded-2xl border-2 border-emerald-300 bg-emerald-50 text-3xl font-bold text-gray-900 transition hover:border-emerald-500 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-gray-100"
            >
              {p}
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ── 2) 낱말 말하기 ──
  if (phase === "probe" && current) {
    const unsupported = stt.isMounted && !stt.isSupported;
    return (
      <section data-testid="articulation-probe-game" aria-label="여러 낱말 말하기">
        <p className="mb-2 text-center text-xs text-gray-500 dark:text-gray-400">
          {phoneme} 소리 · {idx + 1} / {words.length} · {PROBE_POSITION_LABEL[current.position]}
        </p>
        <div className="mb-5 flex flex-col items-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100" data-testid="articulation-probe-word">
            {current.word}
          </p>
          {captured && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300" data-testid="articulation-probe-heard">
              들린 말: <strong>{captured.transcript}</strong> · 점수 {captured.score}
            </p>
          )}
        </div>

        {unsupported ? (
          <p className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            이 브라우저는 음성 인식을 지원하지 않아요. 크롬 등 다른 브라우저에서 다시 시도해 주세요.
          </p>
        ) : (
          <div className="mb-4 flex justify-center gap-3">
            <button
              type="button"
              data-testid="articulation-probe-record"
              onClick={recordCurrent}
              disabled={stt.status === "listening"}
              className="min-h-[56px] rounded-full bg-emerald-600 px-8 py-3 text-lg font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {stt.status === "listening" ? "듣는 중… 🎤" : captured ? "다시 말하기 🎤" : "말하기 🎤"}
            </button>
          </div>
        )}

        {stt.errorCode && stt.status === "error" && (
          <p className="mb-4 text-center text-xs text-amber-700 dark:text-amber-300">
            잘 안 들렸어요. 다시 한 번 말해 볼까요?
          </p>
        )}

        <div className="text-center">
          <button
            type="button"
            data-testid="articulation-probe-next"
            onClick={nextWord}
            className="min-h-[48px] rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
          >
            {idx >= words.length - 1 ? "결과 보기 →" : "다음 낱말 →"}
          </button>
          {!captured && !unsupported && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              말하기 어려우면 그냥 다음으로 넘어가도 돼요.
            </p>
          )}
        </div>
      </section>
    );
  }

  // ── 3) 결과 — 전체/위치별 평균(판정 없음) ──
  const agg = aggregateArticulationProbe(results);
  return (
    <section data-testid="articulation-probe-done" aria-live="polite">
      <p className="mb-4 text-center text-4xl" aria-hidden="true">🌟</p>
      <div className="mb-4 rounded-xl border border-gray-200 px-4 py-3 text-center dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">{phoneme} 소리 · 전체 평균</p>
        <p className="text-3xl font-bold tabular-nums" data-testid="articulation-probe-overall">
          {agg.overallMean !== null ? Math.round(agg.overallMean) : "—"}
          <span className="ml-0.5 text-sm font-normal text-gray-400">/100</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PositionCard label={PROBE_POSITION_LABEL.initial} value={agg.byPosition.initial} testid="articulation-probe-initial" />
        <PositionCard label={PROBE_POSITION_LABEL.medial} value={agg.byPosition.medial} testid="articulation-probe-medial" />
      </div>
      <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
        한 소리를 여러 낱말·위치에서 확인한 평균이에요. 판정이 아닌 참고 자료예요.
      </p>
      <div className="mt-5 text-center">
        <button
          type="button"
          data-testid="articulation-probe-restart"
          onClick={restart}
          className="min-h-[44px] rounded-full border border-emerald-600 px-6 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800"
        >
          다른 소리로 다시 →
        </button>
      </div>
    </section>
  );
}

function PositionCard({
  label,
  value,
  testid,
}: {
  label: string;
  value: number | null;
  testid: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-700">
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold tabular-nums" data-testid={testid}>
        {value !== null ? Math.round(value) : "—"}
        <span className="ml-0.5 text-sm font-normal text-gray-400">/100</span>
      </p>
    </div>
  );
}
