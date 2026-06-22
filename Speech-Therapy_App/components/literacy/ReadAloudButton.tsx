"use client";

// 🔊 읽어주기 버튼 — 탭하면 text 를 한국어로 읽어준다(Web Speech API). 글 못 읽는 아이용.
// 옆 ⚙️ = 목소리/속도 설정 팝오버(VoiceSettings). 미지원 브라우저면 탭해도 무음(렌더는 유지).

import { useState } from "react";

import { useReadAloud } from "@/lib/literacy/use-read-aloud";
import { VoiceSettings } from "@/components/literacy/VoiceSettings";

interface ReadAloudButtonProps {
  /// 읽어줄 텍스트(질문·문장 등).
  text: string;
  /// 버튼 라벨(기본 "읽어주기").
  label?: string;
  className?: string;
  /// 🔊 옆 ⚙️ 목소리 설정 토글 표시(기본 true). 한 화면에 버튼이 여럿이면 false 로 중복 숨김.
  showSettings?: boolean;
}

export function ReadAloudButton({
  text,
  label = "읽어주기",
  className,
  showSettings = true,
}: ReadAloudButtonProps) {
  const speak = useReadAloud();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center gap-1">
      <button
        type="button"
        data-testid="read-aloud-button"
        onClick={() => speak(text)}
        aria-label={`${label}: ${text}`}
        className={
          className ??
          "inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
        }
      >
        <span aria-hidden="true">🔊</span> {label}
      </button>

      {showSettings && (
        <>
          <button
            type="button"
            data-testid="voice-settings-toggle"
            aria-label="읽어주는 목소리 설정"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((o) => !o)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-sm text-gray-600 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">⚙️</span>
          </button>
          {settingsOpen && (
            <div className="absolute left-0 top-full z-30 mt-1">
              <VoiceSettings onClose={() => setSettingsOpen(false)} />
            </div>
          )}
        </>
      )}
    </span>
  );
}
