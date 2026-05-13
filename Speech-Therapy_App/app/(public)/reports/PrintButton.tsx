"use client";

// FR-Q-007 (Sprint 1 단순화) — 브라우저 인쇄 → PDF 저장 버튼.
// jsPDF 직접 임베드는 한글 폰트 처리 부담이 커서 Sprint 1 엔 window.print() 사용.
// 인쇄 대화상자에서 "PDF로 저장" 선택 가능 (Chrome / Edge / Safari 모두 지원).

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
    >
      PDF 로 저장하기
    </button>
  );
}
