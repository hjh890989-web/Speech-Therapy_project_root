#!/usr/bin/env bash
# SRS 88 TASK_*.md → GitHub Issue 일괄 생성 (REST API)
# milestone 은 number 로 지정 (gh issue create 의 title 매칭 버그 회피).

set -uo pipefail

GH="/c/Program Files/GitHub CLI/gh.exe"
REPO="hjh890989-web/Speech-Therapy_project_root"
TASKS_DIR="Speech-Therapy_App/tasks"

# Phase + Sprint label → milestone number
get_milestone() {
  local labels="$1"
  if [[ "$labels" == *"sprint:1"* ]]; then echo 1
  elif [[ "$labels" == *"sprint:2"* ]] || [[ "$labels" == *"phase:p0"* ]]; then echo 2
  elif [[ "$labels" == *"phase:p1"* ]]; then echo 3
  elif [[ "$labels" == *"phase:p2"* ]]; then echo 4
  else echo 3
  fi
}

# 기존 issue 캐시 (재실행 시 skip)
echo "기존 issue 캐시 로드..."
EXISTING_TITLES=$("$GH" issue list --repo "$REPO" --limit 200 --state all --json title --jq '.[].title' 2>/dev/null)

CREATED=0
SKIPPED=0
FAILED=0
TOTAL=88

for FILE in "$TASKS_DIR"/TASK_*.md; do
  # frontmatter 추출
  TITLE=$(awk -F'"' '/^title:/ {print $2; exit}' "$FILE")
  LABELS=$(awk -F"'" '/^labels:/ {print $2; exit}' "$FILE")

  if [ -z "$TITLE" ]; then
    echo "SKIP (no title): $FILE"
    FAILED=$((FAILED+1))
    continue
  fi

  # 이미 있으면 skip
  if echo "$EXISTING_TITLES" | grep -Fxq "$TITLE"; then
    echo "skip (exists): $TITLE"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  # body 추출 (frontmatter 제거)
  BODY=$(awk 'BEGIN{n=0} /^---$/{n++; if(n>=2){found=1; next}} found' "$FILE")

  # milestone 결정
  MS=$(get_milestone "$LABELS")

  # 일정
  case "$MS" in
    1) START="2026-05-08"; DUE="2026-05-14"; STATUS="Done" ;;
    2) START="2026-05-15"; DUE="2026-05-22"; STATUS="In progress" ;;
    3) START="2026-05-23"; DUE="2026-06-12"; STATUS="Backlog" ;;
    4) START="2026-06-13"; DUE="2026-07-15"; STATUS="Backlog" ;;
  esac

  TASK_FILE_BASENAME=$(basename "$FILE")

  # body footer 추가
  FULL_BODY="${BODY}

---

## 🔗 References
- 원본 TASK 명세: \`tasks/${TASK_FILE_BASENAME}\`
- 의존성 맵: \`tasks/03_Tasks_Breakdown_SRS_reinforce.md\` §9 / §10
- Gantt 차트: \`tasks/08_Project_Gantt_Chart_병렬_트랙.md\`
- AI Harness: \`AGENTS.md\` + \`CLAUDE.md\` + \`.cursor/skills/\`

## 📅 Milestone 일정 (AI 2.5x 압축)
- **Start**: ${START}
- **Due**: ${DUE}
- **초기 Status**: ${STATUS}"

  # labels array 구성
  LABEL_ARGS=()
  IFS=',' read -ra LBL_ARR <<< "$LABELS"
  for L in "${LBL_ARR[@]}"; do
    LBL=$(echo "$L" | sed 's/^ *//;s/ *$//')
    LABEL_ARGS+=(-f "labels[]=$LBL")
  done

  # REST API POST
  RESP=$("$GH" api "repos/$REPO/issues" -X POST \
    -f title="$TITLE" \
    -f body="$FULL_BODY" \
    -F milestone="$MS" \
    "${LABEL_ARGS[@]}" 2>&1)

  NUM=$(echo "$RESP" | python -c "import json,sys; print(json.load(sys.stdin).get('number',''))" 2>/dev/null)
  URL=$(echo "$RESP" | python -c "import json,sys; print(json.load(sys.stdin).get('html_url',''))" 2>/dev/null)

  if [ -n "$NUM" ] && [ "$NUM" != "None" ]; then
    echo "OK [#$NUM, MS:$MS]: $TITLE"
    CREATED=$((CREATED+1))

    # Project 추가
    "$GH" project item-add 8 --owner hjh890989-web --url "$URL" >/dev/null 2>&1

    # Sprint 1 자동 close
    if [ "$MS" = "1" ]; then
      "$GH" issue close "$NUM" --repo "$REPO" --comment "Sprint 1 완료 — 2026-05-08~14 진행 완료" >/dev/null 2>&1
    fi

    # rate limit 회피 — 짧은 대기
    sleep 0.5
  else
    echo "FAIL: $TITLE"
    echo "  $RESP" | head -1
    FAILED=$((FAILED+1))

    if echo "$RESP" | grep -q "rate limit"; then
      echo "⚠️ Rate limit 도달 — 중단. 1시간 후 재실행."
      break
    fi
  fi
done

echo ""
echo "=== 결과 ==="
echo "생성: $CREATED / skip: $SKIPPED / 실패: $FAILED / 총 $TOTAL"
