// FR-Q-013 후속 — submitOfflineEntry Server Action 단위 테스트 (≥8).
//
// 격리:
//   - @/lib/supabase/server (auth.getUser)
//   - @/lib/db prisma.user.findUnique
//   - @/lib/offline-entry/repo (createOfflineEntry)
//   - next/cache (revalidatePath) — setup.ts 가 글로벌 mock 제공
//
// 시나리오 (≥8):
//   1) Zod 실패 (note 빈) → invalid_input
//   2) CON-04 금칙어 ("치료") → banned_term
//   3) 비로그인 → unauthorized
//   4) viewer role 부적합 (parent) → forbidden
//   5) target 미존재 → invalid_target
//   6) target role !== parent → invalid_target
//   7) cross-institution (teacher 다른 institution 자녀) → cross_institution
//   8) admin 은 cross-institution OK → success
//   9) 정상 (teacher 본인 institution) → success + createOfflineEntry 호출 + 텔레메트리
//   10) note 501자 → invalid_input
//   11) observedAt 무효 형식 → invalid_input

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mocks
// ============================================================================
const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
  }),
}));

const userFindUniqueMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
    },
  },
}));

const createOfflineEntryMock = vi.fn();
vi.mock("@/lib/offline-entry/repo", () => ({
  createOfflineEntry: (...args: unknown[]) => createOfflineEntryMock(...args),
  OFFLINE_ENTRY_KINDS: ["practice", "observation", "note"] as const,
  OFFLINE_ENTRY_NOTE_MAX_LENGTH: 500,
}));

import { submitOfflineEntry } from "@/app/actions/offline-entry";

const VIEWER_ID = "vvvvvvvv-vvvv-4vvv-8vvv-vvvvvvvvvvvv";
const TARGET_USER_ID = "tttttttt-tttt-4ttt-8ttt-tttttttttttt";
const INST_A = "inst-A";
const INST_B = "inst-B";

beforeEach(() => {
  getUserMock.mockReset();
  userFindUniqueMock.mockReset();
  createOfflineEntryMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * userFindUniqueMock 의 일관된 default — viewer + target 모두 같은 institution 인
 * teacher / parent 조합. 개별 테스트가 별도 mockResolvedValueOnce 로 override.
 */
function arrangeViewerAndTarget(viewer: {
  role: string | null;
  institutionId: string | null;
}, target: {
  role: string | null;
  institutionId: string | null;
} | null) {
  userFindUniqueMock.mockImplementation((args: { where: { id: string } }) => {
    if (args.where.id === VIEWER_ID) return Promise.resolve(viewer);
    if (args.where.id === TARGET_USER_ID) return Promise.resolve(target);
    return Promise.resolve(null);
  });
}

function arrangeAuthOk() {
  getUserMock.mockResolvedValue({
    data: { user: { id: VIEWER_ID } },
    error: null,
  });
}

describe("submitOfflineEntry — FR-Q-013 후속", () => {
  it("[1] Zod 실패 (note 빈) → invalid_input", async () => {
    arrangeAuthOk();
    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "practice",
      note: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
    expect(createOfflineEntryMock).not.toHaveBeenCalled();
  });

  it("[2] CON-04 금칙어 ('치료') → banned_term", async () => {
    arrangeAuthOk();
    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "note",
      note: "오늘 발음 치료 받음",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("banned_term");
    expect(createOfflineEntryMock).not.toHaveBeenCalled();
  });

  it("[3] 비로그인 → unauthorized", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "no session" } });
    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "practice",
      note: "오늘 ㅅ 5회 연습",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("unauthorized");
  });

  it("[4] viewer role 부적합 (parent) → forbidden", async () => {
    arrangeAuthOk();
    arrangeViewerAndTarget(
      { role: "parent", institutionId: INST_A },
      { role: "parent", institutionId: INST_A },
    );
    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "practice",
      note: "오늘 ㅅ 5회 연습",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("forbidden");
    expect(createOfflineEntryMock).not.toHaveBeenCalled();
  });

  it("[5] target 미존재 → invalid_target", async () => {
    arrangeAuthOk();
    arrangeViewerAndTarget(
      { role: "teacher", institutionId: INST_A },
      null,
    );
    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "practice",
      note: "오늘 ㅅ 5회 연습",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_target");
  });

  it("[6] target role !== parent → invalid_target", async () => {
    arrangeAuthOk();
    arrangeViewerAndTarget(
      { role: "teacher", institutionId: INST_A },
      { role: "teacher", institutionId: INST_A },
    );
    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "practice",
      note: "오늘 ㅅ 5회 연습",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_target");
  });

  it("[7] cross-institution (teacher 다른 institution 자녀) → cross_institution", async () => {
    arrangeAuthOk();
    arrangeViewerAndTarget(
      { role: "teacher", institutionId: INST_A },
      { role: "parent", institutionId: INST_B },
    );
    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "practice",
      note: "오늘 ㅅ 5회 연습",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("cross_institution");
    expect(createOfflineEntryMock).not.toHaveBeenCalled();
  });

  it("[8] admin 은 cross-institution OK → success", async () => {
    arrangeAuthOk();
    arrangeViewerAndTarget(
      { role: "admin", institutionId: null },
      { role: "parent", institutionId: INST_B },
    );
    createOfflineEntryMock.mockResolvedValueOnce({
      id: "entry-admin",
      userId: TARGET_USER_ID,
      authorId: VIEWER_ID,
      kind: "note",
      note: "관리자 입력 테스트",
      observedAt: new Date("2026-05-23T10:00:00Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
      institutionId: null,
    });
    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "note",
      note: "관리자 입력 테스트",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.entryId).toBe("entry-admin");
      expect(typeof result.observedAt).toBe("string");
    }
    expect(createOfflineEntryMock).toHaveBeenCalledTimes(1);
    const arg = createOfflineEntryMock.mock.calls[0][0];
    expect(arg.authorId).toBe(VIEWER_ID);
    expect(arg.userId).toBe(TARGET_USER_ID);
    expect(arg.kind).toBe("note");
    // admin 의 institutionId 가 null 이면 그대로 null 전달.
    expect(arg.institutionId).toBeNull();
  });

  it("[9] 정상 (teacher 본인 institution) → success + createOfflineEntry 호출", async () => {
    arrangeAuthOk();
    arrangeViewerAndTarget(
      { role: "teacher", institutionId: INST_A },
      { role: "parent", institutionId: INST_A },
    );
    createOfflineEntryMock.mockResolvedValueOnce({
      id: "entry-9",
      userId: TARGET_USER_ID,
      authorId: VIEWER_ID,
      kind: "practice",
      note: "오늘 ㅅ 5회 연습",
      observedAt: new Date("2026-05-23T10:00:00Z"),
      createdAt: new Date(),
      updatedAt: new Date(),
      institutionId: INST_A,
    });

    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "practice",
      note: "오늘 ㅅ 5회 연습",
    });

    expect(result.success).toBe(true);
    expect(createOfflineEntryMock).toHaveBeenCalledTimes(1);
    const arg = createOfflineEntryMock.mock.calls[0][0];
    expect(arg.institutionId).toBe(INST_A);
  });

  it("[10] note 501자 → invalid_input (max 500)", async () => {
    arrangeAuthOk();
    const longNote = "가".repeat(501);
    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "practice",
      note: longNote,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
    expect(createOfflineEntryMock).not.toHaveBeenCalled();
  });

  it("[11] observedAt 무효 형식 → invalid_input", async () => {
    arrangeAuthOk();
    arrangeViewerAndTarget(
      { role: "teacher", institutionId: INST_A },
      { role: "parent", institutionId: INST_A },
    );
    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "practice",
      note: "오늘 ㅅ 5회 연습",
      observedAt: "not-a-date",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("invalid_input");
    expect(createOfflineEntryMock).not.toHaveBeenCalled();
  });

  it("[12] principal role + 같은 institution → success", async () => {
    arrangeAuthOk();
    arrangeViewerAndTarget(
      { role: "principal", institutionId: INST_A },
      { role: "parent", institutionId: INST_A },
    );
    createOfflineEntryMock.mockResolvedValueOnce({
      id: "entry-prin",
      userId: TARGET_USER_ID,
      authorId: VIEWER_ID,
      kind: "observation",
      note: "원장 관찰",
      observedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      institutionId: INST_A,
    });
    const result = await submitOfflineEntry({
      userId: TARGET_USER_ID,
      kind: "observation",
      note: "원장 관찰",
    });
    expect(result.success).toBe(true);
  });
});
