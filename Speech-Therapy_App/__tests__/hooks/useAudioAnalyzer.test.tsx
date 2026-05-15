// Sprint 3 §2 A — useAudioAnalyzer hook 단위 테스트 (jsdom).
// AudioContext 미지원 환경에서 graceful fallback 검증.

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

import { useAudioAnalyzer } from "@/lib/hooks/useAudioAnalyzer";

describe("useAudioAnalyzer (jsdom — AudioContext 미지원)", () => {
  it("초기 상태: isSupported=false, status='idle', features=null", () => {
    const { result } = renderHook(() => useAudioAnalyzer());
    expect(result.current.isSupported).toBe(false);
    expect(result.current.status).toBe("idle");
    expect(result.current.features).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it("미지원 환경에서 start() → status='error' + errorMessage 설정", async () => {
    const { result } = renderHook(() => useAudioAnalyzer());

    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).toContain("미지원");
    });
  });

  it("stop() 호출 시 시작 안 한 경우 빈 features 반환", () => {
    const { result } = renderHook(() => useAudioAnalyzer());
    const features = result.current.stop();
    expect(features).toEqual({
      pitchMean: null,
      pitchStd: null,
      durationSec: null,
      energy: null,
    });
  });

  it("reset() 호출 → idle 복귀", async () => {
    const { result } = renderHook(() => useAudioAnalyzer());

    await act(async () => {
      await result.current.start();
    });
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.features).toBeNull();
  });
});
