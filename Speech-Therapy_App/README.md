# Speech-Therapy App

영유아 발음 발달 확인 + 또래 비교 리포트 보조 도구. **의료적 판단이 아닌 부모용 발달 안내**입니다.

상위 프로젝트: `Speech-Therapy_project_root` (위키 + 기획 산출물 + 본 앱).
스택: **Next.js 16 · React 19 · Prisma 7 (PostgreSQL via Supabase) · Vercel AI SDK + Google Gemini · Tailwind v4 · Zod**.

---

## 개발 환경

### 사전 요구
- Node.js **≥ 20.9** (LTS) — Next.js 16 요구. 본 환경은 24.x 사용.
- npm 10+
- PowerShell (Windows) — `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 1회 실행 필요.

### 클론 + 첫 부팅
```powershell
git clone https://github.com/hjh890989-web/Speech-Therapy_project_root.git
cd "Speech-Therapy_project_root/Speech-Therapy_App"
npm install
cp .env.example .env    # 후 값 채워넣기 (아래 § 환경 변수 참고)
npx prisma generate
npm run dev             # → http://localhost:4000
```

### 주요 스크립트
| 명령 | 동작 |
|---|---|
| `npm run dev` | dev 서버 (port 4000, Turbopack) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 (port 4000) |
| `npm run lint` | ESLint |
| `npm run db:seed` | Prisma seed (`tsx prisma/seed.ts`) |
| `npx prisma migrate dev` | 로컬 dev 마이그레이션 |
| `npx prisma migrate deploy` | 운영 환경 마이그레이션 |
| `npx prisma studio` | DB GUI |

---

## 환경 변수

`.env` (또는 Vercel Dashboard) 에 등록. **`.env` 는 절대 git commit 금지** (.gitignore 차단됨).

| 변수 | 용도 | 어디서 받나 |
|---|---|---|
| `DATABASE_URL` | Prisma 런타임 (Supabase Transaction pooler, port 6543, `?pgbouncer=true`) | Supabase ⚙️ → **Connect** → ORMs → Prisma |
| `DIRECT_URL` | Prisma migrate 전용 (port 5432) | 동일 모달 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL (브라우저 노출 OK) | Supabase ⚙️ → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public 키 | 동일 페이지 |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회 (서버 전용 — **클라이언트 노출 금지**) | 동일 페이지 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini (Vercel AI SDK) | https://aistudio.google.com/apikey |
| `SLACK_WEBHOOK_URL` | HITL 큐 알림 (D4 대체) | Slack App → Incoming Webhooks |
| `INTERNAL_API_SECRET` | `/api/hitl/queue` 내부 호출 인증 | 임의 강력한 문자열 (32 bytes+) |

### Mock 환경 변수 (개발 전용)
| 변수 | 동작 |
|---|---|
| `USE_MOCK_DIAGNOSIS=true` | `analyzeDiagnosis` MOCK 응답 사용 |
| `USE_MOCK_CURRICULUM=true` | `getCurriculum` MOCK 사용 |
| `USE_MOCK_REWARD=true` | `grantReward` MOCK 사용 |
| `USE_MOCK_HITL=true` | HITL 큐 MOCK |
| `USE_MOCK_B2B=true` | B2B 승인 MOCK |
| `USE_MOCK_CONSENT=true` | 동의서 MOCK |

> Production (`VERCEL_ENV=production` 또는 `NODE_ENV=production`) 에선 강제 비활성.

---

## 디렉토리 구조

```
Speech-Therapy_App/
├── app/                          # Next.js App Router
│   ├── (public)/                 # 무로그인 라우트 그룹
│   │   └── diagnose/             # 5분 진단 (FR-Q-001)
│   │       └── result/[sessionId]  # 또래 비교 리포트 (FR-Q-002)
│   ├── actions/                  # Server Actions (API-001~004 stub)
│   ├── api/                      # Route Handlers (API-005~008 stub)
│   └── generated/prisma/         # Prisma 7 생성물 (gitignored)
├── lib/
│   ├── db.ts                     # Prisma 싱글톤 (DB-001)
│   ├── reward.ts                 # 보상 UPSERT (DB-008)
│   ├── weekly-report.ts          # 주간 리포트 집계 (DB-007)
│   ├── hitl.ts                   # HITL 큐 헬퍼 (DB-009)
│   ├── text-safety.ts            # 금칙어 sanitize (FR-Q-002 인라인)
│   ├── forbidden-words.ts        # 금칙어 정규식 단일 소스 (FR-C-005)
│   ├── hooks/                    # React 훅 (useSpeechRecognition)
│   ├── schemas/                  # Zod 스키마 10종 (API-001~012)
│   └── mocks/                    # MOCK-001~003 (9 모듈)
├── prisma/
│   ├── schema.prisma             # 10 모델 + RLS migration
│   ├── seed.ts                   # admin + parent + 기관 + 미션 25
│   └── migrations/               # init_postgresql + enable_rls_policies
├── proxy.ts                      # Next.js 16 proxy (구 middleware, FR-C-005 골격)
├── prisma.config.ts              # Prisma 7 config (DIRECT_URL 우선)
├── next.config.ts
├── vercel.json                   # maxDuration 60s
└── tsconfig.json
```

---

## Vercel 배포 (INFRA-001)

### 첫 배포 가이드

1. **Vercel 계정 가입** — https://vercel.com → GitHub 계정으로 가입
2. **GitHub 레포 연결**
   - Vercel Dashboard → **New Project**
   - "Import Git Repository" → `hjh890989-web/Speech-Therapy_project_root` 선택
   - **Root Directory**: `Speech-Therapy_App` (상위 프로젝트 안에 있으므로 반드시 지정)
   - Framework Preset: Next.js (자동 감지)
3. **환경 변수 등록**
   - Settings → **Environment Variables** → 위 표의 8종 등록
   - Production / Preview / Development 모두 동일 값 (또는 환경별 분리)
4. **Pro 플랜 (선택)**
   - 무료(Hobby) 도 첫 배포 가능
   - 60초 timeout + Cron 4종 필요 시 → Pro $20/월
5. **첫 배포 트리거**
   - `git push origin main` → 자동 Production 배포
   - PR 생성 → 자동 Preview URL
6. **검증**
   - Production URL `https://<project>.vercel.app/diagnose` 접근
   - Disclaimer 3중 노출 + Web Speech (HTTPS 환경 필수)

### 추후 자동화
- `git push` 만으로 자동 배포
- PR 코멘트에 Preview URL 자동 게시
- `vercel.json` 의 `maxDuration: 60` 적용 (Pro 플랜에서만)

### 비용 가드 (G2)
- Vercel Pro: $20/월 고정
- Bandwidth / Function 호출 임계 시 알림 설정 권장

---

## DB 마이그레이션 흐름

Prisma 7 `prisma.config.ts` 가 dotenv 로 `.env` 를 로드.

| 명령 | 사용 URL | 용도 |
|---|---|---|
| `prisma migrate dev` | `DIRECT_URL` (pgBouncer 우회) | 로컬 dev 마이그레이션 (idempotent) |
| `prisma migrate deploy` | `DIRECT_URL` | 프로덕션 마이그레이션 (자동 batch) |
| Server Action runtime | `DATABASE_URL` (pooler 6543) | 사용자 요청 처리 |

새 모델 추가 → `prisma/schema.prisma` 수정 → `npx prisma migrate dev --name <설명>` → git commit.

---

## 참고 문서

- 본 앱의 PRD/SRS: `docs/54_PRD_V10_Final.md`, `docs/64_SRS_V05_Merged_Master_Final.md`
- 92개 태스크 명세: `tasks/TASK_*.md`
- 위키 (의사결정 근거): `../Speech-Therapy_Workbase/wiki/`
- Sprint 1 의존성 그래프: `../Speech-Therapy_Workbase/wiki/product/concepts/Sprint-1-Dependency-Graph.md`

---

## Disclaimer

본 서비스는 **의료적 판단을 제공하지 않습니다**. 부모님께 발달 확인 정보를 안내하기 위한 보조 도구이며, 발달이 우려되는 경우 전문가 상담을 권장합니다.
