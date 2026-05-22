// REQ-FUNC-007 잔여 (#106) — SPL 환경 소음 보정 페이지 (Server Component shell).
//
// 페이지 책임:
//   - 헤더 / 설명 / 안내 카피 (SSR-friendly).
//   - 실제 측정 + localStorage 저장 UI 는 SplCalibrationWizard (Client Component) 로 분리.
//   - CON-04 금칙어 ("치료/진단/장애") 0건 — "환경 소음", "발음 확인" 등 비의료 표현만.
//
// 경로: /settings/calibration — Settings 진입점 (향후 /settings 인덱스 추가 시 통합).

import Link from "next/link";

import { SplCalibrationWizard } from "@/components/SplCalibrationWizard";

export const metadata = {
  title: "환경 소음 보정 — Speech-Therapy",
  description:
    "디바이스에 맞춘 환경 소음 보정으로 발음 확인 알림의 정확도를 높여요. 측정 데이터는 외부에 저장되지 않습니다.",
};

export default function CalibrationSettingsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <p
        data-testid="disclaimer"
        className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        측정값은 본 기기에만 저장되며 외부로 전송되지 않아요. 의료적 평가가 아닌 보조 도구입니다.
      </p>

      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">환경 소음 보정</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          정확한 알림을 위해 한 번만 측정해 주세요. 측정은 5초가 걸려요.
        </p>
      </header>

      <SplCalibrationWizard />

      <nav className="mt-10 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/diagnose" className="underline hover:text-gray-900 dark:hover:text-gray-100">
          발음 확인으로 돌아가기
        </Link>
        <Link href="/missions" className="underline hover:text-gray-900 dark:hover:text-gray-100">
          오늘의 미션 보기
        </Link>
      </nav>
    </main>
  );
}
