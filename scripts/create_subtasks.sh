#!/usr/bin/env bash
# Sprint sub-task 14건 issue 생성 (REST API)

set -uo pipefail

GH="/c/Program Files/GitHub CLI/gh.exe"
REPO="hjh890989-web/Speech-Therapy_project_root"

# 형식: ID|Title|Status|Phase|Milestone|Body
SUBTASKS=(
"SP1A|[SubTask] Sprint 1 §A — cushion 분리 (analyzeDiagnosis)|Done|p0|1|## 🎯 Sub-task ID: SP1A
- **상위 SRS task**: FR-C-001 (3축 스코어링)
- **Phase**: 🟢 P0 / **Status**: ✅ 완료
- **목적**: 결과 페이지 도착 시간 ~10초 단축 위해 cushion 생성을 별도 Server Action 분리.

## ✅ Acceptance Criteria
- [x] \`app/actions/cushion.ts\` 신규 — generateCushion()
- [x] analyzeDiagnosis() 에서 cushion 생성 제거
- [x] 결과 페이지의 \`<CushionAsync>\` Suspense 컴포넌트

## 🔁 의존성
- **선행**: FR-C-001
- **후속**: SP2_2, SP3_2E"

"SP1B|[SubTask] Sprint 1 §B — user upsert 병렬|Done|p0|1|## 🎯 Sub-task ID: SP1B
- **상위 SRS task**: API-001 / **Status**: ✅ 완료
- **목적**: 익명 사용자 처리 시 user upsert 를 SessionLog INSERT 와 병렬 수행."

"SP1C|[SubTask] Sprint 1 §C — Slack fire-and-forget|Done|p0|1|## 🎯 Sub-task ID: SP1C
- **상위 SRS task**: FR-C-002 / **Status**: ✅ 완료
- **목적**: HITL Slack webhook 호출 fire-and-forget 패턴 (D4 단순화)."

"SP2_3|[SubTask] Sprint 2 §3 — anonymous_user_id cookie 권위|Done|p0|2|## 🎯 Sub-task ID: SP2_3
- **상위 SRS task**: DB-002 / API-010 / **Status**: ✅ 완료
- **목적**: \`proxy.ts\` 가 cookie 부재 시 서버측 발급 (iOS Safari ITP 우회)."

"SP2_1|[SubTask] Sprint 2 §1 — 익명 cookie + Magic Link 마이그레이션 (= API-010 §1)|Done|p0|2|## 🎯 Sub-task ID: SP2_1
- **상위 SRS task**: API-010 / **Status**: ✅ 완료
- **목적**: Magic Link Auth + 익명→인증 데이터 마이그레이션 (SessionLog/EvaluationResult/RewardLog userId 갱신 + RewardProgress 합산).
- **핫픽스**: fed9769 PKCE verifier cookies 강제."

"SP2_2|[SubTask] Sprint 2 §2 — phonetic similarity (FR-C-001 진화)|Done|p0|2|## 🎯 Sub-task ID: SP2_2
- **상위 SRS task**: FR-C-001 / **Status**: ✅ 완료
- **목적**: Gemini 텍스트 평가 제거 → 결정적 자모 비교 (의도 vs 실현)."

"SP2_4|[SubTask] Sprint 2 §4 — 별 누적 fix + localStorage 권위|Done|p0|2|## 🎯 Sub-task ID: SP2_4
- **상위 SRS task**: FR-C-009 / **Status**: ✅ 완료
- **목적**: localStorage > cookie 권위 패턴 (iOS ITP 7일 한도 우회)."

"SP3_1|[SubTask] Sprint 3 §1 — 3축 점수 분리 (linguistic / acoustic 실 계산)|Done|p0|2|## 🎯 Sub-task ID: SP3_1
- **상위 SRS task**: FR-C-001 / **Status**: ✅ 완료
- **목적**: articulationScore 100% → 3축 실 계산."

"SP3_2A|[SubTask] Sprint 3 §2 A — Web Audio API 직접 측정 (⚠️ 차단)|blocked|p0|2|## 🎯 Sub-task ID: SP3_2A
- **상위 SRS task**: FR-Q-001 + FR-C-001
- **Status**: 🔴 **차단** — STT mic 충돌
- **차단 사유**: \`NEXT_PUBLIC_ENABLE_AUDIO_ANALYZER=false\` 핫픽스 (5aa39bd) — Web Audio + SpeechRecognition 동시 mic 점유 시 STT silent frame.

## 🔄 재설계 옵션
- A. STT 종료 후 추가 발화 1회 (UX 부담)
- B. SpeechRecognition 포기 → Cloud STT API (비용)
- C. §2 A 영구 폐기 (텍스트 프록시만)"

"SP3_2B|[SubTask] Sprint 3 §2 B — acousticFeatures JSONB 컬럼|Done|p0|2|## 🎯 Sub-task ID: SP3_2B
- **상위 SRS task**: DB-005 / **Status**: ✅ 완료
- **목적**: EvaluationResult.acousticFeatures JSONB 컬럼. Prisma JSON null \`?? undefined\` 패턴."

"SP3_2C|[SubTask] Sprint 3 §2 C — linguistic + STT confidence 결합|Done|p0|2|## 🎯 Sub-task ID: SP3_2C
- **상위 SRS task**: FR-C-001 / **Status**: ✅ 완료
- **목적**: linguistic-score = 음절 일치도 50% + STT confidence 50%."

"SP3_2D|[SubTask] Sprint 3 §2 D — 또래 백분위 보정 (보류)|hold|p1|3|## 🎯 Sub-task ID: SP3_2D
- **상위 SRS task**: FR-Q-002 / **Status**: ⬜ **보류**
- **보류 사유**: 실 사용자 진단 N=50+ 누적 후 진입."

"SP3_2E|[SubTask] Sprint 3 §2 E — Gemini rate limiter (in-memory)|Done|p0|2|## 🎯 Sub-task ID: SP3_2E
- **상위 SRS task**: SEC-004 / **Status**: ✅ 완료
- **목적**: \`lib/ratelimit.ts\` sliding window in-memory Map. 글로벌 RPM 14 + 사용자 일 50회."

"SP3_3|[SubTask] Sprint 3 §3 — Google OAuth (= API-010 §2) (🟠 진행 중)|active|p1|2|## 🎯 Sub-task ID: SP3_3
- **상위 SRS task**: API-010
- **Status**: 🟠 **진행 중** — OAuth 401 차단
- **차단 사유**: Google OAuth 시 \`invalid_client\` 401. Supabase Client ID 잘림 추정.

## ⏭️ 다음 액션
- \`client_secret_*.json\` 의 정확한 Client ID 를 Supabase Provider 에 재입력."
)

# 기존 issue 캐시
EXISTING=$("$GH" issue list --repo "$REPO" --limit 200 --state all --json title --jq '.[].title' 2>/dev/null)

CREATED=0
SKIPPED=0
FAILED=0

for ENTRY in "${SUBTASKS[@]}"; do
  IFS='|' read -r ID TITLE STATUS PHASE MS BODY <<< "$ENTRY"

  if echo "$EXISTING" | grep -Fxq "$TITLE"; then
    echo "skip: $TITLE"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  # 일정
  case "$MS" in
    1) START="2026-05-08"; DUE="2026-05-14" ;;
    2) START="2026-05-15"; DUE="2026-05-22" ;;
    3) START="2026-05-23"; DUE="2026-06-12" ;;
    4) START="2026-06-13"; DUE="2026-07-15" ;;
  esac

  FULL_BODY="${BODY}

---

## 📅 Milestone 일정 (AI 2.5x 압축)
- **Start**: ${START} / **Due**: ${DUE}
- 본 sub-task 는 03_Tasks_Breakdown_SRS_reinforce.md §10 의 정의 참조."

  # labels
  LABEL_ARGS=(-f "labels[]=phase:$PHASE" -f "labels[]=sub-task")
  case "$STATUS" in
    Done) LABEL_ARGS+=(-f "labels[]=mode:active") ;;
    blocked) LABEL_ARGS+=(-f "labels[]=blocked" -f "labels[]=mode:hold") ;;
    hold) LABEL_ARGS+=(-f "labels[]=mode:hold") ;;
    active) LABEL_ARGS+=(-f "labels[]=mode:active") ;;
  esac

  RESP=$("$GH" api "repos/$REPO/issues" -X POST \
    -f title="$TITLE" \
    -f body="$FULL_BODY" \
    -F milestone="$MS" \
    "${LABEL_ARGS[@]}" 2>&1)

  NUM=$(echo "$RESP" | python -c "import json,sys; print(json.load(sys.stdin).get('number',''))" 2>/dev/null)
  URL=$(echo "$RESP" | python -c "import json,sys; print(json.load(sys.stdin).get('html_url',''))" 2>/dev/null)

  if [ -n "$NUM" ] && [ "$NUM" != "None" ]; then
    echo "OK [#$NUM]: $TITLE"
    CREATED=$((CREATED+1))

    "$GH" project item-add 8 --owner hjh890989-web --url "$URL" >/dev/null 2>&1

    # Done 자동 close
    if [ "$STATUS" = "Done" ]; then
      "$GH" issue close "$NUM" --repo "$REPO" --comment "이미 완료 — Sprint 진행 중 완료" >/dev/null 2>&1
    fi

    sleep 0.5
  else
    echo "FAIL: $TITLE — $RESP" | head -1
    FAILED=$((FAILED+1))
  fi
done

echo ""
echo "=== Sub-task 결과 ==="
echo "생성: $CREATED / skip: $SKIPPED / 실패: $FAILED"
