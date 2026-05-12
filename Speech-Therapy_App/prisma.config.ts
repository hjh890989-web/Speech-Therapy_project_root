// Prisma 7 config — Supabase 듀얼 URL 분리.
//
// - migrations / schema DDL (`prisma migrate ...`, `prisma db pull`):
//   DIRECT_URL (port 5432) — pgBouncer 우회. transaction pooler 는
//   prepared statement 미지원이라 DDL 실패하므로 필수.
// - runtime queries (Next.js Server Action, seed):
//   DATABASE_URL (port 6543, ?pgbouncer=true) — lib/db.ts / seed.ts 가
//   PrismaPg adapter 로 직접 연결. 본 config 와 무관.

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
