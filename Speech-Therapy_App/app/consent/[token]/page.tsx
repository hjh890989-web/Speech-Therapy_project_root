// FR-C-018 (#41) — /consent/[token] 동의서 서명 페이지 (Server Component).
//
// 책임:
//   1) token 으로 ConsentSignature 단건 조회 (lib/consent/repo)
//   2) 미존재 / 만료 / 이미 서명 등 상태별 안내 카피
//   3) status='pending' + 만료일 < now 가 아니면 ConsentSignForm 임베드
//
// 접근 제어:
//   - 본 페이지는 token 만 알면 누구나 접근 가능 — token 자체가 capability (parent inbox 가 보증).
//   - 본인 only 정책은 token 의 UUID 충돌 불가능성에 의존 (R4).
//   - SSR 안전 — Server Component 로 dynamic = force-dynamic.
//
// R4 / CON-04:
//   - childName 노출 — 부모 본인이 받은 이메일 링크 진입이므로 허용.
//   - 본 페이지 카피에 "치료/진단/장애" 사용 금지.

import { ConsentSignForm } from "@/components/consent/ConsentSignForm";
import { findConsentByToken, CONSENT_EXPIRE_DAYS } from "@/lib/consent/repo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "동의서 서명 — Speech-Therapy",
  description:
    "Speech-Therapy 동의서 서명 페이지. 자녀의 발음 발달 데이터 활용 동의서. 의료 서비스가 아닌 부모 정보 제공용 보조 도구.",
};

type PageProps = {
  params: Promise<{ token: string }>;
};

function consentTypeLabel(raw: string): string {
  if (raw === "data_usage") return "데이터 활용";
  return raw;
}

function formatDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export default async function ConsentSignPage({ params }: PageProps) {
  const { token } = await params;
  const row = await findConsentByToken(token);
  const now = new Date();

  const containerStyle: React.CSSProperties = {
    maxWidth: "640px",
    margin: "0 auto",
    padding: "32px 24px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#111827",
  };

  if (!row) {
    return (
      <main style={containerStyle} data-testid="consent-page-not-found">
        <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>동의서를 찾을 수 없습니다</h1>
        <p style={{ fontSize: "15px", color: "#4b5563" }}>
          이메일로 받으신 링크가 정확한지 확인해주세요. 링크가 만료되었거나 잘못된 경우 운영 담당자에게 재발급을 요청해주세요.
        </p>
      </main>
    );
  }

  // 만료 처리: status='expired' OR (status='pending' && sentAt + 7d < now).
  const expiresAt = new Date(
    row.sentAt.getTime() + CONSENT_EXPIRE_DAYS * 24 * 60 * 60 * 1000,
  );
  const isExpired = row.status === "expired" || (row.status === "pending" && expiresAt < now);

  if (isExpired) {
    return (
      <main style={containerStyle} data-testid="consent-page-expired">
        <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>동의서가 만료되었습니다</h1>
        <p style={{ fontSize: "15px", color: "#4b5563", marginBottom: "12px" }}>
          본 동의서는 발송 후 7일이 경과하여 자동 만료되었습니다.
          재발급이 필요하시면 운영 담당자에게 문의해주세요.
        </p>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          최초 발송: {formatDate(row.sentAt)}<br />
          만료 시각: {formatDate(expiresAt)}
        </p>
      </main>
    );
  }

  if (row.status === "signed") {
    return (
      <main style={containerStyle} data-testid="consent-page-signed">
        <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>이미 서명된 동의서입니다</h1>
        <p style={{ fontSize: "15px", color: "#4b5563" }}>
          본 동의서는 {row.signedAt ? formatDate(row.signedAt) : "이전"}에 이미 서명이 완료되었습니다.
          재서명은 필요하지 않습니다.
        </p>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
          문의가 있으시면 운영 담당자에게 연락해주세요.
        </p>
      </main>
    );
  }

  // status='pending' + 미만료 — 서명 폼.
  return (
    <main style={containerStyle} data-testid="consent-page-form">
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
        {row.childNickname} 동의서 서명
      </h1>
      <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px" }}>
        서명 마감: {formatDate(expiresAt)}
      </p>
      <ConsentSignForm
        token={row.token}
        childName={row.childNickname}
        consentTypeLabel={consentTypeLabel(row.consentType)}
        parentName={row.parentName}
      />
    </main>
  );
}
