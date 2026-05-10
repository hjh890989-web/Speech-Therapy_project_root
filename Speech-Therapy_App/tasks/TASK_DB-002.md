---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-002: users 테이블 스키마 + RBAC enum"
labels: 'phase:p0, mode:active, domain:db, epic:user, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-002
- **Epic / Story**: User
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 5종 역할(parent/teacher/principal/expert/admin) + 자녀 월령 + 구독 등급 저장. 모든 사용자 관련 FK의 부모 엔터티.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §2 Stakeholders (Seg A/C/B/D-1/D-2/HITL Expert/Admin)
  - §6.1 ERD `users` 엔터티
  - REQ-NF-019: RBAC + Supabase RLS
- **Task 강화판**: §3-1 DB-002

## ✅ Task Breakdown
- [ ] `schema.prisma`에 `User` 모델 정의
- [ ] `Role` enum: `parent | teacher | principal | expert | admin`
- [ ] `SubscriptionTier` enum: `free | basic | premium`
- [ ] 필드: `id String @id @default(uuid())`, `role Role`, `childAgeMonths Int?`, `subscriptionTier SubscriptionTier @default(free)`, `createdAt DateTime @default(now())`, `email String? @unique` (Supabase Auth 연결용)
- [ ] `npx prisma migrate dev --name add_users` 실행
- [ ] `prisma/seed.ts`에 admin 1명 + 테스트 부모 1명 시드
- [ ] `package.json`에 `"db:seed": "tsx prisma/seed.ts"` 추가

## 🧪 Acceptance Criteria
**Scenario 1: 부모 사용자 생성 성공**
- **Given**: `{role: 'parent', childAgeMonths: 36, subscriptionTier: 'free'}`
- **When**: `prisma.user.create({data})` 호출
- **Then**: UUID id 자동 발급, createdAt 현재 시각, 모든 필드 저장됨

**Scenario 2: enum 외 값 차단**
- **Given**: `role: 'invalid_role'` (TS 단계)
- **When**: 컴파일
- **Then**: `tsc` 컴파일 에러로 차단 (런타임 도달 불가)

**Scenario 3: 시드 스크립트 동작**
- **Given**: 빈 DB
- **When**: `npm run db:seed`
- **Then**: admin 1명 + 부모 1명 INSERT 성공

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: RBAC 기반. 향후 Supabase RLS 정책의 키
- **횡단 제약 — 개인정보 최소화**: 자녀 이름·생년월일·주소 미저장. 월령(개월수)만
- **R4 리스크 완화**: 영유아 식별 정보 비저장 → 개인정보 누출 영향 최소화

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 마이그레이션 성공 + Prisma Client 타입 갱신
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] 시드 스크립트로 데이터 INSERT 성공
- [ ] ERD `users` 5+1개 컬럼 모두 매핑 (email 추가)

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001
- **Blocks**: DB-004 (session_logs.userId FK), DB-008 (reward_progress.userId FK), DB-009 (hitl_queue.assigned_expert_id FK), DB-011 (RLS 정책), API-010 (Supabase Auth 연동), FR-C-009 (보상 INSERT)
- **Discope 영향**: 해당 없음
