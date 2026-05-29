# TASK_FR-Q-CL-07 — 미션 4대 핵심기법 부모 코칭 (비게이트 범위)

## 요구사항 출처
- SRS §4.1 임상 정밀도: **REQ-FUNC-CL-07** (4대 핵심기법 + ADR-09 정합)
- wiki `clinical/concepts/아동언어치료-핵심기법` §4기법 (평행 발화 · 확장 · 기다리기 3~5초 · 반응적 상호작용)

## 범위 (게이트 분리)
- ✅ **본 태스크**: 미션 플레이 UI 의 **부모 코칭 팁** (4대 기법 가정 적용 안내). 채점 로직 무관 → 임상 자문 게이트 없음.
- ❌ **제외**: F15 챗봇의 4기법 반영 (ADR-14 KOPLAC 임상 자문 게이트 — §10).
- ADR-09 정합: 부모 음성 클로닝은 일방향(동화/자장가)만 — 본 코칭 팁은 텍스트 가이드일 뿐 음성 클로닝과 무관.

## 설계
- 6개 미션 컴포넌트에 분산하지 않고 **공유 컴포넌트 + 레벨별 팁 데이터**로 DRY 구현.
- `lib/mocks/coaching-tips.ts`: 4대 기법 정의 + `getCoachingTips(level)` (레벨별 1~3 관련 기법). 기다리기는 전 레벨 공통.
- `components/missions/ParentCoachingTip.tsx`: 팁 카드 렌더 (기법명 + 가이드 + 예시).
- play/page.tsx + missions/page.tsx 추천 영역에 통합 (콘텐츠 옆).

### 레벨별 기법 매핑 (초안)
| level | 단계 | 기법 |
|---|---|---|
| 1~2 | 단독음소/음절 | 기다리기 + 반응적 상호작용 |
| 3~4 | 단어/구 | 기다리기 + 평행 발화 + 확장 |
| 5~6 | 문장/대화 | 기다리기 + 확장 + 반응적 상호작용 |

## Acceptance Criteria
- [ ] 4대 기법(평행발화·확장·기다리기·반응적 상호작용) 데이터 정의 + 각 가이드/예시 비어있지 않음
- [ ] `getCoachingTips(level)` 가 레벨별 2~3 기법 반환, 기다리기 전 레벨 포함
- [ ] CON-04 금칙어("치료"/"진단"/"장애") **0건** (가이드/예시 전수)
- [ ] `ParentCoachingTip` 컴포넌트가 기법명 + 가이드 + 예시 렌더 (data-testid)
- [ ] play 페이지 + 추천 영역에 코칭 팁 노출 (레벨 정합)

## 영향 범위
- 파일: `lib/mocks/coaching-tips.ts`(신규), `components/missions/ParentCoachingTip.tsx`(신규), `app/(public)/missions/[missionId]/play/page.tsx`, `app/(public)/missions/page.tsx`
- 테스트: `__tests__/lib/mocks/coaching-tips.test.ts`(신규), `__tests__/components/missions/ParentCoachingTip.test.tsx`(신규)

## 의존성
- 선행: REQ-FUNC-CL-05 (6단계 위계) — level 기준 정합. ✅ 완료
- 후속: F15 챗봇 4기법 반영 (ADR-14 자문 후, 별도)

## 위험
- 코칭 팁이 과도하면 미션 UI 산만 → 레벨당 1개 노출(또는 접힌 상태) 권장.

## 검증
- [ ] vitest 통과 (회귀 0)
- [ ] tsc 0 errors (기존 baseline 제외)
- [ ] next build 통과
