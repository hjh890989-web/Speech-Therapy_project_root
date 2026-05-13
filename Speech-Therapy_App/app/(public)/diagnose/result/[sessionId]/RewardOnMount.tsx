"use client";

// FR-C-009 — 결과 페이지 진입 시 별 +1 (REQ-FUNC-024, REQ-NF-005 ≤ 500ms).
// optimistic UI: ⭐ 즉시 노출 후 Server Action 비동기 호출.
// idempotencyKey 로 sessionId 사용 → 새로고침해도 서버 측 in-memory 캐시가 wasSkipped 반환.
// useRef 마운트 가드로 dev StrictMode 의 double-effect 도 차단.

import { useEffect, useRef, useState } from "react";
import { grantReward } from "@/app/actions/reward";

interface Props {
  userId: string;
  sessionId: string;
}

export function RewardOnMount({ userId, sessionId }: Props) {
  const fired = useRef(false);
  const [state, setState] = useState<"idle" | "granted" | "error">("idle");

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    (async () => {
      try {
        await grantReward({
          userId,
          rewardType: "star",
          amount: 1,
          idempotencyKey: `${sessionId}-star-1`,
        });
        setState("granted");
      } catch (err) {
        console.error("grantReward 실패:", err);
        setState("error");
      }
    })();
  }, [userId, sessionId]);

  // optimistic 표시. 실패해도 사용자 흐름 막지 않음.
  return (
    <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
      <span className="text-xl" aria-hidden>⭐</span>
      <span>
        {state === "error" ? "별을 저장하지 못했어요 — 다음에 다시 시도해요." : "오늘의 별 +1 적립!"}
      </span>
    </div>
  );
}
