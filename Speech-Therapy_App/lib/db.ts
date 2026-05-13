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
  // Sprint 1: DATABASE_URL (pgBouncer 6543) 가 인증 실패하는 환경 대응 →
  // DIRECT_URL 우선 사용. 단일 사용자 / Vercel free tier 의 connection 한계 안에서 문제 없음.
  // 본격 prod 트래픽 시 DATABASE_URL pooler 우선으로 다시 전환 (별도 PR).
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
