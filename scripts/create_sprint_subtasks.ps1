# Sprint sub-task 14건 별도 issue 생성
#
# 03_Tasks_Breakdown_SRS_reinforce.md §10.1 의 Sprint sub-task 표 기반.
# 이미 완료된 sub-task 는 closed 상태로 생성.

$ErrorActionPreference = "Stop"
$REPO = "hjh890989-web/Speech-Therapy_project_root"
$PROJECT_NUM = 8
$PROJECT_OWNER = "hjh890989-web"

# Sub-task 정의
$subtasks = @(
    @{ Id = "SP1A"; Title = "[SubTask] Sprint 1 §A — cushion 분리 (analyzeDiagnosis)"; Parent = "FR-C-001"; Status = "Done"; Phase = "phase:p0"; Milestone = 1; Body = @"
## 🎯 Sub-task ID: SP1A
- **상위 SRS task**: FR-C-001 (3축 스코어링)
- **Phase**: 🟢 P0
- **Status**: ✅ 완료
- **목적**: 결과 페이지 도착 시간 ~10초 단축 위해 cushion 생성을 별도 Server Action 으로 분리.

## 📌 Acceptance Criteria
- [x] ``app/actions/cushion.ts`` 신규 — generateCushion() Server Action
- [x] analyzeDiagnosis() 에서 cushion 생성 제거
- [x] 결과 페이지의 ``<CushionAsync>`` 컴포넌트가 Suspense 로 cushion 호출

## 🔁 의존성
- **선행**: FR-C-001 (기존 3축 스코어링)
- **후속**: SP2_2 (phonetic similarity), SP3_2E (rate limiter)
"@ },
    @{ Id = "SP1B"; Title = "[SubTask] Sprint 1 §B — user upsert 병렬"; Parent = "API-001"; Status = "Done"; Phase = "phase:p0"; Milestone = 1; Body = @"
## 🎯 Sub-task ID: SP1B
- **상위 SRS task**: API-001 (analyzeDiagnosis DTO)
- **Status**: ✅ 완료
- **목적**: 익명 사용자 처리 시 user upsert 를 SessionLog INSERT 와 병렬 수행 → 응답 시간 단축.
"@ },
    @{ Id = "SP1C"; Title = "[SubTask] Sprint 1 §C — Slack fire-and-forget"; Parent = "FR-C-002"; Status = "Done"; Phase = "phase:p0"; Milestone = 1; Body = @"
## 🎯 Sub-task ID: SP1C
- **상위 SRS task**: FR-C-002 (HITL 큐 INSERT)
- **Status**: ✅ 완료
- **목적**: HITL 알림 (D4 단순화) — Slack webhook 호출을 fire-and-forget 패턴으로 사용자 응답 차단 방지.
"@ },
    @{ Id = "SP2_3"; Title = "[SubTask] Sprint 2 §3 — anonymous_user_id cookie 권위"; Parent = "DB-002/API-010"; Status = "Done"; Phase = "phase:p0"; Milestone = 2; Body = @"
## 🎯 Sub-task ID: SP2_3
- **상위 SRS task**: DB-002 / API-010
- **Status**: ✅ 완료
- **목적**: ``proxy.ts`` (구 middleware) 가 cookie 부재 시 서버측 발급. iOS Safari ITP 의 JS-set cookie 7일 캡 우회.
"@ },
    @{ Id = "SP2_1"; Title = "[SubTask] Sprint 2 §1 — 익명 cookie + Magic Link 마이그레이션 (= API-010 §1)"; Parent = "API-010"; Status = "Done"; Phase = "phase:p0"; Milestone = 2; Body = @"
## 🎯 Sub-task ID: SP2_1
- **상위 SRS task**: API-010 (Supabase Auth + Middleware RBAC)
- **Status**: ✅ 완료
- **목적**: Magic Link Auth + 익명→인증 데이터 마이그레이션 (SessionLog/EvaluationResult/RewardLog userId 갱신 + RewardProgress 합산).
- **핫픽스 연동**: fed9769 PKCE verifier cookies 강제 (client.ts 명시적 cookies 어댑터).
"@ },
    @{ Id = "SP2_2"; Title = "[SubTask] Sprint 2 §2 — phonetic similarity (FR-C-001 진화)"; Parent = "FR-C-001"; Status = "Done"; Phase = "phase:p0"; Milestone = 2; Body = @"
## 🎯 Sub-task ID: SP2_2
- **상위 SRS task**: FR-C-001
- **Status**: ✅ 완료
- **목적**: Sprint 1 의 Gemini 텍스트 평가 제거 → 결정적 자모 비교 (의도 vs 실현). Web Speech API STT 보정으로 사라지던 발음 차이 정보 복원.
"@ },
    @{ Id = "SP2_4"; Title = "[SubTask] Sprint 2 §4 — 별 누적 fix + localStorage 권위"; Parent = "FR-C-009"; Status = "Done"; Phase = "phase:p0"; Milestone = 2; Body = @"
## 🎯 Sub-task ID: SP2_4
- **상위 SRS task**: FR-C-009 (보상 INSERT)
- **Status**: ✅ 완료
- **목적**: localStorage > cookie 권위 패턴. iOS Safari ITP 7일 cookie 한도 우회. ``anonymous_user_id`` 가 localStorage 와 cookie 양쪽 sync.
"@ },
    @{ Id = "SP3_1"; Title = "[SubTask] Sprint 3 §1 — 3축 점수 분리 (linguistic / acoustic 실 계산)"; Parent = "FR-C-001"; Status = "Done"; Phase = "phase:p0"; Milestone = 2; Body = @"
## 🎯 Sub-task ID: SP3_1
- **상위 SRS task**: FR-C-001
- **Status**: ✅ 완료
- **목적**: articulationScore 100% → articulation / linguistic / acoustic 3축 실 계산.
"@ },
    @{ Id = "SP3_2A"; Title = "[SubTask] Sprint 3 §2 A — Web Audio API 직접 측정 (⚠️ 차단)"; Parent = "FR-Q-001/FR-C-001"; Status = "blocked"; Phase = "phase:p0"; Milestone = 2; Body = @"
## 🎯 Sub-task ID: SP3_2A
- **상위 SRS task**: FR-Q-001 + FR-C-001
- **Status**: 🔴 **차단** — STT mic 충돌
- **차단 사유**: ``NEXT_PUBLIC_ENABLE_AUDIO_ANALYZER=false`` 핫픽스 (5aa39bd) 로 env 플래그 default off. Web Audio + SpeechRecognition 동시 점유 시 STT silent frame.

## 🔄 재설계 옵션 (대기 중)
- A. STT 종료 후 추가 발화 1회 (UX 부담)
- B. SpeechRecognition 포기 → Cloud STT API (비용)
- C. §2 A 영구 폐기 (텍스트 프록시만)

선택 후 본 issue 재진행.
"@ },
    @{ Id = "SP3_2B"; Title = "[SubTask] Sprint 3 §2 B — acousticFeatures JSONB 컬럼"; Parent = "DB-005"; Status = "Done"; Phase = "phase:p0"; Milestone = 2; Body = @"
## 🎯 Sub-task ID: SP3_2B
- **상위 SRS task**: DB-005
- **Status**: ✅ 완료
- **목적**: EvaluationResult 테이블에 acousticFeatures JSONB 컬럼 추가. Prisma JSON null 처리 ``?? undefined`` 패턴.
"@ },
    @{ Id = "SP3_2C"; Title = "[SubTask] Sprint 3 §2 C — linguistic + STT confidence 결합"; Parent = "FR-C-001"; Status = "Done"; Phase = "phase:p0"; Milestone = 2; Body = @"
## 🎯 Sub-task ID: SP3_2C
- **상위 SRS task**: FR-C-001
- **Status**: ✅ 완료
- **목적**: linguistic-score 다양화 — 음절 일치도 50% + STT confidence 50% 결합. 인식 환경 (잡음 / 깔끔) 차별화.
"@ },
    @{ Id = "SP3_2D"; Title = "[SubTask] Sprint 3 §2 D — 또래 백분위 보정 (보류)"; Parent = "FR-Q-002"; Status = "hold"; Phase = "phase:p1"; Milestone = 3; Body = @"
## 🎯 Sub-task ID: SP3_2D
- **상위 SRS task**: FR-Q-002
- **Status**: ⬜ **보류** — 데이터 부족
- **보류 사유**: 실 사용자 진단 N=50+ 누적 후 진입.
"@ },
    @{ Id = "SP3_2E"; Title = "[SubTask] Sprint 3 §2 E — Gemini rate limiter (in-memory)"; Parent = "SEC-004"; Status = "Done"; Phase = "phase:p0"; Milestone = 2; Body = @"
## 🎯 Sub-task ID: SP3_2E
- **상위 SRS task**: SEC-004
- **Status**: ✅ 완료
- **목적**: ``lib/ratelimit.ts`` sliding window in-memory Map. 글로벌 RPM 14 + 사용자 일 50회. Phase 2 Upstash Redis 교체 후보.
"@ },
    @{ Id = "SP3_3"; Title = "[SubTask] Sprint 3 §3 — Google OAuth (= API-010 §2) (🟠 진행 중)"; Parent = "API-010"; Status = "active"; Phase = "phase:p1"; Milestone = 2; Body = @"
## 🎯 Sub-task ID: SP3_3
- **상위 SRS task**: API-010
- **Status**: 🟠 **진행 중** — OAuth 401 차단
- **차단 사유**: Google OAuth 로그인 시 ``invalid_client`` 401. Supabase Provider 의 Client ID 가 일부 잘림 추정.

## ⏭️ 다음 액션
- ``client_secret_*.json`` 의 정확한 Client ID 를 Supabase Provider 에 재입력 후 검증.
"@ }
)

# 기존 issue 캐시
$existingIssues = gh issue list --repo $REPO --limit 200 --state all --json title | ConvertFrom-Json
$existingTitles = @{}
foreach ($issue in $existingIssues) {
    $existingTitles[$issue.title] = $true
}

$created = 0
$failed = 0
foreach ($task in $subtasks) {
    if ($existingTitles.ContainsKey($task.Title)) {
        Write-Host "skip (exists): $($task.Title)" -ForegroundColor DarkGray
        continue
    }

    $tempBody = New-TemporaryFile
    $task.Body | Out-File -FilePath $tempBody.FullName -Encoding UTF8 -NoNewline

    $labels = @($task.Phase, "sub-task", "mode:active")
    if ($task.Status -eq "blocked") { $labels += "blocked" }
    if ($task.Status -eq "hold") { $labels += "mode:hold" }
    $labelArg = $labels -join ","

    try {
        $url = gh issue create `
            --repo $REPO `
            --title $task.Title `
            --body-file $tempBody.FullName `
            --label $labelArg `
            --milestone $task.Milestone 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Host "FAIL: $($task.Title) — $url" -ForegroundColor Red
            $failed++
            if ($url -match "rate limit") {
                exit 1
            }
        } else {
            Write-Host "OK: $($task.Title)" -ForegroundColor Green
            $created++

            # Project 추가
            gh project item-add $PROJECT_NUM --owner $PROJECT_OWNER --url $url | Out-Null

            # 완료된 sub-task 는 close
            if ($task.Status -eq "Done") {
                $issueNum = ($url -split "/")[-1]
                gh issue close $issueNum --repo $REPO --comment "이미 완료된 sub-task — Sprint 진행 중 완료" | Out-Null
            }

            Start-Sleep -Milliseconds 500
        }
    } finally {
        Remove-Item $tempBody.FullName -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "=== Sub-task 결과 ===" -ForegroundColor Cyan
Write-Host "생성: $created / 실패: $failed" -ForegroundColor Green
