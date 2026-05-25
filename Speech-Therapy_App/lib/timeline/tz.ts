// FR-Q-013 후속 — Asia/Seoul (KST) 강제 변환 helper.
//
// 배경:
//   타임라인 그루핑 (today/yesterday/thisWeek/older) 은 서버 로컬 TZ 의존이었음
//   (`Date.setHours(0,0,0,0)`). Vercel 의 기본 server timezone 은 UTC →
//   한국 사용자 기준 자정 경계가 9 시간 어긋나는 문제.
//
// 정책:
//   - Korea 는 일광 절약 (DST) 없음 — 단순 +9h offset 으로 안전.
//   - 외부 라이브러리 (date-fns-tz / luxon) 의존성 추가 회피.
//   - Date 객체 반환 (호출 측 그대로 비교 / sort 가능, getTime() 호환).
//
// 주의:
//   - "KST 자정" 을 가리키는 Date 객체는 UTC 기준으로는 "전날 15:00" 인 instant.
//     호출 측이 본 instant 의 `.getTime()` 으로 비교하면 KST 기준 분류가 자동 보장됨.
//   - 본 helper 들은 instant 비교용만 — `.getHours()` 등 로컬 메서드 사용은 금지
//     (서버 TZ 에 따라 다른 값 반환). HH:mm 포맷이 필요하면 `Intl.DateTimeFormat`
//     (`timeZone: "Asia/Seoul"`) 사용 권장.

/** 단순 +9h offset (밀리초). Korea DST 없음 — 연중 고정. */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 입력 Date 를 "KST 시간대의 wall-clock 값을 UTC 처럼 표현한" Date 로 변환.
 *
 * 사용처: KST 기준 자정 / 일자 차이 계산 등 wall-clock 단위 산술이 필요할 때.
 * 본 반환 Date 는 `getUTCHours()` 등 UTC 메서드를 호출하면 KST 의 시각이 나옴.
 *
 * 예: input = "2026-05-23T15:00:00.000Z" (UTC) = KST 2026-05-24T00:00:00
 *     output = Date(2026-05-24T00:00:00.000Z) — UTC 메서드로 KST wall-clock 확인용.
 *
 * 본 반환 Date 의 `.getTime()` 은 UTC 기준 +9h 이동된 instant — 동일 함수로 두 번
 * 비교 시 일관성 유지됨.
 */
export function toKst(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

/**
 * 입력 Date 의 KST 기준 자정 (00:00:00.000 KST) 을 가리키는 Date 반환.
 *
 * 반환 Date 는 실제 instant 로는 "KST 자정 = UTC 전날 15:00" 을 가리킴.
 * 호출 측은 본 반환 Date 의 `.getTime()` 을 다른 Date 의 `.getTime()` 과 비교 가능.
 *
 * 예: input = 2026-05-24T05:30:00+09:00 (KST 오전 05:30)
 *     반환 = 2026-05-24T00:00:00+09:00 = 2026-05-23T15:00:00.000Z instant
 */
export function kstStartOfDay(date: Date): Date {
  const shifted = toKst(date);
  // shifted 는 UTC 시각으로 KST 의 wall-clock 을 표현 — UTC 자정으로 절단하면
  // KST 자정에 해당하는 wall-clock 이 됨.
  shifted.setUTCHours(0, 0, 0, 0);
  // 다시 -9h 해서 실제 instant 복원.
  return new Date(shifted.getTime() - KST_OFFSET_MS);
}

/**
 * "오늘 KST 자정" 으로부터 `daysAgo` 일 전 KST 자정의 instant.
 *
 * 사용처: thisWeek / older 경계 계산. ref 미지정 시 현재 시각 기준.
 *
 * 예: ref = 2026-05-24T05:30:00+09:00 (KST), daysAgo = 7
 *     반환 = 2026-05-17T00:00:00+09:00 instant
 */
export function kstDaysAgoStart(daysAgo: number, ref: Date = new Date()): Date {
  const todayStart = kstStartOfDay(ref);
  return new Date(todayStart.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

/**
 * `kstStartOfDay` 의 funnel / 일반 도메인 alias.
 *
 * 호출 측이 "이 instant 의 KST 일자 자정" 을 명확히 의도할 때 사용.
 * 반환 Date 는 KST 자정 (UTC 로는 전날 15:00) instant.
 *
 * (`lib/analytics/funnel.ts` 에도 동일 이름이 backwards-compat re-export 로 존재.)
 */
export function toDayStartKst(date: Date): Date {
  return kstStartOfDay(date);
}

/**
 * KST 일 단위 가산 — Korea DST 없음으로 24h × days 단순 가산.
 *
 * 반환 instant 는 `date` 의 KST wall-clock 에서 `days` 만큼 더한 시각.
 * KST 자정 boundary 입력에 적합 (`toDayStartKst` 와 조합).
 *
 * (`lib/analytics/funnel.ts` 에도 동일 이름이 backwards-compat re-export 로 존재.)
 */
export function addKstDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * 입력 instant 의 KST 일자를 `YYYY-MM-DD` 문자열로 반환.
 *
 * 사용처:
 *   - UI 의 "발생일" 라벨 (예: AuditLog row 의 createdAt 표시).
 *   - 일간 그루핑 key (funnel / 통계 / 알림 등).
 *
 * 정책:
 *   - +9h offset 후 UTC 메서드로 KST wall-clock 추출 — 서버 TZ 의존 0.
 *   - DST 없음 — 단순 산술 안전.
 *
 * 예: 2026-05-25T23:00:00+09:00 (UTC 14:00) → "2026-05-25"
 *     2026-05-26T00:00:00+09:00 (UTC 15:00 전일) → "2026-05-26"
 *
 * (`lib/analytics/funnel.ts` 에도 동일 이름이 backwards-compat re-export 로 존재.)
 */
export function formatKstDate(date: Date): string {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 입력 instant 의 KST 일자/시각 라벨 (`YYYY-MM-DD HH:mm:ss`).
 *
 * 사용처:
 *   - UI 의 "발생 시각" 라벨 (예: AuditLog row 의 createdAt 표시).
 *
 * 정책:
 *   - 한국 사용자의 wall-clock (KST 기준 HH:mm:ss) 를 그대로 표시.
 *   - 서버 TZ (Vercel UTC) 의존 0 — Intl 의존 회피로 단순 산술만 사용.
 */
export function formatKstDateTime(date: Date): string {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const hour = String(shifted.getUTCHours()).padStart(2, "0");
  const minute = String(shifted.getUTCMinutes()).padStart(2, "0");
  const second = String(shifted.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}
