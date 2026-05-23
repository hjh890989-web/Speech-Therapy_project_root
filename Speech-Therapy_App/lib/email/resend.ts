// API-012 (#13) — Resend 이메일 어댑터 (Replace 67-D1 + D8).
//
// 카카오톡 알림톡 (REQ-FUNC-030/059) / 키즈노트 API (REQ-FUNC-058) Replace —
// 외부 API 의존성 0 (R5: 정책 변경 영향 0). Resend 이메일 + 클립보드 폴백 + Slack 어댑터 (별도)
// 4종 채널로 모든 알림 시나리오 커버.
//
// 환경 변수:
//   - RESEND_API_KEY: 필수. 미설정 시 graceful skip ({ ok: false, skipped: true }).
//   - RESEND_FROM_EMAIL / RESEND_FROM_NAME: lib/email/from.ts 위임.
//
// graceful 정책 — throw 절대 금지:
//   - API key 미설정 → skipped: true
//   - NODE_ENV === 'test' → 자동 skip (실 발송 방지)
//   - SDK 호출 실패 → ok: false + error 메시지
//   - 10s timeout → ok: false + error: 'timeout'
//
// CON-04 보호:
//   - subject + html + text 본문 스캔. 금칙어 ("치료/진단/장애") 발견 시 발송 차단 + warn log.
//   - 화이트리스트 ("치료실/치료사/언어치료") 는 forbidden-words.ts 가 자동 예외.
//
// 호출 측 책임:
//   - 발송 경로별 RBAC / R4 (자녀 식별 정보 보호) 검증
//   - 본 helper 는 thin wrapper — 인증 / 권한 / 비즈니스 룰 미관여.
//
// 본 PR 범위: helper 만. 실 호출 경로 (FR-C-018 동의서 / 부모 초대 / 쿠션어 알림장) 는 별도 PR.

import { Resend } from "resend";
import { hasBannedTerm, findBannedTerms } from "@/lib/forbidden-words";
import { getFromAddress } from "@/lib/email/from";

/// 이메일 발송 요청 — 호출 측 입력 (thin wrapper interface).
export interface EmailMessage {
  /// 수신자 — string 또는 array (Resend SDK 위임).
  to: string | string[];
  /// 제목.
  subject: string;
  /// HTML 본문 (선택). 최소 하나 (html 또는 text) 필수 — Resend SDK 검증.
  html?: string;
  /// Plain text 본문 (선택).
  text?: string;
  /// 회신 주소 (선택). 부모 초대 / 동의서 등에서 운영 이메일 지정.
  replyTo?: string;
  /// Resend tags — 분석 / webhook 필터링용 (key/value 쌍).
  tags?: Array<{ name: string; value: string }>;
}

/// 발송 결과.
export interface SendResult {
  /// 실 발송 성공 시 true.
  ok: boolean;
  /// Resend 가 발급한 이메일 id (성공 시).
  id?: string;
  /// 환경변수 미설정 / NODE_ENV='test' 로 skip 한 경우 true.
  skipped: boolean;
  /// 실패 사유 (skipped 또는 ok=false 시).
  error?: string;
}

/// SDK 호출 timeout (ms) — REQ-NF-PERF / AGENTS.md §2.4 (외부 의존 < 10s).
const TIMEOUT_MS = 10_000;

/// 본 helper 안에서만 사용 — singleton client 캐시 (key 별).
let cachedClient: Resend | null = null;
let cachedKey: string | null = null;

function getClient(apiKey: string): Resend {
  if (cachedClient && cachedKey === apiKey) return cachedClient;
  cachedClient = new Resend(apiKey);
  cachedKey = apiKey;
  return cachedClient;
}

/// 테스트 전용 — singleton client 캐시 초기화 (vi.mock 사이클 사이).
export function __resetResendClientForTests(): void {
  cachedClient = null;
  cachedKey = null;
}

/// CON-04 금칙어 검증 — subject + html + text 본문 스캔.
/// 발견 시 첫 매칭 토큰 반환 (호출 측 error 메시지에 사용). 없으면 null.
function detectBannedTerms(message: EmailMessage): string | null {
  const haystacks: Array<{ field: string; value: string }> = [
    { field: "subject", value: message.subject ?? "" },
    { field: "html", value: message.html ?? "" },
    { field: "text", value: message.text ?? "" },
  ];
  for (const { field, value } of haystacks) {
    if (!value) continue;
    if (hasBannedTerm(value)) {
      const matches = findBannedTerms(value);
      const first = matches[0];
      return `${field}:${first.tier}:${first.match}`;
    }
  }
  return null;
}

/// Resend 이메일 발송 — graceful (throw 금지).
///
/// 분기:
///   1) NODE_ENV === 'test' → skipped: true (실 발송 차단)
///   2) RESEND_API_KEY 미설정 → skipped: true
///   3) CON-04 금칙어 → ok: false + error: 'banned_term:...' (발송 차단)
///   4) 본문 (html + text) 모두 없음 → ok: false + error: 'no_body'
///   5) SDK 호출 → 10s timeout AbortController + try/catch
///   6) Resend 응답 error 필드 → ok: false + error 메시지
///   7) 성공 → ok: true + id (CreateEmailResponseSuccess.id)
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  // 1) test 환경 자동 skip.
  if (process.env.NODE_ENV === "test") {
    return { ok: false, skipped: true, error: "test_env_skip" };
  }

  // 2) API key 미설정 graceful skip.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY not set" };
  }

  // 3) CON-04 금칙어 검증 — 발송 차단 + warn log.
  const banned = detectBannedTerms(message);
  if (banned) {
    console.warn(
      `[email/resend] CON-04 banned term detected — send blocked. Token: ${banned}`,
    );
    return { ok: false, skipped: false, error: `banned_term:${banned}` };
  }

  // 4) 본문 부재 방어.
  if (!message.html && !message.text) {
    return { ok: false, skipped: false, error: "no_body" };
  }

  // 5~7) SDK 호출 with timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const client = getClient(apiKey);
    const response = await Promise.race([
      client.emails.send({
        from: getFromAddress(),
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        tags: message.tags,
      } as Parameters<typeof client.emails.send>[0]),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          reject(new Error("timeout"));
        });
      }),
    ]);

    // Resend response shape: { data: { id }, error: ErrorResponse | null }
    if (response.error) {
      const errMsg = typeof response.error === "object" && response.error
        ? (response.error as { message?: string }).message ?? "resend_error"
        : "resend_error";
      return { ok: false, skipped: false, error: errMsg };
    }
    const id = response.data?.id;
    if (!id) {
      return { ok: false, skipped: false, error: "no_id_returned" };
    }
    return { ok: true, id, skipped: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, skipped: false, error: errMsg };
  } finally {
    clearTimeout(timer);
  }
}
