// FR-Q-007 (#48) — 센터 제출용 PDF 데이터 집계 (Server-side only).
//
// 책임:
//   1) 단일 userId 의 User + Institution + EvaluationResult aggregate + SessionLog count 수집.
//   2) CenterReportInput 으로 정규화.
//   3) cross-tenant 차단은 호출 측 (page.tsx) 책임 — 본 모듈은 입력 userId 만 신뢰.
//
// R4:
//   - 반환에 childName 포함 — 호출 측 RBAC 통과 (admin / principal) 후에만 노출.
//   - userId / email / phone 직접 노출 X — childName + age + institutionName + 집계 수치만.
//
// 빈 데이터 graceful:
//   - User 미존재 → null 반환 (호출 측 404 분기).
//   - EvaluationResult 0건 → 모든 평균 null + count 0.
//   - SessionLog 0건 → missionCount 0.

import { prisma } from "@/lib/db";
import type { CenterReportInput } from "@/lib/pdf/center-report";

/// 추가 메타 (page.tsx 가 cross-tenant 검사용으로 사용 — User.institutionId).
export interface CenterReportLoadResult {
  /// page.tsx 가 본인 institutionId 와 비교해 RBAC 차단 결정.
  institutionId: string | null;
  /// PDF 생성 helper 입력으로 그대로 전달.
  input: CenterReportInput;
}

/// 최근 음소 추출 시 사용할 row 수. 너무 많으면 PDF 한 줄 초과 → 5개 cap (helper 측에서도 slice).
const RECENT_PHONEME_LIMIT = 10;

/// 단일 userId 의 PDF 데이터 집계.
/// 존재 안 하면 null 반환 (호출 측이 404 / notFound() 분기).
export async function loadCenterReportData(
  userId: string,
): Promise<CenterReportLoadResult | null> {
  if (!userId || typeof userId !== "string") return null;

  // User + Institution 동시 조회 (1 round-trip).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      childAgeMonths: true,
      institutionId: true,
      institution: { select: { id: true, name: true } },
    },
  });
  if (!user) return null;

  // 병렬 fan-out — EvaluationResult aggregate + count + 최근 음소, SessionLog mission count.
  const [evalCount, evalAgg, recentEvals, missionCount] = await Promise.all([
    prisma.evaluationResult.count({ where: { userId } }),
    prisma.evaluationResult.aggregate({
      where: { userId },
      _avg: {
        articulationScore: true,
        linguisticScore: true,
        acousticScore: true,
      },
    }),
    prisma.evaluationResult.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { targetPhoneme: true },
      take: RECENT_PHONEME_LIMIT,
    }),
    prisma.sessionLog.count({
      where: { userId, missionId: { not: null } },
    }),
  ]);

  // 음소 중복 제거 (최근 순서 유지).
  const seen = new Set<string>();
  const uniquePhonemes: string[] = [];
  for (const row of recentEvals) {
    const p = (row as { targetPhoneme: string }).targetPhoneme;
    if (!p || seen.has(p)) continue;
    seen.add(p);
    uniquePhonemes.push(p);
    if (uniquePhonemes.length >= 5) break;
  }

  const input: CenterReportInput = {
    // R4: childName 직접 컬럼 없음 — email local-part fallback (호출 측 RBAC 통과 시만 PDF 노출).
    // schema 에 childName 컬럼 도입 (DB-002 후속) 시 본 라인만 갱신.
    childName: undefined,
    childAgeMonths: user.childAgeMonths ?? 0,
    institutionName: user.institution?.name ?? undefined,
    stats: {
      totalDiagnoseCount: evalCount,
      articulationAvg: evalAgg._avg.articulationScore ?? null,
      linguisticAvg: evalAgg._avg.linguisticScore ?? null,
      acousticAvg: evalAgg._avg.acousticScore ?? null,
      missionCount,
      recentTargetPhonemes: uniquePhonemes,
    },
    generatedAt: new Date(),
  };

  return {
    institutionId: user.institutionId ?? null,
    input,
  };
}
