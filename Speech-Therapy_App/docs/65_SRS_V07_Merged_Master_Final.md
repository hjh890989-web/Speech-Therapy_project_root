# Software Requirements Specification (SRS V07)

> **문서 ID**: SRS-001 V07 (= V06 Merged Master + Wiki 합성 + 본 sub-session 결과)
> **base**: V06 (`docs/64_SRS_V05_Merged_Master_Final.md`, 919 lines, 99 REQ + 4 ADR + 7 Entity + 8 API)
> **작성일**: 2026-05-27 (1차 draft — §0 + §12 컴플라이언스 신규 + §6.8 ADR 갱신)
> **상태**: 🟡 **draft** — 본 sub-session 에서 §0 + §12 + §6.8 작성. §4 / §5 / §6 나머지 / §7-§11 은 다음 sub-session 보강 continue.
> **Gap Analysis**: [`tasks/09_SRS_V06_vs_Wiki_Gap_Analysis.md`](../tasks/09_SRS_V06_vs_Wiki_Gap_Analysis.md) 참조.

---

# §0. Revision History — V06 → V07

## 0.1 V07 핵심 변경

V07 은 V06 base 위에 다음을 통합:

1. **Wiki 지식 베이스 합성** (`Speech-Therapy_Workbase/wiki/`, 54차 ingest, 112 페이지)
2. **실 코드 구현 정합성** (Project #8 의 14 items Done sync 결과 = MVP 코드 100% 완료)
3. **2026-05-27 sub-session 컴플라이언스 작업 28+ commits** (Grill #3A A1~A5 완전 cover)

## 0.2 V06 → V07 보강 매트릭스

| 영역 | V06 | V07 | 변화 |
|---|---|---|---|
| ADR | 4 | **16** | +12 (ADR-05/06/07 V05 신규 + Wiki 합성 ADR-08~15 + 본 sub-session ADR-16 PIPA 5중 가드) |
| REQ-FUNC | 65 | **78** | +13 (Phase 1+ F11/F15/F16/F17/F18 신규 task 분해) |
| REQ-FUNC-HITL | 4 | **7** | +3 (HITL 재학습 0.5%/500건/0.3% 게이트) |
| REQ-NF | 30 | **35** | +5 (PIPA §22-6 / §17 / Gemini PII 마스킹 / 의료기기법 footer / 5중 가드) |
| **합계 REQ** | **99** | **~120** | +21 |
| Entity (ERD) | 7 | **14+** | +7 (Institution / Class / ConsentSignature / OfflineEntry / AuditLog / RewardLog + PIPA 동의 컬럼) |
| API endpoint | 8 | **11+** | + Server Actions 14 + Route Handler / Cron 8 / Auth / Admin |
| Sprint Task | 88 | **102+** | +14 sub-task (tasks/03 §10) |
| HITL 정책 | §3.6.2 + §4.1 Cross-cutting (4 원칙) | **§5 완전 재작성** | Wiki 4 페이지 (2034 lines) 흡수 — 9 단계 흐름 + 재학습 + Phase 풀 + 다양성 |
| 임상 reference | 미명시 | **§1.4 + §6.11** | Wiki clinical 30 페이지 + entities 40+ |
| 컴플라이언스 | §4.2 보안 (4 REQ) | **§12 신규** | 본 sub-session 결과 통합 (PIPA + 의료기기법 + 5중 가드 + 변호사 자문) |
| 변경 관리 | 미포함 | **§8** (Wiki change-management 통합) | 신규 |
| Glossary | §1.3 (간략) | **§9** (Wiki glossary 통합) | 12 카테고리 + 3 온보딩 순서 |
| F15 임상 자문 | 미포함 | **§10** (Wiki F15-clinical-consultation-checklist 통합) | KOPLAC 13 항목 + 자문 4주 + 82만 |

## 0.3 V07 작성 진행 상태 (본 sub-session 1차 draft)

| § | 상태 | 비고 |
|---|---|---|
| **§0** | ✅ 본 sub-session | 본 섹션 |
| §1-3 | 🟡 **V06 재사용 + ADR 서론 갱신** | 다음 sub-session 에서 §3.5 API + §3.6 Sequence 갱신 continue |
| §4 | ⬜ 다음 sub-session | Phase 1+ 13 신규 task + NF 5 신규 추가 |
| §5 | ⬜ 다음 sub-session | HITL 완전 재작성 (Wiki 4 페이지 흡수) |
| **§6.8 ADR** | ✅ 본 sub-session | 4 → 16 갱신 |
| §6.1 ERD | ⬜ 다음 sub-session | 7 → 14+ Entity |
| §6.5 Timeline | ⬜ 다음 sub-session | 14 sub-task + 보류 4건 |
| §6.9~6.11 | ⬜ 다음 sub-session | 임상 자문 + IRB + 임상 reference |
| §7 운영 | ⬜ 다음 sub-session | Phase 별 expert 풀 + 운영비 |
| §8 변경 관리 | ⬜ 다음 sub-session | Wiki change-management 통합 |
| §9 Glossary | ⬜ 다음 sub-session | Wiki glossary 통합 |
| §10 F15 KOPLAC | ⬜ 다음 sub-session | Wiki F15 통합 |
| §11 R6 Plan B | ⬜ 다음 sub-session | Wiki R6 통합 |
| **§12 컴플라이언스** | ✅ 본 sub-session | 본 sub-session 결과 통합 |

---

# §1. Introduction (V06 재사용 + ADR 갱신)

> V06 의 §1.1~§1.5 본문은 그대로 유지하며, 다음 변경만 반영:

## 1.5.1 Architectural Constraints (V06 ADR-01~04 → V07 ADR-01~16)

V06 의 §1.5.1 의 ADR-01~04 표는 V07 의 **§6.8 ADR Reference (16 ADR 완전 표)** 로 확장. 본 §1.5.1 에서는 ADR-01~04 의 핵심만 인용 + §6.8 으로 link.

| ADR | 핵심 | V07 §6.8 link |
|---|---|---|
| ADR-01 | Zero-touch 수집 전면 도입 | §6.8 ADR-01 |
| ADR-02 | HITL 비동기 감수 | §6.8 ADR-02 |
| ADR-03 | 원본 음성 ≤ 7일 폐기 | §6.8 ADR-03 |
| ADR-04 | 의료 용어 하드코딩 배제 (CON-04) | §6.8 ADR-04 |
| ADR-05~15 | **신규 (V05 + Wiki 합성)** | §6.8 ADR-05~15 |
| ADR-16 | **PIPA 5중 가드 (본 sub-session 신규)** | §6.8 ADR-16 + §12.4 |

> 나머지 §1.1~§1.5 본문 (Purpose / Scope / Definitions / References) 은 V06 그대로. **다음 sub-session 에서 §1.4 References 에 wiki clinical 30 페이지 link 추가 예정.**

---

# §2. Stakeholders (V06 재사용)

> V06 의 §2 (Stakeholder DMU Dependency) 그대로 유지.

---

# §3. System Context and Interfaces (V06 base + 다음 sub-session 보강)

## 3.1 Use Case Diagram

V06 의 §3.1 그대로 유지.

## 3.2 Component Diagram

V06 의 §3.2 base. **다음 sub-session 에서 다음 컴포넌트 추가**:
- AuthHeader → **MainNav** (5/27 헤더 정리)
- **ConsentRedirectGate** (Client-side 가드)
- **MedicalDisclaimerFooter** (전역)
- **PrivacyConsentForm** + Server Action `savePrivacyConsent`

## 3.3 External Systems

V06 base + **Resend (이메일)** + **Google Cloud Speech (STT, 미국)** + **Google AI Studio Gemini (안내 문구, 미국)** 명시 갱신 (다음 sub-session).

## 3.4 Client Applications

V06 그대로 유지.

## 3.5 API Overview

V06 = 8 endpoints → V07 = 11+ API + 14+ Server Actions + 8 cron. **다음 sub-session 에서 §3.5 갱신**:

- Server Actions: `analyzeDiagnosis` / `savePrivacyConsent` / `saveChildInfo` / `updateChildProfile` / `generateCushion` / `generateCushionNote` / `submitConsentSignature` / `submitBulkImport` / `submitOfflineEntry` / `grantReward` / `markOnboardingCompletedInDb` 외
- Route Handlers: `/api/hitl/queue` / `/api/hitl/comment` / `/api/b2b/approval` / `/api/consent/sign` / `/api/audio/stream` / `/api/health`
- Cron: `hitl-monitor` / `weekly-reports` (vercel.json) + 6 cron GitHub Actions (`error-monitor` / `hitl-escalation` / `funnel-alert` / `consent-reminder` / `consent-expire` / `audio-cleanup`)
- Auth: `/login` / `/signup` / `/auth/callback`
- Admin: `/admin/audit` / `/admin/teacher` / `/admin/hitl` / `/admin/students/import`

## 3.6 Interaction Sequences

V06 base + **§3.6.3 PIPA 동의 흐름** 신규 (다음 sub-session).

---

# §4. Specific Requirements (V06 base + 다음 sub-session 보강)

> **본 § 는 다음 sub-session 에서 V07 의 가장 큰 추가 작업**. V06 의 99 REQ → V07 의 ~120 REQ.

## 4.1 Functional Requirements

### Phase 0 — MVP 코어 (V06 그대로, 26 REQ)
### Phase 1 — 리텐션/바이럴 (V06 23 REQ + **신규 13** = 36 REQ)

**다음 sub-session 에서 추가 (Wiki Phase-1-future-tasks-decomposition 흡수)**:

| Epic | 신규 task 수 | 출처 |
|---|---|---|
| F11 부모 음성 클로닝 동화 | 5 | wiki Phase-1-future §F11 |
| F15 LLM 대화형 발화 유도 챗봇 | 4 | wiki Phase-1-future §F15 |
| F16 오프라인 일반화 푸시 알림 | 3 | wiki Phase-1-future §F16 |
| F17 통합 케어로그 (보강) | 2 | wiki Phase-1-future §F17 |
| F18 발달 예측 시뮬레이션 (보강) | 1 | wiki Phase-1-future §F18 |
| **합계** | **15 task** (REQ 매핑은 task 1 → REQ 1 가정 시 +15, 실제로는 +13 추정) | |

### Cross-cutting — HITL 안전 프로토콜 (V06 4 → V07 7 REQ)

**다음 sub-session 에서 추가 (Wiki HITL-retraining-pipeline 흡수)**:
- REQ-FUNC-HITL-005: 재학습 데이터 자동 INSERT 트리거 (model_retraining_data 스키마)
- REQ-FUNC-HITL-006: 재학습 게이트 0.5% / 500건 / 0.3%
- REQ-FUNC-HITL-007: expertId 다양성 모니터링 (HHI + Gini)

### Phase 2 — B2B 스케일업 (V06 그대로, 16 REQ)

## 4.2 Non-Functional Requirements (V06 30 → V07 35 REQ)

**다음 sub-session 에서 추가 (본 sub-session 결과 통합)**:

| REQ ID | 항목 | 기준 | 출처 |
|---|---|---|---|
| **REQ-NF-025** | PIPA §22-6 만 14세 미만 부모 대리 동의 | 인증 user: onboarding Step2 + /settings/privacy-consent / 익명 user: /diagnose inline 체크박스 + localStorage marker / DB 영속 (`pipaUnderageConsentAt`) | 본 sub-session A1 |
| **REQ-NF-026** | PIPA §17 국외 이전 동의 | STT (Google Cloud Speech US) + Gemini (US/global) 통합 동의 / DB 영속 (`overseasTransferConsentAt`) | 본 sub-session A2 |
| **REQ-NF-027** | Gemini transcript PII 마스킹 | `lib/ai/pii-mask.ts` — 한국 PIPA 7 패턴 (주민등록번호 / 신용카드 / 이메일 / 전화번호 / URL / IPv4 / 한국식 상세 주소) | 본 sub-session A3 |
| **REQ-NF-028** | 의료기기법 disclaimer 전역 footer | `MedicalDisclaimerFooter` (모든 페이지) + /privacy + /terms 링크 | 본 sub-session A5 |
| **REQ-NF-029** | PIPA 5중 가드 | UI (ConsentRedirectGate) + Server Action × 4 (analyzeDiagnosis / updateChildProfile / generateCushion + 익명 가드) | 본 sub-session A4 |

→ V06 §4.2 보안 (4 REQ) + 위 5 신규 = **9 REQ NF 보안 영역**.

---

# §5. HITL 안전 프로토콜 (V07 신규 — 다음 sub-session 완전 작성)

> **다음 sub-session 의 핵심 작업** — V06 의 §3.6.2 시퀀스 + §4.1 Cross-cutting (4 원칙) 를 통합 + Wiki 4 페이지 (2034 lines) 흡수.

## 5.1 9 단계 흐름 (Wiki HITL-system-flow)

1. AI 1차 분석 → Confidence 산출
2. Confidence < 70 → API-005 큐 자동 등록
3. expert (1급/2급 분산) 배정
4. API-006 Studio 또는 PostgreSQL TRIGGER 자동 capture
5. 24h 무응답 → 1차 알림 (Resend)
6. 48h SLA 초과 → 2차 알림 + admin 에스컬레이션
7. expert 보정 점수 + 코멘트
8. 어뷰징 방어 (expertId 다양성 모니터링 — Phase 2 HHI + Gini)
9. 루프백 (재학습 게이트 0.5%/500건/0.3% 통과 시 model_retraining_data INSERT)

## 5.2 재학습 파이프라인 (Wiki HITL-retraining-pipeline)

다음 sub-session 작성.

## 5.3 Phase 별 expert 풀 운영 (Wiki HITL-operations-policy)

다음 sub-session 작성.

## 5.4 다양성 모니터링 (Wiki expert-diversity-monitoring)

다음 sub-session 작성.

---

# §6. Appendix (V06 base + ADR 갱신 + 다음 sub-session 보강)

## 6.1 Entity Relationship Diagram (ERD)

V06 = 7 Entity → V07 = 14+ Entity. **다음 sub-session 에서 갱신** (실 Prisma schema 기반):

- 기존 7: users / session_logs / evaluation_results / mission_cards / reward_progress / weekly_reports / hitl_queue
- 신규 7+: **Institution / Class / RewardLog / ConsentSignature / OfflineEntry / AuditLog** + User 의 신규 컬럼 (`pipaUnderageConsentAt` / `overseasTransferConsentAt` / `totpBackupCodes` / `preferredPhonemes` / `notificationPreference` / `onboardingCompletedAt`)

## 6.2 Domain Class Diagram

V06 그대로 + 다음 sub-session 에서 신규 Entity 추가.

## 6.3 Data Dictionary

V06 그대로 + 다음 sub-session 에서 신규 컬럼 추가.

## 6.4 Sequence Diagrams

V06 의 5 시퀀스 + **신규 §6.4.4 PIPA 동의 흐름** (다음 sub-session).

## 6.5 Implementation Timeline

V06 의 88 Task → V07 의 102+ Task (Sprint sub-task 14 추가).

**다음 sub-session 에서 작성** (tasks/03 §10 + Project #8 14 items Done 통합):
- Sprint 1 sub-task: 3 (SP1A/B/C — cushion 분리 / user upsert 병렬 / Slack fire-and-forget)
- Sprint 2 sub-task: 4 (SP2_1~4 — Magic Link / phonetic similarity / cookie 권위 / 별 누적)
- Sprint 3 sub-task: 7 (SP3_1, SP3_2A~E, SP3_3 — 3축 분리 / Web Audio / acousticFeatures / STT confidence / 백분위 보정 / rate limiter / OAuth)
- 보류 4건 (TEST-008 D5 / FR-C-015 D3 / INFRA-004 D7 / TEST-013 D3) 명시

## 6.6 Validation Plan (EXP-1~4)

V06 그대로 유지.

## 6.7 Contingency Plan (R6 피벗 시나리오)

V06 base + **§11 R6 Seg B Plan B** 로 link (Wiki R6-Seg-B-Plan-B 흡수).

## 6.8 ADR Reference (V06 4 ADR → V07 **16 ADR**) ⭐

본 sub-session 의 핵심 보강. Wiki `architecture-decisions` (504 lines) 흡수 + 본 sub-session ADR-16 신규.

| ADR ID | 결정 | 대안 | 사유 | 영향 | 출처 |
|:---|:---|:---|:---|:---|:---|
| **ADR-01** | Zero-touch 수집 전면 도입 | 교사 수동 녹음 | 교사 업무 가중 → B2B 100% 실패 | 엣지 VAD + 버퍼링 필수 | V05 정본 |
| **ADR-02** | HITL 비동기 감수 | AI 단독 판정 | 1건 오진 → 규제 + 맘카페 민원 | 어드민 + 큐 시스템 필수 | V05 정본 |
| **ADR-03** | 원본 음성 ≤ 7일 폐기 | 영구 보관 | 아동보호법 위반 | 벡터화 + 폐기 스크립트 | V05 정본 |
| **ADR-04** | 의료 용어 하드코딩 배제 (CON-04) | 임상 용어 노출 | DTx 인허가 회피 | 금칙어 스캐너 + QA 자동화 | V05 정본 |
| **ADR-05** ⭐ | Next.js 풀스택 모놀리스 | 백엔드 분리 (Java Spring 등) | 1인 창업 / 빠른 출시 / Vercel 통합 | App Router + Server Actions + Route Handlers | V05 신규 |
| **ADR-06** ⭐ | Supabase BaaS 통합 | RDB 자체 호스팅 | DB + Auth + Storage 일체 + Free tier | @supabase/ssr + PKCE | V05 신규 |
| **ADR-07** ⭐ | Vercel AI SDK + Gemini | OpenAI / Claude 직접 호출 | 무료 RPM 15 + 한국어 강세 | @ai-sdk/google + rate limiter | V05 신규 |
| **ADR-08** 🆕 | F9.4 무로그인 분리 | F9 (가입 후) 종속 | 영업 무기 (1,100% ROI) — 가입 마찰 회피 | Server Action `roi-simulator` + 5 신규 task | Wiki 합성 1차 |
| **ADR-09** 🆕 | F11 부모 음성 윤리 화이트리스트 | F11 자유 입력 | 부모 음성 클로닝 → 윤리적 차단 | 화이트리스트 5종 음원 + 부모 동의 + 모니터링 | Wiki 합성 1차 |
| **ADR-10** 🆕 | F16 D5 PWA 부활 의존성 | F16 미적용 | PWA 오프라인 + 푸시 알림 → 보상 소급 | D5 시드 데이터 부재로 보류 → Phase 1 부활 시 의존성 | Wiki 합성 1차 |
| **ADR-11** 🆕 | HITL 재학습 책임 분리 | 단순 누적 INSERT | 모델 편향 + 임상 안전 | 0.5% / 500건 / 0.3% 게이트 + 책임 RACI | Wiki 합성 1차 |
| **ADR-12** 🆕 | 변경 관리 3-Tier | ad-hoc 변경 | 위키 / 코드 / SRS 정합성 + 추적성 | Tier 1 Minor / Tier 2 Major / Tier 3 Strategic + CR 워크플로 | Wiki 합성 1차 |
| **ADR-13** 🆕🆕 | system_config 테이블 (env+DB 하이브리드) | env 단독 | 모든 ADR 임계값 동적 변경 + 추적 | system_config 스키마 + getCurrentPhase() + RACI | Wiki 합성 2차 |
| **ADR-14** 🆕🆕 | F15 임상 안전 게이트 | F15 즉시 적용 | 임상 자문 미완 시 위험 | KOPLAC 13 항목 + 자문 4주 + 82만 + IRB 통과 후 활성 | Wiki 합성 2차 |
| **ADR-15** 🆕🆕 | IRB 자문위원회 운영 | 자체 임상 검증 | T4-c granular consent + 외부 임상 정합 | IRB 5단계 절차 + Phase 변경 권한 | Wiki 합성 2차 |
| **ADR-16** 🆕🆕🆕 | **PIPA 5중 가드** | UI 가드 만 | UI 우회 / API 직접 호출 차단 + 컴플라이언스 binding | UI (ConsentRedirectGate) + Server Action × 4 (analyzeDiagnosis / updateChildProfile / generateCushion + 익명 가드) | **본 sub-session 신규** |

### V09 §4-3 4 모순 해결 원칙 (ADR 임상 / UX 토대)

Wiki `architecture-decisions` §V09 §4-3 4 모순 — 본 V07 의 ADR 가 다음 4 모순 해결 원칙에 정합:

1. **단순 ↔ 정확** — 5분 진단 + Confidence 70 → HITL
2. **저비용 ↔ 임상 안전** — Gemini Free + HITL 비동기 + 음성 7일 폐기
3. **무로그인 시작 ↔ B2B 영속** — F9.4 무로그인 분리 + 인증 시 익명 → 인증 migration
4. **글로벌 ↔ 한국 임상 정합** — PIPA / 의료기기법 + KOPLAC 자문

## 6.9 임상 자문 체크리스트 (V07 신규)

**다음 sub-session 에서 작성** (Wiki F15-clinical-consultation-checklist 흡수):
- KOPLAC 13 항목
- 자문 일정 4주
- 비용 82만 (3-4인 풀)
- 한국 임상 7 그룹 매트릭스

## 6.10 IRB 자문위원회 운영 (V07 신규)

**다음 sub-session 에서 작성** (Wiki ADR-15 + HITL-operations-policy 흡수):
- IRB 5단계 절차
- RACI Phase 변경 권한

## 6.11 임상 reference 매트릭스 (V07 신규)

**다음 sub-session 에서 작성** (Wiki clinical/ 30 페이지 link):

| 분류 | 페이지 수 | 본 서비스 관련도 |
|---|---|---|
| 핵심 (만 2~7세 발음) | 4 | 조음장애 / 학령전-언어평가-도구-비교 / 한국-언어치료-트랙비교 / 아동언어치료-핵심기법 |
| 확장 (Phase 1+) | 4 | 자폐-화용중재 / 단순언어장애-SLI / 다문화-언어발달 / 지적장애-언어중재 |
| 참고 (성인 / Phase 2+) | 11 | 마비말장애 / 실어증 / 유창성장애 / 음성장애 / 신경인지장애 / 인공와우 / 내러티브-담화-추론-중재 / NISE-B 학습장애검사 / 학습장애-언어재활 / 연하장애 / 음성장애 |
| 진단 도구 / 학자 entity | 40+ | K-WAB / K-ABC-II / K-BNT / K-CTONI-2 / SELSI / PRES / REVT / U-TAP / KOCS / Bloom-Lahey / Erber / Fey / ADOS-2 / AAIDD / NISE-B 등 |

---

# §7. 운영 정책 (V07 신규 — 다음 sub-session)

> **Wiki HITL-operations-policy 흡수**. Phase 별 expert 풀 정량화 + 운영비 + system_config + IRB 5단계 절차.

---

# §8. 변경 관리 프로세스 (V07 신규 — 다음 sub-session)

> **Wiki change-management-process 흡수**. 3-Tier (Minor/Major/Strategic) + CR 워크플로 7단계 + CR 템플릿 + RTM 영향 분석.

---

# §9. Glossary (V07 신규 — 다음 sub-session)

> **Wiki glossary 흡수**. 12 카테고리 (KPI / 페르소나 / 임상 / 제품 / 기술 / ADR / 영업 / 페이즈 / 프레임워크 / 도구 / 헷갈리는 약어 / raw 매핑) + 3 온보딩 순서 (개발자 / 임상가 / 영업팀).

---

# §10. F15 KOPLAC 임상 자문 체크리스트 (V07 신규 — 다음 sub-session)

> **Wiki F15-clinical-consultation-checklist 흡수**. KOPLAC 13 항목 + 한국 임상 7 그룹 매트릭스.

---

# §11. R6 Seg B Plan B (V07 신규 — 다음 sub-session)

> **Wiki R6-Seg-B-Plan-B 흡수**. F4-Plus 통합 Epic 재구성 + Lock-in #1 강화 + Plan C 이중 안전망.

---

# §12. 컴플라이언스 정책 ⭐ (V07 신규 — 본 sub-session)

## 12.1 적용 법령

| 법령 | 적용 항목 | V07 구현 |
|---|---|---|
| **개인정보 보호법 (PIPA)** §17 | 개인정보 국외 이전 동의 | §12.2 PIPA §17 흐름 |
| **PIPA §22-6** | 만 14세 미만 법정대리인 동의 | §12.3 PIPA §22-6 흐름 |
| **PIPA §30** | 개인정보 처리방침 공개 | §12.5 처리방침 (/privacy placeholder) |
| **PIPA §32** | 처리 위탁 명시 | §12.5 + §3.3 External Systems |
| **PIPA §23/24** | 민감정보 / 고유식별정보 | §12.6 (transcript 분류 — 변호사 자문 대기) |
| **의료기기법** §2 (정의) | 비의료기기 포지셔닝 | §12.7 (variable, 변호사 + 식약처 자문 대기) |
| **약관규제법** §3 | 이용약관 명시 | §12.5 이용약관 (/terms placeholder) |
| **정보통신망법** §22 | 수집·이용 동의 절차 | §12.2 + §12.3 |
| **정보통신망법** §50 | 영리 목적 광고 | §12.8 알림 선호 (Resend + cron) |

## 12.2 PIPA §17 국외 이전 동의 흐름

### 12.2.1 흐름 (인증 + 익명 통합)

```
[사용자 진단 시작 전]
  ↓
[동의 UI] — 두 가지 진입점
  ├─ 인증 user: onboarding Step2 (자녀 정보 입력과 동시) + /settings/privacy-consent (관리 페이지)
  └─ 익명 user: /diagnose 페이지 inline 체크박스 2개 (자녀 월령 입력 위에 위치)
  ↓
[체크박스 ✅] — 두 동의 모두 필수
  ├─ PIPA §22-6 만 14세 미만 자녀 개인정보 처리 부모 대리 동의
  └─ PIPA §17 국외 이전 (Google Cloud Speech 미국 + Google Gemini 미국/글로벌)
  ↓
[Server Action `savePrivacyConsent` 또는 `analyzeDiagnosis` 익명 가드]
  ├─ withActor(userId, ...) — actor_id GUC 캡처
  └─ User row UPSERT — `pipaUnderageConsentAt` + `overseasTransferConsentAt` 일시 저장 (인증 + 익명 동일 컬럼)
  ↓
[localStorage 마커] (익명 user only)
  └─ `pipa_consented_at` + `overseas_consented_at` 저장 → 재방문 자동 prefill
  ↓
[진단 시작 가능]
```

### 12.2.2 동의 항목 (UI 카피 표준)

| 항목 | 카피 |
|---|---|
| 1. **PIPA §22-6 동의** | "[필수] 만 14세 미만 자녀의 개인정보 처리에 동의합니다 (PIPA §22조 6항). 자녀 (만 2~7세) 의 발화 텍스트 (transcript), 월령, 발달 점수 등 개인정보를 Speech-Therapy 가 발달 가이드 목적으로 처리하는 데 법정대리인 (부모) 의 동의가 필요해요." |
| 2. **PIPA §17 국외 이전 동의** | "[필수] 개인정보 국외 이전에 동의합니다 (PIPA §17조). 발화 텍스트와 발달 점수가 외부 AI 서비스로 이전돼요: Google Cloud Speech (미국, 음성 → 텍스트) + Google AI Studio Gemini (미국 / 글로벌, 안내 문구 생성). 보존 기간: 각 서비스 정책에 따름. 동의 철회는 본 페이지 또는 계정 삭제로 가능." |

## 12.3 PIPA §22-6 만 14세 미만 부모 대리 동의

§12.2 와 통합 흐름 — 동의 시점에 두 동의를 함께 받음.

## 12.4 ⭐ ADR-16 — PIPA 5중 가드

V07 의 가장 강한 binding 메커니즘. UI 가드 + Server Action 가드 4중 = 총 5층.

### 12.4.1 1층 — UI 가드 (`ConsentRedirectGate`)

`components/consent/ConsentRedirectGate.tsx` — Client Component, layout 진입 시 동작.

| 미동의 인증 user 진입 시 | 결과 |
|---|---|
| `/diagnose`, `/missions`, `/reports`, `/rewards`, `/settings/*` 등 | → `/settings/privacy-consent` redirect |
| `/` (홈) | ✅ 허용 (둘러보기 출구) |
| `/privacy`, `/terms`, `/settings/account` | ✅ 허용 (정책 검토 + GDPR 잊혀질 권리) |
| `/login*`, `/signup*`, `/auth/*`, `/onboarding` | ✅ 허용 (인증 흐름) |

### 12.4.2 2층 — `analyzeDiagnosis` Server Action 가드

`app/actions/diagnosis.ts` — 진단 핵심 Server Action.

- 인증 user: `assertConsentedIfAuthenticated()` → 미동의 시 `ConsentRequiredError` throw
- 익명 user: `input.pipaUnderageConsent` + `input.overseasTransferConsent` 둘 다 `true` 검증, 미체크 시 `ConsentRequiredError` throw

### 12.4.3 3층 — `updateChildProfile` Server Action 가드

`app/actions/update-child-profile.ts` — 자녀 정보 수정.

- 인증 user: `assertConsentedIfAuthenticated()` → graceful 분기 (`reason: "consent_required"` 반환)

### 12.4.4 4층 — `generateCushion` Server Action 가드

`app/actions/cushion.ts` — Gemini 호출 (국외 이전).

- 인증 user: `assertConsentedIfAuthenticated()` → graceful fallback (Gemini 미호출, `SAFE_CUSHION_FALLBACK` 반환)

### 12.4.5 5층 — 익명 user `analyzeDiagnosis` 의 boolean 가드

`app/actions/diagnosis.ts` 의 익명 분기:

```typescript
if (!input.userId) {  // 익명 user
  if (!input.pipaUnderageConsent || !input.overseasTransferConsent) {
    throw new ConsentRequiredError();
  }
}
```

### 12.4.6 가드 매트릭스

| Server Action | 인증 user | 익명 user |
|---|---|---|
| `analyzeDiagnosis` | ✅ (2층) | ✅ (5층) |
| `updateChildProfile` | ✅ (3층) | N/A (admin 외 차단) |
| `generateCushion` | ✅ (4층, graceful) | ⬜ (별도 PR 검토) |
| `saveChildInfo` | ❌ (의도 — onboarding 동의 _직전_ 호출) | ❌ (의도) |
| `grantReward` | ❌ (analyzeDiagnosis 후속, 자연 차단) | ❌ (자연) |
| `submitConsentSignature` | ❌ (의도 — 동의 흐름 자체) | N/A |

## 12.5 처리방침 + 이용약관 (placeholder, 변호사 자문 후 정식 교체)

| 페이지 | 골격 | 비고 |
|---|---|---|
| `/privacy` ([app/(public)/privacy/page.tsx](../app/(public)/privacy/page.tsx)) | 9 섹션 (수집 항목 / 목적 / 만 14세 미만 / 보유 기간 / 처리위탁 / 국외 이전 / 권리 / 책임자 / 이력) | PIPA §30 골격, 변호사 자문 (C1) 후 정식 교체 예정 |
| `/terms` ([app/(public)/terms/page.tsx](../app/(public)/terms/page.tsx)) | 8 조 (목적 / 비의료기기 정의 / 14세 미만 동의 / 국외 이전 / 회원 의무 / 중단 / 책임 한계 / 약관 변경) | 약관규제법 §3 골격 |

## 12.6 transcript 의 PIPA 민감정보 분류 (자문 대기)

자녀 발화 transcript (Web Speech API 결과 텍스트) — `SessionLog` + `EvaluationResult.transcript` 에 저장.

**자문 항목** (`compliance-lawyer-consultation-brief.md` §4.6):
- PIPA §23 민감정보 (사상·신념·노조·정치적 견해·건강·성생활 정보) 또는 §24 고유식별정보 (주민등록번호 등) 해당 여부
- 발화 우발적 PII 포함 시 책임 분배
- PII 마스킹 (lib/ai/pii-mask.ts) 의 7 패턴 외 추가 패턴 필요 여부

## 12.7 의료기기법 분류 (자문 대기)

| 표현 위치 | 카피 | 정합성 |
|---|---|---|
| `MedicalDisclaimerFooter` (전역) | "⚠️ 본 서비스는 의료기기가 아닙니다. ... 의학적 평가가 아닌 발달 안내" | ✅ CON-04 + ADR-04 정합 |
| AGENTS.md §2.1 의 금칙어 | "치료" / "진단" / "장애" / "환자" / "병" / "증상" / "처방" / "병원" / "아프" / "문제아" 사용 금지 | ✅ pre-commit + eslint + 본 sub-session E2E 검증 (consent-flow 20/20 PASS) |
| diagnose result 페이지 disclaimer 3중 | "본 결과는 의료적 평가가 아닌 발달 참고 자료" + "참고: 같은 월령대 데이터와 비교한 결과입니다. 의료적 평가가 아닙니다." + 하단 disclaimer | ✅ |

**자문 항목** (`compliance-lawyer-consultation-brief.md` §4.3):
- 식약처 "건강관리용 소프트웨어 가이드라인" (2022 이후) 본 서비스 적용 여부
- 식약처 사전 검토 신청 필요 여부
- "발달 가이드용 보조 도구" / "발음 발달 확인" / "또래 비교" 표현 시정 명령 risk

## 12.8 정보통신망법 §50 영리 광고

| 자동 발송 | 옵트인 | 사용자 측 차단 |
|---|---|---|
| weekly-report 이메일 (Cron) | `User.notificationPreference.weeklyReportEmail = true` 시만 발송 | `/settings/notifications` 에서 토글 |
| consent-reminder 이메일 (Cron, B2B) | `User.notificationPreference.consentReminderEmail = true` | 동일 |
| parent-invite 이메일 (Cron, B2B) | `User.notificationPreference.parentInviteEmail = true` | 동일 |
| cushion-note 이메일 (Cron, B2B) | `User.notificationPreference.cushionNoteEmail = true` | 동일 |

→ 모든 자동 발송은 사용자 측 명시 옵트인 후만. 트랜잭션성 (비밀번호 reset / 계정 변경 등) 은 본 정책 무관 — 항상 발송.

## 12.9 운영 SQL — DB 컬럼 + TRIGGER

본 sub-session 의 운영 적용 결과:

| Migration | 적용 | 산출 |
|---|---|---|
| `20260527140000_add_user_pipa_consent_columns` | ✅ Supabase Studio SQL | User.pipaUnderageConsentAt + overseasTransferConsentAt |
| `20260522210000_audit_log_triggers` | ✅ Supabase Studio SQL | 3 TRIGGER (audit_user_changes / audit_hitl_changes / audit_reward_log_inserts) + 2 함수 (audit_trigger_fn / audit_sanitize_jsonb) |

## 12.10 자문 자료 (외부 의뢰)

| 자료 | 활용 |
|---|---|
| [`docs/compliance-lawyer-consultation-brief.md`](compliance-lawyer-consultation-brief.md) (275 lines, 7 섹션) | 변호사 자문 의뢰 (Grill #3A 트랙 C1) — 30~50만원, 2~4주 |

## 12.11 출시 직전 체크리스트 (V07 컴플라이언스 정합성)

- [x] PIPA §22-6 14세 미만 부모 대리 동의 — 인증 user (`f976388`) + 익명 user (`f9cf258`)
- [x] PIPA §17 국외 이전 동의 — 인증 + 익명 user 모두
- [x] Gemini transcript PII 마스킹 (`6f2e287`)
- [x] 의료기기법 disclaimer footer (`d05fb51`)
- [x] PIPA 5중 가드 (`d05fb51` UI + `a6378b9` Server Action 2층 + `41f431e` 가드 확장 3+4층 + `f9cf258` 익명 5층)
- [x] CON-04 의료 금칙어 무위반 (`4f4c845` 의 result 페이지 "진단" → "발음 확인" fix)
- [x] /privacy + /terms placeholder (`f976388`)
- [x] DB migration prod 적용 (PIPA 컬럼 + AuditLog TRIGGER)
- [x] E2E Playwright 검증 (consent-flow 20/20 PASS, desktop + mobile)
- [ ] **변호사 자문 결과 반영** (C1, 사용자 측 의뢰 시점)
- [ ] **식약처 사전 검토 신청** (C2, 사용자 측, 후순위)
- [ ] **/privacy 정식 교체** (변호사 자문 후)
- [ ] **/terms 정식 교체** (변호사 자문 후)

---

# 문서 요약 통계 (V07 1차 draft)

| 구분 | V06 | V07 (목표) | V07 (본 sub-session 1차) |
|:---|:---:|:---:|:---:|
| Functional Requirements (REQ-FUNC) | 65 | 78 | 65 (V06 그대로, +13 다음 sub-session) |
| HITL Cross-cutting (REQ-FUNC-HITL) | 4 | 7 | 4 (V06 그대로, +3 다음 sub-session) |
| Non-Functional Requirements (REQ-NF) | 30 | 35 | **35** (+5 본 sub-session §12) |
| **총 Requirements** | **99** | **~120** | **~104** (+5) |
| 시퀀스 다이어그램 | 5 | 6 | 5 (V06 그대로, +1 PIPA 동의 다음 sub-session) |
| 구조 다이어그램 | 5 | 5+ | 5 (V06 그대로) |
| Entity | 7 | 14+ | 7 (V06 그대로, 다음 sub-session 보강) |
| API Endpoint | 8 | 11+ | 8 (V06 그대로, 다음 sub-session 보강) |
| 실험 설계 (EXP) | 4 | 4 | 4 (V06 그대로) |
| **ADR** | **4** | **16** | **16** ⭐ (+12 본 sub-session §6.8) |

---

**— End of SRS V07 1차 draft (§0 + §6.8 + §12 + 골격), 2026-05-27 —**
**— 다음 sub-session: §1 References / §3.5 API / §3.6 Sequence / §4 REQ / §5 HITL / §6 ERD / §6.5 Timeline / §6.9~6.11 임상 / §7-11 운영 / 변경 관리 / Glossary / F15 / R6 —**
