// FR-CONSENT-REMINDER-UI — /settings/consent 부모 self-service 동의서 관리 페이지.
// Server Component.
//
// 책임:
//   1) Supabase auth 확인 — 비로그인 시 /login?next=/settings/consent redirect.
//   2) 본인 (parentEmail == user.email) 의 status='pending' ConsentSignature 목록 fetch.
//      - cross-read 0건 (R4) — 다른 부모 row 절대 노출 X.
//   3) 각 row 별 카드 렌더:
//      - 자녀 닉네임 + 동의서 종류
//      - 발송 일시 / 마지막 리마인더 / 만료 예정 (sentAt + 7일)
//      - <ConsentResendButton consentSignatureId={row.id} /> 재발송 트리거
//   4) 0건일 때 — empty state ("서명이 필요한 동의서가 없어요").
//   5) /settings 인덱스 복귀 링크.
//
// RBAC (R4):
//   - 외부 URL param 으로 parentEmail / token 입력 받지 않음.
//   - parentEmail 매칭은 auth.getUser 의 email 만 사용.
//
// graceful:
//   - user.email null → empty state 노출 (매칭 불가 — 빈 목록과 동일 UX).
//   - prisma 실패 → "조회에 실패했어요" 안내 + 인덱스 복귀 링크.
//
// CON-04: 본 페이지의 모든 카피 / metadata / 라벨에 "치료/진단/장애" 금칙어 0건.
//   "동의서" / "발달 가이드" / "발음 발달 확인" 만 사용.
//
// dca2aee 연결: MainNav consent badge → /settings (지금) → 본 페이지의 SettingsCard 클릭으로 진입.
//   추후 badge target 을 본 페이지로 변경 검토 (현재 PR 범위 외 — applyBadgeCounts 가 role 단위
//   분기 없는 pure decorator 라 변경 시 cross-role 영향 우려).

import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCachedUser } from "@/lib/auth/cached-get-user";
import { CONSENT_EXPIRE_DAYS } from "@/lib/consent/repo";
import { ConsentResendButton } from "@/components/settings/ConsentResendButton";

export const metadata = {
  title: "동의서 관리 — Speech-Therapy",
  description:
    "내 자녀의 동의서 중 아직 서명되지 않은 항목을 확인하고, 안내 메일을 다시 받을 수 있어요.",
};

// auth 결과 + 실시간 pending 상태 — 정적 캐시 차단.
export const dynamic = "force-dynamic";

interface PendingConsentRow {
  id: string;
  childNickname: string;
  consentType: string;
  sentAt: Date;
  remindedAt: Date | null;
  expiresAt: Date;
}

/** 'data_usage' → '데이터 활용' 등 한국어 라벨 매핑 (CON-04 안전). */
function consentTypeLabel(type: string): string {
  if (type === "data_usage") return "데이터 활용";
  return type;
}

/** Date → 'YYYY년 M월 D일' 한국식 포맷. fallback 안전. */
function formatDateKr(d: Date | null): string {
  if (!d) return "—";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}년 ${m}월 ${day}일`;
}

async function loadPendingConsents(
  email: string,
): Promise<{ ok: true; rows: PendingConsentRow[] } | { ok: false }> {
  try {
    const rows = await prisma.consentSignature.findMany({
      where: { parentEmail: email, status: "pending" },
      orderBy: { sentAt: "desc" },
      select: {
        id: true,
        childNickname: true,
        consentType: true,
        sentAt: true,
        remindedAt: true,
      },
    });
    const mapped: PendingConsentRow[] = rows.map((r) => ({
      id: r.id,
      childNickname: r.childNickname,
      consentType: r.consentType,
      sentAt: r.sentAt,
      remindedAt: r.remindedAt,
      expiresAt: new Date(
        r.sentAt.getTime() + CONSENT_EXPIRE_DAYS * 24 * 60 * 60 * 1000,
      ),
    }));
    return { ok: true, rows: mapped };
  } catch (err) {
    console.error("[settings/consent] findMany 실패", err);
    return { ok: false };
  }
}

export default async function SettingsConsentPage() {
  // 1) auth — 비로그인 시 login 으로 next return.
  const user = await getCachedUser();
  if (!user) {
    redirect("/login?next=/settings/consent");
  }

  // 2) email 부재 → empty 와 동일 UX (cross-read 차단 가드).
  const email = user.email;

  // 3) 본인 pending 목록 fetch.
  const result = email
    ? await loadPendingConsents(email)
    : ({ ok: true as const, rows: [] as PendingConsentRow[] });

  return (
    <main
      data-testid="settings-consent-page"
      className="mx-auto max-w-3xl px-4 py-8 sm:py-12"
    >
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">동의서 관리</h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          내 자녀의 동의서 중 아직 서명되지 않은 항목을 확인하고, 안내 메일을 다시 받을 수 있어요.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500">
          Speech-Therapy 는 의료 서비스가 아닌 발달 가이드용 보조 도구입니다.
        </p>
      </header>

      {!result.ok ? (
        <section
          data-testid="settings-consent-error"
          className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          <p className="mb-3 font-medium">
            동의서 목록 조회에 실패했어요. 잠시 후 다시 시도해 주세요.
          </p>
          <Link
            href="/settings"
            data-testid="settings-consent-back-link-error"
            className="underline hover:no-underline"
          >
            ← 설정 메뉴로 돌아가기
          </Link>
        </section>
      ) : result.rows.length === 0 ? (
        <section
          data-testid="settings-consent-empty"
          aria-label="서명이 필요한 동의서 없음"
          className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            서명이 필요한 동의서가 없어요
          </p>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            새 동의서가 도착하면 이 화면에서 다시 보내기 버튼을 사용할 수 있어요.
          </p>
          <Link
            href="/settings"
            data-testid="settings-consent-back-link"
            className="inline-flex min-h-[40px] items-center rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            ← 설정 메뉴로 돌아가기
          </Link>
        </section>
      ) : (
        <section
          aria-label="서명 대기 동의서 목록"
          className="space-y-4"
          data-testid="settings-consent-list"
        >
          {result.rows.map((row) => (
            <article
              key={row.id}
              data-testid="settings-consent-row"
              data-consent-id={row.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <header className="mb-4 flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  <span data-testid="settings-consent-child">
                    {row.childNickname}
                  </span>
                  <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                    {consentTypeLabel(row.consentType)} 동의서
                  </span>
                </h2>
              </header>

              <dl className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    최초 발송
                  </dt>
                  <dd
                    data-testid="settings-consent-sent-at"
                    className="mt-1 font-medium text-slate-900 dark:text-slate-100"
                  >
                    {formatDateKr(row.sentAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    마지막 안내
                  </dt>
                  <dd
                    data-testid="settings-consent-reminded-at"
                    className="mt-1 font-medium text-slate-900 dark:text-slate-100"
                  >
                    {row.remindedAt ? formatDateKr(row.remindedAt) : "안내 전"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    서명 마감
                  </dt>
                  <dd
                    data-testid="settings-consent-expires-at"
                    className="mt-1 font-medium text-amber-700 dark:text-amber-400"
                  >
                    {formatDateKr(row.expiresAt)}
                  </dd>
                </div>
              </dl>

              <ConsentResendButton consentSignatureId={row.id} />
            </article>
          ))}

          <div className="pt-2">
            <Link
              href="/settings"
              data-testid="settings-consent-back-link-bottom"
              className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              ← 설정 메뉴로 돌아가기
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
