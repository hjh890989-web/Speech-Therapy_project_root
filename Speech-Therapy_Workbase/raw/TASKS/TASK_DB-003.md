---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-003: institutions 테이블 + users.institution_id FK"
labels: 'phase:p2, mode:active, domain:db, epic:f9-a'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-003
- **Epic / Story**: F9-a 원장 대시보드 / S4
- **Phase**: 🔴 P2
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: B2B 기관(어린이집/유치원) 정보 저장 + users.institution_id FK로 다중 테넌트 구조 지원. F9-a 원장 대시보드, F9-d AI 알림장, F10 동의서의 부모 엔터티.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §6.1 ERD `institutions` (id, name, principal_name, consent_status, logo_uri)
  - REQ-FUNC-046 (원장 대시보드 반/원아 단위)
  - REQ-FUNC-047 (헤더/로고 커스텀)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-1 DB-003

## ✅ Task Breakdown
- [ ] `Institution` 모델 정의
- [ ] 필드:
  - `id String @id @default(uuid())`
  - `name String`
  - `principalName String`
  - `principalEmail String? @unique`
  - `phone String?`
  - `address String?`
  - `consentStatus Boolean @default(false)` (F10 동의서 완료 여부)
  - `logoUri String?` (Supabase Storage path)
  - `subscriptionStartedAt DateTime?`
  - `subscriptionTier String @default("trial")` ("trial", "annual_500k", "annual_1m")
  - `createdAt DateTime @default(now())`
- [ ] `users` 테이블에 컬럼 추가:
  - `institutionId String?` (parent는 nullable, teacher/principal은 필수)
  - FK 관계 정의
- [ ] `Class` 모델 추가 (반 단위 — 원장 대시보드의 그룹화 키):
  - `id`, `institutionId`, `name`, `teacherId?`, `createdAt`
  - FK: institution + teacher
- [ ] `users` 추가: `classId String?` (parent의 자녀가 속한 반)
- [ ] 인덱스: `@@index([institutionId])` on Class와 User
- [ ] 마이그레이션 `npx prisma migrate dev --name add_institutions_classes`
- [ ] 시드: 테스트 기관 2개 + 각 기관당 반 3개

## 🧪 Acceptance Criteria
**Scenario 1: 기관 + 사용자 관계**
- **Given**: institution X 생성 + principal user Y 생성
- **When**: `prisma.user.update({where: {id: Y}, data: {institutionId: X}})`
- **Then**: FK 정상 연결

**Scenario 2: 반 단위 그룹화**
- **Given**: Class 3개 + 각 반에 자녀 5명
- **When**: `prisma.user.findMany({where: {classId: 'class-1', role: 'parent'}})`
- **Then**: 5명 반환

**Scenario 3: B2B 데이터 격리 (RLS 책임 — DB-011)**
- **Given**: institution A의 principal
- **When**: institution B의 데이터 SELECT 시도
- **Then**: 0 rows (RLS 차단)

**Scenario 4: 시드 데이터**
- **Given**: 빈 DB
- **When**: `npm run db:seed`
- **Then**: institutions 2 + classes 6 row

**Scenario 5: parent의 institutionId nullable**
- **Given**: Seg A 무로그인 진단 사용자
- **When**: User INSERT (role: parent)
- **Then**: institutionId null 허용

**Scenario 6: principal의 institutionId 필수 검증**
- **Given**: principal 역할 + institutionId null
- **When**: 가입 시도
- **Then**: 비즈니스 로직 레벨 검증 실패 (Server Action 차단)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-046**: 반/원아 단위 스크리닝 — institutionId + classId 필수
- **REQ-NF-019**: B2B 다중 테넌트 격리 (RLS 책임)
- **횡단 제약**:
  - [ ] R3 — 교사 추가 업무 회피 (Zero-touch는 P2 별도)
  - [ ] R4 — 자녀 식별 정보 비저장 (월령만)
- **R8 보호**: 기관당 ~80가구 × 5,000개소 = 40만 row 가능 — Pro 전환 트리거

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 마이그레이션 성공 + Prisma Client 타입 갱신
- [ ] `tsc --strict` 0 errors
- [ ] FK 무결성 검증
- [ ] 시드 2개 기관 + 6개 반 INSERT
- [ ] PR 본문에 §6.1 + REQ-FUNC-046 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001, DB-002 (User 확장)
- **Blocks**: DB-010 (consent_signatures), API-007 (B2B approval), FR-Q-009/010/011, FR-C-015~017
- **Discope 영향**: 해당 없음
