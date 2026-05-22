# PERF-002 — Lighthouse CI 회귀 방지

> **Issue**: [#70 PERF-002](https://github.com/InterCool-Ha/Speech-Therapy_project_root/issues/70)
> **요구사항**: REQ-NF-003 (PWA Cold Start ≤ 1.5s) + REQ-NF-005 (보상 UI ≤ 500ms) + REQ-FUNC-024 (파티클 ≤ 500ms)
> **본 sub-session 범위**: config + 실행 스크립트 + 가이드만. 실 측정 / GH Actions 통합은 후속.

## 1. 왜 Lighthouse CI 인가

- **단일 페이지 품질** 측정의 사실상 표준 (Google 공식 + Chrome 동일 엔진)
- `lighthouserc.json` 에 assertion 을 박아두면 **CI 가 자동으로 회귀 차단** (`--assert error` → exit code != 0)
- PWA 카테고리 점수 (manifest, service worker, installable) 를 별도 도구 없이 동시 측정
- Vercel Preview URL 같은 외부 endpoint 도 단일 명령으로 측정
- PERF-001 의 `k6` 와 **상호보완** — k6 = 부하/처리량, Lighthouse = 단일 사용자 체감 품질

## 2. PERF-001 (k6) 와 역할 분담

| 항목 | PERF-001 (`tests/perf/`, k6) | PERF-002 (`tests/lighthouse/`, lhci) |
|---|---|---|
| 측정 대상 | Server Action `analyzeDiagnosis` p95 | 7개 페이지의 클라이언트 체감 품질 |
| 핵심 지표 | `http_req_duration` p95 | LCP, FCP, TBT, CLS, performance score, PWA score |
| SRS 매핑 | REQ-NF-001 (≤ 800ms) | REQ-NF-003 / REQ-NF-005 / REQ-FUNC-024 |
| 부하 수준 | 100~200 VU 동시성 | 1 사용자, cold start |
| 실행 빈도 | nightly / 릴리스 전 | PR 마다 (회귀 게이트) |
| 의존성 | k6 CLI (winget/choco) | `@lhci/cli` npm devDep |

두 도구가 같은 코드 베이스에 공존해야 하는 이유: **부하 통과 ≠ 체감 좋음**. 서버는 빨라도 client bundle 비대 / CLS 발생 시 사용자 이탈은 그대로다.

## 3. 설치 (1회)

```powershell
# Speech-Therapy_App/ 디렉토리에서
npm i -D @lhci/cli
```

> 본 PR 은 `package.json` 을 수정하지 않는다 (PR 격리 정책 — PERF-001 와 동일).
> 사용자가 직접 추가해야 dependency 확정.

설치 확인:

```powershell
npx lhci --version
# 0.14.x 이상 권장 (Lighthouse 12 호환)
```

## 4. 로컬 실행

### 4.1 헬퍼 스크립트 (권장)

```powershell
# Speech-Therapy_App/ 루트에서
./tests/lighthouse/run-local.ps1
```

스크립트가 자동으로:
1. `@lhci/cli` 설치 확인
2. `npm run build` (prod 빌드 — dev 는 LCP 부정확)
3. `npm start` (포트 4000) 백그라운드 기동
4. `npx lhci autorun --config=tests/lighthouse/lighthouserc.json` 실행
5. assertion 결과 + temporary-public-storage URL 출력

> ⚠️ **로컬은 cold start 1.5s 충족 어려움** — 가정용 Wi-Fi + 개발 머신 CPU 변동성 큼. **prod URL (Vercel) 기준이 회귀 차단의 진짜 기준**. 로컬은 _상대적 회귀_ 만 본다 ("어제보다 LCP 300ms 늘었네").

### 4.2 Vercel Preview URL 측정

```powershell
./tests/lighthouse/run-local.ps1 -BaseUrl "https://speech-therapy-pr-70.vercel.app"
```

스크립트가 `npm start` 를 skip 하고 외부 URL 의 7개 라우트를 측정. 이게 진짜 REQ-NF-003 검증.

### 4.3 직접 호출 (스크립트 우회)

```powershell
npx lhci autorun --config=tests/lighthouse/lighthouserc.json
```

## 5. 측정 대상 (7개 라우트)

| URL | 역할 | 추가 assertion |
|---|---|---|
| `/` | 랜딩 (cold start 1차 진입) | performance ≥ 80, LCP ≤ 1500ms |
| `/diagnose` | 발음 진단 입력 | LCP ≤ 1500ms, TTI ≤ 2500ms |
| `/missions` | 주간 미션 카드 | 공통 임계 |
| `/rewards` | **보상 UI (REQ-NF-005)** | **LCP ≤ 500ms, FCP ≤ 500ms, TBT ≤ 200ms** |
| `/reports` | 주간 리포트 | 공통 임계 |
| `/predictions` | 회귀 예측 차트 | 공통 임계 (recharts 무게 주의) |
| `/status` | 운영 status 보드 | 공통 임계 |

공통 임계 (`lighthouserc.json` `assertMatrix[0]`):

- `categories:performance` ≥ **0.80** (error)
- `categories:best-practices` ≥ **0.90** (error)
- `categories:pwa` ≥ **0.80** (error)
- `categories:accessibility` ≥ **0.90** (warn)
- `categories:seo` ≥ **0.85** (warn)
- `first-contentful-paint` ≤ **1500ms** (error, REQ-NF-003)
- `largest-contentful-paint` ≤ **1500ms** (error, REQ-NF-003)
- `total-blocking-time` ≤ **300ms** (error)
- `cumulative-layout-shift` ≤ **0.1** (error)
- `installable-manifest` = **pass** (error)
- `service-worker` = **pass** (error)

## 6. 보상 UI ≤ 500ms — Lighthouse 매핑

REQ-NF-005 ("보상 UI ≤ 500ms") 는 Lighthouse 가 직접 audit 하지 않는다 (Lighthouse 는 "퍼포먼스 점수" + "FCP/LCP 메트릭" 만 제공). 따라서 **프록시 지표** 로 측정:

| SRS 요구 | Lighthouse 메트릭 | 임계 |
|---|---|---|
| 보상 UI 페인트 ≤ 500ms | `largest-contentful-paint` on `/rewards` | ≤ 500ms |
| 보상 UI interactive ≤ 500ms | `total-blocking-time` on `/rewards` | ≤ 200ms |
| 첫 픽셀 노출 | `first-contentful-paint` on `/rewards` | ≤ 500ms |

> 한계: Lighthouse 는 페이지 로드 후의 **react 상태 변화로 인한 파티클 페인트** 는 측정 못 한다. 그 부분은 SRS 의 추가 task ("Custom Performance 측정 — `lib/performance.ts` `measurePaint(componentName)`") 가 별도 PR 로 다룬다 (본 PR 범위 외). Lighthouse 는 어디까지나 **첫 페인트** 까지의 회귀를 본다.

## 7. PWA Cold Start ≤ 1.5s — 측정 환경

- **form-factor**: mobile (Pixel 5 emulation, 412×823, DPR 1.75) — REQ-NF-003 모바일 우선 정책
- **throttling**: moderate 4G (RTT 150ms, 1.6 Mbps) + CPU 4x slowdown — Vercel Hobby cold start 흡수
- **runs**: 3회 (median) — 단발 측정의 노이즈 감소
- **userAgent**: Android 11 Pixel 5 Chrome 120 (실제 타깃 페르소나 — 부모 모바일)

## 8. CI/CD 통합 (후속 task)

본 PR 은 config + 로컬 실행 스크립트만 제공. GH Actions 통합은 후속 sub-session 에서 다음 형태:

```yaml
# .github/workflows/lighthouse.yml (예시 — 본 PR 미포함)
name: Lighthouse CI
on: pull_request
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm i -D @lhci/cli
      - run: npx vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      - run: npx vercel build --token=${{ secrets.VERCEL_TOKEN }}
      - run: |
          DEPLOY_URL=$(npx vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          npx lhci autorun \
            --config=Speech-Therapy_App/tests/lighthouse/lighthouserc.json \
            --collect.url="$DEPLOY_URL/" \
            ... (7 routes)
```

이후 결과 PR 코멘트는 `treosh/lighthouse-ci-action@v11` 또는 `lhci-app` 의 GitHub App 연동.

## 9. 결과 해석

`lhci autorun` 종료 시 stdout 예시:

```
Running Lighthouse 3 time(s) on http://localhost:4000/rewards
  Run #1: performance=0.84  LCP=412ms  FCP=389ms  TBT=180ms  CLS=0.02
  Run #2: performance=0.87  LCP=398ms  FCP=370ms  TBT=160ms  CLS=0.01
  Run #3: performance=0.85  LCP=420ms  FCP=395ms  TBT=170ms  CLS=0.02

Checking assertions against URL http://localhost:4000/rewards
✓ categories:performance         minScore=0.80   actual=0.85
✓ largest-contentful-paint       maxNumericValue=500     actual=410ms
✓ total-blocking-time            maxNumericValue=200     actual=170ms
✓ first-contentful-paint         maxNumericValue=500     actual=385ms
✓ installable-manifest           minScore=1              actual=1

Done running Lighthouse!
Uploading median LHR of http://localhost:4000/rewards...success!
Open the report at https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/...
```

실패 시 exit code != 0 + 다음과 같은 메시지:

```
✘ largest-contentful-paint failure for maxNumericValue assertion
   Expected: <= 500
   Actual:   612
```

## 10. 환경변수 / config 요약

| 항목 | 위치 | 기본값 |
|---|---|---|
| 측정 URL 목록 | `lighthouserc.json` `ci.collect.url[]` | 7개 라우트 (`/`, `/diagnose`, `/missions`, `/rewards`, `/reports`, `/predictions`, `/status`) |
| 측정 횟수 | `ci.collect.numberOfRuns` | 3 |
| form-factor | `ci.collect.settings.formFactor` | `mobile` |
| 결과 업로드 | `ci.upload.target` | `temporary-public-storage` (공개 storage — secret 노출 주의, 후속 task 에서 lhci-server 자체 호스팅 검토) |
| BASE_URL override | CLI `--collect.url=...` | (자동) `run-local.ps1 -BaseUrl` 사용 시 주입 |

## 11. package.json 통합 (사용자 수동)

본 PR 은 `package.json` 미수정. 필요 시 다음 script 추가:

```jsonc
{
  "scripts": {
    "test:lh": "lhci autorun --config=tests/lighthouse/lighthouserc.json",
    "test:lh:local": "powershell -File tests/lighthouse/run-local.ps1",
    "test:lh:preview": "powershell -File tests/lighthouse/run-local.ps1 -BaseUrl"
  }
}
```

## 12. 관련 문서

- 원본 task: `tasks/TASK_PERF-002.md`
- SRS: REQ-NF-003 / REQ-NF-005 / REQ-FUNC-024
- 자매 PR: PERF-001 (`tests/perf/README.md`) — k6 부하 측정
- PWA manifest: `public/manifest.json`, service worker: `public/sw.js`, register: `app/sw-register.tsx`
- Lighthouse CI 공식: <https://github.com/GoogleChrome/lighthouse-ci>
