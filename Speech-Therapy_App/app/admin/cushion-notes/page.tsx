// FR-C-017 (#40 Replace D8) — AI 쿠션어 알림장 admin 페이지.
//
// 목적:
//   - 최근 진단 결과 list 노출 (max 30건)
//   - 각 row 에 CushionNoteGenerator 임베드 → 원장/admin/expert 가 알림장 생성 + 클립보드 복사
//   - "D8 Replace" 안내 — 키즈노트 자동 발송 대신 본인 채널 (카카오톡/문자) 사용
//
// 접근 제어:
//   - proxy.ts 가 /admin/* 경로 RBAC 이미 적용 (admin / principal / expert 통과)
//   - 본 페이지는 추가 권한 검사 미수행 (단일 책임)
//
// 데이터:
//   - prisma.evaluationResult.findMany — 최근 createdAt desc 30건
//   - principal/expert 는 자기 institution 의 user 결과만 (server-side filter)
//   - admin 은 전체 노출 (운영 도구 컨텍스트)
//
// R4 보호:
//   - userId 4자리 / sessionId 8자리 truncate
//   - 자녀 이름 노출 X — CushionNoteGenerator 안에서 원장이 직접 입력
//
// 금칙어 (CON-04): UI 카피 0건 확인.

import { prisma } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CushionNoteGenerator } from "@/components/admin/CushionNoteGenerator";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI 알림장 — Speech-Therapy",
  description:
    "최근 발음 발달 확인 결과를 바탕으로 부모님께 보내실 알림장을 AI 가 작성해 드려요. 키즈노트 미연동 — 카카오톡/문자 직접 발송용.",
};

interface CushionRow {
  id: string;
  sessionId: string;
  userId: string;
  targetPhoneme: string;
  articulationScore: number;
  linguisticScore: number;
  acousticScore: number;
  createdAt: Date;
  institutionId: string | null;
  /** FR-C-017+ — 부모 이메일 (Resend 발송 버튼 활성화 조건). null 이면 버튼 disabled. */
  parentEmail: string | null;
}

function truncateId(id: string, head = 8): string {
  if (id.length <= head + 2) return id;
  return `${id.slice(0, head)}…`;
}

function formatDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

async function fetchRecentEvaluations(): Promise<CushionRow[]> {
  // 호출자 role + institutionId 조회.
  let viewerRole: string | null = null;
  let viewerInstitutionId: string | null = null;
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: row } = await supabase
        .from("User")
        .select("role,institutionId")
        .eq("id", user.id)
        .maybeSingle<{ role: string | null; institutionId: string | null }>();
      viewerRole = row?.role ?? null;
      viewerInstitutionId = row?.institutionId ?? null;
    }
  } catch {
    // env 누락 / RLS 실패 — 빈 목록 반환.
    return [];
  }

  // proxy.ts 가 이미 admin/principal/expert 화이트리스트 통과 보장.
  // 그래도 server-side 보강: viewerRole 미가입 시 빈 목록.
  if (!viewerRole) return [];

  const where =
    viewerRole === "admin" || !viewerInstitutionId
      ? {}
      : { user: { institutionId: viewerInstitutionId } };

  let rows;
  try {
    rows = await prisma.evaluationResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        sessionId: true,
        userId: true,
        targetPhoneme: true,
        articulationScore: true,
        linguisticScore: true,
        acousticScore: true,
        createdAt: true,
        user: { select: { institutionId: true, email: true } },
      },
    });
  } catch {
    return [];
  }

  return rows.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    userId: r.userId,
    targetPhoneme: r.targetPhoneme,
    articulationScore: r.articulationScore,
    linguisticScore: r.linguisticScore,
    acousticScore: r.acousticScore,
    createdAt: r.createdAt,
    institutionId: r.user?.institutionId ?? null,
    parentEmail: r.user?.email ?? null,
  }));
}

export default async function CushionNotesAdminPage() {
  const rows = await fetchRecentEvaluations();

  return (
    <main
      data-testid="admin-cushion-notes-page"
      className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="cushion-notes-heading"
    >
      <header className="mb-6">
        <h1
          id="cushion-notes-heading"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          AI 알림장 (D8 Replace)
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          최근 발음 발달 확인 결과를 바탕으로 부모님께 보내실 알림장을 AI 가 작성해 드려요.
          생성된 알림장은 <strong>카카오톡 / 문자</strong> 등 평소 사용하시는 채널로 직접 전달해 주세요.
        </p>
        <p className="mt-1 text-xs text-slate-500" data-testid="cushion-row-count">
          최근 {rows.length}건 (등록 순)
        </p>
      </header>

      {rows.length === 0 ? (
        <section
          aria-label="알림장 생성 대상 없음"
          data-testid="cushion-empty-state"
          className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700"
        >
          <p className="mb-2 font-semibold text-slate-900">생성 대상 결과 없음</p>
          <p>
            아직 진단/평가 결과가 등록되지 않았어요. 부모님께서 발음 확인을 진행하시면
            이 화면에 자동으로 표시됩니다.
          </p>
        </section>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li
              key={row.id}
              data-testid={`cushion-row-${row.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="font-mono">
                  세션 {truncateId(row.sessionId)}
                </span>
                <span className="font-mono">
                  사용자 {truncateId(row.userId, 4)}
                </span>
                <span>
                  음소 <strong className="text-slate-900">{row.targetPhoneme}</strong>
                </span>
                <span>{formatDate(row.createdAt)}</span>
              </div>
              <CushionNoteGenerator
                evaluationResultId={row.id}
                parentEmail={row.parentEmail ?? undefined}
              />
            </li>
          ))}
        </ul>
      )}

      <footer
        aria-label="안내"
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <p className="mb-1 font-semibold text-slate-800">표시 정책</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>D8 적용 — 키즈노트/카카오 알림장 자동 발송 대신 클립보드 복사 + 직접 발송 패턴.</li>
          <li>AI 작성 실패 시 안전 템플릿이 자동 사용돼요. 본문은 항상 확인 후 발송해 주세요.</li>
          <li>R4 보호 — 세션/사용자 식별자는 앞 일부만 노출됩니다. 자녀 호칭은 직접 입력 시에만 사용돼요.</li>
        </ul>
      </footer>
    </main>
  );
}
