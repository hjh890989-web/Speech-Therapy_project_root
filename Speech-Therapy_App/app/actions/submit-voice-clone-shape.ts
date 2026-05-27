// API-018 / FR-C-027 — submit_voice_clone Server Action shape (CLIENT-SAFE).
//
// 본 모듈은 _순수 타입_ 만 — prisma / fetch 의존 0건.
// Client Component (VoiceRecordingForm) 가 직접 import 안전.

import type { AllowedVoiceContentType } from "@/lib/voice-clone/ethics-whitelist";

/** Server Action 입력 (FormData base64 / Blob 활용). */
export interface SubmitVoiceCloneInput {
  /// 부모 음성 base64 또는 Blob.
  audioBase64: string;
  /// 라벨 (UI 표시용, "엄마 목소리" / "아빠 목소리" 등).
  label: string;
  /// 동의 보장 (UI 측 명시적 체크 후).
  consentGiven: boolean;
}

/** Server Action 결과 — graceful (throw 절대 금지). */
export type SubmitVoiceCloneResult =
  | {
      success: true;
      voiceModelId: string;
      modelHash: string;
      expiresAt: string;
      appliedContentTypes: AllowedVoiceContentType[];
    }
  | {
      success: false;
      reason:
        | "unauthorized"          // 인증 user 부재
        | "consent_required"      // PIPA 두 동의 미완료
        | "consent_not_given"     // 음성 클로닝 사용 명시 동의 미체크
        | "invalid_input"         // Zod 검증 실패
        | "elevenlabs_skipped"    // ELEVENLABS_API_KEY 미설정 (dev/test)
        | "elevenlabs_error"      // ElevenLabs API HTTP 실패
        | "internal_error";       // DB INSERT 실패
      message?: string;
    };
