// FR-Q-010 (REQ-FUNC-047) — 기관 (Institution) 헤더 / 로고 커스텀 (≤ 1초 렌더).
//
// Server Component (RSC) — 인증 사용자의 User.institutionId 를 통해 Institution.name / logoUri
// 를 1 쿼리 (Prisma findUnique + include) 로 가져온 뒤 헤더에 렌더.
//
// 1초 렌더 보장 메커니즘:
//   - RSC 자체에서 직접 DB 조회 → client roundtrip / waterfall 제거
//   - 단일 Prisma findUnique (PK 인덱스 hit) → p95 < 50ms
//   - 외부 logo URL 은 표준 <img> 사용 (next/image remotePatterns 미설정 환경에서도 안전)
//   - 헤더 텍스트는 logo 로드와 독립 paint → LCP < 1000ms
//
// Fallback 3 분기:
//   1) 무로그인 / Supabase 오류 → 기본 "Speech-Therapy"
//   2) 로그인 + institutionId null (개인 부모 사용자) → 기본 "Speech-Therapy"
//   3) 로그인 + institutionId 존재 → Institution.name + logoUri (logoUri null 시 텍스트만)
//
// CON-04 (의료 금칙어) — Institution.name 은 원장 입력 의존성이 있으므로
// sanitizeUserFacingText 로 헤더 노출 직전에 1회 검사. 금칙어 발견 시 기본 폴백으로 회피.

import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { containsBannedTerms } from "@/lib/text-safety";

interface InstitutionDisplay {
  name: string;
  logoUri: string | null;
}

const DEFAULT_DISPLAY: InstitutionDisplay = {
  name: "Speech-Therapy",
  logoUri: null,
};

/// 인증 사용자의 institutionId 를 통해 Institution 단건 조회.
/// 익명 / 무기관 / 오류 → null 반환 (fallback 트리거).
///
/// 분리 export 사유: vitest 에서 prisma + supabase mock 의존성 없이
/// 표시 로직만 독립 검증 가능하도록 component 와 데이터 fetch 를 디커플링.
export async function fetchInstitutionForCurrentUser(): Promise<InstitutionDisplay | null> {
  let userId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // env 미설정 / 네트워크 — 익명 fallback.
    return null;
  }
  if (!userId) return null;

  try {
    // RSC 단일 쿼리 — User.institutionId FK 조인 1회로 끝남 (PK index hit).
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        institution: { select: { name: true, logoUri: true } },
      },
    });
    if (!row?.institution) return null;
    return { name: row.institution.name, logoUri: row.institution.logoUri };
  } catch {
    // DB 오류 — 헤더 렌더 차단 금지, fallback 처리.
    return null;
  }
}

/// 외부에서 props 로 강제 주입 가능 (RSC 캐시 / 테스트 우회). 미지정 시 자체 fetch.
export interface InstitutionHeaderProps {
  institution?: InstitutionDisplay | null;
}

export async function InstitutionHeader({ institution }: InstitutionHeaderProps = {}) {
  const fetched = institution === undefined ? await fetchInstitutionForCurrentUser() : institution;

  // CON-04 sanitize — 원장 입력 name 에 금칙어 포함 시 default 로 우회.
  const display: InstitutionDisplay =
    fetched && !containsBannedTerms(fetched.name) ? fetched : DEFAULT_DISPLAY;

  const hasLogo = Boolean(display.logoUri);

  return (
    <header
      data-testid="institution-header"
      className="border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/70"
    >
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
          aria-label={`${display.name} 홈으로 이동`}
        >
          {hasLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element -- 외부 Supabase Storage URL.
               next/image remotePatterns 동적 등록은 운영 환경 변동성이 커, 표준 <img> 로 단순화.
               헤더 logo 는 작은 사이즈 (≤ 32px) 이므로 LCP 영향 미미. */
            <img
              src={display.logoUri ?? ""}
              alt={`${display.name} 로고`}
              data-testid="institution-logo"
              width={32}
              height={32}
              className="h-6 w-6 max-w-[32px] rounded object-contain sm:h-8 sm:w-8"
              loading="eager"
              decoding="async"
            />
          ) : null}
          <span
            data-testid="institution-name"
            className="max-w-[12rem] truncate text-sm sm:max-w-[20rem] sm:text-base"
          >
            {display.name}
          </span>
        </Link>
      </div>
    </header>
  );
}
