"use client";

// 문해 놀이 질문·선택지를 한국어로 읽어주는 TTS 훅 — 브라우저 내장 Web Speech API.
//
// 왜: 음운인식 등 문해 놀이는 본질적으로 "듣고 푸는" 과제이고 타깃(만5~7, 더 어린 S0 포함)은
//   아직 글을 못 읽는 아이가 많다 → 질문·선택지를 소리로 들려줘야 게임이 성립한다.
// 비용·서버·외부 의존성 0(STT useSpeechToText 의 반대 방향). 미지원/한국어 보이스 없으면 무음 폴백.
// 연습-only·CON-04 무관 — 읽어주기는 측정/판정이 아니다(텍스트를 그대로 음성으로).

import { useCallback } from "react";

import { getTtsPref } from "@/lib/literacy/tts-pref";

/// 텍스트를 한국어로 읽어주는 speak 함수 반환. 사용자 탭(제스처) 시 호출 → 자동재생 정책 무관.
export function useReadAloud() {
  return useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!text) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel(); // 이전 발화 중단 — 연타 시 겹침 방지.
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      // 사용자 설정(기기 음성·속도) 적용 — 🔊 옆 ⚙️에서 저장. 기본=기기기본 음성·0.95x.
      const pref = getTtsPref();
      u.rate = pref.rate;
      if (pref.voiceURI) {
        const chosen = synth.getVoices().find((v) => v.voiceURI === pref.voiceURI);
        if (chosen) u.voice = chosen;
      }
      synth.speak(u);
    } catch {
      /* 미지원 브라우저 — 무음 폴백 */
    }
  }, []);
}
