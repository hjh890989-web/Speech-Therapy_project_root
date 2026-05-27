// SEC-COMP-MED (Grill #3A A5) — 의료기기법 disclaimer 전역 footer.
//
// 책임:
//   - 모든 페이지 footer 에 "본 서비스는 의료기기가 아닙니다" 등 disclaimer 노출.
//   - 변호사 자문 (Grill #3A 트랙 C1) 결과 반영 전 임시 골격.
//   - /privacy + /terms 링크 통합 — 사용자가 한 클릭에 정책 페이지 진입.
//
// 출시 전 변호사 자문 후 본 footer 의 표현 / 링크 / 책임 한계 조항 정식 교체 예정.
//
// CON-04: 의료 단정 표현 금칙어 0건 — "의료기기 아님" / "의학적 평가가 아닌" 만 사용.

import Link from "next/link";

export function MedicalDisclaimerFooter() {
  return (
    <footer
      data-testid="medical-disclaimer-footer"
      className="mt-auto border-t border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
    >
      <div className="mx-auto max-w-4xl space-y-2">
        <p className="font-semibold text-slate-900 dark:text-slate-100">
          ⚠️ 본 서비스는 의료기기가 아닙니다.
        </p>
        <p>
          Speech-Therapy 는 만 2~7세 자녀의 발음 발달을 부모님께서 직접 확인하실 수 있도록
          돕는 <strong>발달 가이드용 보조 도구</strong>예요. 의학적 평가가 아닌 발달 안내를
          제공해요. 자녀의 발음 발달에 대한 의료적 판단이 필요한 경우 의료기관 진료를
          권장드려요.
        </p>
        <nav aria-label="정책 페이지" className="flex flex-wrap gap-4 pt-2">
          <Link
            href="/privacy"
            data-testid="footer-privacy-link"
            className="underline hover:no-underline"
          >
            개인정보 처리방침
          </Link>
          <Link
            href="/terms"
            data-testid="footer-terms-link"
            className="underline hover:no-underline"
          >
            이용약관
          </Link>
        </nav>
      </div>
    </footer>
  );
}
