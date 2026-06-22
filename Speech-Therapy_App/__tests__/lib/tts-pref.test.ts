// 문해 읽어주기 환경설정(tts-pref) — 기본값·저장/조회 라운드트립·속도 clamp·손상 JSON 폴백.

import { describe, it, expect, beforeEach } from "vitest";

import {
  getTtsPref,
  setTtsPref,
  RATE_MIN,
  RATE_MAX,
} from "@/lib/literacy/tts-pref";

beforeEach(() => {
  window.localStorage.clear();
});

describe("tts-pref", () => {
  it("기본값 — 저장 없음 → voiceURI null, rate 0.95", () => {
    expect(getTtsPref()).toEqual({ voiceURI: null, rate: 0.95 });
  });

  it("저장/조회 라운드트립", () => {
    setTtsPref({ voiceURI: "ko-voice-1", rate: 1.1 });
    expect(getTtsPref()).toEqual({ voiceURI: "ko-voice-1", rate: 1.1 });
  });

  it("속도는 RATE_MIN~RATE_MAX 로 clamp", () => {
    setTtsPref({ voiceURI: null, rate: 9 });
    expect(getTtsPref().rate).toBe(RATE_MAX);
    setTtsPref({ voiceURI: null, rate: 0.1 });
    expect(getTtsPref().rate).toBe(RATE_MIN);
  });

  it("손상된 JSON → 기본값 폴백", () => {
    window.localStorage.setItem("literacy-tts-pref", "{not json");
    expect(getTtsPref()).toEqual({ voiceURI: null, rate: 0.95 });
  });

  it("voiceURI 비문자열 → null 폴백", () => {
    window.localStorage.setItem(
      "literacy-tts-pref",
      JSON.stringify({ voiceURI: 123, rate: 1.0 }),
    );
    expect(getTtsPref().voiceURI).toBeNull();
    expect(getTtsPref().rate).toBe(1.0);
  });
});
