// SEC-001 — Prisma schema R4 정적 분석.
// 자녀 식별 정보 (본명·생년월일·주소·연락처) 컬럼이 schema 에 없는지 강제 검증.
// 발견 시 CI 차단 → R4 영유아 데이터 보호 정책의 코드 레벨 게이트.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA_PATH = join(process.cwd(), "prisma", "schema.prisma");

// 자녀 식별을 가능케 하는 필드명 (대소문자 무관). 본명·생년월일·주소·연락처류.
// childAgeMonths (월령) / childNickname (별명) 은 허용 — 식별 불가능.
const BANNED_FIELD_PATTERNS: RegExp[] = [
  /child(?:First|Last|Full)?Name\b/i, // childName, childFirstName 등
  /childBirth(?:date|day|Date)?\b/i, // childBirthdate
  /childAddress\b/i,
  /childPhone\b/i,
  /childPhoneNumber\b/i,
  /childResidentNumber\b/i, // 주민등록번호
  /childRRN\b/i,
];

// 명시적으로 허용되는 child* 필드 (월령 + 별명 — 식별 불가).
const ALLOWED_FIELDS = new Set([
  "childAgeMonths",
  "childNickname",
]);

describe("SEC-001 — Prisma schema R4 정적 분석", () => {
  const schema = readFileSync(SCHEMA_PATH, "utf-8");

  it("자녀 식별 컬럼 (본명·생년월일·주소·전화) 0건", () => {
    for (const pattern of BANNED_FIELD_PATTERNS) {
      const match = schema.match(pattern);
      expect(
        match,
        `금칙 컬럼 패턴 ${pattern} 매칭됨: "${match?.[0]}"`,
      ).toBeNull();
    }
  });

  it("child* 식별자는 화이트리스트 (childAgeMonths / childNickname) 만 허용", () => {
    // child 로 시작하는 모든 필드명 추출.
    const fieldRegex = /^\s*(child\w*)\s+\w+/gim;
    const found = new Set<string>();
    let m;
    while ((m = fieldRegex.exec(schema)) !== null) {
      found.add(m[1]);
    }
    for (const field of found) {
      expect(
        ALLOWED_FIELDS.has(field),
        `허용되지 않은 child* 필드: ${field}. ALLOWED_FIELDS 확장 필요 시 R4 보호 영향 재검토.`,
      ).toBe(true);
    }
  });

  it("audioVectorUri 컬럼은 nullable (Sprint 1 미저장 정책 명시)", () => {
    // session_logs 의 audioVectorUri 가 String? (nullable) 인지 확인.
    expect(schema).toMatch(/audioVectorUri\s+String\?/);
  });
});
