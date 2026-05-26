// SEC-COMP-PIPA — 이용약관 페이지 (placeholder 1차).
//
// ⚠️ 본 페이지는 *임시 (placeholder)* 버전입니다.
// 정식 출시 전 변호사 단발 자문 (Grill #3A 트랙 C1) 결과를 반영한 최종 버전으로 교체 예정.

import Link from "next/link";

export const metadata = {
  title: "이용약관 — Speech-Therapy",
  description:
    "Speech-Therapy 서비스 이용에 관한 약관 — 서비스 정의, 회원 의무, 만 14세 미만 부모 동의, 서비스 변경 및 종료 안내.",
};

export default function TermsOfServicePage() {
  return (
    <main
      data-testid="terms-of-service-page"
      className="mx-auto max-w-3xl px-4 py-8 sm:py-12"
    >
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">이용약관</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          최종 개정일: 2026-05-27 (placeholder 버전 — 변호사 자문 후 최종 교체 예정)
        </p>
      </header>

      <section
        aria-label="placeholder 안내"
        className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
      >
        ⚠️ <strong>임시 (placeholder) 버전입니다.</strong> 정식 출시 전 변호사 자문
        결과를 반영한 최종 버전으로 교체될 예정이에요.
      </section>

      <article className="prose prose-slate max-w-none dark:prose-invert">
        <section>
          <h2>제1조 (목적)</h2>
          <p>
            본 약관은 Speech-Therapy (이하 &ldquo;서비스&rdquo;) 의 이용 조건 및 회사와
            회원 간의 권리 / 의무를 규정함을 목적으로 해요.
          </p>
        </section>

        <section>
          <h2>제2조 (서비스의 정의 — 의료기기 아님)</h2>
          <ul>
            <li>
              본 서비스는 <strong>만 2~7세 자녀의 발음 발달을 부모가 확인 / 안내할 수
              있는 보조 도구</strong>예요.
            </li>
            <li>
              본 서비스는 <strong>의료기기가 아니며, 의료적 진단 / 치료 / 처방을
              제공하지 않아요</strong>. 의학적 평가가 필요한 경우 의료기관을 방문해
              주세요.
            </li>
            <li>
              본 서비스의 발달 점수 / 또래 백분위 등 안내는 일반적인 발달 가이드일 뿐,
              개별 진단을 대체하지 않아요.
            </li>
          </ul>
        </section>

        <section>
          <h2>제3조 (회원가입 및 만 14세 미만 자녀의 부모 동의)</h2>
          <ul>
            <li>회원은 만 19세 이상의 부모 또는 법정대리인이어야 해요.</li>
            <li>
              만 14세 미만 자녀의 개인정보 (음성 → 텍스트 / 발달 점수) 를 처리하기
              위해 <strong>법정대리인 (부모) 의 명시적 동의</strong>가 필요해요.
              동의는{" "}
              <Link href="/settings/privacy-consent" className="underline">
                /settings/privacy-consent
              </Link>{" "}
              에서 체크 후 저장하실 수 있어요.
            </li>
            <li>
              동의 없이는 자녀의 진단 결과를 처리 / 저장하지 않아요.
            </li>
          </ul>
        </section>

        <section>
          <h2>제4조 (국외 이전 동의)</h2>
          <p>
            본 서비스는 Google Cloud Speech (음성 → 텍스트, 미국) 과 Google Gemini
            (부모용 안내 문구 생성, 미국 / 글로벌) 을 외부 AI 서비스로 사용해요. 자녀
            발화 텍스트는 위 서비스로 이전되며, 이전에 대한 별도 동의는{" "}
            <Link href="/settings/privacy-consent" className="underline">
              /settings/privacy-consent
            </Link>{" "}
            에서 받아요. 자세한 항목은{" "}
            <Link href="/privacy" className="underline">
              개인정보 처리방침
            </Link>{" "}
            §6 을 참고해 주세요.
          </p>
        </section>

        <section>
          <h2>제5조 (회원의 의무)</h2>
          <ul>
            <li>본 서비스를 의료적 진단 / 처방 목적으로 활용하지 않아요.</li>
            <li>자녀의 발화 데이터를 임의로 타인에게 공유 / 판매하지 않아요.</li>
            <li>다른 회원의 데이터를 무단으로 조회하지 않아요.</li>
          </ul>
        </section>

        <section>
          <h2>제6조 (서비스 제공의 중단)</h2>
          <p>
            회사는 Vercel / Supabase / 외부 AI 서비스의 일시 장애, 자연재해 등 불가항력
            사유로 서비스 제공을 중단할 수 있어요. 중단 시 사전 안내 (7일 전) 를 원칙으로
            하되, 긴급 시 사후 안내해요.
          </p>
        </section>

        <section>
          <h2>제7조 (책임의 한계)</h2>
          <p>
            본 서비스의 발달 점수 / 안내는 의료적 판단을 제공하지 않으므로, 자녀의 발음
            발달에 대한 의료적 결정은 의료기관 진료를 통해 결정해 주세요. 회사는 본
            서비스 결과만을 근거로 한 자녀의 의료적 의사결정에 대해 책임을 지지 않아요.
          </p>
        </section>

        <section>
          <h2>제8조 (약관의 변경)</h2>
          <p>
            본 약관은 PIPA / 의료기기법 / 변호사 자문 결과 등에 따라 개정될 수 있어요.
            중요 변경 시 7일 전 회원에게 이메일 안내해요.
          </p>
        </section>

        <section>
          <h2>개정 이력</h2>
          <ul>
            <li>2026-05-27: placeholder 버전 (Grill #3A 컴플라이언스 sub-session)</li>
          </ul>
        </section>
      </article>

      <nav className="mt-8">
        <Link
          href="/settings/privacy-consent"
          className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← 개인정보 동의 페이지로 돌아가기
        </Link>
      </nav>
    </main>
  );
}
