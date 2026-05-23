// FR-C-018 (#41) — 동의서 관련 이메일 템플릿 3종 단위 테스트.
// CON-04 금칙어 0건 + HTML escape + 변수 interpolation 정합성 검증.
//
// 시나리오 매핑:
//   1. buildConsentSignatureEmail — 만료일 표시 + parentName escape + CON-04
//   2. buildConsentReminderEmail — 잔여일 계산 + 본문 / subject 노출
//   3. buildConsentReminderEmail — daysElapsed >= 7 일 때 잔여 0일 표기 안전
//   4. buildConsentReminderEmail — childName XSS escape
//   5. buildConsentExpiredEmail — originalSentAt 포맷 + CON-04
//   6. 3종 모두 의료 disclaimer ("의료 서비스가 아닌") 포함

import { describe, it, expect } from "vitest";
import {
  buildConsentSignatureEmail,
  buildConsentReminderEmail,
  buildConsentExpiredEmail,
} from "@/lib/email/templates";
import { hasBannedTerm } from "@/lib/forbidden-words";

describe("buildConsentSignatureEmail — 만료일 명시 + escape", () => {
  const baseInput = {
    parentName: "김민지",
    childName: "지우",
    signLink: "https://speech-therapy.app/consent/abc-uuid",
  };

  it("expiresAt 전달 시 본문/text 모두 마감일 포함", () => {
    const tpl = buildConsentSignatureEmail({
      ...baseInput,
      expiresAt: "2026-06-01T10:00:00.000Z",
    });
    expect(tpl.html).toContain("서명 마감");
    expect(tpl.text).toContain("서명 마감");
    // 포맷된 날짜 (YYYY-MM-DD 패턴) — 시간대 의존성 회피 위해 prefix 만 검증.
    expect(tpl.html).toContain("2026-06-");
  });

  it("expiresAt 미전달 시 '발송 후 7일' 기본 안내", () => {
    const tpl = buildConsentSignatureEmail(baseInput);
    expect(tpl.html).toContain("발송 후 7일");
    expect(tpl.text).toContain("발송 후 7일");
  });

  it("CON-04 금칙어 0건", () => {
    const tpl = buildConsentSignatureEmail({
      ...baseInput,
      consentType: "데이터 활용",
      expiresAt: "2026-06-01T10:00:00.000Z",
    });
    expect(hasBannedTerm(tpl.subject)).toBe(false);
    expect(hasBannedTerm(tpl.html)).toBe(false);
    expect(hasBannedTerm(tpl.text)).toBe(false);
  });

  it("parentName XSS 시도 escape (HTML 본문)", () => {
    const tpl = buildConsentSignatureEmail({
      ...baseInput,
      parentName: "<script>alert(1)</script>",
    });
    expect(tpl.html).not.toContain("<script>alert(1)</script>");
    expect(tpl.html).toContain("&lt;script&gt;");
  });

  it("의료 disclaimer 포함 ('의료 서비스가 아닌')", () => {
    const tpl = buildConsentSignatureEmail(baseInput);
    expect(tpl.html).toContain("의료 서비스가 아닌");
    expect(tpl.text).toContain("의료 서비스가 아닌");
  });
});

describe("buildConsentReminderEmail — D+3 리마인더", () => {
  const baseInput = {
    parentName: "김민지",
    childName: "지우",
    signLink: "https://speech-therapy.app/consent/abc-uuid",
    daysElapsed: 3,
  };

  it("잔여 일수 계산 — daysElapsed=3 → 잔여 4일", () => {
    const tpl = buildConsentReminderEmail(baseInput);
    expect(tpl.subject).toContain("잔여 4일");
    expect(tpl.html).toContain("잔여 4일");
    expect(tpl.text).toContain("잔여 약 4일");
  });

  it("daysElapsed=7 → 잔여 0일 (clamp, 음수 방지)", () => {
    const tpl = buildConsentReminderEmail({ ...baseInput, daysElapsed: 7 });
    expect(tpl.subject).toContain("잔여 0일");
  });

  it("daysElapsed=10 (이미 만료 경과) → 잔여 0일 clamp", () => {
    const tpl = buildConsentReminderEmail({ ...baseInput, daysElapsed: 10 });
    expect(tpl.subject).toContain("잔여 0일");
  });

  it("childName XSS escape (HTML 본문)", () => {
    const tpl = buildConsentReminderEmail({
      ...baseInput,
      childName: "<img src=x onerror=alert(1)>",
    });
    expect(tpl.html).not.toContain("<img");
    expect(tpl.html).toContain("&lt;img");
  });

  it("CON-04 금칙어 0건 (subject/html/text)", () => {
    const tpl = buildConsentReminderEmail({
      ...baseInput,
      consentType: "데이터 활용",
      expiresAt: "2026-06-01T10:00:00.000Z",
    });
    expect(hasBannedTerm(tpl.subject)).toBe(false);
    expect(hasBannedTerm(tpl.html)).toBe(false);
    expect(hasBannedTerm(tpl.text)).toBe(false);
  });

  it("의료 disclaimer 포함", () => {
    const tpl = buildConsentReminderEmail(baseInput);
    expect(tpl.html).toContain("의료 서비스가 아닌");
    expect(tpl.text).toContain("의료 서비스가 아닌");
  });
});

describe("buildConsentExpiredEmail — 7일 만료 안내", () => {
  const baseInput = {
    parentName: "김민지",
    childName: "지우",
    originalSentAt: "2026-05-15T10:00:00.000Z",
  };

  it("subject 에 자녀 이름 + '만료' 키워드 포함", () => {
    const tpl = buildConsentExpiredEmail(baseInput);
    expect(tpl.subject).toContain("지우");
    expect(tpl.subject).toContain("만료");
  });

  it("originalSentAt 포맷 노출 + 재발급 안내", () => {
    const tpl = buildConsentExpiredEmail(baseInput);
    expect(tpl.html).toContain("최초 발송");
    expect(tpl.text).toContain("최초 발송");
    expect(tpl.html).toContain("재발급");
  });

  it("CON-04 금칙어 0건 (subject/html/text)", () => {
    const tpl = buildConsentExpiredEmail({
      ...baseInput,
      consentType: "데이터 활용",
    });
    expect(hasBannedTerm(tpl.subject)).toBe(false);
    expect(hasBannedTerm(tpl.html)).toBe(false);
    expect(hasBannedTerm(tpl.text)).toBe(false);
  });

  it("의료 disclaimer 포함", () => {
    const tpl = buildConsentExpiredEmail(baseInput);
    expect(tpl.html).toContain("의료 서비스가 아닌");
    expect(tpl.text).toContain("의료 서비스가 아닌");
  });

  it("parentName XSS escape", () => {
    const tpl = buildConsentExpiredEmail({
      ...baseInput,
      parentName: "<script>alert(1)</script>",
    });
    expect(tpl.html).not.toContain("<script>alert(1)</script>");
    expect(tpl.html).toContain("&lt;script&gt;");
  });
});
