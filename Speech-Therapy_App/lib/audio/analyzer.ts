// Sprint 3 §2 A — Web Audio API 직접 측정.
//
// FR-C-001 D7 적용 — 클라이언트에서 음향 특징 추출 후 Server Action 에 전달.
// 서버는 raw audio 미수신 (개인정보 + 대역폭 보호).
//
// 측정 항목:
//   - pitchMean / pitchStd: FFT peak 기반 F0 추정 (children 80~800 Hz 대역)
//   - durationSec: start ↔ stop 시각 차이
//   - energy: 시간 도메인 샘플의 RMS 평균 (0~1)
//
// 알려진 한계:
//   - FFT peak 가 항상 F0 아님 (강한 formant 시 오답) → Sprint 3 §2 C 에서 autocorrelation 도입 검토
//   - iOS Safari 에서 webkitAudioContext fallback 필요
//   - getUserMedia 호출은 user gesture 안에서만 가능 (브라우저 보안)

// Sprint 3 §2 A-2 정밀도 개선 (2026-05-19, sub-session B 의 pitch_std=0 잔존 이슈 해결):
//   - SAMPLE_INTERVAL_MS 100 → 50ms (샘플 수 2배 — 3.5초 발화 시 35 → 70 샘플)
//   - NOISE_FLOOR_DB -60 → -70dB (약한 신호도 캡처, 어린이 음성 / 작은 발음에 유리)
//   - SILENCE_RMS_THRESHOLD 0.005 → 0.003 (짧은 발화의 자음 / 무성음 구간 포함)
//
// Sprint 3 §2 A-3 옵션 A — FFT_SIZE 2048 → 4096 (2026-05-21, issue #103):
//   - bin 분해능 44100/2048 = 21.5 Hz → 44100/4096 = 10.7 Hz (2배 정밀)
//   - 단음 발화 시 모든 frame 이 같은 bin 에 몰려 pitch_std=0 되는 한계 완화
//   - 트레이드오프: FFT 분석 비용 ~2x, time-domain 버퍼 메모리 ~2x
//     (AnalyserNode.fftSize 상한 32768 → 여유 충분, sample interval 50ms 내 처리 가능)
//   - Option B (autocorrelation / YIN) 및 Option C (실데이터 N≥20 검증) 는 별도 후속 작업.
//
// #106 후속 refactor (2026-05-22):
//   - createAudioAnalyzer({ externalStream }) — MicStreamProvider 가 제공한 공유 stream 사용 지원.
//   - external stream 사용 시 analyzer 가 stream 을 소유하지 않으므로 teardown 시 tracks.stop 호출 안 함.
//   - 기존 호출처 (DiagnosisForm) 는 externalStream 미전달 시 legacy 직접 getUserMedia 경로 유지.
const FFT_SIZE = 4096;
const SAMPLE_INTERVAL_MS = 50; // 초당 20회
const MIN_PITCH_HZ = 80;
const MAX_PITCH_HZ = 800;
const NOISE_FLOOR_DB = -70;
const SILENCE_RMS_THRESHOLD = 0.003;

export interface AcousticFeatures {
  pitchMean: number | null;
  pitchStd: number | null;
  durationSec: number | null;
  energy: number | null;
}

interface AudioContextWindow extends Window {
  AudioContext: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

/** SSR safe 지원 여부 검사. */
export function isAudioAnalysisSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  const w = window as unknown as AudioContextWindow;
  return Boolean(w.AudioContext ?? w.webkitAudioContext);
}

/** #106 — AudioContext 단독 지원 검사 (외부 stream 주입 경로용). */
export function isAudioContextOnlySupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as AudioContextWindow;
  return Boolean(w.AudioContext ?? w.webkitAudioContext);
}

export interface AudioAnalyzer {
  start(): Promise<void>;
  stop(): AcousticFeatures;
  cancel(): void;
}

export interface CreateAudioAnalyzerOptions {
  /**
   * #106 — 외부에서 주입한 MediaStream (MicStreamProvider 공유 경로).
   * 제공 시 analyzer 는 stream 을 소유하지 않음 → teardown 에서 tracks.stop 호출 안 함.
   * 미제공 시 legacy 경로로 직접 getUserMedia 호출.
   */
  externalStream?: MediaStream | null;
}

export function createAudioAnalyzer(options: CreateAudioAnalyzerOptions = {}): AudioAnalyzer {
  let audioContext: AudioContext | null = null;
  let stream: MediaStream | null = null;
  // owned: true → teardown 시 tracks.stop 호출. external stream 인 경우 false.
  let streamOwned = false;
  let analyser: AnalyserNode | null = null;
  let sampleInterval: ReturnType<typeof setInterval> | null = null;
  let pitchSamples: number[] = [];
  let energySamples: number[] = [];
  let startTime: number = 0;
  let endTime: number | null = null;

  function teardown() {
    if (sampleInterval !== null) {
      clearInterval(sampleInterval);
      sampleInterval = null;
    }
    if (stream && streamOwned) {
      stream.getTracks().forEach((t) => t.stop());
    }
    stream = null;
    streamOwned = false;
    if (audioContext) {
      audioContext.close().catch(() => {
        /* 이미 닫힌 컨텍스트 — 무시 */
      });
      audioContext = null;
    }
    analyser = null;
  }

  async function start(): Promise<void> {
    if (audioContext) throw new Error("AudioAnalyzer: already started");
    if (typeof window === "undefined") throw new Error("AudioAnalyzer: not in browser");
    const w = window as unknown as AudioContextWindow;
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) throw new Error("AudioAnalyzer: AudioContext not supported");

    if (options.externalStream) {
      // 외부 주입 stream — MicStreamProvider 가 lifecycle 책임. teardown 시 tracks.stop 호출 안 함.
      stream = options.externalStream;
      streamOwned = false;
    } else {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamOwned = true;
    }
    audioContext = new Ctx();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    source.connect(analyser);

    startTime = performance.now();
    pitchSamples = [];
    energySamples = [];
    endTime = null;

    sampleInterval = setInterval(() => {
      if (!analyser || !audioContext) return;
      const sampleRate = audioContext.sampleRate;

      // Energy (RMS) — time domain samples in [-1, 1].
      const timeData = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(timeData);
      let sumSq = 0;
      for (let i = 0; i < timeData.length; i++) {
        sumSq += timeData[i] * timeData[i];
      }
      const rms = Math.sqrt(sumSq / timeData.length);
      energySamples.push(rms);

      // 무음 구간은 pitch 측정 skip.
      if (rms < SILENCE_RMS_THRESHOLD) return;

      // Pitch — frequency domain FFT 의 [MIN, MAX] 대역 내 peak.
      const freqData = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(freqData);
      const minBin = Math.max(1, Math.floor((MIN_PITCH_HZ * analyser.fftSize) / sampleRate));
      const maxBin = Math.min(
        freqData.length - 1,
        Math.ceil((MAX_PITCH_HZ * analyser.fftSize) / sampleRate),
      );
      let peakBin = minBin;
      let peakDb = freqData[minBin];
      for (let i = minBin + 1; i <= maxBin; i++) {
        if (freqData[i] > peakDb) {
          peakDb = freqData[i];
          peakBin = i;
        }
      }
      // 노이즈 플로어 아래는 신뢰 불가.
      if (peakDb < NOISE_FLOOR_DB) return;
      const pitch = (peakBin * sampleRate) / analyser.fftSize;
      pitchSamples.push(pitch);
    }, SAMPLE_INTERVAL_MS);
  }

  function stop(): AcousticFeatures {
    endTime = performance.now();
    const durationSec = (endTime - startTime) / 1000;
    const pitchMean = pitchSamples.length > 0 ? mean(pitchSamples) : null;
    const pitchStd = pitchSamples.length > 1 ? stddev(pitchSamples) : null;
    const energy = energySamples.length > 0 ? mean(energySamples) : null;
    teardown();
    return { pitchMean, pitchStd, durationSec, energy };
  }

  function cancel(): void {
    teardown();
    pitchSamples = [];
    energySamples = [];
    endTime = null;
  }

  return { start, stop, cancel };
}

/** 평균 — 빈 배열 시 0. */
export function mean(arr: ReadonlyArray<number>): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

/** 표본 표준편차 (n-1 보정). n < 2 시 0. */
export function stddev(arr: ReadonlyArray<number>): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let variance = 0;
  for (let i = 0; i < arr.length; i++) {
    const diff = arr[i] - m;
    variance += diff * diff;
  }
  return Math.sqrt(variance / (arr.length - 1));
}
