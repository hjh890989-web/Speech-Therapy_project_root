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
