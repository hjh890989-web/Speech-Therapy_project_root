// FR-Q-009 / FR-C-016 / FR-C-005 — 부모 초대 JWT 토큰 helper (signed link).
//
// 책임:
//   - 부모 이메일 + childId + institutionId 를 7일 유효 JWT 로 발급
//   - signup link 진입 시 token 위조 / 만료 검증 (graceful null 반환)
//
// 라이브러리: jose (HS256). 선택 이유:
//   - Edge runtime 호환 (Next.js 16 server bundle / proxy.ts 모두 동작)
//   - jsonwebtoken (Node-only) 대비 모던 — Next.js 공식 미들웨어 예제 표준
//   - 외부 secret store 없이 HMAC 단일 secret 으로 운영 가능 (Vercel env)
//
// 환경변수:
//   - PARENT_INVITE_JWT_SECRET (필수, 최소 32자 권장)
//     · 미설정 시 본 모듈은 에러 throw — 호출 측 Server Action 이 graceful 처리.
//
// R4 (자녀 식별 정보 보호):
//   - JWT payload 는 _부모 이메일_ + childId(UUID) + institutionId 만 포함.
//   - 자녀 본명 / 진단 점수 등 일체 미포함.
//   - 본 token 은 _부모 본인 only_ 수신 — 외부 노출 금지 (호출 측 발송 채널 책임).
//
// CON-04: 본 helper 는 텍스트 카피 미생성 — 금칙어 검증 불필요.
//
// 토큰 lifecycle:
//   - iat: 발급 시각 (초)
//   - exp: iat + 7일
//   - iss: "speech-therapy" (issuer 고정)
//   - 만료 / 서명 위조 / payload schema 위반 → verify 시 null.

import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

/// JWT issuer 식별자 — 다중 token 공유 시 audience 분기에 사용.
export const PARENT_INVITE_ISSUER = "speech-therapy";

/// 유효 기간 (7일, 초 단위).
export const PARENT_INVITE_EXP_SECONDS = 7 * 24 * 60 * 60;

/// JWT payload — exp/iat/iss 는 라이브러리가 자동 주입 / 검증.
export interface ParentInvitePayload {
  /// 부모 이메일 (정규화 — 호출 측이 toLowerCase + trim 책임).
  parentEmail: string;
  /// 자녀 식별자 — User.id (role='student' 또는 등록 단계의 placeholder UUID).
  childId: string;
  /// 기관 식별자 — Institution.id.
  institutionId: string;
  /// 발급 시각 (초). jose 가 자동 생성.
  iat: number;
  /// 만료 시각 (초). jose 가 setExpirationTime 으로 부여.
  exp: number;
  /// Issuer 고정값.
  iss: typeof PARENT_INVITE_ISSUER;
}

/// 토큰 생성 시 호출 측 입력 — iat/exp/iss 는 helper 가 자동 채움.
export interface CreateParentInviteTokenInput {
  parentEmail: string;
  childId: string;
  institutionId: string;
}

/// JWT signing key 캐싱 — 같은 secret 에 대해 UTF-8 → Uint8Array 변환 반복 회피.
let cachedKey: Uint8Array | null = null;
let cachedSecretSource: string | null = null;

/// secret 환경변수 fetch + 검증 + Uint8Array 캐시.
/// 미설정 시 throw — Server Action 에서 catch 하여 graceful 처리.
function getSigningKey(): Uint8Array {
  const secret = process.env.PARENT_INVITE_JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      "PARENT_INVITE_JWT_SECRET 환경변수가 설정되지 않았습니다. Vercel: Project → Settings → Environment Variables 에 32자 이상 random secret 을 추가하세요.",
    );
  }
  if (secret === cachedSecretSource && cachedKey) {
    return cachedKey;
  }
  cachedKey = new TextEncoder().encode(secret);
  cachedSecretSource = secret;
  return cachedKey;
}

/// 테스트 전용 — 캐시 초기화 (vi.stubEnv 사이의 격리).
export function __resetParentInviteCacheForTests(): void {
  cachedKey = null;
  cachedSecretSource = null;
}

/**
 * 부모 초대 JWT 토큰 발급.
 *
 * - HS256 + 7일 만료 + iss="speech-therapy"
 * - secret 미설정 시 throw (호출 측 graceful 분기).
 *
 * @returns 압축 직렬화 JWT (Base64URL 3 segments — header.payload.signature)
 */
export async function createParentInviteToken(
  input: CreateParentInviteTokenInput,
): Promise<string> {
  const key = getSigningKey();

  // 입력 정규화 — 부모 이메일은 항상 소문자 + trim.
  const parentEmail = input.parentEmail.trim().toLowerCase();
  if (parentEmail.length === 0) {
    throw new Error("parentEmail 은 비어 있을 수 없습니다.");
  }
  if (!input.childId || input.childId.trim().length === 0) {
    throw new Error("childId 는 비어 있을 수 없습니다.");
  }
  if (!input.institutionId || input.institutionId.trim().length === 0) {
    throw new Error("institutionId 는 비어 있을 수 없습니다.");
  }

  const token = await new SignJWT({
    parentEmail,
    childId: input.childId,
    institutionId: input.institutionId,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(PARENT_INVITE_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${PARENT_INVITE_EXP_SECONDS}s`)
    .sign(key);

  return token;
}

/**
 * 부모 초대 JWT 검증 + payload 복원.
 *
 * graceful — 다음 모든 경우 null:
 *   - secret 미설정 (env 검증 실패)
 *   - 만료 (exp < now)
 *   - 서명 위조 / 손상
 *   - issuer 불일치
 *   - payload schema 위반 (필수 필드 누락 / 형식 오류)
 *
 * @returns 검증 통과한 ParentInvitePayload 또는 null.
 */
export async function verifyParentInviteToken(
  token: string,
): Promise<ParentInvitePayload | null> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return null;
  }

  let key: Uint8Array;
  try {
    key = getSigningKey();
  } catch {
    // secret 미설정 — graceful (호출 측 page 가 안내 분기).
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: PARENT_INVITE_ISSUER,
      algorithms: ["HS256"],
    });

    // payload schema 검증 — 필수 필드 + 타입.
    const parentEmail = payload["parentEmail"];
    const childId = payload["childId"];
    const institutionId = payload["institutionId"];

    if (
      typeof parentEmail !== "string" ||
      parentEmail.length === 0 ||
      typeof childId !== "string" ||
      childId.length === 0 ||
      typeof institutionId !== "string" ||
      institutionId.length === 0 ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.iss !== PARENT_INVITE_ISSUER
    ) {
      return null;
    }

    return {
      parentEmail,
      childId,
      institutionId,
      iat: payload.iat,
      exp: payload.exp,
      iss: PARENT_INVITE_ISSUER,
    };
  } catch (err) {
    // jose 가 throw 하는 4종: JWTExpired / JWTInvalid / JWSInvalid / JWSSignatureVerificationFailed.
    // 모두 graceful null — 호출 측이 동일하게 "만료 또는 위조" 안내.
    if (
      err instanceof joseErrors.JOSEError ||
      err instanceof Error
    ) {
      return null;
    }
    return null;
  }
}
