"use client";

// FR-C-018 (#41) — 동의서 서명 폼 (Client Component).
//
// 책임:
//   - 동의 체크박스 (필수) + 서명 이름 input (선택)
//   - submitConsentSignature Server Action 호출
//   - 결과 표시 (signed / already_signed / expired / not_found / error)
//   - 성공 후 useTransition 으로 isPending 표시
//
// CON-04: 본 UI 의 모든 카피에서 "치료/진단/장애" 사용 금지.
// R4: childName 은 부모가 보는 한정 컨텍스트 — 부모용 페이지이므로 표시 허용.

import { useState, useTransition } from "react";
import { submitConsentSignature, type ConsentSignActionResult } from "@/app/actions/consent-sign";

export interface ConsentSignFormProps {
  /// 동의서 token (UUID).
  token: string;
  /// 자녀 이름 (부모용 컨텍스트 — R4 허용).
  childName: string;
  /// 동의서 종류 라벨 (이미 한국어 라벨로 변환된 것).
  consentTypeLabel: string;
  /// 부모 이름 (이메일 local-part 등).
  parentName: string;
}

export function ConsentSignForm({
  token,
  childName,
  consentTypeLabel,
  parentName,
}: ConsentSignFormProps) {
  const [agreed, setAgreed] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [result, setResult] = useState<ConsentSignActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    startTransition(async () => {
      const res = await submitConsentSignature({
        token,
        signatureName: signatureName.trim() || undefined,
      });
      setResult(res);
    });
  };

  if (result && result.ok && (result.reason === "signed" || result.reason === "already_signed")) {
    return (
      <div
        role="status"
        data-testid="consent-sign-success"
        style={{
          padding: "16px",
          background: "#ecfdf5",
          border: "1px solid #10b981",
          borderRadius: "8px",
          color: "#065f46",
        }}
      >
        <p style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
          {result.reason === "already_signed"
            ? "이미 서명이 완료된 동의서입니다."
            : "서명이 정상적으로 완료되었습니다. 감사합니다."}
        </p>
        <p style={{ fontSize: "13px", marginTop: "8px", color: "#047857" }}>
          참조번호 끝 4자리: {result.tokenSuffix}
        </p>
      </div>
    );
  }

  if (result && !result.ok && (result.reason === "expired" || result.reason === "not_found")) {
    return (
      <div
        role="alert"
        data-testid="consent-sign-blocked"
        style={{
          padding: "16px",
          background: "#fef2f2",
          border: "1px solid #f87171",
          borderRadius: "8px",
          color: "#7f1d1d",
        }}
      >
        <p style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
          {result.reason === "expired"
            ? "동의서가 만료되었습니다. 운영 담당자에게 재발급을 요청해주세요."
            : "동의서를 찾을 수 없습니다. 이메일의 링크가 정확한지 확인해주세요."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
          <strong>{parentName}</strong> 부모님께서 <strong>{childName}</strong> 의{" "}
          <strong>{consentTypeLabel}</strong> 동의서에 서명하시려고 합니다.
        </p>
        <p style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
          Speech-Therapy 는 의료 서비스가 아닌 부모 정보 제공용 보조 도구입니다.
          본 동의는 자녀의 발음 발달 데이터 활용에 한정됩니다.
        </p>
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "14px" }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          data-testid="consent-agree-checkbox"
          required
        />
        <span>
          위 내용을 확인하였으며, 자녀의 발음 발달 데이터 활용에 동의합니다.
        </span>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "14px" }}>
        <span>서명자 이름 (선택)</span>
        <input
          type="text"
          value={signatureName}
          onChange={(e) => setSignatureName(e.target.value)}
          maxLength={50}
          placeholder="예: 홍길동"
          data-testid="consent-signature-name"
          style={{
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        />
      </label>

      <button
        type="submit"
        disabled={!agreed || isPending}
        data-testid="consent-submit-button"
        style={{
          padding: "12px 24px",
          background: agreed && !isPending ? "#2563eb" : "#9ca3af",
          color: "#fff",
          border: 0,
          borderRadius: "8px",
          fontSize: "15px",
          fontWeight: 600,
          cursor: agreed && !isPending ? "pointer" : "not-allowed",
        }}
      >
        {isPending ? "서명 처리 중..." : "동의서에 서명"}
      </button>

      {result && !result.ok && (result.reason === "internal_error" || result.reason === "invalid_input") && (
        <p role="alert" style={{ color: "#dc2626", fontSize: "13px", margin: 0 }}>
          처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. ({result.reason})
        </p>
      )}
    </form>
  );
}
