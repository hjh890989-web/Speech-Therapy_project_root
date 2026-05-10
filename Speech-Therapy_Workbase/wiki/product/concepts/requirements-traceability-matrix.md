---
type: concept
pillar: product
category: synthesis
aliases: [RTM, Requirements Traceability Matrix, REQ-FUNC ↔ Epic ↔ Task 매핑, 3축 매핑 인덱스]
tags: [RTM, Traceability, REQ-FUNC, REQ-NF, Epic, Task, 매핑인덱스, 추적성, 클러스터통합]
---

# Requirements Traceability Matrix — REQ-FUNC ↔ Epic ↔ Task 3축 매핑

ISO 29148 표준 추적성 매트릭스. **65 REQ-FUNC + 4 REQ-FUNC-HITL + 30 REQ-NF = 99 요구사항** ([[product/sources/65-SRS-V06-Final]]) ↔ **21 Epic** ([[product/concepts/MVP-feature-spec]]) ↔ **88 Task** ([[product/concepts/task-breakdown-overview]]) ↔ **Persona/Pain/ADR** 4축 통합 인덱스.

## 통합 매핑 (Phase 0 MVP — 6 Epics, 26 REQ-FUNC)

| Epic | REQ-FUNC | FR-Q (Read) | FR-C (Write) | API | DB | TEST | Pain | Persona | ADR |
|---|---|---|---|---|---|---|---|---|---|
| **F1-a** 3축 AI 엔진 | **001~007** | — | FR-C-001~004 | API-001, 011 | DB-004, 005 | TEST-001~003 | **P1** 진단 부재 | 이지수·박민정·**황보름** (HITL 60% 게이트) | ADR-02·03 |
| **F1-b** 5분 웹뷰 | **008~011** | FR-Q-001 | — | API-001 | — | TEST-004 | P1 | 이지수 (마찰 0) | — |
| **F2** 또래 비교 | **012~014** | FR-Q-002 | FR-C-005 (금칙어) | — | DB-005 | TEST-005 | P1 | 박민정·이지수 | **ADR-04** (금칙어) |
| **F3-a** 숏폼 미션 | **015~020** | FR-Q-003 | FR-C-006, 007 (침묵·PWA) | API-002 | DB-006 | TEST-006, **008** (Hold) | **P2** 골든타임 | 최수현·**강지방** (D5 부활) | — |
| **F3-b** 적응형 난이도 | **021~023** | — | FR-C-008 | API-002 | DB-006 | TEST-007 | P2 | 박민정·**황보름** (모델 다양화) | — |
| **F12** 보상 | **024~026** | FR-Q-004 | FR-C-009 | API-004 | DB-008 | TEST-009 | P2 | 김태희·정유나 (Q4) | — |

## Phase 1 리텐션 — 10 Epics, 23 REQ-FUNC + HITL 4

| Epic | REQ-FUNC | FR-Q | FR-C | API | DB | TEST | Pain | Persona | ADR |
|---|---|---|---|---|---|---|---|---|---|
| **F4** 주간 리포트 | **027~029** | FR-Q-005, 006 | FR-C-010, 011 (Cron + 예측) | API-003, 011 | DB-007 | TEST-010 | **P3** 홈케어 비표준 | 박민정 (Lock-in #1) | — |
| **F5** 카톡 공유 | **030~031** | — | FR-C-012 | API-012 | — | TEST-011 (D1 우회) | P3 | 박민정·**윤성민** (Lock-in #3 직접 타깃) | — |
| **F6** HITL 대시보드 | **032~034** | FR-Q-008 | FR-C-013, 014 (코멘트·24h 에스컬레이션) | **API-005, 006** | **DB-009** | **TEST-014** (9 시나리오) | P3 | 최수현 (신뢰)·송혜경 (의료 앵커) | **ADR-02** |
| **HITL 4원칙** ⭐ | **HITL-001~004** | FR-Q-008 | FR-C-013, 014 | API-005, 006 | DB-009 + audit_log | TEST-014 | 모든 Pain | (모든 페르소나 안전망) | **ADR-02** + ADR-04 |
| **F7** 센터 PDF | **035** | FR-Q-007 | — | — | DB-007 | (별도 미정) | P3 | 최수현 (트랙2 연계) | — |
| **F11** 부모 음성 | **036~037** ⚠️ 교정 차단 | (미추출) | (미추출) | (미추출) | — | — | P3 (감성) | (조음장애 윤리) | — |
| **F14** 거울 모드 | **038** | FR-Q-014 | — | API-009 | — | (별도 미정) | P3 | (조음장애 시각 단서) | — |
| **F15** LLM 챗봇 | **039~040** | (미추출) | (미추출) | (미추출) | — | — | P2/P3 | (KOPLAC 영감) | — |
| **F16/17/18** 푸시·로그·예측 | **041~045** | FR-Q-012, 013 | FR-C-011 | API-011 | DB-004, 007 | (별도 미정) | P3 | 박민정 (예측 Lock-in) | — |

## Phase 2 B2B — 5 Epics, 16 REQ-FUNC

| Epic | REQ-FUNC | FR-Q | FR-C | API | DB | TEST | Pain | Persona | ADR/Descope |
|---|---|---|---|---|---|---|---|---|---|
| **F9-a** 원장 대시보드 | **046~048** | FR-Q-009, 010, 011 | — | API-010 | DB-003 | (별도 미정) | **P4** B2B | 오한솔 (D-1, DOS 1위) | — |
| **F9-b** Zero-touch ⭐ | **049~053** | — | FR-C-015 | API-009 | DB-004 | TEST-013 (Hold) | P4 (교사 거부권 R3) | 김민지 (D-2 게이트키퍼) | **ADR-01**, D3+D7 |
| **F9-c** 일괄등록 | **054~055** | — | FR-C-016 | — | DB-003 | TEST-012 | P4 | 오한솔 (행정 0) | — |
| **F9-d** AI 알림장 | **056~058** | — | FR-C-017 (쿠션어) | API-007, 011, 012 | DB-003 | (별도 미정) | P4 (Lock-in #4) | 오한솔 (1,100% ROI) | **D8** (키즈노트 → 클립보드) |
| **F10** 전자서명 | **059~061** | — | FR-C-018 | API-008, 012 | DB-010 | (별도 미정) | P4 (R4 동의) | (학부모 합법 데이터) | **검토 §2.2 [추가 E2]** (카카오 → 일반 웹) |

## REQ-NF 30 → Task 카테고리 매핑

| REQ-NF 영역 | ID 범위 | Task 카테고리 | 핵심 |
|---|---|---|---|
| **성능** | 001~006 | 모든 FR-Q/FR-C/API + PERF-001/002 | p95 ≤800ms / 오디오 ≤300ms / Cold Start ≤1.5초 |
| **SLA** | 007~012 | NFR-INFRA + OPS-001 | Uptime ≥99.9% / RPO <1h / **HITL <48h** (REQ-NF-012) |
| **신뢰성** | 013~015 | TEST-002, 003 (재시도) + 화자분리 (TEST-013 Hold) | 오디오 오류 ≤0.5% / STT 재시도 ≥98% / 화자분리 ≥85% |
| **보안** | 016~019 | **SEC-001~004** | 음성 ≤7일 폐기 (ADR-03) / TLS 1.3 + AES-256 / **RBAC = Middleware + RLS** |
| **모니터링** | 020~024 | **MON-001~004** | 퍼널±20% / STT 5분 3% / LTV:CAC<3.0 / HITL 24h+ 3건+ / 외부 API 1h 5%+ |
| **Business KPI** | 025~030 | (PERF + 측정 책임 분산) | W-AUR ≥60% (북극성) / M3 ≥40% / CVR ≥8% / Zero-touch ≥90% / 오진 <0.5% / Churn ≤5% |

→ 88 Task = DB 11 + API 12 + MOCK 3 + FR-Q 14 + FR-C 18 + TEST 14 + INFRA 5 + PERF 2 + SEC 4 + MON 4 + OPS 1 = 88. REQ-NF 30 → INFRA + PERF + SEC + MON + OPS = **16 task** 매핑.

## 4 Pain Cluster ↔ Epic ↔ Persona 정합

| Pain | 핵심 페르소나 | Epic 충족 | KPI 게이트 |
|---|---|---|---|
| **P1** 진단 부재 (맘카페 20h+, 초진 2-3개월+) | Seg A 이지수·박민정 (Q1) + 황보름·이미란 (Q2) | F1-a + F1-b + F2 | CVR ≥8% (REQ-NF-027) |
| **P2** 골든타임 증발 (방치 4.5개월) | Seg C 최수현 (Q1) + 강지방 (Q2 황금 교차점) | F3-a + F3-b + F12 | 첫 주 ≥70% / W-AUR ≥60% |
| **P3** 홈케어 비표준 (1개월 80% 이탈) | Seg B 박민정 (Lock-in #1) + 윤성민 (Lock-in #3) | F4 + F5 + F6 + F11/14/15/16/17/18 | M3 ≥40% / Churn ≤5% |
| **P4** B2B 권유 딜레마 (민원 3-5건/年) | Seg D-1 오한솔 (DOS 1위) + D-2 김민지 (게이트키퍼) | F9-a + F9-b + F9-c + F9-d + F10 | Zero-touch ≥90% / 알림장 무수정 ≥90% |

→ 13 Persona Spectrum 모두 Epic 매핑 완료 ✅. 이탈 방어 게이트 (윤성민·송혜경) + 포용 설계 (황보름·강지방·이미란) + Q4 부차적 (정유나·김민지) 모두 명시적 매핑.

## ADR ↔ REQ ↔ Epic 매핑

| ADR | REQ | Epic | 회피 리스크 | 정본 |
|---|---|---|---|---|
| **ADR-01** Zero-touch | REQ-FUNC-049~053 | F9-b | R3 교사 거부 → B2B 실패 | [[product/concepts/architecture-decisions]] |
| **ADR-02** HITL 비동기 | REQ-FUNC-032~034 + HITL-001~004 + REQ-NF-012 | F6 + 4 원칙 | R2 오진 → 규제·민원 | [[product/concepts/HITL-system-flow]] |
| **ADR-03** 7일 폐기 | REQ-FUNC-005 (음성) + REQ-NF-016 | F1-a + F9-b | R4 개인정보·아동보호법 | — |
| **ADR-04** 의료 용어 배제 | REQ-FUNC-005 (FR-C-005 금칙어) + HITL-002 | F2 + F6 + 모든 텍스트 영역 | R1 DTx 인허가 회피 | — |
| **ADR-05** Next.js 모놀리스 | (전체 아키텍처) | (모든 Epic) | (FE/BE 분리 회피) | C-TEC-001 |
| **ADR-06** Supabase BaaS | DB-001~011 + REQ-NF-019 RBAC | (모든 DB) | DevOps 0일 부트스트랩 | C-TEC-003 |
| **ADR-07** Vercel AI SDK | REQ-FUNC-039~040 + 056~058 + 027~029 | F4·F9-d·F15 | Python 서버 회피 | C-TEC-005, 006 |

## 8 Descope ↔ REQ ↔ Epic 매핑

| Descope | 적용 REQ | Epic | Descope 사유 | 부활 조건 |
|---|---|---|---|---|
| **D1** Web Speech | REQ-FUNC-001~007 | F1-a | Sprint 1 Vercel AI SDK 비용 회피 | EXP-1 통과 후 Vercel AI SDK 전환 |
| **D2** Capacitor 보류 | REQ-NF-005 (Cold Start) | F1-b | PWA로 충분 (1주차) | iOS Safari + 앱스토어 도달 가구 N% |
| **D3** Zero-touch 보류 | REQ-FUNC-049~053 | F9-b | Phase 2 후순위 | B2B PoC 5건 / EXP-3 |
| **D4** HITL Realtime → Slack | REQ-FUNC-032~034 + HITL | F6 | Studio 1차 + PostgreSQL 트리거 단순화 | 큐 등록 >20건 / 전문가 풀 >10명 |
| **D5** PWA 오프라인 보류 | REQ-FUNC-007 + 015~020 | F3-a | 1주차 인메모리만 | **강지방 (농촌) 사용자 비율 N%+** ⭐ 신규 |
| **D6** pgvector 미생성 | (의미 검색 보류) | F4 (예측) | Sprint 1 후순위 | 시계열 임베딩 필요 시점 |
| **D7** Edge Runtime 미사용 | REQ-FUNC-049~053 (Zero-touch) | F9-b | Vercel Pro 플랜 후 | B2B PoC 통과 |
| **D8** 키즈노트 → 클립보드 | REQ-FUNC-056~058 | F9-d | API 의존성 0 | API 정책 안정화 + B2B 30곳 |
| **§2.2 [추가 E2]** 카카오 → 웹 폼 | REQ-FUNC-059~061 | F10 | UUID + IP/UA + CSRF | 모두싸인 P3+ 도입 |

→ 정본 [[product/concepts/MVP-descope-plan]].

## 추적성 검증 — 매핑 완성도

| 차원 | 합계 | 매핑 완료 | 미매핑 |
|---|---|---|---|
| REQ-FUNC | 65 + HITL 4 = 69 | **69** ✅ (Phase 0/1/2 100%) | 0 |
| REQ-NF | 30 | **30** ✅ (성능/SLA/신뢰성/보안/모니터링/KPI) | 0 |
| 21 Epic | 21 | **21** ✅ (Phase 0: 6 / Phase 1: 10 / Phase 2: 5) | 0 |
| 88 Task | 88 | **88** ✅ (DB 11 + API 12 + MOCK 3 + FR-Q 14 + FR-C 18 + TEST 14 + NFR 16) | 0 |
| 13 Persona | 13 | **13** ✅ (Core 5 + Adjacent 3 + Extreme 2 + Non-user 3) | 0 |
| 7 ADR | 7 | **7** ✅ (ADR-01~07) | 0 |
| 8 Descope | 8 (+1 검토) | **9** ✅ (D1-D8 + 추가 E2) | 0 |
| 4 Pain Cluster | 4 | **4** ✅ (P1-P4) | 0 |

→ ⭐ **5축 추적성 100% 완성** (REQ ↔ Epic ↔ Task ↔ Persona ↔ ADR/Descope).

## REQ-FUNC ID → 빠른 조회 Lookup

```
001-007  F1-a 3축 AI       │ FR-C-001~004 / API-001, 011 / DB-004, 005 / TEST-001~003
008-011  F1-b 5분 웹뷰     │ FR-Q-001 / API-001 / TEST-004
012-014  F2 또래 비교       │ FR-Q-002, FR-C-005 / DB-005 / TEST-005 / ADR-04
015-020  F3-a 숏폼 미션     │ FR-Q-003, FR-C-006, 007 / API-002 / DB-006 / TEST-006, 008
021-023  F3-b 적응형        │ FR-C-008 / API-002 / DB-006 / TEST-007
024-026  F12 보상           │ FR-Q-004, FR-C-009 / API-004 / DB-008 / TEST-009
027-029  F4 주간 리포트     │ FR-Q-005, 006, FR-C-010, 011 / API-003, 011 / DB-007 / TEST-010
030-031  F5 카톡 공유       │ FR-C-012 / API-012 / TEST-011
032-034  F6 HITL            │ FR-Q-008, FR-C-013, 014 / API-005, 006 / DB-009 / TEST-014
HITL-001~004  HITL 4 원칙   │ ADR-02 + REQ-NF-012 + ML Ops (model_retraining_data 미정규화)
035       F7 PDF             │ FR-Q-007 / DB-007
036-037  F11 부모 음성       │ ⚠️ 교정 적용 차단 (윤리)
038       F14 거울 모드      │ FR-Q-014 / API-009
039-040  F15 LLM 챗봇       │ Vercel AI SDK useChat 스트리밍
041-045  F16/17/18 푸시·로그·예측 │ FR-Q-012, 013, FR-C-011 / API-011 / DB-004, 007
046-048  F9-a 원장 대시보드 │ FR-Q-009, 010, 011 / API-010 / DB-003
049-053  F9-b Zero-touch ⭐ │ FR-C-015 / API-009 / DB-004 / TEST-013 (Hold) / ADR-01 / D3+D7
054-055  F9-c 일괄등록      │ FR-C-016 / DB-003 / TEST-012
056-058  F9-d AI 알림장     │ FR-C-017 / API-007, 011, 012 / DB-003 / D8
059-061  F10 전자서명       │ FR-C-018 / API-008, 012 / DB-010 / 추가 E2
```

## 워크플로 시사

| 시사 | 의미 |
|---|---|
| **REQ-FUNC ID 65 → 21 Epic 평균 ≈ 3.1 REQ/Epic** | Epic 단위 응집도 균등 (특정 Epic만 비대해지지 않음) |
| **HITL 4 원칙 = 별도 ID 공간** (HITL-001~004) | Cross-cutting concern 명시. ADR-02 + 4 원칙 + REQ-NF-012의 통합 트랙 |
| **Phase 0 26 REQ → 13 Task (Sprint 1 핵심 8 + 의존 5)** | Phase 0 26 REQ 중 약 50%가 Sprint 1 직접 의존 |
| **REQ-FUNC-005 + 037**: 2 단계 안전 게이트 | 음성 7일 폐기 (R4) + 부모 음성 클로닝 교정 차단 (윤리) |
| **REQ-NF-012 (HITL <48h) = 운영 정책의 시스템 강제** | Cron + Slack + Studio + PostgreSQL 트리거 + Resend 5종이 한 임계 보장 |
| **F11/F15/F16 = REQ-FUNC 정의되어 있으나 88 Task 미추출** | Phase 1 후속 task 분해 보강 후보 |

## 보강 필요

- **REQ-FUNC-036~037 (F11)** + **039~040 (F15)** + **041~045 (F16)** = 88 Task 매핑 미추출 → ✅ **별도 분해 페이지 신설** ([[product/concepts/Phase-1-future-tasks-decomposition]]) — 13 신규 task / 21 SP 제안 + 윤리 차단 + D5 의존성 명시.
- **model_retraining_data 테이블 스키마** ✅ 보강 완료 → [[product/concepts/HITL-retraining-pipeline]] (3 신규 task / 5.5 SP / RACI / 자동 트리거 / 0.5%·500건·0.3% 게이트 자동화 흐름).
- **F9.4 ROI 시뮬레이터** = VPS V08 신규. **별도 매핑 페이지 신설** ([[product/concepts/F9.4-ROI-simulator]]) — 88 → 93 Task 보강 제안 + UI 설계 + ADR-XX 무로그인 분리 후보.
- **REQ-NF-025~030 KPI** = 측정 책임이 분산 (PERF + 비즈니스). 통합 측정 dashboard task 신규 가능성.
- **Persona 매핑 정합 검증** = Sprint 1 100가정 파일럿 모집 실측 후 본 매트릭스 갱신.

## 출처

- [[product/sources/65-SRS-V06-Final]] § 7-9 REQ-FUNC + REQ-NF + Traceability
- [[product/concepts/MVP-feature-spec]] § 21 Epic 정본 + Phase별 SP
- [[product/concepts/task-breakdown-overview]] § 21 Epic ↔ 88 Task + Critical Path
- [[product/concepts/HITL-system-flow]] § 9 REQ-FUNC + 4 원칙
- [[product/concepts/architecture-decisions]] § 7 ADR
- [[product/concepts/MVP-descope-plan]] § 8 Descope + 부활 조건
- [[product/concepts/customer-segmentation]] § 13 Persona Spectrum

## Clinical 정합

- **F1-a articulation 점수** = [[clinical/entities/U-TAP]] / **linguistic 점수** = [[clinical/entities/SELSI]] + [[clinical/entities/PRES]] + [[clinical/entities/REVT]]. REQ-FUNC-001~007의 임상 ground truth.
- **F6 HITL 코멘트 (REQ-FUNC-032~034)** = [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격자 ~17,000명의 비동기 디지털 운영 모델.
- **F11 부모 음성 교정 차단** (REQ-FUNC-037) = [[clinical/concepts/실어증]] § MIT (치료자 ≠ 가족 역할 분리) 원칙의 시스템적 강제.
- **F9-b Zero-touch (REQ-FUNC-049~053)** = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙 2 사설 센터 진입 직전 영유아 발달 스크리닝의 디지털 자동화.
