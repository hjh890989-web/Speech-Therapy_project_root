// FR-C-SECURITY (MFA 마무리) — 로그인 시 MFA challenge 페이지 (Server Component).
//
// 책임:
//   1) Supabase auth 확인 — AAL1 세션 필수 (비로그인 → /login?next=...).
//   2) auth.mfa.getAuthenticatorAssuranceLevel() 확인:
//      - currentLevel === "aal2" → 이미 AAL2 (next 로 redirect).
//      - nextLevel !== "aal2" → MFA 미등록 사용자 (next 로 redirect — challenge 불필요).
//      - nextLevel === "aal2" && currentLevel === "aal1" → challenge 필요 (form 렌더).
//   3) auth.mfa.listFactors() → verified TOTP factor 추출 → MfaChallengeForm 에 factorId 전달.
//      - verified factor 부재 시 (등록 없음) → next 로 redirect.
//   4) <MfaChallengeForm factorId={...} next={next}> 렌더.
//
// RBAC (R4):
//   - 외부 user id 입력 미사용 — auth.uid + Supabase MFA session 만.
//   - next 는 search param 으로 받지만 internal path (시작 "/") 만 허용 (open redirect 차단).
//
// 무한 redirect 방지:
//   - 본 페이지 자체는 proxy.ts 의 AAL2 강제 분기 _대상이 아님_ (path exclusion).
//     본 PR 은 proxy 에 AAL2 강제 미적용 — admin path AAL2 강제는 후속 PR.
//
// CON-04: 모든 카피 / metadata 에 "치료/진단/장애" 금칙어 0건.
//
// 디자인: /settings/security 와 비슷한 톤 (emerald + slate) — 진단 페이지와 분리.

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { MfaChallengeForm } from "@/components/auth/MfaChallengeForm";

export const metadata = {
  title: "2단계 인증 — Speech-Therapy",
  description:
    "로그인을 완료하려면 인증 앱의 6자리 코드를 입력해 주세요.",
};

// auth + MFA 상태는 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

/** next URL sanitize — internal path 만 허용 (open redirect 방어). */
function sanitizeNext(raw: string | null | undefined): string {
  if (typeof raw !== "string" || raw.length === 0) return "/";
  if (!raw.startsWith("/")) return "/";
  // protocol-relative URL ("//evil.com") 차단.
  if (raw.startsWith("//")) return "/";
  return raw;
}

interface MfaChallengePageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function MfaChallengePage({
  searchParams,
}: MfaChallengePageProps) {
  const { next: rawNext } = await searchParams;
  const next = sanitizeNext(rawNext);

  let supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  try {
    supabase = await getSupabaseServerClient();
  } catch {
    // env 미설정 — 비로그인 처리.
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // 1) auth — 비로그인 차단.
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // 2) AAL 확인 — 이미 AAL2 또는 미등록 사용자는 next 로 통과.
  try {
    const aalResp = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const currentLevel =
      (aalResp.data as { currentLevel?: string } | null)?.currentLevel ?? null;
    const nextLevel =
      (aalResp.data as { nextLevel?: string } | null)?.nextLevel ?? null;
    // 이미 AAL2 세션 — challenge 불필요.
    if (currentLevel === "aal2") {
      redirect(next);
    }
    // 사용자가 MFA 미등록 (nextLevel !== 'aal2') — challenge 불필요.
    if (nextLevel !== "aal2") {
      redirect(next);
    }
  } catch (err) {
    // aalResp 실패 — 보수적으로 next 로 통과 (challenge 강제하지 않음 — 회귀 0건).
    // 본 PR 정책: AAL 정보 없으면 사용자 흐름 막지 않음. 후속 PR 에서 strict 모드 옵션 검토.
    console.warn(
      "[mfa-challenge] getAuthenticatorAssuranceLevel 실패 — graceful",
      err instanceof Error ? err.message : "unknown",
    );
    redirect(next);
  }

  // 3) verified TOTP factor 추출.
  let factorId = "";
  try {
    const listResp = await supabase.auth.mfa.listFactors();
    const totpList =
      (listResp.data as { totp?: Array<{ id?: string; status?: string }> } | null)
        ?.totp ?? [];
    const verified = totpList.find((f) => f?.status === "verified" && f?.id);
    if (!verified || !verified.id) {
      // factor 없음 — 등록 안 된 사용자. challenge 불필요.
      redirect(next);
    }
    factorId = verified.id;
  } catch (err) {
    console.warn(
      "[mfa-challenge] listFactors 실패 — graceful",
      err instanceof Error ? err.message : "unknown",
    );
    redirect(next);
  }

  // 4) challenge 폼 렌더.
  return (
    <main
      data-testid="mfa-challenge-page"
      className="mx-auto max-w-md px-4 py-8 sm:py-12"
    >
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">2단계 인증</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          비밀번호 외에도 인증 앱의 6자리 코드를 입력하셔야 로그인이 완료돼요.
        </p>
      </header>

      <section
        data-testid="mfa-challenge-card"
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <MfaChallengeForm factorId={factorId} next={next} />
      </section>
    </main>
  );
}
