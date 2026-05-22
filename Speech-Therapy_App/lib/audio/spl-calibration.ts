// REQ-FUNC-007 — SPL calibration helper (#106 잔여).
//
// useSplMeter 의 splOffsetDb (dBFS → SPL-like 변환 offset, default 100) 를 디바이스별로
// 보정하기 위한 localStorage 게이트웨이. 본 모듈은 다음 책임을 가진다:
//   1) SSR 안전 (`typeof window === "undefined"` 가드 → 항상 DEFAULT_OFFSET 반환)
//   2) 유효성 검증 — 60dB ≤ value ≤ 140dB + Number.isFinite. 범위 밖이면 거부 (저장 X).
//   3) hasCalibration() — 사용자가 calibrate UI 를 1회 이상 거쳤는지 표면화.
//
// R4 (보호):
//   - localStorage 만 사용 — 외부 전송 0건.
//   - 저장 값은 단순 numeric offset (dB). PII / audio data / 발화 0건.
//
// 호환성:
//   - useSplMeter 의 splOffsetDb prop 미지정 시 본 함수가 default 로 자리 잡음 (하위 호환 100%).
//   - prop 명시 호출 (예: 단위 테스트 / 향후 calibration UI 내부) 은 그대로 우선.

/** 디바이스별 보정 offset 저장 key — 사람이 읽기 좋게 별도 namespace. */
export const STORAGE_KEY = "spl-calibration-offset-db";

/** 보정 미실시 (또는 reset) 시 기본 offset. useSplMeter 기존 default 와 동일. */
export const DEFAULT_OFFSET = 100;

/** 허용 최소 offset (dB). 0dBFS = silent floor 가정 + 안전 마진. */
export const MIN_OFFSET = 60;

/** 허용 최대 offset (dB). 매우 둔감한 마이크 / 강한 attenuation 대응 상한. */
export const MAX_OFFSET = 140;

/**
 * 저장된 calibration offset 을 반환. SSR / 미저장 / 손상 (NaN, 범위 외) 시 DEFAULT_OFFSET.
 *
 * 호출 비용: localStorage 동기 1회 + Number.parseFloat. tick callback 안에서 매번 호출하지 말 것
 * (useSplMeter 는 hook mount 시 1회 평가).
 */
export function getCalibrationOffset(): number {
  if (typeof window === "undefined") return DEFAULT_OFFSET;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_OFFSET;
    const parsed = Number.parseFloat(raw);
    if (!isValidOffset(parsed)) return DEFAULT_OFFSET;
    return parsed;
  } catch {
    // QuotaExceeded / SecurityError (private mode 일부) 시 fallback.
    return DEFAULT_OFFSET;
  }
}

/**
 * calibration offset 저장. 잘못된 값 (NaN / Infinity / 범위 외) 은 거부 (no-op).
 * 거부 여부를 호출 측에 전달하려면 반환값 boolean 사용.
 */
export function setCalibrationOffset(offsetDb: number): boolean {
  if (typeof window === "undefined") return false;
  if (!isValidOffset(offsetDb)) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(offsetDb));
    return true;
  } catch {
    return false;
  }
}

/** 저장된 calibration 제거 → 이후 호출은 DEFAULT_OFFSET 반환. */
export function resetCalibrationOffset(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op.
  }
}

/** 사용자가 calibration 을 1회 이상 저장한 적이 있는지 (값 유효성까지 검사). */
export function hasCalibration(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return false;
    return isValidOffset(Number.parseFloat(raw));
  } catch {
    return false;
  }
}

/** 내부 — finite + 범위 검사. */
function isValidOffset(v: number): boolean {
  return Number.isFinite(v) && v >= MIN_OFFSET && v <= MAX_OFFSET;
}
