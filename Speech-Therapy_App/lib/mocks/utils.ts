// MOCK 공통 유틸: 환경 변수 + URL searchParam 분기 + Production 강제 비활성.
// MOCK-001~003 모두에서 사용.

/// Production (Vercel) 에서는 어떤 환경 변수 설정에도 Mock 비활성.
export function isMockEnabled(envVarName: string): boolean {
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env[envVarName] === "true";
}

/// URL searchParams 의 mock 키로 시나리오 선택. 기본값 fallback 지원.
/// 예: getMockBySearchParam(sp, 'mock', { 'success-high': A, 'success-low': B }, A)
export function getMockBySearchParam<T>(
  searchParams: URLSearchParams | { get(key: string): string | null },
  key: string,
  variants: Record<string, T>,
  fallback: T,
): T {
  const raw = searchParams.get(key);
  if (raw && Object.prototype.hasOwnProperty.call(variants, raw)) {
    return variants[raw];
  }
  return fallback;
}
