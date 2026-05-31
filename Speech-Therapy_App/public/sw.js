// INFRA-003 — 단순 Service Worker (D5 단순화).
// precache: 정적 자산만. dynamic data (Server Action 응답 등) 는 항상 network.
// IndexedDB / Background Sync 미구현 (D5).

const CACHE_NAME = "speech-therapy-v3";
const PRECACHE_PATHS = [
  "/",
  "/diagnose",
  "/missions",
  "/rewards",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.svg",
  "/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // best-effort: 일부 자산 fetch 실패해도 install 진행.
      Promise.allSettled(PRECACHE_PATHS.map((p) => cache.add(p))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // GET 만 캐시. POST(Server Action) / PATCH 등은 항상 network.
  if (request.method !== "GET") return;
  // 동적 데이터·Server Action 은 network 만 (캐시 X).
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data")) return;

  // Network-first, fallback to cache (정적 자산만 의미 있음).
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 성공 시 캐시 갱신 (정적 자산).
        if (response.ok && (request.destination === "document" || request.destination === "image" || request.destination === "style" || request.destination === "script")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? new Response("Offline", { status: 503 }))),
  );
});

// ============================================================================
// API-020 / FR-C-029 — F16 Web Push 핸들러 (push / notificationclick / notificationclose).
//
// dispatch Cron(/api/push/dispatch) 이 보낸 payload(JSON: { title, body, url }) 를 알림 표시.
// 게이트 off (D5 부활 전) 면 dispatch 가 발송 0건 → 본 핸들러는 자연 비활성.
// CON-04: 카피는 dispatch 측이 fail-closed 검증한 안전 문구만 도달.
// ============================================================================

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = payload.title || "Speech-Therapy";
  const options = {
    body: payload.body || "오늘도 한마디 같이 해봐요.",
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
    data: { url: payload.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 탭이 있으면 focus (+ navigate).
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(targetUrl);
            return undefined;
          }
        }
        // 없으면 새 창.
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        return undefined;
      }),
  );
});

self.addEventListener("notificationclose", (event) => {
  // dismiss 카운트 — 현재 구독 endpoint 로 /api/push/dismiss POST (Phase 2 빈도 적응).
  event.waitUntil(
    self.registration.pushManager
      .getSubscription()
      .then((sub) => {
        if (!sub) return undefined;
        return fetch("/api/push/dismiss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
          keepalive: true,
        }).catch(() => undefined);
      })
      .catch(() => undefined),
  );
});
