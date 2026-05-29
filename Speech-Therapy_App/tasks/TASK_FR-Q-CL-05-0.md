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

## 결정 사항 (본 태스크 산출 = 결정 문서)
- **D1. 난이도 단계 수**: `MAX_DIFFICULTY` 5 → **6 확장** vs 5 유지(단계 병합).
  - 권장: **6 확장** — 임상 6단계와 1:1 정합, 의미 명확. (대안: 단독음소+음절 병합으로 5 유지)
- **D2. 6단계 ↔ level 번호 매핑표** 확정 (아래 초안).
- **D3. 기존 3 콘텐츠 재배치** — 현 L1 단어 → 신 L3, 현 L3 문장 → 신 L5, 현 L2 빈칸 → 신 L4(구)로 재해석 또는 단어변형 유지.
- **D4. curriculum 영향** — `MAX_DIFFICULTY=6` 시 phoneme_switch 임계(`level ≥ 6`), 기존 세션 `difficultyLevel`(1~5) 데이터 의미 변화 처리.

### D2 매핑표 (초안 — 6 확장 안)
| level | 임상 단계 | 콘텐츠 형태 | 현 구현 |
|---|---|---|---|
| 1 | 단독 음소 | 음소 1개 소리 내기 + 입모양 힌트 | ❌ 신규 |
| 2 | 음절 | 음절 카드 (사·시·수) | ❌ 신규 |
| 3 | 단어 | 단어 따라하기 | ✅ 현 L1 (MissionWordRepeat) |
| 4 | 구 | 짧은 구 (빨간 사과) | 🟡 현 L2 빈칸 재해석 |
| 5 | 문장 | 짧은 문장 만들기 | ✅ 현 L3 (MissionSentenceBuild) |
| 6 | 대화 | 턴테이킹 발화 유도 | ❌ 신규 |

## Acceptance Criteria
- [ ] D1~D4 결정이 본 문서에 확정 기재 (선택 + 사유)
- [ ] D2 매핑표 최종본 확정 (level ↔ 단계 ↔ 콘텐츠 타입)
- [ ] `MAX_DIFFICULTY` 변경 시 curriculum.ts 영향 범위 + 기존 데이터(`difficultyLevel` 1~5) 호환/마이그레이션 방침 명시
- [ ] 후속 태스크(CL-05-1/2/3) 의 범위가 본 결정에 정렬

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
