// API-010 — Supabase Auth + Middleware RBAC 라우팅 가드 계약.
// SRS §3.3 / §3.4, REQ-NF-019.
// 실제 Middleware 와 SSR 클라이언트는 API-010 구현 단계에서 추가 (별도 PR).

import { z } from "zod";

export const RoleSchema = z.enum(["parent", "teacher", "principal", "expert", "admin"]);
export type Role = z.infer<typeof RoleSchema>;

/// Middleware 라우트 보호 정책 — 경로 prefix → 허용 역할.
export const RouteGuardConfig: Record<string, ReadonlyArray<Role>> = {
  "/dashboard": ["parent", "teacher", "principal", "expert", "admin"],
  "/(dashboard)": ["principal", "teacher"],
  "/(admin)": ["expert", "admin"],
  "/api/admin": ["admin"],
} as const;

export const SessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  role: RoleSchema,
  institutionId: z.string().uuid().nullable(),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

/// 무로그인 → 가입 전환 시 anonymous_user_id 마이그레이션 입력.
export const AnonymousMigrationInputSchema = z.object({
  anonymousUserId: z.string().uuid(),
  newUserId: z.string().uuid(),
});
export type AnonymousMigrationInput = z.infer<typeof AnonymousMigrationInputSchema>;
