// FR-EMAIL-REACT-TEMPLATE — 부모 초대 이메일 React Email 렌더 진입점 (pilot).
//
// 본 모듈은 lib/email/templates/ParentInviteEmail.tsx (React 컴포넌트) +
//   @react-email/render 의 render() 통합 함수만 export. JSX 를 templates.ts (=.ts)
//   안에 둘 수 없어 분리되었다. templates.ts 의 buildParentInviteEmail 이 본 모듈을
//   동적 import 후 위임.
//
// 호출 흐름:
//   app/actions/parent-invite.ts
//     → buildParentInviteEmail (templates.ts, async)
//       → renderParentInviteEmail (이 파일, async)
//         → @react-email/render::render(<ParentInviteEmail .../>)
//     → sendParentInviteEmailWithPreference (lib/parent-invite/email-with-preference.ts)
//
// CON-04:
//   - 본문 (subject/html/text) 에 "치료/진단/장애" 금칙어 0건.
//   - sendEmail 측 detectBannedTerms 가 한 번 더 검증 (defense in depth).
//
// R4:
//   - 수신자 = 부모 → childName 본문 포함 OK.
//   - 본 함수는 _렌더링만_ — preference 체크 / Resend 호출은 호출 측 책임.
//
// Server-only:
//   - @react-email/render 는 Node.js 환경 전용 (html-to-text / prettier 등 무거운
//     의존성). client bundle 에 진입하지 않도록 본 파일은 "use client" 를 _절대_
//     붙이지 않으며, client component 에서 import 하지 말 것.

import * as React from "react";
import { render } from "@react-email/render";
import { ParentInviteEmail } from "@/lib/email/templates/ParentInviteEmail";
import type {
  ParentInviteInput,
  EmailTemplate,
} from "@/lib/email/templates";

/**
 * 부모 초대 이메일 — React Email 컴포넌트를 HTML 문자열로 렌더 + plain text 본문 동봉.
 *
 * 반환 shape 은 기존 buildParentInviteEmail 과 호환 (subject/html/text) — 호출 측
 * 변동 0 (단, async 로 변경된 점만 await 필요).
 */
export async function renderParentInviteEmail(
  input: ParentInviteInput,
): Promise<EmailTemplate> {
  const subject = `[${input.institutionName}] Speech-Therapy 발음 발달 확인 안내`;

  const html = await render(
    <ParentInviteEmail
      inviteUrl={input.signupLink}
      institutionName={input.institutionName}
      childNickname={input.childName}
    />,
  );

  const sender = input.senderName ?? null;
  const greetingText = input.childName
    ? `${input.childName} 부모님께`
    : "부모님께";
  const text = [
    greetingText,
    "",
    `안녕하세요. ${input.institutionName} 에서 자녀 발음 발달 확인을 위해 Speech-Therapy 가입을 안내드립니다.`,
    "",
    "Speech-Therapy 는 만 2~7세 자녀의 발음 발달 상태를 부모님이 가정에서 확인할 수 있는 보조 도구입니다.",
    "의료적 판단을 제공하지 않으며, 발음 가이드와 주간 미션을 통해 자녀의 발달을 함께 살펴봅니다.",
    "",
    `가입 링크: ${input.signupLink}`,
    "",
    "---",
    sender
      ? `${input.institutionName} ${input.senderName} 드림`
      : `${input.institutionName} 드림`,
    "본 메일은 발신 전용입니다. 문의는 기관 담당자에게 직접 연락주세요.",
    "Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.",
  ].join("\n");

  return { subject, html, text };
}
