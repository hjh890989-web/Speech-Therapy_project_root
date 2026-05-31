"use client";

// SEC-COMP-PIPA (Grill #3A A1+A2) — PIPA 동의 폼 (Client Component).
//
// 책임:
//   - 두 체크박스 (PIPA 14세 미만 + 국외 이전) + 동의 버튼.
//   - 둘 다 체크되어야 버튼 활성화 (UI 가드 + Server Action 측에서도 재확인).
//   - savePrivacyConsent Server Action 호출 → 결과에 따라 success / error 안내.
//
// CON-04: 의료 단정 표현 금칙어 0건.
//
// R4 (자녀 보호):
//   - 본 폼은 부모 본인 row 의 timestamp 만 업데이트 — 자녀 식별 정보 무관.

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { savePrivacyConsent } from "@/app/actions/privacy-consent";

type Status = "idle" | "saving" | "success" | "error";

export interface PrivacyConsentFormProps {
  /** 페이지 진입 시점의 PIPA 동의 여부 (Server Component 가 전달). */
  initialPipaConsented: boolean;
  /** 페이지 진입 시점의 국외 이전 동의 여부. */
  initialOverseasConsented: boolean;
  /**
   * FR-Q-022 — 동의 흐름 진입 전 경로 (ConsentRedirectGate 가 ?next= 로 전달, sanitize 완료).
   * 동의 성공 시 이 경로로 복귀 (예: /chat → 동의 → /chat). null = 복귀 없이 success 표시만.
   */
  nextPath?: string | null;
}

export function PrivacyConsentForm({
  initialPipaConsented,
  initialOverseasConsented,
  nextPath,
}: PrivacyConsentFormProps) {
  const router = useRouter();
  const [pipa, setPipa] = useState<boolean>(initialPipaConsented);
  const [overseas, setOverseas] = useState<boolean>(initialOverseasConsented);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bothChecked = pipa && overseas;
  const canSubmit = bothChecked && status !== "saving";

  const handleSubmit = useCallback(async () => {
    if (!bothChecked) return;
    setStatus("saving");
    setErrorMessage(null);
    try {
      const result = await savePrivacyConsent({
        pipaUnderage: pipa,
        overseasTransfer: overseas,
      });
      if (result.success) {
        setStatus("success");
        // FR-Q-022 — 진입 전 경로(?next)가 있으면 복귀 (예: /chat 미동의 → 동의 → /chat).
        if (nextPath) {
          router.push(nextPath);
        }
      } else {
        setStatus("error");
        switch (result.reason) {
          case "unauthorized":
            setErrorMessage("로그인이 만료되었어요. 다시 로그인 후 시도해 주세요.");
            break;
          case "both_required":
            setErrorMessage("두 동의 모두 체크해 주세요.");
            break;
          case "db_failed":
            setErrorMessage("일시적인 오류로 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
            break;
          default:
            setErrorMessage("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
        }
      }
    } catch {
      setStatus("error");
      setErrorMessage("일시적인 오류로 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
  }, [bothChecked, pipa, overseas, nextPath, router]);

  return (
    <form
      data-testid="privacy-consent-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
      className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <fieldset className="space-y-4" disabled={status === "saving"}>
        <legend className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          동의 항목
        </legend>

        <label
          data-testid="privacy-consent-pipa-checkbox"
          className="flex items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <input
            type="checkbox"
            checked={pipa}
            onChange={(e) => setPipa(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="flex-1 text-sm">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              [필수] 만 14세 미만 자녀의 개인정보 처리에 동의합니다 (PIPA §22조 6항)
            </span>
            <span className="mt-1 block text-slate-600 dark:text-slate-400">
              자녀 (만 2~7세) 의 발화 텍스트 (transcript), 월령, 발달 점수 등 개인정보를
              Speech-Therapy 가 발달 가이드 목적으로 처리하는 데 법정대리인 (부모) 의
              동의가 필요해요.
            </span>
          </span>
        </label>

        <label
          data-testid="privacy-consent-overseas-checkbox"
          className="flex items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <input
            type="checkbox"
            checked={overseas}
            onChange={(e) => setOverseas(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="flex-1 text-sm">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              [필수] 개인정보 국외 이전에 동의합니다 (PIPA §17조)
            </span>
            <span className="mt-1 block text-slate-600 dark:text-slate-400">
              발화 텍스트와 발달 점수가 외부 AI 서비스로 이전돼요:
            </span>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-slate-600 dark:text-slate-400">
              <li>
                <strong>Google Cloud Speech (미국)</strong> — 음성 → 텍스트 변환 (Web
                Speech API 경유, 브라우저에서 직접 전송)
              </li>
              <li>
                <strong>Google AI Studio Gemini (미국 / 글로벌)</strong> — 부모용 안내
                문구 생성
              </li>
            </ul>
            <span className="mt-2 block text-slate-600 dark:text-slate-400">
              보존 기간: 각 서비스 정책에 따름 (Google 30일 임시 캐시 / Speech-Therapy
              transcript 보존). 동의 철회는 본 페이지 또는 계정 삭제로 가능.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {status === "success" ? (
          <p
            data-testid="privacy-consent-success"
            role="status"
            className="text-sm font-medium text-emerald-700 dark:text-emerald-300"
          >
            ✅ 동의가 저장되었어요.
          </p>
        ) : null}
        {status === "error" && errorMessage ? (
          <p
            data-testid="privacy-consent-error"
            role="alert"
            className="text-sm font-medium text-rose-700 dark:text-rose-300"
          >
            {errorMessage}
          </p>
        ) : null}
        <button
          type="submit"
          data-testid="privacy-consent-submit"
          disabled={!canSubmit}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          {status === "saving" ? "저장 중..." : "동의하고 저장"}
        </button>
      </div>
    </form>
  );
}
