// FR-C-SETTINGS-INDEX — /settings 인덱스 페이지 (Server Component).
//
// 책임:
//   1) Supabase auth 확인 — 비로그인 시 /login?next=/settings redirect.
//   2) 부모용 설정 카드 grid 렌더 — 각 카드는 destination 으로 이동.
//      - /settings/child (자녀 정보)
//      - /settings/calibration (마이크 환경 보정)
//
// RBAC (R4):
//   - 외부 URL param 입력 미사용 — auth.uid 만으로 게이트.
//   - 다른 사용자 데이터 cross-read 0건 (본 페이지는 표시 정보 없음 — 단순 hub).
//
// graceful:
//   - Supabase env 미설정 / 일시 장애 → 비로그인 처리 후 login redirect.
//
// CON-04: 본 페이지의 모든 카피 / metadata / 카드 라벨에 "치료/진단/장애" 금칙어 0건.
//
// 디자인:
//   - 부모 인터랙션 — 자녀 친화 카피 불필요, 단순 명확.
//   - Grid (모바일 1열 / md 2열), 각 카드 hover + focus 표시.
//
// 후속:
//   - 알림 선호 / 계정 정보 / 로그아웃 카드는 별도 PR.
//   - MainNav 통합은 sibling Agent B 가 별도 PR 로 진행.

import { redirect } from "next/navigation";

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { SettingsCard } from "@/components/settings/SettingsCard";

export const metadata = {
  title: "설정 — Speech-Therapy",
  description:
    "자녀 정보, 마이크 환경 보정 등 부모용 설정을 한곳에서 관리할 수 있어요.",
};

// auth 결과는 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

interface SettingsEntry {
  href: string;
  icon: string;
  title: string;
  description: string;
  testId: string;
}

const SETTINGS_ENTRIES: ReadonlyArray<SettingsEntry> = [
  {
    href: "/settings/child",
    icon: "👶",
    title: "자녀 정보",
    description: "자녀의 월령과 관심 음소를 변경해요.",
    testId: "settings-card-child",
  },
  {
    href: "/settings/calibration",
    icon: "🎤",
    title: "마이크 환경 보정",
    description: "환경 소음을 측정하고 발음 확인 알림 임계값을 맞춰요.",
    testId: "settings-card-calibration",
  },
  {
    href: "/settings/account",
    icon: "👤",
    title: "계정 정보",
    description: "이메일 / 가입일 / 데이터 다운로드 / 계정 삭제 등 계정을 관리해요.",
    testId: "settings-card-account",
  },
  {
    href: "/settings/notifications",
    icon: "🔔",
    title: "알림 선호",
    description:
      "주간 리뷰 / 쿠션어 알림장 등 이메일 알림 수신 여부를 항목별로 설정해요.",
    testId: "settings-card-notifications",
  },
  {
    href: "/settings/security",
    icon: "🔐",
    title: "보안 / 2단계 인증",
    description: "TOTP 인증 앱으로 로그인 보안을 강화해요.",
    testId: "settings-card-security",
  },
  {
    // SEC-COMP-PIPA (Grill #3A A1+A2) — 만 14세 미만 자녀 정보 + 국외 이전 동의 페이지.
    href: "/settings/privacy-consent",
    icon: "🛡️",
    title: "개인정보 동의",
    description:
      "만 14세 미만 자녀 정보 처리 + Google Cloud / Gemini 국외 이전 동의를 관리해요.",
    testId: "settings-card-privacy-consent",
  },
  {
    // FR-CONSENT-REMINDER-UI — dca2aee 의 consent badge 가 /settings 로 진입한 부모를 위해
    // 본 카드에서 self-service 동의서 관리 페이지로 한 클릭에 이동.
    href: "/settings/consent",
    icon: "📝",
    title: "동의서 관리",
    description:
      "서명이 필요한 동의서를 확인하고 안내 메일을 다시 보낼 수 있어요.",
    testId: "settings-card-consent",
  },
];

export default async function SettingsIndexPage() {
  // 1) auth — 비로그인 시 login 으로 next return.
  // Performance: getCachedUser (React cache()) — layout 의 AuthHeader/MainNav 와 dedup.
  const user = await getCachedUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  return (
    <main
      data-testid="settings-index-page"
      className="mx-auto max-w-3xl px-4 py-8 sm:py-12"
    >
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">설정</h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          자녀 정보, 마이크 환경 등 부모용 설정을 한곳에서 관리할 수 있어요.
        </p>
      </header>

      <section
        aria-label="설정 항목"
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {SETTINGS_ENTRIES.map((entry) => (
          <SettingsCard
            key={entry.href}
            href={entry.href}
            icon={entry.icon}
            title={entry.title}
            description={entry.description}
            testId={entry.testId}
          />
        ))}
      </section>
    </main>
  );
}
