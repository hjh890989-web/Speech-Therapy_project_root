# PERF-002 — Lighthouse CI 로컬 실행 헬퍼 (Windows PowerShell)
#
# 본 스크립트는 npm 패키지를 자동 설치하지 않는다 (PR 분리 정책).
# 사전에 다음을 1회 수행:
#   npm i -D @lhci/cli
#
# 사용 예:
#   ./tests/lighthouse/run-local.ps1                       # 로컬 prod 빌드 → autorun
#   ./tests/lighthouse/run-local.ps1 -BaseUrl <prevUrl>    # Vercel Preview URL 측정
#   ./tests/lighthouse/run-local.ps1 -SkipBuild            # 이미 .next 빌드 완료 시
#
# 종료 코드:
#   0  — 모든 assertion 통과 (회귀 없음)
#   1  — assertion 1건 이상 실패 (LCP > 1.5s, performance < 80 등)

[CmdletBinding()]
param(
    [string]$BaseUrl = "",
    [switch]$SkipBuild,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "===== PERF-002 — Lighthouse CI runner =====" -ForegroundColor Cyan
Write-Host "Issue: #70  |  REQ-NF-003 (Cold Start ≤ 1.5s) + REQ-NF-005 (보상 UI ≤ 500ms)" -ForegroundColor DarkGray
Write-Host ""

# ── 1) lhci 설치 확인 ───────────────────────────────────────────────
$lhciCheck = npx --no-install lhci --version 2>$null
if (-not $lhciCheck) {
    Write-Host "[ERROR] @lhci/cli 미설치. 다음 명령을 먼저 실행:" -ForegroundColor Red
    Write-Host "        npm i -D @lhci/cli" -ForegroundColor Yellow
    exit 2
}
Write-Host "[OK] lhci $lhciCheck" -ForegroundColor Green

# ── 2) 빌드 단계 ────────────────────────────────────────────────────
# dev 빌드는 sourcemap + HMR overhead 로 LCP 부정확 → prod 빌드 필수.
if (-not $SkipBuild -and -not $BaseUrl) {
    Write-Host "[STEP] npm run build (prod 빌드 — dev 모드는 LCP 부정확)" -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] build 실패" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# ── 3) startServerCommand 결정 ──────────────────────────────────────
# BaseUrl 지정 시 외부 URL (Vercel Preview) — 서버 기동 skip.
# 미지정 시 로컬 `npm start` (포트 4000) 자동 기동.
$env:LHCI_BUILD_CONTEXT__CURRENT_BRANCH = (git rev-parse --abbrev-ref HEAD)
$env:LHCI_BUILD_CONTEXT__CURRENT_HASH = (git rev-parse HEAD)

$configPath = "tests/lighthouse/lighthouserc.json"
if (-not (Test-Path $configPath)) {
    Write-Host "[ERROR] $configPath 없음. 본 스크립트는 Speech-Therapy_App/ 루트에서 실행하세요." -ForegroundColor Red
    exit 2
}

$lhciArgs = @("autorun", "--config=$configPath")

if ($BaseUrl) {
    # 외부 URL 측정 — config 의 url 을 override.
    Write-Host "[MODE] 외부 URL 측정: $BaseUrl" -ForegroundColor Yellow
    $routes = @("/", "/diagnose", "/missions", "/rewards", "/reports", "/predictions", "/status")
    foreach ($r in $routes) {
        $lhciArgs += "--collect.url=$BaseUrl$r"
    }
} else {
    # 로컬 — `npm start` 기동 (lhci 가 server 가 살아날 때까지 대기).
    Write-Host "[MODE] 로컬 prod 서버 기동 (포트 4000)" -ForegroundColor Yellow
    $lhciArgs += "--collect.startServerCommand=npm start"
    $lhciArgs += "--collect.startServerReadyPattern=Ready in"
    $lhciArgs += "--collect.startServerReadyTimeout=60000"
}

if ($DryRun) {
    Write-Host "[DRY-RUN] 다음 명령 실행 예정:" -ForegroundColor Magenta
    Write-Host "  npx lhci $($lhciArgs -join ' ')" -ForegroundColor DarkGray
    exit 0
}

# ── 4) lhci autorun 실행 ────────────────────────────────────────────
Write-Host "[STEP] npx lhci autorun" -ForegroundColor Cyan
Write-Host "       (3 run × 7 page × 모바일 = 약 5~8 분 소요)" -ForegroundColor DarkGray
& npx lhci @lhciArgs
$exitCode = $LASTEXITCODE

# ── 5) 결과 안내 ────────────────────────────────────────────────────
Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "[PASS] 모든 assertion 통과 (REQ-NF-003 / REQ-NF-005 충족)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] assertion 실패 — 상세는 위 로그 + 업로드된 temporary-public-storage URL 확인" -ForegroundColor Red
    Write-Host "       (회귀 임계: performance < 80, LCP > 1500ms, /rewards LCP > 500ms 등)" -ForegroundColor DarkGray
}

exit $exitCode
