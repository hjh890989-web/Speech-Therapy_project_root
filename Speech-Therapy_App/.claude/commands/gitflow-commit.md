---
description: Git Flow 를 준수하는 커밋·푸시·드래프트 PR 자동화 프로세스
argument-hint: [선택: 커밋 목적 요약]
allowed-tools: Bash, Read, Grep, Glob
---

# Git Flow Commit Process


커밋 목적: **$ARGUMENTS**

아래 순서를 따르며, **파괴적 명령(force push, reset --hard 등) 은 사용자 확인 없이 실행하지 않는다.**

## 1. 변경사항 검토
```bash
git status
git diff
```
- 변경 내용을 카테고리별로 분류한다 (feat / fix / docs / refactor / test / chore).
- 서로 다른 목적의 변경이 섞여 있으면 분리 커밋을 계획한다.

## 2. 브랜치 확인 및 정렬
- 현재 브랜치가 변경 목적과 일치하는지 확인한다.
  - `feat/*`, `fix/*`, `release/*`, `doc/*`, `refactor/*` …
- 불일치하면 적절한 prefix 로 새 브랜치를 생성한다:
  ```bash
  git checkout -b feat/<short-description>
  ```
- **한 브랜치 = 한 목적**. 여러 모듈·여러 목적이 섞이면 브랜치를 나눈다.

## 3. 원자적 스테이징 (Atomic Commit)
```bash
git add -p
```
- 관련 없는 변경이 섞이지 않도록 hunk 단위로 선택한다.
- 컴파일 불가능한 중간 상태를 커밋하지 않는다.

## 4. Conventional Commit 스타일 메시지
- 형식: `[<category>] <message>` (예: `[feat] add user signup flow`)
- 본문에는 WHY 와 맥락을 적는다 (WHAT 은 diff 가 말해준다).
- 하나의 목적 = 하나의 커밋 (atomic commit).

## 5. 원격 저장소 푸시
```bash
git ls-remote  # 자격증명 확인
git push -u origin <branch>
```
- 자격증명이 없으면 사용자에게 알리고 멈춘다.

## 6. Draft PR 생성
```bash
gh pr create --draft --base main \
  --title "[<category>] <short title>" \
  --body "$(cat <<'EOF'
## Summary
- ...

## Test plan
- [ ] ...
EOF
)"
```

## 주의 사항
- `main` / `master` 로의 force push 는 절대 자동 수행하지 않는다.
- `--no-verify`, `--no-gpg-sign` 등 훅/서명 우회 플래그는 사용자가 명시적으로 요청한 경우에만 사용한다.
- 커밋이 이미 올라간 상태라면 amend 대신 **새 커밋**을 만든다.
