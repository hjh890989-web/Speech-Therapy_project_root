"use client";

// FR-C-012 (#35 Replace 67-D1) — 보상 도감 "공유하기" 버튼.
//
// 본 컴포넌트는 자녀(2~7세) 가 보는 /rewards/collection 페이지 하단에 노출되어,
// 부모/친구에게 누적 보상 자랑을 보낼 수 있게 해 준다. 카카오 SDK 의존성 0
// (Replace 67-D1) — 실 채널은 lib/share.ts::shareOrCopy 가 Web Share / clipboard /
// execCommand 폴백 순서로 처리.
//
// 텔레메트리 정책:
//   - share_clicked 이벤트는 shareOrCopy 가 surface="reward" 라벨로 발송한다.
//     (lib/share.ts 의 contract — "호출 측 중복 호출 금지" 주석 참조)
//   - 본 컴포넌트는 trackEvent 직접 호출 없이 result.method / succeeded 분기로
//     자녀 친화 토스트만 노출.
//
// 자녀 친화 UI 기준 (REQ-NF-007):
//   - 버튼 글자 text-xl (≥ 20px) + min-h-[56px] tap target (≥ 44px)
//   - 밝은 보라 톤 — 옆에 있는 별/나무/AI 카드와 시각 분리
//   - 토스트 카피는 "친구에게 자랑해 봐요!" 격려조 (CON-04 금칙어 0건)
//
// R4 (자녀 식별 정보):
//   - shareText 는 stars/trees/aiArtsCount 집계 카운트만 사용. userId / 자녀 이름 0건.
//   - 호출 측 (page.tsx) 이 빈 상태 (모두 0) 일 때는 버튼 자체를 미노출 처리.

import { useCallback, useState } from "react";

import { shareOrCopy, type ShareMethod } from "@/lib/share";

export interface RewardShareButtonProps {
  stars: number;
  trees: number;
  aiArtsCount: number;
}

type ShareStatus =
  | { state: "idle" }
  | { state: "sharing" }
  | { state: "shared"; method: Extract<ShareMethod, "web_share"> }
  | { state: "copied" }
  | { state: "canceled" }
  | { state: "unsupported"; message?: string };

const SHARE_TITLE = "내 보상 도감";

/**
 * 자녀가 누적 보상을 자랑할 수 있는 공유 버튼.
 *
 * `lib/share.ts::shareOrCopy` 의 결과 분기에 따라 자녀 친화 토스트만 노출하며,
 * `share_clicked` 텔레메트리는 helper 가 단일 책임으로 발송한다.
 */
export function RewardShareButton({
  stars,
  trees,
  aiArtsCount,
}: RewardShareButtonProps) {
  const [status, setStatus] = useState<ShareStatus>({ state: "idle" });

  const handleShare = useCallback(async () => {
    setStatus({ state: "sharing" });

    // R4 — 집계 카운트만 사용. AI 그림 카운트는 0 인 경우 카피에서 제외해 자녀 친화 카피를 짧게 유지.
    const parts = [`별 ${stars}개`, `나무 ${trees}그루`];
    if (aiArtsCount > 0) {
      parts.push(`그림 ${aiArtsCount}개`);
    }
    const shareText = `${parts.join(", ")}을 모았어요!`;

    const url =
      typeof window !== "undefined" && window.location?.href
        ? window.location.href
        : "";

    const result = await shareOrCopy({
      title: SHARE_TITLE,
      text: shareText,
      url,
      surface: "reward",
    });

    if (result.method === "web_share" && result.succeeded) {
      setStatus({ state: "shared", method: "web_share" });
      return;
    }
    if (result.method === "web_share" && !result.succeeded) {
      // 사용자 cancel (AbortError) — graceful, 에러 토스트 미노출.
      setStatus({ state: "canceled" });
      return;
    }
    if (result.method === "clipboard" && result.succeeded) {
      setStatus({ state: "copied" });
      return;
    }
    setStatus({ state: "unsupported", message: result.message });
  }, [stars, trees, aiArtsCount]);

  const isSharing = status.state === "sharing";

  return (
    <section
      data-testid="reward-share-button-section"
      aria-label="내 보상 공유하기"
      className="mt-8 flex flex-col items-center gap-3"
    >
      <button
        type="button"
        data-testid="reward-share-button"
        onClick={handleShare}
        disabled={isSharing}
        aria-label="내 보상 공유하기"
        className="inline-flex min-h-[56px] min-w-[44px] items-center justify-center rounded-2xl bg-violet-500 px-8 py-3 text-xl font-bold text-white shadow-md transition hover:bg-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-300 disabled:cursor-wait disabled:opacity-70"
      >
        {isSharing ? "보내는 중…" : "내 보상 자랑하기"}
      </button>

      {status.state === "shared" && (
        <p
          data-testid="reward-share-toast-shared"
          role="status"
          className="text-xl font-semibold text-violet-700 dark:text-violet-300"
        >
          친구에게 자랑해 봐요!
        </p>
      )}
      {status.state === "copied" && (
        <p
          data-testid="reward-share-toast-copied"
          role="status"
          className="text-xl font-semibold text-violet-700 dark:text-violet-300"
        >
          주소를 복사했어요. 원하는 곳에 붙여 넣어 보세요!
        </p>
      )}
      {status.state === "unsupported" && (
        <p
          data-testid="reward-share-toast-unsupported"
          role="alert"
          className="text-xl font-semibold text-amber-700 dark:text-amber-300"
        >
          {status.message ?? "이 기기에서는 자동 공유가 안 돼요. 주소창을 길게 눌러 복사해 주세요."}
        </p>
      )}
      {/* canceled 상태는 의도적으로 토스트 미노출 — graceful UX. */}
    </section>
  );
}
