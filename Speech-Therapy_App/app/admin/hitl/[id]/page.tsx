// FR-C-013 (#36) — /admin/hitl/[id] HITL 상세 페이지 (Server Component).
//
// 책임:
//   1) queueId 로 HITLQueue + EvaluationResult 단건 조회
//   2) 404 fallback — 항목 없으면 notFound()
//   3) 헤더: sessionId truncate / 상태 badge / SLA 잔여시간 (overdue 강조)
//   4) 자녀 컨텍스트: targetPhoneme / confidenceScore / submitted at / userId (R4 truncate)
//   5) EvaluationResult 3축 점수 요약
//   6) 기존 expertComment / correctedScore 표시 (있다면)
//   7) HitlCommentForm (Client Component) 임베드 — PATCH endpoint 호출
//   8) Manual escalate 버튼 placeholder — sibling Agent B 의 /api/hitl/[id]/escalate endpoint 가정
//
// 접근 제어:
//   - proxy.ts 가 /admin/* 경로 RBAC 이미 적용 (admin / principal / expert 만 통과)
//   - 본 페이지는 추가 권한 검사 미수행 (단일 책임)
//
// R4 보호:
//   - userId / sessionId 풀길이 노출 금지 (truncate 표시)
//   - transcript / 자녀 식별 정보 절대 미표시
//   - tooltip 의 title 속성에 풀길이 노출 가능 — 운영 식별 필요 (감수)
//
// 금칙어: "치료" / "진단" / "장애" 사용 금지 (UI 카피 / 라벨 / 가이드 텍스트 모두).

import { notFound } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/db";
import {
  STATUS_LABEL,
  STATUS_PILL_CLASS,
  classifyConfidence,
  CONFIDENCE_TONE_CLASS,
  presentSla,
  truncateSessionId,
  truncateUserId,
} from "@/lib/hitl/admin";
import { HitlCommentForm } from "@/components/admin/HitlCommentForm";
import { HitlEscalateButton } from "@/components/admin/HitlEscalateButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "HITL 상세 — Speech-Therapy",
  description:
    "단건 HITL 큐 항목 상세. 전문가 코멘트 작성 + 보정 점수 입력. 관리자/원장/전문가 전용.",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDateTime(date: Date): string {
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

export default async function HitlDetailPage({ params }: PageProps) {
  const { id } = await params;

  const row = await prisma.hITLQueue.findUnique({
    where: { id },
    select: {
      id: true,
      sessionId: true,
      userId: true,
      confidenceScore: true,
      status: true,
      assignedExpertId: true,
      expertComment: true,
      correctedScore: true,
      reviewedAt: true,
      reviewedBy: true,
      slaDueAt: true,
      escalatedAt: true,
      completedAt: true,
      createdAt: true,
      evaluationResult: {
        select: {
          targetPhoneme: true,
          articulationScore: true,
          linguisticScore: true,
          acousticScore: true,
          peerPercentile: true,
          childAgeMonths: true,
        },
      },
    },
  });

  if (!row) {
    notFound();
  }

  const now = new Date();
  const sla = presentSla(row.slaDueAt, now);
  const tone = classifyConfidence(row.confidenceScore);
  const statusLabel = STATUS_LABEL[row.status] ?? row.status;
  const statusClass =
    STATUS_PILL_CLASS[row.status] ?? "bg-slate-100 text-slate-700 border-slate-200";
  const evalResult = row.evaluationResult;

  return (
    <main
      data-testid="admin-hitl-detail-page"
      className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10"
      aria-labelledby="hitl-detail-heading"
    >
      <nav aria-label="이전으로" className="mb-4 text-sm">
        <Link
          href="/admin/hitl"
          data-testid="hitl-detail-back-link"
          className="inline-flex items-center text-emerald-700 hover:underline"
        >
          ← 큐 목록으로
        </Link>
      </nav>

      <header className="mb-6 space-y-2">
        <h1
          id="hitl-detail-heading"
          className="text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          HITL 상세 검토
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            data-testid="hitl-detail-session-id"
            title={row.sessionId}
            className="font-mono text-xs text-slate-600"
          >
            Session {truncateSessionId(row.sessionId)}
          </span>
          <span
            data-testid="hitl-detail-status"
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}
          >
            {statusLabel}
          </span>
          <span
            data-testid="hitl-detail-sla"
            className={
              sla.overdue
                ? "rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800"
                : "text-xs text-slate-700"
            }
          >
            SLA: {sla.remainingLabel}
          </span>
        </div>
      </header>

      <section
        aria-label="자녀 컨텍스트"
        data-testid="hitl-detail-context"
        className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2"
      >
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            User
          </dt>
          <dd
            data-testid="hitl-detail-user-id"
            title={row.userId}
            className="mt-0.5 font-mono text-xs text-slate-800"
          >
            {truncateUserId(row.userId)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            대상 음소
          </dt>
          <dd data-testid="hitl-detail-phoneme" className="mt-0.5 text-base font-semibold text-slate-900">
            {evalResult?.targetPhoneme ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Confidence
          </dt>
          <dd
            data-testid="hitl-detail-confidence"
            className={`mt-0.5 inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${CONFIDENCE_TONE_CLASS[tone]}`}
          >
            {row.confidenceScore.toFixed(0)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Submitted
          </dt>
          <dd data-testid="hitl-detail-submitted" className="mt-0.5 text-xs text-slate-700">
            {formatDateTime(row.createdAt)}
          </dd>
        </div>
        {typeof evalResult?.childAgeMonths === "number" && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              월령
            </dt>
            <dd className="mt-0.5 text-xs text-slate-700">{evalResult.childAgeMonths}개월</dd>
          </div>
        )}
      </section>

      {evalResult && (
        <section
          aria-label="3축 점수 요약"
          data-testid="hitl-detail-eval-result"
          className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4"
        >
          <ScoreCell label="조음" value={evalResult.articulationScore} testid="hitl-detail-articulation" />
          <ScoreCell label="언어" value={evalResult.linguisticScore} testid="hitl-detail-linguistic" />
          <ScoreCell label="음향" value={evalResult.acousticScore} testid="hitl-detail-acoustic" />
          <ScoreCell label="또래 백분위" value={evalResult.peerPercentile} testid="hitl-detail-peer" />
        </section>
      )}

      {(row.expertComment || row.correctedScore !== null) && (
        <section
          aria-label="기존 코멘트"
          data-testid="hitl-detail-existing-comment"
          className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm"
        >
          <h2 className="mb-2 text-sm font-semibold text-emerald-900">
            기존 전문가 코멘트
            {row.reviewedAt && (
              <span className="ml-2 text-xs font-normal text-emerald-700">
                ({formatDateTime(row.reviewedAt)})
              </span>
            )}
          </h2>
          {row.expertComment && (
            <p
              data-testid="hitl-detail-existing-comment-text"
              className="whitespace-pre-wrap text-sm text-slate-800"
            >
              {row.expertComment}
            </p>
          )}
          {row.correctedScore !== null && row.correctedScore !== undefined && (
            <p className="mt-2 text-xs text-emerald-800">
              보정 점수:{" "}
              <span data-testid="hitl-detail-existing-corrected-score" className="font-mono font-semibold">
                {row.correctedScore}
              </span>
            </p>
          )}
        </section>
      )}

      <section aria-label="코멘트 작성 폼" className="mb-6">
        <HitlCommentForm
          queueId={row.id}
          existingComment={row.expertComment}
          existingCorrectedScore={row.correctedScore ?? undefined}
        />
      </section>

      <section
        aria-label="에스컬레이트"
        data-testid="hitl-detail-escalate-block"
        className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <h2 className="mb-2 text-sm font-semibold">수동 에스컬레이트</h2>
        <p className="mb-3 text-xs">
          24시간 자동 cron 외에 검토 부담이 큰 항목은 즉시 상위 전문가로 이관 요청할 수 있어요.
        </p>
        <HitlEscalateButton
          queueId={row.id}
          alreadyEscalated={row.escalatedAt !== null}
        />
      </section>

      <footer className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="mb-1 font-semibold text-slate-800">R4 보호 안내</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>자녀 식별 정보 (이메일/이름/전체 transcript) 는 본 화면에 표시되지 않아요.</li>
          <li>userId / sessionId 는 운영 식별을 위해 일부만 노출되며, 전체값은 title 툴팁으로만 확인 가능합니다.</li>
          <li>코멘트는 부모에게 가공된 형태로 전달돼요 (CON-04 의료 disclaimer 준수).</li>
        </ul>
      </footer>
    </main>
  );
}

function ScoreCell({
  label,
  value,
  testid,
}: {
  label: string;
  value: number;
  testid: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div data-testid={testid} className="mt-1 text-lg font-bold text-slate-900">
        {value.toFixed(0)}
      </div>
    </div>
  );
}
