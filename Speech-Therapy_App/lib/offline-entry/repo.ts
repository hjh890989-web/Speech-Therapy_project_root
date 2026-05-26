// FR-Q-013 후속 — OfflineEntry Prisma 액세스 helper (SERVER-ONLY).
//
// 책임 (Server-side only):
//   - createOfflineEntry: withActor(authorId, ...) 트랜잭션 — audit_trigger_fn 의
//     actor_id 가 입력 teacher 의 user.id 로 캡처.
//   - listOfflineEntriesForUser: 단일 userId 의 오프라인 entry 목록 조회 (select 만).
//     권한 (cross-tenant / RBAC) 은 호출 측 책임 — 본 함수는 단일 책임.
//   - deleteOfflineEntry: 단일 id 삭제. byUserId 는 audit actor 만 — RLS 가 admin
//     only 강제하므로 본 helper 는 형식 유지용.
//
// R4 (자녀 보호):
//   - 반환 shape 에 자녀 식별 정보 (이름/email) 미포함 — 모델 컬럼만.
//   - note 본문은 그대로 반환 — UI 측 sanitize 책임.
//
// CON-04: note 본문 검증은 호출 측 (Server Action 진입 시) 책임 — 본 repo 는
//         DB IO 만, sanitize/validation 미수행.
//
// 성능: listOfflineEntriesForUser 의 default limit 20 (UI 표시 한도).
//
// FR-PERF-3-CLIENT-LEAK-GUARD — 순수 shape (타입/상수) 는 `./types` 으로 분리되어
// Client Component 가 안전하게 import. 본 파일은 prisma 의존 server-only helper.

import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/db/with-actor";

import {
  OFFLINE_ENTRY_KINDS,
  OFFLINE_ENTRY_NOTE_MAX_LENGTH,
  OFFLINE_ENTRY_DEFAULT_LIMIT,
  type CreateOfflineEntryInput,
  type OfflineEntry,
  type OfflineEntryKind,
} from "./types";

// 기존 import path 호환 — server-only callers (lib/timeline, Server Action, RSC page,
// tests) 가 변경 없이 본 파일에서 types/상수를 계속 import 할 수 있도록 re-export.
export {
  OFFLINE_ENTRY_KINDS,
  OFFLINE_ENTRY_NOTE_MAX_LENGTH,
  OFFLINE_ENTRY_DEFAULT_LIMIT,
  type CreateOfflineEntryInput,
  type OfflineEntry,
  type OfflineEntryKind,
};

/**
 * 오프라인 entry 1건 INSERT.
 *
 * withActor(authorId, ...) 트랜잭션 안에서 실행 → audit_trigger_fn 의 actor_id
 * 가 입력 teacher 의 user.id 로 캡처됨.
 *
 * @throws Prisma 에러 (FK 위반 / RLS 차단 등) — 호출 측 (Server Action) 이 catch.
 */
export async function createOfflineEntry(
  input: CreateOfflineEntryInput,
): Promise<OfflineEntry> {
  const observedAt = input.observedAt ?? new Date();
  const institutionId = input.institutionId ?? null;

  // withActor — audit actor 캡처 + 트랜잭션.
  // Prisma tx client 가 .offlineEntry 를 노출 (schema 모델 이름 → camelCase).
  const row = await withActor(input.authorId, async (tx) => {
    // unknown cast — generated client 부재 환경에서 typecheck 통과용.
    // 실 prod 빌드 시 PrismaClient 가 OfflineEntry delegate 자동 노출.
    const txAny = tx as unknown as {
      offlineEntry: {
        create: (args: { data: Prisma.InputJsonValue | Record<string, unknown>; select?: Record<string, true> }) => Promise<OfflineEntry>;
      };
    };
    return txAny.offlineEntry.create({
      data: {
        userId: input.userId,
        authorId: input.authorId,
        kind: input.kind,
        note: input.note,
        observedAt,
        institutionId,
      },
    });
  });
  return row;
}

/**
 * 특정 자녀 (userId) 의 최근 오프라인 entry 목록 — observedAt desc.
 *
 * 권한 검사는 호출 측 책임 — 본 함수는 단일 책임 (단순 SELECT).
 * 빈 userId 입력 시 빈 배열 반환 (호출 측 graceful).
 */
export async function listOfflineEntriesForUser(
  userId: string,
  limit: number = OFFLINE_ENTRY_DEFAULT_LIMIT,
): Promise<OfflineEntry[]> {
  if (!userId) return [];

  const prismaAny = prisma as unknown as {
    offlineEntry: {
      findMany: (args: Record<string, unknown>) => Promise<OfflineEntry[]>;
    };
  };

  return prismaAny.offlineEntry.findMany({
    where: { userId },
    orderBy: { observedAt: "desc" },
    take: limit,
  });
}

/**
 * 단일 오프라인 entry 삭제 — admin only (RLS).
 *
 * byUserId 는 audit actor 용 — RLS 정책이 admin role 강제하므로 본 helper 는
 * actor 캡처만 책임 (실 admin 검증은 RLS + Server Action 측).
 *
 * @returns { success: true } 성공 시 / 실패 시 throw (Prisma P2025 등).
 */
export async function deleteOfflineEntry(
  id: string,
  byUserId: string,
): Promise<{ success: boolean }> {
  if (!id) {
    return { success: false };
  }
  await withActor(byUserId, async (tx) => {
    const txAny = tx as unknown as {
      offlineEntry: {
        delete: (args: { where: { id: string } }) => Promise<OfflineEntry>;
      };
    };
    await txAny.offlineEntry.delete({ where: { id } });
  });
  return { success: true };
}
