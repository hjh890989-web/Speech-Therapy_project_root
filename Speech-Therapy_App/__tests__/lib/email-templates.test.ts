// API-012 (#13) — 이메일 템플릿 helper 단위 테스트.
// CON-04 금칙어 0건 + HTML escape + 변수 interpolation 정합성 검증.
//
// 시나리오:
//   1. escapeHtml 5문자 escape
//   2. parent_invite 정상 본문 — subject/html/text 모두 반환
//   3. parent_invite 변수 (institutionName) HTML escape (<script> 무효화)
//   4. parent_invite CON-04 금칙어 0건
//   5. parent_invite childName 선택 — 있을 때 인사말 변형
//   6. consent_signature 정상 본문
//   7. consent_signature CON-04 금칙어 0건

import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  buildParentInviteEmail,
  buildConsentSignatureEmail,
} from "@/lib/email/templates";
import { hasBannedTerm } from "@/lib/forbidden-words";

describe("escapeHtml", () => {
  it("5개 위험 문자 escape (& < > \" ')", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml(`a & b`)).toBe("a &amp; b");
    expect(escapeHtml(`it's`)).toBe("it&#39;s");
  });

  it("빈 / 평문 → 그대로", () => {
    expect(escapeHtml("")).toBe("");
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("buildParentInviteEmail", () => {
  const baseInput = {
    institutionName: "행복어린이집",
    signupLink: "https://speech-therapy.app/invite?token=abc",
  };

  it("subject/html/text 모두 반환 + 비어있지 않음", () => {
    const tpl = buildParentInviteEmail(baseInput);
    expect(tpl.subject).toContain("행복어린이집");
    expect(tpl.html.length).toBeGreaterThan(100);
    expect(tpl.text.length).toBeGreaterThan(50);
    expect(tpl.html).toContain("<!DOCTYPE html>");
  });

  it("institutionName HTML escape (<script> 무효화)", () => {
    const tpl = buildParentInviteEmail({
      ...baseInput,
      institutionName: `<script>alert(1)</script>`,
    });
    expect(tpl.html).not.toContain("<script>alert(1)</script>");
    expect(tpl.html).toContain("&lt;script&gt;");
  });

  it("signupLink HTML escape (URL 안의 위험 문자)", () => {
    const tpl = buildParentInviteEmail({
      ...baseInput,
      signupLink: `https://x/y?z=<script>`,
    });
    expect(tpl.html).not.toContain("<script>");
    expect(tpl.html).toContain("&lt;script&gt;");
  });

  it("childName 있을 때 → 인사말에 자녀 이름 포함", () => {
    const tpl = buildParentInviteEmail({
      ...baseInput,
      childName: "지우",
    });
    expect(tpl.html).toContain("지우 부모님께");
    expect(tpl.text).toContain("지우 부모님께");
  });

  it("childName 없을 때 → 기본 인사말 ('부모님께')", () => {
    const tpl = buildParentInviteEmail(baseInput);
    expect(tpl.html).toContain("부모님께");
    expect(tpl.text).toMatch(/^부모님께/);
  });

  it("senderName 있을 때 → 서명 line 에 포함", () => {
    const tpl = buildParentInviteEmail({
      ...baseInput,
      senderName: "홍길동",
    });
    expect(tpl.html).toContain("행복어린이집 홍길동 드림");
    expect(tpl.text).toContain("행복어린이집 홍길동 드림");
  });

  it("CON-04 금칙어 0건 (subject/html/text 모두)", () => {
    const tpl = buildParentInviteEmail({
      ...baseInput,
      childName: "지우",
      senderName: "홍길동",
    });
    expect(hasBannedTerm(tpl.subject)).toBe(false);
    expect(hasBannedTerm(tpl.html)).toBe(false);
    expect(hasBannedTerm(tpl.text)).toBe(false);
  });

  it("의료 disclaimer 포함 — '의료 서비스가 아닌' 명시 (CON-04 §2.1 후속)", () => {
    const tpl = buildParentInviteEmail(baseInput);
    expect(tpl.html).toContain("의료 서비스가 아닌");
    expect(tpl.text).toContain("의료 서비스가 아닌");
  });
});

describe("buildConsentSignatureEmail (FR-C-018 placeholder)", () => {
  const baseInput = {
    parentName: "김민지",
    childName: "지우",
    signLink: "https://speech-therapy.app/consent/sign?token=xyz",
  };

  it("subject 에 자녀 이름 + 동의서 키워드 포함", () => {
    const tpl = buildConsentSignatureEmail(baseInput);
    expect(tpl.subject).toContain("지우");
    expect(tpl.subject).toContain("동의서");
  });

  it("CON-04 금칙어 0건", () => {
    const tpl = buildConsentSignatureEmail({
      ...baseInput,
      consentType: "데이터 활용",
    });
    expect(hasBannedTerm(tpl.subject)).toBe(false);
    expect(hasBannedTerm(tpl.html)).toBe(false);
    expect(hasBannedTerm(tpl.text)).toBe(false);
  });

  it("consentType 미설정 → 기본값 '데이터 활용'", () => {
    const tpl = buildConsentSignatureEmail(baseInput);
    expect(tpl.html).toContain("데이터 활용");
    expect(tpl.text).toContain("데이터 활용");
  });

  it("XSS 시도 (parentName) → escape", () => {
    const tpl = buildConsentSignatureEmail({
      ...baseInput,
      parentName: `<img src=x onerror=alert(1)>`,
    });
    expect(tpl.html).not.toContain("<img");
    expect(tpl.html).toContain("&lt;img");
  });
});
