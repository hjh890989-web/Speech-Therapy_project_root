// FR-Q-013 (#54) — 자녀 통합 타임라인 집계 helper (앱 세션 + 센터 오프라인 활동).
//
// 책임 (Server-side only):
//   1) 단일 userId 대상 EvaluationResult (진단/발음 발달 확인) + SessionLog (미션)
//      + OfflineEntry (선생님 수기 기록) 을 fan-out 으로 조회.
//   2) 세 source 를 timestamp (createdAt / observedAt) 기준 desc 병합 → 단일
//      TimelineEntry[] 반환.
//   3) 호출 측 (page.tsx) 이 RBAC + cross-tenant 차단을 이미 수행한 뒤 본 함수 호출.
//
// FR-Q-013 후속 (offline 통합):
//   - OfflineEntry 모델 (lib/offline-entry/repo.ts) 의 entry 를 "offline" kind 로
//     merge — observedAt 을 정렬 기준으로 사용 (입력자가 backdate 가능 → 실 활동 시각).
//   - 호출 측 page.tsx 의 placeholder section 은 본 PR 에서 실 entries 로 교체.
//
// R4 (자녀 식별 정보 노출 금지):
//   - 반환 shape 에 email / 이름 / transcript 등 식별 정보 미포함.
//   - userId 는 input 으로만 사용, entry 본문엔 미노출 (호출 측이 헤더에서만 활용).
//   - offline entry 의 note 본문은 그대로 반환 — UI sanitize 책임 (input 단계 검증 완료).
//
// CON-04 (의료 금칙어): 본 모듈은 카피 미생성 — DB 데이터 그대로 반환. UI sanitize 책임.
//
// 성능: limit 기본 50 — Prisma findMany 3회 + JS merge sort. RSC LCP < 3,000ms 보장.

import { prisma } from "@/lib/db";
import { listOfflineEntriesForUser } from "@/lib/offline-entry/repo";

/** 1개 source 의 최대 limit 기본값 (각 source 당). UI 표시 한도. */
export const TIMELINE_DEFAULT_LIMIT = 50;

/** 통합 타임라인의 단일 entry — discriminated union. */
export type TimelineEntry =
  | {
      kind: "diagnose";
      id: string;
      createdAt: Date;
      articulationScore: number;
      linguisticScore: number;
      acousticScore: number;
      targetPhoneme: string;
    }
  | {
      kind: "mission";
      id: string;
      createdAt: Date;
      missionId: string | null;
      durationSec: number;
    }
  | {
      // FR-Q-013 후속 — 선생님 수기 기록 오프라인 활동.
      // createdAt 은 정렬용 (실 활동 시각 = observedAt). UI 측은 두 시각 모두 노출.
      kind: "offline";
      id: string;
      createdAt: Date;
      authorId: string;
      offlineKind: string;
      note: string;
    };

/** TimelineEntry 의 kind literal — 호출 측 분기 / 테스트 편의용. */
export type TimelineEntryKind = TimelineEntry["kind"];

/** loadUserTimeline 의 반환 payload. */
export interface TimelineData {
  /// 호출 측이 RBAC 확인한 자녀 userId — 본 PR 은 echo back 만, 본문 노출 책임 없음.
  userId: string;
  /// createdAt desc 정렬된 통합 entry 배열.
  entries: TimelineEntry[];
  /// entries.length — UI / 텔레메트리 편의.
  totalCount: number;
  /// 분기 telemetry 용 — diagnose entry 1건 이상 존재?
  hasDiagnoseData: boolean;
  /// 분기 telemetry 용 — mission entry 1건 이상 존재?
  hasMissionData: boolean;
  /// FR-Q-013 후속 — offline entry 1건 이상 존재?
  hasOfflineData: boolean;
}

/**
 * 자녀 통합 타임라인 로드 — Server-side only.
 *
 * 입력 userId 는 호출 측 (page.tsx) 이 Supabase auth + Prisma user.findUnique 로
 * 검증한 user id 만 전달해야 함. 본 함수는 추가 권한 검사 없이 입력을 신뢰
 * → cross-tenant 차단 책임은 호출 측 (단일 책임 원칙, FR-Q-009 패턴 정합).
 *
 * 빈 userId 입력 시 빈 payload 반환 (호출 측 분기 전에 호출해도 안전).
 *
 * @param userId 자녀 (User.id) — 호출 측 RBAC 통과 후 전달.
 * @param limit 각 source 의 최대 fetch 건수 (기본 50). merge 후 totalCount 는 최대 2*limit.
 */
export async function loadUserTimeline(
  userId: string,
  limit: number = TIMELINE_DEFAULT_LIMIT,
): Promise<TimelineData> {
  if (!userId) {
    return {
      userId: "",
      entries: [],
      totalCount: 0,
      hasDiagnoseData: false,
      hasMissionData: false,
      hasOfflineData: false,
    };
  }

  // 병렬 fan-out — RSC LCP < 3,000ms (REQ-NF-004) 보장.
  const [diagnoseRows, missionRows, offlineRows] = await Promise.all([
    prisma.evaluationResult.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        articulationScore: true,
        linguisticScore: true,
        acousticScore: true,
        targetPhoneme: true,
        createdAt: true,
      },
    }),
    prisma.sessionLog.findMany({
      where: { userId, missionId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        missionId: true,
        durationSec: true,
        createdAt: true,
      },
    }),
    listOfflineEntriesForUser(userId, limit),
  ]);

  const diagnoseEntries: TimelineEntry[] = diagnoseRows.map((row) => ({
    kind: "diagnose" as const,
    id: row.id,
    createdAt: row.createdAt,
    articulationScore: row.articulationScore,
    linguisticScore: row.linguisticScore,
    acousticScore: row.acousticScore,
    targetPhoneme: row.targetPhoneme,
  }));

  const missionEntries: TimelineEntry[] = missionRows.map((row) => ({
    kind: "mission" as const,
    id: row.id,
    createdAt: row.createdAt,
    missionId: row.missionId,
    durationSec: row.durationSec,
  }));

  // OfflineEntry → TimelineEntry.offline — createdAt 자리에 observedAt 사용
  // (실 활동 시각이 정렬 기준, UI 가 의도하는 시계열).
  const offlineEntries: TimelineEntry[] = offlineRows.map((row) => ({
    kind: "offline" as const,
    id: row.id,
    createdAt: row.observedAt,
    authorId: row.authorId,
    offlineKind: row.kind,
    note: row.note,
  }));

  // merge + sort desc by createdAt.
  const entries: TimelineEntry[] = [
    ...diagnoseEntries,
    ...missionEntries,
    ...offlineEntries,
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    userId,
    entries,
    totalCount: entries.length,
    hasDiagnoseData: diagnoseEntries.length > 0,
    hasMissionData: missionEntries.length > 0,
    hasOfflineData: offlineEntries.length > 0,
  };
}

// ============================================================================
// 날짜 그루핑 정책 — FR-Q-013 §AC.
// today / yesterday / thisWeek / older
//
// 기준: 호출자가 전달한 `now` 의 로컬 자정 (00:00:00.000) — 서버 측은 Asia/Seoul TZ 가정.
// "thisWeek" 은 그저께~지난 7일 전 (yesterday 보다 더 이전, 오늘 -7d 까지) 범위.
// "older" 는 그 외 전부 (8일 전 이상).
// ============================================================================

/** TimelineEntry 의 날짜 그룹 키. */
export type TimelineDateGroup = "today" | "yesterday" | "thisWeek" | "older";

/** 그룹별 표시 라벨 — UI 측이 직접 사용. */
export const TIMELINE_GROUP_LABEL: Record<TimelineDateGroup, string> = {
  today: "오늘",
  yesterday: "어제",
  thisWeek: "이번 주",
  older: "이전",
};

/** 그룹 정렬 순서 — UI 측이 ordered map 으로 표시. */
export const TIMELINE_GROUP_ORDER: TimelineDateGroup[] = [
  "today",
  "yesterday",
  "thisWeek",
  "older",
];

/** entry.createdAt 가 now 기준 어느 그룹에 속하는지 분류. */
export function classifyEntryGroup(
  createdAt: Date,
  now: Date = new Date(),
): TimelineDateGroup {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (createdAt.getTime() >= todayStart.getTime()) return "today";

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  if (createdAt.getTime() >= yesterdayStart.getTime()) return "yesterday";

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  if (createdAt.getTime() >= weekStart.getTime()) return "thisWeek";

  return "older";
}

/**
 * TimelineEntry[] 를 날짜 그룹별로 partition.
 * 반환 map 의 각 array 는 입력 순서를 그대로 유지 (desc 정렬 가정).
 */
export function groupEntriesByDate(
  entries: TimelineEntry[],
  now: Date = new Date(),
): Record<TimelineDateGroup, TimelineEntry[]> {
  const buckets: Record<TimelineDateGroup, TimelineEntry[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };
  for (const entry of entries) {
    const group = classifyEntryGroup(entry.createdAt, now);
    buckets[group].push(entry);
  }
  return buckets;
}

/**
 * 상대 시각 포맷 — "오늘 14:23" / "어제 09:10" / "3일 전" / "MM월 DD일".
 *
 * 본 함수는 UI 카피 — `Intl.DateTimeFormat` 사용. TZ 는 호출 측이
 * 서버 / 클라이언트 일관성 책임 (본 PR 은 SSR 단계에서 호출되므로 서버 TZ).
 */
export function formatTimelineRelative(
  createdAt: Date,
  now: Date = new Date(),
): string {
  const group = classifyEntryGroup(createdAt, now);

  const hh = String(createdAt.getHours()).padStart(2, "0");
  const mm = String(createdAt.getMinutes()).padStart(2, "0");
  const hhmm = `${hh}:${mm}`;

  if (group === "today") return `오늘 ${hhmm}`;
  if (group === "yesterday") return `어제 ${hhmm}`;

  // thisWeek / older 공통 — N일 전 (≤ 7) 또는 MM월 DD일.
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const entryStart = new Date(createdAt);
  entryStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (todayStart.getTime() - entryStart.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (group === "thisWeek" && diffDays <= 7) {
    return `${diffDays}일 전`;
  }
  const month = createdAt.getMonth() + 1;
  const day = createdAt.getDate();
  return `${month}월 ${day}일`;
}
