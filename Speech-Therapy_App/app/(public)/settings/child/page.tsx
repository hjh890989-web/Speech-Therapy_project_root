// FR-C-PARENT-SETTINGS — 부모용 자녀 프로필 설정 페이지 (Server Component).
//
// 책임:
//   1) Supabase auth 확인 — 비로그인 시 /login?next=/settings/child redirect.
//   2) User row fetch (본인 only — childAgeMonths + preferredPhonemes 만 select).
//   3) <ChildProfileForm initial...> Client Component 렌더 — 폼 자체는 Client.
//
// RBAC (R4):
//   - 외부 URL param 으로 user id 입력 받지 않음 — auth.uid 만 사용.
//   - cross-read 0건 (다른 user row 조회 X).
//
// graceful:
//   - DB findUnique 실패 → prefill 0 으로 폼은 정상 렌더 (default 값으로 진행).
//   - Supabase env 미설정 / 일시 장애 → 비로그인 처리 후 redirect.
//
// CON-04: 본 페이지의 모든 카피 / 주석 / metadata 에 "치료/진단/장애" 금칙어 0건.
//
// 동선 (cross-link):
//   - /settings/calibration 페이지에 본 페이지 안내 추가는 후속 PR (nav 통합과 함께).
//   - 본 PR 은 standalone 페이지만 — 사용자가 URL 직접 입력 또는 외부 cross-link 로 접근.

import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ChildProfileForm } from "@/components/settings/ChildProfileForm";

export const metadata = {
  title: "자녀 정보 설정 — Speech-Therapy",
  description:
    "자녀의 월령과 관심 음소를 언제든 변경할 수 있어요. 설정은 발음 발달 확인과 미션 추천에 반영됩니다.",
};

// auth 결과는 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

interface UserPrefill {
  childAgeMonths: number | null;
  preferredPhonemes: string[];
}

async function loadUserPrefill(userId: string): Promise<UserPrefill> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        childAgeMonths: true,
        preferredPhonemes: true,
      },
    });
    return {
      childAgeMonths: row?.childAgeMonths ?? null,
      preferredPhonemes: row?.preferredPhonemes ?? [],
    };
  } catch (err) {
    // graceful — DB 일시 장애 시 default 로 진행. console.error 만.
    console.error("settings/child: user prefill fetch failed", err);
    return { childAgeMonths: null, preferredPhonemes: [] };
  }
}

export default async function SettingsChildPage() {
  // 1) auth — 비로그인 시 login 으로 next return.
  let userId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // env 미설정 / 네트워크 — 보수적으로 login redirect.
    userId = null;
  }
  if (!userId) {
    redirect("/login?next=/settings/child");
  }

  // 2) prefill.
  const prefill = await loadUserPrefill(userId);

  return (
    <main
      data-testid="settings-child-page"
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
    >
      <p
        data-testid="settings-child-disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 설정은 발음 가이드의 안내 정확도를 높이기 위한 보조 정보예요. 의료적 평가 목적이 아닙니다.
      </p>

      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">자녀 정보 설정</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          자녀의 월령과 관심 음소는 언제든 바꿀 수 있어요. 변경한 정보는 다음 발음 확인과 미션 추천에 바로 반영됩니다.
        </p>
      </header>

      <ChildProfileForm
        initialChildAgeMonths={prefill.childAgeMonths}
        initialPreferredPhonemes={prefill.preferredPhonemes}
      />

      <nav className="mt-10 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
        <Link
          href="/settings/calibration"
          data-testid="settings-child-nav-calibration"
          className="underline hover:text-gray-900 dark:hover:text-gray-100"
        >
          환경 소음 보정으로 이동
        </Link>
        <Link
          href="/missions"
          data-testid="settings-child-nav-missions"
          className="underline hover:text-gray-900 dark:hover:text-gray-100"
        >
          오늘의 미션 보기
        </Link>
      </nav>
    </main>
  );
}
