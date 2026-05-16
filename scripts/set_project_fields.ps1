# Project #8 의 모든 item 에 Status / Priority / Start date / Target date 필드값 설정.
#
# Roadmap view 가 가로 막대로 표시되려면 Start date + Target date 필수.
#
# 실행 전 확인:
#  - bulk_create_github_issues.ps1 + create_sprint_subtasks.ps1 완료됨 (issue 102개 + project 추가됨)

$ErrorActionPreference = "Stop"
$PROJECT_ID = "PVT_kwHOEFoy7s4BX3FG"

# Field IDs
$FieldStatus       = "PVTSSF_lAHOEFoy7s4BX3FGzhTBCv0"
$FieldPriority     = "PVTSSF_lAHOEFoy7s4BX3FGzhTBC44"
$FieldSize         = "PVTSSF_lAHOEFoy7s4BX3FGzhTBC48"
$FieldEstimate     = "PVTF_lAHOEFoy7s4BX3FGzhTBC5A"
$FieldStartDate    = "PVTF_lAHOEFoy7s4BX3FGzhTBC5I"
$FieldTargetDate   = "PVTF_lAHOEFoy7s4BX3FGzhTBC5M"

# Single-select option IDs
$StatusBacklog     = "f75ad846"
$StatusInProgress  = "47fc9ee4"
$StatusDone        = "98236657"
$PriorityP0        = "79628723"
$PriorityP1        = "0a877460"
$PriorityP2        = "da944a9c"
$SizeS             = "9592a5a3"
$SizeM             = "9728cbdc"
$SizeL             = "c53df028"

# Milestone → 일정 매핑
$MilestoneSchedule = @{
    1 = @{ Start = "2026-05-08"; Due = "2026-05-14"; Status = $StatusDone }
    2 = @{ Start = "2026-05-15"; Due = "2026-05-22"; Status = $StatusBacklog }
    3 = @{ Start = "2026-05-23"; Due = "2026-06-12"; Status = $StatusBacklog }
    4 = @{ Start = "2026-06-13"; Due = "2026-07-15"; Status = $StatusBacklog }
}

# Project item 모두 가져오기
Write-Host "Project items 조회 중..." -ForegroundColor Cyan
$itemsJson = gh project item-list 8 --owner hjh890989-web --limit 200 --format json | ConvertFrom-Json
Write-Host "총 $($itemsJson.items.Count) 개 item 발견" -ForegroundColor Yellow

# 각 item 의 label / milestone 정보로 필드값 매핑
$updated = 0
foreach ($item in $itemsJson.items) {
    if ($item.content.type -ne "Issue") { continue }

    $itemId = $item.id
    $title = $item.content.title

    # labels 에서 phase 추출
    $phase = $null
    foreach ($lbl in $item.labels) {
        if ($lbl -like "phase:*") { $phase = $lbl -replace "phase:", ""; break }
    }
    # milestone 번호
    $milestoneNum = $item.milestone.number

    if (-not $milestoneNum) {
        Write-Host "skip (no milestone): $title" -ForegroundColor DarkGray
        continue
    }

    $sched = $MilestoneSchedule[[int]$milestoneNum]

    # Priority 결정
    $priorityValue = switch ($phase) {
        "p0" { $PriorityP0 }
        "p1" { $PriorityP1 }
        "p2" { $PriorityP2 }
        default { $PriorityP1 }
    }

    # Status 결정 (issue 가 closed 인지)
    $statusValue = if ($item.content.state -eq "CLOSED") { $StatusDone } else { $sched.Status }

    # GraphQL mutation 으로 필드 설정 (4건: Status, Priority, Start, Target)
    Write-Host "set fields: $title" -ForegroundColor Green

    # Status
    gh api graphql -f query=@'
mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){
  updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){projectV2Item{id}}
}
'@ -f p=$PROJECT_ID -f i=$itemId -f f=$FieldStatus -f o=$statusValue 2>&1 | Out-Null

    # Priority
    gh api graphql -f query=@'
mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){
  updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){projectV2Item{id}}
}
'@ -f p=$PROJECT_ID -f i=$itemId -f f=$FieldPriority -f o=$priorityValue 2>&1 | Out-Null

    # Start date
    gh api graphql -f query=@'
mutation($p:ID!,$i:ID!,$f:ID!,$d:Date!){
  updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{date:$d}}){projectV2Item{id}}
}
'@ -f p=$PROJECT_ID -f i=$itemId -f f=$FieldStartDate -f d=$sched.Start 2>&1 | Out-Null

    # Target date
    gh api graphql -f query=@'
mutation($p:ID!,$i:ID!,$f:ID!,$d:Date!){
  updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{date:$d}}){projectV2Item{id}}
}
'@ -f p=$PROJECT_ID -f i=$itemId -f f=$FieldTargetDate -f d=$sched.Due 2>&1 | Out-Null

    $updated++
    # rate limit 회피
    Start-Sleep -Milliseconds 300
}

Write-Host ""
Write-Host "=== 결과 ===" -ForegroundColor Cyan
Write-Host "필드 설정 완료: $updated 개 item" -ForegroundColor Green
Write-Host ""
Write-Host "다음 단계: GitHub Project #8 페이지에서 Roadmap view 생성 (UI 작업)" -ForegroundColor Cyan
Write-Host "https://github.com/users/hjh890989-web/projects/8" -ForegroundColor Yellow
