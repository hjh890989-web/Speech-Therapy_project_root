"use server";

// FR-C-018 (#41) — 부모 서명 페이지 Server Action.
//
// 책임:
//   - token + (선택) signatureName 검증
//   - markConsentSigned 호출 (멱등 — 재서명 시 alreadySigned 분기)
//   - 만료 / 미존재 graceful — 사용자 친화 reason 반환
//   - revalidatePath('/consent/[token]') — 페이지 server snapshot 신선화
//
// SEC layer (parent UI flow 이므로 sign route 와 다른 정책):
//   - CSRF: Server Action 자체가 next/cache 의 secure callback 으로 보호 (next 16 기본).
//   - rate-limit: 본 PR 범위 외 (parent 1명이 한 화면에서 1회 클릭).
//   - replay: token 자체가 1회용 — alreadySigned 분기로 자연 차단.
//
// R4 / CON-04:
//   - 응답 / revalidate 에 childName 노출 0건 — reason / signed 만.
//   - 본 Action 은 metric / 로그에 token 마지막 4자리만 노출.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { headers } from "next/headers";

import { markConsentSigned, daysSince } from "@/lib/consent/repo";

const InputSchema = z.object({
  token: z.string().uuid("INVALID_TOKEN"),
  /// (선택) 추후 자녀 이름 재확인 / signature image base64 등 필드 확장 슬롯.
  signatureName: z.string().min(1).max(50).optional(),
});

export type ConsentSignActionInput = z.infer<typeof InputSchema>;

export interface ConsentSignActionResult {
  ok: boolean;
  /// 'signed' (성공) / 'already_signed' (멱등) / 'expired' / 'not_found' / 'invalid_input' / 'internal_error'.
  reason: string;
  /// 멱등 / 성공 시 마지막 4자리 token suffix — UI 친화 메시지에 사용 가능.
  tokenSuffix?: string;
}

/// IP/UA 추출 (서명 법적 효력 보존). best-effort — 헤더 부재 시 null.
async function extractClientMeta(): Promise<{ ip: string | null; ua: string | null }> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    const ip = xff ? xff.split(",")[0]?.trim() ?? null : null;
    const ua = h.get("user-agent");
    return { ip, ua: ua ?? null };
  } catch {
    return { ip: null, ua: null };
  }
}

export async function submitConsentSignature(
  rawInput: unknown,
): Promise<ConsentSignActionResult> {
  let parsed: ConsentSignActionInput;
  try {
    parsed = InputSchema.parse(rawInput);
  } catch {
    return { ok: false, reason: "invalid_input" };
  }

  const meta = await extractClientMeta();
  let result;
  try {
    result = await markConsentSigned({
      token: parsed.token,
      signedIp: meta.ip,
      signedUa: meta.ua,
    });
  } catch (err) {
    console.error("consent-sign action: DB 실패", err);
    return { ok: false, reason: "internal_error" };
  }

  const tokenSuffix = parsed.token.slice(-4);
  if (result.notFound) {
    return { ok: false, reason: "not_found", tokenSuffix };
  }
  if (result.expired) {
    return { ok: false, reason: "expired", tokenSuffix };
  }
  if (result.alreadySigned) {
    return { ok: true, reason: "already_signed", tokenSuffix };
  }

  // 정상 서명 — revalidate + telemetry.
  try {
    revalidatePath(`/consent/${parsed.token}`);
  } catch {
    // happy-dom / unit test 환경 graceful skip.
  }

  // server-side telemetry — analytics SDK 없으므로 console.log.
  if (result.row && result.row.signedAt) {
    const daysFromSent = daysSince(result.row.sentAt, result.row.signedAt);
    console.log(
      `consent_signed consentId=${result.row.id} daysFromSent=${daysFromSent}`,
    );
  }

  return { ok: true, reason: "signed", tokenSuffix };
}
