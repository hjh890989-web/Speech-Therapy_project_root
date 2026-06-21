"use client";

// FR-C-PARENT-SETTINGS — /settings/child 자녀 프로필 변경 폼 (Client Component).
//
// 책임:
//   - 부모의 자녀 월령 (slider 24~144, CR-2026-009) + 관심 음소 토글 (0~5개) 입력.
//   - 저장 클릭 → updateChildProfile Server Action 호출.
//   - 결과 상태 — idle / saving / success / error UI.
//   - 성공 시 토스트 ("저장되었어요!") + 분석 이벤트 child_profile_updated 발송.
//
// 부모 인터랙션 (자녀 친화 카피 불필요하지만 의료 표현 금지):
//   - "발음 발달 확인" / "관심 음소" 등 비의료 표현.
//   - 정보 밀도 OK — 부모 대상 (Step2 의 큰 글씨 / 강조 UI 와 구분).
//
// CON-04: 본 컴포넌트의 모든 UI / aria-label / 주석에 "치료/진단/장애" 금칙어 0건.
//
// R4 (자녀 보호):
//   - 자녀 식별 정보 입력 X — 월령 + 음소 라벨만.
//   - 분석 이벤트는 변경 _필드 이름_ 만 발송 (raw 값 X) — userId 는 server-side 자동 해시 가정.

import { useCallback, useMemo, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { updateChildProfile } from "@/app/actions/update-child-profile";
// FR-PERF-3-USE-SERVER-REFACTOR — const/type 은 shape 모듈 (non-"use server") 에서.
import {
  ALLOWED_PHONEMES,
  CHILD_AGE_MAX_MONTHS,
  CHILD_AGE_MIN_MONTHS,
  PREFERRED_PHONEMES_MAX,
  type AllowedPhoneme,
} from "@/app/actions/update-child-profile-shape";

/** prefill 입력 — Server Component (page.tsx) 가 user row 조회 후 전달. */
export interface ChildProfileFormProps {
  /** User.childAgeMonths — null 이면 default 48. */
  initialChildAgeMonths: number | null;
  /** User.preferredPhonemes — null/undefined 도 안전하게 빈 배열로 정규화. */
  initialPreferredPhonemes: ReadonlyArray<string> | null;
}

/** 저장 상태 머신. */
type SaveStatus = "idle" | "saving" | "success" | "error";

const DEFAULT_AGE_MONTHS = 48; // 만 4세 (중앙값).

/** 외부 입력 음소 배열을 화이트리스트로 필터링 (잘못된 값 제거). */
function sanitizeInitialPhonemes(
  input: ReadonlyArray<string> | null,
): AllowedPhoneme[] {
  if (!Array.isArray(input)) return [];
  const allowedSet = new Set<string>(ALLOWED_PHONEMES);
  const out: AllowedPhoneme[] = [];
  for (const p of input) {
    if (allowedSet.has(p) && !out.includes(p as AllowedPhoneme)) {
      out.push(p as AllowedPhoneme);
    }
  }
  return out.slice(0, PREFERRED_PHONEMES_MAX);
}

/** 두 배열이 (순서 무관) 동일 set 인지. */
function samePhonemeSet(
  a: ReadonlyArray<string>,
  b: ReadonlyArray<string>,
): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const x of b) {
    if (!setA.has(x)) return false;
  }
  return true;
}

export function ChildProfileForm({
  initialChildAgeMonths,
  initialPreferredPhonemes,
}: ChildProfileFormProps) {
  const initialAge =
    initialChildAgeMonths &&
    initialChildAgeMonths >= CHILD_AGE_MIN_MONTHS &&
    initialChildAgeMonths <= CHILD_AGE_MAX_MONTHS
      ? initialChildAgeMonths
      : DEFAULT_AGE_MONTHS;
  const initialPhonemes = useMemo(
    () => sanitizeInitialPhonemes(initialPreferredPhonemes),
    [initialPreferredPhonemes],
  );

  const [childAgeMonths, setChildAgeMonths] = useState<number>(initialAge);
  const [selectedPhonemes, setSelectedPhonemes] =
    useState<AllowedPhoneme[]>(initialPhonemes);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const togglePhoneme = useCallback((p: AllowedPhoneme) => {
    setSelectedPhonemes((prev) => {
      if (prev.includes(p)) {
        return prev.filter((x) => x !== p);
      }
      if (prev.length >= PREFERRED_PHONEMES_MAX) {
        // 최대 도달 — 무시 (UI 가 비활성 안내).
        return prev;
      }
      return [...prev, p];
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setStatus("saving");
    setErrorMessage(null);
    try {
      const result = await updateChildProfile({
        childAgeMonths,
        preferredPhonemes: selectedPhonemes,
      });
      if (!result.success) {
        setStatus("error");
        setErrorMessage(result.message);
        return;
      }
      // 변경 필드 산출 (no-op 호출도 success: true 지만 changedFields 는 빈 배열).
      const changedFields: ("childAgeMonths" | "preferredPhonemes")[] = [];
      if (result.childAgeMonths !== initialAge) {
        changedFields.push("childAgeMonths");
      }
      if (!samePhonemeSet(result.preferredPhonemes, initialPhonemes)) {
        changedFields.push("preferredPhonemes");
      }
      trackEvent("child_profile_updated", {
        userId: result.userId,
        changedFields,
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
  }, [childAgeMonths, selectedPhonemes, initialAge, initialPhonemes]);

  const isSaving = status === "saving";
  const showSuccessToast = status === "success";

  return (
    <form
      data-testid="child-profile-form"
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      {/* ---- 자녀 월령 slider ---- */}
      <fieldset
        data-testid="child-profile-age-field"
        className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30"
      >
        <label
          htmlFor="child-profile-age-slider"
          className="block text-base font-semibold text-amber-900 dark:text-amber-100"
        >
          자녀 나이
        </label>
        <div className="flex items-center justify-between text-sm text-amber-900 dark:text-amber-100">
          <span data-testid="child-profile-age-display">
            만 {Math.floor(childAgeMonths / 12)}세 {childAgeMonths % 12}개월
          </span>
          <span className="text-xs text-amber-800 dark:text-amber-200">
            ({childAgeMonths}개월)
          </span>
        </div>
        <input
          id="child-profile-age-slider"
          data-testid="child-profile-age-slider"
          type="range"
          min={CHILD_AGE_MIN_MONTHS}
          max={CHILD_AGE_MAX_MONTHS}
          value={childAgeMonths}
          onChange={(e) => setChildAgeMonths(Number(e.target.value))}
          className="w-full accent-amber-500"
          aria-label="자녀 월령 슬라이더 24개월부터 144개월"
        />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          만 2세 (24개월) ~ 만 12세 (144개월) 사이로 조정해 주세요.
        </p>
      </fieldset>

      {/* ---- 관심 음소 토글 ---- */}
      <fieldset
        data-testid="child-profile-phoneme-field"
        className="space-y-3 rounded-lg border border-sky-200 bg-sky-50 p-5 dark:border-sky-800 dark:bg-sky-950/30"
      >
        <legend className="text-base font-semibold text-sky-900 dark:text-sky-100">
          관심 음소 (최대 {PREFERRED_PHONEMES_MAX}개)
        </legend>
        <p className="text-xs text-sky-800 dark:text-sky-200">
          선택하지 않아도 괜찮아요 — 시스템이 자녀에게 잘 맞는 음소를 자동으로 추천해 드려요.
        </p>
        <div
          data-testid="child-profile-phoneme-group"
          role="group"
          aria-label="관심 음소 선택"
          className="flex flex-wrap gap-2"
        >
          {ALLOWED_PHONEMES.map((p) => {
            const selected = selectedPhonemes.includes(p);
            const disabled =
              !selected && selectedPhonemes.length >= PREFERRED_PHONEMES_MAX;
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePhoneme(p)}
                data-testid={`child-profile-phoneme-${p}`}
                aria-pressed={selected}
                aria-disabled={disabled}
                disabled={disabled}
                className={`min-h-[44px] rounded-full px-5 py-2 text-lg font-semibold transition ${
                  selected
                    ? "bg-sky-500 text-white shadow"
                    : "bg-white text-sky-800 ring-1 ring-sky-300 hover:bg-sky-100 disabled:opacity-50 dark:bg-sky-900 dark:text-sky-100"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
        <p
          data-testid="child-profile-phoneme-count"
          className="text-xs text-sky-800 dark:text-sky-200"
        >
          현재 {selectedPhonemes.length} / {PREFERRED_PHONEMES_MAX} 개 선택됨
        </p>
      </fieldset>

      {/* ---- 에러 메시지 ---- */}
      {status === "error" && errorMessage && (
        <p
          data-testid="child-profile-error"
          role="alert"
          className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {errorMessage}
        </p>
      )}

      {/* ---- 성공 토스트 ---- */}
      {showSuccessToast && (
        <p
          data-testid="child-profile-success-toast"
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
          data-testid="child-profile-submit"
          disabled={isSaving}
          aria-label="자녀 정보 저장"
          className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
