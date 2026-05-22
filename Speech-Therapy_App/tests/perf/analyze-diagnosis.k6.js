// PERF-001 — analyzeDiagnosis Server Action k6 부하 테스트 스크립트
//
// 목적: REQ-NF-001 (p95 ≤ 800ms) 자동 검증.
// 실행 도구: k6 (https://k6.io) — 별도 CLI 설치 필요 (npm 패키지 아님).
//
// 실행 예시 (Windows PowerShell):
//   $env:BASE_URL = "http://localhost:4000"
//   $env:NEXT_ACTION_ID = "<page 의 응답 헤더에서 추출>"
//   k6 run tests/perf/analyze-diagnosis.k6.js
//
// 자세한 가이드: tests/perf/README.md
//
// ⚠️ Server Action 호출 전략:
//   Next.js 16 의 Server Action 은 page route 로 POST 되며,
//   `Next-Action: <build-time-hash>` 헤더로 어떤 함수인지 식별한다.
//   해시는 빌드마다 다르므로 NEXT_ACTION_ID 환경변수로 외부 주입한다.
//   (해시 추출 방법은 README 의 "Action ID 추출" 절 참조.)
//
//   USE_MOCK_DIAGNOSIS=true 환경에서 실행하면 Gemini / DB 호출이 mock 으로
//   대체되어 순수 네트워크 + RSC 직렬화 비용만 측정한다 (G2 비용 가드).

import http from "k6/http";
import { check } from "k6";

// ── 환경 변수 ──────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
// 예: "/diagnose" — Server Action 이 호출되는 page route.
const ACTION_ROUTE = __ENV.ACTION_ROUTE || "/diagnose";
// Next.js 빌드 시 산출되는 action ID 해시. 빌드 산출물에서 추출 필요.
// 추출 방법은 README 참조. 미설정 시 스크립트는 즉시 실패.
const NEXT_ACTION_ID = __ENV.NEXT_ACTION_ID || "";

if (!NEXT_ACTION_ID) {
  throw new Error(
    "NEXT_ACTION_ID 환경변수 미설정. README 의 'Action ID 추출' 절 참조.",
  );
}

// ── 부하 시나리오 ──────────────────────────────────────────────────
// REQ-NF-001 검증용 시나리오 2종:
//   load: 100 VU × 30s — 일반 부하 (CI/CD 빠른 검증)
//   stress: ramping 0→200 VU 2m — 스트레스 (수동 nightly)
// CI 에선 load 만 기본 실행. 환경변수 SCENARIO=stress 로 전환.
const SCENARIO = __ENV.SCENARIO || "load";

const scenarios = {
  load: {
    executor: "constant-vus",
    vus: 100,
    duration: "30s",
    gracefulStop: "10s",
  },
  stress: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 100 },
      { duration: "1m", target: 200 },
      { duration: "30s", target: 0 },
    ],
    gracefulStop: "15s",
  },
};

export const options = {
  scenarios: { [SCENARIO]: scenarios[SCENARIO] },
  // REQ-NF-001 — p95 ≤ 800ms 강제 (실패 시 k6 exit code != 0 → CI 차단).
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.01"], // 5xx / network err < 1%
    checks: ["rate>0.99"], // 응답 검증 99% 이상 성공
  },
  // 결과 요약 표시 시 p95 / p99 강조.
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};

// ── 테스트 입력 풀 (다양한 transcript + 월령 + 음소) ─────────────────
// DiagnosisInputSchema 호환. anonymousUserId 는 VU 마다 무작위 UUID.
// 음소는 WORD_POOL 의 phoneme 필드로 매핑 (별도 상수 불필요).
const WORD_POOL = [
  { intendedWord: "사과", transcript: "사과", phoneme: "ㅅ" },
  { intendedWord: "사과", transcript: "샤과", phoneme: "ㅅ" }, // 부분 일치
  { intendedWord: "주스", transcript: "주스", phoneme: "ㅈ" },
  { intendedWord: "주스", transcript: "쥬스", phoneme: "ㅈ" },
  { intendedWord: "거북", transcript: "거북", phoneme: "ㄱ" },
  { intendedWord: "나무", transcript: "나무", phoneme: "ㄴ" },
  { intendedWord: "라면", transcript: "라면", phoneme: "ㄹ" },
  { intendedWord: "라면", transcript: "야면", phoneme: "ㄹ" }, // 발음 어려움
];
const AGE_POOL = [30, 36, 42, 48, 54, 60, 72]; // 만 2.5 ~ 6세

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// RFC 4122 v4 UUID — k6 환경엔 crypto.randomUUID 없을 수 있어 직접 구현.
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Server Action 페이로드 생성 ────────────────────────────────────
// Next.js 16 Server Action 직렬화 포맷: text/plain 본문에 JSON 배열 (인자 목록).
// analyzeDiagnosis(rawInput, options) 시그니처 → [input, {}] 배열로 직렬화.
// (Form Data 멀티파트도 가능하나 text/plain 이 더 단순.)
function buildPayload() {
  const sample = randomItem(WORD_POOL);
  const input = {
    intendedWord: sample.intendedWord,
    transcript: sample.transcript,
    childAgeMonths: randomItem(AGE_POOL),
    targetPhoneme: sample.phoneme,
    anonymousUserId: uuidv4(),
    sttConfidence: 0.85,
    acousticFeatures: null,
  };
  return JSON.stringify([input, {}]);
}

// k6 가 호출하는 단일 VU iteration. default export 이지만 명명함수로
// 두어 lint 규칙 (import/no-anonymous-default-export) 만족.
export default function runIteration() {
  const url = `${BASE_URL}${ACTION_ROUTE}`;
  const payload = buildPayload();
  const params = {
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      Accept: "text/x-component",
      "Next-Action": NEXT_ACTION_ID,
      // RSC 라우터 상태 — 단순 page 이동 가정.
      "Next-Router-State-Tree": encodeURIComponent(
        JSON.stringify(["", { children: ["diagnose", { children: ["__PAGE__", {}] }] }]),
      ),
    },
    // PERF-001 의 p95 임계가 800ms 이므로 그 2배 (1.6s) 를 개별 타임아웃으로.
    timeout: "1600ms",
  };

  const res = http.post(url, payload, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "p95 budget met (≤ 800ms)": (r) => r.timings.duration <= 800,
    "no server error": (r) => r.status < 500,
  });
}

// ── 결과 요약 후크 ─────────────────────────────────────────────────
// 표준 stdout 출력 외 별도 처리는 README 의 "결과 해석" 절 참고.
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.["p(95)"] ?? 0;
  const passed = p95 <= 800;
  const banner = passed
    ? `[PASS] analyzeDiagnosis p95 = ${p95.toFixed(0)}ms (≤ 800ms, REQ-NF-001)`
    : `[FAIL] analyzeDiagnosis p95 = ${p95.toFixed(0)}ms (> 800ms, REQ-NF-001 위반)`;
  return {
    stdout: `\n${banner}\n\n`,
    "tests/perf/.last-run-summary.json": JSON.stringify(data, null, 2),
  };
}
