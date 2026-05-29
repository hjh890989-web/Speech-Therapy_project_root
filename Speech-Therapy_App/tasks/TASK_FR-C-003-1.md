# TASK_FR-C-003-1 — seed 6단계 확장 + 결정적 slug id

## 요구사항 출처
- 선행: **TASK_FR-C-003-0** (하이브리드 / 결정적 slug id / DDL 없음)
- 정합: REQ-FUNC-CL-05 6단계 위계, DB-006

## 목표
[prisma/seed.ts](../prisma/seed.ts) 의 `seedMissionCards()` 를 5→6단계로 확장하고, DB 카드 id 를 fixtures 와 동일한 **결정적 slug**(`mock-${slug}-${level}`)로 변경. schema 주석 정합.

## 작업
1. `seedMissionCards()`:
   - 난이도 `1..5` → `1..6`
   - titleByLevel → CL-05 6단계: 1 소리 내기 / 2 음절 따라하기 / 3 단어 따라하기 / 4 구 만들기 / 5 짧은 문장 만들기 / 6 대화 나누기
   - `id` 명시: `mock-${PHONEME_SLUG[phoneme]}-${level}` (lib/mocks/missions.ts 의 PHONEME_SLUG 와 동일 매핑). uuid default 미사용.
   - 멱등성: `findFirst({ where: { id } })` 또는 기존 (targetPhoneme, level) 체크 유지.
   - 월령 범위 계산은 기존 로직 유지(24 + (level-1)*12 등).
   - instructionText CON-04 금칙어 0건 유지.
2. [schema.prisma:217](../prisma/schema.prisma) MissionCard.difficultyLevel 주석 `1~5` → `1~6`.

## Acceptance Criteria
- [ ] seedMissionCards 가 5음소 × 6단계 = 30 카드 생성 (id = `mock-${slug}-${level}`)
- [ ] 타이틀이 CL-05 6단계 명칭과 일치
- [ ] id 가 lib/mocks/missions.ts 의 fixtures id 와 동일 (정합)
- [ ] CON-04 금칙어 0건
- [ ] schema 주석 1~6 갱신
- [ ] seed.ts tsc 컴파일 통과 (실행은 npm run db:seed — 별도 운영)

## 영향 범위
- 파일: [prisma/seed.ts](../prisma/seed.ts), [prisma/schema.prisma](../prisma/schema.prisma)(주석)
- 소비자 무변경 → **독립 green**(빌드/테스트 무영향, 데이터/주석만)

## 의존성
- 선행: FR-C-003-0 / 후속: FR-C-003-2(쿼리 레이어)

## 위험
- 기존 prod DB 에 uuid 카드가 이미 seed 됐다면, slug id 카드와 공존(중복) 가능 → 운영 시 기존 카드 정리 또는 신규 seed 만 적용 안내 필요(seed 멱등 체크가 id 기준이면 신규 30개 생성). 본 task 는 코드만, 운영 적용은 별도.

## 검증
- [ ] tsc 0 errors (기존 baseline 제외)
- [ ] next build 통과 (seed 는 빌드 비포함이나 import 정합 확인)
