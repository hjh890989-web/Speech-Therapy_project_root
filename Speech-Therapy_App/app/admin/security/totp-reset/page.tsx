// FR-2FA-RECOVERY — /admin/security/totp-reset 페이지 (Server Component).
//
// 책임:
//   1) Supabase auth + Prisma role 확인 — admin 외 모두 차단 (L2 가드).
//   2) URL ?email=<target> 미리 채우기 (운영 워크플로: 사용자 이메일을 link 로 전달받는 경우).
//   3) AdminTotpResetForm (Client Component) 마운트 — 본 페이지는 RBAC + 안내 카피만.
//
// 접근 제어 계층:
//   - L1: proxy.ts 가 /admin RBAC 1차 통과 (admin/principal/expert/teacher).
//   - L2: 본 페이지가 admin 외 role 모두 403 차단 (totp reset 은 admin only operation).
//
// R4 (자녀 식별 정보 보호):
//   - 본 페이지는 target email 을 form 입력으로만 받음 — server-side 조회 결과 (User row)
//     는 Server Action 안에서만 사용.
//
// CON-04 (의료 금칙어): 화면 카피 "치료/진단/장애" 사용 금지.
//
// 운영 정책:
//   - 본 페이지에 진입한 admin 의 모든 reset 호출은 audit_log (actor 캡처) + Slack alert
//     (totp_disabled critical action) 발송 → 운영팀이 분 단위 감지.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCachedUserRoleResult } from "@/lib/auth/cached-get-user";
import { AdminTotpResetForm } from "@/components/security/AdminTotpResetForm";

export const metadata = {
  title: "2단계 인증 초기화 (운영자) — Speech-Therapy",
  description:
    "관리자 전용 — 사용자의 2단계 인증을 초기화해 lockout 을 복구합니다.",
};

// auth 결과는 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

/// 본 페이지 진입 허용 role — admin 만.
const PAGE_ALLOWED_ROLE = "admin";

/**
 * URL search param sanitize — email 형식 1차 검증.
 *
 * 형식 부적합 시 undefined (form 빈 채로 노출).
 */
function sanitizeEmailParam(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return undefined;
  // 단순 email 형식 1차 검증 (Server Action 이 Zod 로 final 검증).
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return undefined;
  return trimmed;
}

interface PageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function AdminTotpResetPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const prefilledTargetEmail = sanitizeEmailParam(params.email);

  // L2 가드 — admin only.
  const ctx = await getCachedUserRoleResult();

  if (ctx.status === "anonymous") {
    redirect("/login?next=/admin/security/totp-reset");
  }

  if (ctx.status === "error" || ctx.role !== PAGE_ALLOWED_ROLE) {
    return (
      <main
        data-testid="admin-totp-reset-forbidden"
        className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
        role="alert"
        aria-live="polite"
      >
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-semibold">
            2단계 인증 초기화 페이지 접근 권한이 없어요
          </h1>
          <p className="mt-2 text-sm">
            본 페이지는 관리자(admin) 전용이에요. 권한이 필요하시면 운영팀에 요청해 주세요.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      data-testid="admin-totp-reset-page"
      className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12"
      aria-labelledby="admin-totp-reset-heading"
    >
      <header className="mb-8 space-y-2">
        <h1
          id="admin-totp-reset-heading"
          className="text-2xl font-bold sm:text-3xl"
        >
          2단계 인증 초기화 (운영자)
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          사용자가 인증 앱을 분실하고 백업 코드를 모두 소진한 lockout 상황을 운영팀이
          복구하는 용도예요. 본 작업은 비가역이며 모든 호출은 감사 로그에 기록돼요.
        </p>
      </header>

      <section
        aria-labelledby="admin-totp-reset-form-heading"
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <h2
          id="admin-totp-reset-form-heading"
          className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          대상 사용자 정보
        </h2>
        <AdminTotpResetForm
          prefilledTargetEmail={prefilledTargetEmail ?? ""}
        />
      </section>

      <footer
        aria-label="안내"
        className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
      >
        <p className="mb-1 font-semibold text-slate-800 dark:text-slate-200">운영 정책</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>본 페이지는 관리자(admin) 전용 — 다른 역할 접근 차단.</li>
          <li>호출 1건마다 audit_log 에 actor (caller admin) 가 기록돼요.</li>
          <li>호출 직후 운영 채널 (Slack — AUDIT_SLACK_WEBHOOK_URL) 로 즉시 알림 발송.</li>
          <li>
            사용자에게는 작업 완료 후 별도 안내 (이메일/메신저) 가 필요해요 — 본 작업은 자동
            알림을 발송하지 않아요.
          </li>
        </ul>
      </footer>
    </main>
  );
}
