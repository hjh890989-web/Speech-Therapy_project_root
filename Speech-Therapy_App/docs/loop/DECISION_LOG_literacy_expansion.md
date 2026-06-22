# DECISION LOG — Literacy Clinical Expansion

> /goal `feat/literacy-clinical-expansion` — 외부 임상 wiki 근거 기반 아동 언어 **'연습(평가·판정 아님)'** 미니게임 3종.
> 큐(고정 순서): ① vocabulary → ② nonword-repetition → ③ narrative.
> 분류: **CORE**(아키텍처·데이터 모델·임상 안전 경계) / **MINOR**(네이밍·UI 디테일·콘텐츠 문구).
> 카운터는 grep 가능하도록 아래 별도 줄에 유지. CORE 3 도달 시 STOP REASON: CORE_BUDGET.

CORE: 0
MINOR: 12

## 큐 진행
- [x] ① vocabulary (어휘 — 집중적 자극/fast mapping, S070·S071) — tsc/test(8)/lint exit 0
- [x] ② nonword-repetition (음운 작업기억/비단어 따라말하기, S017·S022·S133) — tsc/test(7)/lint exit 0
- [x] ③ narrative (이야기문법·담화 7요소, S024·S102·S148) — tsc/test(8)/lint exit 0

## 결정 (Decisions)

### 2026-06-21 — 셋업
- (MINOR-1) 신규 게임 3종은 기존 literacy 패턴을 그대로 따른다: `lib/literacy/<game>-content.ts`(콘텐츠+근거 주석) · `lib/literacy/<game>.ts`(플래그·연령게이트·순수함수) · `app/(public)/literacy/<game>/page.tsx`(Server Component 게이트) · `.../<Game>Client.tsx`(가이드형 클라이언트) · `__tests__/lib/literacy/<game>.test.ts`. 참조 모범: `inference`, `phonological-awareness`.
- (MINOR-2) 연령 게이트는 /goal 명세대로 **만 2~7세(24~84개월)**. 기존 음운인식/추론(만 5~7세, 60~84)과 달리 어휘·작업기억·이야기 '놀이'는 더 어린 연령을 포함 — 신규 공통 상수 `CLINICAL_PLAY_AGE_MIN_MONTHS=24` 도입(게임별 재사용).
- (MINOR-3) 세 게임 모두 **연습 활동**(점수·등급·정상/위험 판정 미산출). `inference`/F15 '유도(elicitation)' 철학 + CON-04 금칙어("치료/진단/장애") 0 정책 계승. 영속/임상 연동은 본 /goal 범위 밖(KOPLAC 후).

### 2026-06-21 — ① vocabulary 완료
- (MINOR-4) 어휘 놀이 = 2단계 가이드형: **낱말 말하기(명명)** → **같은 것 찾기(범주 분류)**. 집중적 자극(노출·명명) + 범주화. 채점 없이 부모가 '다음'으로 진행.
- (MINOR-5) 콘텐츠 = 4범주(동물/음식/탈것/물건) × 6개 = 24개 자체 작성 고빈도 명사 + 이모지(검사 그림 미복제). 연령 하한 만 2세(24m) 공통 상수 `CLINICAL_PLAY_AGE_MIN_MONTHS` 도입.
- 산출: `lib/literacy/vocabulary{,-content}.ts` · `app/(public)/literacy/vocabulary/{page,VocabularyClient}.tsx` · `__tests__/lib/literacy/vocabulary.test.ts`. 플래그 `LITERACY_VOCAB_ENABLED`(default off). 게이트: tsc exit 0 · vitest 8 pass · eslint exit 0.

### 2026-06-21 — ② nonword-repetition 완료
- (MINOR-6) 부모 매개 **청각** 따라말하기: 부모가 무의미 음절열을 들려주고 아이가 따라 말함. '글자 가리기' 토글로 아이가 소리에만 의존하도록(작업기억 부하). 음절 길이 2→3→4→5 점증.
- (MINOR-7) 비단어 = 실재 단어 회피 위해 저빈도 음절 조합 자체 작성(길이별 5/5/4/3, 총 17). 표준화 비단어검사 문항 미복제.
- (MINOR-8) 연령 게이트는 `vocabulary.ts`의 `CLINICAL_PLAY_AGE_*` 상수 재사용(만 2~7세) — `inference`가 `phonological-awareness`의 연령 함수를 재사용한 선례와 동일(단일 진실원).
- 산출: `lib/literacy/nonword-repetition{,-content}.ts` · `app/(public)/literacy/nonword-repetition/{page,NonwordRepetitionClient}.tsx` · `__tests__/lib/literacy/nonword-repetition.test.ts`. 플래그 `LITERACY_NWR_ENABLED`(default off). 게이트: tsc exit 0 · vitest 7 pass · eslint exit 0.

### 2026-06-21 — ③ narrative 완료
- (MINOR-9) 이야기문법 7요소 거시구조(Stein & Glenn 계열): 배경·계기사건·내적반응·계획·시도·결과·반응. wiki 근거 S024·S102·S148(내적반응 산출이 고난도 — 스캐폴딩 질문으로 유도).
- (MINOR-10) 2단계 가이드형: **이야기 읽기**(7장면 정본 순서) → **다시 말하기**(7요소 스캐폴딩 질문 1개씩 + 부모용 장면 단서). 채점 없이 유도만.
- (MINOR-11) 자체 작성 이야기 3편(토끼와 당근/비 오는 날/함께 만든 성), 각 7장면 이모지+캡션. 표준화 담화검사 지문 미복제.
- (MINOR-12) `presentedScenes()` = 결정적 비-항등 회전 — 향후 '순서 잇기' 모드용 유틸(테스트 포함, 현 UI는 읽기+다시말하기 사용).
- 산출: `lib/literacy/narrative{,-content}.ts` · `app/(public)/literacy/narrative/{page,NarrativeClient}.tsx` · `__tests__/lib/literacy/narrative.test.ts`. 플래그 `LITERACY_NARRATIVE_ENABLED`(default off). 게이트: tsc exit 0 · vitest 8 pass · eslint exit 0.

### 2026-06-21 — 종료
- 최종 게이트(전체): `npx tsc --noEmit`(exit 0) · `npm test`(297 files / 3173 tests pass, exit 0) · `npm run lint`(exit 0) · `npm run build`(exit 0, `/literacy/{vocabulary,nonword-repetition,narrative}` 라우트 등록).
- 세 플래그 `LITERACY_VOCAB_ENABLED`/`LITERACY_NWR_ENABLED`/`LITERACY_NARRATIVE_ENABLED` 전부 default off 가드 확인.

STOP REASON: QUEUE_EMPTY

## 후속 (post-/goal) — 허브 연결

> /goal 종료 후, 8개 literacy 게임(신규 3 + 기존 5)이 어디에서도 링크되지 않아 직접 URL로만
> 접근 가능하던 문제 해결. 사용자 요청(작업 계속)에 따라 추가.

- `lib/literacy/registry.ts` — 8개 게임 카탈로그(slug·제목·이모지·소개·플래그). `enabledLiteracyGames()` = 플래그 on 게임만(미공개 콘텐츠 누출 없음).
- `app/(public)/literacy/page.tsx` — 허브. 활성 게임 카드 노출, 전부 off 면 '준비 중'. 발달 흐름 순(어휘→음운인식→작업기억→해독→RAN→유창성→추론→담화).
- `__tests__/lib/literacy/registry.test.ts` — 무결성/금칙어/플래그 필터.
- 게이트: tsc exit 0 · vitest 4 pass · eslint exit 0 · build exit 0(`/literacy` 라우트 등록).

## 후속 2 — 내비 진입점 + 4번째 게임 (사용자 요청)

- **내비 진입점**: `components/nav/MainNav.tsx` — `literacyEnabled` 옵션(=enabledLiteracyGames()>0) 추가. 활성 게임 있을 때만 부모/원장/관리자 메뉴에 "읽기·말 놀이"(/literacy) 노출(F15/F11 게이팅 동일, 회귀 0). 테스트 73 pass.
- **④ phono-rules (소리 변신 놀이)**: 음운변동 규칙 인식(연음·경음화·ㅎ탈락·비음화). wiki 근거 S003·S087·S162. 글자→자연스러운 소리 2지선다(채점 없이 유도). 자체 작성 8아이템. 레지스트리 9번째 등록. 플래그 `LITERACY_PHONO_RULES_ENABLED`(default off). tsc/test(11)/lint exit 0.

## 후속 3 — e2e

- `e2e/literacy.spec.ts` — 공개(무인증) Playwright spec. 플래그 off 기본 상태 회귀 가드: 허브 `/literacy` 빈 상태 + 신규 4게임(vocabulary·nonword-repetition·narrative·phono-rules) '준비 중' 휴면 + 면책 노출. 플래그 on 흐름은 서버 env 제어 필요 → 단위 테스트가 로직 커버.
- 검증: `npx playwright test e2e/literacy.spec.ts --project=chromium-desktop` → **5 passed** (webServer 자동 부팅). discovery 10 tests(데스크탑+모바일). 모바일/CI/prod(PLAYWRIGHT_BASE_URL)에서도 동일.

## 후속 4 — Phase 3b /goal 큐 (학령기 S2~S4 '연습' 게임, CR-2026-009)

> 기존 만2-7 게임이 84개월에 잘려 S0-S1만 커버 → 학령기(초1~6) 신규 게임 추가. **연습-only**(임상밴드 0건,
> Phase 2 검증). 자체 콘텐츠(저작권 §7). 영속은 `useSaveLiteracyResultOnce`→raw만. 고정 큐 4종.
> 베이스라인: ⓪ spelling(받아쓰기, S2) 커밋 완료 — 참조 템플릿.

- [x] **① read-rules (소리 규칙 읽기)** — 불일치형 음운규칙 해독(받아쓰기의 역: 낱말 보고 '바른 소리' 고르기). 5규칙(경음화·연음화·비음화·기식음화·구개음화)×5=25 자체 아이템. 난이도 위계 **잠정**(정렬용, 철자 S113 수치 미적용=읽기와 별개). 연령 84~119(초1~3, S2). 플래그 `LITERACY_READ_RULES_ENABLED`(off). registry 11번째. gate: tsc0 · vitest 19(read-rules 13 + registry 6) · eslint0.
- [x] **② reading-comprehension (글 읽고 답하기)** — 사실적 읽기이해(짧은 자체 지문 + 사실 확인 3지선다). 자체 창작 지문 3편 × 문항 3 = 9 카드(정답=지문에 직접 제시, look-back 권장). **시간압박 없는 자유 재시도**(SC 3초 타이머 미적용 — 속도 아닌 이해). 연령 108~131(초3~4, S3). 플래그 `LITERACY_COMPREHENSION_ENABLED`(off). registry 12번째. gate: tsc0 · vitest 18(comprehension 12 + registry 6) · eslint0.
- [x] **③ inference-reading (숨은 뜻 찾기)** — 추론 독해(지문 단서로 인물 마음·까닭·결과 유추, 정답이 지문에 직접 노출 X — 테스트로 가드). 자체 지문 3편 × 추론 문항 3 = 9 카드. 자유 재시도. 연령 132~144(초5~6, S4). **기존 `inference`(만5-7 가이드형)와 별개 슬러그/플래그** `LITERACY_INFERENCE_READING_ENABLED`(off). registry 13번째. gate: tsc0 · vitest 19(inference-reading 13 + registry 6) · eslint0.
