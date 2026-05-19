"use client";

// FR-C-009 — 결과 페이지 진입 시 별 +1 (REQ-FUNC-024, REQ-NF-005 ≤ 500ms).
// optimistic UI: ⭐ 즉시 노출 후 Server Action 비동기 호출.
// idempotencyKey 로 sessionId 사용 → 새로고침해도 RewardLog @@unique 가 wasSkipped 보장.
// useRef 마운트 가드로 dev StrictMode 의 double-effect 도 차단.
//
// UX: 배너 클릭 시 /rewards 로 이동 — 사용자가 별 도감을 즉시 볼 수 있게.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { grantReward } from "@/app/actions/reward";
import { trackEvent } from "@/lib/analytics";

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
        const out = await grantReward({
          userId,
          rewardType: "star",
          amount: 1,
          idempotencyKey: `${sessionId}-star-1`,
        });
        trackEvent("reward_granted", {
          rewardType: "star",
          amount: 1,
          wasSkipped: out.wasSkipped,
        });
        setState("granted");
      } catch (err) {
        console.error("grantReward 실패:", err);
        setState("error");
      }
    })();
  }, [userId, sessionId]);

  if (state === "error") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
        <span className="text-xl" aria-hidden>⭐</span>
        <span>별을 저장하지 못했어요 — 다음에 다시 시도해요.</span>
      </div>
    );
  }

  // 적립 성공 (또는 optimistic) → 별 도감으로 이동 가능한 링크 카드.
  return (
    <Link
      href="/rewards"
      className="mb-4 flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-800 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
    >
      <span className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>⭐</span>
        <span>오늘의 별 +1 적립! — 별 도감에서 모은 별을 확인해 보세요</span>
      </span>
      <span aria-hidden className="text-emerald-700 dark:text-emerald-300">→</span>
    </Link>
  );
}
