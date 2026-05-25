// Vitest 전역 setup. happy-dom 의 React Testing Library 매처 등록.

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Next.js cache API mock — Server Action 단위 / 통합 테스트는 RSC / Next.js 런타임
// 외부에서 실행되므로 revalidatePath / revalidateTag 가 throw 함. Sprint 3 §3+ 의
// revalidate 호출 추가 (07 보고서) 이후부터 mock 필수.
//
// Performance 감사 2차 (1차 63fbccf 후속) — unstable_cache 도 mock.
//   principal/teacher aggregator + funnel aggregator 가 unstable_cache 로 wrap 되어
//   Next.js runtime 외부에서 import 시 throw. mock 은 cache layer 를 bypass 하고 본 함수만
//   호출하도록 단순 passthrough 로 처리 → 단위 테스트의 결정성 유지 + 캐싱 동작 검증은
//   별도 통합/수동 검증.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: <Args extends unknown[], Ret>(
    fn: (...args: Args) => Ret,
  ): ((...args: Args) => Ret) => fn,
}));
