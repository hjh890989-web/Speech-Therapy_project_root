"use client";

// FR-C-ACCOUNT — 본인 데이터 JSON 다운로드 버튼 (Client Component).
//
// 책임:
//   - "내 데이터 다운로드" 버튼 클릭 → /api/account/export 로 fetch → Blob URL 생성 → <a download> 트리거.
//   - 상태 머신: idle → downloading → success → idle (cleanup).
//   - 분석 이벤트 user_data_exported 발송 (recordCounts 는 응답 metadata 에 포함 — 단, route 가 binary
//     반환이므로 recordCounts 추출은 별도 fetch 또는 응답 헤더 확장 필요 — 본 PR 은 단순화로 빈 객체).
//
// CON-04: 모든 UI / aria-label / 주석에 "치료/진단/장애" 금칙어 0건.
//
// R4 (자녀 보호):
//   - userId 는 분석 백엔드 자동 해시 가정. 본 컴포넌트는 user id 자체 미보유.
//   - 다운로드 Blob 은 메모리에 임시 — URL.revokeObjectURL 로 cleanup.

import { useCallback, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";

/** 다운로드 상태 머신. */
type DownloadStatus = "idle" | "downloading" | "success" | "error";

export interface DataExportButtonProps {
  /** 분석 이벤트 발송용 — 호출 측 (page.tsx) 이 auth uid 전달. */
  userId: string;
}

export function DataExportButton({ userId }: DataExportButtonProps) {
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);

  const handleDownload = useCallback(async () => {
    setStatus("downloading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/account/export", {
        method: "GET",
        // same-origin 인증 쿠키 포함 — Supabase SSR 세션.
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(
          res.status === 401
            ? "로그인 후 다시 시도해 주세요."
            : "데이터 추출에 실패했어요. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }

      // Content-Disposition 헤더에서 filename 추출 (route handler 가 설정).
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename =
        match && match[1]
          ? match[1]
          : `speech-therapy-export-${new Date().toISOString().slice(0, 10)}.json`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // hidden <a> 클릭 트리거.
      const a = anchorRef.current;
      if (a) {
        a.href = url;
        a.download = filename;
        a.click();
      }

      // cleanup — URL 해제 (메모리 누수 방지).
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // recordCounts 는 binary 응답 분리 정책상 정확 산출 어려움 — 본 PR 단순화로 0 폴백.
      // R4: userId 는 server-side 해시 가정 (분석 백엔드).
      trackEvent("user_data_exported", {
        userId,
        recordCounts: {
          evaluationResults: 0,
          missionSessions: 0,
          rewards: 0,
        },
      });

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "다운로드 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, [userId]);

  const isDownloading = status === "downloading";

  return (
    <div data-testid="data-export-button-root" className="space-y-3">
      <button
        type="button"
        data-testid="data-export-button"
        onClick={() => void handleDownload()}
        disabled={isDownloading}
        aria-label="내 데이터 JSON 형식으로 다운로드"
        className="inline-flex min-h-[44px] items-center rounded-md bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-sky-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-sky-400"
      >
        {isDownloading ? "준비 중..." : "내 데이터 다운로드"}
      </button>

      {/* hidden anchor for download trigger */}
      <a
        ref={anchorRef}
        data-testid="data-export-anchor"
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
      >
        download
      </a>

      {status === "success" && (
        <p
          data-testid="data-export-success"
          role="status"
          aria-live="polite"
          className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
          다운로드가 시작되었어요. 브라우저의 다운로드 폴더를 확인해 주세요.
        </p>
      )}

      {status === "error" && errorMessage && (
        <p
          data-testid="data-export-error"
          role="alert"
          className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}
