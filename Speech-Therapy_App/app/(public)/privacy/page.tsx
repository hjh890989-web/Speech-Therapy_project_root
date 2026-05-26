// SEC-COMP-PIPA — 개인정보 처리방침 페이지 (placeholder 1차).
//
// ⚠️ 본 페이지는 *임시 (placeholder)* 버전입니다.
// 정식 출시 전 변호사 단발 자문 (Grill #3A 트랙 C1) 결과를 반영한 최종 버전으로 교체 예정.
//
// 참고: PIPA 제30조 1항 — 공개해야 하는 항목 (수집 항목 / 목적 / 보유 기간 /
// 처리위탁 / 국외 이전 / 권리 행사 절차 / 책임자 연락처) 모두 본 placeholder 에 골격 포함.

import Link from "next/link";

export const metadata = {
  title: "개인정보 처리방침 — Speech-Therapy",
  description:
    "Speech-Therapy 가 수집·이용하는 개인정보의 항목, 목적, 보유 기간, 위탁, 국외 이전, 권리 행사 절차를 안내합니다.",
};

export default function PrivacyPolicyPage() {
  return (
    <main
      data-testid="privacy-policy-page"
      className="mx-auto max-w-3xl px-4 py-8 sm:py-12"
    >
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">개인정보 처리방침</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          최종 개정일: 2026-05-27 (placeholder 버전 — 변호사 자문 후 최종 교체 예정)
        </p>
      </header>

      <section
        aria-label="placeholder 안내"
        className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
      >
        ⚠️ <strong>임시 (placeholder) 버전입니다.</strong> 정식 출시 전 변호사 자문
        결과를 반영한 최종 버전으로 교체될 예정이며, 본 내용은 골격만 제공해요.
      </section>

      <article className="prose prose-slate max-w-none dark:prose-invert">
        <section>
          <h2>1. 수집·이용하는 개인정보 항목</h2>
          <ul>
            <li>
              <strong>회원 정보</strong>: 이메일 (인증), 자녀 월령 (만 24~84개월),
              관심 음소 (선택)
            </li>
            <li>
              <strong>발화 데이터</strong>: 자녀 발화의 음성 → 텍스트 변환 결과
              (transcript), 발달 점수 (조음 / 언어 / 음향, 0~100), 또래 백분위
            </li>
            <li>
              <strong>자동 수집</strong>: 익명 사용자 ID (cookie + localStorage),
              IP 주소 (감사 로그), User-Agent
            </li>
            <li>
              <strong>B2B 기관 정보</strong> (해당 시): 기관명, 원장 이메일, 반 정보
            </li>
          </ul>
        </section>

        <section>
          <h2>2. 수집·이용 목적</h2>
          <ul>
            <li>자녀의 발음 발달 확인 및 가이드 안내 제공 (의료적 진단 / 치료 아님)</li>
            <li>회원 인증, 본인 식별, 부정 이용 방지</li>
            <li>주간 발달 추이 리포트 생성 및 발송</li>
            <li>서비스 품질 개선을 위한 통계 분석 (개인 식별 제거 후)</li>
          </ul>
        </section>

        <section>
          <h2>3. 만 14세 미만 자녀의 개인정보 처리 (PIPA §22조 6항)</h2>
          <p>
            본 서비스는 만 14세 미만 자녀의 개인정보를 처리하기 위해
            <strong> 법정대리인 (부모) 의 동의</strong>를 받아요. 동의는 회원가입 또는
            <Link href="/settings/privacy-consent" className="underline">
              /settings/privacy-consent
            </Link>{" "}
            에서 직접 체크해 주세요. 자녀 본인의 개인정보 (음성 → 텍스트 / 발달 점수)
            는 법정대리인의 동의 없이 처리되지 않아요.
          </p>
        </section>

        <section>
          <h2>4. 보유·이용 기간</h2>
          <ul>
            <li>회원 정보: 회원 탈퇴 시 즉시 파기</li>
            <li>발화 transcript / 발달 점수: 회원 탈퇴 또는 동의 철회 시 즉시 파기</li>
            <li>
              음성 원본: <strong>저장하지 않음</strong> (Sprint 1 D6 정책 — 클라이언트 측 STT
              결과 텍스트만 서버 수신). 추후 음성 저장 활성 시 <strong>7일 자동 폐기</strong>
              (audio-cleanup cron).
            </li>
            <li>감사 로그 (AuditLog): 3년 보관 (전자금융거래법 / PIPA 정황 보존)</li>
          </ul>
        </section>

        <section>
          <h2>5. 개인정보 처리위탁</h2>
          <ul>
            <li>
              <strong>Supabase (미국 / 글로벌)</strong> — 데이터베이스 / 인증 호스팅
            </li>
            <li>
              <strong>Vercel (미국)</strong> — 웹 호스팅 / 서버리스 함수 실행
            </li>
            <li>
              <strong>Resend (미국)</strong> — 트랜잭션 이메일 발송
            </li>
          </ul>
        </section>

        <section>
          <h2>6. 개인정보 국외 이전 (PIPA §17조)</h2>
          <p>
            다음 외부 AI 서비스로 발화 텍스트 (transcript) / 메타데이터가 이전돼요.
            본 이전은{" "}
            <Link href="/settings/privacy-consent" className="underline">
              /settings/privacy-consent
            </Link>{" "}
            에서 별도 동의를 받아요:
          </p>
          <ul>
            <li>
              <strong>Google Cloud Speech (미국)</strong> — Chrome 의 Web Speech API
              경유, 음성 → 텍스트 변환 목적. 본 서버 미경유 (브라우저에서 직접 이전).
            </li>
            <li>
              <strong>Google AI Studio Gemini (미국 / 글로벌)</strong> — 부모용 안내
              문구 생성. 발화 텍스트는{" "}
              <Link href="/settings/privacy-consent" className="underline">
                동의 후
              </Link>{" "}
              PII 마스킹 (lib/ai/pii-mask.ts) 적용 후 전송.
            </li>
          </ul>
          <p>
            이전 국가, 일시, 항목, 목적, 보유 기간, 거부 방법은 PIPA §17조에 따라 동의 받아요.
          </p>
        </section>

        <section>
          <h2>7. 정보주체의 권리</h2>
          <ul>
            <li>개인정보 열람 / 정정 / 삭제 / 처리정지 요구</li>
            <li>
              계정 삭제: <Link href="/settings/account" className="underline">/settings/account</Link>{" "}
              의 &ldquo;계정 삭제&rdquo; 버튼으로 즉시 처리 (GDPR 잊혀질 권리 호환).
            </li>
            <li>
              데이터 다운로드: <Link href="/settings/account" className="underline">/settings/account</Link>{" "}
              의 &ldquo;데이터 다운로드&rdquo; 버튼.
            </li>
          </ul>
        </section>

        <section>
          <h2>8. 개인정보 보호 책임자</h2>
          <p>placeholder — 정식 출시 전 책임자 이름 / 이메일 / 연락처 명시 예정.</p>
        </section>

        <section>
          <h2>9. 개정 이력</h2>
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
