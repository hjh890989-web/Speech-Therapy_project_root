// SEC-COMP-PIPA — 이용약관 (변호사 자문 반영 정식본).
//
// 변호사 단발 자문(Grill #3A C1) "문제 없음"(2026-05-30) 결과 반영 — 약관규제법 정식 구조.
// 본문은 docs/terms-of-service-draft.md(자문 검토본)의 승인본. 상호/시행일 등 사업자 고유 값은
// lib/company-info.ts(COMPANY_INFO) 단일 출처 — 확정 후 그 상수만 갱신하면 정식 시행으로 전환.

import Link from "next/link";
import { COMPANY_INFO, COMPANY_INFO_FINALIZED } from "@/lib/company-info";
import { enabledLiteracyGames } from "@/lib/literacy/registry";

export const metadata = {
  title: "이용약관 — Speech-Therapy",
  description:
    "Speech-Therapy 서비스 이용에 관한 약관 — 서비스 정의, 회원 의무, 만 14세 미만 부모 동의, 서비스 변경 및 종료 안내.",
};

export default function TermsOfServicePage() {
  // CR-2026-009 — 서비스 범위(연령·도메인) 문구를 현재 활성 기능과 일치시킨다.
  //   literacy 플래그 off(현재) → 만 2~7세 발음 문구 / on → 만 2~12세 발음+문해 문구.
  //   ⚠️ 확장 문구(on)는 약관 material change → literacy 플래그 on(공개 런치) 전 PIPA/의료기기
  //      변호사 재확인 필요(2026-05-30 자문은 만2-7 발음 기준). 정적 페이지=빌드 시점 평가.
  const literacyLive = enabledLiteracyGames().length > 0;
  return (
    <main
      data-testid="terms-of-service-page"
      className="mx-auto max-w-3xl px-4 py-8 sm:py-12"
    >
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">이용약관</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          변호사 자문 반영 정식본 · 시행일: {COMPANY_INFO.effectiveDate}
        </p>
      </header>

      {!COMPANY_INFO_FINALIZED && (
        <section
          aria-label="시행 안내"
          className="mb-6 rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200"
        >
          ℹ️ 본 약관은 변호사 자문을 거친 정식본이며, <strong>사업자 정보(상호)가 확정된 후
          정식 시행</strong>됩니다.
        </section>
      )}

      <article className="prose prose-slate max-w-none dark:prose-invert">
        <section>
          <h2>제1조 (목적)</h2>
          <p>
            본 약관은 {COMPANY_INFO.name}(이하 &ldquo;회사&rdquo;)이 제공하는 Speech-Therapy
            서비스(이하 &ldquo;서비스&rdquo;)의 이용 조건 및 회사와 회원 간의 권리·의무·책임
            사항을 규정함을 목적으로 해요.
          </p>
        </section>

        <section>
          <h2>제2조 (서비스의 정의 — 의료기기 아님)</h2>
          <ul>
            <li>
              {literacyLive
                ? "본 서비스는 만 2~7세 자녀의 발음 발달 확인과 만 2~12세 자녀의 읽기·말(문해) 놀이·연습을 부모(법정대리인)가 직접 도울 수 있도록 돕는 "
                : "본 서비스는 만 2~7세 자녀의 발음 발달을 부모(법정대리인)가 직접 확인·안내할 수 있도록 돕는 "}
              <strong>발달 가이드용 보조 도구</strong>예요.
            </li>
            <li>본 서비스는 <strong>의료기기가 아니며, 의료적 진단·치료·처방을 제공하지 않아요</strong>. 의학적 평가가 필요한 경우 의료기관을 방문해 주세요.</li>
            <li>발달 점수·또래 백분위 등 안내는 일반적인 발달 참고 자료이며, 개별 진단을 대체하지 않아요.</li>
          </ul>
        </section>

        <section>
          <h2>제3조 (회원가입 및 만 14세 미만 자녀의 부모 동의)</h2>
          <ul>
            <li>회원은 만 19세 이상의 부모 또는 법정대리인이어야 해요.</li>
            <li>만 14세 미만 자녀의 개인정보(음성→텍스트, 발달 점수)를 처리하기 위해 <strong>법정대리인(부모)의 명시적 동의</strong>가 필요해요(<Link href="/settings/privacy-consent" className="underline">/settings/privacy-consent</Link>).</li>
            <li>동의 없이는 자녀의 진단 결과를 처리·저장하지 않아요.</li>
          </ul>
        </section>

        <section>
          <h2>제4조 (국외 이전 동의)</h2>
          <p>
            본 서비스는 Google Cloud Speech(음성→텍스트, 미국)과 Google Gemini(안내 문구 생성,
            미국/글로벌)를 외부 AI 서비스로 사용해요. 자녀 발화 텍스트가 위 서비스로 이전되며,
            이전에 대한 별도 동의는{" "}
            <Link href="/settings/privacy-consent" className="underline">/settings/privacy-consent</Link>{" "}
            에서 받아요. 상세 항목은{" "}
            <Link href="/privacy" className="underline">개인정보 처리방침</Link> 제7조를 참고해 주세요.
          </p>
        </section>

        <section>
          <h2>제5조 (회원의 의무)</h2>
          <ul>
            <li>본 서비스를 의료적 진단·처방 목적으로 활용하지 않아요.</li>
            <li>자녀의 발화 데이터를 임의로 타인에게 공유·판매하지 않아요.</li>
            <li>다른 회원의 데이터를 무단 조회하지 않아요.</li>
            <li>서비스의 정상 운영을 방해하는 행위를 하지 않아요.</li>
          </ul>
        </section>

        <section>
          <h2>제6조 (서비스 제공의 중단)</h2>
          <p>
            회사는 외부 인프라(Vercel/Supabase/외부 AI)의 장애, 천재지변 등 불가항력 사유로
            서비스 제공을 일시 중단할 수 있어요. 중단 시 7일 전 사전 안내를 원칙으로 하되, 긴급한
            경우 사후 안내해요.
          </p>
        </section>

        <section>
          <h2>제7조 (책임의 한계)</h2>
          <ul>
            <li>본 서비스의 발달 점수·안내는 의료적 판단을 제공하지 않으므로, 자녀의 발음 발달에 관한 의료적 결정은 의료기관 진료를 통해 내려 주세요.</li>
            <li>회사는 회원이 <strong>본 서비스 결과만을 근거로 내린 자녀의 의료적 의사결정</strong>에 대해 책임을 지지 않아요.</li>
            <li>회사는 관련 법령에 특별한 규정이 없는 한, 무료로 제공되는 서비스의 이용과 관련하여 책임을 지지 않아요.</li>
          </ul>
        </section>

        <section>
          <h2>제8조 (B2B 기관 이용)</h2>
          <p>
            어린이집·유치원 등 기관(원장/교사)이 자녀를 일괄 등록하는 경우, 회사는 부모의
            동의를 확인한 자녀에 한하여 데이터를 처리해요.
          </p>
        </section>

        <section>
          <h2>제9조 (약관의 변경)</h2>
          <p>
            본 약관은 관련 법령·자문 결과 등에 따라 개정될 수 있으며, 중요한 변경 시 시행 7일 전
            회원에게 이메일로 안내해요.
          </p>
          <ul>
            <li>{COMPANY_INFO.effectiveDate}: 변호사 자문 반영 정식 시행.</li>
            <li>2026-05-27: 초기(placeholder) 버전.</li>
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
