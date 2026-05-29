# TASK_FR-C-003-2 — DB 카드 쿼리 레이어 (graceful fallback)

## 요구사항 출처
- 선행: **TASK_FR-C-003-0 / -1**
- 정합: 하이브리드(메타 DB + 콘텐츠 코드)

## 목표
미션 카드를 DB 에서 조회하는 레이어 신설 — 소비자(페이지)가 fixtures 대신 이걸 쓰게. DB 미연결/미시드 환경에선 fixtures 로 graceful fallback (기존 missions/page try/catch 패턴 계승).

## 작업
- `lib/missions/card-repo.ts`:
  - `getMissionCards(): Promise<MissionCardMeta[]>` — `prisma.missionCard.findMany` (음운 위계 정렬). 실패/빈 결과 시 `dailyMissionFixtures` fallback.
  - `getMissionCardById(id): Promise<MissionCardMeta | null>` — `findUnique`, 실패 시 fixtures find.
  - 반환 타입은 fixtures 의 `MissionFixture` 와 호환(메타 동일). 콘텐츠는 호출부가 `getMissionContent(phoneme, level)` 로 별도 join.

## Acceptance Criteria
- [ ] `getMissionCards` DB 성공 시 DB 카드, 실패/빈 시 fixtures fallback
- [ ] `getMissionCardById` 동일 fallback
- [ ] prisma mock 단위 테스트: DB hit / DB empty→fallback / DB throw→fallback
- [ ] 반환 타입이 pickRecommendedMission / 페이지 소비와 호환

## 영향 범위
- 파일: `lib/missions/card-repo.ts`(신규)
- 테스트: `__tests__/lib/missions/card-repo.test.ts`(신규, prisma mock)

## 의존성
- 선행: FR-C-003-1 / 후속: FR-C-003-3(소비자 교체)

## 위험
- prisma mock 패턴 — 기존 테스트의 `vi.mock("@/lib/db")` 선례 따름.

## 검증
- [ ] vitest 통과 / tsc 0 / 회귀 0
