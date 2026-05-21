// DB-004 — SessionLog 스키마 + 초기 마이그레이션 정적 검증.
// AC1 (nullable INSERT) / AC2 (인덱스) / AC3 (audioVectorUri null) / AC4 (FK Cascade)
// 를 실 DB 호출 없이 schema.prisma + init migration SQL 텍스트로 강제 검증한다.
//
// pgvector 활성화는 D6 적용으로 P2 별도 마이그레이션 (본 테스트 범위 외).
// 컬럼 자리만 nullable TEXT 로 확보됐는지만 본다.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_PATH = join(process.cwd(), "prisma", "schema.prisma");
const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

function readInitMigration(): string {
  const dirs = readdirSync(MIGRATIONS_DIR);
  const target = dirs.find((d) => d.endsWith("_init_postgresql"));
  if (!target) throw new Error("init_postgresql migration 폴더 미존재");
  return readFileSync(join(MIGRATIONS_DIR, target, "migration.sql"), "utf-8");
}

describe("DB-004 — SessionLog 스키마 검증", () => {
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  const initSql = readInitMigration();

  describe("schema.prisma 모델 정의", () => {
    it("SessionLog 모델 블록 존재", () => {
      expect(schema).toMatch(/model\s+SessionLog\s*\{/);
    });

    it("AC: id 는 UUID PK + @default(uuid())", () => {
      expect(schema).toMatch(/id\s+String\s+@id\s+@default\(uuid\(\)\)/);
    });

    it("AC4: userId + FK onDelete: Cascade (User 삭제 시 세션도 삭제)", () => {
      // User 모델에는 onDelete: Cascade 표기를 SessionLog 측 relation 에 명시.
      expect(schema).toMatch(
        /user\s+User\s+@relation\(fields:\s*\[userId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/,
      );
    });

    it("AC: missionId 는 nullable + MissionCard FK (진단 세션은 null)", () => {
      expect(schema).toMatch(/missionId\s+String\?/);
      expect(schema).toMatch(
        /mission\s+MissionCard\?\s+@relation\(fields:\s*\[missionId\],\s*references:\s*\[id\]\)/,
      );
    });

    it("AC: startTime DateTime @default(now())", () => {
      expect(schema).toMatch(/startTime\s+DateTime\s+@default\(now\(\)\)/);
    });

    it("AC: durationSec Int (필수)", () => {
      expect(schema).toMatch(/durationSec\s+Int\b/);
    });

    it("AC3: audioVectorUri 는 String? (nullable) — Sprint 1 D6 정책", () => {
      expect(schema).toMatch(/audioVectorUri\s+String\?/);
    });

    it("P2 마이그레이션 TODO 주석 보존 (pgvector vector(768) 전환)", () => {
      // 코드 가독성 + 향후 P2 활성화 가이드.
      expect(schema).toMatch(/P2\s+pgvector.*vector\(768\)/);
    });

    it("AC: createdAt DateTime @default(now())", () => {
      // SessionLog 블록 안의 createdAt 만 좁혀서 확인.
      const block = schema.match(/model\s+SessionLog\s*\{[\s\S]*?\n\}/);
      expect(block, "SessionLog 모델 블록 추출 실패").not.toBeNull();
      expect(block![0]).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    });

    it("AC2: 인덱스 @@index([userId, startTime]) (사용자별 시간순)", () => {
      expect(schema).toMatch(
        /@@index\(\[userId,\s*startTime\]\)/,
      );
    });

    it("EvaluationResult 와 1:1 역방향 관계 (DB-005 의존)", () => {
      const block = schema.match(/model\s+SessionLog\s*\{[\s\S]*?\n\}/);
      expect(block![0]).toMatch(/evaluationResult\s+EvaluationResult\?/);
    });
  });

  describe("init_postgresql migration SQL 실측", () => {
    it("CREATE TABLE SessionLog 존재", () => {
      expect(initSql).toMatch(/CREATE TABLE "SessionLog"/);
    });

    it("AC3: audioVectorUri 컬럼 TEXT (NOT NULL 제약 없음 = nullable)", () => {
      // Prisma 의 String? 는 SQL 에선 "...TEXT," (NOT NULL 없음) 으로 생성.
      expect(initSql).toMatch(/"audioVectorUri"\s+TEXT,/);
    });

    it("AC4: SessionLog_userId_fkey 에 ON DELETE CASCADE", () => {
      expect(initSql).toMatch(
        /ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_userId_fkey"[\s\S]*?ON DELETE CASCADE/,
      );
    });

    it("missionId FK 는 ON DELETE SET NULL (미션 삭제 시 세션 보존)", () => {
      expect(initSql).toMatch(
        /ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_missionId_fkey"[\s\S]*?ON DELETE SET NULL/,
      );
    });

    it("AC2: 복합 인덱스 (userId, startTime) 생성", () => {
      expect(initSql).toMatch(
        /CREATE INDEX "SessionLog_userId_startTime_idx" ON "SessionLog"\("userId",\s*"startTime"\)/,
      );
    });

    it("D6: pgvector 확장 활성화 SQL 미포함 (P2 별도 마이그레이션)", () => {
      // 본 태스크 범위 외임을 회귀 방지 차원에서 negative 검증.
      expect(initSql).not.toMatch(/CREATE EXTENSION[^;]*vector/i);
    });
  });
});
