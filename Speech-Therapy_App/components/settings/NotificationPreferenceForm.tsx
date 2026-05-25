"use client";

// FR-C-NOTIFICATION-PREFERENCE — /settings/notifications 알림 선호 폼 (Client Component).
//
// 책임:
//   - 4종 알림 종류별 토글 (체크박스) 렌더 + 사용자 변경 캡처.
//   - "저장" 버튼 → updateNotificationPreference Server Action 호출.
//   - 결과 상태 — idle / saving / success / error UI.
//   - 성공 시 토스트 + trackEvent("notification_preference_updated", { userId, changed }) 1회.
//
// 부모 인터랙션 (자녀 친화 카피 불필요하지만 의료 표현 금지):
//   - "주간 리뷰" / "쿠션어 알림장" / "동의서 리마인더" / "부모 초대" 비의료 표현.
//
// CON-04: 본 컴포넌트의 모든 UI / aria-label / 주석에 "치료/진단/장애" 금칙어 0건.
//
// R4 (자녀 보호):
//   - userId 는 분석 백엔드 자동 해시 가정 — UI 자체는 userId 미노출.
//   - properties 의 changed 는 알림 종류 _이름_ 배열만 — raw 값 미노출.

import { useCallback, useMemo, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import {
  NOTIFICATION_PREFERENCE_KEYS,
  type NotificationPreference,
  type NotificationPreferenceKey,
} from "@/lib/notifications/preference";
import { updateNotificationPreference } from "@/app/actions/update-notification-preference";

/** prefill 입력 — Server Component (page.tsx) 가 preference helper 호출 후 전달. */
export interface NotificationPreferenceFormProps {
  /** getNotificationPreference 결과 (DEFAULTS 폴백 포함). */
  initialPreference: NotificationPreference;
}

/** 저장 상태 머신. */
type SaveStatus = "idle" | "saving" | "success" | "error";

/** 토글 UI 라벨 — CON-04 금칙어 0건. */
interface ToggleLabel {
  key: NotificationPreferenceKey;
  title: string;
  description: string;
  testId: string;
}

const TOGGLE_LABELS: ReadonlyArray<ToggleLabel> = [
  {
    key: "weeklyReportEmail",
    title: "주간 리뷰 이메일",
    description: "한 주 동안의 자녀 활동 요약을 매주 일요일에 받아요.",
    testId: "notification-toggle-weeklyReportEmail",
  },
  {
    key: "cushionNoteEmail",
    title: "쿠션어 알림장 이메일",
    description: "원장이 보낸 칭찬 알림장을 이메일로 받아요.",
    testId: "notification-toggle-cushionNoteEmail",
  },
  {
    key: "consentReminderEmail",
    title: "동의서 리마인더 이메일",
    description: "동의서 미서명 시 며칠 뒤에 리마인더를 받아요.",
    testId: "notification-toggle-consentReminderEmail",
  },
  {
    key: "parentInviteEmail",
    title: "부모 초대 이메일",
    description: "기관에서 보낸 부모 초대 / 안내 메일을 받아요.",
    testId: "notification-toggle-parentInviteEmail",
  },
];

export function NotificationPreferenceForm({
  initialPreference,
}: NotificationPreferenceFormProps) {
  const initial = useMemo(
    () => ({ ...initialPreference }),
    [initialPreference],
  );

  const [preference, setPreference] = useState<NotificationPreference>(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggle = useCallback((key: NotificationPreferenceKey) => {
    setPreference((prev) => ({ ...prev, [key]: !prev[key] }));
    // 사용자가 다시 편집 시작 → 이전 success / error 상태 reset (혼동 방지).
    setStatus((prev) => (prev === "saving" ? prev : "idle"));
    setErrorMessage(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setStatus("saving");
    setErrorMessage(null);

    // 사용자가 _변경한_ 키만 Partial 로 전달 — 서버 측 분석 changed 산출과 정합.
    const diff: Partial<NotificationPreference> = {};
    for (const key of NOTIFICATION_PREFERENCE_KEYS) {
      if (preference[key] !== initial[key]) {
        diff[key] = preference[key];
      }
    }

    // 변경 사항 0건 — 굳이 서버 호출하지 않고 UI 만 success 표시 (UX 단순화).
    if (Object.keys(diff).length === 0) {
      setStatus("success");
      return;
    }

    try {
      const result = await updateNotificationPreference(diff);
      if (!result.success) {
        setStatus("error");
        setErrorMessage(result.message);
        return;
      }
      // 서버가 normalize 한 최종 값으로 UI 동기화 (외부 변경 / 서버 측 sanitize 반영).
      setPreference(result.preference);
      // 분석 이벤트 — R4: userId 는 분석 백엔드 자동 해시 가정. changed 는 키 라벨만.
      trackEvent("notification_preference_updated", {
        userId: result.analytics.userId,
        changed: result.analytics.changed,
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    }
  }, [preference, initial]);

  const isSaving = status === "saving";
  const showSuccessToast = status === "success";

  return (
    <form
      data-testid="notification-preference-form"
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <legend className="text-base font-semibold text-slate-900 dark:text-slate-100">
          이메일 알림 항목
        </legend>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {TOGGLE_LABELS.map((label) => {
            const checked = preference[label.key];
            const inputId = `notification-toggle-input-${label.key}`;
            return (
              <li
                key={label.key}
                className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex-1">
                  <label
                    htmlFor={inputId}
                    className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {label.title}
                  </label>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {label.description}
                  </p>
                </div>
                <input
                  id={inputId}
                  data-testid={label.testId}
                  type="checkbox"
                  role="switch"
                  checked={checked}
                  disabled={isSaving}
                  onChange={() => handleToggle(label.key)}
                  aria-label={`${label.title} 수신 여부`}
                  aria-checked={checked}
                  className="mt-1 h-5 w-5 cursor-pointer accent-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                />
              </li>
            );
          })}
        </ul>
      </fieldset>

      {/* ---- 에러 메시지 ---- */}
      {status === "error" && errorMessage && (
        <p
          data-testid="notification-preference-error"
          role="alert"
          className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errorMessage}
        </p>
      )}

      {/* ---- 성공 토스트 ---- */}
      {showSuccessToast && (
        <p
          data-testid="notification-preference-success-toast"
          role="status"
          aria-live="polite"
          className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
          저장되었어요!
        </p>
      )}

      {/* ---- 저장 버튼 ---- */}
      <div className="flex justify-end">
        <button
          type="submit"
          data-testid="notification-preference-submit"
          disabled={isSaving}
          aria-label="알림 선호 저장"
          className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
