// FR-Q-004 (#45) — 보상 도감 집계 helper.
//
// 책임 (Server-side only):
//   1) 본인 userId 범위로 한정 (R4 / cross-user 차단) — 호출 측이 page.tsx 에서
//      Supabase auth or anonymous cookie 로 확보한 본인 userId 만 전달.
//   2) RewardLog 단일 모델로 별 / 나무 / AI 그림 누적합 계산.
//   3) RewardProgress 가 이미 누적합 캐시를 보유 (FR-C-009) 하지만, 도감은 "발급 이력" 의
//      ground truth 인 RewardLog 를 직접 집계 → 분쟁 / 감사 추적 일관성 보장.
//   4) AI 그림 (drawing) 은 RewardLog 에 amount 만 누적되어 imageUrl 메타가 없음.
//      현재 schema (Prisma 7.8) 에 AI 그림 이미지 모델 부재 → aiArts 는 빈 배열 폴백.
//      향후 Phase 1+ 에서 AiDrawing 모델 도입 시 본 helper 만 갱신.
//
// 집계 패턴:
//   - prisma.rewardLog.groupBy({ by: ['rewardType'], where: { userId }, _sum: { amount } })
//   - 단일 쿼리로 별/나무/AI 누적합 동시 산출 (N+1 회피, RSC LCP < 3,000ms 보장).
//
// R4:
//   - userId 비어 있거나 미인증 → empty (stars=0, trees=0, aiArts=[]) 반환.
//   - 본 함수는 입력 userId 만 신뢰 — cross-user 차단은 호출 측 책임 (page.tsx).

import { prisma } from "@/lib/db";

/**
 * AI 그림 보상 메타데이터 (현재 schema 미지원 — 빈 배열 반환).
 * Phase 1+ 에서 AiDrawing 모델 도입 시 채워질 placeholder shape.
 */
export interface AiArtSummary {
  id: string;
  imageUrl: string;
  createdAt: Date;
}

/** 보상 도감 단일 집계 결과. */
export interface RewardCollectionData {
  /// star 누적합 (RewardLog.amount sum where rewardType='star').
  stars: number;
  /// tree 누적합 (RewardLog.amount sum where rewardType='tree').
  trees: number;
  /// AI 그림 발급 카운트 (schema 부재 시 0, aiArts 는 빈 배열).
  aiArtsCount: number;
  /// AI 그림 thumbnail 메타 (Phase 1+ 도입 — 현재는 항상 빈 배열).
  aiArts: AiArtSummary[];
}

/** 빈 collection payload. userId 가 빈 / 미인증 케이스에서 사용. */
export function emptyRewardCollection(): RewardCollectionData {
  return { stars: 0, trees: 0, aiArtsCount: 0, aiArts: [] };
}

/**
 * 본 user 의 RewardLog 를 rewardType 별 누적합으로 집계.
 *
 * Server-side only. 호출 측 (page.tsx) 이 인증/익명 cookie 로 검증한 본인 userId 만 전달.
 * 입력 userId 가 빈 문자열이면 emptyRewardCollection 반환 (Prisma 호출 0).
 *
 * @param userId 본인 userId (anonymous_user_id cookie 또는 Supabase auth uid)
 */
export async function loadRewardCollection(
  userId: string,
): Promise<RewardCollectionData> {
  if (!userId) return emptyRewardCollection();

  // groupBy 1회 호출로 별/나무/AI 동시 집계.
  // RewardLog 의 rewardType 은 string ("star" | "tree" | "drawing").
  const grouped = await prisma.rewardLog.groupBy({
    by: ["rewardType"],
    where: { userId },
    _sum: { amount: true },
  });

  let stars = 0;
  let trees = 0;
  let aiArtsCount = 0;

  for (const row of grouped) {
    const sum = row._sum.amount ?? 0;
    switch (row.rewardType) {
      case "star":
        stars = sum;
        break;
      case "tree":
        trees = sum;
        break;
      case "drawing":
        aiArtsCount = sum;
        break;
      // 미지 rewardType 은 무시 (schema 확장 대비).
    }
  }

  return {
    stars,
    trees,
    aiArtsCount,
    // AI 그림 thumbnail 모델 부재 — 빈 배열 (UI 측이 placeholder 렌더).
    aiArts: [],
  };
}
