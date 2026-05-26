"use server";

// FR-C-SECURITY — 2FA TOTP enroll 시작 Server Action.
//
// 흐름:
//   1) Supabase auth.getUser → user.id 확인 (비로그인 차단).
//   2) auth.mfa.listFactors() → 이미 등록된 verified TOTP factor 존재 시 already_enrolled 반환.
//   3) auth.mfa.enroll({ factorType: 'totp', friendlyName }) 호출
//      → 응답: { id (factorId), type: 'totp', totp: { qr_code, secret, uri } }
//      → qr_code 는 data URL (SVG) — UI 가 그대로 <img src={qrCode}> 사용.
//   4) graceful — env 미설정 / Supabase throw → { error: 'supabase_error' } 형태로 응답.
//
// RBAC (R4):
//   - 외부 user id 입력 받지 않음 — auth.uid 만 사용.
//   - Supabase 가 본인 세션 기반으로만 factor enroll (cross-write 0건).
//
// 분석 이벤트: 본 Action 은 enroll 시작만 — 'totp_enrolled' 이벤트는 verify 성공 직후 1회.
//
// CON-04: 모든 메시지에 "치료/진단/장애" 금칙어 0건.

import { getSupabaseServerClient } from "@/lib/supabase/server";

// FR-PERF-3-USE-SERVER-REFACTOR — non-async exports 는 ./enroll-totp-shape 으로 분리.
import type { EnrollTotpResult } from "./enroll-totp-shape";

/** 친근한 factor 이름 — Supabase 가 인식 표시용. CON-04 금칙어 0건. */
const TOTP_FRIENDLY_NAME = "Speech-Therapy 2FA";

/**
 * 2FA TOTP enroll 시작 — /settings/security 의 EnrollTotpFlow 에서 호출.
 *
 * 정상 시 QR code + secret 반환 → 사용자가 인증 앱으로 스캔 (또는 수동 입력) 후
 * verifyTotpEnroll Server Action 으로 6자리 코드 검증.
 */
export async function requestEnrollTotp(): Promise<EnrollTotpResult> {
  // 1) auth — 비로그인 차단.
  let userId: string;
  let supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>;
  try {
    supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      return {
        success: false,
        reason: "unauthorized",
        message: "로그인 후 다시 시도해 주세요.",
      };
    }
    userId = data.user.id;
  } catch {
    return {
      success: false,
      reason: "unauthorized",
      message: "로그인 상태를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  // 2) 이미 verified TOTP factor 존재 여부 확인 — Supabase MFA listFactors.
  try {
    const listResp = await supabase.auth.mfa.listFactors();
    if (!listResp.error) {
      // Supabase 응답 shape: { data: { totp: Factor[], all: Factor[], phone: Factor[] } } (v2.x)
      // 또는 { data: { all: Factor[] } } — 안전하게 옵셔널 체이닝.
      const factors = listResp.data;
      const totpList =
        (factors as { totp?: Array<{ status?: string }> } | null)?.totp ?? [];
      const hasVerified = totpList.some(
        (f) => f?.status === "verified",
      );
      if (hasVerified) {
        return {
          success: false,
          reason: "already_enrolled",
          message: "이미 2단계 인증이 활성화되어 있어요.",
        };
      }
    }
  } catch (err) {
    // listFactors 실패는 enroll 차단 안 함 — 다음 단계에서 Supabase 가 중복 enroll 거부 시 처리.
    console.warn(
      `[enroll-totp] listFactors 실패 — userId=${userId} err=${
        err instanceof Error ? err.message : "unknown"
      }`,
    );
  }

  // 3) Supabase MFA enroll — TOTP factor 생성 (unverified 상태).
  try {
    const enrollResp = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: TOTP_FRIENDLY_NAME,
    });
    if (enrollResp.error || !enrollResp.data) {
      console.warn(
        `[enroll-totp] supabase enroll 실패 — userId=${userId} message=${
          enrollResp.error?.message ?? "unknown"
        }`,
      );
      return {
        success: false,
        reason: "supabase_error",
        message:
          "2단계 인증 시작에 실패했어요. 잠시 후 다시 시도해 주세요.",
      };
    }
    // 응답 shape: { id, type: 'totp', totp: { qr_code, secret, uri } } (Supabase v2 MFA).
    const data = enrollResp.data as {
      id?: string;
      totp?: { qr_code?: string; secret?: string };
    };
    const factorId = data.id ?? "";
    const qrCode = data.totp?.qr_code ?? "";
    const secret = data.totp?.secret ?? "";
    if (!factorId || !qrCode || !secret) {
      return {
        success: false,
        reason: "supabase_error",
        message: "2단계 인증 시작에 실패했어요. 잠시 후 다시 시도해 주세요.",
      };
    }
    return {
      success: true,
      factorId,
      qrCode,
      secret,
    };
  } catch (err) {
    console.error("[enroll-totp] supabase enroll 예외", err);
    return {
      success: false,
      reason: "supabase_error",
      message: "2단계 인증 시작에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}
