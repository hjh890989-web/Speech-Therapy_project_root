// FR-EMAIL-REACT-TEMPLATE — 부모 초대 이메일 React Email 컴포넌트 (pilot).
//
// 본 컴포넌트는 4 이메일 path (parent-invite / cushion-note / weekly-report /
// consent-reminder) 중 첫번째 pilot 으로, string-concat HTML → @react-email/components
// 기반 React 컴포넌트로 migration. 나머지 3 path 는 디자인 안정화 후 별도 PR 에서 일괄.
//
// 사용:
//   import { render } from "@react-email/render";
//   import { ParentInviteEmail } from "@/lib/email/templates/ParentInviteEmail";
//   const html = await render(<ParentInviteEmail inviteUrl={...} institutionName={...} />);
//
// CON-04 정책:
//   - "치료/진단/장애" 금칙어 0건 — "발음 발달 가이드" / "보조 도구" 표현만 사용.
//   - sendEmail() 측이 detectBannedTerms() 로 한 번 더 차단 (defense in depth).
//
// R4 정책:
//   - 수신자 = 부모 → childNickname (자녀 이름) prop 포함 OK.
//   - 본 컴포넌트는 _렌더링만_ 수행 — institutionId / parentEmail / token 등
//     식별자는 props 에 받지 않음 (호출 측 책임).
//
// 디자인:
//   - 텍스트 전용 헤더 (이미지 X — 포터블, 다크모드/스팸필터 안전).
//   - 한국어 본문, max-width 600px, sans-serif fallback chain.
//   - CTA 버튼 (단일) → inviteUrl. fallback 으로 URL 텍스트도 본문에 노출.
//   - 의료 disclaimer footer + 알림 설정 안내.
//
// Server-only: @react-email/components / @react-email/render 는 Node.js 환경에서만
//   import — client bundle 에 포함되지 않도록 호출 측 (Server Action / Route Handler / cron)
//   에서만 사용한다. 본 파일 자체는 React 컴포넌트이지만 "use client" directive 없음 →
//   Server Component 로 취급되어 client bundle 진입 자동 차단.

import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/// ParentInviteEmail 컴포넌트 props.
export interface ParentInviteEmailProps {
  /// 가입/초대 signed URL. 예: "https://speech-therapy.app/signup/parent?token=..."
  inviteUrl: string;
  /// (선택) 기관명 (어린이집/유치원). 예: "행복어린이집". 미설정 시 "Speech-Therapy" 폴백.
  institutionName?: string;
  /// (선택) 자녀 별칭 (R4 허용 — 수신자 = 부모).
  childNickname?: string;
}

/// 디자인 토큰 — inline style 사양 (이메일 클라이언트 호환).
const COLORS = {
  text: "#1a1a1a",
  muted: "#666666",
  subtle: "#999999",
  brand: "#2563eb",
  brandText: "#ffffff",
  divider: "#e5e7eb",
  bg: "#ffffff",
} as const;

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

const bodyStyle: React.CSSProperties = {
  backgroundColor: COLORS.bg,
  color: COLORS.text,
  fontFamily: FONT_STACK,
  margin: 0,
  padding: 0,
};

const containerStyle: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "24px",
};

const brandHeaderStyle: React.CSSProperties = {
  fontSize: "14px",
  color: COLORS.muted,
  letterSpacing: "0.05em",
  marginBottom: "8px",
};

const headingStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  margin: "0 0 16px 0",
};

const paragraphStyle: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.6,
  margin: "0 0 12px 0",
};

const ctaSectionStyle: React.CSSProperties = {
  textAlign: "center",
  margin: "32px 0",
};

const ctaButtonStyle: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: COLORS.brand,
  color: COLORS.brandText,
  padding: "12px 24px",
  borderRadius: "8px",
  fontWeight: 700,
  textDecoration: "none",
  fontSize: "15px",
};

const fallbackUrlStyle: React.CSSProperties = {
  fontSize: "13px",
  color: COLORS.muted,
  lineHeight: 1.5,
  wordBreak: "break-all",
};

const dividerStyle: React.CSSProperties = {
  border: 0,
  borderTop: `1px solid ${COLORS.divider}`,
  margin: "24px 0",
};

const disclaimerStyle: React.CSSProperties = {
  fontSize: "13px",
  color: COLORS.muted,
  lineHeight: 1.5,
  margin: "0 0 8px 0",
};

const footerStyle: React.CSSProperties = {
  fontSize: "11px",
  color: COLORS.subtle,
  lineHeight: 1.5,
  margin: 0,
};

/**
 * 부모 초대 이메일 — React Email 컴포넌트 (pilot).
 *
 * 호출 측은 `render(<ParentInviteEmail {...} />)` 로 HTML 문자열을 얻은 뒤
 * sendEmail() (Resend) 의 html 필드로 전달한다.
 */
export function ParentInviteEmail({
  inviteUrl,
  institutionName,
  childNickname,
}: ParentInviteEmailProps): React.ReactElement {
  const institutionLabel = institutionName?.trim() || "Speech-Therapy";
  const greeting = childNickname?.trim()
    ? `${childNickname.trim()} 부모님께`
    : "부모님께";

  const previewText = `${institutionLabel} 가입 안내 — 자녀 발음 발달 가이드`;

  return (
    <Html lang="ko">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* 텍스트 전용 브랜딩 헤더 (이미지 X — 포터블) */}
          <Section>
            <Text style={brandHeaderStyle}>SPEECH-THERAPY</Text>
            <Heading as="h1" style={headingStyle}>
              {institutionLabel} 가입 안내
            </Heading>
          </Section>

          {/* 본문 — 1~2 문장 */}
          <Section>
            <Text style={paragraphStyle}>{greeting}</Text>
            <Text style={paragraphStyle}>
              안녕하세요. <strong>{institutionLabel}</strong> 에서 자녀
              발음 발달 가이드를 위해 Speech-Therapy 가입을 안내드립니다.
            </Text>
            <Text style={paragraphStyle}>
              아래 버튼을 눌러 가입을 완료하시면, 가정에서 자녀의 발음 발달
              상태를 함께 살펴볼 수 있어요.
            </Text>
          </Section>

          {/* CTA 버튼 */}
          <Section style={ctaSectionStyle}>
            <Button href={inviteUrl} style={ctaButtonStyle}>
              가입하고 시작하기
            </Button>
          </Section>

          {/* fallback URL */}
          <Section>
            <Text style={fallbackUrlStyle}>
              버튼이 동작하지 않으면 아래 주소를 브라우저에 복사해 주세요:
              <br />
              <Link href={inviteUrl} style={{ color: COLORS.brand }}>
                {inviteUrl}
              </Link>
            </Text>
          </Section>

          <Hr style={dividerStyle} />

          {/* 의료 disclaimer + footer */}
          <Section>
            <Text style={disclaimerStyle}>
              본 메일은 발음 발달 가이드 안내입니다. 의학적 평가가 아닙니다.
            </Text>
            <Text style={footerStyle}>
              본 메일은 발신 전용입니다. 가입 후 /settings/notifications 에서
              초대 안내 알림을 끌 수 있어요.
              <br />
              Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ParentInviteEmail;
