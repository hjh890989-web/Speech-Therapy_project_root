// API-018 — ElevenLabs TTS 클로닝 API client wrapper (V07 F11).
//
// 정책:
//   - fetch 기반 — 외부 SDK 의존 없음 (Resend / Slack 패턴 동일).
//   - 환경 변수 ELEVENLABS_API_KEY 부재 시 graceful skip — dev/test 보호.
//   - HTTP 실패는 graceful — { ok: false, error } 반환.
//
// 책임:
//   - cloneVoice(): 음성 Blob 업로드 → voice_id 발급.
//   - deleteVoice(): 7일 만료 Cron 호출 — ElevenLabs 측 삭제.
//   - synthesize(): TTS 렌더 (text + voice_id → audio blob).
//
// R4 정합:
//   - 음성 본문은 ElevenLabs API 로 전송 (PIPA §17 국외 이전 동의 사용자 측 책임 — 진단 흐름의 동의로 cover).
//   - 본 client 는 _wrapper_ 만 — PII 마스킹은 호출 측 책임.
//
// Refs: TASK_API-018.md, https://elevenlabs.io/docs/api-reference

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

export interface ElevenLabsResult<T> {
  ok: boolean;
  data?: T;
  /// 실패 사유 — graceful 분기.
  error?: string;
  /// 환경 변수 부재로 skip 한 경우 true.
  skipped?: boolean;
}

export interface CloneVoiceArgs {
  /// 부모 음성 file (mp3 / wav, 5분~30분 권장).
  audioFile: Blob;
  /// 모델 라벨 (UI 표시용, ElevenLabs 측 name).
  label: string;
  /// 옵션 description.
  description?: string;
}

export interface CloneVoiceResponse {
  voice_id: string;
  name?: string;
}

export interface SynthesizeArgs {
  /// ElevenLabs voice_id (cloneVoice 응답).
  voiceId: string;
  /// TTS 변환 텍스트 (CON-04 금칙어 사전 검증은 호출 측 책임).
  text: string;
}

function getApiKey(): string | null {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || process.env.NODE_ENV === "test") return null;
  return key;
}

/**
 * 음성 클로닝 — 부모 음성 mp3/wav → voice_id 발급.
 *
 * ElevenLabs API: POST /v1/voices/add (multipart/form-data)
 */
export async function cloneVoice(args: CloneVoiceArgs): Promise<ElevenLabsResult<CloneVoiceResponse>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, skipped: true, error: "ELEVENLABS_API_KEY not set" };
  }

  try {
    const form = new FormData();
    form.append("name", args.label);
    if (args.description) form.append("description", args.description);
    form.append("files", args.audioFile);

    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices/add`, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const json = (await response.json()) as CloneVoiceResponse;
    if (!json.voice_id) {
      return { ok: false, error: "missing voice_id in response" };
    }
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * 음성 모델 삭제 (7일 폐기 Cron 호출).
 *
 * ElevenLabs API: DELETE /v1/voices/{voice_id}
 */
export async function deleteVoice(voiceId: string): Promise<ElevenLabsResult<void>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, skipped: true, error: "ELEVENLABS_API_KEY not set" };
  }
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices/${encodeURIComponent(voiceId)}`, {
      method: "DELETE",
      headers: { "xi-api-key": apiKey },
    });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * TTS 렌더 — text + voice_id → audio (mp3) ArrayBuffer.
 *
 * ElevenLabs API: POST /v1/text-to-speech/{voice_id}
 */
export async function synthesize(args: SynthesizeArgs): Promise<ElevenLabsResult<ArrayBuffer>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, skipped: true, error: "ELEVENLABS_API_KEY not set" };
  }
  try {
    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${encodeURIComponent(args.voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({ text: args.text }),
      },
    );
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const buffer = await response.arrayBuffer();
    return { ok: true, data: buffer };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
