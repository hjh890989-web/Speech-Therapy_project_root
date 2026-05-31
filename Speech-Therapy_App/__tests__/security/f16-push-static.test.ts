// SEC-F16 — 푸시 인프라 정적 검증 (DB 없이 마이그레이션 / SW / 카피 동결).
//
// 동결 대상:
//   1. migration — PushSubscription 테이블 + endpoint UNIQUE + 인덱스.
//   2. sw.js — push / notificationclick 핸들러 존재 (F16 핵심).
//   3. dispatch route — CRON_SECRET 인증 + F16 게이트.
//   4. 일일 카피 — CON-04 금칙어 0건 (findBannedTerms) + 자녀 식별 정보 없음.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { findBannedTerms } from "@/lib/forbidden-words";
import { DAILY_PUSH_COPIES, pickDailyPushCopy } from "@/lib/push/copy";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf-8");
}

const MIGRATION =
  "prisma/migrations/20260531150000_add_push_subscriptions/migration.sql";

describe("SEC-F16 — migration (PushSubscription)", () => {
  it("PushSubscription 테이블 생성 + 핵심 컬럼", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "PushSubscription"/);
    for (const col of ["userId", "endpoint", "p256dh", "auth", "dismissCount"]) {
      expect(sql, `${col} 컬럼 누락`).toMatch(new RegExp(`"${col}"`));
    }
  });

  it("endpoint UNIQUE 제약 (재구독 upsert 키)", () => {
    expect(read(MIGRATION)).toMatch(
      /CONSTRAINT "PushSubscription_endpoint_key" UNIQUE \("endpoint"\)/,
    );
  });

  it("userId 인덱스 (구독 조회 / cross-write 차단)", () => {
    expect(read(MIGRATION)).toMatch(
      /CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx"/,
    );
  });
});

describe("SEC-F16 — Service Worker push 핸들러", () => {
  const sw = read("public/sw.js");

  it("push 이벤트 핸들러 + showNotification", () => {
    expect(sw).toMatch(/addEventListener\(\s*["']push["']/);
    expect(sw).toMatch(/showNotification/);
  });

  it("notificationclick 핸들러 (클릭 시 이동)", () => {
    expect(sw).toMatch(/addEventListener\(\s*["']notificationclick["']/);
  });

  it("notificationclose → /api/push/dismiss POST (dismiss 카운트)", () => {
    expect(sw).toMatch(/addEventListener\(\s*["']notificationclose["']/);
    expect(sw).toMatch(/\/api\/push\/dismiss/);
  });
});

describe("SEC-F16 — dispatch route 게이트", () => {
  const route = read("app/api/push/dispatch/route.ts");

  it("CRON_SECRET 인증 (verifyCronSecret)", () => {
    expect(route).toMatch(/verifyCronSecret/);
  });

  it("F16 게이트 (isF16PushEnabled) — off 시 무발송", () => {
    expect(route).toMatch(/isF16PushEnabled/);
  });

  it("Node 런타임 (Prisma 7 — Edge 미지원)", () => {
    expect(route).toMatch(/runtime\s*=\s*["']nodejs["']/);
  });
});

describe("SEC-F16 — 일일 카피 CON-04 + R4", () => {
  it("모든 카피 title/body 에 금칙어 0건", () => {
    for (const copy of DAILY_PUSH_COPIES) {
      expect(findBannedTerms(copy.title), `title: ${copy.title}`).toHaveLength(
        0,
      );
      expect(findBannedTerms(copy.body), `body: ${copy.body}`).toHaveLength(0);
    }
  });

  it("pickDailyPushCopy — 결정적 회전 + url=/missions", () => {
    const day0 = new Date(0);
    const picked = pickDailyPushCopy(day0);
    expect(picked.url).toBe("/missions");
    // 같은 날짜 → 같은 카피 (결정적).
    expect(pickDailyPushCopy(new Date(0))).toEqual(picked);
    // title 은 풀 안의 값.
    expect(DAILY_PUSH_COPIES.map((c) => c.title)).toContain(picked.title);
  });

  it("카피 풀 비어 있지 않음", () => {
    expect(DAILY_PUSH_COPIES.length).toBeGreaterThan(0);
  });
});
