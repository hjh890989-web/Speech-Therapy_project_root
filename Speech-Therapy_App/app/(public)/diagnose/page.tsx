// FR-Q-001 — 무로그인 5분 발음 확인 SSR 페이지 (Server Component).
// REQ-FUNC-008~010, REQ-NF-003. Disclaimer 페이지 상단+하단 노출.
// CON-04 UI 카피 금칙어 0건: "발음 확인 / 발달 단계 / 부모 안내" 등 비의료 표현 사용.
//
// 5/27 prefill 추가 (Grill #3A 후속):
//   - 인증 user 의 User.childAgeMonths + User.preferredPhonemes 를 1 query 로 fetch.
//   - DiagnosisForm 에 prefill props 로 전달 → onboarding Step2 입력값 자동 반영.
//   - 익명 user 또는 graceful 실패 시 기본값 (36개월 / ㅅ) — DiagnosisForm 내부 useState 가 처리.

import { prisma } from "@/lib/db";
import { getCachedUser } from "@/lib/auth/cached-get-user";
import { DiagnosisForm } from "./DiagnosisForm";

export const metadata = {
  title: "5분 발음 확인 — Speech-Therapy",
  description:
    "회원가입 없이 5분 안에 아이의 발음 발달 상태를 부모님께 안내해 드려요. 의료적 평가가 아닌 발달 확인용 보조 도구입니다.",
};

// 인증 + DB 상태는 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

const ALLOWED_PHONEMES = ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㄹ"] as const;
type AllowedPhoneme = (typeof ALLOWED_PHONEMES)[number];

interface PrefillValues {
  childAgeMonths: number | null;
  phoneme: AllowedPhoneme | null;
}

async function fetchPrefillForCurrentUser(): Promise<PrefillValues> {
  const fallback: PrefillValues = { childAgeMonths: null, phoneme: null };
  // Performance: getCachedUser 는 layout 의 MainNav / OnboardingRedirectShim / ConsentRedirectShim 와 dedup.
  const user = await getCachedUser();
  if (!user) return fallback;
  try {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { childAgeMonths: true, preferredPhonemes: true },
    });
    if (!row) return fallback;
    const phoneme = (row.preferredPhonemes ?? []).find((p): p is AllowedPhoneme =>
      (ALLOWED_PHONEMES as ReadonlyArray<string>).includes(p),
    );
    return {
      childAgeMonths:
        row.childAgeMonths != null && row.childAgeMonths >= 24 && row.childAgeMonths <= 84
          ? row.childAgeMonths
          : null,
      phoneme: phoneme ?? null,
    };
  } catch {
    return fallback;
  }
}

interface DiagnosePageProps {
  // Next.js 16 — searchParams 는 async (Promise).
  searchParams: Promise<{ phoneme?: string }>;
}

export default async function DiagnosePage({ searchParams }: DiagnosePageProps) {
  const [sp, prefill] = await Promise.all([
    searchParams,
    fetchPrefillForCurrentUser(),
  ]);

  // FR-Q-003 fix — /missions 카드 "시작" 이 /diagnose?phoneme=X 로 routing.
  // 기존: searchParams 무시 → user.preferredPhonemes[0] 만 사용 → 모든 카드 같은 음소.
  // 수정: searchParams.phoneme valid 시 우선. fallback = user prefill.
  const queryPhoneme: AllowedPhoneme | null =
    (ALLOWED_PHONEMES as ReadonlyArray<string>).includes(sp.phoneme ?? "")
      ? (sp.phoneme as AllowedPhoneme)
      : null;
  const finalPhoneme = queryPhoneme ?? prefill.phoneme;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* 상단 Disclaimer */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 서비스는 의료적 평가를 제공하지 않으며, 부모님께 발달 확인 정보를 안내하기 위한
        보조 도구입니다.
      </p>

      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">5분 발음 확인</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          회원가입 없이 5분 안에 아이의 발음 발달 단계를 또래와 비교해 확인할 수 있어요.
        </p>
      </header>

      <DiagnosisForm
        prefillChildAgeMonths={prefill.childAgeMonths}
        prefillPhoneme={finalPhoneme}
      />

      {/* 하단 Disclaimer */}
      <p
        data-testid="disclaimer"
        className="mt-10 rounded-md border border-gray-200 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400"
      >
        본 결과는 의료적 평가가 아니며, 발달이 우려되는 경우 전문가 상담을 권장합니다.
      </p>
    </main>
  );
}
