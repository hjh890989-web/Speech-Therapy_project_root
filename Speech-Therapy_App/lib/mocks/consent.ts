// MOCK-003 (Consent 부분, E2 일반 웹폼) — 3종 (sent / signed / expired).
// 만료 시뮬은 ConsentCreateOutput 의 expiresAt 을 과거로 설정해서 표현.

import {
  ConsentCreateOutputSchema,
  ConsentConfirmOutputSchema,
  type ConsentCreateOutput,
  type ConsentConfirmOutput,
} from "@/lib/schemas/consent";
import { getMockBySearchParam, isMockEnabled } from "./utils";

const TOKEN_OK = "55555555-5555-4555-8555-555555555555";
const TOKEN_EXPIRED = "66666666-6666-4666-8666-666666666666";

export const mockConsentSent: ConsentCreateOutput = {
  signatureToken: TOKEN_OK,
  signUrl: `https://example.com/consent/${TOKEN_OK}`,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

export const mockConsentSigned: ConsentConfirmOutput = {
  success: true,
  signedAt: new Date().toISOString(),
  confirmationEmailSent: true,
};

export const mockConsentExpired: ConsentCreateOutput = {
  signatureToken: TOKEN_EXPIRED,
  signUrl: `https://example.com/consent/${TOKEN_EXPIRED}`,
  /// 7일 전으로 설정 — UI 는 expiresAt < now() 면 만료 화면 표시.
  expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
};

const SENT_VARIANTS = {
  sent: mockConsentSent,
  expired: mockConsentExpired,
} as const;

export function getConsentCreateMock(
  searchParams: URLSearchParams | { get(key: string): string | null },
): ConsentCreateOutput | null {
  if (!isMockEnabled("USE_MOCK_CONSENT")) return null;
  return getMockBySearchParam(searchParams, "mock-consent", SENT_VARIANTS, mockConsentSent);
}

export function getConsentConfirmMock(): ConsentConfirmOutput | null {
  if (!isMockEnabled("USE_MOCK_CONSENT")) return null;
  return mockConsentSigned;
}

ConsentCreateOutputSchema.parse(mockConsentSent);
ConsentCreateOutputSchema.parse(mockConsentExpired);
ConsentConfirmOutputSchema.parse(mockConsentSigned);
