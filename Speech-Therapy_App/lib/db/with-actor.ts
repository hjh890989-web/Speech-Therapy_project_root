// DB-011 후속 — actor_id GUC 주입 헬퍼 (AuditLog TRIGGER 실 user id 캡처).
//
// 배경:
//   prisma/migrations/20260522210000_audit_log_triggers/migration.sql 의
//   audit_trigger_fn() 은 다음 패턴으로 actorId 를 읽음:
//
//     v_actor := COALESCE(NULLIF(current_setting('audit.actor_id', true), ''), 'system');
//
//   GUC (audit.actor_id) 가 비어 있으면 'system' 폴백. 모든 audit row 가
//   actor=system 으로 적재되어 _누가_ 변경했는지 식별 불가.
//
// 본 헬퍼의 책임:
//   prisma.$transaction 진입 시점에 SET LOCAL (set_config(..., true)) 으로
//   audit.actor_id 를 주입 → 같은 트랜잭션의 후속 SQL (UPDATE/INSERT/DELETE)
//   가 TRIGGER 를 발화시킬 때 v_actor 가 실 user id 로 캡처됨.
//
// LOCAL scope (set_config 3rd arg = true) 의 의미:
//   - 트랜잭션 종료 (commit / rollback) 시 자동 무효 → 풀 재사용 안전.
//   - 다른 트랜잭션에 누설 X → 동시성 안전.
//   - 명시적 RESET 필요 없음.
//
// SQL injection 방어:
//   - actorId 형식 검증: UUID v4 또는 영숫자 ([a-zA-Z0-9_-]{1,128}).
//   - 검증 실패 시 throw → 호출 측이 trusted source 만 전달하도록 강제.
//   - PostgreSQL set_config(name, value, is_local) 는 parameterized query
//     지원 — Prisma $queryRaw template literal 사용 (tagged template 내부에서
//     자동 parameterize).
//
// 사용 예:
//   await withActor(userId, async (tx) => {
//     await tx.hITLQueue.update({ where: { id }, data: { ... } });
//   });
//
// 호출 책임:
//   - actorId 가 null/undefined/빈 문자열 → set_config 호출 생략
//     → TRIGGER 가 'system' 폴백 사용 (graceful).
//   - 호출 측이 익명 사용자 흐름인 경우 그대로 null 전달.
//
// Refs:
//   - prisma/migrations/20260522210000_audit_log_triggers/migration.sql
//   - lib/audit.ts (application-level audit, _보완_ 관계 — 본 helper 는 DB-level).
//   - REQ-NF-019 (RBAC + Audit Log).

import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * actorId 형식 검증 패턴.
 *
 * - UUID v4: Supabase auth uid (대부분의 호출 경로).
 * - 영숫자 / 하이픈 / 언더스코어 1~128자: anonymous_user_id (cookie) 호환.
 *
 * 의도: SQL injection 시도 ("' OR 1=1 --" 등) 가 형식 검증에서 즉시 차단.
 *       Prisma $queryRaw 가 parameterize 하지만 _이중 방어_.
 */
const ACTOR_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

/** actorId 가 유효 형식인지 검증 — 실패 시 throw. */
function assertValidActorId(actorId: string): void {
  if (!ACTOR_ID_PATTERN.test(actorId)) {
    throw new Error(
      `[withActor] invalid actorId format — 영숫자/하이픈/언더스코어 1~128자만 허용 (SQL injection 방어).`,
    );
  }
}

/**
 * actor-aware Prisma 트랜잭션 헬퍼.
 *
 * - actorId 가 truthy 면 set_config('audit.actor_id', actorId, true) 호출 →
 *   본 트랜잭션 범위에서 audit_trigger_fn() 가 actorId 캡처.
 * - actorId 가 null / undefined / 빈 문자열 → set_config 호출 생략
 *   (TRIGGER 가 'system' 폴백 — graceful).
 * - fn throw → 트랜잭션 rollback (Prisma 기본 동작) + set_config 도 자동 무효
 *   (LOCAL scope).
 *
 * @param actorId 인증 user id (Supabase auth uid) 또는 anonymous_user_id.
 *                null/undefined/'' 시 system fallback (TRIGGER 측).
 * @param fn      트랜잭션 안에서 실행할 함수. tx (TransactionClient) 받음.
 * @returns       fn 의 반환값.
 * @throws        actorId 형식 부적합 시 (SQL injection 방어).
 */
export async function withActor<T>(
  actorId: string | null | undefined,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  // 사전 검증 — 트랜잭션 시작 _전_ 에 throw 하여 불필요한 BEGIN/ROLLBACK 회피.
  const normalized =
    typeof actorId === "string" && actorId.length > 0 ? actorId : null;
  if (normalized !== null) {
    assertValidActorId(normalized);
  }

  return prisma.$transaction(async (tx) => {
    if (normalized !== null) {
      // Prisma $queryRaw tagged template — ${normalized} 가 parameterize 됨.
      // 본 트랜잭션 범위에서만 유효 (3rd arg true = LOCAL).
      // unknown 반환 (set_config 는 텍스트 반환) — 결과 무시.
      await tx.$queryRaw`SELECT set_config('audit.actor_id', ${normalized}, true)`;
    }
    return fn(tx);
  });
}
