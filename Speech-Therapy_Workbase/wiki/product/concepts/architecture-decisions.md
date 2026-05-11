---
type: concept
pillar: product
category: framework
aliases: [ADR, Architecture Decision Records, 15 ADR, 아키텍처 결정 기록]
tags: [ADR, 아키텍처, 결정기록, ZeroTouch, HITL, Nextjs, Supabase, Gemini, 클러스터55-67]
---

# Architecture Decision Records — 15 ADR 정본

본 프로젝트의 15개 핵심 아키텍처 결정. ADR-01~04는 PRD/SRS 초기부터 계승 (비즈니스·규제 결정), **ADR-05~07은 V05/V06 신규** (기술 스택 전환), **ADR-08~12는 위키 합성 1차** (F9.4·F11·F16·HITL 재학습·변경 관리), **ADR-13~15는 위키 합성 2차** (system_config·F15 안전 게이트·IRB 자문위원회).

> ADR-16~18 후보 (청소년 동의·교차 모니터링·Cache TTL)는 미래·확장 영역 — 현재 후보 유지, 정식 등록 시점 미도래.

## ADR 15건 종합 표

| ADR ID | 결정 | 대안 | 사유 | 영향 |
|---|---|---|---|---|
| **ADR-01** | **Zero-touch 수집 전면 도입** | 교사 수동 녹음 | 교사 업무 가중 → B2B 실패 | PWA + Web Worker VAD |
| **ADR-02** | **HITL 비동기 감수** | AI 단독 판정 | 1건 오진 → 규제 + 민원 | Supabase Realtime 큐 |
| **ADR-03** | **원본 음성 즉각 폐기** | 원본 영구 보관 | 아동보호법 위반 | Supabase Storage + Vercel Cron 7일 |
| **ADR-04** | **의료 용어 배제** | 임상 용어 노출 | DTx 인허가 회피 | Next.js Middleware 금칙어 스캐너 |
| **ADR-05** ⭐ | **Next.js 풀스택 모놀리스** | FE/BE 분리 (React + NestJS) | 1인/소규모 팀 생산성 극대화 | **C-TEC-001~007 전면 적용** |
| **ADR-06** ⭐ | **Supabase BaaS 통합** | 자체 PostgreSQL + Redis | 인프라 운영 부담 제거 | Auth + Storage + Realtime 일원화 |
| **ADR-07** ⭐ | **Vercel AI SDK + Gemini** | LangChain Python 서버 | Python 서버 운영 비용 제거 | C-TEC-005, 006 준수 |
| **ADR-08** 🆕 | **F9.4 무로그인 분리** | F9-a 흡수 (로그인 강제) | 영업 단계 진입율 80%↓ 회피 | F9-a (로그인) ↔ F9.4 (무로그인) 인증 경계 |
| **ADR-09** 🆕 | **F11 부모 음성 윤리 화이트리스트** | 모든 콘텐츠 적용 가능 | 치료자 ≠ 가족 역할 분리 (MIT 원칙) | ALLOWED_CONTENT_TYPES 시스템 강제 + TEST 자동 회귀 |
| **ADR-10** 🆕 | **F16 D5 PWA 부활 의존성** | F16 단독 활성화 | Service Worker 미존재 시 비작동 | F16 활성화 = D5 부활 강제 의존 |
| **ADR-11** 🆕 | **HITL 재학습 책임 분리** | 자동 재학습 (모든 단계) | 무한 루프 위험 + 데이터 품질 검토 | 자동 (롤백·재배포) vs 수동 (재학습 시작 = CTO 승인) |
| **ADR-12** 🆕 | **변경 관리 3-Tier** | 단일 절차 (모든 변경 동일) | 영향 범위별 차별 거버넌스 | Tier 1 (Minor) / Tier 2 (Major) / Tier 3 (Strategic) |
| **ADR-13** 🆕🆕 | **system_config 테이블 (env+DB 하이브리드)** | env만 / 외부 Feature Flag (LaunchDarkly) | 동적 정책 변경 + 다중 인스턴스 일관성 | system_config + 60초 캐싱 + audit_log + RBAC (CTO만) |
| **ADR-14** 🆕🆕 | **F15 임상 안전 게이트** | F15 모든 연령 활성 / 가드레일 미적용 | ASD 회피 경계 + 임상 윤리 (KOPLAC 영감 vs 진단) | 만 4세+ 활성 + ASD 의심 패턴 자동 감지 + 가드레일 5종 |
| **ADR-15** 🆕🆕 | **IRB 자문위원회 운영** | 내부 결정만 / IRB 외부 일임 | T4-c 외부 공유 + 학술 발표 윤리 준수 | 분기 자문 회의 (~30만/회) + 외부 협력 시 양쪽 IRB |

→ V05/V06 신규 ADR-05~07이 [[product/concepts/tech-architecture]] 의 핵심 토대. **ADR-08~12 = 위키 합성 1차 (28~31차)** + **ADR-13~15 = 위키 합성 2차 (43차)**.

---

## ADR-01 · Zero-touch 수집 전면 도입

| 항목 | 내용 |
|---|---|
| **결정** | B2B 교실 음성 수집은 **교사 능동 조작 0회** (마이크 ON 외) |
| **대안** | 교사가 매 발화마다 녹음 시작/중지 버튼 클릭 |
| **사유** | 교사 1:15-20 케어 + 행정 부담 → "1초도 쓸 시간 없다" → B2B 영업 실패 |
| **시스템 영향** | PWA + Web Worker VAD + 엣지 화자분리 ≥85% (60dB 환경) |
| **연결 REQ** | REQ-FUNC-049~051, REQ-NF-015 |
| **연결 Risk** | R3 교사 거부권 회피 메커니즘 |

→ [[product/sources/33-37-Competitor-UX-Analysis]] § ② UX 모순 해결 원칙 (교사 입력 0회) + **V09 §4-3 모순 ② "Zero-touch vs 체크박스"** ([[product/sources/39-VPS-V09-Final]]) 의 시스템 강제.

## ADR-02 · HITL 비동기 감수

| 항목 | 내용 |
|---|---|
| **결정** | AI Confidence < 70 또는 사용자 이의 시 **언어재활사 큐 자동 이관** |
| **대안** | AI 단독 판정 (속도 최우선) |
| **사유** | 1건 치명적 오진 → 의료법 저촉 + 맘카페 부정 후기 (광고 100건 무력화) |
| **시스템 영향** | DB-009 hitl_queue 테이블 + Supabase Realtime 구독 + 48h SLA |
| **연결 REQ** | REQ-FUNC-003, 032~034, HITL-001~004 |
| **연결 Risk** | R2 STT 실패율 완화 |

→ [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격제도 의 비동기 디지털 운영 인프라.

## ADR-03 · 원본 음성 즉각 폐기 (≤7일)

| 항목 | 내용 |
|---|---|
| **결정** | 음성 원본 Supabase Storage **≤7일** 보관 후 자동 폐기 / 벡터만 영구 보관 |
| **대안** | 원본 영구 보관 (재학습·디버깅 용도) |
| **사유** | 아동보호법 + GDPR + 영유아 음성 정보 유출 리스크 (R4) |
| **시스템 영향** | Supabase Storage + **Vercel Cron 매주 일요일 폐기 스크립트 (REQ-FUNC-005)** + pgvector 임베딩 보관 |
| **연결 REQ** | REQ-FUNC-005, REQ-NF-016 |
| **연결 Risk** | R4 영유아 음성 무단 수집/유출 + R8 Supabase 1GB 무료 한도 비용 방어 |

> ⚠️ **비용 방어 최우선 메커니즘**. 7일 폐기 Cron 실패 = Supabase 1GB 한도 초과 = 비용 폭증.

## ADR-04 · 의료 용어 배제

| 항목 | 내용 |
|---|---|
| **결정** | UI/리포트/카피에서 **"진단", "장애", "치료"** 등 의료 용어 하드코딩 배제 |
| **대안** | 임상 용어 노출 (전문성 어필) |
| **사유** | DTx 인허가 회피. "교육/스크리닝/백분위" 톤으로 한정 |
| **시스템 영향** | **Next.js Middleware 금칙어 정규식 스캐너** (FR-C-005) + 정기 QA 자동화 |
| **연결 REQ** | REQ-FUNC-013, HITL-002 |
| **연결 Risk** | R1 의료법 저촉 |

→ [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙1 (의료) 회피 결정의 **시스템 강제** + **V09 §4-3 모순 ④ "임상 권위 vs 행정 편의"** (B2C DTx 톤 vs B2B 오피스 톤 페르소나별 카피 분리) ([[product/sources/39-VPS-V09-Final]]).

---

## ⭐ ADR-05 (V05 신규) · Next.js 풀스택 모놀리스

| 항목 | 내용 |
|---|---|
| **결정** | **Next.js 15 App Router 단일 풀스택 프레임워크**. FE/BE 분리 금지 |
| **대안** | React (FE) + NestJS/Express (BE) 분리 |
| **사유** | **1인/소규모 팀 + 100% 바이브 코딩(AI 의존) 호환성**. AI 코드 어시스턴트 학습 데이터 가장 풍부. 인프라 관리 포인트 0 |
| **시스템 영향** | **C-TEC-001~007 전면 적용**:<br>• Server Actions + Route Handlers (별도 BE 금지)<br>• Tailwind + shadcn/ui 강제<br>• Vercel 단일 배포 (Git Push 자동) |
| **연결 REQ** | C-TEC-001 + 모든 FR-Q (Read 14) + FR-C (Write 18) |
| **연결 Risk** | R7 Vercel Timeout (10s Hobby/60s Pro) — Pro 업그레이드 + Edge Runtime 우회 |
| **trade-off** | Vendor Lock-in (Vercel + Supabase) / 장시간 처리 불가 (60s+) / Native API 제한 |

→ V05/V06의 핵심 혁신. [[product/concepts/tech-architecture]] § 4 Layer Architecture 의 토대.

## ⭐ ADR-06 (V05 신규) · Supabase BaaS 통합

| 항목 | 내용 |
|---|---|
| **결정** | **Supabase 단일 BaaS** — Auth + PostgreSQL + Storage + Realtime + pgvector 일원화 |
| **대안** | 자체 PostgreSQL + Redis + S3 + Auth0/Cognito 등 분산 |
| **사유** | **인프라 운영 부담 제거**. 1인 개발 + 바이브 코딩에서 DevOps 불가능 |
| **시스템 영향** | **DB-001 부트스트랩 1일** — Prisma + Supabase 통합. RBAC = Next.js Middleware + Supabase RLS |
| **연결 REQ** | C-TEC-003 + REQ-NF-019 (RBAC) + REQ-NF-016 (Storage 7일) |
| **연결 Risk** | R8 Supabase 무료 티어 (500MB DB / 1GB Storage) — Pro 전환 기준 명확화 |
| **trade-off** | Vendor Lock-in / Free 한도 빠른 도달 / Realtime 대신 Polling Fallback (D5) 필요 |

## ⭐ ADR-07 (V05 신규) · Vercel AI SDK + Gemini

| 항목 | 내용 |
|---|---|
| **결정** | **Vercel AI SDK + Google Gemini** 기본 LLM 스택. Python 서버 금지 |
| **대안** | LangChain Python 서버 + 자체 hosting / OpenAI API 직접 |
| **사유** | **Python 서버 운영 비용 제거**. Next.js 환경에서 직접 LLM 호출. Managed API = 비용·속도 최적 |
| **시스템 영향** | **API-011 Vercel AI SDK 어댑터** + **F15 챗봇 `useChat()` 스트리밍** + F9-d 쿠션어 알림장 + F18 발달 예측 |
| **연결 REQ** | C-TEC-005, 006 + REQ-FUNC-039~040, 044, 056 |
| **연결 Risk** | R5 Gemini API 정책 변경 — env로 OpenAI/Anthropic Fallback (D4) |
| **trade-off** | Python 생태계 미사용 (LangChain 등) / Gemini 한국어 아동 발화 정확도 별도 검증 (D1) |

> 비용: Gemini 1.5 Flash 무료 티어(RPM 15)로 MVP 커버 → $0~$5/월. ($30~35 전체 운영비의 일부)

---

## 🆕 ADR-08 (위키 합성) · F9.4 무로그인 분리

| 항목 | 내용 |
|---|---|
| **결정** | F9-a 원장 대시보드 (로그인 후 운영) ↔ F9.4 ROI 시뮬레이터 (무로그인 영업) **인증 경계 명시 분리** |
| **대안** | F9-a 흡수 (모든 B2B 페이지 로그인 강제) |
| **사유** | 영업 단계 진입율 80%↓ 회피 — 무로그인 ROI 페이지가 B2B 리드 캡처 퍼널의 입구 (Land 단계). F9-a 풀 대시보드는 도입 후 운영 도구. |
| **시스템 영향** | F9.4 별도 SSR 페이지 (`/roi`, 무로그인 5 신규 task / 7 SP). 리드 캡처는 옵셔널. |
| **연결 REQ** | 후보 REQ-FUNC-062~064 (SRS V07 후속) + 신규 KPI 4종 (진입율/PDF 전환/PoC 신청/B2B 결제) |
| **연결 Risk** | 영업 단계 진입율 미달 → CR Tier 2 재검토 |
| **trade-off** | 인증 경계 2종 관리 / 별도 SSR 페이지 운영 / Resend 100/일 한도 분배 (HITL과 공유) |

→ 정본 [[product/concepts/F9.4-ROI-simulator]] § 결정 1.

## 🆕 ADR-09 (위키 합성) · F11 부모 음성 윤리 화이트리스트

| 항목 | 내용 |
|---|---|
| **결정** | 부모 음성 클로닝 적용은 `ALLOWED_CONTENT_TYPES` (storybook, lullaby) 화이트리스트만 — **교정 콘텐츠 (articulation_correction, phoneme_drill, mission_mirror) 0건 시스템 강제** |
| **대안** | 모든 콘텐츠에 적용 가능 (사용자 선택) |
| **사유** | 치료자 ≠ 가족 역할 분리의 임상 원칙 ([[clinical/concepts/실어증]] § MIT 임상 원리). 부모 목소리로 교정하면 (1) 가족 갈등 (2) 임상 효과 저하 (3) 윤리 침해. **V09 §4-3 모순 ① "부모 목소리 vs 캐릭터" 시스템 강제** ([[product/sources/39-VPS-V09-Final]]). |
| **시스템 영향** | `applyParentVoice(contentType)` 함수에 ALLOWED 화이트리스트 강제 + TEST-NEW-F11-1 자동 회귀 검증 (교정 페이지 음성 0건) |
| **연결 REQ** | REQ-FUNC-037 (교정 차단) ⚠️ + ADR-04 (의료 용어 배제) 정합 |
| **연결 Risk** | 화이트리스트 우회 코드 변경 → TEST-NEW-F11-1 자동 차단 + 코드 리뷰 강제 |
| **trade-off** | UX 옵션 제한 (부모가 모든 콘텐츠에 적용 못 함) — 임상 안전 우선 |

→ 정본 [[product/concepts/Phase-1-future-tasks-decomposition]] § F11.

## 🆕 ADR-10 (위키 합성) · F16 D5 PWA 부활 의존성

| 항목 | 내용 |
|---|---|
| **결정** | F16 오프라인 푸시 알림 = **D5 PWA 부활을 강제로 의존**. 단독 활성화 금지 |
| **대안** | F16 단독 활성화 (네이티브 푸시 등 우회) |
| **사유** | F16 = Service Worker push subscription 필수 → PWA 미존재 시 비작동. D5 (PWA 오프라인) 부활 없이 F16만 활성화하면 50%+ 환경에서 실패. |
| **시스템 영향** | F16 활성화 트리거 = D5 부활 조건 (강지방 농촌 사용자 비율 N%+ + iOS Safari + EXP-2 통과) 충족 시. CR Tier 2 재검토 필수 |
| **연결 REQ** | REQ-FUNC-041 (Web Push API) + D5 (PWA 오프라인) Descope 부활 |
| **연결 Risk** | D5 부활 없이 F16 활성화 시도 → 50% 환경 비작동 |
| **trade-off** | F16 활성화 지연 (D5 부활 후) — 단계적 출시 강제 |

→ 정본 [[product/concepts/Phase-1-future-tasks-decomposition]] § F16.

## 🆕 ADR-11 (위키 합성) · HITL 재학습 책임 분리

| 항목 | 내용 |
|---|---|
| **결정** | HITL 재학습 파이프라인의 **자동 (롤백·재배포) vs 수동 (재학습 시작 = CTO 승인) 책임 분리** |
| **대안** | 모든 단계 자동화 (오진율 ≥0.5% → 자동 롤백 → 자동 재학습 → 자동 재배포) |
| **사유** | 자동 재학습 시 무한 루프 위험 (오진율↑ → 롤백 → 재학습 → 새 오진 → 롤백 반복). 데이터 품질 검토 + 비용 통제 필요. |
| **시스템 영향** | model_retraining_data 자동 INSERT (PostgreSQL 트리거) + Vercel Cron 자동 모니터링 + Slack Alert / **CTO 승인 후 배치 ID 할당** + Vercel AI SDK fine-tuning 호출 / Hold-out 100건 ≤0.3% 자동 재배포 |
| **연결 REQ** | REQ-FUNC-HITL-004a~d (4 sub-원칙) + REQ-NF-022 (LTV:CAC 모니터링과 통합) |
| **연결 Risk** | 자동 재학습 무한 루프 / 데이터 편향 (expertId 단일 의존) |
| **trade-off** | 재학습 지연 (CTO 승인 시간) — 데이터 품질 우선 |

→ 정본 [[product/concepts/HITL-retraining-pipeline]] § RACI 책임 매트릭스.

## 🆕 ADR-12 (위키 합성) · 변경 관리 3-Tier

| 항목 | 내용 |
|---|---|
| **결정** | PRD/SRS 변경 시 영향 범위별 **3-Tier 분류** + CR (Change Request) 워크플로 7단계 |
| **대안** | 단일 절차 (모든 변경 동일 처리) |
| **사유** | 영향 범위가 다르면 거버넌스 비용도 달라야 효율적. Minor 텍스트 수정 ≠ Strategic 페르소나·기술 스택 전환. raw 53 § 선택적 보강 권고 (Low) 직접 실행. |
| **시스템 영향** | Tier 1 (Minor, 1 리뷰어 즉시 머지) / Tier 2 (Major, 2 리뷰어 + Quality Gate) / Tier 3 (Strategic, 3 리뷰어 + 멀티 LLM + Readiness Gate ≥85%) |
| **연결 REQ** | RTM ([[product/concepts/requirements-traceability-matrix]]) = Tier 분류·영향 분석 핵심 도구 |
| **연결 Risk** | Tier 분류 오류 → 과소/과다 리뷰. Tier 2-3 미준수 시 결함 누락. |
| **trade-off** | Tier 분류 자체에 시간 소요 / Strategic 변경 지연 (멀티 LLM 사이클) — 거버넌스 품질 우선 |

→ 정본 [[product/concepts/change-management-process]] § 3-Tier + CR 워크플로.

## 🆕🆕 ADR-13 (위키 합성 2차) · system_config 테이블 (env+DB 하이브리드)

| 항목 | 내용 |
|---|---|
| **결정** | 운영 정책 (Phase / expert 풀 / 임계값 등) **env 기본값 + DB 동적 오버라이드** 하이브리드 |
| **대안** | env만 (배포 시점만 변경) / 외부 Feature Flag (LaunchDarkly $10/月) / DB만 (캐싱 부담) |
| **사유** | Phase 변경 등 동적 정책 + 다중 인스턴스 일관성 + 비용 0 + 외부 의존성 회피 |
| **시스템 영향** | system_config 테이블 (DB-NEW-OPS-1, 1 SP) + 60초 캐싱 + audit_log 강제 + RBAC (CTO만 변경) |
| **연결 REQ** | 신규 (현 SRS 미반영, V07 후속 개정) |
| **연결 Risk** | DB 호출 비용 (캐싱으로 완화) / Phase 변경 권한 관리 미준수 시 결함 |
| **trade-off** | 복잡성 약간 ↑ (env vs DB 우선순위) — 동적 변경 가치 우선 |

→ 정본 [[product/concepts/HITL-operations-policy]] § 2 getCurrentPhase() 메커니즘.

## 🆕🆕 ADR-14 (위키 합성 2차) · F15 임상 안전 게이트

| 항목 | 내용 |
|---|---|
| **결정** | F15 LLM 챗봇 활성 시 **만 4세+ 강제** + **ASD 의심 패턴 자동 감지** + **가드레일 5종** 시스템 강제 |
| **대안** | F15 모든 연령 활성 / 가드레일 미적용 |
| **사유** | ASD 회피 경계 ([[clinical/concepts/자폐-화용중재]]) + KOPLAC 영감 ≠ KOPLAC 진단 (ADR-04 정합) + 만 2-3세 인지 발달 미성숙 |
| **시스템 영향** | (1) 연령 검증 (만 4세 미만 비활성) (2) ASD 의심 발화 자동 감지 → confidence 60% 강제 게이트 (3) 가드레일 = 시간 제한 ≤15분/일 + Disclaimer 강제 + 의료 용어 검열 + 챗봇 ASD 직접 질문 차단 + 시드 고정 |
| **연결 REQ** | 후보 REQ-FUNC-NEW-F15-1~4 (Phase 1 신규) |
| **연결 Risk** | F15 자문 후 Critical 발견 시 본 ADR 발효 / 가드레일 우회 코드 변경 → TEST 자동 차단 |
| **trade-off** | F15 활성 영역 축소 (만 2-3세 제외) — 임상 윤리·규제 회피 우선 |

→ 정본 [[product/concepts/F15-clinical-consultation-checklist]] § 9 자문 항목 + [[product/entities/persona-황보름]] (ASD 경계선) 정합.

## 🆕🆕 ADR-15 (위키 합성 2차) · IRB 자문위원회 운영

| 항목 | 내용 |
|---|---|
| **결정** | T4-c 외부 공유 + 학술 발표 시 **분기 자문위원회 + 외부 협력 시 외부 기관 IRB 양쪽 승인** |
| **대안** | 내부 결정만 / 외부 IRB 일임 / IRB 절차 생략 |
| **사유** | T4-c 외부 공유 + T4-b 학술 발표 = 임상 윤리 + GDPR Art. 25 (Data Protection by Design) + 한국 개인정보보호법 §22 정합 |
| **시스템 영향** | 분기 자문위원회 회의 (~30만/회) + 외부 협력 시 외부 기관 IRB 검토 (≤4주) + audit_log 강제 + 부모 T4-c 철회 시 즉시 차단 |
| **연결 REQ** | F10 § T4-c 동의 (REQ-FUNC-NEW-F10R-2 매핑) + GDPR Art. 6/7/17/25 |
| **연결 Risk** | IRB 자문위원회 부재 시 외부 협력 차단 / 외부 기관 IRB 거부 시 데이터 공유 불가 |
| **trade-off** | 외부 협력 지연 (4주 IRB) + 분기 회의 비용 (연 120만) — 윤리·법적 안전 우선 |

→ 정본 [[product/concepts/HITL-operations-policy]] § 3 IRB 5단계 절차 + [[product/concepts/F10-research-consent]] § T4-c.

---

## ⭐ V09 §4-3 4 모순 해결 원칙 = ADR 임상·UX 토대 (41차 정독 발견)

V09 §4-3에서 명시된 4 모순 해결 원칙이 ADR-01·04·09 등의 **직접 임상·UX 토대**임이 41차 정독에서 명확화. ADR 결정 사유 보강:

| V09 §4-3 모순 원칙 | 해결 방향 | 직접 매핑 ADR | 적용 Epic |
|---|---|---|---|
| **① 부모 목소리 vs 캐릭터** | 일방향 콘텐츠 (동화)만 부모 / **교정 훈련은 중립 캐릭터** (가족 ≠ 치료자) | **ADR-09 (F11 윤리 화이트리스트)** | F3-a, F11, F15 |
| **② Zero-touch vs 체크박스** | 데이터 Input 100% 마이크 / **교사는 승인만** | **ADR-01 (Zero-touch 수집)** | F9-b |
| **③ 은밀한 난이도 vs 강한 보상** | 모든 시도 → 작은 보상 / **완벽 성공 → 큰 보상** (이중 보상) | (ADR 없음 — 명세 영역) | F3-a, F3-b, F12 |
| **④ 임상 권위 vs 행정 편의** | **B2C 앱 = DTx 톤 / B2B 대시보드 = 오피스 톤** (페르소나별 카피 분리) | **ADR-04 (의료 용어 배제)** | F2, F4, F9-a, F9-d |

→ 4 모순 원칙 = ADR 결정의 **UX·임상 근거 토대**. ADR-01·04·09 시스템 강제는 V09 §4-3 모순 원칙의 **시스템적 실현**.

---

## ADR 의존성 그래프 (41차 보강)

```
[비즈니스·규제 ADR (V01-V04 계승)]
ADR-04 (의료 용어 배제) ───┬── PRD V10 카테고리 정의 (비의료 B2C 홈 랭귀지 코칭)
                          │       ↑
                          │   ⭐ V09 §4-3 모순 ④ "임상 권위 vs 행정 편의" 토대
                          │
ADR-01 (Zero-touch)  ─────┤── PRD V10 §3 HITL 안전 프로토콜 (Zero-touch 강제)
                          │       ↑
                          │   ⭐ V09 §4-3 모순 ② "Zero-touch vs 체크박스" 토대
                          │
ADR-02 (HITL 비동기) ─────┬── PRD V10 §3 HITL 4 원칙 (자동 에스컬레이션·48h SLA·루프백)
                          │       ↑
ADR-03 (원본 폐기)  ──────┤   F10 § T4-a/b/c 임상 연구 동의 토대 (R&D ≠ 매출원)
                          │
                          ├──→ ADR-09 (F11 윤리 화이트리스트) — MIT 원칙 + ⭐ §4-3 모순 ① "부모 vs 캐릭터" 토대
                          └──→ ADR-11 (HITL 재학습 책임 분리) — 4 sub-원칙 + 자동/수동 분리

[기술 스택 ADR (V05-V06 신규)]
ADR-05 (Next.js 모놀리스) ─┐
                            ├──── SRS V06 §1.5 C-TEC-001~007
ADR-06 (Supabase BaaS)  ──┤
ADR-07 (Vercel AI SDK)  ──┘
                            ├──→ ADR-08 (F9.4 무로그인 분리) — Next.js Route Group 인증 경계
                            ├──→ ADR-10 (F16 D5 의존성) — PWA Service Worker 의존
                            └──→ ADR-11 (HITL 재학습) — Vercel Cron + AI SDK fine-tuning

[운영 정책 ADR (위키 합성 2차)]
ADR-13 (system_config) ──── env+DB 하이브리드 → 모든 ADR의 임계값 동적 변경 가능
                            (Phase·expert 풀·HITL 임계 등 일원화)
ADR-14 (F15 안전 게이트) ── ADR-04 (의료 용어 배제) + ADR-09 (윤리) + ADR-02 (HITL) 통합
                            → V09 §4-3 모순 ① + ④ 시스템 강제 (만 4세+ 활성)
ADR-15 (IRB 자문위원회) ── ADR-02 (HITL) + ADR-03 (7일 폐기) + F10 § T4-c 통합
                            → 임상 윤리 + GDPR + 한국 개인정보보호법 정합

[Meta ADR (위키 합성)]
ADR-12 (변경 관리 3-Tier) ──── 모든 ADR 자체 변경 거버넌스 + RTM 영향 분석 트리거
```

→ ADR-13 = 운영 정책 일원화 (모든 임계값 동적 변경) / ADR-14 = ADR-02·04·09 통합 임상 안전 / ADR-15 = ADR-02·03 + F10 통합 윤리 거버넌스.

→ ADR-01·04·09 = V09 §4-3 4 모순 원칙의 **시스템 강제**. UX·임상 의도가 시스템 결정으로 변환된 추적 가능 흐름.

→ ADR-08~11 = ADR-01~07의 직접 자손 (시스템 영역별 세분화). ADR-12 = Meta-ADR.

## V09 §4-3 모순 원칙 → ADR 추적성 (Traceability)

| 모순 원칙 | 임상·UX 의도 | 시스템 강제 ADR | 시스템 메커니즘 | 검증 TEST |
|---|---|---|---|---|
| **①** | 부모 ≠ 치료자 임상 윤리 (MIT 원칙) | **ADR-09** | ALLOWED_CONTENT_TYPES 화이트리스트 | TEST-NEW-F11-1 (교정 콘텐츠 음성 0건 자동) |
| **②** | 교사 1초도 시간 없음 (R3 회피) | **ADR-01** | PWA + Web Worker VAD + 화자분리 ≥85% | TEST-013 (Hold, B2B PoC 후) |
| **④** | 페르소나별 카피 분리 (DTx 톤 vs 오피스 톤) | **ADR-04** | Next.js Middleware 금칙어 정규식 | TEST-005 (금칙어 0건 자동) |

→ **V09 의도 → ADR 결정 → 시스템 강제 → TEST 검증** 4단계 추적성 완전.

→ **③ 은밀 난이도** 는 ADR 없이 명세 영역 (F3-b 적응형 난이도 엔진 설계)에서 처리.

## V05/V06 신규 ADR (05~07) 의 비즈니스 임팩트

| ADR | 비즈니스 결과 |
|---|---|
| ADR-05 Next.js | 운영비 → ~$20/월 + 1인 개발 가능 + Sprint 1 7일 라이브 |
| ADR-06 Supabase | DB·Auth·Storage·Realtime 통합 → DB-001 1일 + DevOps 0 |
| ADR-07 Gemini | LLM 인프라 0 + 호출 비용 ≤ 월구독료의 15% (REQ-NF-018) |
| **합산 (ADR-05~07)** | **MVP 1개월 내 + 운영비 $30/월 가능** ([[product/concepts/MVP-descope-plan]]) |

## 위키 합성 ADR (08~12) 의 비즈니스 임팩트

| ADR | 비즈니스 결과 |
|---|---|
| ADR-08 F9.4 무로그인 분리 | B2B 영업 단계 진입율 80%+ 확보. Land 단계 작동 보장 |
| ADR-09 F11 윤리 화이트리스트 | 임상 윤리 시스템 강제 → 가족 갈등·임상 신뢰 침해 회피. F11 출시 가능 |
| ADR-10 F16 D5 의존성 | 단계적 출시 강제 → 50% 환경 비작동 회피. 운영 신뢰도 보호 |
| ADR-11 HITL 재학습 책임 분리 | 무한 루프 회피 + 데이터 편향 방어 + 모델 정확도 지속 향상 |
| ADR-12 변경 관리 3-Tier | 변경 거버넌스 효율화 → Minor 즉시 머지 + Strategic 멀티 LLM 사이클 강제 |
| **합산 (ADR-08~12)** | **Phase 1+2 진입 시 시스템 안정성 + 윤리 + 거버넌스 보장** |

## 위키 합성 2차 ADR (13~15) 의 비즈니스 임팩트

| ADR | 비즈니스 결과 |
|---|---|
| ADR-13 system_config | 운영 정책 동적 변경 → Phase 변경·expert 풀 확대·HITL 임계 조정 비용 0 + 다중 인스턴스 일관성 보장 |
| ADR-14 F15 안전 게이트 | F15 출시 가능 (자문 통과 후) → 만 4세+ 활성 + ASD 회피 + 가드레일 = 규제 리스크 (R1) 회피 |
| ADR-15 IRB 자문위원회 | T4-c 외부 협력 + 학술 발표 가능 → R&D 환류 강화 + 임상 신뢰도 ↑ |
| **합산 (ADR-13~15)** | **운영 정책 일원화 + 임상 안전 + 외부 협력 거버넌스** |

## 출처
- [[product/sources/65-SRS-V06-Final]] § 6.8 ADR Reference (V05 업데이트, L933-L943)
- [[product/sources/54-PRD-V10-Final]] § ADR-01~04 (V10 PRD에서 계승)

## 관련 product 페이지

- [[product/concepts/tech-architecture]] — ADR-05~07 의 시스템 구현
- [[product/concepts/MVP-descope-plan]] — ADR 결정의 1주차 실행 가이드
- [[product/concepts/MVP-feature-spec]] § HITL 4 원칙 = ADR-02 의 정책
- [[product/sources/65-SRS-V06-Final]] § C-TEC-001~007 = ADR-05~07 의 명세
- [[product/concepts/SRS-evolution]] § V05/V06 핵심 변경 = ADR-05~07

## Clinical 근거

- **ADR-04 의료 용어 배제** = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙1 (의료기관) 영역과의 명시적 분리. 비의료 B2C 카테고리 선점 ([[product/concepts/Key-Success-Factors]] § KSF #5).
- **ADR-02 HITL 비동기** = [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격자 (~17,000명) 의 비동기 디지털 운영 모델. AI 95% + 전문가 5% 하이브리드의 임상 안전망 (KSF #3).
- **ADR-03 7일 폐기** = 임상 표준 평가 ([[clinical/entities/SELSI]] 등) 의 동의·녹음 윤리 준수.
- **ADR-01 Zero-touch** = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 일상 환경 평가의 디지털화. 단, 임상 표준은 정숙 환경 기준이라 60dB 화자분리 ≥85% 정확도가 임상 정합성 핵심.

## ⭐⭐⭐ Clinical 근거 — 54차 ingest 임상 토대 정본 (3 ADR 직접 인용)

54차 ingest 임상 정독 결과(Tye-Murray + Rhea Paul + 한국 35+편)로 ADR-04/ADR-09/ADR-14의 임상 토대 정본 확립.

### ADR-04 의료 용어 배제 — 임상 토대 정본 ⭐⭐⭐

기존 임상 토대 (트랙1 분리) 외에 본 ingest로 식별된 추가 정본:

#### 1. Tomblin (2008) 규준적 조망 — Rhea Paul Ch1 직접 출전
[[clinical/concepts/언어발달지연]] § C 직접 인용:
> "**아동의 언어 성취 수준이 바람직하지 못한 결과를 낳을 만큼의 수용 불가한 수준일 때 언어장애가 존재한다**" (P.95)

→ 진단 라벨링 X. **사회적 기대 부적합** 신호로 진단.

#### 2. WHO (2001) "장애 (handicap)" 용어 사용 자제 권고 — Tye-Murray Ch1 직접 출전
[[clinical/concepts/인공와우-청능재활]] § D:
> "WHO는 **'장애 (handicap)' 용어가 때때로 경멸스럽거나 오명을 씌우는 의미**라고 규정하며 사용 자제 권고"

#### 3. 차이 → 방해 → 장애 3단계 위계 — 한국 DLD 진단·평가 핸드아웃
[[clinical/concepts/언어발달지연]] § D — 한국 임상 표준 위계:
- **차이 (difference)** — 말소리가 다른가?
- **방해 (disturbance)** — 의사전달 방해?
- **장애 (disorder)** — 장애 상황 발생?

#### 4. Rhea Paul Ch4 § 진단 범주 가치 + 주의점
[[clinical/concepts/지적장애-언어중재]] § N:
> "**진단명이 평가나 중재에 있어 특정 아동의 요구를 언제나 정확하게 지시하는 것은 아니다**"
> "**언어장애의 본질에 대해 기술하는 것이 임상 치료에서 더 중요**" (vs 진단명 자체)

→ 진단 범주 가치 3 (서비스 접근·평가 힌트·기록 해석) 인정하면서도 본질 기술 우선.

#### 5. IDEA 'evaluation' vs 'assessment' (Rhea Paul Ch2)
[[clinical/concepts/언어발달지연]] § N:
- **evaluation** (6세 이하 진단·장애명 X) = MVP F1-b 직접 매핑
- **assessment** = F1-a + HITL

→ **ADR-04 UI 단어 정본**: "차이·방해·백분위" / 회피: "장애·지체·진단·검사"

### ADR-09 F11 부모 음성 윤리 화이트리스트 — 임상 토대 정본 ⭐⭐

기존 화이트리스트 (storybook·lullaby ALLOWED) 외에 본 ingest로 식별:

#### 1. 4 핵심기법 — [[clinical/concepts/아동언어치료-핵심기법]]
- **평행 발화** (Parallel Talk) — 아이 행동을 아이 시각에서 언어로
- **확장** (Expansion) — 아이 발화 문법적 완성
- **기다리기** (Wait Time) — 5-10초 침묵
- **반응적 상호작용** (Responsive Interaction) — 아이 흥미 따라가기

→ 모두 **부모-아이 자연 상호작용** — 음성 클로닝 교정 콘텐츠는 4 기법 위배

#### 2. 부모 정서 5 단계 — Tye-Murray Ch14 (book p.521)
[[clinical/concepts/인공와우-청능재활]] § K:
- 충격 → 부정 → 슬픔 → 죄의식·분노 → 수용

→ F11 동화는 5 단계 어느 단계에서도 임상적 안전 — 일방향 콘텐츠 (상호작용 강제 X)

#### 3. Edwards (2003) 청능사 자기평가 6 체크리스트
[[clinical/concepts/인공와우-청능재활]] § K-1:
- 부모 말 결론 없이 진심으로 듣기
- 느낌 표현 행동 보여주기
- 부모 걱정 꺼낼 적절한 시점 세심
- 내용 + 느낌 공유 기회
- 부모 느낌 지지
- 부모 요구 말하기 기술 개발

→ HITL 자격자 표준 응대 — F11 콘텐츠 검토 시에도 적용

#### 4. 가족 중심 실제 (family-centered) — Rhea Paul Ch5 다문화
[[clinical/concepts/다문화-언어발달]] § G-5:
> "CLD 가족과의 상호작용에 우리 자신의 추정과 기대가 어떻게 영향을 미치는지 인식할 필요" (Kohnert 2008)

→ F11 다문화 적응 시 부모 매개 가족중심 실제 정합

#### 5. 비형식적 훈련 — Tye-Murray Ch4 (book p.142)
[[clinical/concepts/인공와우-청능재활]] § B-5:
> "어린 아동들은 주로 **비형식적 훈련**을 받는다" (가정 환경 가족 매개)

→ F11 동화 = 비형식적 가정 환경 일방향 콘텐츠 정합

#### 6. Sparks (1989) — Rhea Paul Ch6
[[clinical/concepts/언어발달지연]] § K-1:
> "영아 평가의 목적은 미래 예측이 아니라 현재 강점·요구 평가"

→ F11 동화는 미래 예측·교정 X — 현재 부모-아이 유대 강화 일방향 콘텐츠

→ **ADR-09 화이트리스트 임상 토대 정본 6 출전**: 자연 상호작용 보존 + 일방향 콘텐츠 안전

### ADR-14 F15 임상 안전 게이트 — 임상 토대 정본 ⭐⭐

기존 만 4세+ 활성 + ASD 의심 가드레일 외에 본 ingest로 식별:

#### 1. F15 자문 체크리스트 13 항목
[[product/concepts/F15-clinical-consultation-checklist]] — 본 ADR 직접 임상 안전 가드레일:
- 1-9 (이전 ingest): 화용 4축 + 연령 적응 + ADR-04 정합 + 자연 발화 + 데이터 활용 + ASD 회피 + 부모 코칭 + 가드레일 + KOPLAC 저작권
- 10-13 (54차 ingest): **8 추론 유형 + 난이도 위계 + 측정 단위 라이브러리 + 자문 풀 7 그룹**

#### 2. 박후임 (2008) 8 추론 유형 정본
[[clinical/concepts/내러티브-담화-추론-중재]] § D:
- 제목·인물 성격·감정·이어질·생략·원인-결과·배경·주제
- **감정 추론 = ASD 핵심 결함** (최숲 2007 PDD 감정 추론 결함) → ADR-14 활성 신중

#### 3. F15 난이도 위계 (Level 1-3)
[[product/concepts/MVP-clinical-foundation]] § 5.2:
- Level 1 (만 4세): 사실 + 명시적
- Level 2 (만 5세): 응집성 + 암시적
- Level 3 (만 6-7세): 정교 + 함축적
- ⛔ 회피: 평가적 추론 + 감정 추론

#### 4. 서유진 외 (2018) 스크립트 중재 — ADR-14 정합
[[clinical/concepts/자폐-화용중재]] § D-5:
- 24회기 6 스크립트 (정서 인식 + 훈련 + 완성 3 단계)
- 학령기 ASD 대상 → MVP 만 4-7세 + 자가 학습 = ⛔ 회피 정합

#### 5. ASD vs FXS 마음이론 결함 원인 차이 — Rhea Paul Ch4
[[clinical/concepts/자폐-화용중재]] § N:
- ASD = **사회-인지 결함**
- FXS = **작업기억 + 집행 조절 결함**
- → F15 단순 화용 점수 X — HITL 양 관점 명시 필수

#### 6. EMT 환경 중심 언어중재 — [[clinical/concepts/언어발달지연]] § DLD 3단계 § 3
- 환경 조작 + 반응 요구하기 (Mand-model)
- → F15 챗봇 시나리오 = EMT 디지털 변형 (만 4세+ § 화용·담화)

→ **ADR-14 임상 토대 정본 6 출전 + 자문 풀 7 그룹** = 한국 임상 자문 안전 게이트 완성

### ADR 5-15 미보강 (잠재 후보)

- ADR-02 HITL → Transdisciplinary 모델 (Rhea Paul Ch2 [[clinical/concepts/언어발달지연]] § B) 보강 가능
- ADR-05/06/07 (기술 스택) → 임상 토대 X (회피)
- ADR-08/10/11/12/13/15 → 잠재 보강 후보 (54차 ingest 직접 영향 적음)

## 보강 필요
- 각 ADR의 **거부 시나리오**: 만약 ADR-05를 거부했다면? (FE/BE 분리 시 필요 인력·기간·비용 분석) 의사결정 학습 가치 큼.
- ADR-08+ 후보: TASKS/03 Sprint 1 8 코어 결정 + 8 Descope 적용 = 새로운 ADR 후보? "의도적 SRS 미준수" 결정의 명문화 필요.
- ADR vs C-TEC 차이: ADR = 결정 + 사유 / C-TEC = 시스템 제약. 본 페이지는 ADR 정본, C-TEC 정본은 [[product/concepts/tech-architecture]].
