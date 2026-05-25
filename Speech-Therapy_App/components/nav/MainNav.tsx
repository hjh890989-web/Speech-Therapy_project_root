// FR-NAV (메인 navigation 통합) — 부모/원장/선생님/expert/admin/익명 role 별 진입 동선.
//
// 역할:
//   Supabase auth + Prisma User 단건 fetch 로 현재 사용자 role 을 식별 → role 별 메뉴 목록 산출
//   → MainNavClient (Client Component) 에 props 로 전달. 본 컴포넌트는 RSC — DB / Supabase
//   호출이 client 번들에 들어가지 않도록 의도적 분리.
//
// 데이터 fetch:
//   - Supabase auth.getUser() (cookie 기반) 1회
//   - 인증된 user 만 prisma.user.findUnique 1회 (role 만 select) — institutionId 등 미사용 (메뉴에 영향 없음)
//
// 메뉴 매트릭스 (role 별 항목):
//   anonymous  : 발음 발달 확인(/diagnose) + 로그인(/login)
//   parent     : 주간 리뷰(/weekly-review) + 미션(/missions) + 보상 도감(/rewards/collection)
//                + 예측(/predictions) + 설정(/settings)
//   teacher    : 위 일부 (주간 리뷰/미션/보상) + 선생님 대시보드(/admin/teacher) + 설정(/settings)
//   principal  : 부모 메뉴 + 원장 대시보드(/admin/principal) + 선생님 대시보드(/admin/teacher) + 설정(/settings)
//   admin      : principal 메뉴 + HITL 큐(/admin/hitl) + 설정(/settings)
//   expert     : 부모 메뉴 일부 + HITL 큐(/admin/hitl) + 설정(/settings)
//
// "설정" 메뉴 정책:
//   - anonymous 제외, 모든 인증 role 에 /settings 진입 노출.
//   - 마이크 캘리브레이션 등 user 단위 설정이 자녀 유무와 무관 → teacher/principal/admin/expert 도 노출.
//   - active path 매칭은 isPathActive 의 prefix 매칭으로 /settings/calibration / /settings/child 등 sub-route 도 강조됨.
//
// CON-04 금칙어 정책:
//   - 메뉴 라벨에 의료 단정 표현 ("진단" / "치료" / "장애" 등) 사용 금지.
//   - "발음 발달 확인" / "발음 가이드" 등 대체 표현 사용 (text-safety.ts 정규식 무결성 보장).
//
// 회귀 0건 정책:
//   - (public)/layout.tsx 의 OnboardingRedirectGate 와 함께 mount. onboarding 미완료 user 가
//     nav 진입 시 동일하게 /onboarding 으로 redirect 됨 (Client gate 가 client-side mount 직후 실행).
//   - 본 컴포넌트는 시각적 nav 만 추가 — onboarding / institution header / offline toast 등
//     기존 전역 UI 의 동작에 0건 영향.

import { MainNavClient, type MainNavItem, type MainNavRole } from "./MainNavClient";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

/** 메뉴 항목 산출 — role 별 분기. 본 함수는 분리 export 하여 단위 테스트 (props snapshot) 가능. */
export function buildNavItemsForRole(role: MainNavRole): MainNavItem[] {
  // 부모 친화 카피 — 격려조 + 큰 글씨로 노출 (CSS 측 처리).
  const PARENT_BASE: MainNavItem[] = [
    { href: "/weekly-review", label: "우리 아이 주간 리뷰", emoji: "📅" },
    { href: "/missions", label: "미션 도전", emoji: "🎯" },
    { href: "/rewards/collection", label: "보상 도감", emoji: "✨" },
    { href: "/predictions", label: "예측 보기", emoji: "🔮" },
  ];

  // 운영자 메뉴 — 단순 라벨 (정보 밀도 OK).
  const TEACHER_DASHBOARD: MainNavItem = {
    href: "/admin/teacher",
    label: "선생님 대시보드",
    emoji: "🏫",
  };
  const PRINCIPAL_DASHBOARD: MainNavItem = {
    href: "/admin/principal",
    label: "원장 대시보드",
    emoji: "🏢",
  };
  const HITL_QUEUE: MainNavItem = {
    href: "/admin/hitl",
    label: "HITL 큐",
    emoji: "🧭",
  };
  // 설정 — 모든 인증 role 공통. anonymous 만 제외.
  // active path 강조는 isPathActive prefix 매칭으로 /settings/calibration / /settings/child 등 sub-route 포함.
  const SETTINGS: MainNavItem = {
    href: "/settings",
    label: "설정",
    emoji: "⚙️",
  };

  switch (role) {
    case "anonymous":
      return [
        { href: "/diagnose", label: "발음 발달 확인", emoji: "🎤" },
      ];
    case "parent":
      return [...PARENT_BASE, SETTINGS];
    case "teacher":
      return [
        // 선생님도 부모 화면 일부는 접근 가능 (자녀 본인 계정과 별개 — 데모 / 가이드 목적).
        PARENT_BASE[0]!,
        PARENT_BASE[1]!,
        PARENT_BASE[2]!,
        TEACHER_DASHBOARD,
        SETTINGS,
      ];
    case "principal":
      return [...PARENT_BASE, PRINCIPAL_DASHBOARD, TEACHER_DASHBOARD, SETTINGS];
    case "admin":
      return [...PARENT_BASE, PRINCIPAL_DASHBOARD, TEACHER_DASHBOARD, HITL_QUEUE, SETTINGS];
    case "expert":
      return [PARENT_BASE[0]!, PARENT_BASE[1]!, PARENT_BASE[2]!, HITL_QUEUE, SETTINGS];
    default: {
      // exhaustiveness — 새 role 추가 시 type error.
      const _exhaustive: never = role;
      void _exhaustive;
      return [];
    }
  }
}

/** Supabase 인증 + Prisma role 단건 조회. 실패 시 anonymous fallback. */
export async function fetchCurrentNavRole(): Promise<{
  role: MainNavRole;
  userEmail: string | null;
}> {
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    userEmail = data.user?.email ?? null;
  } catch {
    // env 미설정 / 네트워크 — anonymous fallback (nav 차단 금지).
    return { role: "anonymous", userEmail: null };
  }
  if (!userId) return { role: "anonymous", userEmail: null };

  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const dbRole = row?.role ?? null;
    if (
      dbRole === "parent" ||
      dbRole === "teacher" ||
      dbRole === "principal" ||
      dbRole === "expert" ||
      dbRole === "admin"
    ) {
      return { role: dbRole, userEmail };
    }
    // role 미설정 / 알 수 없는 값 — parent 폴백 (인증은 되었으므로 anonymous 아님).
    return { role: "parent", userEmail };
  } catch {
    // DB 오류 — nav 차단 금지, anonymous 로 폴백.
    return { role: "anonymous", userEmail: null };
  }
}

/** 외부에서 직접 props 주입 가능 (RSC 캐시 / 테스트 우회). 미지정 시 자체 fetch. */
export interface MainNavProps {
  role?: MainNavRole;
  userEmail?: string | null;
}

export async function MainNav(props: MainNavProps = {}) {
  // RSC async — 외부 호출자 (layout) 가 <Suspense fallback={null}> 로 wrap 하여 page LCP 차단 0 보장.
  let role = props.role;
  let userEmail = props.userEmail;
  if (role === undefined) {
    const fetched = await fetchCurrentNavRole();
    role = fetched.role;
    if (userEmail === undefined) userEmail = fetched.userEmail;
  }
  const items = buildNavItemsForRole(role);
  return (
    <MainNavClient
      items={items}
      role={role}
      userEmail={userEmail ?? null}
    />
  );
}
