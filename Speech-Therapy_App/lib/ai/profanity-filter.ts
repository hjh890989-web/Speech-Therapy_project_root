// API-NEW-F15-1 / FR-C-NEW-F15-1 — F15 챗봇 스트림 금칙어 검열 (CON-04 / ADR-04).
//
// 왜 stream transform 인가:
//   proxy.ts(Next.js 16 root middleware)는 자체 주석(forbidden-words.ts L73-84)대로 응답 본문이
//   stream 이라 미들웨어 단계 스캔이 **불가능**하다. 따라서 task 명세의 "proxy.ts 검열"은 부정확하며,
//   실제 검열은 (1) Route Handler 내부 stream transform(본 모듈) + (2) INSERT 전 검증(submitChatUtterance)
//   2계층에서 수행한다. 생성 1차 억제는 system prompt(chat-system-prompt.ts)가 담당 — 3중 방어.
//
// 한계(명문화):
//   - hasBannedTerm 은 표면 문자열 매칭 → 자모 분리('ㅊㅣ료')·동의어('아픈 곳')는 못 잡는다.
//     본 모듈은 공백/zero-width 삽입 우회('치 료')만 normalize 로 차단.
//   - **불안 유발/발달 단정(#7 자폐·#8 SLI)** 표현은 forbidden-words 정규식에 없다 → 잠정 BLOCKLIST 보강하되,
//     그 정본은 KOPLAC 임상 자문 산출물이어야 한다(미완). 따라서 **F15_CHAT_ENABLED=false 가 실질 방어**이고
//     본 검열은 best-effort 보조다.

import { hasBannedTerm } from "@/lib/forbidden-words";

/// 스트림 중 금칙어 발견 시 UI 가 인지하는 swap 마커(cushion [__CUSHION_SWAP__] 패턴).
export const CHAT_SWAP_MARKER = "[__CHAT_SWAP__]" as const;

/// 금칙어 검열 통과 후 대체 안전 멘트(금칙어·단정 0건, 격려 톤 — CON-04/ADR-04).
export const SAFE_FALLBACK_MESSAGE = "우리 같이 천천히 한 번 더 이야기해 볼까요? 😊";

/// 공백·zero-width 문자를 제거해 삽입 우회('치 료' → '치료')를 무력화.
function normalizeForScan(text: string): string {
  return text.replace(/[\s\u200B-\u200D\uFEFF]/g, "");
}

/// ⚠️ 잠정(KOPLAC 자문 확정 대상) — ADR-04 금칙어를 넘는 임상 불안 유발/발달 단정 표현(#7/#8).
/// forbidden-words 에 없는 표현만 보강. 자문 산출물로 정본화 전까지 보수적 최소 집합.
const PROVISIONAL_ANXIETY = /(지연|지체|또래보다|뒤[처쳐]지|발달이?늦|발달이?느[리린]|발달문제)/;

/**
 * 텍스트에 금칙어 또는 잠정 불안 유발 표현이 있는가.
 * forbidden-words 화이트리스트(치료사/언어치료 등)는 hasBannedTerm 이 적용.
 */
export function containsForbidden(text: string): boolean {
  if (!text) return false;
  const normalized = normalizeForScan(text);
  return hasBannedTerm(normalized) || PROVISIONAL_ANXIETY.test(normalized);
}

const SENTENCE_BOUNDARY = /[.!?。\n]/;

/**
 * ReadableStream<string>(Gemini textStream)을 **문장 경계 buffer 후 검열**하는 transform 으로 감싼다.
 *
 * - 완성된 문장(., !, ?, 。, \n 단위)만 검사 후 flush → 금칙어가 부분 노출되기 전에 차단(critique high).
 * - 위반 문장 발견 시: 직전까지의 clean 출력은 유지 + swap 마커 + 안전 멘트 후 종료(cushion 패턴).
 * - 경계 없는 잔여 buffer 는 source 종료 시 일괄 검사.
 *
 * 순수(네트워크 의존 0). source 는 호출 측(streamCushion 류)이 timeout/fallback 을 이미 처리한 것을 받는다.
 */
export function filterStream(source: ReadableStream<string>): ReadableStream<string> {
  const reader = source.getReader();
  let buffer = "";

  const swapAndClose = (controller: ReadableStreamDefaultController<string>) => {
    controller.enqueue(CHAT_SWAP_MARKER);
    controller.enqueue(SAFE_FALLBACK_MESSAGE);
    controller.close();
    void reader.cancel();
  };

  return new ReadableStream<string>({
    async pull(controller) {
      while (true) {
        let result: ReadableStreamReadResult<string>;
        try {
          result = await reader.read();
        } catch {
          // source 에러 — 부분 buffer 검사 후 종료.
          if (buffer && containsForbidden(buffer)) return swapAndClose(controller);
          if (buffer) controller.enqueue(buffer);
          controller.close();
          return;
        }
        if (result.done) {
          if (buffer) {
            if (containsForbidden(buffer)) return swapAndClose(controller);
            controller.enqueue(buffer);
          }
          controller.close();
          return;
        }

        buffer += result.value;
        let enqueuedAny = false;
        let idx: number;
        while ((idx = buffer.search(SENTENCE_BOUNDARY)) !== -1) {
          const sentence = buffer.slice(0, idx + 1);
          buffer = buffer.slice(idx + 1);
          if (containsForbidden(sentence)) return swapAndClose(controller);
          controller.enqueue(sentence);
          enqueuedAny = true;
        }
        if (enqueuedAny) return; // 소비자에게 yield
        // 경계 없음 — 더 읽는다.
      }
    },
    cancel() {
      void reader.cancel();
    },
  });
}
