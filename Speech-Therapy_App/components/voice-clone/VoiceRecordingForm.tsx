"use client";

// FR-Q-021 — F11 부모 음성 녹음 Client Component (V07).
//
// 책임:
//   - MediaRecorder API 로 음성 녹음 (5분 30초 가이드, 최소 1초 가드).
//   - 명시적 동의 체크박스 (consentGiven=true).
//   - 라벨 입력 + submit_voice_clone Server Action 호출.
//   - graceful error 안내 (consent_required / elevenlabs_skipped / invalid_input 등).
//   - 누락 항목 자동 scroll + 시각 강조 (라벨/동의).
//   - 동의 카드 안에 inline 업로드 버튼 (체크 후 노출) — viewport 위 scroll 마찰 해소.
//
// R4: 녹음 데이터는 메모리에만 — 페이지 떠나면 GC.
// CON-04: UI 카피 무위반.

import { useCallback, useEffect, useRef, useState } from "react";

import { submitVoiceClone } from "@/app/actions/submit-voice-clone";
import type { SubmitVoiceCloneResult } from "@/app/actions/submit-voice-clone-shape";

type RecordingState =
  | { kind: "idle" }
  | { kind: "recording"; startedAt: number }
  | { kind: "recorded"; blob: Blob; durationMs: number }
  | { kind: "submitting" }
  | { kind: "success"; result: Extract<SubmitVoiceCloneResult, { success: true }> };

const RECOMMENDED_MIN_MS = 30_000; // 30초 — 권장 (under 시 경고만)
const RECOMMENDED_MAX_MS = 5 * 60_000; // 5분 — 권장 상한
const MIN_REQUIRED_MS = 1_000; // 1초 — 강제 가드 (under 시 recorded 진입 차단)

export function VoiceRecordingForm() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // UX 개선 — 업로드 버튼 클릭 시 누락 항목으로 자동 scroll + 강조용 ref.
  const labelInputRef = useRef<HTMLInputElement>(null);
  const consentCardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RecordingState>({ kind: "idle" });
  const [label, setLabel] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // 시각 강조 (ring) 잠시 표시 — submit 시 누락 항목에 적용.
  const [highlightConsent, setHighlightConsent] = useState(false);
  const [highlightLabel, setHighlightLabel] = useState(false);
  // FR-Q-021 UX 개선 — error 메시지를 별도 state 로 분리 (이전엔 state.kind="error" 였음).
  // 이유: error 가 sticky state 라 사용자가 라벨/동의 입력해도 자동 해제 안 됐음.
  // 분리 후 라벨/동의 onChange 에서 setErrorMessage(null) 로 자동 clear.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 녹음 중 elapsed 시간 표시 (재렌더 트리거).
  useEffect(() => {
    if (state.kind !== "recording") return;
    const id = setInterval(() => {
      setElapsed(Date.now() - state.startedAt);
    }, 250);
    return () => clearInterval(id);
  }, [state]);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      const startedAt = Date.now();
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const durationMs = Date.now() - startedAt;
        // FR-Q-021 fix — 최소 1초 가드. 즉시 종료 / 마이크 미작동 시 recorded 진입 차단.
        if (durationMs < MIN_REQUIRED_MS) {
          setErrorMessage(
            "녹음이 너무 짧아요 (최소 1초 이상). 녹음 시작 후 잠시 후 종료해 주세요.",
          );
          setState({ kind: "idle" });
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        setState({ kind: "recorded", blob, durationMs });
        for (const t of stream.getTracks()) t.stop();
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setState({ kind: "recording", startedAt });
      setElapsed(0);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `마이크 접근에 실패했어요: ${err.message}`
          : "마이크 접근에 실패했어요. 권한을 확인해 주세요.",
      );
      setState({ kind: "idle" });
    }
  }, []);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
  }, []);

  const reset = useCallback(() => {
    setState({ kind: "idle" });
    setElapsed(0);
    setErrorMessage(null);
    chunksRef.current = [];
  }, []);

  const submit = useCallback(async () => {
    if (state.kind !== "recorded") return;
    // FR-Q-021 UX — 누락 항목 검사 시 해당 요소로 scroll + 시각 강조 (2s ring).
    // 라벨 우선 (위쪽) → 동의 (아래쪽) 순서로 안내.
    if (!label.trim()) {
      labelInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      labelInputRef.current?.focus();
      setHighlightLabel(true);
      setTimeout(() => setHighlightLabel(false), 2000);
      setErrorMessage("라벨을 입력해 주세요 (예: 엄마 목소리).");
      return;
    }
    if (!consentGiven) {
      consentCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightConsent(true);
      setTimeout(() => setHighlightConsent(false), 2000);
      setErrorMessage("음성 클로닝 사용 동의를 체크해 주세요.");
      return;
    }

    setErrorMessage(null);
    setState({ kind: "submitting" });

    // Blob → base64 변환.
    const reader = new FileReader();
    const audioBase64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("FileReader 실패"));
      reader.readAsDataURL(state.blob);
    });

    const result = await submitVoiceClone({
      audioBase64,
      label: label.trim(),
      consentGiven: true,
    });

    if (result.success) {
      setState({ kind: "success", result });
    } else {
      const messages: Record<string, string> = {
        unauthorized: "로그인 후 다시 시도해 주세요.",
        consent_required: "개인정보 동의가 필요해요. 설정 페이지에서 확인해 주세요.",
        consent_not_given: "음성 클로닝 사용 동의를 체크해 주세요.",
        invalid_input: result.message ?? "입력을 다시 확인해 주세요.",
        elevenlabs_skipped: "현재 음성 모델 서비스가 비활성화되어 있어요 (개발 환경).",
        elevenlabs_error: "외부 서비스 호출에 실패했어요. 잠시 후 다시 시도해 주세요.",
        internal_error: "저장에 실패했어요. 잠시 후 다시 시도해 주세요.",
      };
      setErrorMessage(messages[result.reason] ?? "알 수 없는 오류가 발생했어요.");
      // submit 실패 시 다시 시도 가능하도록 recorded state 로 복원.
      setState({ kind: "recorded", blob: state.blob, durationMs: state.durationMs });
    }
  }, [state, consentGiven, label]);

  const durationStr = formatDuration(elapsed);
  const isOverMax = state.kind === "recording" && elapsed > RECOMMENDED_MAX_MS;
  const isUnderMin =
    state.kind === "recorded" && state.durationMs < RECOMMENDED_MIN_MS;

  // 동의 카드 안의 inline 업로드 버튼 노출 조건 — 녹음 완료 + 동의 체크된 후 (마찰 해소).
  const showInlineUploadButton = state.kind === "recorded" && consentGiven;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <label className="block text-sm font-medium">라벨</label>
        <input
          ref={labelInputRef}
          type="text"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            // 사용자 입력 시 이전 error 자동 해제 (UX 마찰 해소).
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="예: 엄마 목소리"
          maxLength={50}
          className={`mt-2 w-full rounded-md border px-3 py-2 text-sm transition-shadow ${
            highlightLabel ? "ring-2 ring-amber-500" : ""
          }`}
          disabled={state.kind === "submitting" || state.kind === "success"}
        />

        <div className="mt-6 flex items-center justify-between">
          <div className="text-2xl font-mono">{durationStr}</div>
          <div className="space-x-2">
            {state.kind === "idle" && (
              <button
                type="button"
                onClick={startRecording}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                녹음 시작
              </button>
            )}
            {state.kind === "recording" && (
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                녹음 종료
              </button>
            )}
            {state.kind === "recorded" && (
              <>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-md border px-4 py-2 text-sm"
                >
                  다시 녹음
                </button>
                {/* disabled 제거 — 클릭 시 누락 항목으로 scroll + 시각 강조 + error 안내. */}
                <button
                  type="button"
                  onClick={submit}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  업로드
                </button>
              </>
            )}
          </div>
        </div>

        {state.kind === "recording" && isOverMax && (
          <p className="mt-3 text-sm text-amber-700">
            5분을 초과했어요. 곧 녹음을 마무리해 주세요.
          </p>
        )}
        {state.kind === "recorded" && isUnderMin && (
          <p className="mt-3 text-sm text-amber-700">
            30초 미만은 음성 품질이 떨어질 수 있어요. 다시 녹음하시는 것을 권장해요.
          </p>
        )}
      </div>

      <div
        ref={consentCardRef}
        className={`rounded-lg border bg-card p-6 transition-shadow ${
          highlightConsent ? "ring-2 ring-amber-500" : ""
        }`}
      >
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => {
              setConsentGiven(e.target.checked);
              if (errorMessage) setErrorMessage(null);
            }}
            className="mt-1"
          />
          <span className="text-sm">
            <strong>[필수]</strong> 본인의 음성을 ElevenLabs (미국) 서비스에 전송하여 동화/자장가
            콘텐츠 재생용 모델 생성에 사용하는 것에 동의합니다. 7일 후 자동 삭제됩니다.
          </span>
        </label>

        {/* FR-Q-021 UX 개선 — 동의 체크 후 inline 업로드 버튼 (위쪽 scroll 마찰 해소). */}
        {showInlineUploadButton && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={submit}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              업로드
            </button>
          </div>
        )}
      </div>

      {state.kind === "success" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          음성 등록을 마쳤어요. 만료 시각:{" "}
          {new Date(state.result.expiresAt).toLocaleString("ko-KR")} (7일 후 자동 삭제)
        </div>
      )}
      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {errorMessage}
        </div>
      )}
      {state.kind === "submitting" && (
        <div className="rounded-md border bg-card p-4 text-sm">
          업로드 중이에요... 잠시만 기다려 주세요.
        </div>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
