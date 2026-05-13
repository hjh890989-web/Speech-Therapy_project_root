"use client";

// FR-C-001 §A — 결과 페이지에서 aiCushionText 를 비동기로 채우는 클라이언트 컴포넌트.
// 마운트 시 generateCushion Server Action 호출 → 응답 시 텍스트 표시.
// useRef 마운트 가드로 dev StrictMode double-effect 차단.

import { useEffect, useRef, useState } from "react";
import { generateCushion } from "@/app/actions/cushion";

interface Props {
  sessionId: string;
  /** SSR 시점 DB 에 이미 채워져 있던 텍스트 (있으면 호출 생략). */
  initialText?: string | null;
}

export function CushionAsync({ sessionId, initialText }: Props) {
  const fired = useRef(false);
  const [text, setText] = useState<string>(initialText ?? "");
  const [state, setState] = useState<"loading" | "ready" | "error">(
    initialText ? "ready" : "loading",
  );

  useEffect(() => {
    if (initialText) return;
    if (fired.current) return;
    fired.current = true;
    (async () => {
      try {
        const result = await generateCushion({ sessionId });
        setText(result.aiCushionText);
        setState("ready");
      } catch (err) {
        console.error("generateCushion 실패:", err);
        setState("error");
      }
    })();
  }, [sessionId, initialText]);

  if (state === "loading") {
    return (
      <p
        className="mt-1 inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
        aria-live="polite"
      >
        <span
          className="inline-block h-3 w-3 animate-pulse rounded-full bg-emerald-400"
          aria-hidden
        />
        다정한 한마디를 준비하는 중...
      </p>
    );
  }

  if (state === "error") {
    return (
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        오늘도 즐겁게 발음 연습을 해 보아요.
      </p>
    );
  }

  return <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{text}</p>;
}
