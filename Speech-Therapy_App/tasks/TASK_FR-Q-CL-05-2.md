# TASK_FR-Q-CL-05-2 — 신규 단계 콘텐츠 컴포넌트 4종

## 요구사항 출처
- SRS §4.1 **REQ-FUNC-CL-05** (6단계 위계)
- wiki `clinical/concepts/조음장애` §난이도 위계
- 선행: **TASK_FR-Q-CL-05-1** (콘텐츠 타입)

## 목표
6단계 중 신규 4단계의 콘텐츠 컴포넌트 작성. 기존 [MissionWordRepeat](../components/missions/MissionWordRepeat.tsx) / [MissionSentenceBuild](../components/missions/MissionSentenceBuild.tsx) 패턴(카드 progression + onComplete + done UI + `data-testid`) 일관 적용.

## 신규 컴포넌트
| 컴포넌트 | level | 책임 |
|---|---|---|
| `MissionPhonemeIsolation` | L1 | 음소 1개 소리 내기 + 입모양 힌트 + done |
| `MissionSyllable` | L2 | 음절 카드 progression (사·시·수) + done |
| `MissionPhrase` | L4 | 짧은 구 + focusWord 강조 + reading + done |
| `MissionConversation` | L6 | 턴테이킹 prompt + turnHint + done |

## Acceptance Criteria
- [ ] 4 컴포넌트 각각: 카드 progression + 진행률(N/총) + `onComplete` 1회 호출 + done UI
- [ ] 빈 배열/빈 데이터 → 안내 메시지 + crash 없음 (기존 패턴 동일)
- [ ] `data-testid` 명명 규칙 일관 (`mission-<kind>` / `-text` / `-progress` / `-next` / `-done`)
- [ ] CON-04 카피 무위반 (UI 문구)
- [ ] 컴포넌트별 단위 테스트 4~5건 (progression + onComplete + done + 빈배열)

## 영향 범위
- 파일: `components/missions/MissionPhonemeIsolation.tsx`, `MissionSyllable.tsx`, `MissionPhrase.tsx`, `MissionConversation.tsx` (신규 4)
- 테스트: `__tests__/components/missions/Mission{PhonemeIsolation,Syllable,Phrase,Conversation}.test.tsx` (신규 4)

## 의존성
- 선행: **TASK_FR-Q-CL-05-1**
- 후속: TASK_FR-Q-CL-05-3 (play page 가 본 컴포넌트 mount)

## 위험
- 컴포넌트 4 + 테스트 4 = 8 파일. **본 태스크 자체가 경계선** — 필요 시 (L1/L2) + (L4/L6) 2 태스크로 재분할 가능.

## 검증
- [ ] vitest 신규 컴포넌트 테스트 통과
- [ ] tsc 0 errors
