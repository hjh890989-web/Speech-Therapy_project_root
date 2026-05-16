---
name: 101-build-and-env-setup
description: Speech-Therapy 빌드 + 환경변수 셋업 (Next.js 16 + Prisma 7 + Vercel Hobby).
---
Globs: /**/*

# Build & Environment Setup

## 1. Local Development

### 1.1 의존성 설치
```powershell
cd Speech-Therapy_App
npm install
# postinstall hook: prisma generate 자동 실행
```

### 1.2 환경변수 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=postgresql://...?pgbouncer=true   # 풀러
DIRECT_URL=postgresql://...                     # migration 전용 (필수)
GOOGLE_GENERATIVE_AI_API_KEY=...
NEXT_PUBLIC_ENABLE_AUDIO_ANALYZER=false         # Sprint 3 §2 A 핫픽스 기본 off
```

⚠️ `.env*` 절대 git commit 금지. `.gitignore` 적용 확인.

### 1.3 데이터베이스 셋업
```powershell
npm run db:seed                # 기본 데이터 삽입
npx prisma migrate dev          # 새 migration 적용 (로컬 DB)
npx prisma studio               # GUI 확인 (선택)
```

### 1.4 Dev 서버
```powershell
npm run dev                     # 포트 4000
```

## 2. Test

```powershell
npm run lint                    # ESLint
npm run test                    # Vitest unit
npm run test:coverage           # 커버리지
npm run test:e2e                # Playwright E2E
```

## 3. Production Build

```powershell
npm run build                   # Next.js build
npm run start                   # 로컬 production 모드 확인
```

## 4. Deployment (Vercel Hobby)

### 4.1 자동 배포
- `main` 브랜치 push → Vercel 자동 배포 (~2분)
- PR 생성 → preview deployment

### 4.2 환경변수 관리
- Vercel Dashboard → Project → Settings → Environment Variables
- Production / Preview / Development 분리

### 4.3 DB Migration 적용 (Hobby 제약)
- Vercel build 단계에서 `prisma migrate deploy` 실패 (READ ONLY 환경)
- **수동 적용**: Supabase Studio → SQL Editor 에서 migration SQL 직접 실행
- 예: `ALTER TABLE "EvaluationResult" ADD COLUMN "acousticFeatures" JSONB;`

## 5. Current File Structure (top-level)

```
Speech-Therapy_project_root/
├── Speech-Therapy_App/        # 본 Next.js 앱
│   ├── app/                   # App Router (Server Components + Server Actions)
│   ├── lib/                   # 도메인 모듈 (auth, supabase, ratelimit, ai, ...)
│   ├── prisma/                # schema + migrations + seed
│   ├── __tests__/             # Vitest unit
│   ├── e2e/                   # Playwright E2E
│   ├── public/                # 정적 자산
│   ├── docs/                  # PRD / SRS
│   ├── tasks/                 # TASK_*.md, 보고서
│   ├── .cursor/skills/        # Cursor 스킬 (본 디렉터리)
│   ├── .claude/skills/        # Claude 스킬 (.agents/ 복사본)
│   ├── .agents/skills/        # 도구 공통 canonical 스킬
│   ├── AGENTS.md              # 최상위 룰
│   ├── CLAUDE.md              # Claude Code 추가 룰
│   └── package.json
├── Prompt/                    # 대화기록_YYYY-MM-DD.md
└── Speech-Therapy_Workbase/   # raw assets (gitignore)
```

## 6. 검증 체크리스트

배포 전:
- [ ] `npm run lint` clean
- [ ] `npm run test` 모두 pass
- [ ] `npm run build` 성공
- [ ] `.env.local` 의 secret 이 `.gitignore` 에 의해 차단됨
- [ ] Prisma migration 필요 시 Supabase Studio 에 수동 SQL 적용 완료
