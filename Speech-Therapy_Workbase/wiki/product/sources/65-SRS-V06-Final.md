---
type: source
pillar: product
title: Software Requirements Specification (SRS) V06 — Next.js Full-stack Final
source_path: ../../../raw/65_SRS_V06_Nextjs_Fullstack_Final.md
source_type: srs
authors: []
year: 2026
ingested: 2026-05-09
ingested_partial: false
tags: [SRS, ISO29148, REQ-FUNC, REQ-NF, ERD, ADR, Nextjs, Supabase, Vercel, Gemini, 클러스터55-67]
---

# SRS V06 Next.js Full-stack Final — 요약 (전체 정독)

> **한 줄 요약.** ISO/IEC/IEEE 29148:2018 기반 SRS. **65 REQ-FUNC + 30 REQ-NF + Traceability Matrix (Story↔REQ↔TC)** + **Next.js App Router 풀스택 모놀리스로 아키텍처 전환** (FE/BE 분리 폐기, Server Actions/Route Handlers, Supabase, Vercel AI SDK + Gemini, PWA + Capacitor) + **§6 부록 (ERD 7 엔티티 / 5 클래스 / 5 시퀀스 / 14 Tech Stack / Gantt / 4 EXP / R6 Plan B / 7 ADR)**.

> ✅ **전체 정독 완료** (2026-05-09 8차 ingest 후 9차 §6 보강). 966줄 — §1-§5 + §6 부록 모두 정독. §7 (없음) 통합.

> ⚠️ **버전 명명 혼란**: 파일명은 V06이지만 내부 Revision History는 "Rev 3.0 V05 Next.js Full-stack"으로 표기. 파일명 V06을 정본으로 사용. raw 64 (V05 Merged Master) → raw 65 (V06 Next.js 변환).

## 핵심 식별
- Document ID: SRS-001 / Revision: 3.0 / Date: 2026-05-08
- Standard: **ISO/IEC/IEEE 29148:2018**
- Source PRD: [[product/sources/54-PRD-V10-Final]]
- Tech Stack: **Next.js App Router · Vercel · Supabase · Vercel AI SDK + Gemini**

## 1. 4대 극한 (Design Philosophy)

| 극한 | 정량 |
|---|---|
| 시간 | 2-3개월 → ≤5분 (≥17,000배) |
| 마찰 | Zero-touch 0회 |
| 지속 | M3 ≥40% |
| 증명 | 리포트 열람률 ≥60% |

→ [[product/concepts/MVP-feature-spec]] § 4 Extremes 와 정합.

## 2. ⭐ V05/V06 핵심 혁신 — 기술 제약 C-TEC-001~007

| ID | 제약 | 시스템 영향 |
|---|---|---|
| **C-TEC-001** | **Next.js (App Router) 단일 풀스택** — FE/BE 분리 금지 | 단일 레포 + 단일 배포 |
| **C-TEC-002** | 서버 로직 = **Server Actions / Route Handlers** | Express/NestJS 등 별도 백엔드 금지 |
| **C-TEC-003** | DB = Prisma + SQLite(로컬) / **Supabase PostgreSQL(프로덕션)** + pgvector | 인프라 복잡도 최소 |
| **C-TEC-004** | UI = **Tailwind CSS + shadcn/ui** 강제 | AI 코드 생성 일관성 |
| **C-TEC-005** | LLM 오케스트레이션 = **Vercel AI SDK** | Python 서버 금지 |
| **C-TEC-006** | LLM = **Google Gemini API** 기본 (env 교체 가능) | SDK 표준 인터페이스 |
| **C-TEC-007** | 배포 = **Vercel 단일화** (Git Push 자동) | CI/CD 별도 설정 금지 |

→ 본 7개 제약이 [[product/concepts/tech-architecture]] 의 정본.

## 3. R7, R8 — V05 신규 리스크

| Risk | 리스크 | 영향 | 완화 |
|---|---|---|---|
| **R7** | Vercel 서버리스 함수 Timeout (10-60s) | 🟡 | **클라이언트 측 직접 STT API 호출** + Edge Runtime |
| **R8** | Supabase 무료 티어 (500MB DB, 1GB Storage) | 🟡 | Pro 플랜 + **7일 폐기로 스토리지 최적화** |

## 4. 6 Stakeholder + DMU 다이어그램

| Seg | 역할 | 책임 | 성공 |
|---|---|---|---|
| Seg A | 불안형 엄마 | B2C 최초 유입 | CVR ≥8%, 체류 ≤5분 |
| Seg C | 센터 대기자 엄마 | B2C 결제 전환 | 첫주 미션 ≥70% |
| Seg B | 데이터형 가족 | 구독 유지 | M3 ≥40% |
| Seg D-1 | 원장 | B2B 결제 | 알림장 승인 ≥90% |
| Seg D-2 | 교사 | B2B 게이트키퍼 | 능동 조작 0회 |
| **HITL Expert** | 언어재활사 | 감수·코멘트 | 피드백 ≤48h |
| **System Admin** | 운영 | 모니터링 | Uptime ≥99.9% |

## 5. 클라이언트 6종 (V05 변경)

| 클라이언트 | 구현 | Phase |
|---|---|---|
| 진단 웹뷰 | Next.js SSR Page (SEO) | P0 |
| B2C 홈케어 앱 | **PWA** (Service Worker + Manifest) | P0 |
| B2C 앱스토어 | **Capacitor 래핑** | P1 |
| 전문가 어드민 | Next.js Route Group + Supabase Realtime | P1 |
| 원장 대시보드 | Next.js Route Group | P2 |
| 교실 태블릿 | **PWA + Web Worker (VAD)** + 오프라인 버퍼링 | P2 |

## 6. API 9종 (Server Actions + Route Handlers)

| 함수/경로 | 유형 | 제약 |
|---|---|---|
| `analyzeDiagnosis()` | Server Action | p95 ≤800ms |
| `getCurriculum()` | Server Action | 연속 실패 3회 즉시 하향 |
| `getWeeklyReport()` | Server Action | p95 ≤3,000ms |
| `app/api/hitl/queue` | Route Handler POST | Realtime 구독 |
| `app/api/hitl/comment` | Route Handler PATCH | ≤48h SLA |
| `app/api/b2b/approval` | Route Handler PATCH | 키즈노트 |
| `app/api/consent/sign` | Route Handler POST | 카카오톡 |
| `grantReward()` | Server Action | ≤500ms |
| `app/api/audio/stream` | Route Handler (Edge) | Edge Runtime |

## 7. ⭐ 65 REQ-FUNC + 30 REQ-NF

### Phase 0 MVP (REQ-FUNC-001~026, 26개)

| Epic | REQ ID 범위 | 핵심 |
|---|---|---|
| F1-a 3축 엔진 | 001~007 | Client-side STT + Server Action 3축 + Confidence<70 → Realtime HITL |
| F1-b 5분 웹뷰 | 008~011 | SSR 무로그인 + ≤300초 + RSC p95 ≤1,500ms + Disclaimer 100% |
| F2 또래 비교 | 012~014 | "상위 N%" 넛지 + Middleware 금칙어 0건 + 페이월 CTA |
| F3-a 숏폼 미션 | 015~020 | 1-3분 세션, Drop-off <10%, shadcn/ui 타이머, 침묵 1분+ 툴팁, **Service Worker 오프라인 캐시 → 소급 보상** |
| F3-b 적응형 난이도 | 021~023 | 3회 실패 은밀 하향, X표시 0회, 전환 <0.5초, 하향 후 이탈 <5% |
| F12 보상 | 024~026 | 파티클 ≤500ms (Framer Motion), Prisma → Supabase, shadcn/ui Card Grid |

### Phase 1 리텐션 (REQ-FUNC-027~045 + HITL-001~004, 23개)

| Epic | REQ ID | 핵심 |
|---|---|---|
| F4 추이 리포트 | 027~029 | Vercel Cron + Gemini 예측 시뮬레이션 (M3 익월 +20%p) |
| F5 카톡 공유 | 030~031 | 알림톡 ≥95% + 클립보드 폴백 |
| F6 HITL 대시보드 | 032~034 | Realtime 구독, 24h 초과 자동 에스컬레이션, 월 3회+ 자동 반려 |
| F7 PDF | 035 | react-pdf 또는 Puppeteer |
| F11 부모 음성 | 036~037 | TTS 클로닝 + **교정 적용 차단** (① UX 원칙) |
| F14 거울 모드 | 038 | WebRTC + 카메라 오버레이 |
| F15 LLM 챗봇 | 039~040 | Vercel AI SDK `useChat()` 스트리밍 |
| F16/17/18 | 041~045 | Web Push API, 통합 케어로그, Gemini 예측 회귀, Vercel Analytics |
| **HITL 4원칙** | HITL-001~004 | Realtime 즉시 이관 / Middleware 금칙어 / 48h SLA / Ground Truth 환류 |

### Phase 2 B2B (REQ-FUNC-046~061, 16개)

| Epic | REQ ID | 핵심 |
|---|---|---|
| F9-a 원장 대시보드 | 046~048 | Route Group `/(dashboard)`, 명의 헤더, ROI 시뮬레이터 |
| **F9-b Zero-touch** | **049~053** | **PWA + Web Worker VAD**, Edge Runtime → STT, 화자분리 ≥85%, 청크 ≤300ms, 7일 폐기 Cron |
| F9-c 일괄등록 | 054~055 | Server Action 엑셀 파싱, shadcn/ui DataTable 인라인 수정 |
| F9-d AI 알림장 | 056~058 | Vercel AI SDK 쿠션어 스트리밍, 무수정 승인 ≥90%, 키즈노트 발송 |
| F10 전자서명 | 059~061 | 카카오톡 링크, D+3 리마인더 Vercel Cron, 7일 만료 알림 |

> **합계: REQ-FUNC 65개 + HITL 4개 + REQ-NF 30개 = 99개 요구사항**

## 8. NFR 30개 핵심 (REQ-NF-001~030)

### 성능 (REQ-NF-001~006)
- 진단 SA p95 ≤800ms (Vercel 10s 내) / 오디오 ≤300ms (Client→STT 직접) / PWA Cold Start ≤1.5초 (Service Worker 프리캐시) / 보상 ≤500ms (Framer Motion) / 일괄 파싱 p95 ≤3,000ms (Vercel 60s Pro 필요)

### SLA (REQ-NF-007~012)
- Uptime ≥99.9% / MTTR <2h / RPO <1h / RTO <4h / CS <4h / **HITL <48h**

### 신뢰성 (REQ-NF-013~015)
- 오디오 처리 오류 ≤0.5% / STT 재시도 ≥98% / 화자분리 60dB ≥85%

### 보안 (REQ-NF-016~019)
- 음성 ≤7일 폐기 + Cron / TLS 1.3 + AES-256 / AI 호출 비용 ≤월구독료 15% (5,250원) / **RBAC = Next.js Middleware + Supabase RLS**

### 모니터링 (REQ-NF-020~024)
- Vercel Analytics 퍼널 ±20% Alert / STT 5분 내 3% Alert / LTV:CAC <3.0 주간 리뷰 / HITL 24h+ 3건+ Alert / 외부 API 1h 5%+ Fallback

### Business KPI (REQ-NF-025~030)
- W-AUR ≥60% (북극성) / M3 ≥40% / CVR ≥8% / Zero-touch 승인 ≥90% / 오진 <0.5% / Churn ≤5%

## 9. Traceability Matrix (정독 부분)

`Story (S1-S6) × REQ-FUNC × REQ-NF × TC ID` 1:1:1:1 매핑.

예시:
| Story | REQ-FUNC | REQ-NF | TC ID |
|---|---|---|---|
| S1 5분 진단 | 001 (Client→STT→SA) | NF-001, NF-002 | TC-S1-001 |
| | 002 (3축 백분위) | NF-001 | TC-S1-002 |
| | 003 (Confidence→HITL Realtime) | — | TC-S1-003 |
| | ... 11건 | | |
| S2 미션 | 015~026 (12건) | NF-005, NF-025, NF-030 | TC-S2-001~012 |
| S3 리포트 | 027~ | NF-004 등 | TC-S3-001~ |

## 인용 가능 위치

| 주제 | 원본 위치 |
|---|---|
| Revision History (V01-V06) | L10~L21 |
| 4 Extremes | L32~L39 |
| Business Context (TAM·SAM·SOM·수익) | L42~L45 |
| In/Out Scope | L49~L67 |
| 용어 (W-AUR, HITL, Zero-touch, Server Actions, PWA, Capacitor, pgvector, Vercel AI SDK 등) | L71~L86 |
| C-TEC-001~007 ⭐ | L102~L110 |
| CON-01~04 | L114~L119 |
| Risk Mitigation 8건 (R1-R8) | L123~L132 |
| 가정/의존성 (A1-2, D1-5) | L138~L144 |
| Stakeholders 7명 | L150~L173 |
| Use Case (UC1-7) | L181~L205 |
| Component Diagram (Client/Vercel/Supabase/External) | L207~L259 |
| Client 6종 | L274~L281 |
| API 9종 | L285~L295 |
| 시퀀스: 진단→미션→리포트 | L300~L333 |
| 시퀀스: HITL 에스컬레이션 | L335~L356 |
| Phase 0 REQ 26개 | L364~L427 |
| Phase 1 REQ 23개 (+HITL 4) | L431~L501 |
| Phase 2 REQ 16개 | L505~L548 |
| NFR 30개 | L552~L614 |
| Traceability Matrix | L617~L649+ |

## Clinical cross-link

- C-TEC-006 Gemini API + Vercel AI SDK = 한국어 아동 발화 처리 → [[clinical/entities/U-TAP]] (조음음운) + [[clinical/entities/REVT]] (어휘) 임상 표준의 디지털 변환에 직접 영향. **D1 (한국어 아동 STT 정확도) 의존성**이 핵심 임상 정합성 리스크.
- F11 부모 목소리 클로닝 **교정 적용 차단** (REQ-FUNC-037) = [[clinical/concepts/실어증]] § MIT 등 임상 원리 (치료자 ≠ 가족 역할 분리)의 시스템적 강제.
- HITL 48h SLA + 금칙어 Middleware = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙1 (의료) 영역과의 명시적 분리. 트랙2 사전 단계 + 비의료 포지션 시스템 강제.
- F9-b Zero-touch 화자분리 ≥85% (60dB 교실) = [[clinical/concepts/언어발달지연]] 의 자연 환경 평가 가능성 — 임상 표준은 정숙 환경 기준이라 정합성 별도 검증 필요.

## 관련 product 페이지

- [[product/sources/54-PRD-V10-Final]] — Source PRD
- [[product/sources/66-PRD-to-SRS-Mapping-Review]] — 9가지 매핑 검증 (Pass)
- [[product/sources/67-MVP-Descope-Review]] — 바이브 코딩 관점 Descope 권고
- [[product/concepts/MVP-feature-spec]] — 21 Epic 정본
- [[product/concepts/SRS-evolution]] — V01-V06 진화 timeline
- [[product/concepts/tech-architecture]] — C-TEC-001~007 Next.js 풀스택 정본
- [[product/concepts/MVP-descope-plan]] — 67 기반 1주차 실행 권고

## ⭐ § 6 부록 — Appendix (보강 정독, 9차 ingest)

### §6.1 ERD — 7 엔티티
**users · institutions · session_logs · evaluation_results · mission_cards · weekly_reports · reward_progress** (모두 UUID PK, Supabase 규격).
- 핵심 관계: users *-- session_logs --> evaluation_results / mission_cards --> session_logs (triggers) / weekly_reports aggregates evaluation_results / institutions manages users (B2B)
- 음성 벡터: `session_logs.audio_vector_uri (pgvector)` 임베딩 영구 보관
- 추가 도출 (TASKS/01): hitl_queue (DB-009) + consent_signatures (DB-010)
→ 정본: [[product/concepts/tech-architecture]] § Data Model (ERD)

### §6.2 Domain Class — 5 클래스
User / SessionLog / EvaluationResult / MissionCard / HITLExpert + 메서드 (startSession, processAudio, generateCushionText, adjustDifficulty, reviewResult).

### §6.3 Sequence Diagrams — 3 추가
1. **PWA Offline → Sync 보상 소급** (F3-a/F12, FR-C-007): IndexedDB 캐시 + Background Sync. **D5 Descope로 P1 디퍼**.
2. **B2B Zero-touch 수집** (F9-b, FR-C-015): PWA + Web Worker VAD + Edge Runtime + 화자분리 ≥85%. **D3+D7 Descope로 P2 디퍼**.
3. **전자서명 동의서** (F10, FR-C-018): 카카오톡 + Vercel Cron D+3 리마인더 + 7일 만료.
→ [[product/concepts/tech-architecture]] § 핵심 Sequence Diagrams.

### §6.4 Tech Stack — 14종
Next.js 15 / Server Actions+Route Handlers / Prisma+Supabase PostgreSQL+pgvector / Tailwind+shadcn/ui / Supabase Auth/Storage/Realtime / Vercel AI SDK+Gemini / Vercel+Cron+Analytics / PWA+Capacitor / Edge Runtime.
→ [[product/concepts/tech-architecture]] § Tech Stack 14종.

### §6.5 Gantt Implementation Timeline
| Phase | 기간 | 주요 Epic |
|---|---|---|
| **Phase 0 MVP** | 2026-06 ~ 08 (+ EXP-1/4 검증 9월) | F1-a/b, F2, F3-a/b, F12, PWA |
| **Phase 1 Retention** | 2026-08 ~ 10 (+ EXP-2 검증 11~12월) | F4, F6, F5/F7, F15, Capacitor |
| **Phase 2 B2B** | 2026-10 ~ 12 (+ EXP-3 PoC 12~1월) | F9-a/b/c/d, F10 |

### §6.6 Validation Plan — EXP-1~4

| EXP | 가설 | 설계 | 성공 기준 | Phase |
|---|---|---|---|---|
| EXP-1 전환 톤 | 코칭 톤 > DTx 톤 | A/B (n=500, 2주) | CVR +2%p | P0 |
| **EXP-2 리포트 락인** | 예측 시뮬레이션 → M3 ↑ | A/B (n=800, 4-8주) | **M3 ≥ 40%** | P1 |
| EXP-3 Zero-touch | 패시브 수집 → 기관 수락 ↑ | PoC (10개 기관) | 조작 0회 + 수락률 ≥20% | P2 |
| EXP-4 가격 앵커링 | 센터 비용 노출 → 결제 ↑ | Paywall A/B (n=1,000, 2주) | 결제 시작률 +5%p | P0 |

### §6.7 Contingency — R6 Plan B 피벗
EXP-2 결과 M3 < 40% 시 시스템 차원 피벗:
- **F4 재설계**: 정적 그래프 → F18 예측 시뮬레이션 최상단 승격
- **F12 강화**: 누적 보상 + 월간 성장 + 해지 시 손실 체감
- **F5 리디자인**: 뱃지 → 아이 성장 스토리 카드 (감성 내러티브)
- **EXP-2b** 후속 (n=400, 4주) → M3 ≥35% 시 피벗 확정 / 미달 시 Seg B 축소

### §6.8 ADR — 7건 ⭐
ADR-01 Zero-touch / ADR-02 HITL / ADR-03 7일 폐기 / ADR-04 의료 용어 배제 / **ADR-05 Next.js 모놀리스 / ADR-06 Supabase BaaS / ADR-07 Vercel AI SDK** (V05/V06 신규 3건).
→ 정본: [[product/concepts/architecture-decisions]].

## 문서 통계 (V06 Final)

| 항목 | 수 |
|---|---:|
| Functional Requirements (REQ-FUNC) | 65 |
| HITL Cross-cutting (REQ-FUNC-HITL) | 4 |
| Non-Functional (REQ-NF) | 30 |
| **총 Requirements** | **99** |
| 시퀀스 다이어그램 | 5 |
| 구조 다이어그램 | 5 |
| Entity (Supabase) | 7 |
| Server Actions | 5 |
| Route Handlers | 4 |
| Validation 실험 | 4 |
| **ADR** | **7** (V05 +3) |
| Tech Stack 컴포넌트 | **14** (V05 신규) |

## 보강 필요
- 65 REQ-FUNC ID와 [[product/concepts/MVP-feature-spec]] 21 Epic의 1:1 자동 매핑 인덱스 — [[product/concepts/task-breakdown-overview]] 에서 88 Task로 매핑 완료. REQ-FUNC ↔ Task 직접 매핑은 별도 페이지 후보.
- §5 Traceability Matrix 후반 (TC ID 일부) 정독 — 현재는 S1-S6 Story 단위 매핑만 정확.
- ADR 거부 시나리오 분석 ([[product/concepts/architecture-decisions]] § 보강 필요와 동일).
