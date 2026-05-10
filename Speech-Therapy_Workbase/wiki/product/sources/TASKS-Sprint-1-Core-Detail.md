---
type: source
pillar: product
title: Sprint 1 Core 8 Task — Detailed G/W/T·Files·Build·Verify (TASKS/ 11 파일 통합)
source_path: ../../../raw/TASKS/TASK_DB-001.md
source_path_b: ../../../raw/TASKS/TASK_DB-002.md
source_path_c: ../../../raw/TASKS/TASK_DB-005.md
source_path_d: ../../../raw/TASKS/TASK_DB-006.md
source_path_e: ../../../raw/TASKS/TASK_DB-008.md
source_path_f: ../../../raw/TASKS/TASK_API-001.md
source_path_g: ../../../raw/TASKS/TASK_FR-Q-001.md
source_path_h: ../../../raw/TASKS/TASK_FR-C-001.md
source_path_i: ../../../raw/TASKS/TASK_FR-Q-002.md
source_path_j: ../../../raw/TASKS/TASK_FR-C-009.md
source_path_k: ../../../raw/TASKS/TASK_INFRA-001.md
source_type: task_detail
authors: []
year: 2026
ingested: 2026-05-09
tags: [Sprint1, TaskDetail, G/W/T, Files, Verify, MVP, 클러스터TASKS]
---

# Sprint 1 Core 8 — 11 TASK_*.md 통합 상세

[[product/concepts/task-breakdown-overview]] § Sprint 1 의 8 코어를 11개 개별 TASK_*.md (DB-002+005+006+008 묶음) 정독 기반으로 상세화. **개발 시작 시 직접 참조용 명세**.

## Task 파일 표준 구조 (정독 패턴)

각 TASK_*.md = 80-100줄 + 7 섹션:
1. **🎯 Summary** — Task ID, Epic, Phase, Mode, Descope, 목적
2. **🔗 References** — SRS REQ-FUNC/NF + Task 강화판 + 검토 보고서
3. **✅ Task Breakdown** — 체크리스트 (실행 단계)
4. **🧪 Acceptance Criteria** — Given/When/Then 시나리오 다수
5. **⚙️ Technical & Non-Functional Constraints** — REQ-NF + 횡단 제약 + 리스크 매핑
6. **🏁 Definition of Done** — 완료 기준 체크리스트
7. **🚧 Dependencies & Blockers** — Depends on / Blocks / Discope 영향

라벨: `phase:p0, mode:active, domain:db|api|fr-q|fr-c|infra, epic:foundation|f1-a|...|f12, sprint:1`

---

## 1. DB-001 · Prisma + Supabase 부트스트랩 (1d)

**Epic**: Foundation / **Mode**: 명세대로 / **Depends on**: None (Foundation 진입점)

### 핵심 Files
- `prisma/schema.prisma` (datasource provider env 분기: SQLite dev / PostgreSQL prod)
- `.env.local`, `.env.production`, `.env.example`, `.gitignore`
- `lib/db.ts` — PrismaClient 싱글톤 패턴 (Next.js Hot Reload 대비)

### Build (체크리스트 9건)
- `npx create-next-app@latest` (TypeScript + App Router + Tailwind + ESLint)
- `npm i -D prisma` + `npx prisma init`
- Supabase 신규 프로젝트 생성 + DATABASE_URL (Connection Pooling) 추출
- `npx prisma migrate dev --name init` (빈 스키마)
- `npm i @supabase/ssr` (후속 Auth 준비)

### G/W/T (3 시나리오)
1. dev 환경 마이그레이션 성공 → `prisma/dev.db` 생성, exit 0
2. prod DB 연결 검증 → `npx prisma db pull` 빈 스키마 반환
3. PrismaClient 타입 추출 → `import { prisma } from '@/lib/db'` 자동완성

### Constraints
- C-TEC-003 dev=SQLite / prod=Supabase PostgreSQL 강제
- 비용 가드레일 G2: Free 시작 → 1GB 임계 시 Pro

### **Blocks**: DB-002, DB-004, DB-005, DB-006, DB-008, DB-009, DB-011, API-001, API-004, API-011, INFRA-001

---

## 2. DB-002 · users 테이블 + RBAC enum (1d, 묶음 일부)

**Epic**: User / **Depends on**: DB-001

### 핵심 스키마
```prisma
enum Role { parent | teacher | principal | expert | admin }
enum SubscriptionTier { free | basic | premium }

model User {
  id String @id @default(uuid())
  role Role
  childAgeMonths Int?
  subscriptionTier SubscriptionTier @default(free)
  email String? @unique  // Supabase Auth 연결용
  createdAt DateTime @default(now())
}
```

### G/W/T
1. 부모 사용자 생성 → UUID 자동, 모든 필드 저장
2. enum 외 값 차단 → tsc 컴파일 에러로 차단
3. 시드 스크립트 동작 → admin 1명 + 부모 1명 INSERT

### Constraints (R4 리스크 완화)
- **개인정보 최소화**: 자녀 이름·생년월일·주소 미저장. **월령(개월수)만**.

### **Blocks**: DB-004, DB-008, DB-009, DB-011, API-010, FR-C-009

---

## 3. DB-005 · evaluation_results (3축 + 백분위 + Confidence) (1d, 묶음 일부)

**Epic**: F1-a / **Depends on**: DB-001, DB-002

### 핵심 스키마
```prisma
model EvaluationResult {
  id String @id @default(uuid())
  sessionId String @unique
  userId String
  articulationScore Float    // 조음
  linguisticScore Float       // 언어
  acousticScore Float          // 음향
  peerPercentile Float
  confidence Float
  hitlReviewed Boolean @default(false)
  aiCushionText String?       // CON-04 금칙어 검증
  targetPhoneme String
  childAgeMonths Int
  createdAt DateTime @default(now())
  user User @relation(...)
  @@index([userId, createdAt])  // 주간 리포트 쿼리 성능
}
```

### G/W/T
1. 3축 점수 INSERT → row 생성, hitlReviewed=false
2. 점수 범위 검증 (TS) → Zod `z.number().min(0).max(100)`
3. userId+createdAt 인덱스 활용 → 100 row 중 7개 조회 ≤ 50ms

### Constraints
- REQ-NF-001: DB INSERT 자체 ≤ 100ms 목표
- CON-04 aiCushionText 금칙어 검증 (Server Action 단계)
- 음성 원본 URI **미저장** (session_logs로 분리, 7일 폐기)

### **Blocks**: API-001, FR-Q-002, FR-C-001, DB-007, DB-009

---

## 4. DB-006 · mission_cards + 25 시드 (1d, 묶음 일부)

**Epic**: F3-a / **Depends on**: DB-001 / **⚠️ Sprint 1엔 시드만, UI는 P1**

### 핵심 스키마
```prisma
model MissionCard {
  id, targetPhoneme (예: "ㅅ", "ㅈ"),
  difficultyLevel Int (1~5),
  rewardType String,
  title, instructionText, mediaUri,
  ageRangeMin, ageRangeMax  // 만 2~7세 매핑
  @@index([targetPhoneme, difficultyLevel])  // getCurriculum 조회용
}
```

### 시드: 한국어 음소 5종 (/ㅅ/ /ㅈ/ /ㄱ/ /ㄴ/ /ㄹ/) × 5단계 = **25개**

### Constraints (콘텐츠)
- 한국어 음운론 위계 준수: **파열음 → 마찰음 → 파찰음 → 유음**
- instructionText 의료 용어 ("치료", "진단") 금지

### **Blocks**: DB-004, API-002, FR-Q-003 (P1), FR-C-008 (P1)

---

## 5. DB-008 · reward_progress (UPSERT 패턴) (1d, 묶음 일부)

**Epic**: F12 / **Depends on**: DB-001, DB-002

### 핵심 스키마
```prisma
model RewardProgress {
  id, userId @unique,  // 사용자당 1 row 보장 (UPSERT)
  cumulativeStars Int @default(0),
  treeGrowthLevel Int @default(0),
  aiDrawingCount Int @default(0),
  updatedAt @updatedAt
  user User @relation(onDelete: Cascade)
}
```

### 헬퍼: `lib/reward.ts`의 `incrementStars(userId, n)` UPSERT

### G/W/T
1. 첫 보상 INSERT (row 없음) → 신규 row, stars=1
2. 누적 UPSERT → 10+5=15
3. **동시성 안전성** → 5건 병렬 → 최종 합산 정확 (Prisma 트랜잭션 또는 raw SQL `INCR`)

### Constraints
- REQ-NF-005: ≤ 500ms 보상 UI / DB UPSERT ≤ 100ms
- **멱등성**: 동일 발화 세션 보상 1회만 (`grantReward()` API에서 키 검증)
- D5 디퍼: Sprint 1엔 온라인 전제. PWA 오프라인 IndexedDB는 P1

### **Blocks**: API-004, FR-C-009, FR-Q-004 (P1), TEST-009

---

## 6. API-001 · analyzeDiagnosis() Zod 스키마 (0.5d)

**Epic**: F1-a / **Mode**: D7 부분 적용 (audioBlob → STT 텍스트) / **Depends on**: DB-005

### 핵심 Files
- `lib/schemas/diagnosis.ts` (Zod 입출력)
- `app/actions/diagnosis.ts` (`'use server'` + 시그니처)

### Zod Input Schema
```typescript
{
  transcript: z.string().min(1).max(2000),  // Web Speech 결과
  acousticFeatures: z.object({...}).optional(),  // Sprint 1 nullable
  childAgeMonths: z.number().int().min(24).max(84),  // 만 2~7세
  targetPhoneme: z.enum(['ㅅ','ㅈ','ㄱ','ㄴ','ㄹ']),  // 시드 5종
  userId: z.string().uuid().optional()  // 무로그인 진단 허용
}
```

### Zod Output Schema
```typescript
{
  articulationScore, linguisticScore, acousticScore: 0-100,
  peerPercentile: 0-100,
  confidence: 0-100,
  aiCushionText: string,  // 금칙어 0건 보장
  requiresHITL: boolean  // confidence < 70 자동 true
}
```

### Error Codes Enum
`INVALID_INPUT | STT_FAILED | LLM_TIMEOUT | INTERNAL_ERROR`

### G/W/T (4 시나리오)
1. 정상 입력 검증 통과
2. 빈 transcript → ZodError → INVALID_INPUT
3. 월령 100 (8세 이상) → ZodError
4. 출력 스키마 강제 → 0~100 외 또는 필드 누락 시 throw

### Constraints
- REQ-NF-001 p95 ≤ 800ms (구현 단계 책임 — 본 태스크는 계약만)
- C-TEC-002 Server Action (`'use server'`)
- 보안: transcript 로깅 시 마스킹 (개인 발화 보호)
- **D7 명시**: SRS §3.5 audioBlob → 본 태스크 STT 텍스트 변경. SRS 본문 무손상 보존

### **Blocks**: FR-C-001, MOCK-001, FR-Q-001, TEST-001

---

## 7. FR-Q-001 · 무로그인 5분 진단 SSR + Web Speech API (1d)

**Epic**: F1-b / **Depends on**: DB-001, API-001

### 핵심 Files
- `app/(public)/diagnose/page.tsx` (SSR)
- `lib/hooks/useSpeechRecognition.ts` (Web Speech API 커스텀 훅)

### 입력 폼 (≤ 3 항목)
- 자녀 월령 slider (24~84)
- 타겟 음소 select (5종)
- 부모 연락처 (선택, 결과 발송)

### Web Speech API
```typescript
{ lang: 'ko-KR', continuous: false }
```

### shadcn/ui 컴포넌트
`button input select slider` (`npx shadcn-ui@latest add ...`)

### G/W/T (5 시나리오)
1. SSR 렌더 LCP ≤ 1,500ms (Vercel Analytics)
2. 입력 폼 ≤ 3 항목 (월령·음소·동의)
3. Web Speech 동작 → "사과" → transcript state
4. 5분 체류 측정 ≤ 300초
5. 마이크 권한 거부 → shadcn/ui Dialog "OS 설정 이동"

### Constraints
- REQ-NF-003 PWA Cold Start ≤ 1.5초 (SW는 P1)
- CON-04 페이지 카피 금칙어 0건 ("발음 발달 확인" 등 비의료)
- **Disclaimer 100%**: 페이지 상단 + 하단 (REQ-FUNC-011 결과 페이지 책임이지만 진입에도 사전 고지)
- 접근성: 슬라이더 키보드 조작, aria-label 필수
- 모바일 우선: Tailwind `sm:` 기본
- **R7 영향 없음**: SSR 정적 렌더링, 데이터 페치 없음

### **Blocks**: FR-C-001 (이 페이지가 호출), FR-Q-002 (결과 이동), TEST-004

---

## 8. FR-C-001 · 3축 스코어링 Server Action (1.5d) ⭐ Sprint 1 최복잡

**Epic**: F1-a / **Mode**: D1+D7 단순화 (Web Speech + 일반 SA, Edge Runtime 미사용) / **Depends on**: DB-001/005, API-001/011, SEC-004

### 8단계 비즈니스 로직 (`app/actions/diagnosis.ts`)
1. **입력 검증** — `InputSchema.parse(input)` (API-001 Zod)
2. **Gemini 호출** — `geminiClient.generateContent(prompt)` (API-011)
   - 프롬프트: 발화 텍스트 + 월령 + 타겟 음소 → JSON `{articulation, linguistic, acoustic, confidence}`
   - 시스템 프롬프트: "의료 진단 표현 금지" 명시
3. **또래 백분위 계산** — `prisma.evaluationResult.findMany({where: {childAgeMonths, targetPhoneme}})` 후 z-score → 백분위
   - **Sprint 1 초기 데이터 부족 → 정규분포 가정 시드 100건 사전 INSERT**
4. **AI 쿠션 텍스트 생성** — Gemini 별도 호출 ("부모 안심 1~2문장")
5. **금칙어 검증** — 정규식 `/(진단|장애|치료|환자)/` 스캔, 발견 시 재생성 1회
6. **DB INSERT** — `prisma.evaluationResult.create()`
7. **HITL 결정** — `requiresHITL = confidence < 70`
8. **출력 검증** — `OutputSchema.parse(result)`

### Error Handling
- LLM_TIMEOUT (15초)
- STT_FAILED
- INTERNAL_ERROR

### G/W/T (6 시나리오)
1. 정상 발화 분석 → 3축 점수 + INSERT
2. 또래 백분위 산출 → 0~100, "상위 N%" 포맷
3. **Confidence < 70 → requiresHITL=true → FR-C-002 Slack 웹훅** (D4 적용)
4. 금칙어 발생 → 재생성 1회 → 그래도 발견 시 안전 문구 폴백
5. LLM 타임아웃 (15s+) → LLM_TIMEOUT 반환
6. 실패율 < 2% (REQ-FUNC-001 AC) — 100회 부하 ≤ 2건 실패

### Constraints
- REQ-NF-001 p95 ≤ 800ms (Vercel Pro 60s 내, Gemini ~500ms 가정)
- CON-04 금칙어 5단계 정규식 검증 필수
- **D1+D7 적용**: Web Speech 입력 + 일반 Server Action (Edge Runtime 미사용)
- SEC-004 Gemini Rate Limiter 미들웨어 통과
- Disclaimer 출력 페이로드에 `disclaimerRequired: true` 플래그

### **Blocks**: FR-Q-001/002, FR-C-002, TEST-001

---

## 9. FR-Q-002 · 또래 비교 RSC + Disclaimer 3중 (1d)

**Epic**: F2 / **Mode**: 단순화 (Sprint 1엔 Middleware 금칙어 대신 인라인 검증) / **Depends on**: DB-005, API-001, FR-C-001

### 핵심 Files
- `app/(public)/diagnose/result/[sessionId]/page.tsx` (RSC)

### 백분위 시각화
shadcn/ui Progress + 가로 바 차트 (Recharts 또는 div + Tailwind)

### 넛지 카피 자동 생성 (peerPercentile 분기)
- `≥ 80`: "또래의 상위 20% 안에 들어요!"
- `40~79`: "또래와 비슷한 수준이에요"
- `< 40`: "조금 더 연습하면 좋아요" ← 불안 자극 회피

### ⭐ Disclaimer 3중 노출
- **상단** + **차트 옆** + **하단** = 강제 가시성 보장
- 카피: "본 결과는 의료적 판단이 아닌 발달 참고 자료입니다."

### 인라인 금칙어 검증
페이지 렌더 직전 `aiCushionText` 정규식 스캔 → 발견 시 안전 문구 "잘 발음하고 있어요"로 대체

### CTA: "주간 미션 시작하기" (Sprint 1엔 단순 anchor, Stripe는 P1)

### G/W/T (6 시나리오)
1. 결과 렌더 LCP ≤ 1,500ms
2. **Disclaimer 100%**: `[data-testid="disclaimer"]` 3개 발견, 모두 visible
3. 넛지 분기: peerPercentile 85 → "또래의 상위 20% 안에 들어요!"
4. 금칙어 0건: "진단" 포함 row → 정규식 차단 → 안전 문구 대체
5. 유료 전환 CTA 노출
6. 잘못된 sessionId → 404 + 진단 재시도 CTA

### Constraints
- REQ-FUNC-010 RSC p95 ≤ 1,500ms (DB ≤ 100ms + 렌더 ≤ 100ms)
- REQ-FUNC-011 Disclaimer NeverHide
- 접근성: 차트 aria-label, 색맹 대응 (색 + 패턴)
- og:image (Vercel OG SDK) — Sprint 2로 디퍼 가능

### **Blocks**: TEST-004 (E2E), FR-C-009 (보상은 결과 도달 시점)

---

## 10. FR-C-009 · 보상 UPSERT (별 +1) + 멱등성 + 파티클 (0.5d)

**Epic**: F12 / **Depends on**: DB-008, DB-002, API-004

### 핵심 Files
- `app/actions/reward.ts` — `grantReward(userId, type, amount, idempotencyKey)` SA

### 멱등성 패턴
- `idempotencyKey = ${sessionId}-star-1`
- 별도 `RewardLog` 테이블에 INSERT, 중복 시 silently skip
- 또는 단순 in-memory cache (Sprint 1) → Sprint 2에서 정확성 강화

### UPSERT
```typescript
prisma.rewardProgress.upsert({
  where: {userId},
  create: {...},
  update: {cumulativeStars: {increment: amount}}
})
```

### 파티클 (클라이언트)
Framer Motion 또는 CSS keyframes — **별 5개 폭발**

### 무로그인 사용자
익명 userId (localStorage UUID) → 가입 시 anonymous → real userId 마이그레이션 (Sprint 2)

### G/W/T (5 시나리오)
1. 진단 완료 시 별 +1
2. 새 사용자 (row 없음) → 신규 row, stars=1
3. **멱등성 보장**: 동일 키 2회 → +1만
4. 파티클 ≤ 500ms (Performance.now 측정)
5. 동시성 5병렬 → 최종 +5 정확 (TEST-009 책임)

### Constraints
- REQ-NF-005 ≤ 500ms — 파티클은 SA 응답 안 기다리고 **optimistic UI 즉시 표시**
- 멱등성 idempotencyKey 필수
- **D5 디퍼**: 오프라인 소급 보상 미적용. Sprint 1엔 온라인 전제 + 단절 시 에러 토스트

### **Blocks**: TEST-009, FR-Q-004 (P1)

---

## 11. INFRA-001 · Vercel Pro 배포 + 환경변수 7종 + Cron 슬롯 (0.5d)

**Epic**: Foundation / **Depends on**: DB-001 / **Sprint 1 마무리**

### Vercel Pro 활성화 ($20/월) ⭐ 필수
- 근거: **60s Function timeout** (R7 대응) + **Cron 8개 슬롯** (Hobby 1개 한도)

### 환경 변수 7종 (Vercel Dashboard)
- `DATABASE_URL` (Supabase Pooling)
- `DIRECT_URL` (마이그레이션용)
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 측만)
- `SLACK_WEBHOOK_URL` (D4 — HITL Realtime 대체)

### `vercel.json`
```json
{"functions": {"app/actions/**": {"maxDuration": 60}}}
```

### Production / Preview / Development 환경 분리

### G/W/T (5 시나리오)
1. Git push → main 자동 Production 배포
2. PR → Vercel Preview 자동 생성
3. 환경 변수 격리 (Production 키만)
4. 60s Timeout 동작 (50s 함수 정상 완료)
5. Cron 슬롯 가용 (4종 등록 OK)

### Constraints
- C-TEC-007 Vercel 단일화
- REQ-NF-007 Uptime ≥ 99.9% (Vercel SLA)
- R7 60s timeout 확보 + 모든 SA 30s 내 완료 권고
- 보안: `.env.local` 절대 미커밋
- **G2 비용 가드레일**: Vercel Pro $20 고정 + $30 임계 알림
- 백업: Vercel 미제공 → Supabase 자동 백업 의존 (REQ-NF-009 RPO < 1h)

### Discope 영향
- **D2 적용**: Capacitor 앱스토어 배포는 P1 후반. 본 태스크는 **Vercel 웹 배포만**.

### **Blocks**: 사실상 모든 P0 라이브 검증

---

## ⭐ Sprint 1 Dependency Graph (정독 기반)

```
INFRA-001 ←──────── DB-001 ──┬──→ DB-002 ──┬──→ DB-005 ──→ API-001 ──→ FR-Q-001
(Sprint 1                    │             │                              │
 마무리)                       ├──→ DB-006 │                              ↓
                              │  (시드만)   ├──→ DB-008 ←──────── FR-C-009
                              │             │                              ↑
                              │             ↓                              │
                              └──→ FR-C-001 (Gemini + DB INSERT)          │
                                       ↓                                   │
                                  FR-Q-002 (Disclaimer 3중) ─────────────┘
                                       ↑                  ↓
                                       │              FR-C-009 (보상 트리거)
                                       │
                                  TEST-004 (E2E)
```

## ⭐ Sprint 1 Descope 매핑 (정독 기반)

| Task | Descope ID | 적용 |
|---|---|---|
| API-001 | **D7 부분** | audioBlob → STT 텍스트 입력 (Web Speech) |
| FR-C-001 | **D1 + D7** | Web Speech 입력 + 일반 SA (Edge Runtime 미사용) |
| FR-Q-002 | (Sprint 1 단순화) | Middleware 금칙어 → 인라인 검증 |
| FR-C-009 | **D5** | 오프라인 소급 보상 미적용 (P1) |
| INFRA-001 | **D2** | Capacitor 앱스토어 미적용 (P1) |
| (Slack 웹훅) | **D4** | HITL Realtime → SLACK_WEBHOOK_URL 환경 변수 |

## ⭐ Sprint 1 Tech Stack 도입 순서 (정독)

| 순번 | 도구 | 도입 Task |
|---|---|---|
| 1 | Next.js 15 + App Router | DB-001 |
| 2 | TypeScript + ESLint | DB-001 |
| 3 | Tailwind CSS | DB-001 |
| 4 | Prisma ORM | DB-001 |
| 5 | SQLite (dev) | DB-001 |
| 6 | Supabase (prod) | DB-001 |
| 7 | shadcn/ui (button input select slider) | FR-Q-001 |
| 8 | Web Speech API (`useSpeechRecognition`) | FR-Q-001 |
| 9 | Zod | API-001 |
| 10 | Vercel AI SDK + Gemini | FR-C-001 (API-011) |
| 11 | Framer Motion (또는 CSS keyframes) | FR-C-009 |
| 12 | Vercel Pro ($20) | INFRA-001 |
| 13 | Vercel Cron Jobs (8 슬롯) | INFRA-001 |
| 14 | GitHub (private repo) | INFRA-001 |
| 15 | Slack 웹훅 (D4) | INFRA-001 + FR-C-001 (HITL 트리거) |

## 인용 가능 위치

| Task | 원본 |
|---|---|
| DB-001 | TASK_DB-001.md (68줄) |
| DB-002 | TASK_DB-002.md (65줄) |
| DB-005 | TASK_DB-005.md (64줄) |
| DB-006 | TASK_DB-006.md (64줄) |
| DB-008 | TASK_DB-008.md (62줄) |
| API-001 | TASK_API-001.md (87줄) |
| FR-Q-001 | TASK_FR-Q-001.md (86줄) |
| FR-C-001 | TASK_FR-C-001.md (97줄) ⭐ 최복잡 |
| FR-Q-002 | TASK_FR-Q-002.md (94줄) |
| FR-C-009 | TASK_FR-C-009.md (78줄) |
| INFRA-001 | TASK_INFRA-001.md (92줄) |

## Clinical cross-link

- **DB-005 evaluation_results의 3축 (articulation·linguistic·acoustic)** = [[clinical/entities/U-TAP]] (조음음운 = articulation) + [[clinical/entities/REVT]] (어휘 = linguistic) + 음향 분석의 디지털 변환.
- **DB-006 mission_cards의 한국어 음운론 위계 (파열음→마찰음→파찰음→유음)** = [[clinical/concepts/조음장애]] § 단음→대화 6단계 위계의 임상 기반.
- **FR-C-001의 또래 백분위 계산 정규분포 가정 시드 100건** = [[clinical/entities/U-TAP]] 정상 규준의 디지털 약식 표현. **임상 정합성 별도 검증 필요** (KSF #2).
- **FR-Q-002 Disclaimer 3중 노출** = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙1 (의료) 영역과의 명시적 분리. ADR-04 의료 용어 배제의 시스템 강제.
- **DB-002 R4 영유아 식별 정보 미저장** = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 임상 평가 동의 절차의 디지털 변형.

## 관련 product 페이지

- [[product/concepts/task-breakdown-overview]] — Sprint 1 8 코어 인덱스 (본 source의 정본)
- [[product/concepts/MVP-feature-spec]] — 21 Epic + KPI (Phase 0 Must 6 = Sprint 1 의 일부)
- [[product/concepts/MVP-descope-plan]] — D1·D2·D4·D5·D7·D8 권고 (Sprint 1에서 적용된 5건)
- [[product/concepts/tech-architecture]] — 14 Tech Stack (Sprint 1 도입 순서 매핑)
- [[product/sources/65-SRS-V06-Final]] § REQ-FUNC-001~014 + REQ-NF-001~006

## 보강 필요
- **FR-C-002** (Confidence < 70 → Slack 웹훅, D4 적용) — Sprint 1엔 FR-C-001 §시나리오 3에서 트리거 명시되나 별도 task 정독 미수행. P1 시작 시 보강.
- **API-004** (`grantReward()` DTO + 멱등성 키) — FR-C-009 깊이 의존. 정독 가치.
- **API-011** (Vercel AI SDK + Gemini 어댑터) — FR-C-001 깊이 의존. **2단계 Gemini 호출 + 시스템 프롬프트** 정독 가치.
- **SEC-004** (Gemini Rate Limiter) — FR-C-001 의존. 비용 가드레일 핵심.
- **TEST-001/004/009** (Sprint 1 검증 트리오) — 단위·E2E·동시성 테스트. 정독 가치.
- 정규분포 가정 시드 100건 (FR-C-001 §3단계) — 어떤 정규분포·어떤 모수? 임상 정합성 검증 필요.
- 한국어 음운론 위계 (DB-006 §콘텐츠) 시드 25개의 임상 검증.
