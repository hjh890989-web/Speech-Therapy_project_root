"use server";

// MON-001 후속 (AnalyticsEvent 재연결) — funnel 진입/시작 단계 서버 영속.
//
// client beacon/handler 가 fire-and-forget 로 호출(await 안 함). 본 액션은 userId 를
// 서버에서 해소(인증 uid 우선, 익명 쿠키 폴백)한 뒤 AnalyticsEvent 에 INSERT 한다.
// funnel.ts 가 name='funnel_step_reached' + properties.step 으로 distinct userId 집계.
//
// 정책:
//   - graceful: trackServerEvent 가 자체 try/catch(throw 0). 본 액션도 throw 안 함.
//   - INSERT 완료 보장 위해 trackServerEvent 는 *await*(serverless freeze 전 적재) —
//     fire-and-forget 은 _client_ 호출 측 책임.
//   - R4: properties 는 step 라벨만. 자녀 식별 정보 0건.

import { trackServerEvent } from "@/lib/analytics-server";
import { resolveUserId } from "@/lib/auth/resolve-user-id";

const FUNNEL_STEPS = ["landing", "diagnose_started", "mission_started"] as const;

export async function recordFunnelStep(
  step: "landing" | "diagnose_started" | "mission_started",
): Promise<void> {
  // 외부 입력 방어 — 화이트리스트 외 step 무시.
  if (!(FUNNEL_STEPS as readonly string[]).includes(step)) return;
  // graceful — telemetry 영속은 사용자 흐름을 절대 막지 않는다(throw 0). userId 해소
  // (cookies/auth) 실패도 삼킨다(예: 비-request 컨텍스트).
  try {
    const userId = await resolveUserId();
    await trackServerEvent("funnel_step_reached", { step }, userId ?? null);
  } catch (err) {
    console.error("[funnel] recordFunnelStep 실패(graceful):", step, err);
  }
}
