// FR-C-SECURITY — generateBackupCodes 단위 테스트.
//
// 격리: 외부 의존성 없음 (node:crypto.randomBytes 직접 사용).
//
// 시나리오 (총 5건):
//   1. 8자 8개 codes 반환
//   2. 모든 code 가 영숫자 (헷갈리는 0/O/1/I/L 제외)
//   3. 100회 호출 시 중복 거의 없음 (랜덤 검증)
//   4. 각 호출이 서로 다른 결과 (randomBytes 기반)
//   5. 알파벳 / 길이 / 카운트 상수 export 정합

import { describe, expect, it } from "vitest";

import {
  generateBackupCodes,
  BACKUP_CODE_ALPHABET,
  BACKUP_CODE_LENGTH,
  BACKUP_CODE_COUNT,
} from "@/lib/security/backup-codes";

describe("generateBackupCodes — FR-C-SECURITY", () => {
  it("[1] 8자 8개 codes 를 반환", () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
    for (const c of codes) {
      expect(c).toHaveLength(8);
    }
  });

  it("[2] 모든 code 는 alphabet (영숫자, 헷갈리는 글자 제외) 만 사용", () => {
    const codes = generateBackupCodes();
    const allowed = new Set(BACKUP_CODE_ALPHABET.split(""));
    for (const code of codes) {
      for (const ch of code) {
        expect(allowed.has(ch)).toBe(true);
      }
      // 헷갈리는 글자 (0, O, 1, I, L) 사용 안 함.
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("[3] 단일 호출 안 8개 codes 중복 없음", () => {
    const codes = generateBackupCodes();
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it("[4] 다른 호출 결과는 (확률적으로) 서로 다름", () => {
    const a = generateBackupCodes();
    const b = generateBackupCodes();
    // 8자 * 8개 = 64 chars 매칭 가능성 32^64 — 사실상 0.
    expect(a.join("")).not.toBe(b.join(""));
  });

  it("[5] alphabet / length / count 상수 export 정합", () => {
    expect(BACKUP_CODE_LENGTH).toBe(8);
    expect(BACKUP_CODE_COUNT).toBe(8);
    // alphabet 길이 = 31 (숫자 23456789=8 + 알파벳 ABCDEFGHJKMNPQRSTUVWXYZ=23).
    expect(BACKUP_CODE_ALPHABET).toHaveLength(31);
    // 알파벳에 헷갈리는 글자 없음.
    expect(BACKUP_CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });
});
