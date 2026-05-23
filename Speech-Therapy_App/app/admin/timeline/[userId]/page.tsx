// FR-Q-013 (#54) — /admin/timeline/[userId] 자녀 통합 타임라인 (Server Component).
//
// 책임:
//   1) dynamic param userId (자녀 = role=parent User) 단건 조회 + RBAC L2 가드.
//   2) Supabase auth → 본인(viewer) role + institutionId 조회.
//   3) cross-tenant 차단 (R4):
//        - admin       : 모든 user 통과
//        - principal   : viewer.institutionId == target.institutionId 만 통과
//        - expert      : viewer.institutionId == target.institutionId 만 통과 (담당 기관)
//        - parent etc. : 403 (페이지 L2 가드 — proxy.ts 는 admin/principal/expert 만 통과시키나 방어)
//   4) loadUserTimeline(userId) → TimelineList 렌더 + 오프라인 placeholder section.
//   5) timeline_viewed telemetry (server-side console.log — R4: userId 만 노출, 분석 백엔드 해시).
//
// 접근 제어 계층:
//   - L1: proxy.ts 가 /admin/* 의 RBAC 1차 통과 (admin / principal / expert).
//   - L2: 본 페이지가 parent/null 차단 + institutionId 매칭 검증 + 자녀 존재 확인.
//
// 오프라인 활동 placeholder (본 PR 범위 외):
//   - "센터 오프라인 활동" 영역은 별도 OfflineEntry 모델 + admin 입력 폼 도입 시 채워짐.
//   - 후속 PR: OfflineEntry 모델 (raw SQL migration) + /admin/timeline/[userId]/offline-entry Server Action.
//
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지 — "발음 발달 확인" / "발음 가이드" 로 대체.

import Link from "next/link";
import { notFound } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import {
  loadUserTimeline,
  type TimelineData,
} from "@/lib/timeline/aggregator";
import { TimelineList } from "@/components/admin/timeline/TimelineList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "자녀 활동 타임라인 — Speech-Therapy",
  description:
    "자녀의 앱 발음 발달 확인 + 미션 활동을 시계열로 보여드려요. 원장/관리자/전문가 전용.",
};

type PageProps = {
  params: Promise<{ userId: string }>;
};

/// 본 페이지 진입 허용 role — proxy.ts allow-list (admin / principal / expert).
const PAGE_ALLOWED_ROLES = new Set(["admin", "principal", "expert"]);

interface ViewerContext {
  viewerId: string;
  role: string | null;
  institutionId: string | null;
}

async function loadViewerContext(): Promise<ViewerContext | null> {
  let viewerId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    viewerId = data.user?.id ?? null;
  } catch {
    return null;
  }
  if (!viewerId) return null;

  try {
    const row = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { role: true, institutionId: true },
    });
    return {
      viewerId,
      role: row?.role ?? null,
      institutionId: row?.institutionId ?? null,
    };
  } catch {
    return null;
  }
}

interface TargetChildContext {
  targetUserId: string;
  childAgeMonths: number | null;
  institutionId: string | null;
  role: string | null;
}

async function loadTargetChild(targetUserId: string): Promise<TargetChildContext | null> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        institutionId: true,
        childAgeMonths: true,
      },
    });
    if (!row) return null;
    return {
      targetUserId: row.id,
      role: row.role,
      institutionId: row.institutionId,
      childAgeMonths: row.childAgeMonths,
    };
  } catch {
    return null;
  }
}

/// server-side telemetry — Vercel Logs 가 수집.
/// R4: userId 는 분석 백엔드에서 자동 해시 가정 (server-side telemetry sink 도입 시).
function logTimelineView(targetUserId: string, data: TimelineData) {
  try {
    console.log(
      JSON.stringify({
        level: "info",
        event: "timeline_viewed",
        userId: targetUserId,
        entriesCount: data.totalCount,
        hasMissionData: data.hasMissionData,
        hasDiagnoseData: data.hasDiagnoseData,
      }),
    );
  } catch {
    // logging 실패는 무시 — UI 렌더 차단 금지.
  }
}

function ForbiddenView({ reason }: { reason: string }) {
  return (
    <main
      data-testid="timeline-forbidden"
      data-reason={reason}
      className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
      role="alert"
      aria-live="polite"
    >
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-xl font-semibold">자녀 활동 타임라인 접근 권한이 없어요</h1>
        <p className="mt-2 text-sm">
          본 페이지는 운영자/원장/전문가 전용입니다. 본 자녀가 본인 기관에 속해 있어야 열람할 수
          있어요. 권한이 필요하시면 운영자에게 요청해 주세요.
        </p>
        <Link
          href="/admin/principal"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
        >
          원장 대시보드로
        </Link>
      </div>
    </main>
  );
}

export default async function TimelinePage({ params }: PageProps) {
  const { userId: targetUserId } = await params;

  const viewer = await loadViewerContext();
  // L2 — 비로그인 fallback (proxy.ts 통상 차단하나, 직접 호출 / Supabase 일시 장애 대응).
  if (!viewer) {
    return <ForbiddenView reason="unauthenticated" />;
  }

  // L2 — role 가드 (parent 등 차단).
  if (!viewer.role || !PAGE_ALLOWED_ROLES.has(viewer.role)) {
    return <ForbiddenView reason="role" />;
  }

  // 자녀 단건 조회 — 존재하지 않거나 parent 가 아니면 404 (R4: 정보 유출 최소화).
  const target = await loadTargetChild(targetUserId);
  if (!target) {
    notFound();
  }

  // L2 — cross-tenant 차단:
  //   - admin   : pass
  //   - 그 외   : viewer.institutionId == target.institutionId 필요 (양쪽 비어 있으면 차단).
  if (viewer.role !== "admin") {
    if (
      !viewer.institutionId ||
      !target.institutionId ||
      viewer.institutionId !== target.institutionId
    ) {
      return <ForbiddenView reason="cross_tenant" />;
    }
  }

  const data = await loadUserTimeline(targetUserId);
  logTimelineView(targetUserId, data);

  const hasAny = data.totalCount > 0;

  return (
    <main
      data-testid="admin-timeline-page"
      data-target-user-id={target.targetUserId}
      className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="timeline-page-heading"
    >
      <header className="mb-6">
        <h1
          id="timeline-page-heading"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          자녀 활동 타임라인
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          앱 발음 발달 확인 + 미션 활동을 시계열로 한눈에 확인해요. 센터에서 선생님이 수기로
          기록한 활동도 곧 함께 표시될 예정이에요.
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
          {target.childAgeMonths !== null ? (
            <div>
              <dt className="inline font-semibold text-slate-700">월령</dt>
              <dd className="ml-1 inline" data-testid="timeline-child-age-months">
                {target.childAgeMonths}개월
              </dd>
            </div>
          ) : null}
          {target.institutionId ? (
            <div>
              <dt className="inline font-semibold text-slate-700">기관</dt>
              <dd className="ml-1 inline font-mono text-[11px]">
                {/* R4: 본 페이지 viewer 는 admin/principal/expert — institutionId 표시 OK. */}
                <span data-testid="timeline-institution-id">{target.institutionId}</span>
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      {hasAny ? (
        <TimelineList entries={data.entries} />
      ) : (
        <section
          data-testid="timeline-empty-state"
          aria-label="활동 없음"
          className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900"
        >
          <p className="mb-2 font-semibold">아직 활동이 없어요</p>
          <p className="mb-3">
            앱에서 발음 발달 확인을 한 번 진행하면 본 타임라인에 첫 활동이 누적되기 시작해요.
          </p>
          <Link
            href="/diagnose"
            data-testid="timeline-empty-cta"
            className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            발음 발달 확인 시작
          </Link>
        </section>
      )}

      <section
        data-testid="timeline-offline-placeholder"
        aria-label="센터 오프라인 활동"
        className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700"
      >
        <h2 className="mb-2 text-base font-semibold text-slate-900">
          센터에서 기록한 오프라인 활동
        </h2>
        <p className="mb-1">
          선생님이 수기로 기록한 활동은 곧 본 영역에 함께 표시될 예정이에요.
        </p>
        <p className="text-xs text-slate-500">
          오프라인 활동 입력 폼은 후속 업데이트에서 제공돼요 (운영자 화면).
        </p>
      </section>

      <footer
        aria-label="안내"
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <p className="mb-1 font-semibold text-slate-800">표시 정책</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>본 화면은 운영자/원장/전문가 전용이며 본 기관 자녀만 열람할 수 있어요 (R4).</li>
          <li>자녀 본명/이메일은 표시되지 않아요 — 월령 + 활동 요약만 보여드려요.</li>
          <li>본 결과는 의학적 판단이 아닌 발달 참고 자료입니다.</li>
        </ul>
      </footer>
    </main>
  );
}
