// FR-C-018 (#41) — lib/consent/repo 단위 테스트.
//
// 시나리오:
//   1. createOrReturnPendingConsent — 신규 row INSERT (created=true)
//   2. createOrReturnPendingConsent — 기존 pending 있으면 재사용 (created=false)
//   3. findConsentByToken — null token / 빈 token graceful
//   4. markConsentSigned — pending → signed 정상 + signedAt/signedIp/signedUa 저장
//   5. markConsentSigned — 이미 signed → alreadySigned=true (no-op)
//   6. markConsentSigned — expired → expired=true (재서명 차단)
//   7. markConsentSigned — token 미존재 → notFound=true
//   8. findReminderCandidates — sentAt < now-3d + remindedAt null 만 매칭
//   9. findExpireCandidates — sentAt < now-7d 만 매칭
//  10. daysSince — 반올림 + 음수 clamp

import { describe, it, expect, beforeEach, vi } from "vitest";

// Prisma mock — factory 안에서 vi.fn() 사용 (top-level capture 회피).
vi.mock("@/lib/db", () => ({
  prisma: {
    consentSignature: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// 본 테스트는 token 값 결정성 미요구 — repo 는 randomUUID 를 직접 import 하므로
// vi.mock("node:crypto") 가 적용되어도 ESM hoist 순서로 lib 내부 binding 이 우선.
// 실 token 값 검증은 별도 e2e 영역.

import { prisma } from "@/lib/db";
const consentSignatureMock = prisma.consentSignature as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

import {
  createOrReturnPendingConsent,
  findConsentByToken,
  markConsentSigned,
  findReminderCandidates,
  findExpireCandidates,
  daysSince,
  CONSENT_REMINDER_DAYS,
  CONSENT_EXPIRE_DAYS,
} from "@/lib/consent/repo";

beforeEach(() => {
  consentSignatureMock.findFirst.mockReset();
  consentSignatureMock.findUnique.mockReset();
  consentSignatureMock.findMany.mockReset();
  consentSignatureMock.create.mockReset();
  consentSignatureMock.update.mockReset();
});

describe("createOrReturnPendingConsent", () => {
  it("기존 pending 없음 → 신규 INSERT + created=true", async () => {
    consentSignatureMock.findFirst.mockResolvedValue(null);
    const newRow = {
      id: "row-1",
      parentEmail: "p@x.com",
      parentName: "p",
      childNickname: "지우",
      consentType: "data_usage",
      status: "pending",
      token: "fixed-uuid-token-0000",
      sentAt: new Date(),
      remindedAt: null,
      signedAt: null,
      expiredAt: null,
      institutionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    consentSignatureMock.create.mockResolvedValue(newRow);

    const res = await createOrReturnPendingConsent({
      parentEmail: "p@x.com",
      parentName: "p",
      childNickname: "지우",
    });
    expect(res.created).toBe(true);
    expect(res.row.token).toBe("fixed-uuid-token-0000");
    expect(consentSignatureMock.create).toHaveBeenCalledOnce();
    const args = consentSignatureMock.create.mock.calls[0][0];
    expect(args.data.consentType).toBe("data_usage");
    // token 형식 — UUID v4 (8-4-4-4-12) hex 검증.
    expect(args.data.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("기존 pending 있음 → 재사용 + created=false, create 호출 0건", async () => {
    const existing = {
      id: "existing-1",
      parentEmail: "p@x.com",
      parentName: "p",
      childNickname: "지우",
      consentType: "data_usage",
      status: "pending",
      token: "existing-token",
      sentAt: new Date(),
      remindedAt: null,
      signedAt: null,
      expiredAt: null,
      institutionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    consentSignatureMock.findFirst.mockResolvedValue(existing);

    const res = await createOrReturnPendingConsent({
      parentEmail: "p@x.com",
      parentName: "p",
      childNickname: "지우",
    });
    expect(res.created).toBe(false);
    expect(res.row.token).toBe("existing-token");
    expect(consentSignatureMock.create).not.toHaveBeenCalled();
  });
});

describe("findConsentByToken", () => {
  it("빈 token → null + DB 호출 0건", async () => {
    const res = await findConsentByToken("");
    expect(res).toBeNull();
    expect(consentSignatureMock.findUnique).not.toHaveBeenCalled();
  });

  it("정상 token → row 반환", async () => {
    consentSignatureMock.findUnique.mockResolvedValue({ id: "x", token: "t" });
    const res = await findConsentByToken("t");
    expect(res).toMatchObject({ id: "x", token: "t" });
  });
});

describe("markConsentSigned", () => {
  it("pending → signed 정상 update + signedIp/Ua 저장", async () => {
    consentSignatureMock.findUnique.mockResolvedValue({
      id: "r1",
      token: "tok",
      status: "pending",
      sentAt: new Date("2026-05-20T00:00:00Z"),
    });
    consentSignatureMock.update.mockResolvedValue({
      id: "r1",
      token: "tok",
      status: "signed",
      sentAt: new Date("2026-05-20T00:00:00Z"),
      signedAt: new Date("2026-05-23T00:00:00Z"),
    });

    const res = await markConsentSigned({
      token: "tok",
      signedIp: "1.2.3.4",
      signedUa: "Mozilla/5.0",
      now: new Date("2026-05-23T00:00:00Z"),
    });
    expect(res.signed).toBe(true);
    expect(res.alreadySigned).toBe(false);
    expect(res.notFound).toBe(false);
    expect(res.expired).toBe(false);
    const updateArgs = consentSignatureMock.update.mock.calls[0][0];
    expect(updateArgs.data.signedIp).toBe("1.2.3.4");
    expect(updateArgs.data.signedUa).toBe("Mozilla/5.0");
    expect(updateArgs.data.status).toBe("signed");
  });

  it("이미 signed → alreadySigned=true, update 호출 0건", async () => {
    consentSignatureMock.findUnique.mockResolvedValue({
      id: "r1",
      token: "tok",
      status: "signed",
    });
    const res = await markConsentSigned({ token: "tok" });
    expect(res.alreadySigned).toBe(true);
    expect(res.signed).toBe(false);
    expect(consentSignatureMock.update).not.toHaveBeenCalled();
  });

  it("expired → expired=true, update 호출 0건 (재서명 차단)", async () => {
    consentSignatureMock.findUnique.mockResolvedValue({
      id: "r1",
      token: "tok",
      status: "expired",
    });
    const res = await markConsentSigned({ token: "tok" });
    expect(res.expired).toBe(true);
    expect(res.signed).toBe(false);
    expect(consentSignatureMock.update).not.toHaveBeenCalled();
  });

  it("token 미존재 → notFound=true", async () => {
    consentSignatureMock.findUnique.mockResolvedValue(null);
    const res = await markConsentSigned({ token: "missing" });
    expect(res.notFound).toBe(true);
  });
});

describe("findReminderCandidates", () => {
  it("WHERE: status=pending + sentAt < now-3d + remindedAt null + sentAt asc + take 100", async () => {
    consentSignatureMock.findMany.mockResolvedValue([]);
    const now = new Date("2026-05-23T00:00:00Z");
    await findReminderCandidates(now);
    const args = consentSignatureMock.findMany.mock.calls[0][0];
    expect(args.where.status).toBe("pending");
    expect(args.where.remindedAt).toBeNull();
    const threshold = args.where.sentAt.lt as Date;
    const expected = new Date(now.getTime() - CONSENT_REMINDER_DAYS * 24 * 60 * 60 * 1000);
    expect(threshold.getTime()).toBe(expected.getTime());
    expect(args.orderBy).toEqual({ sentAt: "asc" });
    expect(args.take).toBe(100);
  });
});

describe("findExpireCandidates", () => {
  it("WHERE: status=pending + sentAt < now-7d", async () => {
    consentSignatureMock.findMany.mockResolvedValue([]);
    const now = new Date("2026-05-23T00:00:00Z");
    await findExpireCandidates(now);
    const args = consentSignatureMock.findMany.mock.calls[0][0];
    expect(args.where.status).toBe("pending");
    const threshold = args.where.sentAt.lt as Date;
    const expected = new Date(now.getTime() - CONSENT_EXPIRE_DAYS * 24 * 60 * 60 * 1000);
    expect(threshold.getTime()).toBe(expected.getTime());
  });
});

describe("daysSince", () => {
  it("정확히 3일 → 3", () => {
    const sentAt = new Date("2026-05-20T00:00:00Z");
    const now = new Date("2026-05-23T00:00:00Z");
    expect(daysSince(sentAt, now)).toBe(3);
  });

  it("음수 (미래) → 0 clamp", () => {
    const sentAt = new Date("2026-05-25T00:00:00Z");
    const now = new Date("2026-05-23T00:00:00Z");
    expect(daysSince(sentAt, now)).toBe(0);
  });

  it("8시간 12분 → 0 (반올림 — < 12h)", () => {
    const sentAt = new Date("2026-05-23T00:00:00Z");
    const now = new Date("2026-05-23T08:12:00Z");
    expect(daysSince(sentAt, now)).toBe(0);
  });
});
