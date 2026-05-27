"use client";

// SEC-COMP-PIPA (Grill #3A) — 익명 user 의 PIPA 동의 상태 localStorage 마커.
//
// 책임:
//   - 동의 후 두 마커 (pipa_consented_at + overseas_consented_at) 를 localStorage 저장.
//   - 다음 방문 시 자동 prefill — DiagnosisForm 의 동의 체크박스 자동 체크.
//   - SSR 안전 — typeof window 분기로 hydration mismatch 회피.
//
// DB 와 이중 권위 (8/x §iOS ITP cookie + localStorage 권위 패턴과 동일 정합):
//   - localStorage: UI 즉시 prefill — UX 즉시성.
//   - DB (User.pipaUnderageConsentAt + overseasTransferConsentAt): canonical 영속.
//   - localStorage 가 일시적 (브라우저 청소 / iOS ITP 7일 캡) 으로 사라져도 DB 가 진실원.
//
// 권위 우선순위:
//   - DB > localStorage (DB 가 진실원, localStorage 는 UX cache).
//   - 단 익명 user 의 DB row 조회는 RSC 측에서 별도 fetch 필요 — 본 hook 은 client 측 prefill 만.

import { useEffect, useState } from "react";

const KEY_PIPA = "pipa_consented_at";
const KEY_OVERSEAS = "overseas_consented_at";

/** localStorage 의 동의 일시 (ISO 문자열 또는 null) 를 안전하게 읽기. */
function readMarker(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** localStorage 에 동의 일시 (ISO 8601) 저장. SSR 안전 + Storage 예외 graceful. */
function writeMarker(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Storage quota / 비공개 모드 — graceful. */
  }
}

export interface AnonymousConsentState {
  pipaConsented: boolean;
  overseasConsented: boolean;
  /** 두 동의 모두 완료 여부. */
  bothConsented: boolean;
  /** 두 동의 일시를 localStorage 에 marker 로 기록 (현재 시각). */
  markConsented: () => void;
}

/**
 * 익명 user 의 PIPA 동의 상태 hook.
 *
 * 사용:
 *   const { pipaConsented, overseasConsented, bothConsented, markConsented } = useAnonymousConsent();
 *   const [pipa, setPipa] = useState(pipaConsented);  // prefill
 *   ...
 *   await analyzeDiagnosis({ pipaUnderageConsent: pipa, overseasTransferConsent: overseas, ... });
 *   if (result) markConsented();
 */
export function useAnonymousConsent(): AnonymousConsentState {
  const [pipaConsented, setPipa] = useState(false);
  const [overseasConsented, setOverseas] = useState(false);

  // mount 후 1회 localStorage 동기화 — SSR/hydration mismatch 회피.
  // 외부 시스템 (localStorage) → React state 의 일회성 동기화 — set-state-in-effect 룰의
  // 정당한 예외 (OnboardingWizardClient / SplCalibrationWizard 와 동일 패턴).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPipa(readMarker(KEY_PIPA) !== null);
    setOverseas(readMarker(KEY_OVERSEAS) !== null);
  }, []);

  function markConsented() {
    const now = new Date().toISOString();
    writeMarker(KEY_PIPA, now);
    writeMarker(KEY_OVERSEAS, now);
    setPipa(true);
    setOverseas(true);
  }

  return {
    pipaConsented,
    overseasConsented,
    bothConsented: pipaConsented && overseasConsented,
    markConsented,
  };
}
