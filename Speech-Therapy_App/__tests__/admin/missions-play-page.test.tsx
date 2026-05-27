// FR-Q-003-CONTENT — /missions/[missionId]/play Server Component 통합 테스트.
//
// 격리:
//   - MissionRunner mock (MicStreamProvider 의존성 회피) — children passthrough
//   - MissionWordFill / MissionSentenceBuild mock — props 캡처
//   - next/link mock — 단순 <a>
//   - next/navigation notFound mock — throw 흉내
//
// 검증 시나리오:
//   1. 난이도 2 fixture → MissionWordFill mount (단어 props 전달)
//   2. 난이도 3 fixture → MissionSentenceBuild mount (문장 props 전달)
//   3. 난이도 1 fixture → 콘텐츠 컴포넌트 미 mount (MissionRunner 단독)
//   4. 존재하지 않는 missionId → notFound()
//   5. CON-04 금칙어 0건

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const wordFillMock = vi.fn();
vi.mock("@/components/missions/MissionWordFill", () => ({
  MissionWordFill: (props: Record<string, unknown>) => {
    wordFillMock(props);
    return <div data-testid="mock-word-fill">word-fill</div>;
  },
}));

const sentenceBuildMock = vi.fn();
vi.mock("@/components/missions/MissionSentenceBuild", () => ({
  MissionSentenceBuild: (props: Record<string, unknown>) => {
    sentenceBuildMock(props);
    return <div data-testid="mock-sentence-build">sentence-build</div>;
  },
}));

// MissionRunner — MicStreamProvider 의 navigator.mediaDevices 의존성 회피.
// children 만 그대로 렌더 (콘텐츠 mount 여부 검증용).
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

// Worktree 내부 import 경로가 길어 위 경로와 별개로 한 번 더 등록 — page.tsx 가
// 상대 경로 (`../../MissionRunner`) 로 import 하므로 alias mock 만으로는 부족할 수 있음.
// vitest resolve 시 모듈 ID 가 동일하게 해석되므로 alias mock 1건이면 충분하다.

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

import MissionPlayPage from "@/app/(public)/missions/[missionId]/play/page";

const FORBIDDEN = ["치료", "진단", "장애"];

beforeEach(() => {
  wordFillMock.mockClear();
  sentenceBuildMock.mockClear();
  notFoundMock.mockClear();
});

describe("/missions/[missionId]/play — FR-Q-003-CONTENT 미션 플레이 페이지", () => {
  it("[1] 난이도 2 fixture (mock-ㅅ-2) → MissionWordFill mount + 단어 props 전달", async () => {
    const ui = await MissionPlayPage({ params: Promise.resolve({ missionId: "mock-s-2" }) });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='mock-word-fill']")).not.toBeNull();
    expect(container.querySelector("[data-testid='mock-sentence-build']")).toBeNull();
    expect(wordFillMock).toHaveBeenCalledTimes(1);
    const props = wordFillMock.mock.calls[0][0];
    expect(props.phoneme).toBe("ㅅ");
    expect(Array.isArray(props.words)).toBe(true);
    expect(props.words.length).toBeGreaterThan(0);
  });

  it("[2] 난이도 3 fixture (mock-ㅈ-3) → MissionSentenceBuild mount + 문장 props 전달", async () => {
    const ui = await MissionPlayPage({ params: Promise.resolve({ missionId: "mock-j-3" }) });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='mock-sentence-build']")).not.toBeNull();
    expect(container.querySelector("[data-testid='mock-word-fill']")).toBeNull();
    expect(sentenceBuildMock).toHaveBeenCalledTimes(1);
    const props = sentenceBuildMock.mock.calls[0][0];
    expect(props.phoneme).toBe("ㅈ");
    expect(Array.isArray(props.sentences)).toBe(true);
    expect(props.sentences.length).toBeGreaterThan(0);
  });

  it("[3] 난이도 1 fixture (mock-ㄱ-1) → 콘텐츠 컴포넌트 미 mount, MissionRunner 단독", async () => {
    const ui = await MissionPlayPage({ params: Promise.resolve({ missionId: "mock-g-1" }) });
    const { container } = render(ui);

    expect(container.querySelector("[data-testid='mock-mission-runner']")).not.toBeNull();
    expect(container.querySelector("[data-testid='mock-word-fill']")).toBeNull();
    expect(container.querySelector("[data-testid='mock-sentence-build']")).toBeNull();
    expect(wordFillMock).not.toHaveBeenCalled();
    expect(sentenceBuildMock).not.toHaveBeenCalled();
  });

  it("[4] 존재하지 않는 missionId → notFound()", async () => {
    await expect(
      MissionPlayPage({ params: Promise.resolve({ missionId: "does-not-exist" }) }),
    ).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("[5] CON-04 금칙어 0건 (난이도 2 페이지 전체 textContent)", async () => {
    const ui = await MissionPlayPage({ params: Promise.resolve({ missionId: "mock-s-2" }) });
    const { container } = render(ui);
    const text = container.textContent ?? "";
    for (const w of FORBIDDEN) {
      expect(text).not.toContain(w);
    }
  });
});
