// FR-C-SECURITY (MFA 마무리) — Backup codes hash 저장 / 사용 / 잔여 카운트 헬퍼.
//
// 책임:
//   1) storeBackupCodes(userId, codes[])  → 평문 codes 를 sha256 hash 후 User.totpBackupCodes 에 저장.
//   2) useBackupCode(userId, code)        → 입력 평문 code 를 hash 비교 → 일치 시 1회용 제거 → 잔여 카운트.
//   3) getRemainingBackupCodesCount(userId) → 잔여 hash 카운트만 노출 (평문 미노출).
//
// 정책 (R4 / 보안):
//   - hash 만 DB 보존 — 원본 평문 불가역 (사용자 1회 표시 후 폐기).
//   - sha256 채택 (bcrypt 미사용):
//       * backup code 31^8 ≈ 8.5e11 random — pre-image 저항 충분.
//       * bcrypt cost 12 ~250ms × 8 codes = ~2초 — UX 저하.
//       * code 본문 자체가 high entropy — salt 불필요.
//   - code 입력 시 UPPERCASE normalize → 대소문자 무관 매칭 (사용자 입력 편의).
//   - 1회 사용 후 array 에서 제거 → DB 레벨 멱등 (재사용 시 ok: false).
//
// withActor:
//   - 모든 mutation 은 withActor(userId, ...) 안에서 실행 → audit_user_changes TRIGGER
//     가 actorId 캡처 (User UPDATE 시점).
//   - 본인 userId 만 인자로 받음 (호출 측이 auth.uid 만 전달 — 외부 입력 차단).
//
// 멱등 / 동시성:
//   - useBackupCode: Prisma update + set 으로 array 전체 교체 → 동시 호출 시 마지막 승.
//     (간헐적 race 가 발생해도 _재사용_ 만 발생, 보안 위험 X — TOTP 검증과 OR 분기이므로
//      이중 인증 효과 유지). 본 PR 은 SELECT-then-UPDATE 패턴 사용 (트랜잭션 1회).
//   - storeBackupCodes: 전체 교체 (set) — enroll / regenerate 둘 다 동일 path.
//
// CON-04: 본 모듈의 모든 코드/주석에 "치료/진단/장애" 금칙어 0건.

import { createHash } from "node:crypto";

import { prisma } from "@/lib/db";
import { withActor } from "@/lib/db/with-actor";

/**
 * 단일 backup code 의 sha256 hash 를 hex digest 로 반환.
 *
 * - UPPERCASE normalize → 사용자 입력 대소문자 무관 매칭.
 *   (generateBackupCodes 가 이미 대문자만 출력하지만, 사용자가 손으로 소문자 입력 가능 →
 *    저장도 normalize 후 hash 해야 매칭 가능).
 * - 64 chars hex (sha256 256bit ÷ 4bit/char).
 */
export function hashBackupCode(code: string): string {
  return createHash("sha256")
    .update(code.toUpperCase())
    .digest("hex");
}

/**
 * 평문 codes 8개를 hash 후 User.totpBackupCodes 에 저장 (기존 값 전부 교체).
 *
 * 호출 시점:
 *   - verifyTotpEnroll 성공 직후 (최초 enroll — backup codes 1회 표시 + 저장).
 *   - regenerateBackupCodes Server Action (사용자 재생성 요청 — 기존 무효화).
 *
 * R4: userId 는 auth.uid 만 전달 (호출 측 책임).
 */
export async function storeBackupCodes(
  userId: string,
  codes: string[],
): Promise<void> {
  const hashes = codes.map((c) => hashBackupCode(c));
  await withActor(userId, (tx) =>
    tx.user.update({
      where: { id: userId },
      data: { totpBackupCodes: hashes },
    }),
  );
}

/** useBackupCode 응답 — 성공 여부 + 잔여 카운트. */
export interface UseBackupCodeResult {
  /** true: 일치하는 hash 발견 + 1회용 제거 완료. false: 미일치 / 이미 사용됨. */
  ok: boolean;
  /** 본 호출 후 남은 backup code 개수 (0 이상). */
  remaining: number;
}

/**
 * 평문 code 입력 → hash 비교 → 일치 시 array 에서 제거 → 잔여 카운트.
 *
 * 시나리오:
 *   - 일치 → ok: true + remaining = N-1.
 *   - 미일치 (잘못된 code 또는 이미 사용됨) → ok: false + remaining = N (불변).
 *   - 비정상 userId (User row 없음) → ok: false + remaining = 0.
 *
 * 멱등성: 같은 code 를 재호출하면 첫 호출만 ok: true, 이후는 ok: false.
 *
 * R4: userId 는 auth.uid 만 전달.
 */
export async function useBackupCode(
  userId: string,
  code: string,
): Promise<UseBackupCodeResult> {
  const target = hashBackupCode(code);
  // 트랜잭션 안에서 SELECT-then-UPDATE — 동시성 race 는 본 PR 정책상 허용 (TOTP 와 OR).
  return withActor(userId, async (tx) => {
    const row = await tx.user.findUnique({
      where: { id: userId },
      select: { totpBackupCodes: true },
    });
    if (!row) {
      return { ok: false, remaining: 0 };
    }
    const current = row.totpBackupCodes ?? [];
    const idx = current.indexOf(target);
    if (idx === -1) {
      // 미일치 — 이미 사용됐거나 잘못된 code. 잔여 카운트는 불변.
      return { ok: false, remaining: current.length };
    }
    const next = current.filter((_, i) => i !== idx);
    await tx.user.update({
      where: { id: userId },
      data: { totpBackupCodes: next },
    });
    return { ok: true, remaining: next.length };
  });
}

/**
 * 잔여 backup code 카운트만 노출 (평문/hash 본문 미노출).
 *
 * 호출 시점: /settings/security 카드의 "백업 코드 X개 남음" 안내.
 */
export async function getRemainingBackupCodesCount(
  userId: string,
): Promise<number> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { totpBackupCodes: true },
    });
    if (!row) return 0;
    return row.totpBackupCodes?.length ?? 0;
  } catch {
    // graceful — DB 일시 장애 시 0 (UI 가 보수적으로 "재생성 권장" 노출).
    return 0;
  }
}
