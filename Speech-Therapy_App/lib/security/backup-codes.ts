// FR-C-SECURITY — 2FA TOTP 활성화 직후 사용자에게 1회 노출되는 backup codes 생성.
//
// 정책 (본 PR 기준):
//   - 8자 8개 random codes (영숫자 — 헷갈리는 0/O, 1/I/l 제외)
//   - crypto.randomBytes 기반 — Math.random 미사용 (보안)
//   - 본 PR 에선 _단순 표시_ 만 (사용자가 메모 / 비밀번호 매니저 보관) — DB hash 저장 X
//   - 후속 PR (선택): Prisma User.totpBackupCodes (hashed) 컬럼 추가 + 로그인 시 fallback 인증
//
// CON-04: "치료/진단/장애" 금칙어 0건.
// R4: 본 모듈은 user-agnostic — userId 인자 불필요. 호출 측에서 본인 인증 후에만 호출.
//
// 안전성:
//   - 8자 영숫자 (31 chars alphabet) → 31^8 = 8.5e11 조합 — brute-force 어려움
//   - 8개 codes — 1회 사용 후 폐기 의도 (본 PR 은 표시만 — 후속 PR 에서 hash 저장 + 사용 마킹)

import { randomBytes } from "node:crypto";

/**
 * Backup code 생성 시 사용할 알파벳 — 헷갈리는 글자 (0/O, 1/I/l) 제외.
 *
 * 31 chars: 23456789 (8) + ABCDEFGHJKMNPQRSTUVWXYZ (23)
 *   - 숫자 0/1 제외 (대문자 O/I 와 혼동)
 *   - 알파벳 O/I/L 제외 (숫자 0/1 과 혼동)
 *   - 대문자만 (사용자가 손으로 입력할 때 case-insensitive 정책 권장 — 후속 PR 검증 측 정규화)
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** 단일 backup code 1개 생성 — 8자, ALPHABET 기반. */
function generateOne(): string {
  // 8 bytes → 8 chars (각 byte 를 ALPHABET 길이 mod 로 매핑).
  // bias 가 약간 존재하지만 (256 % 31 = 8) 본 용도 (사용자 메모 fallback) 에는 충분.
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

/**
 * 8자 backup code 8개 생성 — 중복 보장.
 *
 * 호출 시점: TOTP enroll verify 성공 직후 1회만 (서버 측).
 * UI 정책: 사용자에게 1회 표시 + "안전한 곳에 보관" 안내 — DB 저장 안 함 (본 PR).
 *
 * @returns 8개의 unique 8자 codes 배열
 */
export function generateBackupCodes(): string[] {
  const codes = new Set<string>();
  // 중복 가능성 무시할 정도지만 (32^8) 안전을 위해 Set 사용.
  // 최대 32회 시도 후 graceful (사실상 도달 불가).
  let attempts = 0;
  while (codes.size < 8 && attempts < 32) {
    codes.add(generateOne());
    attempts += 1;
  }
  return Array.from(codes);
}

/** 외부에서 alphabet 검증 (테스트용). */
export const BACKUP_CODE_ALPHABET = ALPHABET;
export const BACKUP_CODE_LENGTH = 8;
export const BACKUP_CODE_COUNT = 8;
