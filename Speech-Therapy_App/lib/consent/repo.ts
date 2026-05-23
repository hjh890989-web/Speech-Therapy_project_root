// FR-C-018 (#41) — ConsentSignature 데이터 액세스 helper.
//
// 책임 분리:
//   - 본 모듈: prisma 호출 + token 생성 + 멱등 처리 (createOrReturnPending / findByToken / markSigned / ...)
//   - app/api/consent/sign/route.ts: 보안 4중 layer + 이메일 발송 orchestration
//   - app/api/cron/consent-reminder & consent-expire: cron 인증 + 대량 스캔
//   - app/actions/consent-sign.ts: 서명 페이지 form Server Action
//
// 본 모듈은 _Prisma 의존성만 캡슐화_ — 단위 테스트는 prisma mock 으로 격리.
// 외부 I/O (Resend 발송, Slack 알림) 는 호출 측 책임.
//
// 멱등 / 어뷰징 방어:
//   - createOrReturnPending: 같은 parentEmail + childName + consentType 으로 active pending 이 있으면
//     기존 row 의 token 그대로 반환 (재발급 X) — 어뷰징 (중복 발송) 차단.
//   - markSigned: 이미 signed 상태이면 재서명 차단 (no-op + already=true 반환).
//   - markRemindedBatch / expireBatch: cron 멱등 — remindedAt/status 조건 SQL 에서 강제.
//
// R4 (자녀 보호):
//   - childName 은 부모 컨텍스트 한정 — 외부 응답 / 로그 / Slack 노출 금지 (호출 측 책임).
//   - 본 helper 는 형식적 sanitize 하지 않음 — schema 가 1차 차단.

import { prisma } from "@/lib/db";
import { randomUUID } from "node:crypto";

/// 7일 만료 정책 — 본 모듈 + cron 양쪽에서 공통 사용.
export const CONSENT_EXPIRE_DAYS = 7;
/// D+3 리마인더 정책 — 본 모듈 + cron 양쪽에서 공통 사용.
export const CONSENT_REMINDER_DAYS = 3;

/// 단일 cron 주기 max 처리 row (DB / Resend 폭주 방어).
export const CONSENT_BATCH_LIMIT = 100;

export interface ConsentSignatureRow {
  id: string;
  parentEmail: string;
  parentName: string;
  childNickname: string;
  consentType: string;
  status: string;
  token: string;
  sentAt: Date;
  remindedAt: Date | null;
  signedAt: Date | null;
  expiredAt: Date | null;
  institutionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConsentInput {
  parentEmail: string;
  parentName: string;
  childNickname: string;
  consentType?: string;
  institutionId?: string | null;
}

export interface CreateConsentResult {
  /// 신규 발급된 경우 true. 기존 pending row 가 반환된 경우 false.
  created: boolean;
  row: ConsentSignatureRow;
}

/**
 * 멱등 발급 — 동일 (parentEmail + childName + consentType) 의 pending row 가 이미 존재하면
 * 기존 row 그대로 반환 (재발급 X). 없으면 신규 INSERT.
 *
 * "active pending" 정의: status='pending'. 만료된 row 가 있어도 신규 발급 허용 (재요청 시나리오).
 *
 * token 은 randomUUID() — UUID v4. URL-safe + 충돌 확률 negligible.
 */
export async function createOrReturnPendingConsent(
  input: CreateConsentInput,
): Promise<CreateConsentResult> {
  const consentType = input.consentType ?? "data_usage";

  // 기존 pending 조회 — 같은 parentEmail + childNickname + consentType.
  const existing = await prisma.consentSignature.findFirst({
    where: {
      parentEmail: input.parentEmail,
      childNickname: input.childNickname,
      consentType,
      status: "pending",
    },
    orderBy: { sentAt: "desc" },
  });
  if (existing) {
    return { created: false, row: existing as ConsentSignatureRow };
  }

  // 신규 발급.
  const token = randomUUID();
  const row = await prisma.consentSignature.create({
    data: {
      parentEmail: input.parentEmail,
      parentName: input.parentName,
      childNickname: input.childNickname,
      consentType,
      token,
      status: "pending",
      institutionId: input.institutionId ?? null,
    },
  });
  return { created: true, row: row as ConsentSignatureRow };
}

/// token 으로 단건 조회. 미존재 시 null.
export async function findConsentByToken(
  token: string,
): Promise<ConsentSignatureRow | null> {
  if (!token || typeof token !== "string") return null;
  const row = await prisma.consentSignature.findUnique({
    where: { token },
  });
  return row as ConsentSignatureRow | null;
}

export interface MarkSignedInput {
  token: string;
  signedIp?: string | null;
  signedUa?: string | null;
  now?: Date;
}

export interface MarkSignedResult {
  /// 본 호출에서 처음 signed 처리된 경우 true.
  signed: boolean;
  /// 이미 signed 였던 경우 true (재호출).
  alreadySigned: boolean;
  /// 만료 / 미존재 등 처리 불가 케이스.
  notFound: boolean;
  expired: boolean;
  row?: ConsentSignatureRow;
}

/**
 * 서명 완료 처리 — 멱등.
 *
 * 분기:
 *   - token 미존재 → notFound: true
 *   - status='signed' → alreadySigned: true (no-op)
 *   - status='expired' → expired: true (재서명 차단)
 *   - status='pending' → status='signed' + signedAt=now() update
 */
export async function markConsentSigned(
  input: MarkSignedInput,
): Promise<MarkSignedResult> {
  const now = input.now ?? new Date();
  const row = await prisma.consentSignature.findUnique({
    where: { token: input.token },
  });
  if (!row) {
    return { signed: false, alreadySigned: false, notFound: true, expired: false };
  }
  const typed = row as ConsentSignatureRow;
  if (typed.status === "signed") {
    return {
      signed: false,
      alreadySigned: true,
      notFound: false,
      expired: false,
      row: typed,
    };
  }
  if (typed.status === "expired") {
    return {
      signed: false,
      alreadySigned: false,
      notFound: false,
      expired: true,
      row: typed,
    };
  }
  const updated = await prisma.consentSignature.update({
    where: { token: input.token },
    data: {
      status: "signed",
      signedAt: now,
      signedIp: input.signedIp ?? null,
      signedUa: input.signedUa ?? null,
    },
  });
  return {
    signed: true,
    alreadySigned: false,
    notFound: false,
    expired: false,
    row: updated as ConsentSignatureRow,
  };
}

/**
 * D+3 리마인더 대상 조회 — status='pending' + sentAt < now-3d + remindedAt IS NULL.
 * 어뷰징 방어: BATCH_LIMIT take (sentAt asc — 가장 오래된 것 우선).
 */
export async function findReminderCandidates(
  now: Date = new Date(),
): Promise<ConsentSignatureRow[]> {
  const threshold = new Date(
    now.getTime() - CONSENT_REMINDER_DAYS * 24 * 60 * 60 * 1000,
  );
  const rows = await prisma.consentSignature.findMany({
    where: {
      status: "pending",
      sentAt: { lt: threshold },
      remindedAt: null,
    },
    orderBy: { sentAt: "asc" },
    take: CONSENT_BATCH_LIMIT,
  });
  return rows as ConsentSignatureRow[];
}

/// 단건 remindedAt 마킹 — cron 의 per-item 발송 성공 후 호출.
export async function markReminded(id: string, now: Date = new Date()): Promise<void> {
  await prisma.consentSignature.update({
    where: { id },
    data: { remindedAt: now },
  });
}

/**
 * 7일 만료 대상 조회 — status='pending' + sentAt < now-7d.
 * 본 helper 는 _조회만_ — bulk update 는 별도 expireBatch (또는 호출 측 per-item).
 */
export async function findExpireCandidates(
  now: Date = new Date(),
): Promise<ConsentSignatureRow[]> {
  const threshold = new Date(
    now.getTime() - CONSENT_EXPIRE_DAYS * 24 * 60 * 60 * 1000,
  );
  const rows = await prisma.consentSignature.findMany({
    where: {
      status: "pending",
      sentAt: { lt: threshold },
    },
    orderBy: { sentAt: "asc" },
    take: CONSENT_BATCH_LIMIT,
  });
  return rows as ConsentSignatureRow[];
}

/// 단건 만료 처리 — cron 의 per-item 이메일 발송 결과와 무관하게 우선 status 전환.
export async function markExpired(id: string, now: Date = new Date()): Promise<void> {
  await prisma.consentSignature.update({
    where: { id },
    data: { status: "expired", expiredAt: now },
  });
}

/**
 * 발송 후 경과 일수 계산 (반올림). cron + analytics 양쪽에서 사용.
 */
export function daysSince(sentAt: Date, now: Date = new Date()): number {
  const diffMs = now.getTime() - sentAt.getTime();
  return Math.max(0, Math.round(diffMs / (24 * 60 * 60 * 1000)));
}
