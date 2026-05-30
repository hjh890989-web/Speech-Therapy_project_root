// INFRA-005 후속 — 서버 측 분석 이벤트 DB sink (Phase 1).
//
// client(lib/analytics.ts)는 @vercel/analytics 로 전송(브라우저). 서버(Server Action / Route Handler /
// Cron)는 Vercel Analytics(브라우저 SDK) 호출 불가 → prod no-op 으로 유실되던 이벤트를 AnalyticsEvent
// 테이블에 적재해 query-able 하게 만든다(funnel.ts 가 보류했던 '옵션 B').
//
// 정책:
//   - fire-and-forget + graceful: 절대 throw 안 함. sink 실패가 진단 등 본 흐름을 막지 않는다.
//   - NODE_ENV==='test': skip — 테스트 결정성(기존 prisma mock 시나리오와 충돌 회피). 본 함수 자체
//     테스트는 NODE_ENV 를 override 하여 검증.
//   - PII/R4: properties 는 카탈로그(lib/events.ts) shape 으로 자녀 식별 정보 0 강제. userId 는 부모 id(선택).

import { prisma } from "@/lib/db";
import type { AnalyticsEvent } from "./events";

/**
 * 서버 측 분석 이벤트 → AnalyticsEvent 테이블 INSERT.
 * 호출 측은 `void trackServerEvent(...)` 로 fire-and-forget (await 불필요).
 */
export async function trackServerEvent<E extends AnalyticsEvent>(
  event: E["name"],
  properties: E["properties"],
  userId?: string | null,
): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  try {
    await prisma.analyticsEvent.create({
      data: {
        name: event,
        // 카탈로그가 string|number|boolean|null shape 강제 — Prisma Json 으로 안전 저장.
        properties: properties as object,
        userId: userId ?? null,
      },
    });
  } catch (err) {
    // sink 실패가 본 흐름을 막지 않도록 graceful (로그만).
    console.error("[analytics] trackServerEvent sink 실패:", event, err);
  }
}
