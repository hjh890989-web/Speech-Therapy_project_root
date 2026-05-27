// SEC-COMP-PIPA (Grill #3A A1+A2) — /settings/privacy-consent 부모용 PIPA 동의 페이지.
// Server Component.
//
// 책임:
//   1) Supabase auth 확인 — 비로그인 시 /login?next=/settings/privacy-consent redirect.
//   2) 현재 동의 일시 (pipaUnderageConsentAt, overseasTransferConsentAt) 표시.
//   3) PrivacyConsentForm (Client Component) 를 mount — 사용자가 체크박스 + 저장.
//
// RBAC (R4):
//   - 본인 user.id row 만 조회 + 수정. cross-read 0건.
//
// CON-04: 의료 단정 표현 금칙어 0건. "발달 가이드" / "발음 발달 확인" 사용.

import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCachedUser } from "@/lib/auth/cached-get-user";
import { PrivacyConsentForm } from "@/components/settings/PrivacyConsentForm";

export const metadata = {
  title: "개인정보 동의 — Speech-Therapy",
  description:
    "만 14세 미만 자녀의 개인정보 처리 및 외부 AI 서비스로의 국외 이전에 대한 부모 동의를 관리해요.",
};

export const dynamic = "force-dynamic";

function formatDateKr(d: Date | null): string {
  if (!d) return "미동의";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}년 ${m}월 ${day}일`;
}

export default async function SettingsPrivacyConsentPage() {
  const user = await getCachedUser();
  if (!user) {
    redirect("/login?next=/settings/privacy-consent");
  }

  // 현재 동의 상태 — null 이면 미동의.
  let pipaAt: Date | null = null;
  let overseasAt: Date | null = null;
  try {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        pipaUnderageConsentAt: true,
        overseasTransferConsentAt: true,
      },
    });
    pipaAt = row?.pipaUnderageConsentAt ?? null;
    overseasAt = row?.overseasTransferConsentAt ?? null;
  } catch (err) {
    console.error("[settings/privacy-consent] User findUnique 실패", err);
    // graceful — 미동의 상태로 폴백 (사용자가 재동의 가능).
  }

  const bothConsented = pipaAt !== null && overseasAt !== null;

  return (
    <main
      data-testid="settings-privacy-consent-page"
      className="mx-auto max-w-3xl px-4 py-8 sm:py-12"
    >
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">개인정보 동의</h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          Speech-Therapy 는 발달 가이드용 보조 도구로, 만 14세 미만 자녀의 개인정보를
          처리하고 외부 AI 서비스 (Google Cloud Speech / Gemini, 미국) 와 연동해요.
          관련 동의를 부모님께서 직접 확인해 주세요.
        </p>
      </header>

      <section
        aria-label="현재 동의 상태"
        data-testid="privacy-consent-status"
        className="mb-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
          현재 동의 상태
        </h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">
              만 14세 미만 자녀 정보 처리 (PIPA §22-6)
            </dt>
            <dd
              data-testid="privacy-consent-pipa-at"
              className={`mt-1 font-medium ${
                pipaAt
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {formatDateKr(pipaAt)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">
              국외 이전 (Google Cloud Speech / Gemini, 미국, PIPA §17)
            </dt>
            <dd
              data-testid="privacy-consent-overseas-at"
              className={`mt-1 font-medium ${
                overseasAt
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {formatDateKr(overseasAt)}
            </dd>
          </div>
        </dl>
        {!bothConsented ? (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            ⚠️ 두 동의 모두 완료되어야 자녀 진단 기능을 정상 이용하실 수 있어요.
          </p>
        ) : null}
      </section>

      <PrivacyConsentForm
        initialPipaConsented={pipaAt !== null}
        initialOverseasConsented={overseasAt !== null}
      />

      <section className="mt-8 space-y-3 text-sm text-slate-500 dark:text-slate-500">
        {!bothConsented ? (
          <p
            className="text-slate-600 dark:text-slate-400"
            data-testid="privacy-consent-skip-section"
          >
            <Link
              href="/"
              data-testid="privacy-consent-skip-link"
              className="underline hover:no-underline"
            >
              나중에 결정할게요 (홈으로 이동)
            </Link>
            <span className="ml-2 text-xs text-slate-500">
              — 자녀 진단 / 미션 / 리포트는 동의 후에만 이용 가능
            </span>
          </p>
        ) : null}
        <p>
          자세한 내용은{" "}
          <Link href="/privacy" className="underline hover:no-underline">
            개인정보 처리방침
          </Link>{" "}
          및{" "}
          <Link href="/terms" className="underline hover:no-underline">
            이용약관
          </Link>{" "}
          을 참고해 주세요.
        </p>
        <p>
          <Link
            href="/settings"
            data-testid="privacy-consent-back-link"
            className="underline hover:no-underline"
          >
            ← 설정 메뉴로 돌아가기
          </Link>
        </p>
      </section>
    </main>
  );
}
