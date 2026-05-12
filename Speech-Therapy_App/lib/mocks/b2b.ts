// MOCK-003 (B2B 부분, D8 단순화) — 2종 (승인 / 거부).

import {
  B2bApprovalOutputSchema,
  type B2bApprovalOutput,
} from "@/lib/schemas/b2b";
import { getMockBySearchParam, isMockEnabled } from "./utils";

const SAMPLE_CLIPBOARD = `안녕하세요. 오늘 우리 아이는 'ㅅ' 소리 미션을 즐겁게 잘 마쳤어요.
가정에서도 비슷한 단어로 한 번 더 시도해 보시면 좋을 것 같습니다.`;

export const mockApprovalSuccess: B2bApprovalOutput = {
  success: true,
  clipboardText: SAMPLE_CLIPBOARD,
  wasEdited: false,
  approvedAt: new Date().toISOString(),
};

export const mockApprovalRejected: B2bApprovalOutput = {
  success: false,
  clipboardText: "",
  wasEdited: false,
  approvedAt: new Date().toISOString(),
};

const VARIANTS = {
  success: mockApprovalSuccess,
  rejected: mockApprovalRejected,
} as const;

export function getB2bApprovalMock(
  searchParams: URLSearchParams | { get(key: string): string | null },
): B2bApprovalOutput | null {
  if (!isMockEnabled("USE_MOCK_B2B")) return null;
  return getMockBySearchParam(searchParams, "mock-b2b", VARIANTS, mockApprovalSuccess);
}

B2bApprovalOutputSchema.parse(mockApprovalSuccess);
B2bApprovalOutputSchema.parse(mockApprovalRejected);
