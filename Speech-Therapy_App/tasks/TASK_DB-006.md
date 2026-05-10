---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-006: mission_cards 테이블 + 시드 데이터"
labels: 'phase:p0, mode:active, domain:db, epic:f3-a, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-006
- **Epic / Story**: F3-a 1분 숏폼 미션 카드 / S2
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음 (단, Sprint 1엔 미션 UI는 P1으로 디퍼되어 본 테이블은 데이터만 준비)
- **목적**: 음소별·난이도별 미션 카드 카탈로그 저장. 적응형 난이도 조절(F3-b)·세션 로그(DB-004) 연결의 기준 키.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §6.1 ERD `mission_cards`
  - REQ-FUNC-015 (개인화 데일리 미션)
  - REQ-FUNC-021~022 (적응형 난이도, getCurriculum)
- **Task 강화판**: §3-1 DB-006

## ✅ Task Breakdown
- [ ] `MissionCard` 모델 정의
- [ ] 필드: `id String @id @default(uuid())`, `targetPhoneme String` (예: "ㅅ", "ㅈ"), `difficultyLevel Int` (1~5), `rewardType String` (예: "star", "tree", "drawing"), `title String`, `instructionText String`, `mediaUri String?`, `ageRangeMin Int`, `ageRangeMax Int`, `createdAt DateTime @default(now())`
- [ ] 인덱스: `@@index([targetPhoneme, difficultyLevel])` (getCurriculum 조회용)
- [ ] 마이그레이션 `npx prisma migrate dev --name add_mission_cards`
- [ ] 시드: 한국어 음소(/ㅅ/ /ㅈ/ /ㄱ/ /ㄴ/ /ㄹ/) × 5단계 = 25개 기본 카드. 만 2~7세 월령 범위 매핑
- [ ] `package.json` `db:seed` 스크립트에 mission_cards 시드 통합

## 🧪 Acceptance Criteria
**Scenario 1: 시드 후 카드 25개 존재**
- **Given**: 빈 DB
- **When**: `npm run db:seed`
- **Then**: `mission_cards` 테이블에 25 row, 각 음소당 5개

**Scenario 2: 난이도별 조회**
- **Given**: 시드 완료
- **When**: `prisma.missionCard.findMany({where: {targetPhoneme: 'ㅅ', difficultyLevel: 1}})`
- **Then**: 1개 row 반환 (인덱스 활용)

**Scenario 3: 월령 범위 필터**
- **Given**: 36개월(만 3세) 아동
- **When**: `where: {ageRangeMin: {lte: 36}, ageRangeMax: {gte: 36}}`
- **Then**: 해당 월령 카드만 반환

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-021**: 3회 연속 실패 시 난이도 하향 — `difficultyLevel` 기반 정렬·필터 필수
- **횡단 제약 — 비의료 표현**: `instructionText`에 "치료", "진단" 등 의료 용어 금지. 시드 콘텐츠 작성 시 검수
- **콘텐츠 정확성**: 한국어 음운론 위계(파열음→마찰음→파찰음→유음) 준수

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 마이그레이션 성공
- [ ] 시드 25개 INSERT 성공
- [ ] `tsc --strict` 0 errors
- [ ] 인덱스 EXPLAIN 확인
- [ ] 시드 콘텐츠 금칙어 0건 검증

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001
- **Blocks**: DB-004 (session_logs.missionId FK), API-002 (getCurriculum 조회), FR-Q-003 (미션 카드 UI — P1), FR-C-008 (적응형 난이도 — P1)
- **Discope 영향**: Sprint 1엔 시드만 채우고 UI 구현은 P1으로 디퍼됨. 즉, 본 태스크 완료 후 즉시 가시화되는 기능 없음 (P1 unblock 용)
