// Vitest 전역 setup. happy-dom 의 React Testing Library 매처 등록.

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Next.js cache API mock — Server Action 단위 / 통합 테스트는 RSC / Next.js 런타임
// 외부에서 실행되므로 revalidatePath / revalidateTag 가 throw 함. Sprint 3 §3+ 의
// revalidate 호출 추가 (07 보고서) 이후부터 mock 필수.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
