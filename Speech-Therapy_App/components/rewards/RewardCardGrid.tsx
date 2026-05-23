// FR-Q-004 (#45) — 보상 도감 Card Grid.
//
// 자녀 (2-7세) 친화 디자인 기준:
//   - 글자 크기 text-2xl+ (≥ 24px) — 카운트는 text-5xl (48px) 큰 폰트로 즉시 인식 가능.
//   - 라벨/설명은 text-xl (≥ 18px) — REQ-NF-007 자녀 친화 가독성 기준 (≥ 18px).
//   - tap target ≥ 44px — CTA button 은 min-h-[56px] (4-7세 손가락 fat finger 대응).
//   - 밝은 톤 (amber/emerald/violet) + 큰 SVG 아이콘 (별 / 나무 / 그림) — 추상 이모지 대비
//     선명한 정적 SVG (public/rewards/*.svg) 를 사용해 LCP < 3000ms 보장.
//
// CON-04 (의료 금칙어 0건): 모든 카피는 "치료/진단/장애" 미사용.
//   대신 "이만큼 모았어요", "다음에 또 만나요" 같은 격려조 카피만.
//
// AI 그림 (Phase 1+):
//   현재 RewardLog 만 존재 (imageUrl 컬럼 부재) — aiArts 가 비어 있으면 placeholder 그리드.
//   aiArtsCount 가 양수면 "그림 N개를 모았어요" 만 표시 (실 이미지는 후속 PR).
//
// Props 분리 사유: 본 컴포넌트는 props 만 받는 순수 표시 컴포넌트.
//   page.tsx 가 server-side aggregator 결과를 주입 → SSR-friendly + 단위 테스트 친화.

import Link from "next/link";

export interface RewardCardGridProps {
  /// 누적 별 개수 (RewardLog.amount sum where rewardType='star').
  stars: number;
  /// 누적 나무 개수 (RewardLog.amount sum where rewardType='tree').
  trees: number;
  /// AI 그림 발급 카운트 (현 schema: 단순 카운트만, imageUrl 메타 부재).
  aiArtsCount?: number;
  /// Phase 1+ — AI 그림 thumbnail. 비어 있으면 placeholder.
  aiArts?: Array<{ id: string; imageUrl: string; createdAt: Date }>;
}

const EMPTY_CTA_LABEL = "지금 미션 하러 가기";

/**
 * 보상 도감 메인 카드 그리드.
 *
 * 빈 상태 (stars + trees + aiArtsCount === 0) → 격려 카피 + 미션 CTA.
 */
export function RewardCardGrid({
  stars,
  trees,
  aiArtsCount = 0,
  aiArts = [],
}: RewardCardGridProps) {
  const isEmpty = stars === 0 && trees === 0 && aiArtsCount === 0;

  if (isEmpty) {
    return (
      <section
        data-testid="reward-collection-empty"
        aria-label="아직 보상이 없어요"
        className="rounded-2xl border-4 border-dashed border-amber-300 bg-amber-50 p-8 text-center dark:border-amber-700 dark:bg-amber-950/30"
      >
        <p className="mb-4 text-6xl" aria-hidden="true">
          🌱
        </p>
        <h2 className="mb-3 text-2xl font-bold text-amber-900 dark:text-amber-100">
          아직 보상이 없어요.
        </h2>
        <p className="mb-6 text-xl text-amber-800 dark:text-amber-200">
          미션을 하나 완료해 볼까요?
        </p>
        <Link
          href="/missions"
          data-testid="reward-collection-empty-cta"
          className="inline-flex min-h-[56px] min-w-[44px] items-center justify-center rounded-xl bg-emerald-500 px-8 py-3 text-xl font-bold text-white shadow-md transition hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-300"
        >
          {EMPTY_CTA_LABEL}
        </Link>
      </section>
    );
  }

  return (
    <section
      data-testid="reward-card-grid"
      aria-label="모은 보상 도감"
      className="grid grid-cols-1 gap-6 sm:grid-cols-3"
    >
      <StarCard count={stars} />
      <TreeCard count={trees} />
      <AiArtCard count={aiArtsCount} arts={aiArts} />
    </section>
  );
}

// ============================================================================
// 개별 카드 — 별 / 나무 / AI 그림
// ============================================================================

function StarCard({ count }: { count: number }) {
  return (
    <article
      data-testid="reward-card-star"
      aria-label={`별 ${count}개를 모았어요`}
      className="flex flex-col items-center rounded-2xl border-4 border-amber-300 bg-amber-50 p-6 shadow-sm dark:border-amber-700 dark:bg-amber-950/30"
    >
      <StarIcon className="h-24 w-24 text-amber-400" />
      <p
        data-testid="reward-card-star-count"
        className="mt-3 text-5xl font-extrabold tabular-nums text-amber-900 dark:text-amber-100"
      >
        {count}
      </p>
      <p className="mt-2 text-xl font-semibold text-amber-800 dark:text-amber-200">
        별
      </p>
      <p className="mt-1 text-xl text-amber-700 dark:text-amber-300">
        이만큼 모았어요!
      </p>
    </article>
  );
}

function TreeCard({ count }: { count: number }) {
  return (
    <article
      data-testid="reward-card-tree"
      aria-label={`나무 ${count}그루를 모았어요`}
      className="flex flex-col items-center rounded-2xl border-4 border-emerald-300 bg-emerald-50 p-6 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/30"
    >
      <TreeIcon className="h-24 w-24 text-emerald-500" />
      <p
        data-testid="reward-card-tree-count"
        className="mt-3 text-5xl font-extrabold tabular-nums text-emerald-900 dark:text-emerald-100"
      >
        {count}
      </p>
      <p className="mt-2 text-xl font-semibold text-emerald-800 dark:text-emerald-200">
        나무
      </p>
      <p className="mt-1 text-xl text-emerald-700 dark:text-emerald-300">
        이만큼 키웠어요!
      </p>
    </article>
  );
}

function AiArtCard({
  count,
  arts,
}: {
  count: number;
  arts: Array<{ id: string; imageUrl: string; createdAt: Date }>;
}) {
  const hasArts = arts.length > 0;
  const hasCount = count > 0;

  return (
    <article
      data-testid="reward-card-ai-art"
      aria-label={`AI 그림 ${count}개를 모았어요`}
      className="flex flex-col items-center rounded-2xl border-4 border-violet-300 bg-violet-50 p-6 shadow-sm dark:border-violet-700 dark:bg-violet-950/30"
    >
      <PaletteIcon className="h-24 w-24 text-violet-500" />
      <p
        data-testid="reward-card-ai-art-count"
        className="mt-3 text-5xl font-extrabold tabular-nums text-violet-900 dark:text-violet-100"
      >
        {count}
      </p>
      <p className="mt-2 text-xl font-semibold text-violet-800 dark:text-violet-200">
        AI 그림
      </p>

      {hasArts ? (
        <ul
          data-testid="reward-card-ai-art-grid"
          aria-label="모은 AI 그림 미리보기"
          className="mt-3 grid grid-cols-3 gap-2"
        >
          {arts.slice(0, 6).map((art) => (
            <li key={art.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- AI 그림 URL 은
                  Phase 1+ Supabase Storage 동적 URL. remotePatterns 동적 등록 회피 위해 표준 img.
                  thumbnail 사이즈 64px → LCP 영향 미미. */}
              <img
                src={art.imageUrl}
                alt={`${art.createdAt.toLocaleDateString("ko-KR")} 에 받은 그림`}
                className="h-16 w-16 rounded-lg object-cover"
                loading="lazy"
                decoding="async"
              />
            </li>
          ))}
        </ul>
      ) : (
        <p
          data-testid="reward-card-ai-art-placeholder"
          className="mt-2 text-xl text-violet-700 dark:text-violet-300"
        >
          {hasCount ? "곧 그림이 도착해요!" : "곧 만나요!"}
        </p>
      )}
    </article>
  );
}

// ============================================================================
// SVG 아이콘 (inline — public/rewards/*.svg 와 동일 도형, 빌드 단계 fetch 없이 즉시 paint)
// ============================================================================

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      data-testid="reward-icon-star"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2.5l2.95 6.36 6.97.62-5.27 4.65 1.59 6.87L12 17.27l-6.24 3.73 1.59-6.87L2.08 9.48l6.97-.62L12 2.5z" />
    </svg>
  );
}

function TreeIcon({ className }: { className?: string }) {
  return (
    <svg
      data-testid="reward-icon-tree"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2l5 7h-3l4 6h-3l4 5H5l4-5H6l4-6H7l5-7z" />
      <rect x="10.5" y="20" width="3" height="2" rx="0.5" />
    </svg>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg
      data-testid="reward-icon-ai-art"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
  );
}
