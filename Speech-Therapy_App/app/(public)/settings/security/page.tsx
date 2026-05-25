// FR-C-SECURITY — /settings/security 보안 / 2단계 인증 페이지 (Server Component).
//
// 책임:
//   1) Supabase auth 확인 — 비로그인 시 /login?next=/settings/security redirect.
//   2) auth.mfa.listFactors() 호출 → verified TOTP factor 존재 여부 확인.
//   3) 분기 렌더:
//      - 미등록 → <EnrollTotpFlow /> (QR + 코드 검증)
//      - 등록됨 → <DisableTotpFlow /> (재인증 후 비활성화)
//
// RBAC (R4):
//   - 외부 URL param 미사용 — auth.uid 만 사용.
//   - listFactors 응답은 Supabase 가 본인 세션 기반으로만 반환 (cross-read 0건).
//
// graceful:
//   - Supabase env 미설정 / 일시 장애 → 비로그인 처리 후 redirect.
//   - listFactors 실패 → 미등록으로 보수적 처리 (활성화 가능 상태 노출).
//
// CON-04: 본 페이지의 모든 카피 / metadata / 카드 라벨에 "치료/진단/장애" 금칙어 0건.
//
// 디자인:
//   - 부모/운영자 인터랙션 — 명확한 보안 안내 + 단호한 비활성화 경고.

import { redirect } from "next/navigation";

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EnrollTotpFlow } from "@/components/security/EnrollTotpFlow";
import { DisableTotpFlow } from "@/components/security/DisableTotpFlow";

export const metadata = {
  title: "보안 설정 — Speech-Therapy",
  description:
    "2단계 인증 (TOTP) 을 활성화해 계정 보안을 강화할 수 있어요.",
};

// auth 결과는 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

/**
 * verified TOTP factor 존재 여부를 조회. 실패 시 보수적으로 false 반환
 * (사용자가 다시 활성화 시도 가능 — Supabase 가 중복 enroll 거부 시 알림).
 */
async function hasVerifiedTotpFactor(): Promise<boolean> {
  try {
    const supabase = await getSupabaseServerClient();
    const listResp = await supabase.auth.mfa.listFactors();
    if (listResp.error || !listResp.data) return false;
    const totpList =
      (listResp.data as { totp?: Array<{ status?: string }> } | null)?.totp ??
      [];
    return totpList.some((f) => f?.status === "verified");
  } catch (err) {
    console.warn(
      "[settings/security] listFactors 실패 — graceful 처리",
      err instanceof Error ? err.message : "unknown",
    );
    return false;
  }
}

export default async function SettingsSecurityPage() {
  // 1) auth — 비로그인 시 login 으로 next return.
  const user = await getCachedUser();
  if (!user) {
    redirect("/login?next=/settings/security");
  }

  // 2) TOTP factor 등록 여부 조회.
  const enrolled = await hasVerifiedTotpFactor();

  return (
    <main
      data-testid="settings-security-page"
      className="mx-auto max-w-3xl px-4 py-8 sm:py-12"
    >
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">
          보안 설정 — 2단계 인증
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          비밀번호 외에도 인증 앱의 6자리 코드를 함께 사용해 계정 보안을 강화할
          수 있어요.
        </p>
      </header>

      <section className="space-y-6">
        {enrolled ? (
          // ---- 등록됨 → 비활성화 카드 ----
          <article
            data-testid="settings-security-disable-card"
            aria-labelledby="settings-security-disable-heading"
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <h2
              id="settings-security-disable-heading"
              className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              2단계 인증 관리
            </h2>
            <DisableTotpFlow />
          </article>
        ) : (
          // ---- 미등록 → 활성화 카드 ----
          <article
            data-testid="settings-security-enroll-card"
            aria-labelledby="settings-security-enroll-heading"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30"
          >
            <h2
              id="settings-security-enroll-heading"
              className="mb-4 text-lg font-semibold text-emerald-900 dark:text-emerald-100"
            >
              2단계 인증 활성화
            </h2>
            <EnrollTotpFlow />
          </article>
        )}
      </section>
    </main>
  );
}
