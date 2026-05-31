// API-020 — lib/push/send (web-push wrapper) 단위 테스트.
//
// 격리: @/lib/push/config (게이트/키) + web-push mock. forbidden-words 는 real (CON-04 실검증).

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  isEnabledMock,
  getVapidKeysMock,
  sendNotificationMock,
  setVapidDetailsMock,
} = vi.hoisted(() => ({
  isEnabledMock: vi.fn(),
  getVapidKeysMock: vi.fn(),
  sendNotificationMock: vi.fn(),
  setVapidDetailsMock: vi.fn(),
}));

vi.mock("@/lib/push/config", () => ({
  isF16PushEnabled: () => isEnabledMock(),
  getVapidKeys: () => getVapidKeysMock(),
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: (...a: unknown[]) => setVapidDetailsMock(...a),
    sendNotification: (...a: unknown[]) => sendNotificationMock(...a),
  },
}));

import { sendPush } from "@/lib/push/send";

const TARGET = { endpoint: "https://push.example/abc", p256dh: "p", auth: "a" };
const CLEAN = { title: "오늘도 한마디 같이 해봐요", body: "맛있어요 한번 말해봐요" };

beforeEach(() => {
  isEnabledMock.mockReset();
  getVapidKeysMock.mockReset();
  sendNotificationMock.mockReset();
  setVapidDetailsMock.mockReset();
  isEnabledMock.mockReturnValue(true);
  getVapidKeysMock.mockReturnValue({
    publicKey: "pub",
    privateKey: "priv",
    subject: "mailto:x@y.z",
  });
  sendNotificationMock.mockResolvedValue({ statusCode: 201 });
});

describe("lib/push/send — sendPush", () => {
  it("게이트 off → skipped (web-push 미호출)", async () => {
    isEnabledMock.mockReturnValue(false);
    const r = await sendPush(TARGET, CLEAN);
    expect(r.ok).toBe(false);
    expect(r.skipped).toBe(true);
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("CON-04 — title 금칙어 → forbidden_copy (fail-closed)", async () => {
    const r = await sendPush(TARGET, { title: "진단 결과 안내", body: "확인" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("forbidden_copy");
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("CON-04 — body 금칙어 → forbidden_copy", async () => {
    const r = await sendPush(TARGET, { title: "안내", body: "치료를 시작해요" });
    expect(r.error).toBe("forbidden_copy");
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("VAPID 키 없음 → skipped", async () => {
    getVapidKeysMock.mockReturnValue(null);
    const r = await sendPush(TARGET, CLEAN);
    expect(r.skipped).toBe(true);
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("정상 → ok + statusCode", async () => {
    sendNotificationMock.mockResolvedValue({ statusCode: 201 });
    const r = await sendPush(TARGET, CLEAN);
    expect(r.ok).toBe(true);
    expect(r.statusCode).toBe(201);
    expect(sendNotificationMock).toHaveBeenCalledOnce();
  });

  it("410 Gone → gone:true (구독 만료)", async () => {
    sendNotificationMock.mockRejectedValue(
      Object.assign(new Error("gone"), { statusCode: 410 }),
    );
    const r = await sendPush(TARGET, CLEAN);
    expect(r.ok).toBe(false);
    expect(r.gone).toBe(true);
    expect(r.statusCode).toBe(410);
  });

  it("404 → gone:true", async () => {
    sendNotificationMock.mockRejectedValue(
      Object.assign(new Error("nf"), { statusCode: 404 }),
    );
    const r = await sendPush(TARGET, CLEAN);
    expect(r.gone).toBe(true);
  });

  it("500 → error (gone 아님)", async () => {
    sendNotificationMock.mockRejectedValue(
      Object.assign(new Error("boom"), { statusCode: 500 }),
    );
    const r = await sendPush(TARGET, CLEAN);
    expect(r.ok).toBe(false);
    expect(r.gone).toBeUndefined();
    expect(r.statusCode).toBe(500);
  });

  it("payload 직렬화 — url default '/' + title 전달", async () => {
    await sendPush(TARGET, CLEAN);
    const callArgs = sendNotificationMock.mock.calls[0];
    const parsed = JSON.parse(callArgs[1] as string);
    expect(parsed.url).toBe("/");
    expect(parsed.title).toBe(CLEAN.title);
    // subscription 객체 형태 확인.
    expect(callArgs[0]).toMatchObject({
      endpoint: TARGET.endpoint,
      keys: { p256dh: "p", auth: "a" },
    });
  });
});
