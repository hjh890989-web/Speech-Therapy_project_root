// FR-C-ACCOUNT — 계정 정보 + GDPR 데이터 다운로드 / 계정 삭제 / 이메일 변경 / 비밀번호 재설정 페이지.
// Server Component.
//
// 책임:
//   1) Supabase auth 확인 — 비로그인 시 /login?next=/settings/account redirect.
//   2) User row fetch (본인 only — email / role / createdAt / institutionId 표시용).
//   3) 5 카드 렌더:
//      - 카드 1: 기본 정보 (이메일 / 가입일 / 역할)
//      - 카드 2: 데이터 다운로드 안내 + <DataExportButton /> Client Component
//      - 카드 3: 이메일 변경 + <EmailChangeForm /> Client Component (Supabase confirmation flow)
//      - 카드 4: 비밀번호 재설정 + <RequestPasswordResetButton /> Client Component
//      - 카드 5: 계정 삭제 경고 (비가역) + <AccountDeleteButton /> Client Component
//
// RBAC (R4):
//   - 외부 URL param 으로 user id 입력 받지 않음 — auth.uid 만 사용.
//   - cross-read 0건 (본인 row 외 조회 X).
//   - 이메일 변경 / 비밀번호 재설정 모두 Supabase 본인 세션 기반 — cross-write 0건.
//
// graceful:
//   - DB findUnique 실패 → 기본 정보는 "정보 없음" 으로 표시 + 카드 2/3/4/5 는 정상 렌더.
//   - Supabase env 미설정 / 일시 장애 → 비로그인 처리 후 redirect.
//
// CON-04: 본 페이지의 모든 카피 / metadata / 카드 라벨에 "치료/진단/장애" 금칙어 0건.
//
// 부모/관리자 인터랙션 — 자녀 친화 카피 불필요, 명확 + 단호 (계정 삭제 경고 / 보안 안내).

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCachedUser } from "@/lib/auth/cached-get-user";
import { DataExportButton } from "@/components/settings/DataExportButton";
import { AccountDeleteButton } from "@/components/settings/AccountDeleteButton";
import { EmailChangeForm } from "@/components/settings/EmailChangeForm";
import { RequestPasswordResetButton } from "@/components/settings/RequestPasswordResetButton";

export const metadata = {
  title: "계정 정보 — Speech-Therapy",
  description:
    "내 계정 정보를 확인하고, 본인 데이터 전체를 JSON 으로 다운로드하거나 계정을 삭제할 수 있어요.",
};

// auth 결과는 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

interface AccountInfo {
  email: string | null;
  role: string | null;
  createdAt: Date | null;
  institutionId: string | null;
}

/** Role enum → 한국어 라벨 (CON-04 금칙어 0건). */
function roleLabel(role: string | null): string {
  switch (role) {
    case "parent":
      return "부모";
    case "teacher":
      return "선생님";
    case "principal":
      return "원장";
    case "expert":
      return "전문가";
    case "admin":
      return "관리자";
    default:
      return "정보 없음";
  }
}

/** Date → 한국식 YYYY년 M월 D일. */
function formatDateKr(d: Date | null): string {
  if (!d) return "정보 없음";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}년 ${m}월 ${day}일`;
}

async function loadAccountInfo(userId: string): Promise<AccountInfo> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        role: true,
        createdAt: true,
        institutionId: true,
      },
    });
    return {
      email: row?.email ?? null,
      role: row?.role ?? null,
      createdAt: row?.createdAt ?? null,
      institutionId: row?.institutionId ?? null,
    };
  } catch (err) {
    console.error("settings/account: user info fetch failed", err);
    return {
      email: null,
      role: null,
      createdAt: null,
      institutionId: null,
    };
  }
}

export default async function SettingsAccountPage() {
  // 1) auth — 비로그인 시 login 으로 next return.
  // Performance: getCachedUser (React cache()) — layout 의 AuthHeader/MainNav 와 dedup.
  const user = await getCachedUser();
  if (!user) {
    redirect("/login?next=/settings/account");
  }
  const userId = user.id;

  // 2) account info.
  const info = await loadAccountInfo(userId);

  return (
    <main
      data-testid="settings-account-page"
      className="mx-auto max-w-3xl px-4 py-8 sm:py-12"
    >
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">계정 정보</h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          내 계정 정보를 확인하고, 본인 데이터를 다운로드하거나 계정을 삭제할 수 있어요.
        </p>
      </header>

      <section className="space-y-6">
        {/* ---- 카드 1: 기본 정보 ---- */}
        <article
          data-testid="settings-account-info-card"
          aria-labelledby="settings-account-info-heading"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h2
            id="settings-account-info-heading"
            className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            기본 정보
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">이메일</dt>
              <dd
                data-testid="settings-account-email"
                className="mt-1 break-all font-medium text-slate-900 dark:text-slate-100"
              >
                {info.email ?? "정보 없음"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">가입일</dt>
              <dd
                data-testid="settings-account-created-at"
                className="mt-1 font-medium text-slate-900 dark:text-slate-100"
              >
                {formatDateKr(info.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">역할</dt>
              <dd
                data-testid="settings-account-role"
                className="mt-1 font-medium text-slate-900 dark:text-slate-100"
              >
                {roleLabel(info.role)}
              </dd>
            </div>
          </dl>
        </article>

        {/* ---- 카드 2: 데이터 다운로드 ---- */}
        <article
          data-testid="settings-account-export-card"
          aria-labelledby="settings-account-export-heading"
          className="rounded-lg border border-sky-200 bg-sky-50 p-6 dark:border-sky-800 dark:bg-sky-950/30"
        >
          <h2
            id="settings-account-export-heading"
            className="mb-3 text-lg font-semibold text-sky-900 dark:text-sky-100"
          >
            내 데이터 다운로드
          </h2>
          <p className="mb-4 text-sm text-sky-900 dark:text-sky-100">
            본인 계정에 저장된 데이터 전체를 JSON 형식으로 내려받을 수 있어요. 발음 확인 기록, 미션 활동, 보상 이력, 주간 리포트 등이 포함됩니다.
          </p>
          <DataExportButton userId={userId} />
        </article>

        {/* ---- 카드 3: 이메일 변경 (Supabase confirmation flow) ---- */}
        <article
          data-testid="settings-account-email-card"
          aria-labelledby="settings-account-email-heading"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30"
        >
          <h2
            id="settings-account-email-heading"
            className="mb-3 text-lg font-semibold text-emerald-900 dark:text-emerald-100"
          >
            이메일 변경
          </h2>
          <p className="mb-4 text-sm text-emerald-900 dark:text-emerald-100">
            계정 이메일을 변경하려면 새 이메일 주소를 입력해 주세요. 새 이메일로 확인 메일이 발송되며, 메일의 링크를 클릭해야 변경이 완료됩니다.
          </p>
          <EmailChangeForm currentEmail={info.email} />
        </article>

        {/* ---- 카드 4: 비밀번호 재설정 (메일 발송 → /auth/reset-password) ---- */}
        <article
          data-testid="settings-account-password-card"
          aria-labelledby="settings-account-password-heading"
          className="rounded-lg border border-indigo-200 bg-indigo-50 p-6 dark:border-indigo-800 dark:bg-indigo-950/30"
        >
          <h2
            id="settings-account-password-heading"
            className="mb-3 text-lg font-semibold text-indigo-900 dark:text-indigo-100"
          >
            비밀번호 재설정
          </h2>
          <p className="mb-4 text-sm text-indigo-900 dark:text-indigo-100">
            현재 이메일 주소로 비밀번호 재설정 메일을 보내드려요. 메일의 링크를 클릭하면 새 비밀번호를 설정할 수 있어요.
          </p>
          <RequestPasswordResetButton />
        </article>

        {/* ---- 카드 5: 계정 삭제 (위험 강조) ---- */}
        <article
          data-testid="settings-account-delete-card"
          aria-labelledby="settings-account-delete-heading"
          className="rounded-lg border-2 border-rose-300 bg-rose-50 p-6 dark:border-rose-700 dark:bg-rose-950/30"
        >
          <h2
            id="settings-account-delete-heading"
            className="mb-3 text-lg font-semibold text-rose-900 dark:text-rose-100"
          >
            계정 삭제 (되돌릴 수 없음)
          </h2>
          <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-rose-900 dark:text-rose-100">
            <li>계정과 함께 저장된 모든 자녀 발음 기록 / 미션 / 보상 이력이 삭제됩니다.</li>
            <li>삭제된 데이터는 복구할 수 없어요.</li>
            <li>삭제 후에는 같은 이메일로 다시 가입하셔야 서비스를 이용할 수 있어요.</li>
          </ul>
          <AccountDeleteButton />
        </article>
      </section>
    </main>
  );
}
