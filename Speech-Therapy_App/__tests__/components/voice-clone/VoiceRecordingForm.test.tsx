// FR-Q-021 — VoiceRecordingForm 단위 테스트.
//
// 본 파일은 2026-05-28 본 PC 마이크 검증에서 발견·즉시 fix 한 3 회귀의 가드:
//   회귀 1) durationMs 항상 0 (mr.onstop closure stale state) — commit 6cc6254
//   회귀 2) 1초 미만 녹음 가드 부재 (mic silent fail → recorded 진입) — commit 7ca9b9e
//   회귀 3) error state sticky (라벨/동의 입력해도 미해제) + submit 실패 시 recorded 복원 — 7ca9b9e
// 추가: 누락 항목 자동 scroll (6d6efaf), inline 업로드 버튼 노출 조건, 마이크 실패, 성공 path.
//
// 환경: happy-dom. MediaRecorder / getUserMedia / FileReader / scrollIntoView mock 주입 +
//       fake timers 로 Date.now() 제어 (durationMs 검증의 핵심).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";

import { VoiceRecordingForm } from "@/components/voice-clone/VoiceRecordingForm";

// Server Action mock — 단위 테스트는 RSC 런타임 외부 실행 (setup.ts next/cache 패턴과 동일 취지).
import { submitVoiceClone } from "@/app/actions/submit-voice-clone";
vi.mock("@/app/actions/submit-voice-clone", () => ({
  submitVoiceClone: vi.fn(),
}));
const mockSubmit = vi.mocked(submitVoiceClone);

// ── 브라우저 API mock ───────────────────────────────────────────────
let trackStopMock: ReturnType<typeof vi.fn>;
let getUserMediaMock: ReturnType<typeof vi.fn>;
let scrollIntoViewMock: ReturnType<typeof vi.fn>;

// MediaRecorder mock — start/stop 제어. stop() 시 chunk emit 후 onstop 동기 호출.
class MockMediaRecorder {
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(
    public stream: MediaStream,
    public options?: MediaRecorderOptions,
  ) {}
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["x"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

// FileReader mock — readAsDataURL → onload (submit 성공/실패 path 에서만 도달).
class MockFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(_blob: Blob) {
    this.result = "data:audio/webm;base64,AAAA";
    queueMicrotask(() => this.onload?.());
  }
}

beforeEach(() => {
  mockSubmit.mockReset();

  trackStopMock = vi.fn();
  getUserMediaMock = vi
    .fn()
    .mockResolvedValue({ getTracks: () => [{ stop: trackStopMock }] });
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: getUserMediaMock },
    configurable: true,
  });

  (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder =
    MockMediaRecorder;
  (globalThis as unknown as { FileReader: unknown }).FileReader = MockFileReader;

  scrollIntoViewMock = vi.fn();
  (HTMLElement.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView =
    scrollIntoViewMock;

  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

// ── 헬퍼 ────────────────────────────────────────────────────────────
async function startRecording() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "녹음 시작" }));
  });
}
async function stopRecording() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "녹음 종료" }));
  });
}
/** 녹음 시작 → ms 경과(Date.now() 전진) → 녹음 종료. durationMs = ms 가 됨. */
async function recordFor(ms: number) {
  await startRecording();
  act(() => {
    vi.advanceTimersByTime(ms);
  });
  await stopRecording();
}
function typeLabel(value: string) {
  fireEvent.change(screen.getByPlaceholderText("예: 엄마 목소리"), {
    target: { value },
  });
}
function checkConsent() {
  fireEvent.click(screen.getByRole("checkbox"));
}
async function clickUpload() {
  // 동의 체크 시 inline 업로드 버튼이 추가되어 업로드 버튼이 2개 → 첫 번째(상단) 사용.
  await act(async () => {
    fireEvent.click(screen.getAllByRole("button", { name: "업로드" })[0]);
  });
}

// ── 테스트 ──────────────────────────────────────────────────────────
describe("VoiceRecordingForm — FR-Q-021 회귀 가드", () => {
  it("회귀1: 30초 이상 녹음 → durationMs 정상 계산 → '30초 미만' 경고 미노출", async () => {
    render(<VoiceRecordingForm />);
    await recordFor(35_000);

    // closure stale 버그였다면 durationMs=0 → isUnderMin=true → 경고 노출.
    expect(screen.queryByText(/30초 미만/)).not.toBeInTheDocument();
    // recorded state 진입 확인 (업로드 버튼 노출).
    expect(screen.getByRole("button", { name: "업로드" })).toBeInTheDocument();
  });

  it("회귀1 보강: 30초 미만(≥1초) 녹음 → durationMs 반영 → 권장 경고 노출", async () => {
    render(<VoiceRecordingForm />);
    await recordFor(5_000);

    expect(screen.getByText(/30초 미만/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "업로드" })).toBeInTheDocument();
  });

  it("회귀2: 1초 미만 녹음 → recorded 진입 차단 + '너무 짧아요' + idle 유지 + track 정리", async () => {
    render(<VoiceRecordingForm />);
    await recordFor(500);

    expect(screen.getByText(/너무 짧아요/)).toBeInTheDocument();
    // idle 유지 — '녹음 시작' 버튼 재노출, 업로드 버튼 부재.
    expect(screen.getByRole("button", { name: "녹음 시작" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "업로드" })).not.toBeInTheDocument();
    // 마이크 stream track 정리.
    expect(trackStopMock).toHaveBeenCalled();
  });

  it("회귀3: 라벨 누락 에러 후 라벨 입력 시 에러 자동 해제", async () => {
    render(<VoiceRecordingForm />);
    await recordFor(35_000);

    await clickUpload(); // 라벨 미입력 → 에러.
    expect(screen.getByText(/라벨을 입력/)).toBeInTheDocument();

    typeLabel("엄마 목소리");
    expect(screen.queryByText(/라벨을 입력/)).not.toBeInTheDocument();
  });

  it("회귀3: 동의 누락 에러 후 동의 체크 시 에러 자동 해제", async () => {
    render(<VoiceRecordingForm />);
    await recordFor(35_000);
    typeLabel("엄마 목소리");

    await clickUpload(); // 동의 미체크 → 에러.
    expect(screen.getByText(/동의를 체크/)).toBeInTheDocument();

    checkConsent();
    expect(screen.queryByText(/동의를 체크/)).not.toBeInTheDocument();
  });

  it("회귀3: submit 실패 시 recorded 복원(재시도 가능) + 에러 노출", async () => {
    mockSubmit.mockResolvedValue({ success: false, reason: "elevenlabs_skipped" });
    render(<VoiceRecordingForm />);
    await recordFor(35_000);
    typeLabel("엄마 목소리");
    checkConsent();

    await clickUpload();
    await act(async () => {
      await Promise.resolve(); // FileReader onload(microtask) + submit 결과 flush.
    });

    expect(screen.getByText(/비활성화/)).toBeInTheDocument();
    // recorded 복원 — 재시도용 업로드 버튼 재노출.
    expect(screen.getAllByRole("button", { name: "업로드" }).length).toBeGreaterThan(0);
  });

  it("누락 항목 클릭 시 자동 scroll (scrollIntoView 호출)", async () => {
    render(<VoiceRecordingForm />);
    await recordFor(35_000);

    await clickUpload(); // 라벨 누락 → labelInputRef.scrollIntoView.
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("inline 업로드 버튼: 녹음 완료 + 동의 체크 후에만 노출", async () => {
    render(<VoiceRecordingForm />);
    await recordFor(35_000);

    // 동의 전 — 업로드 버튼 1개(상단)만.
    expect(screen.getAllByRole("button", { name: "업로드" })).toHaveLength(1);

    checkConsent();
    // 동의 후 — inline 업로드 버튼 추가로 2개.
    expect(screen.getAllByRole("button", { name: "업로드" })).toHaveLength(2);
  });

  it("마이크 접근 실패 → 에러 안내 + idle 유지", async () => {
    getUserMediaMock.mockRejectedValue(new Error("Permission denied"));
    render(<VoiceRecordingForm />);

    await startRecording();

    expect(screen.getByText(/마이크 접근에 실패/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "녹음 시작" })).toBeInTheDocument();
  });

  it("성공: 업로드 완료 → 성공 메시지 + 만료 안내", async () => {
    mockSubmit.mockResolvedValue({
      success: true,
      voiceModelId: "vm_1",
      modelHash: "hash",
      expiresAt: new Date("2026-06-05T00:00:00Z").toISOString(),
      appliedContentTypes: [],
    });
    render(<VoiceRecordingForm />);
    await recordFor(35_000);
    typeLabel("엄마 목소리");
    checkConsent();

    await clickUpload();
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/음성 등록을 마쳤어요/)).toBeInTheDocument();
  });
});
