# Software Requirements Specification (SRS)
Document ID: SRS-001  
Revision: 3.0 (V05 Next.js Full-stack Edition)  
Date: 2026-05-08  
Standard: ISO/IEC/IEEE 29148:2018  
Source PRD: `54_PRD_V10_Final.md`  
Base: V04 Merged Master (Opus + Gemini)  
Tech Stack: Next.js App Router · Vercel · Supabase · Vercel AI SDK

## Revision History

| Rev | Date | Version | Author | Description |
|:---:|:---:|:---|:---|:---|
| 0.1 | 2026-05-07 | V01 Draft | AI (초안) | PRD v1.0 기반 SRS 초안 생성. 6개 모듈 분산 작성 |
| 0.2 | 2026-05-07 | V02 Opus Draft | AI (Opus) | ISO 29148 구조 강화. 65개 REQ-FUNC(G/W/T), 30개 REQ-NF, HITL 4원칙, UseCase/Component/ERD/Class 다이어그램 포함. 948줄 |
| 0.3 | 2026-05-07 | V03 Gemini Draft | AI (Gemini) | Epic 코드 기반 ID 체계(REQ-FUNC-F1a-001). 1:1 Traceability Matrix, 보상소급/HITL/Zero-touch 시퀀스 다이어그램, Validation Plan(EXP 1~4), ADR, Gantt 로드맵 포함. 687줄 |
| 1.0 | 2026-05-08 | V10 Final Integrated | AI | V01~V03 통합. 6개 모듈 → 단일 마스터 문서 병합. 451줄 |
| 1.1 | 2026-05-08 | V11 Final with Diagrams | AI | 검토계획서(64_Review)에 따라 UseCase/Component/ERD/Class/Sequence 6종 Mermaid 다이어그램 보완 완료 |
| 2.0 | 2026-05-08 | **V04 Merged Master** | AI | **Opus(V02) + Gemini(V03) Best-of-Breed 통합.** Opus의 65개 원자적 G/W/T 요구사항 + Gemini의 1:1 Traceability Matrix, 보상소급 시퀀스, EXP/ADR/Gantt 부록 결합. 99개 요구사항, 10개 다이어그램, 8개 API. 919줄 |
| **3.0** | **2026-05-08** | **V05 Next.js Full-stack** | **AI** | **C-TEC-001~007 기술 제약사항 전면 적용.** FE/BE 분리 → Next.js App Router 서버리스 모놀리스 전환. REST API → Server Actions/Route Handlers. DB → Supabase(PostgreSQL+pgvector). LLM → Vercel AI SDK+Gemini. 모바일 → PWA+Capacitor. 배포 → Vercel. Component Diagram 전면 재설계. ADR 3건(05~07) 추가, Risk 2건(R7~R8) 추가, Tech Stack 14종 명세. 955줄 |

---

# 1. Introduction

## 1.1 Purpose

본 SRS는 **Home Language Coaching Platform**의 소프트웨어 요구사항을 ISO/IEC/IEEE 29148:2018 표준에 따라 정의한다. 본 시스템은 영유아(만 2~7세) 언어 발달 지연 문제에 대해 **AI 기반 즉각 스크리닝, 맞춤형 홈케어 미션, 전문가 감수(HITL)**를 결합하여 부모의 불안을 해소하고 골든타임 개입을 가능하게 하는 B2C/B2B 플랫폼이다.

> **V05 아키텍처 변경:** 본 버전부터 전통적 FE/BE 분리 아키텍처를 폐기하고, **Next.js App Router 기반 서버리스 풀스택 모놀리스**로 전면 전환한다. 이는 1인/소규모 팀의 극한 생산성을 확보하기 위한 설계 결정이다.

### Design Philosophy — 4대 극한 (Four Extremes)

| 극한 | 정의 | 정량 목표 |
|:---|:---|:---|
| **시간의 극한** | 오프라인 초진 2~3개월 → `≤5분` 즉시 백분위 확인 | 리드타임 ≥17,000배 단축 |
| **마찰의 극한** | 교사 업무 추가 → 능동 조작 `0회` (Zero-touch) | 현장 마찰 100% 제거 |
| **지속의 극한** | 1개월 이탈 80% → M3 리텐션 `≥40%` | 숏폼 미션 + 즉각 보상 |
| **증명의 극한** | 주관적 판단 → `62→71점` 시계열 수치 증명 | 리포트 열람률 ≥60% |

### Business Context
- **TAM**: ~150만 가구 (만 2~7세 전체)
- **SAM**: ~22.5만 가구 (발달 지연 우려 15%)
- **SOM**: ~15만 가구 → 초기 1년 목표 12,000 가구 (CVR 8%)
- **수익 모델**: Freemium (무료 진단) → Basic ₩35,000/월 → Premium ₩50,000/월 → B2B ₩500,000/년

## 1.2 Scope

### In-Scope

| 영역 | 설명 | Phase |
|:---|:---|:---:|
| AI 스크리닝 | 영유아 음성 기반 3축 분석 + 또래 백분위 리포트 | P0 |
| B2C 홈케어 | 맞춤형 데일리 숏폼 미션 + 적응형 난이도 + 게이미피케이션 보상 | P0 |
| B2C 리텐션 | 주간 발달 추이 리포트 + 가족 공유 + 예측 시뮬레이션 | P1 |
| HITL 품질관리 | 전문가 비동기 감수 시스템 (48h SLA) | P1 |
| B2B 연동 | Zero-touch 화자분리 수집 + 원장 대시보드 + 전자서명 | P2 |

### Out-of-Scope

| 제외 항목 | 제외 사유 |
|:---|:---|
| 의료적 진단/장애 판정 | DTx 인허가 규제 리스크 (R1) |
| 실시간 원격 진료/텔레메디슨 | 의료법 저촉 + MVP 복잡도 과대 |
| 네이티브 모바일 앱 (React Native/Swift/Kotlin) | C-TEC-001: Next.js 풀스택 단일화 → PWA/Capacitor 대체 |
| 별도 Python AI 서버 | C-TEC-005: Vercel AI SDK로 대체 |
| 별도 백엔드 서버 (Express/NestJS 등) | C-TEC-002: Server Actions/Route Handlers로 대체 |

## 1.3 Definitions, Acronyms, Abbreviations

| 용어 | 정의 |
|:---|:---|
| **W-AUR** | Weekly Active User Rate. 주간 미션 완수율. 북극성 KPI |
| **HITL** | Human-in-the-Loop. AI + 전문가 하이브리드 품질 보증 |
| **Zero-touch** | 교사 능동 조작이 전혀 없는 자동 수집 방식 |
| **Server Actions** | Next.js App Router의 서버 측 RPC 함수. `'use server'` 디렉티브로 선언 |
| **Route Handlers** | Next.js `app/api/` 경로에 정의하는 서버리스 API 엔드포인트 |
| **PWA** | Progressive Web App. 웹앱을 네이티브 앱처럼 설치/오프라인 사용 가능 |
| **Capacitor** | 웹앱을 iOS/Android 네이티브 래퍼로 패키징하는 Ionic 프레임워크 |
| **pgvector** | PostgreSQL 확장. 벡터 임베딩 저장 및 유사도 검색 지원 |
| **Vercel AI SDK** | Vercel에서 제공하는 LLM 스트리밍/오케스트레이션 SDK |
| **K-CDI / REVT** | 한국판 의사소통 발달 검사 / 수용·표현 어휘력 검사 |
| **DTx** | Digital Therapeutics. 본 서비스는 DTx가 아닌 교육용 포지셔닝 |
| **M3 리텐션** | 구독 시작 3개월 시점 유효 구독 유지율 |
| **ADR** | Architecture Decision Record |

## 1.4 References

| ID | 문서명 | 설명 |
|:---|:---|:---|
| REF-01 | AOS/DOS 기회 통합 매트릭스 | PRD §9.0 |
| REF-02 | JTBD 인터뷰 검증 상태 | PRD §9.0-b |
| REF-03 | TAM-SAM-SOM 시장 분석 | PRD §9.0-c |
| REF-04 | PRD Traceability Matrix | PRD §9.1 |
| REF-05 | VPS 원본 | `39_VPS_V09_final_UX_reinforce.md` |
| REF-06 | PRD v1.0 Final | `54_PRD_V10_Final.md` |

## 1.5 Constraints, Assumptions & Dependencies

### 1.5.1 Technology Constraints (C-TEC) — V05 신규

| ID | 제약 사항 | 시스템 영향 |
|:---|:---|:---|
| **C-TEC-001** | 모든 서비스는 **Next.js (App Router)** 기반 단일 풀스택 프레임워크로 구현. FE/BE 분리 금지. | 단일 레포지토리, 단일 배포 단위 |
| **C-TEC-002** | 서버 측 로직(DB 접근, API 호출)은 **Server Actions** 또는 **Route Handlers**로 구현. 별도 백엔드 서버 금지. | Express/NestJS 등 별도 서버 불필요 |
| **C-TEC-003** | DB는 **Prisma + SQLite(로컬)** / **Supabase PostgreSQL(프로덕션)**. 벡터는 **pgvector** 확장 사용. | 인프라 설정 복잡도 최소화 |
| **C-TEC-004** | UI/스타일링은 **Tailwind CSS + shadcn/ui** 강제. | AI 코드 생성 일관성 확보 |
| **C-TEC-005** | LLM 오케스트레이션은 **Vercel AI SDK**로 Next.js 내부 직접 구현. Python 서버 금지. | 별도 AI 서버 불필요 |
| **C-TEC-006** | LLM은 **Google Gemini API** 기본. 환경 변수 설정으로 모델 교체 가능. | SDK 표준 인터페이스 준수 |
| **C-TEC-007** | 배포/인프라는 **Vercel** 단일화. Git Push로 자동 배포. CI/CD 별도 설정 금지. | Vercel + Supabase 조합 |

### 1.5.2 Architectural Constraints (ADR-01~04) — PRD 계승

| ID | 제약 사항 | 시스템 영향 | 근거 |
|:---|:---|:---|:---|
| **CON-01** | Zero-touch 수집 전면 도입 | 엣지 VAD + 오디오 버퍼링 필수 | ADR-01, R3 |
| **CON-02** | HITL 비동기 감수 필수: Confidence `< 70` 시 전문가 큐 이관 | 어드민 뷰 + 큐 할당 필수 | ADR-02, R2 |
| **CON-03** | 원본 음성 ≤7일 폐기, 벡터만 영구 보관 | Supabase Storage + 자동 파기 | ADR-03, R4 |
| **CON-04** | 의료 용어 하드코딩 배제 | 금칙어 정규식 스캐너 + QA | ADR-04, R1 |

### 1.5.3 Risk Mitigation

| Risk ID | 리스크 | 영향도 | 완화 전략 |
|:---|:---|:---:|:---|
| R1 | 서비스가 의료행위로 취급 | 🔴 | Disclaimer 강제 삽입 + 비의료 포지셔닝 |
| R2 | 유아 발음/교실 소음 STT 실패 | 🟡 | 노이즈 튜닝 + HITL 48h 수정 |
| R3 | 교사 추가 업무로 도입 거부 | 🔴 | Zero-touch 아키텍처 사수 |
| R4 | 영유아 음성 무단 수집/유출 | 🔴 | 법정대리인 전자서명 + 7일 폐기 |
| R5 | 키즈노트 API 정책 변경 | 🟡 | SMS/카카오톡 Fallback |
| R6 | Seg B 가설 미완전 검증 | 🟡 | EXP-2 + 피벗 시나리오(Plan B) |
| **R7** | **Vercel 서버리스 함수 Timeout (10~60s)으로 장시간 오디오 처리 실패** | 🟡 | **클라이언트 측 직접 STT API 호출 + Edge Runtime 활용** |
| **R8** | **Supabase 무료 티어 제한 (500MB DB, 1GB Storage)** | 🟡 | **Pro 플랜 전환 기준 명확화 + 7일 폐기로 스토리지 최적화** |

### 1.5.4 Assumptions & Dependencies

| ID | 가정/의존성 | 검증/대안 |
|:---|:---|:---|
| A1 | 부모의 월 ₩35,000 지불 저항이 매우 낮음 | EXP-4 |
| A2 | 맘카페 바이럴 CTR ≥15% 자발적 발생 | §8.1 Beta |
| D1 | 한국어 아동 STT/NLP 초기 인식률 | 노이즈 캔슬링 + HITL 보정 |
| D2 | 카카오톡/키즈노트 API 가용성 | SMS + 웹링크 Fallback |
| D3 | 전문 언어재활사 Pool 수급 | 프리랜서 선제 구축 + 자동 할당 |
| **D4** | **Vercel AI SDK의 Google Gemini 호환성** | **환경 변수로 OpenAI/Anthropic Fallback** |
| **D5** | **Supabase Realtime으로 HITL 큐 실시간 업데이트** | **Polling Fallback** |

---

# 2. Stakeholders

| Seg | 역할 | 책임 | 관심사 | 성공 기준 |
|:---:|:---|:---|:---|:---|
| **Seg A** | 불안형 탐색자 (엄마) | B2C 최초 유입 | 아이 발달 수준 즉각 객관화 | CVR `≥8%`, 체류 `≤5분` |
| **Seg C** | 센터 대기자 (엄마) | B2C 유료 결제 전환 | 골든타임 방치 해소 | 첫 주 미션 완료율 `≥70%` |
| **Seg B** | 데이터형 개입자 (가족) | B2C 구독 유지 | 시계열 성과 증명 | M3 리텐션 `≥40%` |
| **Seg D-1** | 유치원 원장 | B2B 결제 및 도입 결정 | 학부모 민원 방어 | 알림장 승인율 `≥90%` |
| **Seg D-2** | 보육 교사 | B2B 실무 게이트키퍼 | 추가 업무 제로 | 능동 조작 `0회` |
| **HITL Expert** | 언어재활사 | AI 결과 감수 및 코멘트 | 오진 방지 + 재학습 데이터 | 피드백 `≤48h` |
| **System Admin** | 플랫폼 운영자 | 모니터링 및 장애 대응 | 시스템 안정성 | Uptime `≥99.9%` |

### Stakeholder DMU Dependency
```mermaid
flowchart LR
    A["Seg A 불안형 엄마<br/>(최초 진단 Hook)"]
    C["Seg C 대기자 엄마<br/>(유료 결제 전환)"]
    B["Seg B 아빠/조부모<br/>(리텐션 결정자)"]
    D1["Seg D-1 원장<br/>(B2B 결제)"]
    D2["Seg D-2 교사<br/>(Zero-touch 실무)"]
    A -->|객관적 진단 확보| C
    C -->|데이터 누적 증명| B
    B -->|공신력 요구| D1
    D1 -->|도입 지시| D2
    D2 -.->|"⚠️ 거부권"| D1
```

---

# 3. System Context and Interfaces

## 3.1 Use Case Diagram
```mermaid
flowchart LR
    Parent("부모 (Seg A/C)")
    Teacher("교사 (Seg D-2)")
    Principal("원장 (Seg D-1)")
    Expert("언어재활사 (HITL)")

    subgraph System ["Home Language Coaching Platform<br/>(Next.js App Router on Vercel)"]
        UC1("5분 진단 수행")
        UC2("홈케어 미션 수행")
        UC3("발달 추이 리포트 조회")
        UC4("Zero-touch 음성 수집")
        UC5("알림장 자동 생성 및 승인")
        UC6("원아/대시보드 관리")
        UC7("AI 결과 감수 HITL")
    end

    Parent --> UC1
    Parent --> UC2
    Parent --> UC3
    Teacher --> UC4
    Teacher --> UC5
    Principal --> UC6
    Principal --> UC5
    Expert --> UC7
```

## 3.2 Component Diagram (V05 — Next.js Serverless Monolith)
```mermaid
flowchart TB
    subgraph Client ["Client Layer"]
        WEB["Next.js Web App<br/>(SSR + CSR)"]
        PWA["PWA / Capacitor<br/>(iOS·Android 설치형)"]
        TAB["교실 태블릿<br/>(PWA + VAD Worker)"]
    end

    subgraph Vercel ["Vercel Platform"]
        subgraph AppRouter ["Next.js App Router"]
            PAGES["Pages & Layouts<br/>(React Server Components)"]
            SA["Server Actions<br/>('use server')"]
            RH["Route Handlers<br/>(app/api/*)"]
            MW["Middleware<br/>(Auth, RBAC)"]
        end
        EDGE["Edge Runtime<br/>(Audio Stream Proxy)"]
        CRON["Vercel Cron Jobs<br/>(주간 리포트 배치)"]
    end

    subgraph Supabase ["Supabase (BaaS)"]
        PG["PostgreSQL<br/>+ pgvector"]
        AUTH["Supabase Auth<br/>(OAuth, Magic Link)"]
        STORAGE["Supabase Storage<br/>(Audio 임시 저장 ≤7일)"]
        REALTIME["Supabase Realtime<br/>(HITL 큐 구독)"]
    end

    subgraph External ["External AI & APIs"]
        STT["STT Engine<br/>(Google Speech / Whisper)"]
        GEMINI["Google Gemini API<br/>(via Vercel AI SDK)"]
        KAKAO["카카오톡 알림톡 API"]
        KIDS["키즈노트 API"]
    end

    WEB --> PAGES
    PWA --> PAGES
    TAB --> EDGE

    PAGES --> SA
    PAGES --> RH
    SA --> PG
    RH --> PG
    RH --> STORAGE
    SA --> GEMINI
    RH --> STT
    EDGE --> STT
    RH --> KAKAO
    RH --> KIDS
    CRON --> SA

    SA --> REALTIME
    MW --> AUTH
```

## 3.3 External Systems

| 시스템 | 역할 | 연동 방식 | 비고 |
|:---|:---|:---|:---|
| **Google Gemini API** | 쿠션어 생성, 발화 유도 챗봇, 분석 보조 | Vercel AI SDK (`ai` 패키지) | C-TEC-006 |
| **STT 엔진** | 음성→텍스트 변환 (한국어 아동) | Client-side direct call or Edge proxy | R7 대응 |
| **카카오톡 알림톡** | 동의서 발송, 뱃지 공유, Fallback 알림 | Route Handler → REST API | F5, F10 |
| **키즈노트 API** | 기관 알림장 발송 | Route Handler → REST API | F9-d |
| **Supabase Auth** | OAuth 2.0, Magic Link 인증 | `@supabase/auth-helpers-nextjs` | 무로그인→가입 전환 |
| **Vercel Analytics** | 퍼널/코호트 분석, Web Vitals | `@vercel/analytics` | 전체 |

## 3.4 Client Applications (V05 변경)

| 클라이언트 | 구현 방식 | 설명 | Phase |
|:---|:---|:---|:---:|
| **진단 웹뷰** | Next.js SSR Page | 무로그인 5분 진단 랜딩 (SEO 최적화) | P0 |
| **B2C 홈케어 앱** | **PWA** (Service Worker + Manifest) | 미션 수행, 리포트, 보상. 홈화면 설치 유도 | P0 |
| **B2C 앱스토어 배포** | **Capacitor 래핑** | PWA를 iOS/Android 네이티브 래퍼로 패키징 | P1 |
| **전문가 어드민** | Next.js Page (Route Group) | HITL 큐 관리. Supabase Realtime 구독 | P1 |
| **원장 대시보드** | Next.js Page (Route Group) | 기관 스크리닝, 알림장 관리 | P2 |
| **교실 태블릿** | **PWA** + Web Worker (VAD) | Zero-touch 음성 수집. Service Worker로 오프라인 버퍼링 | P2 |

## 3.5 API Overview (V05 — Server Actions + Route Handlers)

| 함수/경로 | 유형 | 입력 | 반환 | 제약 |
|:---|:---:|:---|:---|:---|
| `analyzeDiagnosis()` | Server Action | audioBlob, 월령, 타겟 음소 | 3축 점수, 백분위, Confidence | p95 ≤ 800ms |
| `getCurriculum()` | Server Action | 세션 이력 (정오답 패턴) | 추천 미션 ID, 난이도 레벨 | 연속 실패 3회 즉시 하향 |
| `getWeeklyReport()` | Server Action | userId, weekNumber | 주간 집계, 추이 JSON | p95 ≤ 3,000ms |
| `app/api/hitl/queue` | Route Handler (POST) | sessionId, confidenceScore | Queue 등록, 예상 SLA | Realtime 구독 |
| `app/api/hitl/comment` | Route Handler (PATCH) | queueId, expertComment | 코멘트 반영 | ≤ 48h SLA |
| `app/api/b2b/approval` | Route Handler (PATCH) | 기관ID, 알림장ID, 승인 여부 | 200 OK | 키즈노트 연동 |
| `app/api/consent/sign` | Route Handler (POST) | 동의서 템플릿, 학부모 식별자 | 서명 상태 | 카카오톡 연동 |
| `grantReward()` | Server Action | userId, rewardType, amount | 보상 반영 | ≤ 500ms |
| `app/api/audio/stream` | Route Handler (Edge) | Audio Stream (16kHz) | STT 결과 프록시 | Edge Runtime |

## 3.6 Interaction Sequences

### 3.6.1 B2C 핵심 플로우: 진단 → 미션 → 리포트 (V05)

```mermaid
sequenceDiagram
    participant Parent as 부모 (브라우저/PWA)
    participant Next as Next.js (Vercel)
    participant Gemini as Gemini API (AI SDK)
    participant STT as STT Engine
    participant DB as Supabase (PostgreSQL)
    participant HITL as HITL Queue (Realtime)

    Parent->>Next: 1. 랜딩 진입 (SSR 렌더)
    Next->>Parent: 2. 입력 폼 (월령, 타겟 음소) ≤3항목
    Parent->>STT: 3. 음성 녹음 → Client-side STT 직접 호출
    STT->>Parent: 4. 텍스트 + 음향 특징 반환
    Parent->>Next: 5. Server Action: analyzeDiagnosis()
    Next->>Gemini: 6. 3축 분석 보조 (Vercel AI SDK)
    Gemini->>Next: 7. 점수 + 백분위 + Confidence

    alt Confidence ≥ 70
        Next->>DB: 8a. Prisma → 결과 저장
        Next->>Parent: 9a. RSC 리포트 렌더 (p95 ≤ 1,500ms)
    else Confidence < 70
        Next->>HITL: 8b. Supabase Realtime → 큐 등록
        Next->>Parent: 9b. "전문가 검토 중" 안내
    end

    Parent->>Next: 10. 유료 전환 → Server Action: getCurriculum()
    Next->>Parent: 11. 데일리 미션 카드 발급

    loop Vercel Cron (매주 일요일)
        Next->>DB: 12. 주간 집계 배치
        Next->>Parent: 13. 푸시 알림 → 주간 추이 리포트
    end
```

### 3.6.2 HITL 에스컬레이션 플로우 (V05)

```mermaid
sequenceDiagram
    participant AI as Gemini (AI SDK)
    participant Next as Next.js Server Action
    participant DB as Supabase (Realtime)
    actor Expert as 언어재활사 (어드민 페이지)
    participant User as 사용자 (PWA)

    AI->>Next: 스코어링 + Confidence 산출
    alt Confidence < 70%
        Next->>DB: 자동 에스컬레이션 티켓 생성 (INSERT)
        DB-->>Expert: Realtime 구독 → 신규 티켓 알림
    end

    Expert->>DB: 오디오 청취 + 코멘트 작성 (UPDATE)
    Expert->>DB: 보정 점수 + Ground Truth 입력

    DB-->>User: Realtime 구독 → 감수 결과 알림
    Note over Next,DB: 보정 데이터 500건 누적 시 재학습 트리거
```

---

# 4. Specific Requirements

## 4.1 Functional Requirements

### Phase 0 — MVP 코어 (Must, 6 Epics)

#### Epic F1-a: 3축 AI 음성 분석 엔진

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-001** | 16kHz 오디오를 Client-side에서 STT 엔진으로 직접 전송 후, 결과를 Server Action `analyzeDiagnosis()`로 3축 스코어링 | S1 | Given: 유아 발화, When: STT→Server Action, Then: 3축 float, 실패율 `< 2%` |
| **REQ-FUNC-002** | 3축 점수 기반 동월령 또래 대비 백분위(peer_percentile) 산출 | S1 | Given: 3축+월령, When: Prisma 쿼리, Then: 0~100 float |
| **REQ-FUNC-003** | AI Confidence Score(0~100) 산출, 70 미만 시 Supabase Realtime으로 HITL 큐 자동 이관 | S1, S6 | Given: 분석완료, When: Confidence<70, Then: HITL 큐 자동 이관 |
| **REQ-FUNC-004** | STT 처리 실패 시 클라이언트 측 자동 재시도 1회 수행 | S1-AC2 | Given: STT 오류, When: 최초 실패, Then: 재시도 1회, 성공률 `≥ 98%` |
| **REQ-FUNC-005** | 음성 원본을 Supabase Storage에 임시 저장 후 `≤ 7일` 내 Vercel Cron으로 자동 폐기. 벡터는 pgvector에 영구 보관 | S5-AC4, CON-03 | Given: 수집완료, When: 7일 경과, Then: 원본 삭제+벡터 저장 |

**Exception Handling:**

| REQ ID | 예외 상황 | 처리 | Source |
|:---|:---|:---|:---:|
| **REQ-FUNC-006** | 마이크 접근 권한 거부 | OS 설정 이동 안내 shadcn/ui Dialog 노출 | S1-Neg1 |
| **REQ-FUNC-007** | 주변 소음 60dB 이상 지속 | shadcn/ui Toast "조용한 곳으로 이동" 팝업 | S1-Neg2 |

#### Epic F1-b: 무로그인 5분 진단 웹뷰

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-008** | 회원가입/로그인 없이 즉시 진단 세션 시작 (Next.js SSR 랜딩) | S1 | 입력 폼 `≤ 3개 항목` |
| **REQ-FUNC-009** | 전체 플로우 체류시간 `≤ 300초(5분)` | S1-AC1 | 진입→결과 `≤ 300초` |
| **REQ-FUNC-010** | 결과 페이지 React Server Component 렌더링 `p95 ≤ 1,500ms` | S1-AC3 | 서버분석+차트 포함 |
| **REQ-FUNC-011** | "의료적 판단 아님" Disclaimer 노출률 `100%` | S1-AC4, CON-04 | 결과 화면 필수 표시 |

#### Epic F2: 또래 비교 진단 리포트

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-012** | "상위 N%" 넛지 카피 포함 또래 비교 리포트 생성 | S1, S3 | 백분위 그래프 + 넛지 카피 |
| **REQ-FUNC-013** | 리포트 내 금칙어(진단, 장애) 0건 보장 | CON-04 | Middleware 정규식 스캔, 발각 시 렌더링 차단 |
| **REQ-FUNC-014** | 리포트 하단 유료 전환 CTA(페이월) 노출 | S3-AC3 | 무료 진단 후 CTA 표시 |

#### Epic F3-a: 1분 숏폼 미션 카드 UI

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-015** | 사용자 발달 수준 기반 개인화 데일리 미션 카드 발급 | S2 | 홈 화면 진입 시 개인화 미션 노출 |
| **REQ-FUNC-016** | 미션 세션 1~3분, Drop-off `< 10%` | S2-AC1 | 1~3분 세션, 이탈률 측정 |
| **REQ-FUNC-017** | Tailwind CSS + shadcn/ui 기반 타이머/진행바 UI | S2 | 잔여 시간 시각 표시 |
| **REQ-FUNC-018** | 첫 7일 개인화 주간 미션, 완료율 `≥ 70%` | S2-AC4 | 첫 주 미션 완료율 측정 |
| **REQ-FUNC-019** | 세션 중 1분+ 침묵 시 거울 모드/부모 개입 툴팁 | S2-Neg1 | 자동 팝업 |
| **REQ-FUNC-020** | 네트워크 단절 시 Service Worker 오프라인 캐시 → 연결 시 소급 보상 | S2-Neg2 | PWA 캐시+동기화 |

#### Epic F3-b: 적응형 난이도 조절 엔진

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-021** | 3회 연속 실패 시 난이도 은밀히 하향, X표시/실패음 `0회` | S2-AC2 | 전환 지연 `< 0.5초` |
| **REQ-FUNC-022** | Server Action `getCurriculum()`으로 세션 이력 기반 추천 미션 반환 | S2 | 난이도 레벨 + 미션 ID |
| **REQ-FUNC-023** | 난이도 하향 후 세션 이탈률 `< 5%` | CJM-B | 이탈률 측정 |

#### Epic F12: 게이미피케이션 보상 시스템

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-024** | 발화 성공 시 칭찬 파티클 `≤ 500ms` 렌더링 (CSS Animation / Framer Motion) | S2-AC3 | 파티클 딜레이 측정 |
| **REQ-FUNC-025** | 누적 보상(별, 나무 레벨, AI 그림) Prisma → Supabase 저장 | S2 | DB 반영 확인 |
| **REQ-FUNC-026** | 누적 보상 도감 UI (shadcn/ui Card Grid) | S2 | 별/나무/그림 현황 표시 |

> **Phase 0 소계: REQ-FUNC-001 ~ REQ-FUNC-026 (26개)**

---

### Phase 1 — 리텐션/바이럴 (Should, 10 Epics)

#### Epic F4: 주간 발달 추이 리포트

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-027** | 매주 일요일 Vercel Cron → 음소 백분위 꺾은선 그래프 자동 생성 | S3-AC1 | p95 `≤ 3,000ms` |
| **REQ-FUNC-028** | Gemini API로 "다음 주 예상 점수" 시뮬레이션 생성 | S3-AC3 | 클릭 유저 익월 유지율 `≥ 20%p↑` |
| **REQ-FUNC-029** | 데이터 부족 시 하락 그래프 대신 긍정적 메시지 표출 | S3-Neg1 | 미션 독려 + 이전 성과 표시 |

#### Epic F5: 카카오톡/SNS 공유

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-030** | Route Handler → 카카오톡 알림톡 API로 성과 뱃지 전송 | S3-AC2 | 전송 성공률 `≥ 95%` |
| **REQ-FUNC-031** | 외부 API 장애 시 클립보드 "링크 복사" 폴백 | S3-Neg2 | 링크 복사 UI 전환 |

#### Epic F6: HITL 전문가 코멘트 대시보드

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-032** | Next.js 전문가 어드민 페이지에서 Supabase Realtime 구독으로 대기열 실시간 확인 | S6 | 세션 오디오+AI 결과 표시 |
| **REQ-FUNC-033** | 큐 대기 24h 초과 시 자동 에스컬레이션 (Vercel Cron 모니터링) | S6-Neg1 | Slack Alert + 재배정 |
| **REQ-FUNC-034** | 월 3회 초과 이의제기 시 자동 반려/CS 이관 | S6-Neg2 | 4회차부터 자동 반려 |

#### Epic F7: 센터 제출용 PDF

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-035** | Route Handler로 서버 측 PDF 생성 (react-pdf 또는 Puppeteer) | S3 | 3축+추이 포함 A4 PDF |

#### Epic F11: 부모 목소리 복제 동화

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-036** | 외부 TTS 클로닝 API 연동 (Route Handler 프록시) | CJM-C | 클로닝 음성 동화 출력 |
| **REQ-FUNC-037** | 클로닝 음성 교정 훈련 적용 차단 | Won't | 시스템 기본 음성만 사용 |

#### Epic F14: 거울 모드

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-038** | 카메라 오버레이 입 모양 가이드 비교 (Client Component + WebRTC) | CJM-C | 가이드 오버레이 렌더 |

#### Epic F15: LLM 대화형 발화 유도 챗봇

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-039** | Vercel AI SDK `useChat()` 훅으로 Gemini 스트리밍 발화 유도 | CJM-C | 체류 `≥ 3분` |
| **REQ-FUNC-040** | 수집 발화 조음 분석 로깅 → Prisma → Supabase 자동 저장 | S1 | SESSION_LOG 자동 저장 |

#### Epic F16/F17/F18: 푸시·케어로그·예측

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-041** | Web Push API 기반 컨텍스트 푸시 스케줄링 (Vercel Cron 트리거) | CJM | 24h 후 일반화 팁 발송 |
| **REQ-FUNC-042** | 센터 오프라인 기록+앱 세션 타임라인 UI 통합 | CJM-C | 앱+센터 기록 시간순 통합 |
| **REQ-FUNC-043** | 주 2회+ 기록 유지율 `≥ 40%` | CJM-C | 유지율 측정 |
| **REQ-FUNC-044** | Gemini API로 회귀 모델 기반 다음 주 예상 점수 산출 | S3-AC3 | 예상 점수+신뢰구간 표시 |
| **REQ-FUNC-045** | 시뮬레이션 클릭 이벤트 Vercel Analytics 트래킹 | S3-AC3 | 이벤트 전송 확인 |

### Cross-cutting — HITL 안전 프로토콜 (4원칙)

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-HITL-001** | Confidence `< 70` 또는 이의제기 시 Supabase Realtime으로 즉시 이관 | HITL-자동에스컬레이션 | 큐 즉시 등록 |
| **REQ-FUNC-HITL-002** | Next.js Middleware에서 금칙어 정규식 자동 탐지 | HITL-의료판단회피 | 금칙어 발각 시 렌더링 차단 |
| **REQ-FUNC-HITL-003** | 48h 이내 100% 피드백 완료 | HITL-SLA보장 | 미완료 시 마스터 재활사 강제 이관 |
| **REQ-FUNC-HITL-004** | 전문가 보정 레이블 → 모델 재학습 환류 | HITL-루프백 | 오진율 >0.5% → 롤백 |

> **Phase 1 소계: REQ-FUNC-027~045 (19개) + HITL 4개 = 23개**

---

### Phase 2 — B2B 스케일업 (Could, 5 Epics)

#### Epic F9-a: 원장 대시보드

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-046** | Next.js Route Group `/(dashboard)` 반/원아 단위 스크리닝 | S4 | 반별 원아 현황 표시 |
| **REQ-FUNC-047** | 원장 명의 헤더/로고 커스텀 (Supabase Storage) | S4-AC2 | 렌더 `≤ 1초` |
| **REQ-FUNC-048** | ROI 시뮬레이터 (Client Component) | F9-a | 투자 대비 효과 시뮬레이션 |

#### Epic F9-b: Zero-touch 화자분리 수집

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-049** | 교실 태블릿 PWA + Web Worker(VAD)로 백그라운드 자동 수집 | S5-AC1 | 조작 `평균 0회` |
| **REQ-FUNC-050** | Edge Runtime proxy → STT 엔진 화자분리 정확도 `≥ 85%` | S5-AC2 | 타겟 아동 분리 정확도 |
| **REQ-FUNC-051** | Web Worker VAD 발화 감지 → 청크 전송 `≤ 300ms` | CON-01 | 청크 전송 지연 측정 |
| **REQ-FUNC-052** | 기기 마이크 고장/Mute 시 즉각 경고 PWA 알림 | S5-Neg1 | 경고 알림 발송 |
| **REQ-FUNC-053** | 7일 폐기 Vercel Cron 실패 시 재시도 3회→강제 삭제 큐 | S5-Neg2 | 어드민 경고 |

#### Epic F9-c: 원아 일괄등록 및 동의서

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-054** | Server Action으로 100명 원아 엑셀 파싱 일괄 등록 | S4-AC1 | p95 `≤ 3,000ms` |
| **REQ-FUNC-055** | 오류 행 하이라이트+인라인 수정 (shadcn/ui DataTable) | S4-Neg1 | 즉시 하이라이트 |

#### Epic F9-d: AI 쿠션어 알림장

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-056** | Vercel AI SDK → Gemini 쿠션어 알림장 초안 스트리밍 생성 | S5-AC3 | 쿠션어 초안 표시 |
| **REQ-FUNC-057** | 교사 무수정 발송 승인율 `≥ 90%` | S5-AC3 | 승인율 측정 |
| **REQ-FUNC-058** | Route Handler → 키즈노트 API 알림장 발송 | S5 | 전송 성공 |

#### Epic F10: 학부모 동의서 전자서명

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-059** | Route Handler → 카카오톡 전자서명 링크 발송 | S4-AC3 | 카카오톡 링크 발송 |
| **REQ-FUNC-060** | 서명 완료율 `≥ 85%` 유도 리마인더 (Vercel Cron) | S4-AC3 | D+3 리마인더 발송 |
| **REQ-FUNC-061** | 서명 7일 초과 시 만료 안내+재발송 알림 | S4-Neg2 | 교사에게 알림 |

> **Phase 2 소계: 16개. 전체 REQ-FUNC 합계: 26+23+16 = 65개**

---

## 4.2 Non-Functional Requirements

### 성능

| REQ ID | 항목 | 임계치 | 비고 (V05) |
|:---|:---|:---|:---|
| **REQ-NF-001** | 진단 Server Action 응답 | `p95 ≤ 800ms` | Vercel Serverless (10s timeout 내) |
| **REQ-NF-002** | 오디오 전송 지연 | `≤ 300ms` | Client → STT 직접 호출 |
| **REQ-NF-003** | PWA Cold Start | `≤ 1.5초` | Service Worker 프리캐시 |
| **REQ-NF-004** | 주간 리포트 RSC 렌더링 | `p95 ≤ 3,000ms` | React Server Component |
| **REQ-NF-005** | 보상 UI 렌더링 | `≤ 500ms` | CSS Animation / Framer Motion |
| **REQ-NF-006** | 원아 일괄 파싱 | `p95 ≤ 3,000ms` | Server Action (Vercel 60s Pro) |

### 가용성/SLA

| REQ ID | 항목 | 타겟 SLA |
|:---|:---|:---|
| **REQ-NF-007** | Vercel + Supabase Uptime | `≥ 99.9%` |
| **REQ-NF-008** | MTTR | `< 2시간` |
| **REQ-NF-009** | RPO (Supabase 자동 백업) | `< 1시간` |
| **REQ-NF-010** | RTO | `< 4시간` |
| **REQ-NF-011** | CS 최초 응답 | `< 4시간` |
| **REQ-NF-012** | HITL 피드백 완료 | `< 48시간` |

### 신뢰성

| REQ ID | 항목 | 임계치 |
|:---|:---|:---|
| **REQ-NF-013** | 오디오 인코딩/처리 오류율 | `≤ 0.5%` |
| **REQ-NF-014** | STT 재시도 성공률 | `≥ 98%` |
| **REQ-NF-015** | 교실 화자분리 정확도 (60dB) | `≥ 85%` |

### 보안

| REQ ID | 항목 | 기준 |
|:---|:---|:---|
| **REQ-NF-016** | 음성 원본 Supabase Storage 보관 | `≤ 7일` 후 Cron 자동 폐기 |
| **REQ-NF-017** | 전송 암호화 | Vercel 기본 `TLS 1.3`, Supabase `AES-256` |
| **REQ-NF-018** | AI API 호출 비용 통제 | 유저당 월 `≤ ₩5,250` (구독료 15%) |
| **REQ-NF-019** | RBAC (Next.js Middleware + Supabase RLS) | 원장/교사/재활사/관리자 역할 분리, Supabase Audit Log |

### 모니터링

| REQ ID | 대시보드 | Alert 기준 |
|:---|:---|:---|
| **REQ-NF-020** | 퍼널 전환 (Vercel Analytics) | 일간 CVR 변동 `±20%` 시 Alert |
| **REQ-NF-021** | STT 오류 모니터링 | 500 에러율 5분 내 `3%` 초과 시 Slack Alert |
| **REQ-NF-022** | 비즈니스 KPI | LTV:CAC `< 3.0` 하락 시 주간 리뷰 트리거 |
| **REQ-NF-023** | HITL 큐 운영 | 24h 초과 `3건+` 시 Alert |
| **REQ-NF-024** | 외부 API 연동 | 에러율 1h 내 `5%` 초과 시 Fallback |

### Business KPI

| REQ ID | KPI | 목표값 | 주기 |
|:---|:---|:---|:---:|
| **REQ-NF-025** | W-AUR (북극성) | `≥ 60%` | 주간 |
| **REQ-NF-026** | M3 리텐션 | `≥ 40%` | 월간 |
| **REQ-NF-027** | 무료→유료 CVR | `≥ 8%` | 주간 |
| **REQ-NF-028** | Zero-touch 승인율 | `≥ 90%` | PoC |
| **REQ-NF-029** | 오진 치명 수정률 | `< 0.5%` | 월간 |
| **REQ-NF-030** | Churn Rate | `≤ 5%` | 월간 |

> **NFR 합계: REQ-NF-001 ~ REQ-NF-030 (30개)**
---

# 5. Traceability Matrix

| Story | REQ-FUNC ID | Requirement Summary | REQ-NF | TC ID |
|:---|:---|:---|:---|:---|
| **S1 (5분 진단)** | REQ-FUNC-001 | Client→STT→Server Action 파이프라인 | NF-001, NF-002 | TC-S1-001 |
| | REQ-FUNC-002 | 3축 스코어링+백분위 | NF-001 | TC-S1-002 |
| | REQ-FUNC-003 | Confidence→HITL Realtime 트리거 | | TC-S1-003 |
| | REQ-FUNC-004 | Client STT 재시도 | NF-014 | TC-S1-004 |
| | REQ-FUNC-005 | Supabase Storage 벡터 변환+폐기 | NF-016 | TC-S1-005 |
| | REQ-FUNC-006 | 마이크 권한 거부 Exc | | TC-S1-006 |
| | REQ-FUNC-007 | 소음 60dB Exc | | TC-S1-007 |
| | REQ-FUNC-008 | SSR 무로그인 랜딩 | | TC-S1-008 |
| | REQ-FUNC-009 | 5분 체류시간 | NF-003 | TC-S1-009 |
| | REQ-FUNC-010 | RSC 결과 렌더링 p95 | NF-001 | TC-S1-010 |
| | REQ-FUNC-011 | Disclaimer 100% | | TC-S1-011 |
| | REQ-FUNC-012 | 넛지 리포트 | | TC-S1-012 |
| | REQ-FUNC-013 | Middleware 금칙어 0건 | | TC-S1-013 |
| | REQ-FUNC-014 | 유료 전환 CTA | NF-027 | TC-S1-014 |
| **S2 (홈케어 미션)** | REQ-FUNC-015 | 개인화 미션 카드 | NF-025 | TC-S2-001 |
| | REQ-FUNC-016 | 1~3분 세션+이탈 <10% | NF-030 | TC-S2-002 |
| | REQ-FUNC-017 | shadcn/ui 타이머/진행바 | | TC-S2-003 |
| | REQ-FUNC-018 | 첫 주 미션 완료율 ≥70% | NF-025 | TC-S2-004 |
| | REQ-FUNC-019 | 침묵 감지 툴팁 Exc | | TC-S2-005 |
| | REQ-FUNC-020 | PWA Service Worker 소급 보상 | | TC-S2-006 |
| | REQ-FUNC-021 | 적응형 난이도 하향 | | TC-S2-007 |
| | REQ-FUNC-022 | getCurriculum() Server Action | | TC-S2-008 |
| | REQ-FUNC-023 | 하향 후 이탈 <5% | NF-030 | TC-S2-009 |
| | REQ-FUNC-024 | 파티클 보상 ≤500ms | NF-005 | TC-S2-010 |
| | REQ-FUNC-025 | Prisma→Supabase 보상 DB | | TC-S2-011 |
| | REQ-FUNC-026 | shadcn/ui 도감 UI | | TC-S2-012 |
| **S3 (주간 리포트)** | REQ-FUNC-027 | Vercel Cron 추이 리포트 | NF-004 | TC-S3-001 |
| | REQ-FUNC-028 | Gemini 예측 시뮬레이션 | NF-026 | TC-S3-002 |
| | REQ-FUNC-029 | 데이터 불충분 처리 Exc | | TC-S3-003 |
| | REQ-FUNC-030 | Route Handler→카카오 뱃지 공유 | | TC-S3-004 |
| | REQ-FUNC-031 | 공유 API 폴백 Exc | NF-024 | TC-S3-005 |
| | REQ-FUNC-035 | PDF 다운로드 | | TC-S3-006 |
| | REQ-FUNC-044 | Gemini 예측 점수 산출 | | TC-S3-007 |
| | REQ-FUNC-045 | Vercel Analytics 트래킹 | | TC-S3-008 |
| **S4 (기관 대시보드)** | REQ-FUNC-046 | Route Group 원장 뷰 | NF-004 | TC-S4-001 |
| | REQ-FUNC-047 | Supabase Storage 로고 커스텀 | | TC-S4-002 |
| | REQ-FUNC-048 | Client Component ROI 시뮬 | | TC-S4-003 |
| | REQ-FUNC-054 | Server Action 엑셀 일괄 등록 | NF-006 | TC-S4-004 |
| | REQ-FUNC-055 | shadcn/ui DataTable 인라인 수정 | | TC-S4-005 |
| | REQ-FUNC-059 | Route Handler→카카오 서명 | NF-017 | TC-S4-006 |
| | REQ-FUNC-060 | Vercel Cron 서명 리마인더 | | TC-S4-007 |
| | REQ-FUNC-061 | 서명 기한 만료 Exc | | TC-S4-008 |
| **S5 (Zero-touch)** | REQ-FUNC-049 | PWA+Web Worker 패시브 수집 | NF-028 | TC-S5-001 |
| | REQ-FUNC-050 | Edge proxy 화자분리 ≥85% | NF-015 | TC-S5-002 |
| | REQ-FUNC-051 | Web Worker VAD ≤300ms | NF-002 | TC-S5-003 |
| | REQ-FUNC-052 | 마이크 고장 PWA 알림 Exc | | TC-S5-004 |
| | REQ-FUNC-053 | Vercel Cron 폐기 실패 Exc | NF-016 | TC-S5-005 |
| | REQ-FUNC-056 | AI SDK→Gemini 쿠션어 생성 | | TC-S5-006 |
| | REQ-FUNC-057 | 무수정 승인율 ≥90% | NF-028 | TC-S5-007 |
| | REQ-FUNC-058 | Route Handler→키즈노트 발송 | NF-024 | TC-S5-008 |
| **S6 / HITL** | REQ-FUNC-HITL-001 | Supabase Realtime 자동 에스컬레이션 | | TC-HITL-001 |
| | REQ-FUNC-HITL-002 | Middleware 금칙어 필터 | | TC-HITL-002 |
| | REQ-FUNC-HITL-003 | 전문가 SLA 48h | NF-012 | TC-HITL-003 |
| | REQ-FUNC-HITL-004 | 루프백 재학습 | NF-029 | TC-HITL-004 |
| | REQ-FUNC-032 | Supabase Realtime 큐 관리 뷰 | | TC-HITL-005 |
| | REQ-FUNC-033 | Vercel Cron 24h 에스컬레이션 | NF-023 | TC-HITL-006 |
| | REQ-FUNC-034 | 어뷰징 방어 | | TC-HITL-007 |

---

# 6. Appendix

## 6.1 Entity Relationship Diagram (ERD) — Supabase PostgreSQL + pgvector
```mermaid
erDiagram
    users ||--o{ session_logs : "conducts"
    users ||--o{ reward_progress : "tracks"
    institutions ||--o{ users : "manages"
    session_logs ||--o| evaluation_results : "generates"
    mission_cards ||--o{ session_logs : "triggers"
    weekly_reports ||--o{ evaluation_results : "aggregates"

    users {
        uuid id PK
        text role "parent|teacher|principal|expert|admin"
        int child_age_months
        text subscription_tier "free|basic|premium"
        timestamp created_at
    }
    session_logs {
        uuid id PK
        uuid user_id FK
        uuid mission_id FK
        timestamp start_time
        int duration_sec
        text audio_vector_uri "pgvector embedding ref"
    }
    evaluation_results {
        uuid id PK
        uuid session_id FK
        float8 articulation_score
        float8 linguistic_score
        float8 acoustic_score
        float8 peer_percentile
        float8 confidence
        boolean hitl_reviewed
        text ai_cushion_text
    }
    institutions {
        uuid id PK
        text name
        text principal_name
        boolean consent_status
        text logo_uri "Supabase Storage path"
    }
    mission_cards {
        uuid id PK
        text target_phoneme
        int difficulty_level
        text reward_type
    }
    weekly_reports {
        uuid id PK
        uuid user_id FK
        int week_number
        jsonb score_trend
        float8 predicted_next_score
        timestamp generated_at
    }
    reward_progress {
        uuid id PK
        uuid user_id FK
        int cumulative_stars
        int tree_growth_level
        int ai_drawing_count
        timestamp updated_at
    }
```

## 6.2 Domain Class Diagram
```mermaid
classDiagram
    class User {
        +String id
        +String role
        +startSession()
        +viewReport()
    }
    class SessionLog {
        +String id
        +DateTime startTime
        +Int durationSec
        +processAudio()
    }
    class EvaluationResult {
        +String id
        +Float score
        +Boolean requiresHITL
        +generateCushionText()
    }
    class MissionCard {
        +String id
        +String targetPhoneme
        +Int difficulty
        +adjustDifficulty()
    }
    class HITLExpert {
        +String id
        +reviewResult(EvaluationResult)
        +submitComment()
    }

    User "1" *-- "*" SessionLog : conducts
    SessionLog "1" --> "1" EvaluationResult : generates
    MissionCard "1" --> "*" SessionLog : triggers
    HITLExpert "1" --> "*" EvaluationResult : reviews
```

## 6.3 Sequence Diagrams (추가)

### 6.3.1 게이미피케이션 보상 소급 플로우 (PWA Offline → Sync)
```mermaid
sequenceDiagram
    autonumber
    actor Child
    participant PWA as PWA (Service Worker)
    participant Cache as IndexedDB
    participant SA as Server Action (Vercel)
    participant DB as Supabase

    Child->>PWA: 미션 수행 완료 (발화)
    PWA->>SA: 평가 요청 (네트워크 단절)
    SA--xPWA: Timeout / Connection Error
    PWA->>PWA: 즉각 칭찬 파티클 렌더링 (단절 무관)
    PWA->>Cache: IndexedDB에 세션 로그 + 임시 별점 저장
    Note over Child,Cache: (오프라인 상태 유지)
    
    Child->>PWA: 앱 재실행 (네트워크 복구)
    PWA->>SA: Background Sync → 캐시 데이터 업로드
    SA->>DB: Prisma → 보상 정합성 확인 및 반영
    DB-->>SA: 소급 완료
    SA-->>PWA: 누적 별점 및 도감 상태 업데이트
    PWA-->>Child: "놓친 별들을 가져왔어요!" 렌더링
```

### 6.3.2 B2B Zero-touch 수집 플로우 (PWA + Edge Runtime)
```mermaid
sequenceDiagram
    participant Tablet as 교실 태블릿 PWA
    participant Worker as Web Worker (VAD)
    participant Edge as Edge Runtime (Vercel)
    participant STT as STT Engine
    participant SA as Server Action
    participant DB as Supabase

    Tablet->>Worker: 1. 자유놀이 시작 (마이크 자동 활성화)
    Worker->>Worker: 2. 발화 구간 감지 (VAD)
    Worker->>Edge: 3. 오디오 청크 전송 (≤ 300ms)
    Edge->>STT: 4. Speaker Diarization 프록시
    STT->>Edge: 5. 성인 필터링 + 아동 분리 (≥ 85%)
    Edge->>SA: 6. 3축 스코어링 요청
    SA->>DB: 7. Prisma → 결과 저장
    SA->>DB: 8. AI 쿠션어 알림장 초안 생성 (Gemini)
    Note over Tablet: 교사 능동 조작 0회
```

### 6.3.3 전자서명 동의서 플로우
```mermaid
sequenceDiagram
    participant Principal as 원장
    participant Next as Next.js (Server Action)
    participant RH as Route Handler
    participant Kakao as 카카오톡 API
    participant Parent as 학부모

    Principal->>Next: 1. 원아 일괄 등록 (엑셀 업로드)
    Next->>Next: 2. Server Action 파싱 + Prisma 저장 (p95 ≤ 3,000ms)
    Next->>RH: 3. /api/consent/sign 동의서 링크 생성
    RH->>Kakao: 4. 카카오톡 알림 발송
    Kakao->>Parent: 5. 알림 수신
    Parent->>RH: 6. 전자서명 완료

    alt 서명 미완료 D+3
        Note over Next: Vercel Cron 트리거
        RH->>Kakao: 7a. 리마인더 재발송
    end
    alt 7일 초과
        RH->>Principal: 7b. "재발송 필요" 알림
    end
```

## 6.4 Tech Stack Summary (V05 신규)

| Layer | Technology | 용도 |
|:---|:---|:---|
| **Framework** | Next.js 15 (App Router) | 풀스택 단일 프레임워크 (C-TEC-001) |
| **Server Logic** | Server Actions + Route Handlers | 별도 BE 서버 불필요 (C-TEC-002) |
| **Database** | Prisma + SQLite(dev) / Supabase PostgreSQL(prod) | ORM 통합 (C-TEC-003) |
| **Vector DB** | pgvector (Supabase 확장) | 음성 벡터 임베딩 저장 |
| **UI** | Tailwind CSS + shadcn/ui | AI 코드 생성 일관성 (C-TEC-004) |
| **Auth** | Supabase Auth (OAuth, Magic Link) | RBAC + RLS |
| **Storage** | Supabase Storage | 임시 오디오 파일 (≤7일) |
| **Realtime** | Supabase Realtime | HITL 큐 실시간 구독 |
| **AI/LLM** | Vercel AI SDK + Google Gemini | 쿠션어/챗봇/분석 (C-TEC-005, 006) |
| **Deploy** | Vercel | Git Push 자동 배포 (C-TEC-007) |
| **Cron** | Vercel Cron Jobs | 주간 리포트, 파기 스크립트, 리마인더 |
| **Analytics** | Vercel Analytics | 퍼널/코호트/Web Vitals |
| **Mobile** | PWA + Capacitor | 앱스토어 배포 (P1) |

## 6.5 Implementation Timeline
```mermaid
gantt
    title V05 Next.js Fullstack 개발 로드맵
    dateFormat  YYYY-MM
    axisFormat  %m월

    section Phase 0 (MVP)
    F1-a 3축 AI 엔진 (Server Action)      :active, f1a, 2026-06, 2026-08
    F1-b 5분 진단 SSR 랜딩               :active, f1b, 2026-06, 2026-08
    F2 또래 비교 리포트 RSC              :f2, 2026-06, 2026-08
    F3-a 숏폼 미션 UI (shadcn)           :f3a, 2026-06, 2026-08
    F3-b 적응형 난이도 (Server Action)    :f3b, 2026-06, 2026-08
    F12 보상 시스템 (Prisma)             :f12, 2026-07, 2026-08
    PWA 설정 + Service Worker            :pwa, 2026-07, 2026-08
    EXP-1/4 검증                        :p0, 2026-08, 2026-09

    section Phase 1 (Retention)
    F4 주간 리포트 (Vercel Cron)          :f4, 2026-08, 2026-10
    F6 HITL 어드민 (Supabase Realtime)   :f6, 2026-08, 2026-10
    F5/F7 공유+PDF                      :f5, 2026-09, 2026-10
    F15 Gemini 챗봇 (AI SDK useChat)     :f15, 2026-09, 2026-10
    Capacitor 앱스토어 래핑              :cap, 2026-09, 2026-10
    EXP-2 리텐션 검증                    :p1, 2026-11, 2026-12

    section Phase 2 (B2B)
    F9-a 원장 대시보드 (Route Group)      :f9a, 2026-10, 2026-12
    F9-b Zero-touch PWA+Edge            :f9b, 2026-10, 2026-12
    F9-c/F10 등록+동의 (Server Action)   :f9c, 2026-11, 2026-12
    F9-d AI 쿠션어 알림장 (AI SDK)        :f9d, 2026-11, 2026-12
    EXP-3 B2B PoC                       :p2, 2026-12, 2027-01
```

## 6.6 Validation Plan (EXP-1~4)

| 실험 ID | 가설 | 설계 | 성공 기준 | Phase |
|:---|:---|:---|:---|:---:|
| **EXP-1** | 코칭 톤 > DTx 톤 전환율 | A/B (n=500, 2주) | CVR `+2%p` | P0 |
| **EXP-2** | 예측 시뮬레이션 → M3 리텐션 향상 | A/B (n=800, 4~8주) | M3 `≥ 40%` | P1 |
| **EXP-3** | Zero-touch → 기관 수락률 증가 | PoC (10개 기관) | 조작 0회 + 수락률 `≥ 20%` | P2 |
| **EXP-4** | 앵커링 가격 → 결제 시작률 증가 | Paywall A/B (n=1,000, 2주) | 결제 시작률 `+5%p` | P0 |

## 6.7 Contingency Plan (R6 피벗 시나리오)

EXP-2 결과 M3 리텐션 40% 미달 시:

| 피벗 조치 | 대상 | 변경 내용 |
|:---|:---|:---|
| F4 재설계 | F4 | 정적 그래프 → F18 예측 시뮬레이션 최상단 승격 |
| F12 보상 강화 | F12 | 월간 성장 리포트 + 보상 연동, 해지 시 손실 체감 극대화 |
| F5 공유 리디자인 | F5 | 뱃지 → 아이 성장 스토리 카드로 감성 내러티브 전환 |
| EXP-2b 후속 | 신규 | 피벗 후 4주 재측정 (n=400), M3 ≥ 35% 미달 시 Seg B 축소 |

## 6.8 ADR Reference (V05 업데이트)

| ADR ID | 결정 | 대안 | 사유 | 영향 |
|:---|:---|:---|:---|:---|
| **ADR-01** | Zero-touch 수집 전면 도입 | 교사 수동 녹음 | 교사 업무 가중→B2B 실패 | PWA+Web Worker VAD |
| **ADR-02** | HITL 비동기 감수 | AI 단독 판정 | 1건 오진→규제+민원 | Supabase Realtime 큐 |
| **ADR-03** | 원본 음성 즉각 폐기 | 원본 영구 보관 | 아동보호법 위반 | Supabase Storage+Vercel Cron |
| **ADR-04** | 의료 용어 배제 | 임상 용어 노출 | DTx 인허가 회피 | Next.js Middleware 금칙어 스캐너 |
| **ADR-05** | **Next.js 풀스택 모놀리스** | **FE/BE 분리 (React+NestJS)** | **1인/소규모 팀 생산성 극대화** | **C-TEC-001~007 전면 적용** |
| **ADR-06** | **Supabase BaaS 통합** | **자체 PostgreSQL+Redis** | **인프라 운영 부담 제거** | **Auth/Storage/Realtime 일원화** |
| **ADR-07** | **Vercel AI SDK + Gemini** | **LangChain Python 서버** | **Python 서버 운영 비용 제거** | **C-TEC-005, 006 준수** |

---

# 문서 요약 통계

| 구분 | 항목 수 | V04 대비 |
|:---|:---:|:---|
| **Functional Requirements** | 65개 | 동일 (구현 방식 변경) |
| **HITL Cross-cutting** | 4개 | 동일 |
| **Non-Functional Requirements** | 30개 | 동일 (인프라 반영) |
| **총 Requirements** | **99개** | 동일 |
| **시퀀스 다이어그램** | 5개 | 전체 V05 스택 반영 |
| **구조 다이어그램** | 5개 | Component 전면 재설계 |
| **Entity (Supabase)** | 7개 | UUID/Supabase 규격 반영 |
| **Server Actions** | 5개 | REST API 8개 → 혼합 구조 |
| **Route Handlers** | 4개 | 외부 연동 전용 |
| **실험 설계** | 4건 | 동일 |
| **ADR** | **7건** | +3건 (ADR-05~07 신규) |
| **Tech Stack Components** | **14종** | V05 신규 |

---

**— End of SRS-001 v3.0 (V05 Next.js Full-stack Edition) —**
