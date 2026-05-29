# TASK_FR-Q-CL-05-0 — 6단계 임상 위계 ↔ 기존 난이도 체계 매핑 설계 (선결)

## 요구사항 출처
- SRS §4.1 임상 정밀도 요구사항: **REQ-FUNC-CL-05** (6단계 위계: 단독 음소 → 음절 → 단어 → 구 → 문장 → 대화)
- wiki `clinical/concepts/조음장애` §난이도 위계 (L34): "단독 음소 → 음절 → 단어 → 구 → 문장 → 대화 … 모든 음소·환자 공통 일반화 경로"
- 정합 대상: REQ-FUNC-021/022 (적응형 난이도)

## 배경 (현 상태 사실)
- [lib/curriculum.ts](../lib/curriculum.ts): `MAX_DIFFICULTY = 5` / `MIN_DIFFICULTY = 1` — 시스템은 이미 **난이도 1~5** 가정. phoneme_switch 는 `level ≥ 5` 마스터 시 발동.
- [lib/mocks/mission-content.ts](../lib/mocks/mission-content.ts): 콘텐츠는 **3단계만** 채워짐 (1=단어따라하기 / 2=단어빈칸 / 3=문장). 5 자모 × 3 = 15 sets.
- [play/page.tsx](../app/(public)/missions/[missionId]/play/page.tsx): 난이도 표시 `{level}/5`, 콘텐츠 라우팅 1/2/3 분기.
- 즉 **난이도 체계(1~5) ↔ 콘텐츠(3단계) ↔ 임상 위계(6단계)** 3자가 불일치.

## 결정 사항 ✅ 확정 (admin 승인 2026-05-29)
- **D1. 난이도 단계 수**: `MAX_DIFFICULTY` **5 → 6 확장** (병합 아님).
  - 사유: ① 임상 6단계와 1:1 정합 ② 현 level 4~5 는 콘텐츠 없는 **유령 단계**(엔진은 추천하나 `getMissionContent` undefined) — 확장이 곧 그 공백을 메움 ③ pilot(100가정) 전이라 재해석할 prod `difficultyLevel` 데이터 거의 없음 → 마이그레이션 불요.
- **D2. 매핑표**: 아래 확정표.
- **D3. 기존 콘텐츠 재배치 + 빈칸 처리**:
  - 현 L1 단어(MissionWordRepeat) → **신 L3**, 현 L3 문장(MissionSentenceBuild) → **신 L5**.
  - **현 L2 빈칸(MissionWordFill) = L3 단어의 선택 변형으로 보존** (컴포넌트·테스트 폐기 안 함). 임상적으로 빈칸 채우기는 단어 레벨 과제 → 구(L4) 아님.
  - **L4(구) = 신규 MissionPhrase** 별도 작성.
- **D4. curriculum 영향**: `MAX_DIFFICULTY=6`, phoneme_switch 임계 `level ≥ 5` → **`level ≥ 6`**(최상위=대화 마스터 시 음소 전환), `FAILURE_STREAK_DOWN=3`/`SUCCESS_STREAK_UP=5` 불변. 기존 `difficultyLevel`(1~5) 데이터는 마이그레이션 없이 의미만 문서화(본 표 기준).

### D2 매핑표 ✅ 확정 (6 단계)
| level | 임상 단계 | 콘텐츠 형태 | 현 구현 |
|---|---|---|---|
| 1 | 단독 음소 | 음소 1개 소리 내기 + 입모양 힌트 | ❌ 신규 (MissionPhonemeIsolation) |
| 2 | 음절 | 음절 카드 (사·시·수) | ❌ 신규 (MissionSyllable) |
| 3 | 단어 | 단어 따라하기 (+ 빈칸 변형) | ✅ 현 L1 MissionWordRepeat 이동 (+ MissionWordFill 변형 보존) |
| 4 | 구 | 짧은 구 (빨간 사과) | ❌ 신규 (MissionPhrase) |
| 5 | 문장 | 짧은 문장 만들기 | ✅ 현 L3 MissionSentenceBuild 이동 |
| 6 | 대화 | 턴테이킹 발화 유도 | ❌ 신규 (MissionConversation) |

## Acceptance Criteria
- [x] D1~D4 결정이 본 문서에 확정 기재 (선택 + 사유)
- [x] D2 매핑표 최종본 확정 (level ↔ 단계 ↔ 콘텐츠 타입)
- [x] `MAX_DIFFICULTY` 변경 시 curriculum.ts 영향 범위 + 기존 데이터(`difficultyLevel` 1~5) 호환/마이그레이션 방침 명시 (D4)
- [x] 후속 태스크(CL-05-1/2/3) 의 범위가 본 결정에 정렬 (CL-05-3 가 D1·D4 반영)

> **상태: ✅ 설계 확정 (admin 승인 2026-05-29)** — CL-05-1/2/3 착수 가능.

## 영향 범위 (결정만 — 코드 변경 없음)
- 결정 영향 파일: [lib/curriculum.ts](../lib/curriculum.ts), [lib/mocks/mission-content.ts](../lib/mocks/mission-content.ts), [lib/mocks/missions.ts](../lib/mocks/missions.ts)

## 의존성
- 선행: 없음
- 후속: **TASK_FR-Q-CL-05-1 / -2 / -3 (본 결정에 종속)**

## 위험
- `MAX_DIFFICULTY` 5→6 변경 시 기존 `EvaluationResult` / `SessionLog` 의 `difficultyLevel`(1~5) 의미가 1단계씩 shift → 과거 데이터 해석 주의 (마이그레이션 불요하나 분석 시 단계 매핑 명시 필요).
- phoneme_switch 임계 변경(5→6)으로 음소 전환 타이밍 지연 → W-AUR 영향 점검.

## 검증
- [ ] 결정 문서 사용자/admin 리뷰
- [ ] (코드 무변경 — 테스트 N/A)
