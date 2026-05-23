// FR-Q-009 / FR-C-005 — 부모 초대 link 진입 페이지 (Server Component).
//
// 책임:
//   1) ?token=... query param 추출 (Next.js 16 — searchParams 는 Promise)
//   2) verifyParentInviteToken 으로 만료/위조 검증 (graceful — null 시 안내)
//   3) 통과 시 ParentSignupForm 렌더 (token + parentEmail prefill)
//
// 접근 제어:
//   - 본 page 는 _초대 수신자 본인_ 만 의도 — token 이 부모 이메일 본인 신원 (R4).
//   - proxy.ts 의 /admin RBAC 와 무관 — public 경로. token 자체가 capability.
//
// 정책:
//   - dynamic = "force-dynamic" — searchParams 항상 fresh.
//   - 금칙어 ("치료/진단/장애") 사용 금지.
//   - 본 페이지는 의료 disclaimer 미표시 — 가입 form 안에서 안내.

import { verifyParentInviteToken } from "@/lib/auth/parent-invite";
import { ParentSignupForm } from "@/components/ParentSignupForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "부모 가입 — Speech-Therapy",
  description:
    "기관(어린이집/유치원) 에서 받은 초대 메일을 통해 부모 계정을 만들 수 있어요. 자녀의 발음 발달 확인을 시작해 보세요.",
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ParentSignupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  // token 부재 → 잘못된 진입 안내.
  if (!token) {
    return (
      <main
        data-testid="parent-signup-no-token"
        className="mx-auto w-full max-w-md px-4 py-12"
        aria-labelledby="no-token-heading"
      >
        <h1 id="no-token-heading" className="text-2xl font-bold text-slate-900">
          초대 링크가 필요해요
        </h1>
        <p className="mt-3 text-sm text-slate-700">
          기관(어린이집/유치원) 담당자로부터 받은 초대 메일의 링크를 사용해 주세요.
          링크 안에 가입에 필요한 토큰이 포함되어 있어요.
        </p>
      </main>
    );
  }

  // token 검증 — 만료 / 위조 graceful null.
  const payload = await verifyParentInviteToken(token);
  if (!payload) {
    return (
      <main
        data-testid="parent-signup-invalid-token"
        className="mx-auto w-full max-w-md px-4 py-12"
        aria-labelledby="invalid-token-heading"
      >
        <h1
          id="invalid-token-heading"
          className="text-2xl font-bold text-slate-900"
        >
          초대 링크가 만료되었어요
        </h1>
        <p className="mt-3 text-sm text-slate-700">
          초대 메일의 유효 기간이 지났거나 링크가 손상되었어요. 기관 담당자에게
          새 초대 메일을 요청해 주세요.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          초대 링크는 발송 후 7일간 유효해요.
        </p>
      </main>
    );
  }

  return (
    <main
      data-testid="parent-signup-page"
      className="mx-auto w-full max-w-md px-4 py-10"
      aria-labelledby="parent-signup-heading"
    >
      <header className="mb-6">
        <h1
          id="parent-signup-heading"
          className="text-2xl font-bold text-slate-900"
        >
          부모 계정 만들기
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          초대 메일로 받은 정보로 가입을 마무리해 주세요. 가입 후 자녀의 발음
          발달 현황을 확인할 수 있어요.
        </p>
      </header>

      <ParentSignupForm token={token} prefillEmail={payload.parentEmail} />

      <p className="mt-6 text-xs text-slate-500">
        본 서비스는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다. 발음
        발달 가이드를 제공하며 의료적 판단은 제공하지 않습니다.
      </p>
    </main>
  );
}
