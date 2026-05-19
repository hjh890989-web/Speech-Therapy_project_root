"use client";

// INFRA-005-FU (#104) — auth_signin_completed client beacon.
// /auth/callback 가 redirect 시 ?signin=ok&first=1or0 부착 → 본 컴포넌트가 mount 시 1회 발송.
// URL 정리는 안 함 (단순성 우선) — 같은 URL 새로고침해도 fired ref 가 재발송 차단.
//
// 본 컴포넌트는 /rewards 외 페이지에도 redirect 대상이 되면 같은 패턴으로 마운트.

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

export function AuthSigninBeacon({
  signin,
  first,
}: {
  signin: string | undefined;
  first: string | undefined;
}) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    if (signin !== "ok") return;
    firedRef.current = true;
    trackEvent("auth_signin_completed", {
      provider: "google",
      isFirstSignin: first === "1",
    });
  }, [signin, first]);
  return null;
}
