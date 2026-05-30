// DB-002~008 §AC 시드 통합.
// 실행: `npm run db:seed` — 멱등 (upsert + unique key 기반).
//
// Prisma 7 driver-adapter 패턴. seed.ts 는 Next.js 외부에서 tsx 로 실행되므로
// lib/db.ts 의 globalThis 싱글톤을 거치지 않고 자체 클라이언트를 만든다.

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// 음소/slug/타이틀/id — 단일 소스(fixtures 와 공용) → 3자 divergence 차단.
import {
  MISSION_PHONEMES,
  MISSION_LEVELS,
  TITLE_BY_LEVEL,
  missionCardId,
} from "../lib/mocks/mission-config";

// seed 는 일회성 batch 이므로 DIRECT_URL 우선 (pgBouncer 우회).
// 런타임 Server Action 은 lib/db.ts 가 DATABASE_URL pooler 사용.
const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function seedUsers() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@speech-therapy.local" },
    update: {},
    create: { email: "admin@speech-therapy.local", role: "admin" },
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

  return { admin, parent };
}

async function seedInstitutions() {
  // DB-003 §AC Scenario 4: 2 기관 + 6 반 (각 3).
  const inst1 = await prisma.institution.upsert({
    where: { principalEmail: "principal.a@example.kr" },
    update: {},
    create: {
      name: "햇살어린이집",
      principalName: "김원장",
      principalEmail: "principal.a@example.kr",
      phone: "02-1234-5678",
      address: "서울특별시 강남구 테헤란로 1",
      consentStatus: true,
      subscriptionTier: "trial",
    },
  });

  const inst2 = await prisma.institution.upsert({
    where: { principalEmail: "principal.b@example.kr" },
    update: {},
    create: {
      name: "별빛유치원",
      principalName: "이원장",
      principalEmail: "principal.b@example.kr",
      phone: "031-9876-5432",
      address: "경기도 성남시 분당구 정자동 1",
      consentStatus: false,
      subscriptionTier: "trial",
    },
  });

  // 각 기관당 3반 — 멱등성을 위해 unique 가 없으므로 존재 여부 확인 후 생성.
  const classSpecs = [
    { institutionId: inst1.id, name: "햇살 1반" },
    { institutionId: inst1.id, name: "햇살 2반" },
    { institutionId: inst1.id, name: "햇살 3반" },
    { institutionId: inst2.id, name: "별빛 1반" },
    { institutionId: inst2.id, name: "별빛 2반" },
    { institutionId: inst2.id, name: "별빛 3반" },
  ];
  for (const c of classSpecs) {
    const exists = await prisma.class.findFirst({
      where: { institutionId: c.institutionId, name: c.name },
    });
    if (!exists) await prisma.class.create({ data: c });
  }

  return { inst1, inst2 };
}

async function seedMissionCards() {
  // DB-006 + REQ-FUNC-CL-05: 5음소 × 6단계 임상 위계 = 30 카드.
  // 음소 위계/slug/타이틀/id 는 mission-config.ts(fixtures 공용) — 3자 정합 보장.
  // 결정적 id (mock-${slug}-${level}) → 라우팅/FK 안정 + fixtures 정합.
  const rewardTypes = ["star", "tree", "drawing"] as const;

  for (const phoneme of MISSION_PHONEMES) {
    for (const level of MISSION_LEVELS) {
      const id = missionCardId(phoneme, level);
      const existing = await prisma.missionCard.findFirst({ where: { id } });
      if (existing) continue;

      // 월령 범위: 난이도 1~6 을 24~84 개월에 단계적 매핑.
      const ageRangeMin = 24 + (level - 1) * 12;
      const ageRangeMax = Math.min(36 + (level - 1) * 12, 84);

      await prisma.missionCard.create({
        data: {
          id,
          targetPhoneme: phoneme,
          difficultyLevel: level,
          rewardType: rewardTypes[level % rewardTypes.length],
          title: `${phoneme} 소리 ${TITLE_BY_LEVEL[level]}`,
          instructionText: `${phoneme} 소리로 ${TITLE_BY_LEVEL[level]} 활동을 해보세요.`,
          ageRangeMin,
          ageRangeMax,
        },
      });
    }
  }
}

async function main() {
  const users = await seedUsers();
  const insts = await seedInstitutions();
  await seedMissionCards();

  console.log("seed complete:", {
    admin: users.admin.id,
    parent: users.parent.id,
    inst1: insts.inst1.id,
    inst2: insts.inst2.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
