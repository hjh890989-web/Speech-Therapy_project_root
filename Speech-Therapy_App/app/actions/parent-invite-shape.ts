// FR-PERF-3-USE-SERVER-REFACTOR — parent-invite Server Action 의 shape (CLIENT-SAFE).
//
// Next.js 16 + Turbopack 의 "use server" 파일은 async function 외 export 금지 룰
// 정합 위해 분리. 본 파일은 "use server" directive 미포함.

/// Server Action 입력.
export interface SendParentInviteInput {
  /// 부모 이메일 (RFC 5321 형식, 호출 측 검증 후 전달).
  parentEmail: string;
  /// 자녀 식별자 — JWT payload 에 포함되어 가입 후 자녀 연결에 사용.
  childId: string;
  /// 기관 이름 (이메일 본문에 표시).
  institutionName: string;
  /// (선택) 발신자 이름 — 이메일 서명에 표시.
  senderName?: string;
  /// (선택) 자녀 이름 — 이메일 인사말에 표시 (R4 허용 — 수신자=부모 본인).
  childName?: string;
}

/// Server Action 결과 — graceful skip 분기 포함.
export interface SendParentInviteResult {
  /// 실 발송 (Resend ok) 성공 시 true.
  sent: boolean;
  /// 환경 미설정 / 권한 / Resend 실패 / 사용자 opt-out 으로 발송 skip 된 경우 true.
  /// (sent=true 일 때는 항상 false)
  skipped: boolean;
  /// skip 사유 (UI / 분석 분기).
  /// - 'user_opt_out': FR-C-NOTIFICATION-PREFERENCE — 이미 가입한 부모가 parentInviteEmail 옵션을 false 로 설정한 경우.
  reason?:
    | "unauthorized"
    | "forbidden"
    | "invalid_input"
    | "jwt_misconfigured"
    | "email_failed"
    | "user_opt_out";
  /// (디버깅 / 텔레메트리) 발급된 token 식별자 — 본 PR 은 token 자체를 반환하지 않음 (R4).
  tokenIssued: boolean;
}
