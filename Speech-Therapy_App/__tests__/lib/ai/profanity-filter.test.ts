// TEST-NEW-F15-1 — F15 챗봇 금칙어 검열 (containsForbidden + filterStream).

import { describe, it, expect } from "vitest";

import {
  containsForbidden,
  filterStream,
  CHAT_SWAP_MARKER,
  SAFE_FALLBACK_MESSAGE,
} from "@/lib/ai/profanity-filter";

function streamOf(chunks: string[]): ReadableStream<string> {
  return new ReadableStream<string>({
    start(c) {
      for (const ch of chunks) c.enqueue(ch);
      c.close();
    },
  });
}

async function collect(s: ReadableStream<string>): Promise<string> {
  const reader = s.getReader();
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += value;
  }
  return out;
}

describe("containsForbidden — TEST-020 금칙어 매트릭스", () => {
  it("10종 금칙어 전부 탐지", () => {
    for (const w of ["치료", "진단", "장애", "환자", "병", "증상", "처방", "병원", "아프다", "문제아"]) {
      expect(containsForbidden(`오늘 ${w} 이야기`), w).toBe(true);
    }
  });

  it("화이트리스트(치료사/언어치료)는 통과(false)", () => {
    expect(containsForbidden("언어치료 선생님 만났어")).toBe(false);
    expect(containsForbidden("치료사 선생님")).toBe(false);
  });

  it("공백·zero-width 삽입 우회('치 료')도 차단", () => {
    expect(containsForbidden("치 료 받자")).toBe(true);
    expect(containsForbidden("병​원 가자")).toBe(true);
  });

  it("잠정 불안 유발/발달 단정(#7/#8) 보강 탐지", () => {
    expect(containsForbidden("발달이 지연된 것 같아요")).toBe(true);
    expect(containsForbidden("또래보다 느린 편이에요")).toBe(true);
    expect(containsForbidden("지체가 의심돼요")).toBe(true);
  });

  it("정상 대화는 통과(false)", () => {
    expect(containsForbidden("안녕! 오늘 뭐 하고 놀았어?")).toBe(false);
    expect(containsForbidden("우리 같이 사과 이야기 해볼까?")).toBe(false);
  });
});

describe("filterStream — 문장 경계 검열 + swap", () => {
  it("정상 스트림은 내용 보존(통과)", async () => {
    const out = await collect(filterStream(streamOf(["안녕! ", "오늘 ", "뭐 했어?"])));
    expect(out).toBe("안녕! 오늘 뭐 했어?");
  });

  it("금칙어 문장 → swap 마커 + 안전 멘트 (부분 노출 없음)", async () => {
    const out = await collect(filterStream(streamOf(["오늘 ", "병원 갔어.", " 또 가자"])));
    expect(out).toBe(`${CHAT_SWAP_MARKER}${SAFE_FALLBACK_MESSAGE}`);
    expect(out).not.toContain("병원");
  });

  it("직전 clean 문장은 유지 + 이후 금칙어 문장에서 swap", async () => {
    // 문장 사이 공백은 다음(차단) 문장 buffer 로 흡수되어 사라짐 — clean 문장 본문은 보존.
    const out = await collect(filterStream(streamOf(["안녕. ", "병원 가자."])));
    expect(out).toBe(`안녕.${CHAT_SWAP_MARKER}${SAFE_FALLBACK_MESSAGE}`);
    expect(out.startsWith("안녕.")).toBe(true);
    expect(out).not.toContain("병원");
  });

  it("화이트리스트 문장은 통과", async () => {
    const out = await collect(filterStream(streamOf(["언어치료 선생님 만났어."])));
    expect(out).toBe("언어치료 선생님 만났어.");
  });

  it("경계 없는 단일 chunk도 종료 시 검사", async () => {
    expect(await collect(filterStream(streamOf(["병원 가야 해"])))).toBe(
      `${CHAT_SWAP_MARKER}${SAFE_FALLBACK_MESSAGE}`,
    );
    expect(await collect(filterStream(streamOf(["오늘 즐거웠어"])))).toBe("오늘 즐거웠어");
  });
});
