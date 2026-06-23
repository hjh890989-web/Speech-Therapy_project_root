"use client";

// 🔊 읽어주는 목소리 설정 — 기기 한국어 음성 선택 + 읽기 속도. 🔊 옆 ⚙️ 팝오버로 띄움.
// 설정은 localStorage(tts-pref) 단일 출처 → 전 게임의 읽어주기에 즉시 적용.
// 부모 목소리(ElevenLabs F11)는 ADR-09 윤리 화이트리스트(storybook/lullaby 한정) 밖이라 본 UI 범위 외.

import { useEffect, useState } from "react";

import {
  getKoreanVoices,
  getTtsPref,
  setTtsPref,
  RATE_MIN,
  RATE_MAX,
} from "@/lib/literacy/tts-pref";
import { useReadAloud } from "@/lib/literacy/use-read-aloud";

export function VoiceSettings({ onClose }: { onClose?: () => void }) {
  const speak = useReadAloud();
  // lazy init — 렌더 시점 localStorage/getVoices 1회 읽기(effect 내 직접 setState 회피).
  //   VoiceSettings 는 ⚙️ 클릭(클라이언트) 후에만 렌더 → SSR 미실행, window 가드도 있어 안전.
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() =>
    getKoreanVoices(),
  );
  const [voiceURI, setVoiceURI] = useState<string | null>(
    () => getTtsPref().voiceURI,
  );
  const [rate, setRate] = useState(() => getTtsPref().rate);

  useEffect(() => {
    // 일부 브라우저는 getVoices() 가 처음엔 비어 있다가 voiceschanged 후 채워짐 → 리스너로만 갱신.
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const onVoicesChanged = () => setVoices(getKoreanVoices());
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    return () =>
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        onVoicesChanged,
      );
  }, []);

  function onVoiceChange(uri: string) {
    const next = uri || null;
    setVoiceURI(next);
    setTtsPref({ voiceURI: next, rate });
  }
  function onRateChange(r: number) {
    setRate(r);
    setTtsPref({ voiceURI, rate: r });
  }

  return (
    <div
      data-testid="voice-settings"
      role="group"
      aria-label="읽어주는 목소리 설정"
      className="w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-slate-900"
    >
      <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
        🔊 읽어주는 목소리
      </p>

      {voices.length > 1 ? (
        <select
          data-testid="voice-select"
          aria-label="목소리 선택"
          value={voiceURI ?? ""}
          onChange={(e) => onVoiceChange(e.target.value)}
          className="mb-3 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-800 dark:text-gray-100"
        >
          <option value="">기본 목소리</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name}
            </option>
          ))}
        </select>
      ) : (
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          이 기기엔 한국어 목소리가 {voices.length}개라 고를 게 없어요. 속도만 조절돼요.
          (기기 설정에서 한국어 음성을 추가하면 늘어나요.)
        </p>
      )}

      <label className="mb-3 block text-sm text-gray-700 dark:text-gray-200">
        읽기 속도: <strong>{rate.toFixed(2)}x</strong>
        <input
          data-testid="voice-rate"
          type="range"
          min={RATE_MIN}
          max={RATE_MAX}
          step={0.05}
          value={rate}
          onChange={(e) => onRateChange(Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid="voice-test"
          onClick={() => speak("안녕! 이 목소리로 읽어 줄게요.")}
          className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-200 dark:hover:bg-slate-800"
        >
          🔊 테스트
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
          >
            닫기
          </button>
        )}
      </div>
    </div>
  );
}
