// SEC-F10 — 연구동의 게이트 정적 검증 (TRIGGER 는 SQL — DB 없이 마이그레이션 정적 분석).
//
// no-regret 컴플라이언스 fix: sync_retraining_data TRIGGER 가 하드코딩 'T4-c' 대신 실제
// User.f10ResearchConsentTier 를 조회해 T4-a/b/c 미동의 데이터를 재학습에서 skip 하는지 동결.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf-8");
}

const MIGRATION =
  "prisma/migrations/20260531140000_add_f10_research_consent_tier/migration.sql";

describe("SEC-F10 — sync_retraining_data 연구동의 게이트", () => {
  it("schema.prisma User 에 f10ResearchConsentTier(String?) 컬럼", () => {
    const schema = read("prisma/schema.prisma");
    const m = schema.match(/model User \{([\s\S]*?)\n\}/);
    expect(m, "User 모델 블록 미발견").not.toBeNull();
    expect(m![1]).toMatch(/f10ResearchConsentTier\s+String\?/);
  });

  it("migration — User.f10ResearchConsentTier 컬럼 추가(idempotent)", () => {
    expect(read(MIGRATION)).toMatch(
      /ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "f10ResearchConsentTier"/,
    );
  });

  it("TRIGGER — 실제 tier 조회 + T4-a/b/c 게이팅(미동의 skip)", () => {
    const sql = read(MIGRATION);
    expect(sql, "실제 User tier 조회 누락").toMatch(
      /SELECT\s+"f10ResearchConsentTier"\s+INTO\s+v_consent_tier[\s\S]*?FROM\s+"User"\s+WHERE\s+"id"\s*=\s*NEW\."userId"/,
    );
    // NULL 또는 T4 외 → RETURN NEW(재학습 skip).
    expect(sql, "T4-a/b/c 게이팅 누락").toMatch(/NOT IN \('T4-a', 'T4-b', 'T4-c'\)/);
  });

  it("하드코딩 'T4-c' 적재 제거(미동의 데이터 오표기 해소)", () => {
    expect(read(MIGRATION)).not.toMatch(/v_consent_tier\s*:=\s*'T4-c'/);
  });
});
