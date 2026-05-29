# TASK_FR-Q-CL-05-1 — mission-content 6단계 타입 + 데이터 확장

## 요구사항 출처
- SRS §4.1 **REQ-FUNC-CL-05** (6단계 위계)
- wiki `clinical/concepts/조음장애` §난이도 위계
- 선행 결정: **TASK_FR-Q-CL-05-0** (D2 매핑표 / D3 재배치)

## 목표
[lib/mocks/mission-content.ts](../lib/mocks/mission-content.ts) 를 3단계 → 6단계 콘텐츠로 확장. 5 자모 × 6 단계 = **30 sets** (현 15 → 30).

## 신규 타입 (CL-05-0 D2 매핑 기준)
- `MissionPhonemeIsolation` (L1 단독 음소): `{ phoneme, mouthHint }` — 음소 소리 + 입모양 가이드
- `MissionSyllable` (L2 음절): `{ syllables: { text, reading }[] }` — 사·시·수
- `MissionWordSimple` (L3 단어): **기존 유지** (현 L1)
- `MissionPhrase` (L4 구): `{ phrase, focusWord, reading }` — 빨간 사과
- `MissionSentence` (L5 문장): **기존 유지** (현 L3)
- `MissionConversation` (L6 대화): `{ prompt, focusWord, turnHint }` — 턴테이킹 발화 유도

`MissionContentSet` union 을 6 레벨로 확장, `getMissionContent(phoneme, level)` 6 레벨 반환.

## Acceptance Criteria
- [ ] `MissionContentSet` union 이 difficultyLevel 1~6 모두 커버
- [ ] 5 자모(ㄱㄴㅅㅈㄹ) × 6 단계 = 30 sets, `getMissionContent` 30건 조회 가능
- [ ] CON-04 금칙어("치료"/"진단"/"장애") **0건** (mouthHint·prompt 포함 전수)
- [ ] 모든 콘텐츠 만 2~7세 발달 적합 (자녀 친화)
- [ ] 기존 L1 단어 / L3 문장 데이터는 신 L3 / L5 로 무손실 재배치

## 영향 범위
- 파일: [lib/mocks/mission-content.ts](../lib/mocks/mission-content.ts)
- 테스트: [__tests__/lib/mocks/mission-content.test.ts](../__tests__/lib/mocks/mission-content.test.ts) (30 sets 무결성 + 6단계 타입 + CON-04)

## 의존성
- 선행: **TASK_FR-Q-CL-05-0**
- 후속: TASK_FR-Q-CL-05-2 (컴포넌트가 본 타입 소비), TASK_FR-Q-CL-05-3 (라우팅)

## 위험
- mock 전용 — DB(MissionCard) 미연결 상태 유지 (FR-C-003 별도). 데이터 규모만 2배.

## 검증
- [ ] vitest mission-content.test 통과
- [ ] tsc 0 errors (신규 union 타입 정합)
