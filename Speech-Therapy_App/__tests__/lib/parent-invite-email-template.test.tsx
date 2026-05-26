// FR-EMAIL-REACT-TEMPLATE — ParentInviteEmail React Email 컴포넌트 단위 테스트.
//
// 격리:
//   - 외부 mock 0건 — @react-email/render 는 순수 함수 (Node 환경).
//
// 검증 매트릭스:
//   1. render 결과 — DOCTYPE / html / body 포함
//   2. inviteUrl 이 href 속성과 본문 fallback URL 모두에 포함
//   3. institutionName 인사말 + 헤더 노출
//   4. childNickname 있으면 "지우 부모님께", 없으면 "부모님께"
//   5. CON-04 금칙어 ("치료/진단/장애") 0건
//   6. 의료 disclaimer 노출
//   7. institutionName XSS payload → 자동 escape (React)
//   8. institutionName 미설정 → "Speech-Therapy" 폴백 헤더
//   9. inviteUrl 공백/특수문자 → href 정상 유지

import { describe, it, expect } from "vitest";
import * as React from "react";
import { render } from "@react-email/render";
import { ParentInviteEmail } from "@/lib/email/templates/ParentInviteEmail";
import { hasBannedTerm } from "@/lib/forbidden-words";

const BASE_PROPS = {
  inviteUrl: "https://speech-therapy.app/signup/parent?token=abc123",
  institutionName: "행복어린이집",
} as const;

describe("ParentInviteEmail — React Email 컴포넌트 (FR-EMAIL-REACT-TEMPLATE)", () => {
  // 첫 render 는 @react-email/render 의 prettier / html-to-text 의존성 로드 비용 발생.
  // happy-dom 환경 cold start 시 30s 부여 (이후 warm cache 로 < 500ms).
  it("[1] render 결과 — DOCTYPE / html / body 포함 (표준 이메일 HTML)", { timeout: 30000 }, async () => {
    const html = await render(<ParentInviteEmail {...BASE_PROPS} />);
    expect(html.toLowerCase()).toContain("<!doctype html");
    expect(html.toLowerCase()).toContain("<html");
    expect(html.toLowerCase()).toContain("<body");
    expect(html.length).toBeGreaterThan(200);
  });

  it("[2] inviteUrl 이 href 속성 + fallback URL 텍스트로 노출", async () => {
    const html = await render(<ParentInviteEmail {...BASE_PROPS} />);
    // CTA 버튼의 href 속성에 inviteUrl 포함.
    expect(html).toMatch(/href="https:\/\/speech-therapy\.app\/signup\/parent\?token=abc123"/);
    // fallback URL 본문 표시 (사용자가 복사할 수 있도록).
    expect(html).toContain("https://speech-therapy.app/signup/parent?token=abc123");
  });

  it("[3] institutionName 이 헤더 + 본문에 노출", async () => {
    const html = await render(<ParentInviteEmail {...BASE_PROPS} />);
    expect(html).toContain("행복어린이집 가입 안내");
    expect(html).toContain("<strong>행복어린이집</strong>");
  });

  it("[4a] childNickname 있을 때 → '{childNickname} 부모님께' 인사말", async () => {
    const html = await render(
      <ParentInviteEmail {...BASE_PROPS} childNickname="지우" />,
    );
    expect(html).toContain("지우 부모님께");
  });

  it("[4b] childNickname 없을 때 → 기본 인사말 '부모님께'", async () => {
    const html = await render(<ParentInviteEmail {...BASE_PROPS} />);
    expect(html).toContain("부모님께");
    expect(html).not.toContain("undefined 부모님께");
  });

  it("[5] CON-04 금칙어 ('치료/진단/장애') 0건", async () => {
    const html = await render(
      <ParentInviteEmail
        {...BASE_PROPS}
        childNickname="지우"
      />,
    );
    expect(hasBannedTerm(html)).toBe(false);
  });

  it("[6] 의료 disclaimer 노출 — '발음 발달 가이드' + '의학적 평가가 아닙니다'", async () => {
    const html = await render(<ParentInviteEmail {...BASE_PROPS} />);
    expect(html).toContain("발음 발달 가이드");
    expect(html).toContain("의학적 평가가 아닙니다");
    expect(html).toContain("의료 서비스가 아닌");
  });

  it("[7] institutionName XSS payload → React 자동 escape", async () => {
    const html = await render(
      <ParentInviteEmail
        {...BASE_PROPS}
        institutionName={`<script>alert(1)</script>`}
      />,
    );
    // raw script 태그 노출 0.
    expect(html).not.toContain("<script>alert(1)</script>");
    // escape 결과 (&lt;script&gt;) 포함.
    expect(html).toContain("&lt;script&gt;");
  });

  it("[8] institutionName 미설정 → 'Speech-Therapy' 폴백 헤더", async () => {
    const html = await render(
      <ParentInviteEmail inviteUrl={BASE_PROPS.inviteUrl} />,
    );
    expect(html).toContain("Speech-Therapy 가입 안내");
  });

  it("[9] inviteUrl 특수문자 (쿼리 + & + =) → href 정상 유지 (서비스 호환)", async () => {
    const tricky = "https://x.example.com/y?a=1&b=2&c=hello";
    const html = await render(
      <ParentInviteEmail
        inviteUrl={tricky}
        institutionName="테스트기관"
      />,
    );
    // React 가 & → &amp; 로 escape 함이 정상 (HTML 표준) — 디코드 후 동등성.
    expect(html).toMatch(/href="https:\/\/x\.example\.com\/y\?a=1(&amp;|&)b=2(&amp;|&)c=hello"/);
  });

  it("[10] childNickname 공백 (whitespace only) → 폴백 인사말", async () => {
    const html = await render(
      <ParentInviteEmail {...BASE_PROPS} childNickname="   " />,
    );
    // trim 처리되어 default 인사말 사용.
    expect(html).not.toContain("    부모님께");
    expect(html).toContain("부모님께");
  });
});
