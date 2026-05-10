---
type: concept
pillar: product
category: framework
aliases: [기술 아키텍처, Tech Stack, Next.js Full-stack, C-TEC, V05 아키텍처]
tags: [아키텍처, Nextjs, Vercel, Supabase, Gemini, PWA, ServerActions, 클러스터55-67]
---

# Tech Architecture — V06 Next.js Full-stack 정본

본 프로젝트의 기술 아키텍처 결정 정본. **Next.js App Router 서버리스 풀스택 모놀리스** + Vercel + Supabase + Gemini.

## 핵심 결정 — C-TEC-001~007

| ID | 제약 | 영향 | 근거 |
|---|---|---|---|
| **C-TEC-001** | **Next.js (App Router)** 단일 풀스택. FE/BE 분리 금지 | 단일 레포 + 단일 배포 | 1인/소규모 팀 극한 생산성 |
| **C-TEC-002** | 서버 로직 = **Server Actions** + **Route Handlers** | Express/NestJS 별도 백엔드 금지 | 인프라 관리 포인트 0 |
| **C-TEC-003** | DB = Prisma + SQLite(로컬) / **Supabase PostgreSQL**(prod) + pgvector | 인프라 복잡도 최소 | BaaS 활용 |
| **C-TEC-004** | UI = **Tailwind CSS + shadcn/ui** 강제 | AI 코드 일관성 | 바이브 코딩 호환 |
| **C-TEC-005** | LLM = **Vercel AI SDK**. Python 서버 금지 | 별도 AI 서버 불필요 | Managed |
| **C-TEC-006** | LLM 모델 = **Google Gemini API** 기본 | env 교체 가능 | 비용·성능 |
| **C-TEC-007** | 배포 = **Vercel** 단일. Git Push 자동 | CI/CD 별도 설정 금지 | 서버리스 |

## 4-Layer Component Architecture

```
[Client Layer]
  ├ Next.js Web App (SSR + CSR)
  ├ PWA / Capacitor (iOS·Android 설치형)
  └ 교실 태블릿 (PWA + VAD Worker)
        ↓
[Vercel Platform]
  ├ Next.js App Router
  │   ├ Pages & Layouts (React Server Components)
  │   ├ Server Actions ('use server')
  │   ├ Route Handlers (app/api/*)
  │   └ Middleware (Auth, RBAC, 금칙어 스캔)
  ├ Edge Runtime (Audio Stream Proxy)
  └ Vercel Cron Jobs (주간 리포트, 7일 폐기 등)
        ↓
[Supabase (BaaS)]
  ├ PostgreSQL + pgvector
  ├ Supabase Auth (OAuth + Magic Link)
  ├ Supabase Storage (오디오 임시 ≤7일)
  └ Supabase Realtime (HITL 큐 구독)
        ↓
[External AI & APIs]
  ├ STT Engine (Google Speech / OpenAI Whisper)
  ├ Google Gemini API (via Vercel AI SDK)
  ├ 카카오톡 알림톡 API
  └ 키즈노트 API
```

## 클라이언트 6종 (V06)

| 클라이언트 | 구현 | Phase |
|---|---|---|
| 진단 웹뷰 | Next.js SSR Page (SEO) | P0 |
| B2C 홈케어 앱 | **PWA** (Service Worker + Manifest) | P0 |
| B2C 앱스토어 | **Capacitor 래핑** (PWA → iOS/Android) | P1 |
| 전문가 어드민 | Next.js Route Group + Supabase Realtime | P1 |
| 원장 대시보드 | Next.js Route Group | P2 |
| 교실 태블릿 | PWA + Web Worker (VAD) + 오프라인 버퍼링 | P2 |

## API 9종 (Server Actions + Route Handlers)

| 함수/경로 | 유형 | 사용 |
|---|---|---|
| `analyzeDiagnosis()` | Server Action | 3축 분석 (Vercel AI SDK + Gemini) |
| `getCurriculum()` | Server Action | 적응형 난이도 추천 |
| `getWeeklyReport()` | Server Action | 주간 집계 |
| `app/api/hitl/queue` | Route Handler POST | HITL 큐 등록 (Realtime) |
| `app/api/hitl/comment` | Route Handler PATCH | 전문가 코멘트 |
| `app/api/b2b/approval` | Route Handler PATCH | 키즈노트 승인 |
| `app/api/consent/sign` | Route Handler POST | 카카오톡 전자서명 |
| `grantReward()` | Server Action | 보상 반영 ≤500ms |
| `app/api/audio/stream` | Route Handler **Edge** | STT 프록시 (Edge Runtime) |

## 핵심 시퀀스 — 5분 진단

```
Parent (PWA) → Next.js (Vercel)         : 1. 랜딩 SSR
Next → Parent                            : 2. 입력 폼 (≤3 항목)
Parent → STT (Client-side direct)        : 3. 음성 → STT
STT → Parent                             : 4. 텍스트 + 음향
Parent → Next.js Server Action           : 5. analyzeDiagnosis()
Next → Gemini (Vercel AI SDK)           : 6. 3축 보조
Gemini → Next                            : 7. 점수 + Confidence

if Confidence ≥ 70:
    Next → Supabase (Prisma)             : 8a. 결과 저장
    Next → Parent                        : 9a. RSC 리포트 (p95 ≤1,500ms)
else (Confidence < 70):
    Next → Supabase Realtime             : 8b. HITL 큐 등록
    Next → Parent                        : 9b. "전문가 검토 중"

매주 일요일 (Vercel Cron):
    Next → Supabase                      : 12. 주간 집계 배치
    Next → Parent                        : 13. 푸시 → 추이 리포트
```

## R7, R8 — 기술 스택 리스크

| Risk | 리스크 | 영향 | 완화 |
|---|---|---|---|
| **R7** | Vercel 함수 Timeout (10s Hobby / 60s Pro) | 🟡 | **Client-side 직접 STT 호출** + Edge Runtime 활용. **Pro 플랜 ($20/월) 업그레이드 필수** |
| **R8** | Supabase 무료 (500MB DB / 1GB Storage) | 🟡 | **REQ-FUNC-005 7일 폐기 Cron** = 비용 방어 최우선. Pro 전환 기준 명확화 |

## D4, D5 — 외부 의존성

| Dep | 의존 | 대안 |
|---|---|---|
| **D4** | Vercel AI SDK ↔ Google Gemini 호환성 | env로 OpenAI/Anthropic Fallback |
| **D5** | Supabase Realtime → HITL 큐 실시간 | Polling Fallback |

## ⭐ 운영 비용 구조 (MAU 1,000)

| 서비스 | 티어 | 월 비용 |
|---|---|---:|
| Vercel | **Pro $20** ⚠️ 필수 | $20 |
| Supabase | Free | $0 (단, 7일 폐기 필수) |
| Gemini API | Free → PAYG | $0~$5 |
| Google STT | PAYG | ~$10 |
| **합계** | | **$30~$35** |

→ Scale-to-Zero 특성. 트래픽 0일 때 과금 0.

→ 상세: [[product/sources/67-MVP-Descope-Review]] § 3.

## 본 아키텍처가 가능케 하는 것

| 가치 | 메커니즘 |
|---|---|
| **1인/소규모 팀 생산성** | Next.js + Supabase가 가장 방대한 AI 학습 데이터 → 바이브 코딩 호환 |
| **인프라 관리 0** | Vercel + Supabase BaaS = DevOps 없음 |
| **비용 극한 효율** | Scale-to-Zero + 7일 폐기 = $30/월 |
| **Implementation-Ready** | C-TEC 강제 + shadcn/ui 일관성 → SRS → 코드 즉시 변환 |
| **확장성** | Edge Runtime + Server Actions로 vertical scale 자연 확장 |

## 본 아키텍처의 trade-off

| 단점 | 의미 |
|---|---|
| **Vendor Lock-in** | Vercel + Supabase 의존. 이전 비용 큼 |
| **Vercel Timeout** | 장시간 처리 (오디오 60s+) 불가 → R7 우회 필요 |
| **Python 생태계 미사용** | LangChain/PyTorch 등 직접 활용 불가 (D4 우회) |
| **Native 기능 제한** | PWA + Capacitor = native 일부 API 제한 |

## 경쟁사 대비

[[product/concepts/Value-Chain-Analysis]] § 본 프로젝트 가치사슬 의 기술 측면:
- 두부 (시리즈B 210억) → Java/Spring 풀스택 추정
- 송앤스타크 → AI 자동화 90%+ 추정 (스택 미공개)
- 우리 = **인프라 관리 0 + Bibe Coding 호환** = 자본력 격차를 1인 효율로 압축

## ⭐ Data Model (ERD) — Supabase PostgreSQL + pgvector

7개 핵심 엔티티 + UUID PK + Supabase 규격:

```
users (1) ── (*) session_logs ── (1) evaluation_results
  │                                       ↑
  │                              aggregates (1) weekly_reports
  │
  └── (1) reward_progress
  └── managed_by ── institutions (1) ── manages (*) users (B2B)

mission_cards (1) ── triggers (*) session_logs
```

| Entity | 핵심 필드 | DB Task |
|---|---|---|
| **users** | id UUID PK / role enum (parent·teacher·principal·expert·admin) / child_age_months / subscription_tier (free·basic·premium) | DB-002 |
| **institutions** | id PK / name / principal_name / consent_status / logo_uri (Supabase Storage path) | DB-003 |
| **session_logs** | id PK / user_id FK / mission_id FK / start_time / duration_sec / **audio_vector_uri (pgvector)** | DB-004 |
| **evaluation_results** | id PK / session_id FK / 3축 점수 (articulation·linguistic·acoustic float8) / peer_percentile / confidence / hitl_reviewed / ai_cushion_text | DB-005 |
| **mission_cards** | id PK / target_phoneme / difficulty_level / reward_type | DB-006 |
| **weekly_reports** | id PK / user_id FK / week_number / **score_trend jsonb** / predicted_next_score / generated_at | DB-007 |
| **reward_progress** | id PK / user_id FK / cumulative_stars / tree_growth_level / ai_drawing_count | DB-008 |

> **추가 도출 엔티티** (ERD 외, TASKS/01 §1-A):
> - `hitl_queue` (DB-009): session_id / confidence_score / status / assigned_expert_id / sla_due_at / expert_comment
> - `consent_signatures` (DB-010): institution_id / parent_id / signed_at / expires_at / kakao_link_id

## ⭐ Domain Class Model (5 클래스, §6.2)

| Class | 핵심 메서드 |
|---|---|
| **User** | startSession() / viewReport() |
| **SessionLog** | processAudio() |
| **EvaluationResult** | generateCushionText() |
| **MissionCard** | adjustDifficulty() |
| **HITLExpert** | reviewResult(EvaluationResult) / submitComment() |

관계: User *-- SessionLog --> EvaluationResult / MissionCard --> SessionLog / HITLExpert --> EvaluationResult.

## ⭐ 핵심 Sequence Diagrams (3 추가, §6.3)

### 1. PWA Offline → Sync 보상 소급 (F3-a · F12)
```
Child → PWA: 미션 수행 (네트워크 단절)
PWA → Server Action: 평가 요청 → Timeout
PWA → Child: 즉각 칭찬 파티클 (단절 무관)
PWA → IndexedDB: 세션 + 임시 별점 캐시
Child → PWA: 앱 재실행 (복구) → Background Sync
SA → Supabase: Prisma 보상 정합성 + 반영
PWA → Child: "놓친 별들을 가져왔어요!"
```
→ FR-C-007 + REQ-FUNC-020. **D5 Descope로 P1 디퍼**.

### 2. B2B Zero-touch (F9-b)
```
교실 태블릿 PWA → Web Worker (VAD): 자유놀이 시작 (마이크 자동)
Worker: 발화 구간 감지 → Edge Runtime 청크 (≤300ms)
Edge → STT: Speaker Diarization (성인 필터 + 아동 분리 ≥85%)
Edge → SA → Supabase: 3축 + 결과 저장
SA → Supabase: AI 쿠션어 알림장 (Gemini)
[교사 능동 조작 0회]
```
→ FR-C-015 + REQ-FUNC-049~051. **D3+D7 Descope로 P2 디퍼**.

### 3. 전자서명 동의서 (F10)
```
원장 → Server Action: 원아 일괄 등록 (엑셀 → Prisma p95 ≤3,000ms)
SA → Route Handler: /api/consent/sign 링크
RH → 카카오톡 → 학부모: 알림 + 전자서명
[D+3 미완료] Vercel Cron → 리마인더 재발송
[7일 초과] RH → 원장: "재발송 필요"
```
→ FR-C-018 + REQ-FUNC-059~061.

## ⭐ Tech Stack 14종 (Layer 매핑 정본, §6.4)

| Layer | Technology | C-TEC |
|---|---|---|
| Framework | Next.js 15 (App Router) | C-TEC-001 |
| Server Logic | Server Actions + Route Handlers | C-TEC-002 |
| Database | Prisma + SQLite(dev) / Supabase PostgreSQL(prod) | C-TEC-003 |
| Vector DB | pgvector (Supabase 확장) | — |
| UI | Tailwind CSS + shadcn/ui | C-TEC-004 |
| Auth | Supabase Auth (OAuth + Magic Link) | — |
| Storage | Supabase Storage (≤7일) | — |
| Realtime | Supabase Realtime (HITL 큐) | — |
| AI/LLM | Vercel AI SDK + Google Gemini | C-TEC-005, 006 |
| Deploy | Vercel (Git Push 자동) | C-TEC-007 |
| Cron | Vercel Cron Jobs (4종) | — |
| Analytics | Vercel Analytics + Web Vitals | — |
| Mobile | PWA + Capacitor (P1) | — |
| Edge | Edge Runtime (R7 우회) | — |

## 출처
- [[product/sources/65-SRS-V06-Final]] § C-TEC-001~007 (L102-L110) / § Component (L207-L259) / **§ 6.1 ERD (L683-L748)** / **§ 6.2 Class (L751-L787)** / **§ 6.3 Sequences (L789-L860)** / **§ 6.4 Tech Stack 14 (L862-L878)**
- [[product/sources/67-MVP-Descope-Review]] § 비용 표 (L52-L58)
- [[product/concepts/architecture-decisions]] § ADR-05~07 (V05 신규)

## 관련 product 페이지

- [[product/concepts/MVP-feature-spec]] — 21 Epic의 기술 매핑
- [[product/concepts/SRS-evolution]] — V05 → V06 기술 전환
- [[product/concepts/MVP-descope-plan]] — 본 아키텍처의 1주차 실행 가이드
- [[product/sources/65-SRS-V06-Final]] — SRS 정본
- [[product/sources/54-PRD-V10-Final]] § 6 (System & Data Architecture)

## 보강 필요
- ERD (Supabase PostgreSQL 스키마) 상세 — V06 §6.1 미정독.
- ADR 3건 (05, 06, 07) — V06 신규 ADR. 각각 어떤 기술 결정인지 미정독.
- pgvector 사용처 (벡터 임베딩 어디에 쓰는가) — 음성 벡터화 추정이지만 명시 필요.
- Vercel Pro 한계 (어느 MAU부터 Enterprise 필요한가) — [[product/sources/67-MVP-Descope-Review]] § 보강 필요와 동일.
