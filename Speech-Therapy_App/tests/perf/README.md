# PERF-001 — analyzeDiagnosis k6 부하 테스트

> **Issue**: [#69 PERF-001](https://github.com/InterCool-Ha/Speech-Therapy_project_root/issues/69)
> **요구사항**: REQ-NF-001 — `analyzeDiagnosis` Server Action **p95 ≤ 800ms**
> **본 sub-session 범위**: script + 실행 가이드만. 실 부하 측정 / CI 통합은 후속 task.

## 1. 왜 k6 인가

- 가벼운 CLI (단일 Go 바이너리, npm 패키지 아님)
- `threshold` 기능으로 p95 임계를 _스크립트 안에서 직접_ 강제 (실패 시 exit code != 0 → CI 차단 가능)
- Vercel Preview URL 같은 외부 endpoint 도 별다른 셋업 없이 부하 인가
- 결과 출력이 사람이 읽기 좋음 (avg / p90 / p95 / p99 표 형식)

## 2. 설치 (Windows)

```powershell
# 옵션 A: winget (Windows 10/11 권장)
winget install k6 --source winget

# 옵션 B: Chocolatey
choco install k6

# 옵션 C: 수동 — https://github.com/grafana/k6/releases 에서 win-amd64 zip 다운로드
```

설치 확인:

```powershell
k6 version
```

## 3. Server Action 호출 전략

Next.js 16 의 Server Action 은 일반 REST endpoint 가 아니라 **page route 에 POST 되는 RSC 액션** 이다. k6 가 이를 호출하려면 3가지 옵션이 있다.

| 옵션 | 설명 | 채택 여부 | 근거 |
|---|---|---|---|
| ① 직접 RSC POST | `Next-Action` 헤더 + RSC 본문으로 page route 에 POST | **채택** | server-side 부하 직접 측정. 다만 빌드마다 바뀌는 action ID hash 추출 필요 |
| ② Form POST (`<form action={fn}>`) | 폼 제출 시뮬레이션 | 미채택 | 같은 RSC endpoint + 같은 hash 의존, 복잡도 동일 |
| ③ Thin wrapper API route 추가 | `app/api/perf/analyze-diagnosis/route.ts` 신설 | **본 PR 미채택** | 본 sub-session 범위가 `tests/perf/` 한정 (`app/` 수정 금지). 후속 PERF-002 에서 검토 |

본 PR 은 ①을 사용한다. **trade-off**: action ID hash 는 빌드마다 바뀌므로 실행 전 추출 절차 (§4) 가 추가된다. 대신 비즈니스 로직과 1:1 측정이 가능하다 (wrapper 오버헤드 0).

## 4. Action ID 추출

브라우저 DevTools 활용 (가장 안전):

1. `npm run dev` 로 로컬 서버 기동 (포트 4000)
2. `http://localhost:4000/diagnose` 진입 후 발화 → 제출 클릭
3. DevTools → Network 탭 → `/diagnose` POST 요청 선택
4. **Request Headers** 의 `Next-Action: 7f3a9b...` 값 복사

또는 빌드 산출물 grep (실험적):

```powershell
npm run build
# .next/server/app/(public)/diagnose/page.js 등을 grep
Select-String -Path .next/server/**/*.js -Pattern "analyzeDiagnosis" | Select-Object -First 5
```

## 5. 실행

### 5.1 로컬 dev (포트 4000) — Gemini mock 모드

```powershell
# 1) USE_MOCK_DIAGNOSIS=true 로 dev 서버 기동 (G2 비용 가드 — Gemini 실 호출 0건)
$env:USE_MOCK_DIAGNOSIS = "true"
npm run dev

# 2) 다른 PowerShell 창에서 부하 실행
$env:BASE_URL = "http://localhost:4000"
$env:NEXT_ACTION_ID = "여기에 §4 에서 추출한 hash 붙여넣기"
k6 run tests/perf/analyze-diagnosis.k6.js
```

### 5.2 Vercel Preview URL — 실 인프라 측정

```powershell
$env:BASE_URL = "https://speech-therapy-pr-69.vercel.app"
$env:NEXT_ACTION_ID = "<preview 빌드의 action hash>"
$env:SCENARIO = "load"   # 또는 stress
k6 run tests/perf/analyze-diagnosis.k6.js
```

> ⚠️ Vercel Hobby plan 은 함수 동시 실행 한도가 낮음. 100 VU 가 모두 cold start 만나면 노이즈 큼. **반드시 warm-up** (수동 5~10 회 요청 후 측정).

## 6. 시나리오

| 시나리오 | VU | 시간 | 용도 |
|---|---|---|---|
| `load` (기본) | 100 constant | 30s | CI/CD 빠른 검증, p95 ≤ 800ms 회귀 보호 |
| `stress` | 0→100→200→0 ramp | 2m | 수동 nightly, 한계 측정 |

전환:

```powershell
$env:SCENARIO = "stress"
k6 run tests/perf/analyze-diagnosis.k6.js
```

## 7. 결과 해석

k6 가 끝나면 다음과 같은 표를 출력한다 (예시):

```
http_req_duration..............: avg=312.4ms min=128ms med=298ms max=1.2s p(90)=540ms p(95)=712ms p(99)=981ms
  { expected_response:true }...: avg=295.1ms ...                                                  p(95)=698ms
http_req_failed................: 0.21% ✓ 6  ✗ 2845
checks.........................: 99.87%

✓ status is 200
✓ p95 budget met (≤ 800ms)
✓ no server error

THRESHOLDS
  http_req_duration .... ✓ p(95)<800
  http_req_failed ...... ✓ rate<0.01
  checks ............... ✓ rate>0.99

[PASS] analyzeDiagnosis p95 = 712ms (≤ 800ms, REQ-NF-001)
```

핵심 지표:

- **`p(95)`**: REQ-NF-001 의 800ms 임계 비교. 초과 시 `handleSummary` 가 `[FAIL]` 배너 출력 + k6 exit code != 0
- **`http_req_failed`**: 5xx/네트워크 오류 비율. 1% 미만 유지
- **`checks`**: 응답 검증 통과율. 99% 이상

상세 결과는 `tests/perf/.last-run-summary.json` 으로 dump 된다 (gitignore 권장).

## 8. CI/CD 통합 (후속 task)

본 PR 은 script 만 제공. CI 통합은 별도 task (예: PERF-002) 에서:

- GitHub Actions matrix 로 PR → Vercel Preview URL 자동 부하
- 결과 PR 코멘트로 게시 (`grafana/setup-k6-action` + `actions/github-script`)
- Slack alert (직전 측정 대비 +20% 회귀 시)

## 9. 환경변수 요약

| 변수 | 기본값 | 설명 |
|---|---|---|
| `BASE_URL` | `http://localhost:4000` | 대상 서버 |
| `ACTION_ROUTE` | `/diagnose` | Server Action 이 등록된 page route |
| `NEXT_ACTION_ID` | (필수) | Next.js 빌드의 action hash. 미설정 시 즉시 실패 |
| `SCENARIO` | `load` | `load` (100 VU 30s) 또는 `stress` (ramp 0→200 2m) |
| `USE_MOCK_DIAGNOSIS` | _서버측_ | 서버측 env. `true` 시 Gemini / DB mock — Gemini 비용 0 |

## 10. package.json 통합 (사용자 수동)

본 PR 은 `package.json` 을 수정하지 않는다 (격리). 필요 시 사용자가 다음 script 를 추가:

```jsonc
{
  "scripts": {
    "test:perf": "k6 run tests/perf/analyze-diagnosis.k6.js",
    "test:perf:stress": "cross-env SCENARIO=stress k6 run tests/perf/analyze-diagnosis.k6.js"
  }
}
```

## 11. 관련 문서

- 원본 task: `tasks/TASK_PERF-001.md`
- SRS 요구사항: REQ-NF-001 / REQ-NF-004 / REQ-NF-006
- Server Action 구현: `app/actions/diagnosis.ts`
- 입력 스키마: `lib/schemas/diagnosis.ts` (`DiagnosisInputSchema`)
- Mock 모드: `lib/mocks/diagnosis.ts` (`USE_MOCK_DIAGNOSIS=true`)
