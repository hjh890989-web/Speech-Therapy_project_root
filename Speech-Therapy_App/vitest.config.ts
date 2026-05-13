// Vitest 설정 — TEST-001~009 의 공통 환경.
// happy-dom: 가벼운 브라우저 환경. React 19 / hook 단위 테스트에 충분.
// coverage threshold 80% — DoD 요구사항 (TEST-001 §AC).

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["__tests__/**/*.test.{ts,tsx}"],
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      include: ["lib/**", "app/actions/**"],
      exclude: ["lib/mocks/**", "app/generated/**", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
