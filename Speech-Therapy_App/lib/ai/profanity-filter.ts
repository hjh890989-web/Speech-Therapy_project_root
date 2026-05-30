// API-NEW-F15-1 / FR-C-NEW-F15-1 — F15 챗봇 스트림 금칙어 검열 (CON-04 / ADR-04).
//
// 왜 stream transform 인가:
//   proxy.ts(Next.js 16 root middleware)는 자체 주석(forbidden-words.ts L73-84)대로 응답 본문이
//   stream 이라 미들웨어 단계 스캔이 **불가능**하다. 따라서 task 명세의 "proxy.ts 검열"은 부정확하며,
//   실제 검열은 (1) Route Handler 내부 stream transform(본 모듈) + (2) INSERT 전 검증(submitChatUtterance)
//   2계층에서 수행한다. 생성 1차 억제는 system prompt(chat-system-prompt.ts)가 담당 — 3중 방어.
//
// 한계(명문화):
//   - hasBannedTerm 은 표면 문자열 매칭 → 자모 분리('ㅊㅣ료')·동의어('아픈 곳')는 못 잡는다(입력 가드/출력
//     검열 동일 한계). NFC/자모 정규화·LLM 2차 분류는 F15 활성화(F15_CHAT_ENABLED) 전제 보강 — 별도 PR.
//   - 따라서 **F15_CHAT_ENABLED=false 가 실질 방어**이고 본 검열은 best-effort 보조다.

import { hasBannedTerm } from "@/lib/forbidden-words";

/// 스트림 중 금칙어 발견 시 UI 가 인지하는 swap 마커(cushion [__CUSHION_SWAP__] 패턴).
export const CHAT_SWAP_MARKER = "[__CHAT_SWAP__]" as const;

/// 금칙어 검열 통과 후 대체 안전 멘트(금칙어·단정 0건, 격려 톤 — CON-04/ADR-04).
export const SAFE_FALLBACK_MESSAGE = "우리 같이 천천히 한 번 더 이야기해 볼까요? 😊";

/// 검사 정규화 — 공백·zero-width·문장 부호 제거로 삽입/경계 우회('치 료', '치.료')를 무력화(적대적 검증 high fix).
function normalizeForScan(text: string): string {
  return text.replace(/[\s\u200B-\u200D\uFEFF.!?。·…・]/g, "");
}

/// ⚠️ 잠정(KOPLAC 자문 확정 대상) — ADR-04 금칙어를 넘는 임상 불안 유발/발달 단정 표현(#7/#8).
/// 단발 명사('지연'=이름, '지체'=높임)의 과탐을 피하려 발달 맥락 컬로케이션을 요구(적대적 검증 low fix).
const PROVISIONAL_ANXIETY =
  /또래보다|뒤[처쳐]지|발달이?[늦느]|발달문제|(?:발달|성장|언어|또래)[가-힣]{0,4}(?:지연|지체)|(?:지연|지체)[가-힣]{0,3}(?:있|되|돼|판정|의심|걱정)/;

/// 이미 normalize 된 텍스트에 금칙어/불안 표현이 있는가(경계 횡단 carry 검사 공용).
function scanNormalized(normalized: string): boolean {
  return hasBannedTerm(normalized) || PROVISIONAL_ANXIETY.test(normalized);
}

/**
 * 텍스트에 금칙어 또는 잠정 불안 유발 표현이 있는가.
 * forbidden-words 화이트리스트(치료사/언어치료 등)는 hasBannedTerm 이 적용.
 */
export function containsForbidden(text: string): boolean {
  if (!text) return false;
  return scanNormalized(normalizeForScan(text));
}

const SENTENCE_BOUNDARY = /[.!?。\n]/;

/// 경계 횡단 검사용 carry tail 길이 — 최장 단일 패턴('또래보다'/'발달문제'=4)을 덮는 여유.
const MAX_SCAN_CARRY = 6;

/**
 * ReadableStream<string>(Gemini textStream)을 **문장 경계 buffer + 경계 횡단 검열**하는 transform 으로 감싼다.
 *
 * - 완성된 문장(., !, ?, 。, \n 단위)만 검사 후 flush → 금칙어가 부분 노출되기 전에 차단.
 * - **경계 횡단**: 직전 flush 의 normalized tail(carry)을 다음 조각 앞에 붙여 검사 → '치.료'·'치\n료'처럼
 *   금칙어가 경계 char 로 쪼개져도 합쳐서 탐지(적대적 검증 high fix). normalizeForScan 이 경계/부호도 제거.
 * - 위반 발견 시: 직전까지의 clean 출력은 유지 + swap 마커 + 안전 멘트 후 종료(cushion 패턴).
 *
 * 순수(네트워크 의존 0). source 는 호출 측(streamChatReply)이 timeout/fallback 을 이미 처리한 것을 받는다.
 */
export function filterStream(source: ReadableStream<string>): ReadableStream<string> {
  const reader = source.getReader();
  let buffer = "";
  let carry = ""; // 직전까지 flush 된 normalized tail — 금칙어가 경계로 쪼개진 경우 합쳐 검사.

  const swapAndClose = (controller: ReadableStreamDefaultController<string>) => {
    controller.enqueue(CHAT_SWAP_MARKER);
    controller.enqueue(SAFE_FALLBACK_MESSAGE);
    controller.close();
    void reader.cancel();
  };

  /// 한 조각(문장/잔여)을 carry 와 합쳐 검사 후 flush. 위반이면 swap+close 하고 true(중단) 반환.
  const scanAndEnqueue = (
    controller: ReadableStreamDefaultController<string>,
    piece: string,
  ): boolean => {
    const probe = carry + normalizeForScan(piece);
    if (scanNormalized(probe)) {
      swapAndClose(controller);
      return true;
    }
    controller.enqueue(piece);
    carry = probe.slice(-MAX_SCAN_CARRY);
    return false;
  };

  return new ReadableStream<string>({
    async pull(controller) {
      while (true) {
        let result: ReadableStreamReadResult<string>;
        try {
          result = await reader.read();
        } catch {
          if (buffer && scanAndEnqueue(controller, buffer)) return;
          controller.close();
          return;
        }
        if (result.done) {
          if (buffer && scanAndEnqueue(controller, buffer)) return;
          controller.close();
          return;
        }

        buffer += result.value;
        let enqueuedAny = false;
        let idx: number;
        while ((idx = buffer.search(SENTENCE_BOUNDARY)) !== -1) {
          const sentence = buffer.slice(0, idx + 1);
          buffer = buffer.slice(idx + 1);
          if (scanAndEnqueue(controller, sentence)) return;
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
