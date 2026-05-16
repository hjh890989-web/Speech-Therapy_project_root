#!/usr/bin/env bash
# Project #8 의 102 items 에 Priority / Start date / Target date 일괄 설정.
# Status 는 issue closed 여부로 GitHub 자동 동기화됨 (Done / Backlog).

set -uo pipefail

GH="/c/Program Files/GitHub CLI/gh.exe"
PROJECT_ID="PVT_kwHOEFoy7s4BX3FG"

FIELD_PRIORITY="PVTSSF_lAHOEFoy7s4BX3FGzhTBC44"
FIELD_START="PVTF_lAHOEFoy7s4BX3FGzhTBC5I"
FIELD_TARGET="PVTF_lAHOEFoy7s4BX3FGzhTBC5M"
FIELD_STATUS="PVTSSF_lAHOEFoy7s4BX3FGzhTBCv0"

P0_OPT="79628723"
P1_OPT="0a877460"
P2_OPT="da944a9c"

STATUS_BACKLOG="f75ad846"
STATUS_INPROGRESS="47fc9ee4"
STATUS_DONE="98236657"

ITEMS_JSON=$("$GH" project item-list 8 --owner hjh890989-web --limit 200 --format json 2>&1)

UPDATED=0
SKIPPED=0
TOTAL=$(echo "$ITEMS_JSON" | python -c "import json,sys; print(len(json.load(sys.stdin)['items']))")
echo "총 $TOTAL items"

# Python 으로 각 item parse → bash 에 전달
echo "$ITEMS_JSON" | python -c "
import json, sys
data = json.load(sys.stdin)
for item in data['items']:
    item_id = item.get('id', '')
    title = item.get('title', '')
    ms_title = (item.get('milestone') or {}).get('title', '')
    labels = item.get('labels', []) or []
    status = item.get('status', '')

    # milestone -> dates
    if 'Sprint 1' in ms_title:
        ms_num = 1; start = '2026-05-08'; due = '2026-05-14'
    elif 'Sprint 2~4' in ms_title:
        ms_num = 2; start = '2026-05-15'; due = '2026-05-22'
    elif 'P1' in ms_title:
        ms_num = 3; start = '2026-05-23'; due = '2026-06-12'
    elif 'P2' in ms_title:
        ms_num = 4; start = '2026-06-13'; due = '2026-07-15'
    else:
        ms_num = 0; start = ''; due = ''

    # priority
    pri = 'P1'
    for lbl in labels:
        if lbl == 'phase:p0': pri = 'P0'; break
        if lbl == 'phase:p1': pri = 'P1'; break
        if lbl == 'phase:p2': pri = 'P2'; break

    # blocked or active status override
    extra_status = ''
    if 'blocked' in labels:
        extra_status = 'In progress'
    elif status == 'Done':
        extra_status = ''  # 이미 자동 Done
    elif ms_num == 2:
        extra_status = 'In progress'  # Sprint 2~4 진행 중

    print(f'{item_id}|{ms_num}|{start}|{due}|{pri}|{extra_status}|{title[:60]}')
" > /tmp/items.csv

while IFS='|' read -r ITEM_ID MS_NUM START DUE PRI EXTRA_STATUS TITLE; do
  if [ -z "$ITEM_ID" ] || [ "$MS_NUM" = "0" ]; then
    echo "skip: $TITLE"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  # Priority
  case "$PRI" in
    P0) PRI_OPT="$P0_OPT" ;;
    P1) PRI_OPT="$P1_OPT" ;;
    P2) PRI_OPT="$P2_OPT" ;;
  esac

  "$GH" api graphql -f query="mutation { updateProjectV2ItemFieldValue(input: { projectId: \"$PROJECT_ID\", itemId: \"$ITEM_ID\", fieldId: \"$FIELD_PRIORITY\", value: { singleSelectOptionId: \"$PRI_OPT\" } }) { projectV2Item { id } } }" >/dev/null 2>&1

  # Start date
  "$GH" api graphql -f query="mutation { updateProjectV2ItemFieldValue(input: { projectId: \"$PROJECT_ID\", itemId: \"$ITEM_ID\", fieldId: \"$FIELD_START\", value: { date: \"$START\" } }) { projectV2Item { id } } }" >/dev/null 2>&1

  # Target date
  "$GH" api graphql -f query="mutation { updateProjectV2ItemFieldValue(input: { projectId: \"$PROJECT_ID\", itemId: \"$ITEM_ID\", fieldId: \"$FIELD_TARGET\", value: { date: \"$DUE\" } }) { projectV2Item { id } } }" >/dev/null 2>&1

  # Status override (선택적 — 자동 Done 제외)
  if [ "$EXTRA_STATUS" = "In progress" ]; then
    "$GH" api graphql -f query="mutation { updateProjectV2ItemFieldValue(input: { projectId: \"$PROJECT_ID\", itemId: \"$ITEM_ID\", fieldId: \"$FIELD_STATUS\", value: { singleSelectOptionId: \"$STATUS_INPROGRESS\" } }) { projectV2Item { id } } }" >/dev/null 2>&1
  fi

  UPDATED=$((UPDATED+1))
  if [ $((UPDATED % 10)) -eq 0 ]; then
    echo "진행: $UPDATED / $TOTAL"
  fi
  sleep 0.2
done < /tmp/items.csv

echo ""
echo "=== 결과 ==="
echo "필드 설정 완료: $UPDATED / skip: $SKIPPED / 총 $TOTAL"
