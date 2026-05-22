// FR-Q-008 (#49) — /admin/hitl HITL 큐 list (Server Component).
//
// 책임:
//   - active(미완료) HITL 큐 목록을 admin 에게 노출 (pending + in_review)
//   - confidence / SLA / status 시각 분기 (색상 + 텍스트 이중 인디케이터)
//   - R4 보호: sessionId 8자리 + userId 4자리 truncate
//   - 상세 페이지 (FR-C-013 #36) 로 이동할 placeholder Action 링크 제공
//
// 접근 제어:
//   - proxy.ts 가 /admin/* 경로 RBAC 이미 적용 (admin / principal / expert 만 통과)
//   - 본 페이지는 추가 권한 검사 미수행 (단일 책임 원칙)
//
// 데이터 흐름:
//   - lib/hitl/admin.fetchActiveHitlQueue 가 Prisma 직접 호출 → JSX 직접 렌더
//   - Suspense / loading.tsx 가 첫 paint 차단을 막음
//   - error.tsx 가 Prisma 실패 시 사용자에게 사유 노출
//
// 금칙어 (CON-04): "치료" / "진단" / "장애" 사용 금지. UI 카피 0건 확인.

import Link from "next/link";
import {
  classifyConfidence,
  CONFIDENCE_TONE_CLASS,
  fetchActiveHitlQueue,
  presentSla,
  STATUS_LABEL,
  STATUS_PILL_CLASS,
  truncateSessionId,
  truncateUserId,
} from "@/lib/hitl/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "HITL 검토 큐 — Speech-Therapy",
  description:
    "전문가 검토가 필요한 발음 발달 확인 결과 목록입니다. 관리자/원장/전문가 전용 화면.",
};

function formatSubmittedAt(date: Date): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export default async function HitlQueueAdminPage() {
  const rows = await fetchActiveHitlQueue();
  const now = new Date();

  return (
    <main
      data-testid="admin-hitl-page"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="hitl-heading"
    >
      <header className="mb-6">
        <h1
          id="hitl-heading"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          HITL 검토 큐
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          confidence 70 미만 결과 또는 수동 이관 건이 표시돼요. 전문가 검토 SLA 는
          등록 시각으로부터 48시간입니다.
        </p>
        <p className="mt-1 text-xs text-slate-500" data-testid="hitl-row-count">
          현재 {rows.length}건 (최근 등록 순 · 최대 100건)
        </p>
      </header>

      {rows.length === 0 ? (
        <section
          aria-label="검토 대기 항목 없음"
          data-testid="hitl-empty-state"
          className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700"
        >
          <p className="mb-2 font-semibold text-slate-900">
            현재 검토 대기 항목 없음
          </p>
          <p className="mb-2">
            confidence 70 미만 결과가 들어오면 자동으로 이 큐에 등록됩니다.
          </p>
          <ul className="ml-4 list-disc space-y-1 text-xs text-slate-600">
            <li>전체 사용자 confidence ≥ 70 인 상태 (가장 흔한 사유)</li>
            <li>자동 트리거 미동작 — 서버 로그에서 <code>hitl_enqueued</code> 이벤트 확인 필요</li>
            <li>월 3건 dismissed 후 자동 거부 어뷰징 가드 발동 (REQ-FUNC-034)</li>
          </ul>
        </section>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table
            data-testid="hitl-queue-table"
            className="w-full min-w-[720px] text-left text-sm"
          >
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2">Session ID</th>
                <th scope="col" className="px-3 py-2">User</th>
                <th scope="col" className="px-3 py-2">Confidence</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="px-3 py-2">Submitted</th>
                <th scope="col" className="px-3 py-2">SLA</th>
                <th scope="col" className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tone = classifyConfidence(row.confidenceScore);
                const toneClass = CONFIDENCE_TONE_CLASS[tone];
                const statusClass =
                  STATUS_PILL_CLASS[row.status] ?? "bg-slate-100 text-slate-700 border-slate-200";
                const statusLabel = STATUS_LABEL[row.status] ?? row.status;
                const sla = presentSla(row.slaDueAt, now);
                return (
                  <tr
                    key={row.id}
                    data-testid={`hitl-row-${row.id}`}
                    data-confidence-tone={tone}
                    data-sla-overdue={sla.overdue ? "true" : "false"}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      <span
                        data-testid="hitl-session-id"
                        title={row.sessionId}
                        aria-label={`세션 ${truncateSessionId(row.sessionId)}`}
                      >
                        {truncateSessionId(row.sessionId)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">
                      <span data-testid="hitl-user-id">
                        {truncateUserId(row.userId)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        data-testid="hitl-confidence"
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${toneClass}`}
                      >
                        {row.confidenceScore.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        data-testid="hitl-status"
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      <span data-testid="hitl-submitted">
                        {formatSubmittedAt(row.createdAt)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        data-testid="hitl-sla"
                        className={
                          sla.overdue
                            ? "rounded bg-rose-100 px-2 py-0.5 font-semibold text-rose-800"
                            : "text-slate-700"
                        }
                      >
                        {sla.remainingLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <Link
                        href={`/admin/hitl/${row.id}`}
                        data-testid="hitl-action-link"
                        className="inline-flex min-h-[32px] items-center rounded border border-emerald-300 bg-emerald-50 px-2 py-1 font-medium text-emerald-800 hover:bg-emerald-100"
                        aria-label={`세션 ${truncateSessionId(row.sessionId)} 상세 보기`}
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <footer
        aria-label="안내"
        className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
      >
        <p className="mb-1 font-semibold text-slate-800">표시 정책</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>active 큐 (대기 + 검토중) 만 노출. 완료/거부/에스컬레이트 항목은 별도 페이지에서 다뤄요.</li>
          <li>R4 보호 — 세션/사용자 식별자는 앞 일부만 노출됩니다 (상세 페이지에서 풀길이 확인 가능).</li>
          <li>SLA 가 초과된 항목은 빨간색으로 강조됩니다.</li>
        </ul>
      </footer>
    </main>
  );
}
