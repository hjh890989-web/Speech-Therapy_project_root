// REQ-FUNC-CL-05 — /missions/[missionId]/play Server Component 통합 테스트 (6단계 위계).
//
// 격리:
//   - MissionRunner mock (MicStreamProvider 의존성 회피) — children passthrough
//   - 6 콘텐츠 컴포넌트 mock — props 캡처
//   - next/link mock — 단순 <a> / next/navigation notFound mock — throw 흉내
//
// 위계 라우팅 (CL-05-0): L1 단독음소 / L2 음절 / L3 단어 / L4 구 / L5 문장 / L6 대화.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const isolationMock = vi.fn();
vi.mock("@/components/missions/MissionPhonemeIsolation", () => ({
  MissionPhonemeIsolation: (props: Record<string, unknown>) => {
    isolationMock(props);
    return <div data-testid="mock-isolation">isolation</div>;
  },
}));

const syllableMock = vi.fn();
vi.mock("@/components/missions/MissionSyllable", () => ({
  MissionSyllable: (props: Record<string, unknown>) => {
    syllableMock(props);
    return <div data-testid="mock-syllable">syllable</div>;
  },
}));

const wordRepeatMock = vi.fn();
vi.mock("@/components/missions/MissionWordRepeat", () => ({
  MissionWordRepeat: (props: Record<string, unknown>) => {
    wordRepeatMock(props);
    return <div data-testid="mock-word-repeat">word-repeat</div>;
  },
}));

const phraseMock = vi.fn();
vi.mock("@/components/missions/MissionPhrase", () => ({
  MissionPhrase: (props: Record<string, unknown>) => {
    phraseMock(props);
    return <div data-testid="mock-phrase">phrase</div>;
  },
}));

const sentenceBuildMock = vi.fn();
vi.mock("@/components/missions/MissionSentenceBuild", () => ({
  MissionSentenceBuild: (props: Record<string, unknown>) => {
    sentenceBuildMock(props);
    return <div data-testid="mock-sentence-build">sentence-build</div>;
  },
}));

const conversationMock = vi.fn();
vi.mock("@/components/missions/MissionConversation", () => ({
  MissionConversation: (props: Record<string, unknown>) => {
    conversationMock(props);
    return <div data-testid="mock-conversation">conversation</div>;
  },
}));

vi.mock("@/app/(public)/missions/MissionRunner", () => ({
  MissionRunner: ({
    missionId,
    children,
  }: {
    missionId: string;
    children?: React.ReactNode;
  }) => (
    <div data-testid="mock-mission-runner" data-mission-id={missionId}>
      {children}
    </div>
  ),
}));

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// FR-C-003 — play page 가 card-repo(getMissionCardById)로 카드 조회. DB 없이
// fixtures 로 응답하도록 mock (async factory 로 hoist 안전하게 fixtures import).
vi.mock("@/lib/missions/card-repo", async () => {
  const { dailyMissionFixtures } = await import("@/lib/mocks/missions");
  return {
    getMissionCardById: vi.fn(
      async (id: string) => dailyMissionFixtures.find((m) => m.id === id) ?? null,
    ),
    getMissionCards: vi.fn(async () => dailyMissionFixtures),
  };
});

import MissionPlayPage from "@/app/(public)/missions/[missionId]/play/page";

const FORBIDDEN = ["치료", "진단", "장애"];

beforeEach(() => {
  isolationMock.mockClear();
  syllableMock.mockClear();
  wordRepeatMock.mockClear();
  phraseMock.mockClear();
  sentenceBuildMock.mockClear();
  conversationMock.mockClear();
  notFoundMock.mockClear();
});

async function renderPlay(missionId: string) {
  const ui = await MissionPlayPage({ params: Promise.resolve({ missionId }) });
  return render(ui);
}

describe("/missions/[missionId]/play — REQ-FUNC-CL-05 6단계 위계 라우팅", () => {
  it("[L1] mock-s-1 → MissionPhonemeIsolation mount + isolation props", async () => {
    const { container } = await renderPlay("mock-s-1");
    expect(container.querySelector("[data-testid='mock-isolation']")).not.toBeNull();
    expect(isolationMock).toHaveBeenCalledTimes(1);
    const props = isolationMock.mock.calls[0][0];
    expect(props.phoneme).toBe("ㅅ");
    expect((props.isolation as { mouthHint: string }).mouthHint.length).toBeGreaterThan(0);
  });

  it("[L2] mock-s-2 → MissionSyllable mount + syllables props", async () => {
    const { container } = await renderPlay("mock-s-2");
    expect(container.querySelector("[data-testid='mock-syllable']")).not.toBeNull();
    expect(syllableMock).toHaveBeenCalledTimes(1);
    const props = syllableMock.mock.calls[0][0];
    expect(props.phoneme).toBe("ㅅ");
    expect(Array.isArray(props.syllables)).toBe(true);
    expect((props.syllables as unknown[]).length).toBeGreaterThan(0);
  });

  it("[L3] mock-s-3 → MissionWordRepeat mount + words props (reading 음절 분리)", async () => {
    const { container } = await renderPlay("mock-s-3");
    expect(container.querySelector("[data-testid='mock-word-repeat']")).not.toBeNull();
    expect(wordRepeatMock).toHaveBeenCalledTimes(1);
    const props = wordRepeatMock.mock.calls[0][0];
    expect(props.phoneme).toBe("ㅅ");
    expect(Array.isArray(props.words)).toBe(true);
    expect((props.words as Array<{ reading: string }>)[0].reading).toMatch(/·/);
  });

  it("[L4] mock-s-4 → MissionPhrase mount + phrases props", async () => {
    const { container } = await renderPlay("mock-s-4");
    expect(container.querySelector("[data-testid='mock-phrase']")).not.toBeNull();
    expect(phraseMock).toHaveBeenCalledTimes(1);
    const props = phraseMock.mock.calls[0][0];
    expect(props.phoneme).toBe("ㅅ");
    expect(Array.isArray(props.phrases)).toBe(true);
    expect((props.phrases as unknown[]).length).toBeGreaterThan(0);
  });

  it("[L5] mock-j-5 → MissionSentenceBuild mount + sentences props", async () => {
    const { container } = await renderPlay("mock-j-5");
    expect(container.querySelector("[data-testid='mock-sentence-build']")).not.toBeNull();
    expect(sentenceBuildMock).toHaveBeenCalledTimes(1);
    const props = sentenceBuildMock.mock.calls[0][0];
    expect(props.phoneme).toBe("ㅈ");
    expect(Array.isArray(props.sentences)).toBe(true);
    expect((props.sentences as unknown[]).length).toBeGreaterThan(0);
  });

  it("[L6] mock-s-6 → MissionConversation mount + conversations props", async () => {
    const { container } = await renderPlay("mock-s-6");
    expect(container.querySelector("[data-testid='mock-conversation']")).not.toBeNull();
    expect(conversationMock).toHaveBeenCalledTimes(1);
    const props = conversationMock.mock.calls[0][0];
    expect(props.phoneme).toBe("ㅅ");
    expect(Array.isArray(props.conversations)).toBe(true);
    expect((props.conversations as unknown[]).length).toBeGreaterThan(0);
  });

  it("[notFound] 존재하지 않는 missionId → notFound()", async () => {
    await expect(
      MissionPlayPage({ params: Promise.resolve({ missionId: "does-not-exist" }) }),
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("[CON-04] 금칙어 0건 (L3 페이지 전체 textContent)", async () => {
    const { container } = await renderPlay("mock-s-3");
    const text = container.textContent ?? "";
    for (const w of FORBIDDEN) {
      expect(text).not.toContain(w);
    }
  });
});
