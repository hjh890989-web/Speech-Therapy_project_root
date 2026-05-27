// FR-Q-NEW-F17-UI-B — 부모 케어로그 주간 요약 helper (V07).
//
// 책임 (Server-side only):
//   - 단일 userId 의 직전 7일 OfflineEntry 중 부모 입력 kind 만 집계.
//   - kind 별 카운트 + 마지막 입력 시각 반환.
//   - /reports 페이지의 카드 위젯 표시용.
//
// R4: 자녀 식별 정보 미반환 — 카운트 + 마지막 시각만.
// CON-04: 본 모듈은 데이터 집계, 카피 미생성.

import { prisma } from "@/lib/db";
import { PARENT_CARE_LOG_KINDS } from "@/lib/offline-entry/repo";

export interface ParentCareLogWeeklySummary {
  /// 직전 7일 합계.
  totalCount: number;
  /// kind 별 카운트.
  byKind: Record<string, number>;
  /// 마지막 입력 시각 (없으면 null).
  lastObservedAt: Date | null;
}

/** 직전 7일 부모 케어로그 집계. */
export async function loadParentCareLogWeeklySummary(
  userId: string,
  now: Date = new Date(),
): Promise<ParentCareLogWeeklySummary> {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  try {
    const rows = await prisma.offlineEntry.findMany({
      where: {
        userId,
        authorId: userId, // 부모 본인 입력 (subject == author)
        kind: { in: [...PARENT_CARE_LOG_KINDS] },
        observedAt: { gte: sevenDaysAgo },
      },
      select: { kind: true, observedAt: true },
      orderBy: { observedAt: "desc" },
    });

    const byKind: Record<string, number> = {};
    for (const k of PARENT_CARE_LOG_KINDS) byKind[k] = 0;
    for (const row of rows) {
      byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
    }

    return {
      totalCount: rows.length,
      byKind,
      lastObservedAt: rows[0]?.observedAt ?? null,
    };
  } catch (err) {
    // DB 일시 장애 — graceful (사용자 흐름 차단 X).
    console.error("[F17-UI-B] loadParentCareLogWeeklySummary failed:", err);
    return {
      totalCount: 0,
      byKind: {},
      lastObservedAt: null,
    };
  }
}
