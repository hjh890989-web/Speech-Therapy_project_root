// MOCK-003 (HITL 부분, D4 단순화) — 4종.

import {
  HitlEnqueueOutputSchema,
  HitlCommentOutputSchema,
  type HitlEnqueueOutput,
  type HitlCommentOutput,
} from "@/lib/schemas/hitl";
import { getMockBySearchParam, isMockEnabled } from "./utils";

const QUEUE_ID_OK = "99999999-9999-4999-8999-999999999999";

export const mockQueueRegistered: HitlEnqueueOutput = {
  success: true,
  queueId: QUEUE_ID_OK,
  slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  slackNotified: true,
};

export const mockQueueDuplicate: HitlEnqueueOutput = {
  success: false,
  queueId: QUEUE_ID_OK,
  slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  slackNotified: false,
};

export const mockSlackFailed: HitlEnqueueOutput = {
  success: true,
  queueId: QUEUE_ID_OK,
  slaDueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  slackNotified: false,
};

export const mockExpertCommentSuccess: HitlCommentOutput = {
  success: true,
  completedAt: new Date().toISOString(),
  userNotified: true,
};

const ENQUEUE_VARIANTS = {
  registered: mockQueueRegistered,
  duplicate: mockQueueDuplicate,
  "slack-failed": mockSlackFailed,
} as const;

export function getHitlEnqueueMock(
  searchParams: URLSearchParams | { get(key: string): string | null },
): HitlEnqueueOutput | null {
  if (!isMockEnabled("USE_MOCK_HITL")) return null;
  return getMockBySearchParam(searchParams, "mock-hitl", ENQUEUE_VARIANTS, mockQueueRegistered);
}

export function getHitlCommentMock(): HitlCommentOutput | null {
  if (!isMockEnabled("USE_MOCK_HITL")) return null;
  return mockExpertCommentSuccess;
}

HitlEnqueueOutputSchema.parse(mockQueueRegistered);
HitlEnqueueOutputSchema.parse(mockQueueDuplicate);
HitlEnqueueOutputSchema.parse(mockSlackFailed);
HitlCommentOutputSchema.parse(mockExpertCommentSuccess);
