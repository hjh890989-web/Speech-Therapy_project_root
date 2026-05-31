// API-020 — F16 Web Push 발송 wrapper (graceful + CON-04 카피 가드).
//
// 정책 (ElevenLabs client 패턴 동일):
//   - isF16PushEnabled() off → { ok:false, skipped:true } (실 발송 0). 게이트 off / 키 부재 보호.
//   - CON-04: title/body 금칙어 발견 시 _fail-closed_ — 발송 거부 ({ ok:false, error:'forbidden_copy' }).
//   - web-push 404/410 (Gone) → { ok:false, gone:true } — 호출 측이 구독 row DELETE 처리.
//   - 기타 HTTP / 네트워크 실패 → { ok:false, error } graceful (Cron 다음 주기 재시도).
//
// R4: payload 는 일반 유도 카피만 (자녀 식별 정보 0건 — 호출 측 책임).
//
// Refs: TASK_API-020.md, REQ-FUNC-040, https://github.com/web-push-libs/web-push

import webpush from "web-push";

import { hasBannedTerm } from "@/lib/forbidden-words";

import { getVapidKeys, isF16PushEnabled } from "./config";

export interface PushTarget {
  /// Web Push endpoint URL (push gateway).
  endpoint: string;
  /// 구독 공개키 (p256dh).
  p256dh: string;
  /// 구독 auth secret.
  auth: string;
}

export interface PushPayload {
  /// 알림 제목 (CON-04 금칙어 자동 검증 대상).
  title: string;
  /// 알림 본문 (CON-04 금칙어 자동 검증 대상).
  body: string;
  /// 클릭 시 이동 경로 (SW notificationclick 핸들러). default '/'.
  url?: string;
}

export interface PushSendResult {
  ok: boolean;
  /// 게이트 off / VAPID 키 부재로 skip (실패 아님 — 의도적 무발송).
  skipped?: boolean;
  /// 구독 만료 (404 / 410 Gone) — 호출 측 DELETE 대상.
  gone?: boolean;
  /// 실패 사유.
  error?: string;
  /// web-push 응답 / 에러 statusCode (있으면).
  statusCode?: number;
}

/// VAPID 1회 설정 가드 — 프로세스당 setVapidDetails 1회.
let vapidConfigured = false;

function ensureVapid(): boolean {
  const keys = getVapidKeys();
  if (!keys) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
    vapidConfigured = true;
  }
  return true;
}

/**
 * 단건 Web Push 발송.
 *
 * 게이트 → CON-04 가드 → VAPID → 발송 순. 어느 단계든 실패 시 graceful 결과 객체 반환 (throw 0).
 */
export async function sendPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<PushSendResult> {
  // (1) 게이트 — off 시 무발송 (실 발송 0건 보장).
  if (!isF16PushEnabled()) {
    return { ok: false, skipped: true, error: "F16 push disabled" };
  }

  // (2) CON-04 — 카피 금칙어 fail-closed (의료 표현 발송 차단).
  if (hasBannedTerm(payload.title) || hasBannedTerm(payload.body)) {
    return { ok: false, error: "forbidden_copy" };
  }

  // (3) VAPID 설정 (키 부재 시 skip).
  if (!ensureVapid()) {
    return { ok: false, skipped: true, error: "VAPID keys not set" };
  }

  // (4) 발송.
  try {
    const subscription = {
      endpoint: target.endpoint,
      keys: { p256dh: target.p256dh, auth: target.auth },
    };
    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/",
    });
    const res = await webpush.sendNotification(subscription, body);
    return { ok: true, statusCode: res.statusCode };
  } catch (err) {
    const statusCode =
      typeof (err as { statusCode?: number }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : undefined;
    // 404 Not Found / 410 Gone → 브라우저가 구독 해지 → 호출 측 row DELETE.
    if (statusCode === 404 || statusCode === 410) {
      return { ok: false, gone: true, statusCode, error: "subscription_gone" };
    }
    return {
      ok: false,
      statusCode,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
