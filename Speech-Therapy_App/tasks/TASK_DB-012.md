---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-012: classes 테이블 (B2B 반 단위)"
labels: 'phase:p2, mode:active, domain:db, epic:b2b, sprint:p2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-012
- **Epic / Story**: B2B 후속 (V06 DB-003 institutions 의 자식 테이블)
- **Phase**: 🔴 P2
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음 (B2B 진입 시 활성)
- **목적**: 유치원/어린이집 의 반(class) 단위 원아 그룹핑. `institutions` 1:N `classes`, `users.classId` FK. 원장/교사 RBAC + Zero-touch 화자분리의 분리 단위.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §6.1.2 신규 7 Entity — Class (V07 신규)
  - REQ-FUNC-046 (반/원아 단위 스크리닝 대시보드)
  - REQ-FUNC-049 (교사 능동 조작 없이 백그라운드 자동 수집)
- **ERD**: V07 §6.1.2 — `classes (id, institutionId FK, name, teacherId)`
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §1-A DB-012

## ✅ Task Breakdown
- [ ] `prisma/schema.prisma` 의 `Institution` model 아래 `Class` model 추가 (`institutionId String`, `name String`, `teacherId String?`)
- [ ] `Institution.classes Class[]` relation 추가
- [ ] `User.classId String?` + `User.class Class? @relation` 추가
- [ ] `@@index([institutionId])` + `@@index([teacherId])` 인덱스 추가
- [ ] `npx prisma migrate dev --name add_classes_table` (dev)
- [ ] prod migration 은 Supabase Studio SQL Editor 통해 적용 (INFRA-008 패턴)
- [ ] 시드 데이터 — 데모 유치원 1개에 반 3개 (꽃반/별반/달반) INSERT

## 🧪 Acceptance Criteria
**Scenario 1: 반 단위 원아 조회 (REQ-FUNC-046)**
- **Given**: institution A 산하 class "꽃반" 에 원아 10명
- **When**: `prisma.user.findMany({where: {classId: 꽃반.id}})`
- **Then**: 10명 반환, 다른 반 원아 미노출

**Scenario 2: 교사 RBAC (REQ-NF-019)**
- **Given**: 교사 user.teacherId = 꽃반.teacherId
- **When**: `/admin/teacher/students` 접근
- **Then**: 꽃반 원아 만 조회 가능 (RLS 정책으로 cross-class 차단)

**Scenario 3: institution 삭제 시 CASCADE**
- **Given**: institution + class 2개 + 원아 5명
- **When**: institution DELETE
- **Then**: class CASCADE DELETE, 원아 user.classId NULL 처리 (`onDelete: SetNull`)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: RBAC — 교사 는 본인 반 원아만 접근
- **횡단 제약**:
  - [ ] R4 개인정보: class 자체는 PII 아님, 자녀 식별정보는 `User` 에 있음
  - [ ] CON-04: 반 이름은 자유 입력 (금칙어 검증 불필요)

## 🏁 Definition of Done
- [ ] Prisma migration 성공 (dev + prod)
- [ ] `tsc --strict` 0 errors
- [ ] `@@index` 2개 검증 (`EXPLAIN ANALYZE`)
- [ ] 시드 데이터 INSERT 성공
- [ ] RLS 정책 (DB-011) class 단위 검증

## 🚧 Dependencies & Blockers
- **Depends on**: DB-003 (institutions), DB-002 (users), DB-011 (RLS)
- **Blocks**: API-015 (submitBulkImport), FR-Q-019 (`/admin/teacher`), FR-Q-009 (원장 대시보드)
- **Discope 영향**: 67-D3 (Zero-touch 보류) → Phase 2 B2B PoC 5건 후 활성
