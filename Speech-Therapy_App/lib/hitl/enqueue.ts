// FR-C-002 (#25) — Confidence < 70 자동 HITL 큐 이관 트리거.
//
// 본 helper 는 발음 발달 확인 Server Action (app/actions/diagnosis.ts) 의
// 성공 분기에서 fire-and-forget 호출됨. 응답 지연 최소화 (≤ 1ms 추가) 가 목표.
//
// 설계 결정 (Direct DB 호출 vs fetch self):
//   - 채택: Direct DB 호출 (lib/hitl.enqueueForReview 직접 호출)
//   - 사유:
//     1. fetch self 는 round-trip 낭비 (route → handler → 같은 helper 호출).
//     2. INTERNAL_API_SECRET 헤더 의존 — Server Action ↔ Route Handler 인증 복잡도 증가.
//     3. enqueueForReview 가 이미 idempotent (sessionId UNIQUE) + abuse 가드 포함.
//     4. Agent B 의 POST /api/hitl/queue 는 외부 호출자 (admin 도구 / 수동) 용 thin route — 비즈니스 로직 중복 없음.
//
// R4 (자녀 식별 보호): Slack 알림 본문엔 sessionId / queueId / confidence / SLA 만 노출.
// userId / 음성 transcript / audioUrl 절대 미포함.
//
// 금칙어: "진단" / "치료" / "장애" 사용 금지 (변수명 diagnose* 는 컨벤션 유지).

import { trackEvent } from "@/lib/analytics";
import { enqueueForReview } from "@/lib/hitl";
import { notifyHITLBySlack } from "@/lib/notifications/slack";

/// FR-C-002 임계값 — confidence < 70 시 HITL 이관.
/// 70 (경계) 은 통과 (조건이 strict less than).
export const HITL_CONFIDENCE_THRESHOLD = 70;

export interface MaybeEnqueueHitlArgs {
  userId: string;
  /// EvaluationResult.sessionId (1:1) — HITLQueue.sessionId 와 동일 키.
  diagnoseResultId: string;
  /// 0~100 점수. < 70 이면 자동 이관.
  confidenceScore: number;
  /// 분석 대상 음소 — 텔레메트리 분류용 (Slack 본문엔 미포함).
  targetPhoneme: "ㄱ" | "ㄴ" | "ㅅ" | "ㅈ" | "ㄹ";
  /// 옵션 — 향후 전문가 검토 시 첨부 컨텍스트 (현재는 미사용, schema 호환 위해 보존).
  audioUrl?: string;
  transcript?: string;
}

export interface MaybeEnqueueHitlResult {
  enqueued: boolean;
  queueItemId?: string;
  /// 디버깅용 — graceful 실패 사유.
  reason?: "above_threshold" | "db_error" | "ok";
}

/// FR-C-002 진단 flow 통합 트리거.
///
/// 흐름:
///   1. confidence ≥ 70 → { enqueued: false, reason: "above_threshold" } 즉시 반환
///   2. confidence < 70 → enqueueForReview (Direct DB) → notifyHITLBySlack (graceful) → trackEvent
///   3. 모든 단계 graceful — throw 절대 금지 (발음 발달 확인 응답 차단 방지)
export async function maybeEnqueueHitl(
  args: MaybeEnqueueHitlArgs,
): Promise<MaybeEnqueueHitlResult> {
  if (args.confidenceScore >= HITL_CONFIDENCE_THRESHOLD) {
    return { enqueued: false, reason: "above_threshold" };
  }

  let queueItemId: string | undefined;
  try {
    const queue = await enqueueForReview(
      args.diagnoseResultId,
      args.userId,
      args.confidenceScore,
    );
    queueItemId = queue.id;
  } catch (err) {
    console.error("[FR-C-002] HITL 큐 등록 실패 (graceful):", err);
    return { enqueued: false, reason: "db_error" };
  }

  // Slack 알림 — 실패해도 enqueued: true 유지 (DB 가 진실의 원천).
  let slackNotified = false;
  try {
    const result = await notifyHITLBySlack({
      sessionId: args.diagnoseResultId,
      queueId: queueItemId,
      confidenceScore: args.confidenceScore,
      slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
    slackNotified = result.ok === true;
  } catch (err) {
    console.error("[FR-C-002] HITL Slack 알림 예외 (graceful):", err);
  }

  // 텔레메트리 — server-side trackEvent 는 dev console.debug / prod no-op (analytics.ts 참고).
  // try/catch 로 감싸 발음 발달 확인 흐름 보호.
  try {
    trackEvent("hitl_enqueued", {
      queueId: queueItemId!,
      sessionId: args.diagnoseResultId,
      confidenceScore: args.confidenceScore,
      slackNotified,
      targetPhoneme: args.targetPhoneme,
    });
  } catch (err) {
    console.error("[FR-C-002] trackEvent 예외 (graceful):", err);
  }

  return { enqueued: true, queueItemId, reason: "ok" };
}
