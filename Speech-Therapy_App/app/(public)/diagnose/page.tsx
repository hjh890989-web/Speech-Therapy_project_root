// FR-Q-001 — 무로그인 5분 발음 확인 SSR 페이지 (Server Component).
// REQ-FUNC-008~010, REQ-NF-003. Disclaimer 페이지 상단+하단 노출.
// CON-04 UI 카피 금칙어 0건: "발음 확인 / 발달 단계 / 부모 안내" 등 비의료 표현 사용.

import { DiagnosisForm } from "./DiagnosisForm";

export const metadata = {
  title: "5분 발음 확인 — Speech-Therapy",
  description:
    "회원가입 없이 5분 안에 아이의 발음 발달 상태를 부모님께 안내해 드려요. 의료적 평가가 아닌 발달 확인용 보조 도구입니다.",
};

export default function DiagnosePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* 상단 Disclaimer */}
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 서비스는 의료적 평가를 제공하지 않으며, 부모님께 발달 확인 정보를 안내하기 위한
        보조 도구입니다.
      </p>

      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">5분 발음 확인</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          회원가입 없이 5분 안에 아이의 발음 발달 단계를 또래와 비교해 확인할 수 있어요.
        </p>
      </header>

      <DiagnosisForm />

      {/* 하단 Disclaimer */}
      <p
        data-testid="disclaimer"
        className="mt-10 rounded-md border border-gray-200 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400"
      >
        본 결과는 의료적 평가가 아니며, 발달이 우려되는 경우 전문가 상담을 권장합니다.
      </p>
    </main>
  );
}
