// FR-C-NOTIFICATION-PREFERENCE — /settings/notifications 알림 선호 페이지 (Server Component).
//
// 책임:
//   1) Supabase auth 확인 — 비로그인 시 /login?next=/settings/notifications redirect.
//   2) getNotificationPreference(userId) → DEFAULTS merge 된 NotificationPreference fetch.
//   3) <NotificationPreferenceForm initialPreference={...}> Client Component 렌더.
//
// RBAC (R4):
//   - 외부 URL param 으로 user id 입력 받지 않음 — auth.uid 만 사용.
//   - cross-read 0건 (본인 row 외 조회 X).
//
// graceful:
//   - DB fetch 실패 → DEFAULTS 폴백 (helper 내부 처리 — 본 페이지는 분기 0).
//   - Supabase env 미설정 / 일시 장애 → 비로그인 처리 후 login redirect.
//
// CON-04: 본 페이지의 모든 카피 / metadata / 안내 텍스트에 "치료/진단/장애" 금칙어 0건.
//
// 부모 인터랙션 — 자녀 친화 카피 불필요. 명확 + 법적 안내 (트랜잭션성 알림은 옵션 무관).

import { redirect } from "next/navigation";

import { getCachedUser } from "@/lib/auth/cached-get-user";
import { getNotificationPreference } from "@/lib/notifications/preference";
import { isF16PushEnabled } from "@/lib/push/config";
import { NotificationPreferenceForm } from "@/components/settings/NotificationPreferenceForm";
import { PushNotificationToggle } from "@/components/settings/PushNotificationToggle";

export const metadata = {
  title: "알림 선호 — Speech-Therapy",
  description:
    "주간 리뷰 / 쿠션어 알림장 / 동의서 리마인더 등 이메일 알림 수신 여부를 항목별로 선택하세요.",
};

// auth 결과 + preference 는 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

export default async function SettingsNotificationsPage() {
  // 1) auth — 비로그인 시 login 으로 next return.
  // Performance: getCachedUser (React cache()) — layout 의 AuthHeader/MainNav 와 dedup.
  const user = await getCachedUser();
  if (!user) {
    redirect("/login?next=/settings/notifications");
  }

  // 2) preference fetch — helper 가 graceful (DB 부재/실패 → DEFAULTS).
  const preference = await getNotificationPreference(user.id);

  // 3) F16 푸시 게이트 — 서버에서 결정 (off 시 토글 미렌더, D5 부활 전 기본).
  const f16PushEnabled = isF16PushEnabled();

  return (
    <main
      data-testid="settings-notifications-page"
      className="mx-auto max-w-2xl px-4 py-8 sm:py-12"
    >
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">알림 선호</h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          이메일 알림 종류별로 수신 여부를 항목별로 선택할 수 있어요. 변경 사항은 즉시 적용됩니다.
        </p>
      </header>

      {/* 법적 안내 — 트랜잭션성 알림은 옵션 무관 (GDPR / 정보통신망법 §50). */}
      <p
        data-testid="settings-notifications-transactional-notice"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        계정 변경, 비밀번호 재설정, 데이터 다운로드 안내 등 보안 / 계정 관련 알림은 옵션 변경 없이 항상 발송됩니다.
      </p>

      <NotificationPreferenceForm initialPreference={preference} />

      {/* F16 푸시 알림 — 게이트 on 일 때만 노출 (D5 부활 의존). 별도 opt-in 섹션. */}
      {f16PushEnabled && (
        <section className="mt-8">
          <PushNotificationToggle />
        </section>
      )}
    </main>
  );
}
