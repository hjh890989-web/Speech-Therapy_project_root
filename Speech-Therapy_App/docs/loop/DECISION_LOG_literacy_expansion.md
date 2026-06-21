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
