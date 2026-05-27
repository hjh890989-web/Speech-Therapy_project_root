"use client";

// FR-Q-021 — F11 부모 음성 녹음 Client Component (V07).
//
// 책임:
//   - MediaRecorder API 로 음성 녹음 (5분 30초 가이드).
//   - 명시적 동의 체크박스 (consentGiven=true).
//   - 라벨 입력 + submit_voice_clone Server Action 호출.
//   - graceful error 안내 (consent_required / elevenlabs_skipped / invalid_input 등).
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
  | { kind: "success"; result: Extract<SubmitVoiceCloneResult, { success: true }> }
  | { kind: "error"; message: string };

const RECOMMENDED_MIN_MS = 30_000; // 30초
const RECOMMENDED_MAX_MS = 5 * 60_000; // 5분

export function VoiceRecordingForm() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // FR-Q-021 UX 개선 — 업로드 버튼 클릭 시 누락 항목으로 자동 scroll + 강조용 ref.
  const labelInputRef = useRef<HTMLInputElement>(null);
  const consentCardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RecordingState>({ kind: "idle" });
  const [label, setLabel] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // 시각 강조 (ring) 잠시 표시 — submit 시 누락 항목에 적용.
  const [highlightConsent, setHighlightConsent] = useState(false);
  const [highlightLabel, setHighlightLabel] = useState(false);

  // 녹음 중 elapsed 시간 표시 (재렌더 트리거).
  useEffect(() => {
    if (state.kind !== "recording") return;
    const id = setInterval(() => {
      setElapsed(Date.now() - state.startedAt);
    }, 250);
    return () => clearInterval(id);
  }, [state]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      // FR-Q-021 fix — `onstop` closure 안에서 stale `state.startedAt` 참조 회피.
      // 기존 코드: `state.kind === "recording" ? state.startedAt : Date.now()` 는
      // closure 의 state 가 startRecording 호출 시점 (=idle) 이라 항상 false →
      // durationMs = 0 → isUnderMin 항상 true → 모든 녹음에 "30초 미만" 경고 노출.
      // 수정: local `startedAt` 캡처 → closure 안전.
      const startedAt = Date.now();
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const durationMs = Date.now() - startedAt;
        setState({ kind: "recorded", blob, durationMs });
        // stream tracks 정리.
        for (const t of stream.getTracks()) t.stop();
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setState({ kind: "recording", startedAt });
      setElapsed(0);
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error
            ? `마이크 접근에 실패했어요: ${err.message}`
            : "마이크 접근에 실패했어요. 권한을 확인해 주세요.",
      });
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
    chunksRef.current = [];
  }, []);

  const submit = useCallback(async () => {
    if (state.kind !== "recorded") return;
    // FR-Q-021 UX 개선 — 누락 항목 검사 시 해당 요소로 scroll + 시각 강조 (2s ring).
    // 라벨 우선 (위쪽) → 동의 (아래쪽) 순서로 안내.
    if (!label.trim()) {
      labelInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      labelInputRef.current?.focus();
      setHighlightLabel(true);
      setTimeout(() => setHighlightLabel(false), 2000);
      setState({ kind: "error", message: "라벨을 입력해 주세요 (예: 엄마 목소리)." });
      return;
    }
    if (!consentGiven) {
      consentCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightConsent(true);
      setTimeout(() => setHighlightConsent(false), 2000);
      setState({ kind: "error", message: "음성 클로닝 사용 동의를 체크해 주세요." });
      return;
    }

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
      setState({
        kind: "error",
        message: messages[result.reason] ?? "알 수 없는 오류가 발생했어요.",
      });
    }
  }, [state, consentGiven, label]);

  const durationStr = formatDuration(elapsed);
  const isOverMax = state.kind === "recording" && elapsed > RECOMMENDED_MAX_MS;
  const isUnderMin =
    state.kind === "recorded" && state.durationMs < RECOMMENDED_MIN_MS;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <label className="block text-sm font-medium">라벨</label>
        <input
          ref={labelInputRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
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
                {/* FR-Q-021 UX 개선 — disabled 제거. 클릭 시 누락 항목으로 scroll
                    + 시각 강조 + error 메시지로 안내 (마찰 해소). */}
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
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            <strong>[필수]</strong> 본인의 음성을 ElevenLabs (미국) 서비스에 전송하여 동화/자장가
            콘텐츠 재생용 모델 생성에 사용하는 것에 동의합니다. 7일 후 자동 삭제됩니다.
          </span>
        </label>
      </div>

      {state.kind === "success" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          음성 등록을 마쳤어요. 만료 시각:{" "}
          {new Date(state.result.expiresAt).toLocaleString("ko-KR")} (7일 후 자동 삭제)
        </div>
      )}
      {state.kind === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {state.message}
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
