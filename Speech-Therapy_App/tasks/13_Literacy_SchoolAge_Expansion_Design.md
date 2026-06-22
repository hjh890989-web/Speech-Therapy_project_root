# 문해력 학령기 전면확장 설계서 — CR-2026-009 (만 2~12세)

> **목적**: CR-2026-007(읽기 발달 선행지표, **만 5~7세** 한정)을 **학령기까지 전면확장(만 2~12세)** 으로 확대하기 위한 정합 설계. 발음 제품의 3기둥(① 초기 짧은 확인 probe · ② 미션+미니게임 · ③ 주간리포트)을 문해력 도메인에 복제한다.
> **작성일**: 2026-06-22
> **결정 근거(사용자 세션 2026-06-22)**: ① 문해력 추가 = **전면 빌드** · ② 연령 범위 = **학령기까지 전면확장(만 2~12세)**. → CR-2026-007 §3 의 "쓰기·수학·읽기이해 고학년 = ⛔회피" 경계를 **본 CR 이 상향 대체**.
> **선행 자산**: [`11_Literacy_Constructs_Expansion_Design.md`](11_Literacy_Constructs_Expansion_Design.md)(CR-2026-007, 만5~7) · [`docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md) · [`docs/loop/DECISION_LOG_literacy_expansion.md`](../docs/loop/DECISION_LOG_literacy_expansion.md) · [`docs/clinical-consultation-packet_CL08-10_literacy.md`](../docs/clinical-consultation-packet_CL08-10_literacy.md)
> **외부 임상 근거**: `Speech_Therapy_Wiki/my-healthcare-workbase`(원문 `.ingest/txt` 우선, 요약↔원문 충돌 시 원문 진실).

---

## §1. 배경 — 왜 문해력은 발음보다 더 세분화해야 하는가

발음 발달은 만 7세경 대부분 완성 → 단일 타깃(만 2~7세)으로 성립. 반면 문해 구인은 **발달 순서 자체가 연령에 묶여** 한 연령에 한 구인이 대응한다(자소-음소 대응 전엔 해독 불가, 해독 자동화 전엔 유창성 불가). 따라서 문해력 진입은 **단일 검사가 아니라 연령으로 분기하는 라우터**여야 한다.

**핵심 관찰(코드 현실)**: 기존 미니게임 9종은 이미 암묵적 3단 연령게이트(만2~7 / 만5~7 / 만6~7)를 갖지만 **전부 만 7세(84개월)에서 잘려** 있다 — 앱 `childAgeMonths` 상한이 84이기 때문. 즉 현 구현은 사실상 **S0~S1(취학전~입문)만** 커버하고, 임상적으로 가장 가치 있는 **초저학년 해독/난독 선별창(S2)** 에서 정확히 잘려 있다.

---

## §2. 5단계 발달 사다리 (정본 모델)

읽기 밧줄 모델(Scarborough) + 단순관점모델(읽기이해 = 해독 × 언어이해) 기반. 구현 정본 = [`lib/literacy/stages.ts`](../lib/literacy/stages.ts).

| 단계 | 연령(월령) | 표시 라벨 | 핵심 구인 | 검증 근거(wiki, 원문대조) |
|---|---|---|---|---|
| **S0 발현적 문해** | 24~59 | 만 2~4세 | 어휘, 음절 음운인식, 인쇄물 개념, 듣기이해 | 음운인식 단어수준 4세 50%→5세 75% (S003 ✔) |
| **S1 읽기 입문** | 60~83 | 만 5~6세(취학전) | 음소 음운인식, 자소-음소 대응, 글자·단어 인지, RAN | 음소 6세 51%; NISE 만5~ (S003·S033 ✔) |
| **S2 해독·철자** | 84~107 | 초1~2 | 해독(음운규칙), 단어재인 자동화, 철자·받아쓰기 | 경음화 94%→구개음화 20%(초3) (S113·S160 ✔) |
| **S3 유창성·이해** | 108~131 | 초3~4 | 읽기유창성, 사실적 읽기이해 | 고학년 유창성 β=.522 (S090 ✔) |
| **S4 읽기로 배우기** | 132~144 | 초5~6 | 추론·평가 읽기이해, 형태소인식, 어휘 심화, 이야기쓰기 | Chall; 형태소 SLI 초4~6 (S114/S115) |

- 밴드는 24~144개월을 **단조·비중첩·연속** 분할(라우팅 결정성). 구인은 단계 전속이 아니며 경계 인접 구인은 게임 자체 연령게이트가 처리.
- 구현 현황: S0~S1 = 기존 9종 일부 충족 / S2~S4 = ❌(게임이 84개월에 잘려 '입문판'으로만 존재 → 학령기 신규 콘텐츠 필요).

---

## §3. 연령 도메인 분리 (CORE 결정)

발음 diagnose 의 84개월 상한을 **전역으로 올리지 않는다**. 대신 **literacy 전용 연령 도메인**을 분리한다.

- `lib/literacy/stages.ts`: `LITERACY_AGE_MIN_MONTHS=24`, `LITERACY_AGE_MAX_MONTHS=144` (만 2~12세) — 발음 상한(84)과 독립.
- **이유**: 발음 발달은 임상적으로 만 2~7세가 정당. 전역 상한을 144 로 올리면 발음 diagnose(규준·probe·peer-percentile 모두 ≤84 가정)에 의미 오염/회귀.

### 84개월 상한 blast radius (Phase 1b 집행 완료 — 2026-06-22)

**모델: 전 write/persist 경로는 144(만2~12) 허용, 발음 consumption 경로는 84 유지.**

| 위치 | 현재 | 결정 | 상태 |
|---|---|---|---|
| `lib/schemas/consent.ts` | max(84) | → **max(144)** (B2B 등록) | ✅ |
| `app/actions/onboarding-save-child-shape.ts` `CHILD_AGE_MAX_MONTHS` | 84 | → **144** (+ wizard 슬라이더·카피 follow) | ✅ |
| `app/actions/update-child-profile-shape.ts` `CHILD_AGE_MAX_MONTHS` | 84 | → **144** (+ ChildProfileForm 슬라이더·카피) | ✅ |
| `app/actions/student-bulk-import.ts` `computeAgeMonths` clamp | >84→84 | → **>144→144** (B2B bulk) | ✅ |
| `app/(public)/privacy/page.tsx` 데이터 항목 | 만24~84 | → **만24~144** (사실 정정) | ✅ |
| `lib/schemas/diagnosis.ts` | max(84) | **유지(84)** — 발음 diagnose 는 만2~7 (구인상 정당) | ✅ 회귀가드 |
| `lib/schemas/curriculum.ts` | max(84) | **유지(84)** — 발음 미션 커리큘럼(음소 enum) 전용, UI 미연결 | ✅ |
| `lib/peer-percentile.ts` clamp | min(84) | **유지** — 발음 규준 모델 ≤84. literacy 백분위는 별도 경로 | ✅ |
| `lib/diagnose/*` 게임 `*_AGE_MAX_MONTHS=84` | 발음 probe | **유지** — 발음 도메인 | — |
| `lib/literacy/*` 게임 `*_AGE_MAX_MONTHS=84` | 문해 게임 | 단계별 상향(S2~S4 콘텐츠와 함께, Phase 3) | ⏳ |

✅ **회귀 우려(프리필) 해소 확인**: diagnose 프리필은 이미 `>84 → null` 가드([diagnose/page.tsx](../app/(public)/diagnose/page.tsx)), DiagnosisForm 입력은 `min=24 max=84`로 제한, `diagnosis.ts`는 84 유지 → **>84 자녀가 등록돼도 발음 diagnose 크래시 없음**(graceful). 우려했던 하드 회귀는 실재하지 않음.

⏳ **Phase 3 런치 번들로 연기(문서화)**: ① 마케팅/법적 포지셔닝 카피(landing FAQ·terms "만 2~7세 발음 서비스") ② 온보딩 음소선택의 연령별 분기(만8+는 발음 음소 선택 불필요) ③ literacy 게임 연령상한 단계별 상향. — literacy 플래그 off 동안 prod 라이브 표면 없음 → 카피는 실제 런치와 동반 갱신.

---

## §4. 데이터 모델 (Phase 1c — 구현 완료, 마이그레이션 DB 적용 대기)

CR-2026-007 의 DB-LIT-01(EvaluationResult 컬럼 확장)은 **만5~7·발음 diagnose 결합** 전제였다. 학령기 전면확장에서는 **별도 stage-파라미터화 모델**이 더 깔끔하다(발음 EvaluationResult 와 결합 회피 + raw/HITL 불변). 구현 정본 = [`prisma/schema.prisma`](../prisma/schema.prisma) `LiteracyResult` + [`prisma/migrations/20260622120000_add_literacy_result`](../prisma/migrations/20260622120000_add_literacy_result/migration.sql).

```prisma
model LiteracyResult {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stage          String   // stages.ts LiteracyStageId "S0".."S4" — 게임 구인 단계(서버 파생)
  gameSlug       String   // registry LITERACY_GAMES 정합 — 구인 식별(별도 construct 컬럼 불요)
  rawScore       Float    // 원점수 — 보정 금지(display 레이어만)
  rawTotal       Float?
  childAgeMonths Int      // 만 2~12세 = 24~144
  referenceBand  String?  // display 전용. Phase 2 검증 통과 단계만 — 그 전 null(연습-only)
  createdAt      DateTime @default(now())
  @@index([userId, createdAt])
  @@index([stage, gameSlug])
}
```

- 설계 대비 변경: 별도 `construct` 컬럼 제거 — `gameSlug` 가 구인을 식별(registry 단일 진실원). `stage` 는 입력으로 받지 않고 서버가 registry 에서 파생(클라이언트 신뢰 X). RLS 3정책(select_own/insert_own/delete_admin, EvaluationResult 선례).
- **서버액션** [`app/actions/literacy-result.ts`](../app/actions/literacy-result.ts) `saveLiteracyResult`: 게이트 순서 = 입력검증 → 게임 플래그 ON → 연령도메인 → 인증 user(익명=ephemeral) → PIPA 동의 → INSERT(raw 그대로, referenceBand=null, withActor audit). 전부 graceful(throw 0). 스키마 [`lib/schemas/literacy-result.ts`](../lib/schemas/literacy-result.ts).
- **원칙**(project 규칙 [[project_clinical_adjustment_display_layer]]): rawScore 불변, 참고밴드는 display 레이어만. HITL/escalation 무관(별도 활동).
- **마이그레이션 적용**: DB 접속 필요 → 사용자 PowerShell `npx prisma migrate deploy`(DIRECT_URL). `prisma generate` 는 본 턴 실행 완료(client 타입 활성). 게임 영속 wiring(각 *Client 가 saveLiteracyResult 호출)은 Phase 3.

---

## §5. 임상 규준 게이트 (Phase 2 — 병행 workflow)

만 2~12 로 가면 학년별 **참고밴드**가 필요하나, wiki 조사상 리스크:
- NISE-B·ACT 원문(S033) = **2025 예비검사**(최종 규준 미발표).
- KOLPAC = 2016 기준 "제작 중".
- 학령기 핵심 출처 일부(S091·S163·S072·S070) = **요약본만** 존재.

→ [[feedback_external_wiki_source_priority]] 규칙: 정량치 wiring 전 **원문 대조 필수**. **검증 전까지 S2~S4 는 기존 철학대로 '연습(놀이)-only'(참고밴드 없음)**, 검증 통과분만 display 레이어에 additive 로 밴드 부착.

**Phase 2 workflow**(`literacy-schoolage-norm-verification`, 2026-06-22 실행) = S2~S4 구인별 학년 규준 원문 대조 + 검사 가용성 + 적대적 검증 → shippable 밴드표 산출. 결과로 `stages.ts` 의 `bandShippable` 단계별 플립.

### Phase 2 판정 결과 (2026-06-22 완료, 142 agents)

> **결론: 출시 가능한 모집단 참고밴드 0건.** 코퍼스 내 verified-original 정량치는 전부 연구표본 기술통계 / NISE 2025 **예비검사**(비표준화) / 임상대조군 수치 — 표준화 백분위가 아니다. ⇒ `stages.ts` 전 단계 `bandShippable=false` **유지 확정**(플립 없음).

| 단계·구인 | 판정 | 근거 |
|---|---|---|
| S2 해독·음운규칙 | **연습-only** | S113 = 철자(spelling) 지표로 해독 측정 = 구인 불일치 + 부산 연구표본(N=60), 초4-6 규준 부재 |
| S2 철자·받아쓰기 | **연습-only** | S113 verified지만 비표준화 연구표본, 백분위/컷오프 없음 |
| S3 읽기유창성 | **연습-only** | S033 초1-6 1분 정확음절수 verified이나 NISE **예비검사**(학년당 ~40-48명) — 정식규준 2026 표준화 후속 |
| S3 읽기이해 | **불가** | per-grade 모집단 규준 추출 불가, S090 라벨 내부충돌, S142는 임상대조 |
| S4 추론독해 | **불가** | S142 초4-6 pooled 임상연구(N=38), 학년분리 없음 |
| S4 형태소인식 | **연습-only** | S115 SLI 임상연구(군당 n=10), 4/5/6 pooled, 자작 비표준화 과제 |
| S4 어휘 | **불가** | verified 모집단 규준치 자체 부재 |

**검사 가용성:** NISE-B·ACT ❌(예비검사) · KOLRA ⚠️조건부(유일 학년층화 표준화 규준 published이나 **규준표 미확보** → 매뉴얼 확보 전 '검사 연계 의뢰' 안내만) · RA-RCP ❌ · KOPLAC ❌(제작중) · BASA-R ⚠️(5단계 백분위 라벨 골격만, 원점수 매핑은 지침서 필요) · QRW ❌(출간중).

**Phase 3 게이팅 결정:**
1. 모집단 "참고 밴드" wiring = **전면 보류**(검증 norm 0건).
2. 단, S033 유창성·S113 철자 학년 평균은 **'표준화 규준 아님 · 연구/예비검사 표본 평균' 라벨 + 백분위/판정 카피 0 + display 레이어 한정 + 플래그 off** 조건으로 *교육적 참고 컨텍스트*(밴드 아님)로만 노출 가능. (유창성은 "초4+ 천정효과" 주의 추가)
3. **밴드 출시 경로** = ① KOLRA/BASA-R 정식 매뉴얼 규준표 확보, 또는 ② NISE 2026 표준화 최종규준 발표. 그 전까지 S2~S4 = 연습-only.

> 전체 산출(구인별 verified/rejected norm·locator) = workflow output(`tasks/wg7xagxmw.output`).

---

## §6. 3기둥 매핑 + 시퀀싱

| 기둥 | 발음(기존) | 문해력 목표 | 단계 |
|---|---|---|---|
| ① 초기 짧은 확인 probe | diagnose 5분 | **stage 라우팅 진입**(`/literacy/start`) → (후속) 채점 probe + 참고밴드 | 1d(라우터 ✅) → 후속(채점) |
| ② 미션+미니게임 | MissionCard | 9종 + S2~S4 신규 + 미션 연동 + 영속 | 1c·3 |
| ③ 주간리포트 | weekly-aggregator | 문해력 축 통합 | 4 |

| Phase | 내용 | 방식 | 상태 |
|---|---|---|---|
| **0 정합** | 본 설계서(5단계·도메인분리·blast radius·데이터모델) | 문서 | ✅ 본 턴 |
| **1a 기반** | `lib/literacy/stages.ts` 정본 5단계 모델 + 테스트 | 인라인 | ✅ 본 턴 |
| **1d 라우팅** | registry stage 태깅 + `/literacy/start` 진입점 + 테스트 | 인라인 | ✅ |
| **1b 상한해제** | consent/onboarding/profile/bulk-import → 144 + 발음 consumption(diagnosis/curriculum/peer) 84 유지 + 회귀 테스트 | 인라인 | ✅ (§3 표) |
| **1c 영속** | `LiteracyResult` 모델 + 마이그레이션 + `saveLiteracyResult` 서버액션 + 테스트 | 인라인 | ✅ (migrate deploy 완료) |
| **2 임상검증** | 학령기 규준 원문대조 workflow | workflow | ✅ 완료(§5) |
| **3a 영속 wiring** | 기존 9게임 *Client → `useSaveLiteracyResultOnce` → `saveLiteracyResult` (childAgeMonths 서버조회로 리팩터) | 인라인 | ✅ |
| **3b 학령기 콘텐츠** | S2~S4 신규 게임/probe 콘텐츠 (검증 0건 → 밴드 없이 연습-only) — **첫 게임: S2 받아쓰기·철자** ✅ / 잔여 S2 해독심화·S3 유창성·이해·S4 추론·형태소 ⏳ | 인라인 | 🟡 진행 |
| **4 리포트** | 주간리포트 문해력 축(LiteracyResult 집계) | 인라인 | ⏳ |

**Phase 3a 영속 wiring 상세(2026-06-22)**: 공용 훅 [`lib/literacy/use-save-result.ts`](../lib/literacy/use-save-result.ts) `useSaveLiteracyResultOnce`(완료 시 1회 fire-and-forget, 실패해도 놀이 불방해, sentRef 가드). 액션 리팩터 = `childAgeMonths`를 클라 입력에서 제거하고 **인증 User 에서 서버 조회**(stage 와 함께 클라 신뢰 X). 게임별 rawScore 의미(gameSlug 로 해석):

| 게임 | 유형 | done | rawScore | rawTotal |
|---|---|---|---|---|
| phonological-awareness | 채점 | item===null | summary.correct | summary.total |
| decoding | 채점 | item===null | summary.correct | summary.total |
| ran | 채점(시간) | phase==="done" | elapsedMs | RAN_BOARD_SIZE |
| reading-fluency | 채점(시간) | phase==="done" | elapsedMs | passage.syllableCount |
| vocabulary·nonword-repetition·phono-rules·inference·narrative | 가이드(무채점) | 각 완료상태 | 1(완료=engagement) | null |

> 멀티라운드(inference·narrative)는 mount 당 첫 완료 1회만 영속(sentRef). 전부 플래그 off 라 prod dormant — 플래그 ON 시점부터 데이터 흐름. Phase 4(주간리포트)가 이 데이터를 집계.

---

## §7. 저작권·비의료 게이트 (CR-2026-007 §2 / ADR-18 계승 — 위반 금지)

① NISE-B·ACT 등 표준화 검사 **문항·지문·자극·단어목록·정답 미복제** · ② 앱을 해당 검사로 칭하거나 그 규준 주장 금지 · ③ 자체 콘텐츠·자체 척도 · ④ 비의료·진단 용어("학습장애/난독증") 미노출 · ⑤ CON-04 금칙어("치료/진단/장애") 0 · ⑥ 상업 출시 전 원본성 법률검토.

---

## §8. 본 턴 산출 (Phase 0 + 1a + 1d)

- `lib/literacy/stages.ts` — 5단계 정본 모델(연령 도메인 24~144 분리, bandShippable 게이트).
- `lib/literacy/registry.ts` — 게임별 `stage` 태깅 + `enabledGamesForStage` / `enabledGamesForAge`.
- `lib/literacy/start.ts` — `enabledGamesForAgeOrAll`(월령 유무 분기).
- `app/(public)/literacy/start/page.tsx` — stage 라우팅 진입점(연습-only, 플래그 off 시 휴면).
- 테스트: `__tests__/lib/literacy/{stages,start}.test.ts` + registry 테스트 확장.
- 게이트: tsc · vitest · lint · build exit 0.

---

**— End of CR-2026-009 Literacy School-Age Expansion Design, 2026-06-22 —**
