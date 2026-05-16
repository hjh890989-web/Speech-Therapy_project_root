# Bulk GitHub Issue creation script
#
# 88 TASK_*.md (SRS) + 14 Sprint sub-task = 102 issues 일괄 생성.
# GitHub Project #8 (Speech-Therapy) 에 자동 추가 + Status/Priority/Start/Target 필드 설정.
#
# AI 2.5x 압축 일정:
#  - Sprint 1 (closed): 2026-05-08~14
#  - Sprint 2~4:         2026-05-15~22
#  - P1:                 2026-05-23~06-12
#  - P2:                 2026-06-13~07-15
#
# 실행 전 확인:
#  1. gh auth status — github.com 로그인
#  2. Labels / Milestones 이미 생성됨
#  3. Project #8 존재 (PVT_kwHOEFoy7s4BX3FG)
#
# 사용:
#  PS> cd "c:\VS code_Workspace\Speech-Therapy_project_root"
#  PS> .\scripts\bulk_create_github_issues.ps1
#
# 중간에 rate limit 도달 시: 1시간 대기 후 재실행 (스크립트가 이미 생성된 issue 는 건너뜀).

$ErrorActionPreference = "Stop"

$REPO = "hjh890989-web/Speech-Therapy_project_root"
$PROJECT_NUM = 8
$PROJECT_OWNER = "hjh890989-web"

$TASKS_DIR = "Speech-Therapy_App\tasks"

# Milestone number → AI 압축 일정 매핑
$MilestoneMap = @{
    "1" = @{ Number = 1; Start = "2026-05-08"; Due = "2026-05-14"; Status = "Done" }
    "2" = @{ Number = 2; Start = "2026-05-15"; Due = "2026-05-22"; Status = "In progress" }
    "p1" = @{ Number = 3; Start = "2026-05-23"; Due = "2026-06-12"; Status = "Backlog" }
    "p2" = @{ Number = 4; Start = "2026-06-13"; Due = "2026-07-15"; Status = "Backlog" }
}

# Phase → Priority field option
$PriorityMap = @{
    "p0" = "P0"
    "p1" = "P1"
    "p2" = "P2"
}

# 이미 만들어진 issue 캐시 (재실행 시 skip)
Write-Host "기존 issue 조회 중..." -ForegroundColor Cyan
$existingIssues = gh issue list --repo $REPO --limit 200 --state all --json title | ConvertFrom-Json
$existingTitles = @{}
foreach ($issue in $existingIssues) {
    $existingTitles[$issue.title] = $true
}
Write-Host "기존 issue 수: $($existingTitles.Count)" -ForegroundColor Yellow

# TASK_*.md 파일별 issue 생성
$taskFiles = Get-ChildItem "$TASKS_DIR\TASK_*.md" | Sort-Object Name
$created = 0
$skipped = 0
$failed = 0

foreach ($file in $taskFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8

    # frontmatter 파싱
    if ($content -match '(?s)^---\r?\n(.*?)\r?\n---\r?\n(.*)$') {
        $frontmatter = $matches[1]
        $body = $matches[2]
    } else {
        Write-Host "skip (no frontmatter): $($file.Name)" -ForegroundColor Yellow
        $failed++
        continue
    }

    # title 추출
    if ($frontmatter -match "title:\s*[`"'](.+?)[`"']") {
        $title = $matches[1]
    } else {
        Write-Host "skip (no title): $($file.Name)" -ForegroundColor Yellow
        $failed++
        continue
    }

    # 이미 존재하면 skip
    if ($existingTitles.ContainsKey($title)) {
        Write-Host "skip (exists): $title" -ForegroundColor DarkGray
        $skipped++
        continue
    }

    # labels 추출
    if ($frontmatter -match "labels:\s*'(.+?)'") {
        $labelsRaw = $matches[1]
        $labels = $labelsRaw -split "," | ForEach-Object { $_.Trim() }
    } else {
        $labels = @()
    }

    # phase → milestone 결정
    $phaseLabel = $labels | Where-Object { $_ -like "phase:*" } | Select-Object -First 1
    $sprintLabel = $labels | Where-Object { $_ -like "sprint:*" } | Select-Object -First 1

    $milestoneKey = if ($sprintLabel -eq "sprint:1") { "1" }
                    elseif ($sprintLabel -eq "sprint:2") { "2" }
                    elseif ($phaseLabel -eq "phase:p0") { "2" }
                    elseif ($phaseLabel -eq "phase:p1") { "p1" }
                    elseif ($phaseLabel -eq "phase:p2") { "p2" }
                    else { "p1" }

    $milestoneInfo = $MilestoneMap[$milestoneKey]
    $milestoneNum = $milestoneInfo.Number

    # body 마무리 (References + 의존성)
    $taskFileName = $file.Name
    $bodyWithFooter = $body + @"


---

## 🔗 References
- 원본 TASK 명세: ``tasks/$taskFileName``
- 의존성 맵: ``tasks/03_Tasks_Breakdown_SRS_reinforce.md`` §9 / §10
- Gantt 차트: ``tasks/08_Project_Gantt_Chart_병렬_트랙.md``
- AI Harness: ``AGENTS.md`` + ``CLAUDE.md`` + ``.cursor/skills/``

## 📅 Milestone 일정 (AI 2.5x 압축)
- **Start**: $($milestoneInfo.Start)
- **Due**: $($milestoneInfo.Due)
- **초기 Status**: $($milestoneInfo.Status)
"@

    # 임시 body 파일
    $tempBody = New-TemporaryFile
    $bodyWithFooter | Out-File -FilePath $tempBody.FullName -Encoding UTF8 -NoNewline

    try {
        # 패치 (2026-05-16): gh issue create 의 --milestone title 매칭 버그 회피.
        # REST API 직접 호출 — milestone number 로 안전하게 지정.
        $labelArr = $labels | ForEach-Object { "labels[]=$_" }
        $labelArgs = @()
        foreach ($l in $labelArr) { $labelArgs += @("-f", $l) }

        $apiArgs = @(
            "api", "repos/$REPO/issues", "-X", "POST",
            "-f", "title=$title",
            "-f", "body=$(Get-Content $tempBody.FullName -Raw)",
            "-F", "milestone=$milestoneNum"
        ) + $labelArgs

        $response = & gh @apiArgs 2>&1
        $respJson = $response | ConvertFrom-Json -ErrorAction SilentlyContinue
        $issueNum = $respJson.number
        $url = $respJson.html_url

        if ($issueNum) {
            Write-Host "OK [#$issueNum, $milestoneKey]: $title" -ForegroundColor Green
            $created++

            # Project #8 에 추가
            gh project item-add $PROJECT_NUM --owner $PROJECT_OWNER --url $url | Out-Null

            # Sprint 1 (milestone 1) Done 자동 close
            if ($milestoneNum -eq 1) {
                gh issue close $issueNum --repo $REPO --comment "Sprint 1 완료 — 2026-05-08~14 진행 완료" | Out-Null
            }

            # rate limit 회피
            Start-Sleep -Milliseconds 500
        } else {
            Write-Host "FAIL: $title" -ForegroundColor Red
            Write-Host ($response | Out-String) -ForegroundColor Red
            $failed++
            if ($response -match "rate limit") {
                Write-Host "⚠️ Rate limit 도달 — 1시간 대기 후 재실행하세요." -ForegroundColor Red
                Remove-Item $tempBody.FullName -ErrorAction SilentlyContinue
                exit 1
            }
        }
    } catch {
        Write-Host "ERROR: $title — $_" -ForegroundColor Red
        $failed++
    } finally {
        Remove-Item $tempBody.FullName -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "=== 결과 ===" -ForegroundColor Cyan
Write-Host "생성: $created" -ForegroundColor Green
Write-Host "기존 skip: $skipped" -ForegroundColor Yellow
Write-Host "실패: $failed" -ForegroundColor Red
Write-Host ""
Write-Host "다음: Sprint sub-task 14개 별도 생성 (.\scripts\create_sprint_subtasks.ps1)" -ForegroundColor Cyan
