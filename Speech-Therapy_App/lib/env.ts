// 환경변수 부팅 시 검증 — 303 §8 룰.
//
// Vercel 콜드 스타트 시 즉시 검증 → 누락 시 첫 요청 전 명확한 에러로 차단.
// 분산 검증 (lib/ai/gemini.ts, lib/supabase/{client,server}.ts 등) 의 중앙화 1차 단계.
//
// 서버 측 import 전용 (app/layout.tsx 가 RSC 라서 안전).
// Client Component 에서 import 시도 시 빌드 단계에서 process.env 접근이 inline 되며
// secret 누출 위험 발생할 수 있으므로 lib/env-client.ts 가 필요해지면 별도 분리할 것.

import { z } from "zod";

const envSchema = z.object({
  // DB (Prisma)
  DATABASE_URL: z.string().url({ message: "DATABASE_URL 은 valid URL 이어야 합니다." }),
  DIRECT_URL: z.string().url({ message: "DIRECT_URL 은 valid URL 이어야 합니다 (Prisma migrate 전용)." }),

  // Supabase (NEXT_PUBLIC_* 는 클라이언트에도 inline 되지만 server 측에서도 검증).
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: "NEXT_PUBLIC_SUPABASE_URL 누락 또는 invalid." }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY 누락."),

  // Gemini AI
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1, "GOOGLE_GENERATIVE_AI_API_KEY 누락."),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // 부팅 시 즉시 명확한 에러로 차단. flat() 가 필드별 메시지 배열 반환.
  const flat = parsed.error.flatten().fieldErrors;
  const summary = Object.entries(flat)
    .map(([key, msgs]) => `  - ${key}: ${(msgs ?? []).join(", ")}`)
    .join("\n");
  throw new Error(
    `환경변수 검증 실패. 다음 항목을 확인해 주세요:\n${summary}\n` +
      `Vercel: Project → Settings → Environment Variables 에서 적용 후 재배포.\n` +
      `로컬: .env.local 에 추가.`,
  );
}

/** 검증된 환경변수. 모든 server-side 모듈은 이 객체를 통해 접근 권장. */
export const env = parsed.data;
