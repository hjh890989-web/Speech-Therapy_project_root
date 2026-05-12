// DB-002 §AC Scenario 3 — seed: admin 1명 + 테스트 부모 1명.
// 실행: `npm run db:seed`
//
// Prisma 7 driver-adapter 패턴. seed.ts 는 Next.js 외부에서 tsx 로 직접 실행되므로
// lib/db.ts 의 globalThis 싱글톤을 거치지 않고 자체 클라이언트를 만든다.

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // 멱등성: 이메일 unique 키로 upsert. 반복 실행 시 중복 INSERT 방지.
  const admin = await prisma.user.upsert({
    where: { email: "admin@speech-therapy.local" },
    update: {},
    create: {
      email: "admin@speech-therapy.local",
      role: "admin",
    },
  });

  const parent = await prisma.user.upsert({
    where: { email: "parent.test@speech-therapy.local" },
    update: {},
    create: {
      email: "parent.test@speech-therapy.local",
      role: "parent",
      childAgeMonths: 36,
    },
  });

  console.log("seed complete:", { admin: admin.id, parent: parent.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
