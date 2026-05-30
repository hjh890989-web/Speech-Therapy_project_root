// FR-C-NEW-F15-1 — submitChatUtterance 계약(타입). client/server 공용 import(use server X).

export interface SubmitChatUtteranceInput {
  /// 'user'(발화) | 'assistant'(챗봇 응답).
  role: "user" | "assistant";
  content: string;
}

export type SubmitChatUtteranceReason =
  | "unauthorized"
  | "consent_required"
  | "invalid_input"
  | "forbidden_content"
  | "internal_error";

export interface SubmitChatUtteranceResult {
  success: boolean;
  reason?: SubmitChatUtteranceReason;
  messageId?: string;
  /// ISO — expiresAt(now+7일, ADR-03).
  expiresAt?: string;
  message?: string;
}
