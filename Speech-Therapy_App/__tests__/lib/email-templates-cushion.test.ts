// FR-C-017+ — buildCushionNoteEmail 템플릿 helper 단위 테스트.
// CON-04 금칙어 0건 + HTML escape + 변수 interpolation 정합성 검증.
//
// 시나리오:
//   1. subject 에 자녀 이름 포함
//   2. html / text 본문에 noteText 포함
//   3. parentName 있을 때 → "{parentName} 부모님께" 형식
//   4. parentName 없을 때 → "{childName} 부모님께" 폴백
//   5. senderName + institutionName → 서명 라인
//   6. CON-04 금칙어 0건 (subject / html / text)
//   7. HTML escape — 자녀 이름 XSS (<script>) 무효화
//   8. HTML escape — noteText 안의 위험 문자 escape (단, 줄바꿈은 <br> 보존)
//   9. signupLink 있을 때 → CTA 블록 + 링크 노출
//  10. signupLink 없을 때 → CTA 블록 생략

import { describe, it, expect } from "vitest";
import { buildCushionNoteEmail } from "@/lib/email/templates";
import { hasBannedTerm } from "@/lib/forbidden-words";

const BASE = {
  childName: "지우",
  noteText:
    "보호자님, 오늘 ㅅ 발음을 함께 연습했어요. 잘 따라와 주었어요.",
};

describe("buildCushionNoteEmail — 기본 본문", () => {
  it("subject 에 자녀 이름 + 알림장 키워드 포함", () => {
    const tpl = buildCushionNoteEmail(BASE);
    expect(tpl.subject).toContain("지우");
    expect(tpl.subject).toContain("알림장");
  });

  it("html / text 본문 둘 다에 noteText 포함", () => {
    const tpl = buildCushionNoteEmail(BASE);
    expect(tpl.html).toContain("ㅅ 발음을 함께 연습했어요");
    expect(tpl.text).toContain("ㅅ 발음을 함께 연습했어요");
  });

  it("parentName 있을 때 → '{parentName} 부모님께' 인사말", () => {
    const tpl = buildCushionNoteEmail({ ...BASE, parentName: "김민지" });
    expect(tpl.html).toContain("김민지 부모님께");
    expect(tpl.text).toContain("김민지 부모님께");
  });

  it("parentName 없을 때 → '{childName} 부모님께' 폴백 인사말", () => {
    const tpl = buildCushionNoteEmail(BASE);
    expect(tpl.html).toContain("지우 부모님께");
    expect(tpl.text).toContain("지우 부모님께");
  });

  it("senderName + institutionName → 서명 라인 합성", () => {
    const tpl = buildCushionNoteEmail({
      ...BASE,
      senderName: "홍길동",
      institutionName: "행복어린이집",
    });
    expect(tpl.html).toContain("행복어린이집 홍길동 드림");
    expect(tpl.text).toContain("행복어린이집 홍길동 드림");
  });

  it("senderName / institutionName 부재 → 기본 서명 'Speech-Therapy 드림'", () => {
    const tpl = buildCushionNoteEmail(BASE);
    expect(tpl.html).toContain("Speech-Therapy 드림");
    expect(tpl.text).toContain("Speech-Therapy 드림");
  });
});

describe("buildCushionNoteEmail — CON-04 안전", () => {
  it("subject / html / text 모두 금칙어 0건 (기본 본문)", () => {
    const tpl = buildCushionNoteEmail({
      ...BASE,
      parentName: "김민지",
      senderName: "홍길동",
      institutionName: "행복어린이집",
    });
    expect(hasBannedTerm(tpl.subject)).toBe(false);
    expect(hasBannedTerm(tpl.html)).toBe(false);
    expect(hasBannedTerm(tpl.text)).toBe(false);
  });

  it("의료 disclaimer 포함 — '의료 서비스가 아닌' 명시", () => {
    const tpl = buildCushionNoteEmail(BASE);
    expect(tpl.html).toContain("의료 서비스가 아닌");
    expect(tpl.text).toContain("의료 서비스가 아닌");
  });
});

describe("buildCushionNoteEmail — HTML escape", () => {
  it("childName XSS (<script>) 무효화", () => {
    const tpl = buildCushionNoteEmail({
      ...BASE,
      childName: `<script>alert(1)</script>`,
    });
    expect(tpl.html).not.toContain("<script>alert(1)</script>");
    expect(tpl.html).toContain("&lt;script&gt;");
  });

  it("noteText 안의 위험 문자 escape (& < > \" ')", () => {
    const tpl = buildCushionNoteEmail({
      ...BASE,
      noteText: `보호자님, "오늘은" <strong>잘</strong> 했어요 & 즐거웠어요.`,
    });
    // HTML 본문 — 위험 문자 escape 되어야 함.
    expect(tpl.html).not.toContain("<strong>잘</strong>");
    expect(tpl.html).toContain("&lt;strong&gt;");
    expect(tpl.html).toContain("&amp;");
    expect(tpl.html).toContain("&quot;");
    // text 본문 — escape 미적용 (plain text).
    expect(tpl.text).toContain(`"오늘은"`);
    expect(tpl.text).toContain(`<strong>잘</strong>`);
  });

  it("noteText 안의 \\n 은 <br> 로 보존 (HTML)", () => {
    const tpl = buildCushionNoteEmail({
      ...BASE,
      noteText: "1줄\n2줄\n3줄",
    });
    // <br> 형태 보존.
    expect(tpl.html).toMatch(/1줄<br>2줄<br>3줄/);
    // text 는 \n 그대로.
    expect(tpl.text).toContain("1줄\n2줄\n3줄");
  });

  it("signupLink 있을 때 → CTA 블록 + 안전한 escape", () => {
    const tpl = buildCushionNoteEmail({
      ...BASE,
      signupLink: "https://x/y?z=<script>",
    });
    expect(tpl.html).toContain("자녀 발음 발달 확인하기");
    expect(tpl.html).not.toContain("<script>");
    expect(tpl.html).toContain("&lt;script&gt;");
    expect(tpl.text).toContain("https://x/y?z=<script>"); // text 는 raw
  });

  it("signupLink 부재 → CTA 블록 생략", () => {
    const tpl = buildCushionNoteEmail(BASE);
    expect(tpl.html).not.toContain("자녀 발음 발달 확인하기");
  });
});
