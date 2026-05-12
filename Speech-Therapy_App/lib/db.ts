// DB-001 §AC Scenario 3 — PrismaClient 싱글톤 (Prisma 7 driver-adapter 패턴)
// Next.js 16 dev mode Hot Reload 시 중복 인스턴스 방지 + 연결 풀 재사용.
//
// Prisma 7 변경점: `adapter` 가 필수. dev=SQLite 는 @prisma/adapter-better-sqlite3,
// prod=PostgreSQL 전환 시 @prisma/adapter-pg 로 교체 (DB-002 부터).

import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
