// FR-Q-021 — F11 부모 음성 녹음 페이지 (V07 §4.1 F11).
//
// 책임:
//   - 인증 user 만 접근 (익명 미허용 — RBAC + PIPA 가드).
//   - 권한 안내 + Disclaimer + 5분~30초 녹음 가이드.
//   - 명시적 동의 체크박스 — submit_voice_clone 의 consentGiven=true 강제.
//   - VoiceRecordingForm Client Component 가 실제 MediaRecorder + Server Action 호출.
//
// CON-04: "치료" / "진단" / "장애" / "환자" 등 금칙어 0건.
// R4: 자녀 식별 정보 미노출 — 부모용 페이지.
// ADR-03: 7일 폐기 명시 안내.
// ADR-09: 동화 / 자장가 한정 적용 명시 안내.
//
// Refs: TASK_FR-Q-021.md, V07 §4.1 F11.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { VoiceRecordingForm } from "@/components/voice-clone/VoiceRecordingForm";

export const metadata = {
  title: "부모 음성 녹음 — Speech-Therapy",
  description:
    "부모의 목소리로 동화와 자장가를 재생합니다. 음성은 7일 후 자동 삭제되며, 발음 가이드용 용도로는 사용되지 않습니다.",
};

export const dynamic = "force-dynamic";

export default async function VoiceRecordingPage() {
  // 인증 확인 — 익명 / 미로그인 user 차단.
  let userId: string | undefined;
  try {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id;
  } catch {
    /* env 미설정 — 익명 폴백 차단 */
  }
  if (!userId) {
    redirect("/login?next=%2Fvoice-recording");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">부모 음성 녹음</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          부모의 목소리로 자녀가 즐길 수 있는 동화와 자장가를 재생할 수 있어요.
        </p>
      </header>

      {/* 안내 카드 — ADR-03 (7일 폐기) + ADR-09 (윤리 차단) 명시 */}
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <h2 className="font-medium text-amber-900">사용 안내 (꼭 확인해 주세요)</h2>
        <ul className="mt-3 space-y-2 text-amber-900">
          <li>
            <strong>적용 범위:</strong> 동화 (storybook) 와 자장가 (lullaby) 콘텐츠 만 부모 목소리로
            재생돼요. 발음 가이드와 같은 학습 콘텐츠에는 시스템 기본 음성이 그대로 사용돼요.
          </li>
          <li>
            <strong>보관 기간:</strong> 부모 음성 데이터는 등록 후{" "}
            <strong className="font-semibold">7일</strong> 뒤 자동으로 삭제돼요. 다시 사용하려면 다시
            녹음해 주세요.
          </li>
          <li>
            <strong>녹음 가이드:</strong> 조용한 환경에서 5분~30초 분량의 음성을 녹음해 주세요.
            평소 자녀에게 책을 읽어주듯 자연스럽게 말씀해 주시면 좋아요.
          </li>
          <li>
            <strong>국외 전송:</strong> 음성 데이터는 ElevenLabs (미국) 의 외부 API 로 전송돼요.
            진단 시 확인하신 국외 이전 동의에 포함된 절차입니다.
          </li>
        </ul>
        <p className="mt-3 text-xs text-amber-800">
          본 서비스는 의료기기가 아니며, 의학적 평가가 아닌 발달 안내 용도예요. 자세한 내용은{" "}
          <Link href="/privacy" className="underline">
            개인정보 처리방침
          </Link>{" "}
          및{" "}
          <Link href="/terms" className="underline">
            이용약관
          </Link>{" "}
          을 참고해 주세요.
        </p>
      </section>

      <section className="mt-8">
        <VoiceRecordingForm />
      </section>
    </main>
  );
}
