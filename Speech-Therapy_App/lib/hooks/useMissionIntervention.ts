"use client";

// FR-C-006 — 미션 침묵 감지 → 거울 모드 / 부모 개입 툴팁 orchestrator.
//
// 정책 (REQ-FUNC-019 + CJM-B 이탈점 방어):
// - 60s 침묵 → 1단계 intervention: tooltip 노출 (덜 침입적, 부모 코칭 유도)
// - 90s 침묵 → 2단계 intervention: mirror mode 자동 활성 (시각 자극 보강)
//   (tooltip 은 그대로 유지 — 두 single source 동시 노출)
// - 발화 감지 (reportSpeech) → silenceMs=0, tooltip / mirror 숨김 + stage cooldown 윈도우 유지
// - 같은 단계 이벤트는 5분 (300_000ms) cooldown — 미션 1세션 안에서 같은 stage 가 다시 트리거되어도
//   `mission_silence_intervention` 이 spam 처럼 발화하지 않도록 보호.
// - 사용자 수동 해제: `dismissTooltip` / `deactivateMirror` — UI 만 숨김 (cooldown 유지).
//
// 본 hook 은 lib/hooks/useSilenceDetection 를 내부적으로 사용하지 않는다.
//   ↳ useSilenceDetection 은 "단일 threshold 1회 호출" contract 라 2단계 분기에는 부적합.
//   ↳ 동일한 1tick(setInterval) 모델을 본 파일이 직접 구현 — 60s/90s 두 stage 모두 같은 카운터.
//
// AGENTS.md / CON-04: "치료/진단/장애" 금칙어 미사용 — UI 카피는 미션 페이지 측 책임.

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

export type InterventionStage = "tooltip" | "mirror";

export interface UseMissionInterventionArgs {
  /// 미션 식별자 — trackEvent properties.missionId 로 그대로 전달.
  missionId: string;
  /// 미션이 active (running) 인 동안에만 true. false → 카운터 정지 + 상태 초기화.
  enabled: boolean;
  /// 1단계 (tooltip) 침묵 임계. 기본 60_000ms = 60s.
  thresholdMs?: number;
  /// 2단계 (mirror) 침묵 임계. 기본 90_000ms = 90s. thresholdMs 보다 커야 함.
  mirrorThresholdMs?: number;
  /// tick 주기. 기본 500ms (REQ-FUNC-019 정확도 ±0.5s 허용).
  tickMs?: number;
  /// 같은 stage 이벤트 재발 cooldown. 기본 300_000ms (5분).
  cooldownMs?: number;
}

export interface UseMissionInterventionReturn {
  /// 거울 모드 활성화 여부 — 미션 페이지 측에서 <MirrorMode active={...} /> 로 전달.
  mirrorActive: boolean;
  /// 부모 개입 툴팁 가시 여부.
  tooltipVisible: boolean;
  /// 현재 누적 침묵 ms (테스트 / 디버깅용 노출).
  silenceMs: number;
  /// 호출 측 (마이크 onspeechstart 등) 에서 발화 감지 시 호출 — 카운터 즉시 리셋.
  reportSpeech: () => void;
  /// 사용자가 툴팁 직접 닫기.
  dismissTooltip: () => void;
  /// 사용자가 거울 모드 직접 닫기.
  deactivateMirror: () => void;
}

export function useMissionIntervention(
  args: UseMissionInterventionArgs,
): UseMissionInterventionReturn {
  const {
    missionId,
    enabled,
    thresholdMs = 60_000,
    mirrorThresholdMs = 90_000,
    tickMs = 500,
    cooldownMs = 300_000,
  } = args;

  const [silenceMs, setSilenceMs] = useState(0);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [mirrorActive, setMirrorActive] = useState(false);

  // 마지막 발화 시각 — Date.now() 기준 (mount 이후 enabled=true 진입 시 초기화).
  const lastSpeechAtRef = useRef<number>(0);
  // 각 stage 별 "이번 silence run 안에서 이미 emit 했는가" 플래그 — speech 시 리셋.
  const tooltipFiredThisRunRef = useRef<boolean>(false);
  const mirrorFiredThisRunRef = useRef<boolean>(false);
  // 각 stage 별 마지막 emit 시각 — 5분 cooldown 판정용. -Infinity = 한 번도 emit 안 함.
  const tooltipLastEmittedAtRef = useRef<number>(Number.NEGATIVE_INFINITY);
  const mirrorLastEmittedAtRef = useRef<number>(Number.NEGATIVE_INFINITY);

  const reportSpeech = useCallback(() => {
    lastSpeechAtRef.current = Date.now();
    tooltipFiredThisRunRef.current = false;
    mirrorFiredThisRunRef.current = false;
    setSilenceMs(0);
    setTooltipVisible(false);
    setMirrorActive(false);
  }, []);

  const dismissTooltip = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  const deactivateMirror = useCallback(() => {
    setMirrorActive(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      // 비활성 → cleanup 함수가 (이전 enabled=true effect run 의 마지막 cleanup) 카운터 초기화.
      // 본 effect 자체는 no-op 으로 두어 effect body 내 setState 회피 (react-hooks/set-state-in-effect).
      return;
    }
    if (lastSpeechAtRef.current === 0) {
      lastSpeechAtRef.current = Date.now();
    }
    const id = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastSpeechAtRef.current;
      setSilenceMs(elapsed);

      // 1단계 — tooltip.
      if (!tooltipFiredThisRunRef.current && elapsed >= thresholdMs) {
        tooltipFiredThisRunRef.current = true;
        setTooltipVisible(true);
        if (now - tooltipLastEmittedAtRef.current >= cooldownMs) {
          tooltipLastEmittedAtRef.current = now;
          trackEvent("mission_silence_intervention", {
            missionId,
            intervention: "tooltip",
            silenceMs: elapsed,
          });
        }
      }
      // 2단계 — mirror. (tooltip 도 그대로 유지 → 두 surface 동시 노출.)
      if (!mirrorFiredThisRunRef.current && elapsed >= mirrorThresholdMs) {
        mirrorFiredThisRunRef.current = true;
        setMirrorActive(true);
        if (now - mirrorLastEmittedAtRef.current >= cooldownMs) {
          mirrorLastEmittedAtRef.current = now;
          trackEvent("mission_silence_intervention", {
            missionId,
            intervention: "mirror",
            silenceMs: elapsed,
          });
        }
      }
    }, tickMs);
    return () => {
      window.clearInterval(id);
      // cleanup 시 (enabled 비활성 / unmount / deps 변경) 카운터·플래그·UI 모두 리셋.
      // 단 cooldown 마커 (tooltipLastEmittedAtRef / mirrorLastEmittedAtRef) 는 보존 →
      // 미션 안에서 같은 stage 가 5분 안에 재발해도 텔레메트리 스팸 방지.
      lastSpeechAtRef.current = 0;
      tooltipFiredThisRunRef.current = false;
      mirrorFiredThisRunRef.current = false;
      setSilenceMs(0);
      setTooltipVisible(false);
      setMirrorActive(false);
    };
  }, [enabled, missionId, thresholdMs, mirrorThresholdMs, tickMs, cooldownMs]);

  return {
    mirrorActive,
    tooltipVisible,
    silenceMs,
    reportSpeech,
    dismissTooltip,
    deactivateMirror,
  };
}
