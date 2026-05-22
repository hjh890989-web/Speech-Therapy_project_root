// @vitest-environment node
// SEC-003 — verifyOrigin 단위 테스트.
//
// 환경 분기 검증:
//  - production: 화이트리스트 엄격 / Origin 미존재 시 차단
//  - preview: VERCEL_URL 동적 origin 허용
//  - development: localhost 허용 + Origin 미존재 통과
//
// Refs: GitHub Issue #73 (SEC-003), `lib/csrf.ts`.
// @vitest-environment node 지정 이유: happy-dom 은 fetch spec 의 forbidden
// request header (Origin / Referer) 를 strip 함. node env 사용 시 native fetch
// 가 그대로 보존.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyOrigin } from "@/lib/csrf";

// process.env 백업/복원 helper — 테스트마다 환경 격리.
const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
};

function restoreEnv() {
  // NODE_ENV 는 readonly typing 이라 위반 우회. vitest 환경에서 안전.
  (process.env as Record<string, string | undefined>).NODE_ENV =
    ORIGINAL_ENV.NODE_ENV;
  process.env.VERCEL_ENV = ORIGINAL_ENV.VERCEL_ENV;
  process.env.VERCEL_URL = ORIGINAL_ENV.VERCEL_URL;
}

function setEnv(env: {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
}) {
  (process.env as Record<string, string | undefined>).NODE_ENV = env.NODE_ENV;
  process.env.VERCEL_ENV = env.VERCEL_ENV;
  process.env.VERCEL_URL = env.VERCEL_URL;
}

function makeRequest(headerInit: Record<string, string> = {}): Request {
  // happy-dom 호환 우회: Headers 생성자 + set() 으로 forbidden header (Origin/Referer)
  // 우회. node env 에선 무관하지만 일관성 위해 동일 패턴 사용.
  const headers = new Headers();
  for (const [k, v] of Object.entries(headerInit)) {
    headers.set(k, v);
  }
  return new Request("http://localhost/api/consent/sign", {
    method: "POST",
    headers,
  });
}

describe("verifyOrigin (SEC-003 CSRF)", () => {
  beforeEach(() => {
    // 각 테스트가 명시적으로 env 설정 — beforeEach 에서는 초기화만.
    restoreEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe("development 환경", () => {
    beforeEach(() => {
      setEnv({ NODE_ENV: "development" });
    });

    it("localhost:4000 origin 통과", () => {
      const result = verifyOrigin(
        makeRequest({ Origin: "http://localhost:4000" }),
      );
      expect(result.ok).toBe(true);
      expect(result.observedOrigin).toBe("http://localhost:4000");
    });

    it("localhost:3000 origin 통과 (Next.js 기본)", () => {
      const result = verifyOrigin(
        makeRequest({ Origin: "http://localhost:3000" }),
      );
      expect(result.ok).toBe(true);
    });

    it("외부 origin (evil.example.com) 차단", () => {
      const result = verifyOrigin(
        makeRequest({ Origin: "https://evil.example.com" }),
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("CSRF_ORIGIN_MISMATCH");
      expect(result.observedOrigin).toBe("https://evil.example.com");
    });

    it("Origin 헤더 부재 + Referer 부재 → 통과 (편의)", () => {
      const result = verifyOrigin(makeRequest({}));
      expect(result.ok).toBe(true);
    });

    it("Origin 부재 + Referer 허용 origin → 통과 (fallback)", () => {
      const result = verifyOrigin(
        makeRequest({ Referer: "http://localhost:4000/some/page" }),
      );
      expect(result.ok).toBe(true);
      expect(result.observedOrigin).toBe("http://localhost:4000");
    });

    it("Origin 부재 + Referer 외부 origin → 차단 (fallback)", () => {
      const result = verifyOrigin(
        makeRequest({ Referer: "https://evil.example.com/csrf" }),
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("CSRF_ORIGIN_MISMATCH");
      expect(result.observedOrigin).toBe("https://evil.example.com");
    });
  });

  describe("production 환경", () => {
    beforeEach(() => {
      setEnv({ NODE_ENV: "production", VERCEL_ENV: "production" });
    });

    it("prod origin 통과", () => {
      const result = verifyOrigin(
        makeRequest({
          Origin: "https://speech-therapy-project-root.vercel.app",
        }),
      );
      expect(result.ok).toBe(true);
    });

    it("외부 origin 차단", () => {
      const result = verifyOrigin(
        makeRequest({ Origin: "https://evil.example.com" }),
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("CSRF_ORIGIN_MISMATCH");
    });

    it("localhost origin 차단 (prod 화이트리스트 외)", () => {
      const result = verifyOrigin(
        makeRequest({ Origin: "http://localhost:4000" }),
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("CSRF_ORIGIN_MISMATCH");
    });

    it("Origin + Referer 모두 부재 → 차단 (CSRF_ORIGIN_MISSING)", () => {
      const result = verifyOrigin(makeRequest({}));
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("CSRF_ORIGIN_MISSING");
    });

    it("Origin 부재 + Referer 허용 origin → fallback 통과", () => {
      const result = verifyOrigin(
        makeRequest({
          Referer:
            "https://speech-therapy-project-root.vercel.app/consent/sign",
        }),
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("preview 환경 (Vercel)", () => {
    beforeEach(() => {
      setEnv({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        VERCEL_URL: "speech-therapy-pr-123.vercel.app",
      });
    });

    it("VERCEL_URL 동적 origin 통과", () => {
      const result = verifyOrigin(
        makeRequest({ Origin: "https://speech-therapy-pr-123.vercel.app" }),
      );
      expect(result.ok).toBe(true);
    });

    it("prod origin 도 허용 (preview 에서 prod 호출)", () => {
      const result = verifyOrigin(
        makeRequest({
          Origin: "https://speech-therapy-project-root.vercel.app",
        }),
      );
      expect(result.ok).toBe(true);
    });

    it("외부 origin 차단", () => {
      const result = verifyOrigin(
        makeRequest({ Origin: "https://evil.example.com" }),
      );
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("CSRF_ORIGIN_MISMATCH");
    });
  });

  describe("invalid Referer 처리", () => {
    beforeEach(() => {
      setEnv({ NODE_ENV: "development" });
    });

    it("parse 불가능한 Referer + Origin 부재 → 통과 (dev 편의)", () => {
      const result = verifyOrigin(
        makeRequest({ Referer: "not-a-valid-url" }),
      );
      // Referer parse 실패 → extractOriginFromReferer null → Origin 부재 동등 처리 → dev 통과.
      expect(result.ok).toBe(true);
    });
  });
});
