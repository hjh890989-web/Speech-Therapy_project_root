# TASK_FR-C-003-3 — 소비자 교체 (fixtures → DB 쿼리 레이어)

## 요구사항 출처
- 선행: **TASK_FR-C-003-0 / -1 / -2**
- 정합: 하이브리드 — 화면이 DB 단일 소스를 보게

## 목표
missions/page · play page 가 `dailyMissionFixtures` 대신 `card-repo`(FR-C-003-2)를 사용. `dailyMissionFixtures` 는 테스트 fixture 로 강등.

## 작업
1. [missions/page.tsx](../app/(public)/missions/page.tsx):
   - 카드 그리드: `dailyMissionFixtures.map` → `await getMissionCards()`
   - 추천 pool: `pickRecommendedMission(decision, await getMissionCards())`
   - 콘텐츠 주입은 `getMissionContent(phoneme, level)` 유지(변경 0)
2. [play/page.tsx](../app/(public)/missions/[missionId]/play/page.tsx):
   - `dailyMissionFixtures.find(id)` → `await getMissionCardById(missionId)` (없으면 notFound)
   - NFC normalize 로직은 slug id 이므로 단순화 가능(유지해도 무방)
3. `dailyMissionFixtures`: 페이지 import 제거. lib/mocks 유지(테스트·fallback 용).

## Acceptance Criteria
- [ ] missions/page 카드 그리드 + 추천이 DB 카드(또는 fallback)로 렌더
- [ ] play page 가 `getMissionCardById` 로 조회 + 6단계 콘텐츠 정상 주입
- [ ] missions-play-page.test 등 prisma/card-repo mock 으로 갱신, 회귀 0
- [ ] 빈 DB(fallback) 경로에서도 동작

## 영향 범위
- 파일: missions/page.tsx, play/page.tsx
- 테스트: `__tests__/admin/missions-play-page.test.tsx`(prisma/card-repo mock 갱신), missions/page 관련 테스트

## 의존성
- 선행: FR-C-003-2 / 후속: (선택) /admin/missions CRUD (Phase 2)

## 위험
- RSC 의 DB 쿼리 → 테스트 mock 갱신 필요(가장 큰 변경 지점). graceful fallback 으로 env 무관 동작 보장.

## 검증
- [ ] vitest 전체 통과(회귀 0) / tsc 0 / next build ✓
- [ ] 수동: /missions → 카드 진입 (DB seed 후)
