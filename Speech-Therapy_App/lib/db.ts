// DB-001/011 — PrismaClient 싱글톤 (Prisma 7 driver-adapter, PostgreSQL via Supabase).
// Next.js 16 dev mode Hot Reload 시 중복 인스턴스 방지 + 풀 재사용.
//
// 런타임 호출은 pgBouncer transaction pooler (DATABASE_URL, port 6543).
// `prisma migrate` 같은 schema DDL 은 DIRECT_URL (port 5432) 사용 — Prisma CLI 자동 처리.

import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
