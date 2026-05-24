"use client";

// FR-Q-WEEKLY-REVIEW — 주간 리뷰 공유 버튼.
//
// shareOrCopy (lib/share.ts) 통합:
//   - surface: "weekly_report" (events.ts 이미 enum 등록).
//   - share_clicked 이벤트는 shareOrCopy 가 단일 책임으로 발송 — 본 컴포넌트는 trackEvent 미호출.
//
// R4 (자녀 식별 정보 0):
//   - shareText 는 articulation 점수 + sessionCount 회수만 사용.
//   - userId / 자녀 이름 / email 절대 미포함.
//   - 호출 측 (page) 이 hasData=false 일 때는 본 버튼 자체를 미렌더 (page 책임).
//
// 상태 분기 (RewardShareButton 패턴 재사용):
//   - sharing: 진행 중 toast 비활성
//   - shared (web_share success): 격려 toast
//   - copied (clipboard success): 복사 안내 toast
//   - canceled (web_share AbortError): toast 미노출 (graceful)
//   - unsupported: alert 안내

import { useCallback, useState } from "react";

import { shareOrCopy, type ShareMethod } from "@/lib/share";

export interface WeeklyReviewShareButtonProps {
  /// 0~100, latest WeeklyReport.articulationAvg — 공유 텍스트의 대표 점수.
  articulationAvg: number;
  /// 이번 주 활동 회수.
  sessionCount: number;
}

type ShareStatus =
  | { state: "idle" }
  | { state: "sharing" }
  | { state: "shared"; method: Extract<ShareMethod, "web_share"> }
  | { state: "copied" }
  | { state: "canceled" }
  | { state: "unsupported"; message?: string };

const SHARE_TITLE = "이번 주 발음 발달 리뷰";

export function WeeklyReviewShareButton({
  articulationAvg,
  sessionCount,
}: WeeklyReviewShareButtonProps) {
  const [status, setStatus] = useState<ShareStatus>({ state: "idle" });

  const handleShare = useCallback(async () => {
    setStatus({ state: "sharing" });

    // R4 — articulation 점수 + 활동 회수만. 자녀 이름 / userId 0.
    const articulationRounded = Math.round(articulationAvg);
    const shareText = `우리 아이 이번 주 발음 점수: 조음 ${articulationRounded}점, 활동 ${sessionCount}회!`;

    const url =
      typeof window !== "undefined" && window.location?.href
        ? window.location.href
        : "";

    const result = await shareOrCopy({
      title: SHARE_TITLE,
      text: shareText,
      url,
      surface: "weekly_report",
    });

    if (result.method === "web_share" && result.succeeded) {
      setStatus({ state: "shared", method: "web_share" });
      return;
    }
    if (result.method === "web_share" && !result.succeeded) {
      setStatus({ state: "canceled" });
      return;
    }
    if (result.method === "clipboard" && result.succeeded) {
      setStatus({ state: "copied" });
      return;
    }
    setStatus({ state: "unsupported", message: result.message });
  }, [articulationAvg, sessionCount]);

  const isSharing = status.state === "sharing";

  return (
    <section
      data-testid="weekly-review-share-section"
      aria-label="이번 주 결과 공유"
      className="flex flex-col items-start gap-2"
    >
      <button
        type="button"
        data-testid="weekly-review-share-button"
        onClick={handleShare}
        disabled={isSharing}
        aria-label="이번 주 결과 공유하기"
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-wait disabled:opacity-70"
      >
        {isSharing ? "보내는 중…" : "이번 주 결과 공유하기"}
      </button>

      {status.state === "shared" && (
        <p
          data-testid="weekly-review-share-toast-shared"
          role="status"
          className="text-sm font-medium text-emerald-700 dark:text-emerald-300"
        >
          이번 주도 수고하셨어요!
        </p>
      )}
      {status.state === "copied" && (
        <p
          data-testid="weekly-review-share-toast-copied"
          role="status"
          className="text-sm font-medium text-emerald-700 dark:text-emerald-300"
        >
          주소를 복사했어요. 원하는 곳에 붙여 넣어 주세요.
        </p>
      )}
      {status.state === "unsupported" && (
        <p
          data-testid="weekly-review-share-toast-unsupported"
          role="alert"
          className="text-sm font-medium text-amber-700 dark:text-amber-300"
        >
          {status.message ??
            "이 기기에서는 자동 공유가 지원되지 않아요. 주소를 길게 눌러 복사해 주세요."}
        </p>
      )}
      {/* canceled — toast 미노출 (graceful UX) */}
    </section>
  );
}
