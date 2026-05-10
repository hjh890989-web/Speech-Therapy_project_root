---
type: source
pillar: product
title: Task Breakdown — SRS V06 88개 태스크 + Sprint 1 강화판 + 8 Descope (TASKS/01·03 통합)
source_path: ../../../raw/TASKS/01_Task_Breakdown_SRS_V06.md
source_path_b: ../../../raw/TASKS/03_Tasks_Breakdown_SRS_reinforce.md
source_path_c: ../../../raw/TASKS/02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md
source_path_d: ../../../raw/TASKS/04_AGENT_PROMPT_Task_Detail_Extraction.md
source_type: task_breakdown
authors: []
year: 2026
ingested: 2026-05-09
tags: [Task, Sprint1, Descope, CQRS, 88개태스크, 22Epic, 클러스터TASKS]
---

# Task Breakdown — 통합 요약 (TASKS/01 + 03 + 02 + 04)

> **한 줄 요약.** SRS V06 → **88개 원자 태스크** (DB 11 / API 12 / MOCK 3 / FR-Q 14 / FR-C 18 / TEST 14 / NFR·Infra·Sec·Mon·Ops 16). **Sprint 1 = 8 코어 태스크로 7일 내 Vercel 라이브** + **8 Descope 적용 매트릭스**. SRS 무손상 보존, Task 레이어에서만 Phase·모드 재배치.

## 추출 방법론 (01)

> **Contract-First → CQRS(Read/Write 분리) → AC→TDD 변환 → NFR/Infra/Dependency**

추출 4 원칙:
1. **계약 우선**: Feature보다 DB 스키마와 API DTO를 먼저 고정
2. **상태 변경 분리(CQRS)**: 같은 도메인이라도 Read(Query) / Write(Command) 별 태스크
3. **AC → 테스트 코드**: 인수 조건은 단위/통합 테스트 태스크로 변환
4. **UI/UX는 별도 트랙**: 본 명세서는 백엔드/프론트엔드 + 인프라만, 디자인 시안 제외

복잡도: **H 높음(2주+)** · M 중간(3~10일) · L 낮음(1~3일)

## 88 태스크 카테고리 + Epic 매핑 (Step 1-4)

### Step 1 · 계약·데이터 (DB 11 + API 12 + MOCK 3 = 26)

#### DB Tasks (11)
| Task ID | Epic | Feature | 핵심 SRS |
|---|---|---|---|
| **DB-001** | Foundation | Prisma + Supabase 부트스트랩 | C-TEC-003, 6.4 |
| **DB-002** | User | `users` 테이블 (role enum, child_age_months, subscription_tier) | 6.1 ERD, REQ-NF-019 |
| **DB-003** | Institution | `institutions` + `users.institution_id` FK | 6.1 ERD, F9-a |
| **DB-004** | Session | `session_logs` + pgvector 활성화 | REQ-FUNC-005, CON-03 |
| **DB-005** | Diagnosis | `evaluation_results` (3축 + 백분위 + confidence + hitl_reviewed) | REQ-FUNC-002 |
| **DB-006** | Mission | `mission_cards` + 시드 | REQ-FUNC-015 |
| **DB-007** | Report | `weekly_reports` (jsonb 추이 + 예측) | REQ-FUNC-027 |
| **DB-008** | Reward | `reward_progress` (별·나무·AI그림) | REQ-FUNC-025 |
| **DB-009** | HITL | `hitl_queue` (sla_due_at + assigned_expert_id) ⭐ | REQ-FUNC-HITL-001~003 |
| **DB-010** | Consent | `consent_signatures` (kakao_link_id + expires_at) ⭐ | REQ-FUNC-059~061 |
| **DB-011** | Security | Supabase RLS + Row-level Audit Log | REQ-NF-019 |

⭐ DB-009, DB-010 = ERD 외 추가 도출.

#### API Tasks (12) — Server Actions + Route Handlers
| Task | Epic | 함수/경로 | SRS |
|---|---|---|---|
| **API-001** | Diagnosis | `analyzeDiagnosis()` SA + Zod | REQ-FUNC-001~003 |
| **API-002** | Mission | `getCurriculum()` SA | REQ-FUNC-022 |
| **API-003** | Report | `getWeeklyReport()` SA | REQ-FUNC-027 |
| **API-004** | Reward | `grantReward()` SA + 멱등성 | REQ-FUNC-025 |
| **API-005** | HITL | `app/api/hitl/queue` POST | REQ-FUNC-003, HITL-001 |
| **API-006** | HITL | `app/api/hitl/comment` PATCH | REQ-FUNC-032, HITL-003 |
| **API-007** | B2B | `app/api/b2b/approval` PATCH | REQ-FUNC-057~058 |
| **API-008** | Consent | `app/api/consent/sign` POST | REQ-FUNC-059 |
| **API-009** | Audio | `app/api/audio/stream` Edge | REQ-FUNC-051, R7 |
| **API-010** | Auth | Supabase Auth + Middleware RBAC | REQ-NF-019 |
| **API-011** | Cushion | Vercel AI SDK + Gemini 어댑터 | C-TEC-005~006 |
| **API-012** | External | 카카오 + 키즈노트 클라이언트 + Fallback | D2, R5 |

#### MOCK Tasks (3) — FE 선개발 지원
- MOCK-001 (Diagnosis 3종) / MOCK-002 (Mission+Reward) / MOCK-003 (HITL+B2B+Consent)

### Step 2 · CQRS Logic (FR-Q 14 + FR-C 18 = 32)

#### FR-Q (Read) 14 — Epic 매핑

| Task | Epic | 기능 |
|---|---|---|
| FR-Q-001 | F1-b | 무로그인 SSR 5분 진단 페이지 (p95 ≤1.5s) |
| FR-Q-002 | F2 | 또래 비교 RSC + 넛지 + Disclaimer 100% |
| FR-Q-003 | F3-a | 데일리 미션 카드 홈 화면 (shadcn/ui 타이머) |
| FR-Q-004 | F12 | 보상 도감(별·나무·AI그림) Card Grid |
| FR-Q-005 | F4 | 주간 추이 꺾은선 + 예측 점수 |
| FR-Q-006 | F4 예외 | 데이터 부족 긍정 메시지 분기 |
| FR-Q-007 | F7 | 센터 제출용 PDF (react-pdf) |
| FR-Q-008 | F6 | 전문가 어드민 큐 Realtime 구독 |
| FR-Q-009 | F9-a | 원장 Route Group `/(dashboard)` |
| FR-Q-010 | F9-a | 원장 명의 헤더 커스텀 |
| FR-Q-011 | F9-a | ROI 시뮬레이터 |
| FR-Q-012 | F18 | 다음 주 예상 점수 + 신뢰구간 |
| FR-Q-013 | F17 | 케어로그 통합 타임라인 |
| FR-Q-014 | F14 | 카메라 거울 모드 (WebRTC) |

#### FR-C (Write) 18 — Epic 매핑

| Task | Epic | 기능 |
|---|---|---|
| FR-C-001 | F1-a | 3축 스코어링 SA 비즈니스 로직 (STT + Gemini → INSERT) |
| FR-C-002 | F1-a | Confidence<70 → HITL Realtime 자동 INSERT |
| FR-C-003 | F1-a | STT 실패 클라이언트 재시도 1회 (≥98%) |
| FR-C-004 | F1-a | 음성 7일 Vercel Cron 자동 폐기 + 벡터 보관 |
| FR-C-005 | F2 | Middleware 금칙어 정규식 (렌더링 차단) |
| FR-C-006 | F3-a | 1분+ 침묵 → 거울/부모 개입 툴팁 |
| FR-C-007 | F3-a | PWA Service Worker IndexedDB + Background Sync |
| FR-C-008 | F3-b | 3연속 실패 은밀 하향 (`getCurriculum()`) |
| FR-C-009 | F12 | 발화 성공 → 파티클 + reward_progress UPSERT |
| FR-C-010 | F4 | Vercel Cron weekly_reports 배치 |
| FR-C-011 | F4 | Gemini 회귀 예측 + 시뮬레이션 클릭 트래킹 |
| FR-C-012 | F5 | 카카오 알림톡 + 클립보드 폴백 |
| FR-C-013 | F6 | 전문가 코멘트 PATCH + Ground Truth |
| FR-C-014 | F6 | 24h 자동 에스컬레이션 + 월3회 자동 반려 |
| FR-C-015 | F9-b | **교실 PWA + Web Worker VAD → Edge 청크 (≤300ms)** |
| FR-C-016 | F9-c | 원아 엑셀 100명 SA 파싱 + 인라인 수정 |
| FR-C-017 | F9-d | Vercel AI SDK → 쿠션어 알림장 + 키즈노트 |
| FR-C-018 | F10 | 카카오 전자서명 + D+3 리마인더 + 7일 만료 |

### Step 3 · TEST 14 (Story → REQ-FUNC → TC)

| Task | Story | 핵심 |
|---|---|---|
| TEST-001~005 | S1 진단 | GWT 단위·통합·E2E (Playwright) |
| TEST-006~009 | S2 미션·보상 | 1-3분 / 적응형 / 오프라인 / 파티클 |
| TEST-010~011 | S3 리포트·공유 | Cron 통합 + 카톡 폴백 |
| TEST-012 | S4 B2B | 100명 엑셀 |
| TEST-013 | S5 Zero-touch | 화자분리 ≥85% + VAD |
| TEST-014 | S6 HITL | 48h SLA + 루프백 |

### Step 4 · NFR/Infra/Sec/Mon/Ops (16)

| 영역 | Tasks | 핵심 |
|---|---|---|
| **INFRA-001** | Deploy | Vercel + Pro $20 (60s timeout) |
| **INFRA-002** | Cron | 4종 (주간 / 7일 폐기 / 24h 에스컬레이션 / D+3 리마인더) |
| **INFRA-003** | PWA | Service Worker + Manifest + Capacitor (P1) |
| **INFRA-004** | Edge | Audio stream 라우팅 |
| **INFRA-005** | Analytics | Vercel Analytics + Web Vitals |
| **PERF-001~002** | Perf | k6 부하 + Lighthouse 회귀 |
| **SEC-001~004** | Security | 7일 폐기·RBAC+RLS·전자서명·비용 가드 |
| **MON-001~004** | Monitor | 퍼널·STT 에러·HITL 큐·Uptime |
| **OPS-001** | Ops | CS 4h + HITL 48h |

## ⭐ Sprint 1 — 7일 코어 8 태스크 (03 강화판)

> **목표**: 7일 내 Vercel 라이브, 월 $20 (Vercel Pro만), Web Speech API 텍스트 입력으로 5분 진단 → DB → 또래 비교 그래프 코어 루프 검증.

| 순서 | Task ID | 일정 | 핵심 단순화 |
|---|---|---:|---|
| 1 | **DB-001** | 1d | dev=SQLite로 빠른 시작 |
| 2 | **DB-002+005+006+008** | 1d | 4 핵심 테이블 묶음. **RLS는 Sprint 2로** |
| 3 | **API-001** | 0.5d | `analyzeDiagnosis()` SA DTO + Zod 명세대로 |
| 4 | **FR-Q-001** | 1d | 무로그인 5분 진단 SSR |
| 5 | **FR-C-001** | 1.5d | 3축 스코어링. **STT는 Web Speech API(무료)** ← D7 |
| 6 | **FR-Q-002** | 1d | 또래 비교 RSC + Disclaimer. 금칙어 인라인 |
| 7 | **FR-C-009** | 0.5d | 보상 INSERT (별 +1) |
| 8 | **INFRA-001** | 0.5d | Vercel Pro 배포 |

**Sprint 1 합격 기준**:
1. 진단 진입 → 발화/텍스트 → 3축 + 백분위 (≤300s)
2. evaluation_results · reward_progress 테이블 INSERT 확인
3. Vercel 라이브 + 월 $20 (Web Speech 무료 → STT $0)
4. Disclaimer 100% 노출

## ⭐ 8 Descope 적용 매트릭스 (67 + 02 통합)

| ID | 권고 | 영향 SRS REQ | 영향 Task | 액션 | 승격 시점 |
|---|---|---|---|---|---|
| **67-D1** | 실시간 오디오 → Web Speech | REQ-FUNC-001 | API-009, FR-C-001/003 | 🔵 단순 대체 | P0 2주차 Whisper 전환 |
| **67-D2** | Capacitor 보류 | INFRA-003 | INFRA-003 일부 | 🟡 P1 후반 디퍼 | EXP-2 통과 후 |
| **67-D3** | Zero-touch 보류 | F9-b 전체 | API-009, INFRA-004, FR-C-015, REQ-FUNC-049~053 | 🔴 P2 디퍼 | B2B PoC 5건 후 |
| **D4** | HITL Realtime → Slack 웹훅 | REQ-FUNC-003, 032~034, HITL-001~003 | DB-009, API-005~006, FR-Q-008, FR-C-002/013/014, TEST-014 | 🔵 단순 대체 (Slack/이메일 + Supabase Studio) | P1 중반 어드민 도입 |
| **D5** | PWA 오프라인 소급 보상 → 온라인 전제 | REQ-FUNC-020 | INFRA-003, FR-C-007, TEST-008 | 🟡 P1 디퍼 | M3 측정 후 |
| **D6** | pgvector 영구 보관 → 미생성 | REQ-FUNC-005, CON-03 | DB-004 부분 | 🔴 P2 디퍼 | 보정 데이터 500건 후 |
| **D7** | Edge Runtime 오디오 → 클라이언트 직접 STT | REQ-FUNC-051, R7 | API-009, INFRA-004 | 🔴 P2 디퍼 | Zero-touch 도입 시 |
| **D8** | AI 알림장 + 키즈노트 → 클립보드 복사 | REQ-FUNC-056~058 | API-007, API-012, FR-C-017 | 🔵 단순 대체 | B2B 5건 + 키즈노트 공식 제휴 시 |

### 상태 범례
- 🟢 **P0 Active** — Sprint 1~4(1개월) 명세대로
- 🟡 **P1 Defer** — 리텐션 검증 후 (2~4개월)
- 🔴 **P2 Defer** — B2B 진입 후 (5개월+)
- 🔵 **Replace** — SRS 명세 → 단순 대체안

> **SRS 무손상 원칙**: SRS V06 본문(99 요구사항·30 NFR·6 다이어그램·Traceability) **단 한 줄도 수정하지 않음**. 88 Task ID도 보존. Task 레이어에서만 Phase·모드 재배치.

## Phase별 진입 관문

| Phase | 진입 조건 | 의미 |
|---|---|---|
| **P0 MVP** | DB-001~008 + API-001~004 + MOCK-001~002 + FR-Q-001~004 + FR-C-001~009 + TEST-001~009 + INFRA-001~003 + SEC-001~002 | EXP-1/4 검증 가능 |
| **P1 Retention** | FR-Q-005~008 + FR-C-010~014 + TEST-010~011, 014 + INFRA-002 (Cron 4종) | M3 리텐션 측정 가능 |
| **P2 B2B** | DB-003, DB-010 + API-007~009 + FR-Q-009~011 + FR-C-015~018 + TEST-012~013 + INFRA-004 + SEC-003 | Zero-touch PoC 가능 |

## Critical Path (MVP Phase 0)
```
DB-001 → DB-005 → API-001 → MOCK-001
       → FR-Q-001 (5분 진단 SSR)
       → FR-C-001 (3축 스코어링) → FR-C-002 (HITL 자동 이관)
       → FR-Q-002 (또래 비교 리포트) + FR-C-005 (금칙어 차단)
       → TEST-001~005 → INFRA-001 → SEC-001 → PERF-001
```

## Dependency Graph (Step 간)
```
[Step 1 Contract]: DB → API → MOCK
[Step 2 CQRS]:    FR-Q (Read) ← API + MOCK
                   FR-C (Write) ← API + DB
[Step 3 Tests]:    TEST ← FR-Q + FR-C
[Step 4 NFR]:      INFRA → FR-C / SEC / MON
                   FR-C → PERF / SEC / MON
                   TEST → OPS
```

## 의도적 제외 (01 §6 + 03 §1)

| 제외 영역 | 사유 |
|---|---|
| 의료적 진단/DTx 인허가 | SRS Out-of-Scope (R1) |
| 네이티브 RN/Swift/Kotlin | C-TEC-001 (PWA+Capacitor 대체) |
| 별도 Python AI 서버 | C-TEC-005 (Vercel AI SDK) |
| 별도 Express/NestJS | C-TEC-002 (Server Actions) |
| UI/UX 비주얼 디자인 시안 | 개발+인프라 트랙 한정 |
| F11(부모 클로닝)·F15(LLM 챗봇)·F16(푸시) | Phase 1 후순위 — 별도 추출 권장 |

## 인용 가능 위치

| 주제 | 원본 |
|---|---|
| 88 태스크 전체 인덱스 | 01 전체 |
| 추출 4 원칙 | 01 L13~L17 |
| Step 1 DB·API·MOCK 표 | 01 L23~L62 |
| Step 2 FR-Q·FR-C 표 | 01 L66~L108 |
| Step 3 TEST 표 | 01 L112~L129 |
| Step 4 NFR/Infra/Sec/Mon/Ops | 01 L133~L152 |
| Dependency Graph + Critical Path | 01 L156~L213 |
| Sprint 1 8 코어 | 03 §1 (L30~L65) |
| 8 Descope 매트릭스 | 03 §2 (L67~L84) |
| 88 Task 상태 재배치 | 03 §3 (L88~) |

## Clinical cross-link

- DB-005 (`evaluation_results`)의 3축 점수 = [[clinical/entities/U-TAP]] 음소별 정확도 + [[clinical/entities/REVT]] 어휘 정확도의 디지털 변환.
- DB-009 (`hitl_queue`) = [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격제도 의 비동기 디지털 운영 인프라.
- FR-C-005 Middleware 금칙어 = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙1(의료) 명시적 회피의 시스템 강제.
- FR-C-007 PWA 오프라인 = [[product/entities/persona-강지방]] (농촌·구형폰 Extreme-2) 영역. D5 Descope로 P1 디퍼 → 강지방 페르소나는 P1까지 미지원.
- FR-C-015 Zero-touch = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 일상 환경 평가. D3+D7 Descope로 P2 디퍼.

## 관련 product 페이지

- [[product/concepts/task-breakdown-overview]] — **22 Epic ↔ 88 Task 매핑 정본** (본 source의 인덱스)
- [[product/concepts/MVP-feature-spec]] — 21 Epic + 4 Phase + 7 KPI
- [[product/concepts/MVP-descope-plan]] — 8 Descope 권고의 정본 (67 + 02 통합)
- [[product/concepts/tech-architecture]] — C-TEC + 4 Layer
- [[product/sources/65-SRS-V06-Final]] — Task의 1차 SRS 근거
- [[product/sources/67-MVP-Descope-Review]] — 67-D1~D3 권고 정본

## 보강 필요
- 04 (Agent Prompt Task Detail Extraction) 미정독 — 88개 개별 Task 상세 추출 방법론.
- 88개 개별 TASK_*.md (각 80-100줄) 미정독 — 본 source는 인덱스만. 개별 task 디테일은 SRS REQ-FUNC + 본 표로 충분.
- 03 §3 88개 태스크 상태 재배치 표 후반(DB-006 이후~OPS-001) 미정독.
- D9, D10 등 추가 Descope 도출 가능성 (현재 8 Descope만).
