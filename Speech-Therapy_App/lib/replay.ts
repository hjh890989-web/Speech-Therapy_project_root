// SEC-003 (2차 패치) — Replay 공격 방어 in-memory nonce 저장소.
//
// 동기:
//   동의서 전자서명 (`POST /api/consent/sign`) 같은 sensitive endpoint 는 동일 서명
//   payload 가 2회 도달하면 동일 효과로 처리되어 audit / 정합성 결함 발생. CSRF Origin
//   검증 (lib/csrf.ts) + Rate Limit (lib/ratelimit.ts) 만으로는 _합법적 Origin_ 에서
//   동일 nonce 재전송을 막지 못함.
//
// 옵션 비교 (SEC-003 후속 task 분석):
//   A. Prisma nonce 테이블 — 다중 Vercel 인스턴스 OK / DB write 비용 + migration drift
//   B. in-memory Map + 24h TTL — DB 변경 0 / single-instance (Hobby) 가정
//
// 본 모듈은 옵션 B 채택. SEC-004 (lib/ratelimit.ts) 와 동일 패턴 — Vercel Hobby
// single region / serverless cold start 마다 초기화 됨 (보수적: replay 가능성 ↓).
// 별도 task: 다중 인스턴스 환경 전환 시 옵션 A (또는 Upstash Redis) 로 어댑터 교체.
//
// API 책임 분리:
//   - verifyReplay(nonce) — nonce 가 _이미 사용됐는지_ 검사 (record 안 함)
//   - recordNonce(nonce) — 호출 측이 처리 완료 후 명시적 기록
//   호출 측 패턴:
//     const r = verifyReplay(nonce); if (!r.ok) return 409; ... recordNonce(nonce);
//
// 환경 prefix (SEC-004 / lib/csrf.ts 패턴) — production / preview / development /
// test 카운터 격리. 같은 nonce 라도 환경이 다르면 별개 키로 취급되어 dev 가 prod
// 의 nonce 를 invalidate 하지 않음.
//
// Refs: GitHub Issue #73 (SEC-003), lib/ratelimit.ts (in-memory 패턴 원본).

/** TTL — 24h. consent signing 흐름의 token 유효기간 7일과 별개. nonce 는 _단일 요청_
 *  의 idempotency 보장이 목적이므로 24h 면 충분 (네트워크 재시도 / queue 흐름 커버). */
const NONCE_TTL_MS = 24 * 60 * 60 * 1000;

/** 메모리 폭주 가드 — replay 공격이 무차별로 다른 nonce 를 쏟아붓는 경우 대비.
 *  도달 시 가장 오래된 entry 부터 GC. 단일 instance 가정이므로 10k 면 충분. */
const MAX_ENTRIES = 10_000;

/** 환경별 prefix 격리 — 동일 nonce 라도 env 가 다르면 별 키. */
function getEnvPrefix(): string {
  return (process.env.VERCEL_ENV || process.env.NODE_ENV || "dev").toLowerCase();
}

function prefixed(nonce: string): string {
  return `${getEnvPrefix()}::${nonce}`;
}

/** Map 사용 — Map 은 insertion order 를 보장 → 가장 오래된 키 = 가장 먼저 들어온 키. */
const nonceStore = new Map<string, number>(); // key -> recordedAt (ms epoch)

export type ReplayFailureReason = "replay" | "expired";

export interface VerifyReplayResult {
  ok: boolean;
  reason?: ReplayFailureReason;
}

/**
 * nonce 가 _이전에 record_ 되지 않았는지 검사. 호출 자체는 부작용 없음 (record 안 함).
 *
 * 반환:
 *   - ok=true: 첫 사용 (또는 TTL 만료로 자동 expire 된 케이스). 호출 측이 처리 후
 *     `recordNonce(nonce)` 를 호출해야 같은 nonce 재사용 차단됨.
 *   - ok=false, reason="replay": 동일 nonce 가 TTL 내 record 된 적 있음 → 409.
 *
 * 본 모듈은 _expired_ reason 을 직접 반환하지 않음 — TTL 만료된 entry 는 lazy GC
 * 시점에 제거되어 다시 첫 사용으로 취급됨 (의도). reason=expired 는 향후 strict
 * 모드 (만료 nonce 도 명시 거부) 도입 시 확장 슬롯.
 */
export function verifyReplay(nonce: string): VerifyReplayResult {
  if (!nonce || typeof nonce !== "string") {
    // 빈 nonce 는 호출 측 책임 — 본 모듈은 형식만 거름. schema 가 1차 차단.
    return { ok: false, reason: "replay" };
  }
  const key = prefixed(nonce);
  const now = Date.now();

  // Lazy GC — 검사 시점에 만료된 자기 자신 entry 제거.
  pruneExpired(now);

  const recordedAt = nonceStore.get(key);
  if (recordedAt === undefined) {
    return { ok: true };
  }
  // 자기 자신이 TTL 내라면 replay.
  if (now - recordedAt < NONCE_TTL_MS) {
    return { ok: false, reason: "replay" };
  }
  // TTL 만료 — 제거 후 첫 사용으로 취급.
  nonceStore.delete(key);
  return { ok: true };
}

/**
 * nonce 기록 — 호출 측 처리 _성공_ 후 명시 호출. 실패한 처리에 record 하지 않으면
 * 정합성 결함 (성공한 처리만 idempotency 보장됨). 본 모듈은 idempotency 윈도우 만
 * 책임 — 실제 처리 atomicity 는 호출 측 / DB 책임.
 *
 * 메모리 폭주 가드: store 가 MAX_ENTRIES 초과 시 가장 오래된 entry 1개 제거 (FIFO).
 */
export function recordNonce(nonce: string): void {
  if (!nonce || typeof nonce !== "string") return;
  const key = prefixed(nonce);
  const now = Date.now();

  // 폭주 가드 — Map insertion order FIFO eviction.
  if (nonceStore.size >= MAX_ENTRIES && !nonceStore.has(key)) {
    const oldestKey = nonceStore.keys().next().value;
    if (oldestKey !== undefined) {
      nonceStore.delete(oldestKey);
    }
  }

  nonceStore.set(key, now);
}

/// 만료된 모든 entry 제거 (lazy GC). 호출 빈도가 높지 않을 것 가정 — O(n) 허용.
function pruneExpired(now: number): void {
  // Map 은 insertion 순서 → 만료 entry 는 앞쪽에 몰림. 첫 non-expired 만나면 중단.
  for (const [key, recordedAt] of nonceStore) {
    if (now - recordedAt >= NONCE_TTL_MS) {
      nonceStore.delete(key);
    } else {
      break;
    }
  }
}

/** 테스트용 — store 초기화 + env prefix 무관 전체 비움. */
export function __resetReplayForTest(): void {
  nonceStore.clear();
}

/** 모니터링 / 디버깅용 — 현재 store 크기 + env prefix 노출 (PII 없음). */
export interface ReplayStats {
  envPrefix: string;
  entryCount: number;
  ttlMs: number;
  maxEntries: number;
}

export function getReplayStats(): ReplayStats {
  return {
    envPrefix: getEnvPrefix(),
    entryCount: nonceStore.size,
    ttlMs: NONCE_TTL_MS,
    maxEntries: MAX_ENTRIES,
  };
}
