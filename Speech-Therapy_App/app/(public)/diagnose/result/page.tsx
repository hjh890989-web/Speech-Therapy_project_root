// FR-Q-001 임시 결과 페이지 — FR-Q-002 (또래 비교 리포트 RSC) 구현 시 교체 예정.
// 현재는 MOCK-001 의 success-high 결과를 표시해 종단간 흐름 검증.

import { mockSuccessHigh, mockSuccessLow } from "@/lib/mocks/diagnosis";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DiagnosisResultPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const mockKey = typeof params.mock === "string" ? params.mock : "success-high";
  const phoneme = typeof params.phoneme === "string" ? params.phoneme : "ㅅ";
  const age = typeof params.age === "string" ? params.age : "36";
  const transcript = typeof params.transcript === "string" ? params.transcript : "사과";
  const result = mockKey === "success-low" ? mockSuccessLow : mockSuccessHigh;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* Disclaimer 3중 노출 — REQ-FUNC-011 */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 결과는 의료적 판단이 아닙니다. 부모님께 발달 확인 정보를 드리는 보조 도구입니다.
      </p>

      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">{phoneme} 발음 확인 결과</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {age} 개월 · 들린 단어: {transcript}
        </p>
      </header>

      <section className="mb-6 grid grid-cols-3 gap-3">
        <ScoreCard label="조음" value={result.articulationScore} />
        <ScoreCard label="언어" value={result.linguisticScore} />
        <ScoreCard label="음향" value={result.acousticScore} />
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <p className="text-sm">또래 백분위</p>
        <p className="text-3xl font-bold">{result.peerPercentile}%</p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {result.aiCushionText}
        </p>
      </section>

      {result.requiresHITL && (
        <p
          data-testid="disclaimer"
          className="mb-6 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
        >
          더 정확한 안내를 위해 전문가 검토 단계로 전달했습니다. 결과는 곧 알려드릴게요.
        </p>
      )}

      <p
        data-testid="disclaimer"
        className="mt-8 rounded-md border border-gray-200 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400"
      >
        본 결과는 의료적 판단이 아니며, 발달이 우려되는 경우 전문가 상담을 권장합니다.
      </p>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        (FR-Q-002 구현 전 임시 렌더. 실제 데이터는 analyzeDiagnosis Server Action 결과로 교체 예정.)
      </p>
    </main>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-700">
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold">{Math.round(value)}</p>
    </div>
  );
}
