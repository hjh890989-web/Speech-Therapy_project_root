# GitHub Project #8 일괄 셋업 가이드

본 디렉터리의 PowerShell 스크립트로 Speech-Therapy 의 모든 task 를 GitHub Issue + Project 로 일괄 등록.

## 사전 완료 (이미 처리됨)

- ✅ gh CLI 설치 + 인증 (`hjh890989-web` 계정)
- ✅ Repo: `hjh890989-web/Speech-Therapy_project_root` (public, main branch)
- ✅ Project #8 "Speech-Therapy" — `PVT_kwHOEFoy7s4BX3FG`
- ✅ Labels 25개 생성 (phase / mode / domain / sprint + 보조)
- ✅ Milestones 4개 생성 (AI 2.5x 압축 일정)

## 실행 순서 (PowerShell)

작업 디렉터리: `c:\VS code_Workspace\Speech-Therapy_project_root`

```powershell
cd "c:\VS code_Workspace\Speech-Therapy_project_root"
```

### Step 1. SRS 88 task → Issue 일괄 생성 + Project 추가

```powershell
.\scripts\bulk_create_github_issues.ps1
```

- 88 TASK_*.md 파싱 → 88 issues 생성
- Project #8 자동 추가
- 기존 issue 는 skip (재실행 안전)
- 도중 rate limit 시 자동 중단 → 1시간 후 재실행

### Step 2. Sprint sub-task 14개 → Issue 추가

```powershell
.\scripts\create_sprint_subtasks.ps1
```

- §10.1 의 SP1A/B/C, SP2_1~4, SP3_1, SP3_2 A~E, SP3_3 = 14 issues
- 완료된 sub-task 는 자동 close
- 차단 (SP3_2A) / 진행 중 (SP3_3) 상태 label 자동 추가

### Step 3. Project 필드값 설정 (Status / Priority / Start / Target)

```powershell
.\scripts\set_project_fields.ps1
```

- 모든 102 item 에 Status / Priority / Start date / Target date 일괄 설정
- Roadmap view 가로 막대 표시에 필수

### Step 4. Roadmap View 생성 (GitHub Project UI — 1회 수동)

브라우저: https://github.com/users/hjh890989-web/projects/8

1. 좌측 상단 **"+ New view"** 클릭
2. **"Roadmap"** 선택
3. View name: "Roadmap (AI 2.5x 압축)"
4. 우측 상단 **⚙️ Settings** → 필드 매핑:
   - **Date fields**: Start date (시작), Target date (종료)
   - **Group by**: Priority (P0/P1/P2 별 가로 줄)
   - **Slice by**: domain (DB / API / FR-Q / FR-C / TEST / INFRA / etc.)
   - **Zoom**: Month
5. **Save changes**

→ 본 보고서의 [§08 간트 차트](../Speech-Therapy_App/tasks/08_Project_Gantt_Chart_병렬_트랙.md) 와 동일한 형태의 Roadmap 표시됨.

## Rate limit 발생 시

GitHub 의 secondary rate limit 도달 시 (HTTP 403):

- **Primary rate limit**: 5000 calls / 1 hour reset
- **Secondary rate limit**: 짧은 시간 내 다수 content creation 시 abuse 방지로 차단. 보통 **1시간** 대기 후 자동 해제.

대기 후 같은 스크립트 재실행 — 스크립트가 이미 생성된 issue 는 skip.

## 검증

전체 셋업 완료 후:

```powershell
# Issue 수 확인
gh issue list --repo hjh890989-web/Speech-Therapy_project_root --limit 200 --state all | Measure-Object | % Count

# Project item 수
gh project item-list 8 --owner hjh890989-web --limit 200 --format json | ConvertFrom-Json | % { $_.items.Count }

# Milestone 별 issue 수
gh issue list --repo hjh890989-web/Speech-Therapy_project_root --milestone "Sprint 1 (완료) — 1주차 코어 8" --state all --limit 200 | Measure-Object | % Count
```

예상 수치:
- 전체 issue: 102 (88 SRS + 14 sub-task)
- Project item: 102
- Sprint 1: 8~11 (P0 코어 중 sprint:1 labeled)
- Sprint 2~4: 25~35
- P1: 약 50
- P2: 약 25

## AI 2.5x 압축 일정 요약

| Milestone | 기간 | 원본 | 압축 |
|---|---|---|---|
| Sprint 1 (closed) | 2026-05-08 ~ 14 | 1주 | 동일 (완료) |
| Sprint 2~4 | 2026-05-15 ~ 22 | 3주 | **1주** |
| P1 (리텐션) | 2026-05-23 ~ 06-12 | 2~4개월 | **3주** |
| P2 (B2B) | 2026-06-13 ~ 07-15 | 5개월+ | **4~5주** |
| **합계** | — | 5~6개월 | **2개월** |

목표 종료: **2026-07-15**
