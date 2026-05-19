#!/usr/bin/env bash
# 로드맵 감사 결과 (2026-05-18) 의 결함 1, 2 수정:
#   - 결함 1: P2 17개 일정 6/13-7/15 → Gantt §6 의 10/1+ 로 재배치
#   - 결함 2: P1 49개 동일 시작일 → Gantt §5 의 5 트랙 + 의존성 기반 차별 일정
#
# 변경 대상:
#   - 모든 P1 task (49 SRS + 2 sub-task)
#   - 모든 P2 task (17)
#
# 변경 미적용:
#   - Sprint 1 (5/8-5/14, 14 SRS + 3 sub-task) — 이미 Done, 일정 유지
#   - Sprint 2~4 P0 (5/15-5/22, 7 SRS + 9 sub-task) — 진행 중 / 차단 / 완료, 일정 유지
#
# 본 스크립트는 idempotent — 재실행 안전 (이미 같은 값이면 변화 없음).

set -uo pipefail

GH="/c/Program Files/GitHub CLI/gh.exe"
PROJECT_ID="PVT_kwHOEFoy7s4BX3FG"
FIELD_START="PVTF_lAHOEFoy7s4BX3FGzhTBC5I"
FIELD_TARGET="PVTF_lAHOEFoy7s4BX3FGzhTBC5M"

ITEMS_JSON=$("$GH" project item-list 8 --owner hjh890989-web --limit 200 --format json 2>&1)

# Python 으로 task ID 별 일정 매핑 + item ID 매칭 → CSV 출력.
echo "$ITEMS_JSON" | python -c "
import json, sys, re

SCHEDULE = $(cat <<'PYDICT'
{
    'DB-007':  ('2026-06-05', '2026-06-07'),
    'DB-009':  ('2026-06-05', '2026-06-07'),
    'DB-011':  ('2026-06-08', '2026-06-12'),
    'API-010': ('2026-06-05', '2026-06-11'),
    'API-002': ('2026-06-12', '2026-06-14'),
    'API-003': ('2026-06-12', '2026-06-14'),
    'API-005': ('2026-06-12', '2026-06-16'),
    'API-006': ('2026-06-12', '2026-06-16'),
    'FR-Q-013': ('2026-06-05', '2026-06-09'),
    'FR-Q-004': ('2026-06-12', '2026-06-14'),
    'FR-Q-003': ('2026-06-15', '2026-06-19'),
    'FR-Q-005': ('2026-06-15', '2026-06-19'),
    'FR-Q-008': ('2026-06-17', '2026-06-19'),
    'FR-Q-006': ('2026-06-20', '2026-06-22'),
    'FR-Q-007': ('2026-06-20', '2026-06-22'),
    'FR-Q-012': ('2026-06-20', '2026-06-24'),
    'FR-Q-014': ('2026-08-01', '2026-08-05'),
    'FR-C-010': ('2026-06-08', '2026-06-10'),
    'FR-C-014': ('2026-06-08', '2026-06-12'),
    'FR-C-007': ('2026-06-10', '2026-06-12'),
    'FR-C-005': ('2026-06-12', '2026-06-14'),
    'FR-C-008': ('2026-06-15', '2026-06-19'),
    'FR-C-011': ('2026-06-15', '2026-06-21'),
    'FR-C-002': ('2026-06-17', '2026-06-19'),
    'FR-C-013': ('2026-06-17', '2026-06-21'),
    'FR-C-006': ('2026-06-20', '2026-06-22'),
    'FR-C-012': ('2026-07-15', '2026-07-17'),
    'INFRA-002': ('2026-06-05', '2026-06-07'),
    'INFRA-003': ('2026-06-05', '2026-06-09'),
    'INFRA-005': ('2026-06-05', '2026-06-07'),
    'MON-004':   ('2026-06-05', '2026-06-12'),
    'TEST-003':  ('2026-06-05', '2026-06-07'),
    'TEST-002':  ('2026-06-05', '2026-06-06'),
    'MON-001':   ('2026-06-08', '2026-06-12'),
    'MON-002':   ('2026-06-08', '2026-06-12'),
    'MON-003':   ('2026-06-08', '2026-06-14'),
    'SEC-002':   ('2026-06-12', '2026-06-16'),
    'TEST-005':  ('2026-06-15', '2026-06-17'),
    'TEST-007':  ('2026-06-20', '2026-06-22'),
    'OPS-001':   ('2026-06-20', '2026-06-24'),
    'TEST-006':  ('2026-06-22', '2026-06-24'),
    'TEST-010':  ('2026-06-22', '2026-06-24'),
    'TEST-014':  ('2026-06-22', '2026-06-26'),
    'TEST-011':  ('2026-07-18', '2026-07-20'),
    'SEC-001':   ('2026-08-01', '2026-08-03'),
    'PERF-001':  ('2026-08-15', '2026-08-21'),
    'PERF-002':  ('2026-08-15', '2026-08-21'),
    'TEST-008':  ('2026-08-22', '2026-08-25'),
    'Sprint 3 §2 D': ('2026-08-01', '2026-08-04'),
    'Sprint 3 §3':    ('2026-05-23', '2026-05-27'),
    'DB-003':   ('2026-10-01', '2026-10-05'),
    'DB-010':   ('2026-10-06', '2026-10-08'),
    'API-007':  ('2026-10-06', '2026-10-10'),
    'FR-Q-010': ('2026-10-06', '2026-10-08'),
    'FR-C-016': ('2026-10-06', '2026-10-10'),
    'API-012':  ('2026-10-06', '2026-10-12'),
    'API-008':  ('2026-10-09', '2026-10-13'),
    'TEST-012': ('2026-10-11', '2026-10-13'),
    'FR-Q-009': ('2026-10-11', '2026-10-15'),
    'FR-C-017': ('2026-10-13', '2026-10-17'),
    'FR-C-018': ('2026-10-14', '2026-10-18'),
    'FR-Q-011': ('2026-10-16', '2026-10-20'),
    'SEC-003':  ('2026-10-19', '2026-10-21'),
    'API-009':  ('2026-12-01', '2026-12-07'),
    'INFRA-004':('2026-12-08', '2026-12-12'),
    'FR-C-015': ('2026-12-12', '2026-12-25'),
    'TEST-013': ('2026-12-26', '2027-01-01'),
}
PYDICT
)

data = json.load(sys.stdin)
matched = 0
unmatched_titles = []
for item in data['items']:
    item_id = item.get('id', '')
    title = item.get('content', {}).get('title', '')
    found = None
    for key in SCHEDULE.keys():
        # 매칭 패턴
        if key.startswith('Sprint'):
            # Sub-task — title 안에 'Sprint X §Y' 포함 확인
            if key in title:
                found = key
                break
        else:
            # SRS task — '[X] KEY:' 또는 ' KEY:' 또는 ' KEY ' 매칭
            pattern = rf'\b{re.escape(key)}\b'
            if re.search(pattern, title):
                found = key
                break
    if found:
        start, target = SCHEDULE[found]
        print(f'{item_id}|{start}|{target}|{found}')
        matched += 1
    else:
        unmatched_titles.append(title[:80])

print(f'STATS:matched={matched} unmatched={len(unmatched_titles)}', file=sys.stderr)
for t in unmatched_titles:
    print(f'  UNMATCHED: {t}', file=sys.stderr)
" > /tmp/reschedule.csv 2> /tmp/reschedule.stats

cat /tmp/reschedule.stats

UPDATED=0
TOTAL=$(wc -l < /tmp/reschedule.csv)
echo ""
echo "재계산 대상: $TOTAL"

while IFS='|' read -r ITEM_ID START TARGET TASK_KEY; do
  if [ -z "$ITEM_ID" ]; then continue; fi
  "$GH" api graphql -f query="mutation { updateProjectV2ItemFieldValue(input: { projectId: \"$PROJECT_ID\", itemId: \"$ITEM_ID\", fieldId: \"$FIELD_START\", value: { date: \"$START\" } }) { projectV2Item { id } } }" >/dev/null 2>&1
  "$GH" api graphql -f query="mutation { updateProjectV2ItemFieldValue(input: { projectId: \"$PROJECT_ID\", itemId: \"$ITEM_ID\", fieldId: \"$FIELD_TARGET\", value: { date: \"$TARGET\" } }) { projectV2Item { id } } }" >/dev/null 2>&1
  UPDATED=$((UPDATED+1))
  if [ $((UPDATED % 10)) -eq 0 ]; then
    echo "진행: $UPDATED / $TOTAL"
  fi
  sleep 0.1
done < /tmp/reschedule.csv

echo ""
echo "=== 결과: $UPDATED items 일정 업데이트 완료 ==="
