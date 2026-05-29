# TASK_FR-Q-CL-05-3 — 라우팅 + curriculum 정합 + fixtures (통합)

## 요구사항 출처
- SRS §4.1 **REQ-FUNC-CL-05** (6단계 위계) + 정합 **REQ-FUNC-021/022** (적응형 난이도)
- 선행: **TASK_FR-Q-CL-05-1**(데이터) / **-2**(컴포넌트)

## 목표
6단계 콘텐츠/컴포넌트를 라우팅·난이도 엔진·fixtures 에 통합하여 end-to-end 동작.

## 작업
1. **play page 라우팅** ([play/page.tsx](../app/(public)/missions/[missionId]/play/page.tsx)): difficultyLevel 1~6 분기 — L1 PhonemeIsolation / L2 Syllable / L3 WordRepeat / L4 Phrase / L5 SentenceBuild / L6 Conversation. 난이도 표시 `{level}/5` → `{level}/6`.
2. **curriculum 정합** ([lib/curriculum.ts](../lib/curriculum.ts)): CL-05-0 결정 따라 `MAX_DIFFICULTY` 6 으로(또는 결정안). phoneme_switch 임계 갱신.
3. **fixtures** ([lib/mocks/missions.ts](../lib/mocks/missions.ts)): `dailyMissionFixtures` 5 자모 × 6 난이도 정합 (현 15 → 30 카드). ASCII slug id 규칙 유지(`mock-s-4` 등).

## Acceptance Criteria
- [ ] `/missions/<id>/play` 가 6 단계 각각 올바른 컴포넌트 mount
- [ ] 난이도 표시 `/6` 반영
- [ ] curriculum `MAX_DIFFICULTY` = CL-05-0 결정값, phoneme_switch 임계 정합
- [ ] fixtures 30 카드 (5×6), id ASCII slug, NFC 회귀 0
- [ ] 적응형 난이도 (REQ-FUNC-021 3연속 실패 하향 / 022 5연속 성공 상향) 6단계 범위에서 정상

## 영향 범위
- 파일: [play/page.tsx](../app/(public)/missions/[missionId]/play/page.tsx), [lib/curriculum.ts](../lib/curriculum.ts), [lib/mocks/missions.ts](../lib/mocks/missions.ts)
- 테스트: `__tests__/admin/missions-play-page.test.tsx`, `__tests__/lib/curriculum*.test.ts`, `__tests__/integration/mission-spl-flow.test.tsx` 갱신

## 의존성
- 선행: **TASK_FR-Q-CL-05-1, -2**
- 후속: (선택) FR-C-003 MissionCard DB 연결 시 fixtures → DB 교체

## 위험
- `MAX_DIFFICULTY` 변경이 기존 curriculum 테스트(phoneme_switch level≥5 가정) 다수 회귀 유발 → 테스트 동반 수정.
- fixtures 30 카드 노출이 /missions 카탈로그 UI 레이아웃에 영향.

## 검증
- [ ] vitest 전체 통과 (회귀 0)
- [ ] tsc 0 errors
- [ ] next build 통과 (라우트 등록)
- [ ] 수동: /missions → 6단계 카드 진입 (데스크톱 + 모바일)
