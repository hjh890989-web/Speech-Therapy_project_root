// SEC-COMP-PIPA — 개인정보 처리방침 (변호사 자문 반영 정식본).
//
// 변호사 단발 자문(Grill #3A C1) "문제 없음"(2026-05-30) 결과 반영 — PIPA §30 정식 구조.
// 본문은 docs/privacy-policy-draft.md(자문 검토본)의 승인본. 상호/책임자 등 사업자 고유 값은
// lib/company-info.ts(COMPANY_INFO) 단일 출처 — 확정 후 그 상수만 갱신하면 정식 시행으로 전환.

import Link from "next/link";
import { COMPANY_INFO, COMPANY_INFO_FINALIZED } from "@/lib/company-info";
import { enabledLiteracyGames } from "@/lib/literacy/registry";

export const metadata = {
  title: "개인정보 처리방침 — Speech-Therapy",
  description:
    "Speech-Therapy 가 수집·이용하는 개인정보의 항목, 목적, 보유 기간, 위탁, 국외 이전, 권리 행사 절차를 안내합니다.",
};

export default function PrivacyPolicyPage() {
  // CR-2026-009 — 서비스 범위 문구를 현재 활성 기능과 일치(off=만2-7 발음 / on=만2-12 발음+문해).
  //   ⚠️ 확장 문구는 literacy 플래그 on 전 PIPA/의료기기 변호사 재확인 필요. 정적=빌드 시점 평가.
  const literacyLive = enabledLiteracyGames().length > 0;
  return (
    <main
      data-testid="privacy-policy-page"
      className="mx-auto max-w-3xl px-4 py-8 sm:py-12"
    >
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">개인정보 처리방침</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          변호사 자문 반영 정식본 · 시행일: {COMPANY_INFO.effectiveDate}
        </p>
      </header>

      {!COMPANY_INFO_FINALIZED && (
        <section
          aria-label="시행 안내"
          className="mb-6 rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200"
        >
          ℹ️ 본 방침은 변호사 자문을 거친 정식본이며, <strong>사업자 정보(상호·개인정보
          보호책임자)가 확정된 후 정식 시행</strong>됩니다.
        </section>
      )}

      <article className="prose prose-slate max-w-none dark:prose-invert">
        <section>
          <h2>제1조 (총칙)</h2>
          <p>
            {COMPANY_INFO.name}(이하 &ldquo;회사&rdquo;)은 「개인정보 보호법」 및 관련 법령을
            준수하며, Speech-Therapy 서비스(이하 &ldquo;서비스&rdquo;)를 이용하는 정보주체의
            개인정보를 보호하기 위해 본 방침을 수립·공개해요.{" "}
            {literacyLive
              ? "본 서비스는 만 2~7세 자녀의 발음 발달 확인과 만 2~12세 자녀의 읽기·말(문해) 놀이·연습을 부모(법정대리인)가 직접 도울 수 있도록 돕는 발달 가이드용 보조 도구이며,"
              : "본 서비스는 만 2~7세 자녀의 발음 발달을 부모(법정대리인)가 직접 확인·안내할 수 있도록 돕는 발달 가이드용 보조 도구이며,"}
            <strong> 의료기기가 아니에요</strong>(의료적 진단·치료·처방 미제공).
          </p>
        </section>

        <section>
          <h2>제2조 (수집하는 개인정보 항목)</h2>
          <ul>
            <li><strong>회원 정보</strong>: 이메일(인증), 자녀 월령(만 24~144개월), 관심 음소(선택)</li>
            <li><strong>발화 데이터</strong>: 자녀 발화의 음성→텍스트 변환 결과(transcript), 발달 점수(조음/언어/음향, 0~100), 또래 백분위</li>
            <li><strong>자동 수집</strong>: 익명 사용자 ID(cookie·localStorage), IP 주소(감사 로그), User-Agent</li>
            <li><strong>B2B 기관 정보</strong>(해당 시): 기관명, 원장/교사 이메일, 반 정보</li>
          </ul>
          <p>
            자녀의 <strong>이름·생년월일·주소·연락처는 수집하지 않으며</strong>, 연령은 월령으로만
            처리해요. <strong>음성 원본(raw audio)은 서버에 저장하지 않아요</strong>(클라이언트 측
            음성→텍스트 변환 후 텍스트만 수신).
          </p>
        </section>

        <section>
          <h2>제3조 (수집·이용 목적)</h2>
          <ul>
            <li>자녀의 발음 발달 확인 및 가이드 안내 제공(의료적 진단·치료 아님)</li>
            <li>회원 인증, 본인 식별, 부정 이용 방지</li>
            <li>주간 발달 추이 리포트 생성 및 발송</li>
            <li>서비스 품질 개선을 위한 통계 분석(개인 식별 정보 제거 후 집계)</li>
            <li>법령상 의무 이행 및 분쟁 대응(감사 로그)</li>
          </ul>
        </section>

        <section>
          <h2>제4조 (만 14세 미만 자녀의 개인정보 처리 — PIPA §22조의6)</h2>
          <p>
            본 서비스는 만 14세 미만 자녀의 개인정보(음성→텍스트, 발달 점수 등)를 처리하기 위해
            <strong> 법정대리인(부모)의 동의</strong>를 받아요. 동의 없이는 자녀의 개인정보를
            처리·저장하지 않아요. 동의는 회원가입 또는{" "}
            <Link href="/settings/privacy-consent" className="underline">/settings/privacy-consent</Link>{" "}
            에서, 익명 이용 시 진단 페이지의 필수 체크박스로 받아요.
          </p>
        </section>

        <section>
          <h2>제5조 (보유·이용 기간 및 파기)</h2>
          <ul>
            <li>회원 정보: 회원 탈퇴 시 즉시 파기</li>
            <li>발화 transcript / 발달 점수: 회원 탈퇴 또는 동의 철회 시 즉시 파기</li>
            <li>음성 원본: <strong>저장하지 않음</strong>(추후 음성 저장 기능 활성 시 7일 자동 폐기)</li>
            <li>감사 로그(AuditLog): 관련 법령상 정황 보존 기간 동안 보관</li>
          </ul>
          <p>파기 방법: 전자적 파일은 복구 불가능한 방법으로 영구 삭제해요.</p>
        </section>

        <section>
          <h2>제6조 (개인정보 처리위탁 — PIPA §26)</h2>
          <ul>
            <li><strong>Supabase</strong>(미국/글로벌) — 데이터베이스·인증 호스팅</li>
            <li><strong>Vercel</strong>(미국) — 웹 호스팅·서버리스 실행</li>
            <li><strong>Resend</strong>(미국) — 트랜잭션 이메일 발송</li>
            <li><strong>Google</strong>(AI Studio Gemini / Cloud Speech, 미국/글로벌) — 음성→텍스트 변환·안내 문구 생성</li>
          </ul>
        </section>

        <section>
          <h2>제7조 (개인정보 국외 이전)</h2>
          <p>
            발화 텍스트 및 메타데이터는 다음 국외 서비스로 이전되며, 회사는 이에 대해 별도 동의를
            받아요(<Link href="/settings/privacy-consent" className="underline">/settings/privacy-consent</Link>).
            이전받는 자·국가·항목·목적·보유 기간·거부 방법은 PIPA 에 따라 고지해요.
          </p>
          <ul>
            <li><strong>Google Cloud Speech</strong>(미국) — 음성→텍스트 변환(브라우저에서 직접 이전, 본 서버 미경유)</li>
            <li><strong>Google AI Studio Gemini</strong>(미국/글로벌) — PII 마스킹된 발화 텍스트로 안내 문구 생성</li>
            <li><strong>Supabase / Vercel / Resend</strong>(미국) — 호스팅·이메일 발송</li>
          </ul>
          <p>국외 이전 동의를 거부할 수 있으며, 이 경우 일부 서비스 이용이 제한될 수 있어요.</p>
        </section>

        <section>
          <h2>제8조 (정보주체의 권리·행사 방법)</h2>
          <ul>
            <li>개인정보 열람·정정·삭제·처리정지 요구</li>
            <li>계정 삭제: <Link href="/settings/account" className="underline">/settings/account</Link> 의 &ldquo;계정 삭제&rdquo;(즉시 처리, 잊혀질 권리 호환)</li>
            <li>데이터 다운로드: <Link href="/settings/account" className="underline">/settings/account</Link> 의 &ldquo;데이터 다운로드&rdquo;</li>
            <li>동의 철회: <Link href="/settings/privacy-consent" className="underline">/settings/privacy-consent</Link> 또는 계정 삭제</li>
          </ul>
        </section>

        <section>
          <h2>제9조 (개인정보의 안전성 확보 조치 — PIPA §29)</h2>
          <ul>
            <li>접근 통제: 사용자별 데이터 격리(익명 ID 또는 인증 user id 기준), 서버 측 접근 권한 강제</li>
            <li>전송 구간 암호화(TLS 1.2 이상)</li>
            <li>외부 AI 전송 전 PII 마스킹(주민등록번호/신용카드/이메일/전화번호/URL/IP/상세주소)</li>
            <li>접속 기록 보관 및 위·변조 방지(감사 로그)</li>
          </ul>
        </section>

        <section>
          <h2>제10조 (개인정보 보호책임자 및 권익침해 구제)</h2>
          <ul>
            <li>개인정보 보호책임자: {COMPANY_INFO.privacyOfficer}</li>
            <li>연락처: {COMPANY_INFO.privacyOfficerContact}</li>
          </ul>
          <p>
            권익침해 구제는 개인정보분쟁조정위원회, 개인정보보호위원회, 경찰청 사이버수사국 등에
            문의하실 수 있어요.
          </p>
        </section>

        <section>
          <h2>제11조 (개정)</h2>
          <p>
            본 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 중요한 변경 시 시행 7일 전
            고지해요.
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
