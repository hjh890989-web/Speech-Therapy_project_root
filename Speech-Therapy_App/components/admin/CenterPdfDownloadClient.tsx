"use client";

// FR-Q-007 (#48) — 센터 제출용 PDF Client Component (jsPDF, Replace).
//
// 책임:
//   1) "PDF 다운로드" 버튼 + 진행/에러 상태 UI.
//   2) generateCenterReportPdf(input) → Blob → URL.createObjectURL → <a download> 트리거.
//   3) 다운로드 직후 trackEvent("center_pdf_downloaded") 호출 (R4 — userId 만 노출, PII 없음).
//
// 상태 머신:
//   idle → generating → downloaded
//                 ↓
//                error → idle (재시도 가능)
//
// RBAC:
//   - 본 컴포넌트는 권한 검사 미수행 — 진입 page.tsx 가 proxy.ts + L2 가드 통과.
//   - input 안에 cross-tenant 위반 데이터가 들어오지 않는 것은 server 책임 (loadCenterReportData + page.tsx).
//
// 금칙어: 본 컴포넌트의 모든 UI 카피는 "치료/진단/장애" 미포함.

import { useCallback, useRef, useState } from "react";

// FR-PERF-4-DYNAMIC-IMPORT — jsPDF (~417KB unique chunk) 를 다운로드 클릭 시점까지 defer.
// type-only import 는 erased — 초기 bundle 영향 0.
import type { CenterReportInput } from "@/lib/pdf/center-report";
import { trackEvent } from "@/lib/analytics";

export interface CenterPdfDownloadClientProps {
  /// 서버 측 RBAC 통과 후 가공된 PDF 입력. 호출 시점의 generatedAt 포함.
  input: CenterReportInput;
  /// 분석 이벤트 전송용 — proxy.ts 인증된 user.id. PDF 본문에는 노출되지 않음.
  userId: string;
  /// (선택) 분석 이벤트 전송용. cross-tenant 검증은 server 가 완료.
  institutionId?: string;
  /// 영문 라벨 강제 (한글 폰트 미설정 환경의 fallback) — 후속 PR 옵션.
  englishFallback?: boolean;
}

type Phase =
  | { state: "idle" }
  | { state: "generating" }
  | { state: "downloaded"; bytes: number; filename: string }
  | { state: "error"; message: string };

/// 파일명 — 기관 / 자녀 식별 정보 노출 최소화. UUID prefix + 타임스탬프.
function buildFilename(userId: string, generatedAt: Date): string {
  const idPrefix = (userId || "anon").slice(0, 8);
  const ts =
    generatedAt instanceof Date && !Number.isNaN(generatedAt.getTime())
      ? generatedAt
          .toISOString()
          .replace(/[:T]/g, "-")
          .replace(/\..*Z$/, "")
      : "now";
  return `speech-report-${idPrefix}-${ts}.pdf`;
}

export function CenterPdfDownloadClient({
  input,
  userId,
  institutionId,
  englishFallback,
}: CenterPdfDownloadClientProps) {
  const [phase, setPhase] = useState<Phase>({ state: "idle" });
  /// 마지막으로 생성한 object URL — unmount / 재생성 시 revoke 위해 보관.
  const lastUrlRef = useRef<string | null>(null);

  const handleDownload = useCallback(async () => {
    setPhase({ state: "generating" });
    try {
      // FR-PERF-4-DYNAMIC-IMPORT — jsPDF lazy load (다운로드 버튼 클릭 시점).
      const { generateCenterReportPdf } = await import("@/lib/pdf/center-report");
      const result = await generateCenterReportPdf(input, {
        englishFallback: englishFallback ?? false,
      });
      // 이전 URL 정리.
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = null;
      }
      const url = URL.createObjectURL(result.blob);
      lastUrlRef.current = url;
      const filename = buildFilename(userId, input.generatedAt);

      // <a download> 트리거. happy-dom 안전 — document.body.appendChild.
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      // microtask 뒤 정리.
      setTimeout(() => {
        try {
          a.remove();
        } catch {
          // 무시.
        }
      }, 0);

      setPhase({ state: "downloaded", bytes: result.bytes, filename });

      // 분석 이벤트 — R4: userId / institutionId 외 식별 정보 없음.
      try {
        trackEvent("center_pdf_downloaded", {
          userId,
          institutionId,
        });
      } catch {
        // 분석 실패는 다운로드 흐름 차단 금지.
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "PDF 생성 중 오류가 발생했습니다.";
      setPhase({ state: "error", message });
    }
  }, [englishFallback, input, institutionId, userId]);

  const handleRetry = useCallback(() => {
    setPhase({ state: "idle" });
  }, []);

  return (
    <section
      data-testid="center-pdf-download"
      data-phase={phase.state}
      aria-labelledby="center-pdf-heading"
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="center-pdf-heading" className="text-lg font-semibold text-slate-900">
        센터 제출용 PDF
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        본 PDF 는 발달 보조 자료입니다. 발음 발달 요약 점수와 최근 음소, 활동 횟수를
        1페이지로 정리해 제공합니다.
      </p>

      <button
        type="button"
        data-testid="center-pdf-download-button"
        onClick={handleDownload}
        disabled={phase.state === "generating"}
        aria-busy={phase.state === "generating"}
        className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {phase.state === "generating" ? "생성 중..." : "PDF 다운로드"}
      </button>

      {phase.state === "downloaded" ? (
        <p
          data-testid="center-pdf-success"
          role="status"
          className="mt-3 text-sm text-emerald-700"
        >
          PDF 다운로드가 시작되었어요 ({phase.filename}, {phase.bytes} bytes).
        </p>
      ) : null}

      {phase.state === "error" ? (
        <div
          data-testid="center-pdf-error"
          role="alert"
          className="mt-3 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900"
        >
          <p>PDF 생성에 실패했어요. 잠시 후 다시 시도해 주세요.</p>
          <p className="mt-1 text-xs text-rose-700">{phase.message}</p>
          <button
            type="button"
            data-testid="center-pdf-retry"
            onClick={handleRetry}
            className="mt-2 inline-flex min-h-[36px] items-center rounded-md bg-rose-700 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-800"
          >
            다시 시도
          </button>
        </div>
      ) : null}
    </section>
  );
}
