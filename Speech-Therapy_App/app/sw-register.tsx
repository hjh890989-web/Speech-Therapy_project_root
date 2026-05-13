"use client";

// INFRA-003 — Service Worker 등록 (Client Component, layout.tsx 에서 mount).
// 첫 paint 직후 비동기 등록 → 페이지 LCP 영향 없음.

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Production / Preview 에서만 등록 (dev HMR 과 SW 충돌 방지).
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        // 등록 성공.
      })
      .catch(() => {
        // 등록 실패 (지원 안 함 등) — 사용자 응답 막지 않음.
      });
  }, []);

  return null;
}
