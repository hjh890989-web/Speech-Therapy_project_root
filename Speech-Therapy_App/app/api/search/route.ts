// FR-NAV-SEARCH — GET /api/search?q=...
//
// 글로벌 검색 Route Handler — admin / principal / teacher 운영자만 호출 가능.
//
// 흐름:
//   1) Supabase auth.getUser() — 익명 시 401
//   2) User.role + institutionId 조회 — viewer 컨텍스트 구성
//   3) 운영자 role (admin/principal/teacher) 외 → 403
//   4) per-user rate limit (in-memory 1초 5회) 초과 → 429
//   5) query 길이 검증 (2~50자) — 외 → 400
//   6) searchGlobal(query, viewer) → JSON { results: [...] }
//
// R4 보호:
//   - viewer 의 institutionId scope 는 lib/search/global.ts 내부에서 강제 (cross-tenant 차단).
//   - parent / expert role 호출 시 403 — DB 호출 0건 (자녀 정보 누설 차단).
//   - 에러 응답 본문에 자녀 이메일 / 자녀 본명 등 PII 0건.
//
// rate-limit 정책:
//   - per-user 1초 5회 (검색 spam 방어). 본 endpoint 는 debounce 300ms client + 사용자 의도 검색이므로
//     1초 5회는 정상 입력 패턴에 충분 (40 chars/sec 빠른 타이핑 + 300ms debounce ≈ 3.3 req/sec).
//   - 단일 lambda 인스턴스 in-memory (Vercel cold start 마다 초기화) — Sprint 1 단순화.
//   - 차단 시 429 + Retry-After 헤더.

import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import {
  searchGlobal,
  isSearchEnabledRole,
  isSearchQueryValid,
  SEARCH_QUERY_MIN_LENGTH,
  SEARCH_QUERY_MAX_LENGTH,
  type SearchResult,
} from "@/lib/search/global";

export const dynamic = "force-dynamic";

// ----- Rate Limit (per-user, in-memory) -----

const RATE_LIMIT_WINDOW_MS = 1_000;
const RATE_LIMIT_MAX_PER_WINDOW = 5;
const userRequestTimestamps = new Map<string, number[]>();

function checkUserRateLimit(userId: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const existing = userRequestTimestamps.get(userId) ?? [];
  const recent = existing.filter((ts) => ts >= windowStart);

  if (recent.length >= RATE_LIMIT_MAX_PER_WINDOW) {
    // 메모리 보호: 가장 오래된 timestamp 기준 retry-after 산출.
    const oldest = recent[0]!;
    const retryAfterMs = Math.max(1, oldest + RATE_LIMIT_WINDOW_MS - now);
    return { allowed: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }

  recent.push(now);
  userRequestTimestamps.set(userId, recent);

  // 메모리 보호 — 100명 초과 시 stale entry 제거.
  if (userRequestTimestamps.size > 100) {
    for (const [uid, list] of userRequestTimestamps) {
      const fresh = list.filter((ts) => ts >= windowStart);
      if (fresh.length === 0) {
        userRequestTimestamps.delete(uid);
      } else {
        userRequestTimestamps.set(uid, fresh);
      }
    }
  }

  return { allowed: true, retryAfterSec: 0 };
}

/** 테스트용 — in-memory rate limit 카운터 초기화. */
export function __resetSearchRateLimitForTest(): void {
  userRequestTimestamps.clear();
}

// ----- Route Handler -----

interface SearchResponseBody {
  results: SearchResult[];
}

export async function GET(request: Request): Promise<NextResponse> {
  // 1) Supabase auth — 익명 차단.
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
  } catch (err) {
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 2) viewer 컨텍스트 — role + institutionId.
  let role: string | null = null;
  let institutionId: string | null = null;
  try {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, institutionId: true },
    });
    role = row?.role ?? null;
    institutionId = row?.institutionId ?? null;
  } catch (err) {
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  // 3) 운영자 role 가드 — parent/expert/null → 403.
  if (!isSearchEnabledRole(role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // 4) per-user rate limit.
  const rl = checkUserRateLimit(user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // 5) query 길이 검증.
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get("q");
  if (!isSearchQueryValid(rawQuery)) {
    return NextResponse.json(
      {
        error: "INVALID_INPUT",
        detail: `query 길이는 ${SEARCH_QUERY_MIN_LENGTH}~${SEARCH_QUERY_MAX_LENGTH}자 사이여야 합니다.`,
      },
      { status: 400 },
    );
  }

  // 6) 검색 실행 + 응답.
  let results: SearchResult[];
  try {
    results = await searchGlobal(rawQuery, {
      userId: user.id,
      role: role as string,
      institutionId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  const body: SearchResponseBody = { results };
  return NextResponse.json(body, { status: 200 });
}
