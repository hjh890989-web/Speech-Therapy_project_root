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

  // FR-EMAIL-REACT-TEMPLATE — 본 describe 첫 호출은 @react-email/render 의 dynamic
  // import + 의존성 로딩 (prettier / html-to-text) 비용이 발생. happy-dom 환경에서
  // 5s default 타임아웃을 초과할 수 있어 본 첫 테스트에만 30s 부여 (이후 warm cache).
  it("subject/html/text 모두 반환 + 비어있지 않음", { timeout: 30000 }, async () => {
    const tpl = await buildParentInviteEmail(baseInput);
    expect(tpl.subject).toContain("행복어린이집");
    expect(tpl.html.length).toBeGreaterThan(100);
    expect(tpl.text.length).toBeGreaterThan(50);
    // FR-EMAIL-REACT-TEMPLATE — React Email render() 결과는 표준 HTML 문서
    // (DOCTYPE / <html> / <body> 포함).
    expect(tpl.html.toLowerCase()).toContain("<!doctype html");
  });

  it("institutionName HTML escape (<script> 무효화)", async () => {
    const tpl = await buildParentInviteEmail({
      ...baseInput,
      institutionName: `<script>alert(1)</script>`,
    });
    // React 의 자동 escape — raw <script> 절대 본문에 노출되지 않음.
    expect(tpl.html).not.toContain("<script>alert(1)</script>");
    expect(tpl.html).toContain("&lt;script&gt;");
  });

  it("signupLink HTML escape (URL 안의 위험 문자)", async () => {
    const tpl = await buildParentInviteEmail({
      ...baseInput,
      signupLink: `https://x/y?z=<script>`,
    });
    // React Email Button/Link 가 href 와 visible text 모두 자동 escape.
    expect(tpl.html).not.toContain("<script>");
    expect(tpl.html).toContain("&lt;script&gt;");
  });

  it("childName 있을 때 → 인사말에 자녀 이름 포함", async () => {
    const tpl = await buildParentInviteEmail({
      ...baseInput,
      childName: "지우",
    });
    expect(tpl.html).toContain("지우 부모님께");
    expect(tpl.text).toContain("지우 부모님께");
  });

  it("childName 없을 때 → 기본 인사말 ('부모님께')", async () => {
    const tpl = await buildParentInviteEmail(baseInput);
    expect(tpl.html).toContain("부모님께");
    expect(tpl.text).toMatch(/^부모님께/);
  });

  it("senderName 있을 때 → text 본문 서명 line 에 포함", async () => {
    // FR-EMAIL-REACT-TEMPLATE — React Email 컴포넌트는 institutionName 만 헤더에 표시.
    //   sender 정보는 plain text 본문에서만 "{institution} {sender} 드림" 으로 유지.
    const tpl = await buildParentInviteEmail({
      ...baseInput,
      senderName: "홍길동",
    });
    expect(tpl.text).toContain("행복어린이집 홍길동 드림");
  });

  it("CON-04 금칙어 0건 (subject/html/text 모두)", async () => {
    const tpl = await buildParentInviteEmail({
      ...baseInput,
      childName: "지우",
      senderName: "홍길동",
    });
    expect(hasBannedTerm(tpl.subject)).toBe(false);
    expect(hasBannedTerm(tpl.html)).toBe(false);
    expect(hasBannedTerm(tpl.text)).toBe(false);
  });

  it("의료 disclaimer 포함 — '의학적 평가가 아닙니다' / '의료 서비스가 아닌' 명시 (CON-04)", async () => {
    const tpl = await buildParentInviteEmail(baseInput);
    // React Email 컴포넌트의 disclaimer 카피 + plain text 본문 양쪽 검증.
    expect(tpl.html).toContain("의학적 평가가 아닙니다");
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
