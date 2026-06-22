"use client";

// 🔊 읽어주기 버튼 — 탭하면 text 를 한국어로 읽어준다(Web Speech API). 글 못 읽는 아이용.
// 모든 문해 놀이의 질문 옆에 두는 공용 컴포넌트. 미지원 브라우저면 탭해도 무음(렌더는 유지).

import { useReadAloud } from "@/lib/literacy/use-read-aloud";

interface ReadAloudButtonProps {
  /// 읽어줄 텍스트(질문·문장 등).
  text: string;
  /// 버튼 라벨(기본 "읽어주기"). 재생 반복 시 "다시 듣기" 등으로 바꿔 쓸 수 있음.
  label?: string;
  className?: string;
}

export function ReadAloudButton({
  text,
  label = "읽어주기",
  className,
}: ReadAloudButtonProps) {
  const speak = useReadAloud();
  return (
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
  );
}
