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
│   │   └── diagnose/             # 5분 발음 확인 (FR-Q-001)
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

### Cron Jobs (INFRA-002)

`vercel.json` `crons` 배열에 6종 모두 **등록 완료**. Hobby plan 에서는 실제 활성은 1개로 제한되며 (Vercel 측에서 첫 항목만 채택), Pro plan 전환 시 별도 코드 변경 없이 **6종 모두 자동 활성**.

| # | Path | Schedule | 책임 | Hobby 활성 | Pro 활성 |
|---|---|---|---|---|---|
| 1 | `/api/cron/hitl-monitor` | `0 0 * * *` (매일 0시 UTC) | HITL 24h+ pending → escalated (bulk updateMany) + 집계 Slack alert | ✅ | ✅ (필요 시 `0 * * * *` 매시간으로 변경) |
| 2 | `/api/cron/audio-cleanup` | `0 3 * * 0` (일요일 3시 UTC) | 음성 7일 폐기 (D6 — Sprint 1 No-op) | ❌ (등록만) | ✅ |
| 3 | `/api/cron/weekly-reports` | `0 3 * * 0` (일요일 3시 UTC) | 주간 리포트 집계 → upsert | ❌ (등록만) | ✅ |
| 4 | `/api/cron/consent-reminder` | `0 9 * * *` (매일 9시 UTC) | D+3 동의서 미서명 리마인더 (P2 stub) | ❌ (등록만) | ✅ |
| 5 | `/api/cron/error-monitor` | `*/5 * * * *` (5분 주기) | 에러 burst 감지 + Slack alert (MON-002) | ❌ (등록만, Hobby 시간 단위 미지원) | ✅ |
| 6 | `/api/cron/hitl-escalation` | `0 * * * *` (매시 정각) | HITL 24h+ per-item Slack 재알림 + escalatedAt 멱등 마킹 (FR-C-014) | ❌ (등록만, Hobby 시간 단위 미지원) | ✅ |

> **hitl-monitor vs hitl-escalation 책임 분리**:
> - `hitl-monitor` (#1, 매일 1회): bulk `updateMany` — 1쿼리 일괄 escalated 마킹 + 집계 Slack 1건 + SLA 임박 / 전문가 부담 알림.
> - `hitl-escalation` (#6, 매시 1회): per-item `findMany` → 각 항목별 Slack 재알림 (확인 가능) → `escalatedAt IS NULL` 멱등 update.
> - race-condition 안전: 두 cron 동일 항목 처리 시 후순위는 `WHERE escalatedAt IS NULL` 가드로 0 update (중복 Slack 위험 1회만).

> **Vercel Hobby 한도** ([공식 문서](https://vercel.com/docs/cron-jobs/usage-and-pricing)):
> - cron **1개 슬롯** + **일 단위 schedule** 만 지원 (시간 단위 / 분 단위 미지원).
> - 본 프로젝트는 첫 항목 (`hitl-monitor`, 매일 0시) 만 Hobby 환경에서 실행됨.
>
> **Vercel Pro 전환 시** ($20/월):
> - `vercel.json` 코드 변경 **0** — 등록된 5종 cron 자동 활성.
> - `*/5 * * * *` (error-monitor 5분 주기), `0 * * * *` (매시간) 등 fine-grained schedule 즉시 동작.
> - 활성화 절차: ① Vercel Dashboard → Settings → Plan 에서 Pro 업그레이드, ② 다음 배포 시 자동 반영 (별도 코드 push 불필요), ③ Vercel Dashboard → Cron Jobs 탭에서 5개 항목 + Next Run 시각 확인.

**Status Page**: `/status` — 사용자 가시화용 서비스 운영 상태 페이지 (MON-004, REQ-NF-007).

### CRON_SECRET 인증
Cron 핸들러는 `Authorization: Bearer ${CRON_SECRET}` 검증. Vercel Dashboard → Environment Variables 에서 등록.
- 미설정 시 dev / preview 에선 통과, production 에선 401 반환 (외부 차단).

### 비용 가드 (G2)
- Vercel Pro: $20/월 고정
- Bandwidth / Function 호출 임계 시 알림 설정 권장

---

## 음성 미저장 정책 (FR-C-004 / D6)

**Sprint 1 정책**: 음성 원본 파일은 **서버에 전송되지 않으며, 어디에도 저장되지 않습니다**.

### 보장 메커니즘

| 보장 | 위치 | 검증 |
|---|---|---|
| 클라이언트 측 STT | `lib/hooks/useSpeechRecognition.ts` (Web Speech API) | 브라우저 mic stream → `transcript` 문자열만 추출 |
| Server Action 입력 차단 | `lib/schemas/diagnosis.ts` `DiagnosisInputSchema` | Zod schema 에 audio binary 필드 0개 — text/number only |
| 평가 결과 DB | `prisma/schema.prisma` `EvaluationResult` | audio blob/path 컬럼 없음 — score + transcript hash 만 |
| Storage 버킷 | Supabase Storage `audio` | Sprint 1 엔 0 objects, RLS 익명 업로드 차단 (외부 setup) |
| Cron 폐기 | `/api/cron/audio-cleanup` | 7일 초과 객체 삭제 — Sprint 1 No-op (P2 대비 사전 구축) |

### REQ / R 매핑

- **REQ-FUNC-005**: ≤7일 폐기 (Sprint 1 미저장 → 자동 충족)
- **REQ-NF-016**: Storage 보관 ≤ 7일
- **CON-03**: 음성 7일 폐기
- **R4 보호**: 영유아 음성 무단 수집 / 유출 리스크 → 서버 미저장으로 영향 0
- **R8 보호**: Supabase Free 1GB Storage 비용 압박 → 미저장 정책으로 즉시 보호

### P2 음성 저장 활성화 가이드

향후 P2 단계 (Zero-touch 교실 태블릿 등) 에서 음성 저장이 필요해질 때:

1. **DB 마이그레이션** — `prisma/schema.prisma` 에 `SessionLog.audioStorageUri` 컬럼 추가 (또는 기존 `audioVectorUri` 활용)
2. **Storage 업로드 경로** — `Speech-Therapy_App/lib/storage/audio.ts` 신규, presigned URL 발급 + 사용자 inplace 업로드
3. **Supabase Storage RLS 정책** (외부 Dashboard 작업):
   - 익명 업로드 차단
   - authenticated 사용자만 자기 path 에 업로드 (`auth.uid()::text = (storage.foldername(name))[1]`)
   - admin 역할만 삭제 가능
4. **Cron 활성화** — `vercel.json` 의 `crons` 배열에 `audio-cleanup` 추가 (Hobby 슬롯 정리 또는 Pro 전환 후)
5. **검증 1회 수동** — `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/audio-cleanup` → `deletedObjects` 정확 동작 확인
6. **CRON_SECRET 등록 검증** — Vercel Production 환경 변수 설정 + 마스킹 로그

→ 본 라우트 ([`app/api/cron/audio-cleanup/route.ts`](app/api/cron/audio-cleanup/route.ts)) 는 P2 활성 시 코드 변경 0 으로 즉시 동작.

---

## DB 마이그레이션 흐름

Prisma 7 `prisma.config.ts` 가 dotenv 로 `.env` 를 로드.

| 명령 | 사용 URL | 용도 |
|---|---|---|
| `prisma migrate dev` | `DIRECT_URL` (pgBouncer 우회) | 로컬 dev 마이그레이션 (idempotent) |
| `prisma migrate deploy` | `DIRECT_URL` | 프로덕션 마이그레이션 (자동 batch) |
| Server Action runtime | `DATABASE_URL` (pooler 6543) | 사용자 요청 처리 |

새 모델 추가 → `prisma/schema.prisma` 수정 → `npx prisma migrate dev --name <설명>` → git commit.

### HITLQueue RLS 적용 (DB-009 §RLS / #21 잔여 — 2026-05-22)

`20260522192300_add_hitl_queue_rls/migration.sql` 가 기존 HITLQueue 의 RLS 정책에 5종을 추가 (select_own / select_expert / insert_system / update_expert / delete_admin). 기존 2종 (`hitl_select_visible`, `hitl_update_assigned_expert`) 은 보존 — PG 가 같은 커맨드 다중 정책을 OR 합성.

운영 적용 절차 (사용자 수동 — 자동 실행 금지):

```powershell
cd Speech-Therapy_App
npx prisma migrate status     # 본 migration pending 확인 (drift 점검)
npx prisma migrate deploy     # DIRECT_URL 사용, 자동 batch
```

Supabase Studio SQL Editor 검증:

```sql
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid = 'public."HITLQueue"'::regclass
ORDER BY polname;
```

기대 결과 — 총 7개 정책 (기존 2 + 신규 5):

| 정책명 | 커맨드 | 조건 요약 |
|---|---|---|
| `hitl_queue_delete_admin` | DELETE | JWT role = admin |
| `hitl_queue_insert_system` | INSERT | WITH CHECK (false) — service_role 만 우회 |
| `hitl_queue_select_expert` | SELECT | JWT role ∈ (expert, admin, principal) |
| `hitl_queue_select_own` | SELECT | auth.uid()::text = userId |
| `hitl_queue_update_expert` | UPDATE | JWT role ∈ (expert, admin) |
| `hitl_select_visible` | SELECT | 본인 userId / assignedExpertId / User.role=admin |
| `hitl_update_assigned_expert` | UPDATE | auth.uid()::text = assignedExpertId |

> **주의**: `lib/hitl.ts::enqueueForReview` 는 Prisma 의 `postgres` role 연결 (DATABASE_URL/DIRECT_URL) 로 RLS 우회. `WITH CHECK (false)` 는 Supabase JS 클라이언트 (anon/authenticated key) 의 직접 INSERT 시도만 차단 → 응용 코드 영향 0.

---

## CI (GitHub Actions)

`.github/workflows/ci.yml` 가 모든 `push` (main / develop) + `pull_request` (main) 시 자동 실행.

| Job | 검증 항목 | 활성 조건 |
|---|---|---|
| `quality-gate` | `tsc --noEmit` + `eslint` + `vitest run` | 항상 실행 (Node 24 + npm cache) |
| `prisma-drift` | `npx prisma migrate status` (schema ↔ DB migration history 일치) | `DATABASE_URL` + `DIRECT_URL` secrets 등록 시에만 실행, 미설정 시 자동 skip |

### prisma-drift 활성화 절차 (1회)

> RewardLog RLS schema drift 같은 사고 (2026-05-22 SEC-002 sub-session) 재발 방지를 위한 게이트.

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
2. 다음 2개 secret 등록:
   - `DATABASE_URL` — Supabase Transaction pooler (`?pgbouncer=true`, port 6543, 위 § 환경 변수 표와 동일 값)
   - `DIRECT_URL` — Supabase Direct connection (port 5432, prisma migrate 전용)
3. 다음 push / PR 부터 `prisma-drift` job 이 자동 활성. 실패 시 빌드 fail → 머지 차단 가능.

### 브랜치 보호 권장 설정

GitHub repo → **Settings** → **Branches** → **Branch protection rules** → `main` 추가:

- ✅ Require status checks to pass before merging
  - 필수 체크: `quality-gate (tsc + lint + vitest)`, (secrets 등록 후) `prisma-drift (migrate status)`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings (관리자 포함)

### CI 실패 시 대응

- **quality-gate 실패** → 로컬 `npm run lint && npx tsc --noEmit && npm test` 재현 + 수정 후 재푸시
- **prisma-drift 실패** → schema.prisma 와 운영 DB 의 migration history 가 어긋남. `npx prisma migrate status` 로 미적용 migration 확인 → `npx prisma migrate deploy` (운영) 또는 hotfix PR 로 schema 보정

---

## Gemini Rate Limiter (SEC-004)

비용 가드 + 무료 티어 보호. 구현: [`lib/ratelimit.ts`](lib/ratelimit.ts), 통합: [`lib/ai/gemini.ts`](lib/ai/gemini.ts).

### 한도

| 보호 | 임계 | 위반 시 |
|---|---|---|
| 글로벌 RPM | 14 (sliding window 60s, Gemini free 15 안전 마진 1) | `RateLimitedError(GLOBAL_RPM)` + `retryAfterSec` |
| 사용자당 일 | 50회 (24h sliding) | `RateLimitedError(USER_DAILY)` + `retryAfterSec` |
| 일 글로벌 비용 | $1.00 — 80% 임계 (~$0.80) | Slack 알림 1회 (`SLACK_WEBHOOK_URL`) + 호출 계속 |

### 비용 추정 모델

- gemini-2.5-flash-lite: $0.075/M input + $0.30/M output
- 호출 평균 200 in + 150 out → `COST_PER_CALL_USD = $0.000060`
- 일 임계 $1.00 ≈ 16,667 calls (RPM 14 max throughput 20,160/일 대비 안전)
- REQ-NF-018 매핑: 유저 월 ≤ ₩5,250 ≈ $4 → 일 $0.13 (1유저) → 1,000 MAU 가정 시 일 $130 (월 $4K)

### 환경 prefix

- `VERCEL_ENV` 우선 (production/preview/development), 없으면 `NODE_ENV`, 최종 fallback `dev`
- 단일 Vercel 인스턴스 in-memory 카운터 — Hobby single region 가정. Edge multi-instance 운영 시 §E-2 후속 (Upstash Redis 어댑터 교체) 필요

### 환경 변수

| 키 | 용도 | 부재 시 |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 호출 (필수) | 호출 자체 실패 |
| `SLACK_WEBHOOK_URL` | 80% 임계 알림 | 알림 silent skip (graceful) |
| `VERCEL_ENV` | 환경 prefix (Vercel 자동) | NODE_ENV fallback |

### 호출 측 통합

`generateJson` / `generatePlainText` 호출 시 `userId` 전달 — 미전달 시 rate limiter 미적용 (legacy 호환).

```ts
import { generateJson } from "@/lib/ai/gemini";

const result = await generateJson({
  system: "...",
  prompt: "...",
  schema: MySchema,
  userId: authenticatedUserId,  // ← rate limiter 강제
});
```

### 모니터링

```ts
import { getRateLimitDailyStats } from "@/lib/ratelimit";
const stats = getRateLimitDailyStats();
// { envPrefix, callCount, estimatedCostUsd, costThresholdUsd, alertPercent, alertSent }
```

### 별도 task (§E-2 후속)

- Upstash Redis 도입 (다중 인스턴스 정확 카운터) — AGENTS.md §3 "Redis 스택 외" 정책 변경 필요
- 토큰 단위 정밀 비용 추적 (현재는 호출당 평균 추정)
- Vercel Cron 으로 자정 UTC 정확 리셋 (현재는 sliding 24h)

---

## 참고 문서

- 본 앱의 PRD/SRS: `docs/54_PRD_V10_Final.md`, `docs/64_SRS_V05_Merged_Master_Final.md`
- 92개 태스크 명세: `tasks/TASK_*.md`
- 운영 런북 (CS 4h / HITL 48h SLA, D4): [`docs/ops-runbook.md`](docs/ops-runbook.md)
- CS 응답 카피 템플릿 (CON-04 준수): [`docs/cs-templates.md`](docs/cs-templates.md)
- 인시던트 post-mortem 템플릿: [`docs/postmortem-template.md`](docs/postmortem-template.md)
- 보안 정책: [`docs/security-policy.md`](docs/security-policy.md)
- 위키 (의사결정 근거): `../Speech-Therapy_Workbase/wiki/`
- Sprint 1 의존성 그래프: `../Speech-Therapy_Workbase/wiki/product/concepts/Sprint-1-Dependency-Graph.md`

---

## Disclaimer

본 서비스는 **의료적 판단을 제공하지 않습니다**. 부모님께 발달 확인 정보를 안내하기 위한 보조 도구이며, 발달이 우려되는 경우 전문가 상담을 권장합니다.
