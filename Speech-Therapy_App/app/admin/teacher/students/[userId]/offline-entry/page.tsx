// FR-Q-013 후속 — /admin/teacher/students/[userId]/offline-entry Server Component.
//
// 책임:
//   1) dynamic param userId (자녀 = role=parent User) 단건 조회 + RBAC L2 가드.
//   2) Supabase auth → viewer role / institutionId / 본인 user.id 조회.
//   3) RBAC + cross-tenant 차단 (R4):
//        - admin     : 모든 자녀 통과
//        - principal : viewer.institutionId == target.institutionId 만 통과
//        - teacher   : 본인 담당 반의 자녀만 통과 (Class.teacherId === viewerId
//                      + Class.users 안에 userId 포함)
//        - 그 외     : 403
//   4) 자녀 기본 정보 (월령 / 기관) + 기존 offline entries list (최근 20건)
//      + <OfflineEntryForm /> Client Component 렌더.
//
// 접근 제어 계층:
//   - L1: proxy.ts 가 /admin/teacher 의 RBAC 1차 통과 (teacher 도 포함).
//   - L2: 본 페이지가 cross-tenant + teacher 담당 반 매칭 검증.
//
// R4 (자녀 식별 정보 노출 금지):
//   - 자녀 본명 / email 표시 0건 — userId truncate + 월령 + 기관 라벨만.
//   - listOfflineEntriesForUser 의 note 본문은 author 입력 그대로 — 입력 단계에서
//     CON-04 검증, 화면 노출 시 React 가 텍스트 escape 자동 처리.
//
// CON-04: 카피 "치료/진단/장애" 미사용 — "발음 발달 확인" / "활동 기록" 표현.

import Link from "next/link";
import { notFound } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import {
  listOfflineEntriesForUser,
  OFFLINE_ENTRY_DEFAULT_LIMIT,
  type OfflineEntry,
} from "@/lib/offline-entry/repo";
import { OfflineEntryForm } from "@/components/admin/teacher/OfflineEntryForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "오프라인 활동 기록 — Speech-Therapy",
  description:
    "센터에서 자녀의 오프라인 발음 활동을 수기로 기록합니다. 선생님/원장/관리자 전용 화면.",
};

type PageProps = {
  params: Promise<{ userId: string }>;
};

const PAGE_ALLOWED_ROLES = new Set(["admin", "principal", "teacher"]);

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
  classId: string | null;
  role: string | null;
}

async function loadTargetChild(
  targetUserId: string,
): Promise<TargetChildContext | null> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        institutionId: true,
        classId: true,
        childAgeMonths: true,
      },
    });
    if (!row) return null;
    return {
      targetUserId: row.id,
      role: row.role,
      institutionId: row.institutionId,
      classId: row.classId,
      childAgeMonths: row.childAgeMonths,
    };
  } catch {
    return null;
  }
}

/**
 * teacher RBAC 추가 검증 — 본인 담당 반의 자녀인지.
 * Class.teacherId === viewerId 이고, target.classId === Class.id 일 때만 통과.
 */
async function isTeacherClassroomMember(
  viewerId: string,
  targetClassId: string | null,
): Promise<boolean> {
  if (!targetClassId) return false;
  try {
    const cls = await prisma.class.findUnique({
      where: { id: targetClassId },
      select: { teacherId: true },
    });
    return cls?.teacherId === viewerId;
  } catch {
    return false;
  }
}

function ForbiddenView({ reason }: { reason: string }) {
  return (
    <main
      data-testid="offline-entry-forbidden"
      data-reason={reason}
      className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6"
      role="alert"
      aria-live="polite"
    >
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-xl font-semibold">
          오프라인 활동 기록 접근 권한이 없어요
        </h1>
        <p className="mt-2 text-sm">
          본 페이지는 선생님/원장/관리자 전용입니다. 본 자녀가 본인 담당 반/기관에
          속해 있어야 입력할 수 있어요. 권한이 필요하시면 운영자에게 요청해 주세요.
        </p>
        <Link
          href="/admin/teacher"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
        >
          선생님 대시보드로
        </Link>
      </div>
    </main>
  );
}

const KIND_LABEL: Record<string, string> = {
  practice: "발음 연습",
  observation: "관찰",
  note: "메모",
};

function formatObservedAt(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hh}:${mm}`;
}

function ExistingEntriesList({ entries }: { entries: OfflineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p
        data-testid="offline-entry-list-empty"
        className="text-sm text-slate-600"
      >
        아직 기록된 오프라인 활동이 없어요. 첫 활동을 기록해 보세요.
      </p>
    );
  }
  return (
    <ul
      data-testid="offline-entry-list"
      data-count={entries.length}
      className="space-y-2"
    >
      {entries.map((entry) => (
        <li
          key={entry.id}
          data-testid={`offline-entry-list-item-${entry.id}`}
          data-kind={entry.kind}
          className="rounded-md border border-slate-200 bg-white p-3 text-sm shadow-sm"
        >
          <header className="mb-1 flex items-baseline justify-between gap-2">
            <span className="font-semibold text-slate-900">
              {KIND_LABEL[entry.kind] ?? entry.kind}
            </span>
            <time
              dateTime={entry.observedAt.toISOString()}
              className="text-xs font-mono text-slate-500"
            >
              {formatObservedAt(entry.observedAt)}
            </time>
          </header>
          <p className="whitespace-pre-wrap text-slate-700">{entry.note}</p>
        </li>
      ))}
    </ul>
  );
}

export default async function OfflineEntryPage({ params }: PageProps) {
  const { userId: targetUserId } = await params;

  const viewer = await loadViewerContext();
  // L2 — 비로그인 fallback.
  if (!viewer) {
    return <ForbiddenView reason="unauthenticated" />;
  }
  if (!viewer.role || !PAGE_ALLOWED_ROLES.has(viewer.role)) {
    return <ForbiddenView reason="role" />;
  }

  const target = await loadTargetChild(targetUserId);
  if (!target || target.role !== "parent") {
    notFound();
  }

  // L2 — cross-tenant + teacher 담당 반 검증.
  if (viewer.role === "admin") {
    // pass — admin 은 모든 자녀.
  } else if (viewer.role === "principal") {
    if (
      !viewer.institutionId ||
      !target.institutionId ||
      viewer.institutionId !== target.institutionId
    ) {
      return <ForbiddenView reason="cross_institution" />;
    }
  } else if (viewer.role === "teacher") {
    // institution 일치 + 본인 담당 반 매칭 모두 필요.
    if (
      !viewer.institutionId ||
      !target.institutionId ||
      viewer.institutionId !== target.institutionId
    ) {
      return <ForbiddenView reason="cross_institution" />;
    }
    const isMyClassroom = await isTeacherClassroomMember(
      viewer.viewerId,
      target.classId,
    );
    if (!isMyClassroom) {
      return <ForbiddenView reason="cross_classroom" />;
    }
  }

  const entries = await listOfflineEntriesForUser(
    targetUserId,
    OFFLINE_ENTRY_DEFAULT_LIMIT,
  );

  return (
    <main
      data-testid="admin-teacher-offline-entry-page"
      data-target-user-id={target.targetUserId}
      className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="offline-entry-heading"
    >
      <header className="mb-6">
        <h1
          id="offline-entry-heading"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          오프라인 활동 기록
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          센터에서 자녀의 발음 연습/관찰 활동을 짧게 기록해 주세요. 본 기록은 자녀
          통합 타임라인에 함께 표시돼요.
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
          {target.childAgeMonths !== null ? (
            <div>
              <dt className="inline font-semibold text-slate-700">월령</dt>
              <dd
                className="ml-1 inline"
                data-testid="offline-entry-child-age-months"
              >
                {target.childAgeMonths}개월
              </dd>
            </div>
          ) : null}
          {target.institutionId ? (
            <div>
              <dt className="inline font-semibold text-slate-700">기관</dt>
              <dd
                className="ml-1 inline font-mono text-[11px]"
                data-testid="offline-entry-institution-id"
              >
                {target.institutionId}
              </dd>
            </div>
          ) : null}
        </dl>
      </header>

      <section
        aria-labelledby="offline-entry-form-heading"
        className="mb-8"
      >
        <h2
          id="offline-entry-form-heading"
          className="sr-only"
        >
          기록 입력 폼
        </h2>
        <OfflineEntryForm userId={target.targetUserId} />
      </section>

      <section
        aria-labelledby="offline-entry-history-heading"
        className="mb-8"
      >
        <h2
          id="offline-entry-history-heading"
          className="mb-3 text-lg font-semibold text-slate-900"
        >
          최근 기록 ({entries.length})
        </h2>
        <ExistingEntriesList entries={entries} />
      </section>

      <footer
        aria-label="안내"
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <p className="mb-1 font-semibold text-slate-800">표시 정책</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>본 화면은 선생님/원장/관리자 전용이며 본 담당 반/기관 자녀만 입력할 수 있어요 (R4).</li>
          <li>
            메모 본문에는 자녀의 이름/주소/연락처 등 개인정보 입력을 피해 주세요 (입력자 책임).
          </li>
          <li>본 결과는 의학적 판단이 아닌 발달 참고 자료입니다.</li>
        </ul>
      </footer>
    </main>
  );
}
