# TASK_FR-C-003-0 — MissionCard DB 연결 설계 (하이브리드, 선결)

## 요구사항 출처
- SRS / wiki 방향성 검토(2026-05-29): "미션 콘텐츠가 mock 전용 — DB 미연결" 갭.
- 정합: REQ-FUNC-CL-05(6단계 위계), DB-006(MissionCard 카탈로그).
- 조사 근거: 워크플로 `frc003-db-design-investigation`(4축 병렬) + 직접 검증.

## 검증된 현 상태 (에이전트 충돌 해소)
- `seedMissionCards()` **존재** ([prisma/seed.ts:87-125](../prisma/seed.ts)) — 5음소×**5단계**=25 카드, **메타만**(콘텐츠 payload 없음), `id @default(uuid())`. titleByLevel 은 **구버전 5단계**(단어/빈칸/문장/이야기/자유대화).
- MissionCard 스키마([schema.prisma:213-233](../prisma/schema.prisma)) = 메타 전용. difficultyLevel 주석 "1~5". `id @default(uuid())`.
- SessionLog.missionId → MissionCard.id FK (ON DELETE SET NULL).

## 핵심 문제: 두 카드 시스템 불일치
| | DB 경로 | fixtures(mock) 경로 |
|---|---|---|
| 출처 | MissionCard(seed) | `dailyMissionFixtures` |
| 개수/단계 | 25, 1~5(구) | 30, 1~6(CL-05) |
| id | UUID | slug(`mock-s-3`) |
| 콘텐츠 | 없음 | `getMissionContent`(코드) |
| 사용처 | `prismaMissionDeps`(curriculum 액션) | **missions/play 페이지(실제 화면)** |

→ 화면은 전부 fixtures(mock). FR-C-003 = **두 시스템을 DB 단일 소스로 통합**.

## 설계 결정 ✅ 확정 (admin 승인 2026-05-29) — 하이브리드 (DDL 없음)
- **D1. 콘텐츠 저장 = 하이브리드**: 카드 **메타만 DB**, 콘텐츠 payload 는 **type-safe 코드 유지**(`getMissionContent`, phoneme+level join). 다형 6타입 그대로. → Phase 2 시 필요하면 JSON 컬럼으로 점진 전환.
- **D2. ID = 결정적 slug**: seed 에서 `id: "mock-${slug}-${level}"` **명시 지정**(uuid default 미사용). id 는 String 이라 **schema 변경 불필요**. 라우팅/FK 안정 + fixtures id 와 동일 → 회귀 최소.
- **D3. DDL 없음**: 콘텐츠 컬럼 추가 안 함 → **Supabase 수동 마이그레이션 불필요**(P3009 등 마찰 회피). seed 변경 + 소비자 교체만.
- **D4. seed 확장**: 5→6단계, CL-05 타이틀(소리내기/음절/단어/구/문장/대화), 결정적 slug id. schema difficultyLevel 주석 1→6.
- **D5. 소비자 교체**: missions/page(카드 그리드 + 추천 pool) · play page(lookup) → fixtures 대신 **DB 쿼리**(graceful fallback 유지). `dailyMissionFixtures` 는 **테스트 fixture 로 강등**.

## 분해
| Task | 내용 | 게이트 |
|---|---|---|
| **FR-C-003-1** | seed 6단계 확장 + 결정적 slug id + CL-05 타이틀 + schema 주석. 독립 green(소비자 무변경) | 즉시 |
| **FR-C-003-2** | DB 카드 쿼리 레이어(`lib/missions/card-repo.ts`) — `getMissionCards()`/`getMissionCardById()` + graceful fallback. prisma mock 테스트 | -1 후 |
| **FR-C-003-3** | missions/page · play page 를 쿼리 레이어로 교체 + 테스트(prisma mock) + fixtures 강등 | -2 후 |

## 위험
- 소비자 교체(-3) 시 RSC 의 prisma 쿼리 → 테스트에 prisma mock 필요(missions-play-page.test 등 갱신).
- seed 미실행 환경(로컬/CI) graceful fallback 필수 — 기존 missions/page 의 try/catch 패턴 계승.

## 검증
- [ ] 각 task green per commit (vitest/tsc/build)
- [ ] DDL 마이그레이션 0건 (하이브리드 확인)
