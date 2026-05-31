// FR-Q-022 — F15 발화 유도 챗봇 UI (/chat).
//
// 게이트: F15_CHAT_ENABLED !== 'true' → '준비 중' 안내(휴면). 활성 시 disclaimer + ChatClient.
// 안전: 서버 슬라이스(/api/chat/stream + submitChatUtterance)가 auth/consent/금칙어/rate-limit/maskPii/
//       7일 폐기/격리를 강제 — 본 UI 는 그 위의 표면. 13항목 임상 자문 통과(2026-05-31) + 코드 게이트 done.
// CON-04: '치료/진단/장애' 0건 — 놀이/이야기 톤만.

import { ChatClient } from "./ChatClient";

export const metadata = {
  title: "이야기 친구 — Speech-Therapy",
  description: "아이가 즐겁게 더 많이 말하도록 이끌어 주는 대화 놀이입니다.",
};

export const dynamic = "force-dynamic";

function isF15Enabled(): boolean {
  return process.env.F15_CHAT_ENABLED === "true";
}

export default function ChatPage() {
  if (!isF15Enabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center" data-testid="chat-page">
        <p className="text-4xl" aria-hidden="true">💬</p>
        <h1 className="mt-3 text-2xl font-bold">이야기 친구는 곧 만나요</h1>
        <p
          data-testid="chat-coming-soon"
          className="mt-2 text-sm text-gray-600 dark:text-gray-400"
        >
          아이와 즐겁게 이야기 나누는 대화 놀이를 준비하고 있어요. 조금만 기다려 주세요 😊
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col px-4 py-8" data-testid="chat-page">
      {/* CON-04 disclaimer */}
      <p
        data-testid="disclaimer"
        className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        본 대화는 아이가 즐겁게 더 많이 말하도록 이끌어 주는 <strong>놀이 도구</strong>입니다. 의료적
        평가가 아니에요.
      </p>
      <header className="mb-4">
        <h1 className="text-2xl font-bold sm:text-3xl">이야기 친구와 말놀이</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          아이가 친구에게 편하게 이야기를 들려주도록 옆에서 함께해 주세요.
        </p>
      </header>
      <ChatClient />
    </main>
  );
}
