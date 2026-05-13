// SEC-002 (부분) — RLS migration 정적 검증.
// DB-011 의 enable_rls_policies migration 이 9개 테이블 모두 RLS 활성화 + 핵심 정책 정의됨을 검증.
// 실 호출 침투 테스트는 API-010 (Auth) 구현 후 별도 PR.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

function readRlsMigration(): string {
  // enable_rls_policies migration 파일 위치.
  const dirs = readdirSync(MIGRATIONS_DIR);
  const target = dirs.find((d) => d.endsWith("_enable_rls_policies"));
  if (!target) throw new Error("enable_rls_policies migration 폴더 미존재");
  return readFileSync(join(MIGRATIONS_DIR, target, "migration.sql"), "utf-8");
}

const REQUIRED_RLS_TABLES = [
  "User",
  "Institution",
  "Class",
  "SessionLog",
  "EvaluationResult",
  "MissionCard",
  "WeeklyReport",
  "RewardProgress",
  "HITLQueue",
  "AuditLog",
];

describe("SEC-002 — RLS migration 정적 검증", () => {
  const sql = readRlsMigration();

  it.each(REQUIRED_RLS_TABLES)('테이블 "%s" 에 RLS 활성화', (table) => {
    const pattern = new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    expect(sql).toMatch(pattern);
  });

  it("auth.uid()::text = id 패턴이 정책에 사용됨 (User self-access)", () => {
    expect(sql).toMatch(/auth\.uid\(\)::text\s*=\s*id/);
  });

  it("MissionCard 는 authenticated 모두 read 허용", () => {
    expect(sql).toMatch(/missions_select_authenticated/);
  });

  it("HITLQueue 는 subject + assignedExpert + admin 분기 정책", () => {
    expect(sql).toMatch(/hitl_select_visible/);
    expect(sql).toMatch(/hitl_update_assigned_expert/);
  });

  it("AuditLog 는 admin 만 select", () => {
    expect(sql).toMatch(/audit_select_admin/);
  });

  it("Institution / Class — 본인 소속 기관만 select", () => {
    expect(sql).toMatch(/institutions_select_own/);
    expect(sql).toMatch(/classes_select_same_institution/);
  });

  it("RewardProgress / WeeklyReport — 본인 userId 만 access", () => {
    expect(sql).toMatch(/rewards_select_own/);
    expect(sql).toMatch(/reports_select_own/);
  });
});
