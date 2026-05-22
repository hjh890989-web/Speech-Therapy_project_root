// FR-C-012 / TEST-011 (Replace 67-D1) — Web Share API + 클립보드 폴백 helper.
//
// 카카오 SDK 의존성 0 (REQ-FUNC-030/031 Replace). 실제 공유 채널은 다음 우선순위:
//   1. navigator.share        — 모바일 / Chrome 등 Web Share API 지원 환경.
//   2. navigator.clipboard    — 데스크톱 / 지원 안 되는 환경. URL 텍스트 복사.
//   3. document.execCommand   — legacy 폴백 (Safari 구버전 / 비-secure context).
//
// 사용자 cancel (AbortError) 은 에러가 아니라 정상 종료로 취급 (toast 미노출).
// trackEvent("share_clicked") 는 본 helper 가 책임지고 발송 — 호출 측 중복 호출 금지.
//
// R4 (자녀 식별 정보 미포함): 본 helper 는 호출 측이 전달한 text/url 만 그대로 사용.
// 호출 측 (결과 / 보상 / 주간 리포트 페이지) 이 사전에 익명화된 문자열만 전달할 책임.

import { trackEvent } from "./analytics";

export type ShareSurface = "result" | "reward" | "weekly_report";

export type ShareMethod = "web_share" | "clipboard" | "unsupported";

export type ShareResult = {
  method: ShareMethod;
  /** user cancel (AbortError) 시 false. 폴백/성공 모두 true. */
  succeeded: boolean;
  /** 사용자 취소 또는 환경 미지원 시 표시할 안내. UI 측 toast 등에 활용. */
  message?: string;
};

export type ShareInput = {
  /** 공유 메시지 본문 (자녀 식별 정보 미포함, 호출 측 책임). */
  text: string;
  /** 공유 링크 (절대 URL). Web Share / 클립보드 양쪽에서 사용. */
  url: string;
  /** Web Share dialog 제목. 미지원 환경에서는 무시. */
  title?: string;
  /** 텔레메트리 surface 구분 (events.ts share_clicked.properties.surface). */
  surface: ShareSurface;
};

/**
 * Web Share API → 클립보드 → execCommand 폴백 순으로 공유 시도.
 *
 * - 항상 trackEvent("share_clicked") 1회 발송 (method + succeeded + surface).
 * - throw 하지 않음 — 호출 측은 result.method / result.succeeded 로 분기.
 */
export async function shareOrCopy(input: ShareInput): Promise<ShareResult> {
  const { text, url, title, surface } = input;
  const payload = url ? `${text}\n${url}`.trim() : text;

  // 1) Web Share API
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      trackEvent("share_clicked", {
        method: "web_share",
        succeeded: true,
        surface,
      });
      return { method: "web_share", succeeded: true };
    } catch (err) {
      // 사용자 취소(AbortError) 는 에러로 취급하지 않음 — toast 미노출.
      if (isAbortError(err)) {
        trackEvent("share_clicked", {
          method: "web_share",
          succeeded: false,
          surface,
        });
        return { method: "web_share", succeeded: false };
      }
      // 그 외 실패 — 클립보드 폴백으로 진행.
    }
  }

  // 2) Clipboard API
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(payload);
      trackEvent("share_clicked", {
        method: "clipboard",
        succeeded: true,
        surface,
      });
      return {
        method: "clipboard",
        succeeded: true,
        message: "링크를 복사했어요. 원하는 곳에 붙여 넣어 주세요.",
      };
    } catch {
      // execCommand 폴백으로 진행.
    }
  }

  // 3) execCommand legacy 폴백 (Safari 구버전 / 비-secure context).
  if (typeof document !== "undefined" && typeof document.execCommand === "function") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = payload;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (ok) {
        trackEvent("share_clicked", {
          method: "clipboard",
          succeeded: true,
          surface,
        });
        return {
          method: "clipboard",
          succeeded: true,
          message: "링크를 복사했어요. 원하는 곳에 붙여 넣어 주세요.",
        };
      }
    } catch {
      // fallthrough.
    }
  }

  // 모든 수단 미지원 — 호출 측은 message 로 사용자에게 안내.
  trackEvent("share_clicked", {
    method: "unsupported",
    succeeded: false,
    surface,
  });
  return {
    method: "unsupported",
    succeeded: false,
    message: "이 기기에서는 자동 공유가 지원되지 않아요. 주소창을 길게 눌러 복사해 주세요.",
  };
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: unknown }).name === "AbortError"
  );
}
