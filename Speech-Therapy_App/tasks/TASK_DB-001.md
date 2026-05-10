---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-001: Prisma + Supabase 프로젝트 부트스트랩"
labels: 'phase:p0, mode:active, domain:db, epic:foundation, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-001
- **Epic / Story**: Foundation (모든 후속 DB·API·FR 태스크의 의존성 루트)
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: dev=SQLite / prod=Supabase PostgreSQL 듀얼 환경에서 Prisma ORM을 표준 데이터 액세스 레이어로 채택. C-TEC-003 충족.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §1.5.1 C-TEC-003 (DB는 Prisma + SQLite/Supabase)
  - §6.4 Tech Stack (Framework·Server Logic·Database·Vector DB)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-1

## ✅ Task Breakdown
- [ ] `npx create-next-app@latest` 실행 (TypeScript, App Router, Tailwind, ESLint 옵션)
- [ ] `npm i -D prisma` + `npx prisma init`
- [ ] `prisma/schema.prisma`에 datasource provider를 환경변수로 분기 (`provider = "sqlite"` dev / `"postgresql"` prod)
- [ ] `.env.local` (`DATABASE_URL="file:./dev.db"`) / `.env.production` (Supabase URL) 분리
- [ ] `.env.example` 작성 + `.env*` `.gitignore` 추가
- [ ] Supabase 신규 프로젝트 생성 + `DATABASE_URL` (Connection Pooling URL) 추출
- [ ] `npx prisma migrate dev --name init` 성공 (빈 스키마)
- [ ] `lib/db.ts`에 PrismaClient 싱글톤 패턴 작성 (Next.js Hot Reload 대비)
- [ ] `npm i @supabase/ssr` 설치 (후속 Auth 준비)

## 🧪 Acceptance Criteria
**Scenario 1: dev 환경 마이그레이션 성공**
- **Given**: 신규 클론 + `.env.local`에 SQLite URL 설정
- **When**: `npx prisma migrate dev --name init` 실행
- **Then**: `prisma/dev.db` 생성, `prisma/migrations/` 폴더 추가, exit code 0

**Scenario 2: prod DB 연결 검증**
- **Given**: `.env.production`에 Supabase PostgreSQL DATABASE_URL
- **When**: `npx prisma db pull --schema=./prisma/schema.prisma`
- **Then**: 연결 성공, 빈 스키마 반환

**Scenario 3: PrismaClient 타입 추출**
- **Given**: 마이그레이션 완료
- **When**: `app/page.tsx`에서 `import { prisma } from '@/lib/db'`
- **Then**: 타입 자동완성 동작, `tsc --strict` 통과

## ⚙️ Technical & Non-Functional Constraints
- **C-TEC-003 준수**: dev=SQLite, prod=Supabase PostgreSQL. 다른 DB 사용 금지
- **횡단 제약**: 해당 없음 (인프라 부트스트랩)
- **보안**: `.env.local`, `.env.production` git 미커밋. `.env.example`만 커밋
- **비용 가드레일 G2** (02 보고서 §3.4): Supabase Free 시작 → 1GB DB 임계 시 Pro 전환

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] dev/prod 양쪽 마이그레이션 성공
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors / 0 warnings
- [ ] `lib/db.ts` 싱글톤 패턴 검증
- [ ] README에 환경 설정 가이드 추가
- [ ] Vercel Preview 환경 변수 등록 (DATABASE_URL prod 분기)

## 🚧 Dependencies & Blockers
- **Depends on**: None (Foundation, 최초 진입점)
- **Blocks**: DB-002, DB-004, DB-005, DB-006, DB-008, DB-009, DB-011, API-001, API-004, API-011, INFRA-001
- **Discope 영향**: 해당 없음
