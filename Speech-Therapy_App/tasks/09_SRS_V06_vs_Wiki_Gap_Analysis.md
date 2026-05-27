# SRS V06 vs Wiki 지식 베이스 — Gap Analysis 보고서

> **목적**: SRS V07 보강 작업 진입 전 발견 + 진단. V06 base 위에 추가해야 할 항목 우선순위 식별.
> **작성일**: 2026-05-27 (본 sub-session §20, 28+ commits 완료 시점)
> **base**: `docs/64_SRS_V05_Merged_Master_Final.md` (실 = V06, 919 lines)
> **wiki**: `Speech-Therapy_Workbase/wiki/` (54차 ingest, 112 페이지)
> **다음 단계**: 본 보고서 기반 V07 본문 작성 (Phase 1, 2~3h) 또는 별도 sub-session

---

## §1. V06 본문 현재 구조 (정량)

| § | 영역 | line | 비고 |
|---|---|---|---|
| 1 | Introduction (Purpose / Scope / Definitions / References / Constraints) | 1-114 | ADR-01~04 명시 |
| 2 | Stakeholders (DMU + Persona) | 115-143 | |
| 3 | System Context (Use Case + Component + External Systems + API + Sequence) | 144-335 | 5 시퀀스 다이어그램 |
| 4 | Specific Requirements (FUNC + NF + HITL Cross-cutting) | 336-593 | **99 REQ** (65 FUNC + 4 HITL + 30 NF) |
| 5 | Traceability Matrix | 594-657 | |
| 6 | Appendix (ERD / Class / Data Dictionary / Sequence / Timeline / Validation Plan / Contingency / ADR Reference) | 658-901 | **4 ADR** + 7 Entity + 8 API |
| - | 문서 요약 통계 | 902-919 | |

**총 산출물**: 99 REQ + 4 ADR + 7 Entity + 8 API + 5 시퀀스 다이어그램 + 4 EXP (실험 설계)

---

## §2. Wiki 지식 자산 인벤토리 (V06 이후 축적)

### 2.1 `wiki/product/concepts/` 핵심 페이지 (총 28 페이지)

| 페이지 | line | V07 활용도 |
|---|---|---|
| `architecture-decisions` | 504 | ⭐⭐ **15 ADR 정본** (V06 의 4 → 15) |
| `requirements-traceability-matrix` | 174 | ⭐⭐ **RTM 정본** (5축 추적성 100%) |
| `MVP-feature-spec` | (대형) | ⭐⭐ **21 Epic + 4 Phase + 7 KPI + 4 Extremes 정본** |
| `Phase-1-future-tasks-decomposition` | 251 | ⭐ Phase 1+ **13 신규 task / 21 SP** (88 → 108 후보) |
| `HITL-system-flow` | 290 | ⭐ HITL **9 단계 흐름** |
| `HITL-retraining-pipeline` | 404 | ⭐ 재학습 **0.5%/500건/0.3% 게이트** + 3 신규 task |
| `HITL-operations-policy` | 792 | ⭐ Phase 별 **expert 풀 정량화** + 운영비 + getCurrentPhase() |
| `expert-diversity-monitoring` | 548 | ⭐ HITL 다양성 (**HHI + Gini** 이중 모니터링) |
| `F9.4-ROI-simulator` | 239 | ⭐ VPS V08 신규 영업 무기 (**1,100% ROI**) |
| `F10-research-consent` | 294 | ⭐ **T1-T4 4-Tier 동의** + DB-010 보강 |
| `F15-clinical-consultation-checklist` | 337 | ⭐ KOPLAC **13 항목** + 자문 4주 + 82만 |
| `R6-Seg-B-Plan-B` | 412 | ⭐ Seg B Plan B (**F4-Plus 통합 Epic** 재구성) |
| `change-management-process` | 188 | ⭐ **3-Tier CR** + 7 단계 + 템플릿 |
| `glossary` | 256 | ⭐ **12 카테고리** + 3 온보딩 순서 |
| `SRS-evolution` | 141 | V01→V06 진화 + 학습 포인트 |
| `tech-architecture` | (대형) | C-TEC-001~007 + 운영비 $30/월 |
| `competitive-landscape` | (대형) | 8 경쟁사 4 카테고리 + 화이트스페이스 |
| `customer-segmentation` | (대형) | TAM 72-96만 + SAM 17-25만 + SOM 5-12.5K + 4 Phase |
| `customer-journey` | (대형) | Core 5 페르소나 5단계 여정 |
| `jtbd-insights` | (대형) | JTBD 4 발견 + MVP 5대 우선순위 |
| `opportunity-quadrants` | (대형) | AOS-DOS 4사분면 + 황금 교차점 4명 |
| `Key-Success-Factors` | (대형) | Top 5 KSF |
| 외 6 페이지 (Porter / Value-Chain / PRD-evolution / VPS-evolution / problem-definition / multi-llm-workflow) | | |

### 2.2 `wiki/clinical/` (총 60+ 페이지)

| 분류 | 페이지 수 | 본 서비스 관련도 |
|---|---|---|
| `concepts/` (임상 개념) | 19 | 🔴 핵심 4: 조음장애 / 학령전 언어평가 / 한국 트랙 / 아동언어치료 핵심기법 |
|  |  | 🟠 확장 4: 자폐-화용 / 단순언어장애 (SLI) / 다문화 / 지적장애 |
|  |  | 🟡 참고 11: 마비말 / 실어증 / 유창성 / 음성 / 신경인지 / 인공와우 / 내러티브 / NISE-B / 학습장애 / 연하 / 학습장애-언어재활 |
| `entities/` (진단 도구 + 학자) | 40+ | K-WAB / K-ABC-II / K-BNT / K-CTONI-2 / SELSI / PRES / REVT / U-TAP / KOCS / Bloom-Lahey / Erber / Fey / ADOS-2 / AAIDD / NISE-B 등 |

---

## §3. Critical Gaps — V06 ↔ Wiki / 실 구현 / 본 sub-session 결과

### 3.1 🔴 ADR Gap — V06 4건 vs Wiki 15건 (+11)

| V06 | Wiki | 비고 |
|---|---|---|
| ADR-01 Zero-touch | ✅ | 동일 |
| ADR-02 HITL 비동기 | ✅ | 동일 |
| ADR-03 원본 음성 7일 폐기 | ✅ | 동일 |
| ADR-04 의료 용어 배제 | ✅ | 동일 |
| — | **ADR-05 Next.js 모놀리스** | V05 신규 — V06 의 기술 스택 전환이지만 ADR 표 미반영 |
| — | **ADR-06 Supabase BaaS** | V05 신규 — V06 미반영 |
| — | **ADR-07 Vercel AI SDK + Gemini** | V05 신규 — V06 미반영 |
| — | 🆕 ADR-08 F9.4 무로그인 분리 | Wiki 합성 1차 |
| — | 🆕 ADR-09 F11 부모 음성 윤리 화이트리스트 | Wiki 합성 1차 |
| — | 🆕 ADR-10 F16 D5 PWA 부활 의존성 | Wiki 합성 1차 |
| — | 🆕 ADR-11 HITL 재학습 책임 분리 | Wiki 합성 1차 |
| — | 🆕 ADR-12 변경 관리 3-Tier | Wiki 합성 1차 |
| — | 🆕🆕 ADR-13 system_config (env+DB 하이브리드) | Wiki 합성 2차 |
| — | 🆕🆕 ADR-14 F15 임상 안전 게이트 | Wiki 합성 2차 |
| — | 🆕🆕 ADR-15 IRB 자문위원회 운영 | Wiki 합성 2차 |
| — | V09 §4-3 **4 모순 해결 원칙** | ADR 의 임상 / UX 토대 |
| **V07 신규 후보** | 🆕🆕🆕 **ADR-16 PIPA 컴플라이언스 5중 가드** | 본 sub-session 결과 |

→ **V06 → V07 보강 시 ADR 4 → 16+** (11~12 추가).

### 3.2 🔴 REQ 수 Gap — V06 99건 vs 보강 후 ~120건 (+21)

| 분류 | V06 | 보강 | 출처 |
|---|---|---|---|
| REQ-FUNC (Phase 0 MVP) | 26 | 26 | 변화 없음 |
| REQ-FUNC (Phase 1 리텐션) | 23 | **23 + 13 = 36** | Phase-1-future-tasks-decomposition (F11/F15/F16/F17/F18 신규 13) |
| REQ-FUNC (Phase 2 B2B) | 16 | 16 | 변화 없음 |
| REQ-FUNC-HITL (Cross-cutting) | 4 | **4 + 3 = 7** | HITL-retraining-pipeline (재학습 3 신규 task) |
| REQ-NF | 30 | **30 + 5 = 35** | 본 sub-session: PIPA §22-6 / §17 / Gemini PII 마스킹 / 의료기기법 footer / 5중 가드 |
| **합계** | **99** | **~120** | (+21) |

### 3.3 🟠 HITL 정책 Gap — V06 §4.1 Cross-cutting (4 원칙) vs Wiki 4 페이지 (2034 lines)

| V06 (§4.1 + §3.6.2) | Wiki 4 페이지 |
|---|---|
| HITL 4 원칙 (인적 검토 의무 / 비동기 / 분산 / 추적성) | ✅ HITL-system-flow 의 4 원칙 포함 |
| HITL 시퀀스 (1 다이어그램) | + **9 단계 흐름** (AI 1차 → API-005 큐 → API-006 Studio → PostgreSQL 트리거 → Resend → Cron 24h/48h → 어뷰징 방어 → 루프백) |
| — | 🆕 **재학습 0.5%/500건/0.3% 게이트** + model_retraining_data 스키마 + sync_retraining_data 트리거 |
| — | 🆕 **Phase 별 expert 풀 정량화** (3-5/5-10/15-25명 + 1급/2급 비율 + 운영비) |
| — | 🆕 **expertId 다양성 모니터링** (HHI + Gini 이중) + 위반 대응 시나리오 3종 |
| — | 🆕 RACI Phase 변경 권한 + IRB 5단계 절차 |

→ **V07 §5 HITL 완전 재작성 필요** (V06 의 §3.6.2 + §4.1 Cross-cutting 통합 + Wiki 4 페이지 흡수).

### 3.4 🟠 DB 스키마 Gap — V06 7 Entity vs 실 Prisma 14+ models

| V06 ERD | 실 Prisma schema |
|---|---|
| users / session_logs / evaluation_results / mission_cards / reward_progress / weekly_reports / hitl_queue (7) | + Institution / Class (DB-003 B2B) |
|  | + RewardLog (DB-008b 멱등성) |
|  | + ConsentSignature (DB-010 B2B 전자서명) |
|  | + OfflineEntry (FR-Q-013 후속) |
|  | + AuditLog (DB-011 + audit_log_triggers) |
|  | + User.totpBackupCodes / preferredPhonemes / notificationPreference / onboardingCompletedAt / **pipaUnderageConsentAt / overseasTransferConsentAt** |
|  | + EvaluationResult.acousticFeatures (JSONB) + HITLQueue 보강 컬럼 (manual escalate / expert review) + WeeklyReport.viewedAt |

→ **V07 §6.1 ERD 14+ Entity 갱신** + AuditLog TRIGGER + PIPA 동의 컬럼 명시.

### 3.5 🟠 API 계약 Gap — V06 8 endpoints vs 실 11+ API + 14+ Server Actions + 8 cron

| V06 (§3.5 API Overview) | 실 구현 |
|---|---|
| 8 endpoints (analyzeDiagnosis / getCurriculum / getWeeklyReport / grantReward / /api/hitl/queue / /api/hitl/comment / /api/b2b/approval / /api/audio/stream) | + Server Actions: savePrivacyConsent / saveChildInfo / updateChildProfile / generateCushion / generateCushionNote / submitConsentSignature / submitBulkImport / submitOfflineEntry / markOnboardingCompletedInDb / mark-onboarding-completed-shape + 외 8+ |
|  | + Route Handlers: /api/consent/sign / /api/audio/stream + Cron 8종 |
|  | + Auth: /login / /signup / /auth/callback |
|  | + Admin: /admin/audit / /admin/teacher / /admin/hitl / /admin/students/import |

→ **V07 §3.5 API Overview 갱신** — Server Action + Route Handler + Auth + Admin 분리 명시.

### 3.6 🔴 컴플라이언스 Gap — V06 §4.2 보안 vs 본 sub-session 결과

| V06 (§4.2 Non-Functional 보안) | 본 sub-session 보강 |
|---|---|
| ADR-03 7일 폐기 + ADR-04 의료 용어 배제 | + **PIPA §22-6 만 14세 미만 부모 대리 동의** (인증 + 익명 user 양쪽) |
| | + **PIPA §17 국외 이전 동의** (STT + Gemini 통합) |
| | + **Gemini transcript PII 마스킹** (한국 PIPA 7 패턴: 주민등록번호 / 신용카드 / 이메일 / 전화번호 / URL / IPv4 / 한국식 상세 주소) |
| | + **의료기기법 disclaimer footer** (전역) |
| | + **5중 가드** (UI ConsentRedirectGate + Server Action assertConsentedIfAuthenticated × 4: analyzeDiagnosis / updateChildProfile / generateCushion + 익명 가드) |
| | + **AuditLog PostgreSQL TRIGGER** (자동 capture) + actor_id GUC + R4 sanitize |
| | + 변호사 자문 자료 (`docs/compliance-lawyer-consultation-brief.md`) |

→ **V07 §4.2 보안 / §12 컴플라이언스 신규 추가**.

### 3.7 🟠 임상 reference Gap — V06 미명시 vs Wiki 30 임상 페이지

V06 에는 임상 reference 자료 list 미포함. F15 임상 자문 + IRB 정책 도 미명시.

| 영역 | V07 추가 후보 |
|---|---|
| §1.4 References 확장 | + wiki/clinical/concepts/조음장애 / 학령전-언어평가-도구-비교 / 한국-언어치료-트랙비교 / 아동언어치료-핵심기법 |
| | + wiki/clinical/entities/SELSI / PRES / REVT / U-TAP / K-CTONI-2 / KOCS / NISE-B |
| §6 Appendix 신규 | + **§6.9 임상 자문 체크리스트** (F15 KOPLAC 13 항목) |
| | + **§6.10 IRB 자문위원회 운영** (Phase 1+ ADR-15) |
| | + **§6.11 임상 reference 매트릭스** (30 wiki 페이지 link) |

### 3.8 🟡 운영 / 변경 관리 Gap — V06 미포함

| V06 미포함 | Wiki 정본 |
|---|---|
| 변경 관리 프로세스 | change-management-process (3-Tier + CR 워크플로 7단계 + 템플릿) |
| Glossary | glossary (12 카테고리 + 3 온보딩 순서) |
| F9.4 ROI 시뮬레이터 | F9.4-ROI-simulator (1,100% ROI 산식 + UI 3-Step) |
| Phase 별 expert 풀 정량화 | HITL-operations-policy |
| system_config 테이블 | ADR-13 + HITL-retraining-pipeline |
| F10 4-Tier 동의 (T1-T4 + a/b/c) | F10-research-consent |
| R6 Seg B Plan B (F4-Plus 통합) | R6-Seg-B-Plan-B |

→ **V07 §10 운영 정책 신규 + §11 F15 KOPLAC + Glossary 추가**.

### 3.9 🟢 Sprint 진척 Gap — V06 88 Task (추정) vs 실 100% 완료

| V06 / RTM | 실 Project #8 상태 |
|---|---|
| 88 Task (P0/P1/P2 합산) | + 14 Sprint sub-task (tasks/03 §10) |
| Phase 0 / Phase 1 / Phase 2 매핑 | + 5 Phase Gantt (tasks/08) + 5 트랙 의존성 |
| Sprint sub-task 미반영 | + Project #8 14 items Done sync (P1 8 + P2 6) — **MVP 코드 100% 완료** |
| | + 본 sub-session 28 commits — A1~A5 + E2E |

→ **V07 §6.5 Implementation Timeline 의 Sprint sub-task 14 통합** + 보류 4건 (TEST-008 D5 / FR-C-015 D3 / INFRA-004 D7 / TEST-013 D3) 명시.

---

## §4. V07 보강 우선순위 (Action Items)

### 4.1 🔴 critical (출시 / 컴플라이언스 / 진척 정합성)

| # | 항목 | 출처 | 분량 |
|---|---|---|---|
| 1 | **ADR 4 → 16** (V05 ADR-05/06/07 + Wiki 합성 ADR-08~15 + **본 sub-session ADR-16 PIPA 5중 가드**) | wiki architecture-decisions + 본 sub-session | 1~2h |
| 2 | **REQ 99 → ~120** (Phase 1+ 13 신규 task + 본 sub-session 5 신규 NF) | wiki Phase-1-future + 본 sub-session | 1~2h |
| 3 | **컴플라이언스 §12 신규** — PIPA §22-6/§17/PII/disclaimer/5중 가드 + 변호사 자문 자료 | 본 sub-session + compliance-lawyer-consultation-brief.md | 1h |
| 4 | **DB §6.1 ERD 14+ Entity** (Institution / ConsentSignature / OfflineEntry / AuditLog / RewardLog + 신규 컬럼) | 실 Prisma schema | 1h |
| 5 | **HITL §5 완전 재작성** (V06 §3.6.2 + §4.1 통합 + Wiki 4 페이지 흡수) | wiki HITL-* 4 페이지 | 2h |

### 4.2 🟠 high (운영 / 진척)

| # | 항목 | 출처 | 분량 |
|---|---|---|---|
| 6 | **API §3.5 갱신** — Server Action + Route Handler + Cron 명시 | 실 구현 | 30분 |
| 7 | **Sprint Timeline §6.5 갱신** — 14 sub-task + 보류 4건 | tasks/03 §10 + Project #8 | 30분 |
| 8 | **임상 reference §1.4 + §6.11 신규** — 30 wiki 페이지 link | wiki clinical/* | 1h |
| 9 | **§10 변경 관리** + **§11 F15 임상 자문** + Glossary 통합 | wiki change-management + F15 + glossary | 1~2h |

### 4.3 🟡 medium (보강)

| # | 항목 | 출처 | 분량 |
|---|---|---|---|
| 10 | **F9.4 ROI 시뮬레이터** | wiki F9.4-ROI-simulator | 30분 |
| 11 | **F10 4-Tier 연구 동의** | wiki F10-research-consent | 30분 |
| 12 | **R6 Seg B Plan B** | wiki R6-Seg-B-Plan-B | 30분 |
| 13 | 본 sub-session 의 28 commits 결과 → V07 의 §0 Revision History 통합 | git log | 15분 |

### 4.4 ⚪ low (참고)

| # | 항목 |
|---|---|
| 14 | tech-architecture / customer-segmentation / customer-journey / jtbd-insights / Porter / Value-Chain — V07 본문 보다 별도 reference link 권장 |

---

## §5. 산출물 형식 권장

### 5.1 옵션 A — V06 직접 갱신 (in-place edit)

- `docs/64_SRS_V05_Merged_Master_Final.md` 의 919 lines 위에 추가 / 수정
- 장점: 단일 파일 유지
- 단점: 변경 이력 추적 어려움

### 5.2 옵션 B — V07 새 파일 작성 (**권장**)

- `docs/65_SRS_V07_Merged_Master_Final.md` 또는 `docs/SRS_V07.md` 신규
- V06 base + §0 Revision History (V06 → V07 변경) + 각 § 보강
- 장점: V06 보존 + 진화 추적 + clear baseline
- 단점: 약 1500+ lines 예상 (대형 doc)

### 5.3 옵션 C — V07 분리 doc set (대형 시)

- `docs/SRS_V07_Main.md` (골격 + §1-5)
- `docs/SRS_V07_Compliance.md` (§12 신규)
- `docs/SRS_V07_HITL_Policy.md` (§5 완전)
- `docs/SRS_V07_Appendix.md` (§6 + 임상 reference)
- 장점: 각 doc 작성 / 검토 / 유지 보수 용이
- 단점: 통합 reading 시 multiple file

→ **권장: 옵션 B** (V07 단일 파일, ~1500 lines, V06 진화 추적 가능).

---

## §6. 분량 추정 (V07 본문 작성 시)

| Phase | 범위 | 시간 |
|---|---|---|
| 1 | V07 골격 (목차 + 변경 이력 §0 + 1-5 § 보강 plan) | 1~2h |
| 2 | §4 Specific Requirements 갱신 (99 → ~120 REQ) | 2h |
| 3 | §5 HITL 완전 재작성 (Wiki 4 페이지 흡수) | 2h |
| 4 | §6 Appendix 보강 (ERD 14+ Entity + API + Sprint Timeline + 임상 reference) | 2h |
| 5 | §10 / §11 / §12 신규 (변경 관리 + F15 + 컴플라이언스) | 2h |
| 6 | §0 Revision History + cross-link 정합성 검증 | 1h |
| **합계** | | **10~12h** (별도 sub-session 2~3회 분량) |

---

## §7. 다음 단계 선택지

| 옵션 | 범위 | 시간 |
|---|---|---|
| 🟢 **A** | **본 보고서 검토 + V07 골격 설계만 작성** (목차 + Revision History §0) | 1~2h |
| 🟡 **B** | **A + 가장 critical §12 컴플라이언스 신규 섹션 작성** | 3~4h |
| 🔴 **C** | **V07 전체 본문 작성** | 10~12h (2~3 sub-session) |
| ⚪ **D** | **본 보고서만 commit + push, V07 본문은 별도 sub-session** | 본 commit 만 |

---

## §8. 참고 자료 (V07 작성 시 직접 link)

### 8.1 V06 base
- [`docs/64_SRS_V05_Merged_Master_Final.md`](../docs/64_SRS_V05_Merged_Master_Final.md)

### 8.2 Wiki product/concepts (V07 흡수 대상)
- `Speech-Therapy_Workbase/wiki/product/concepts/architecture-decisions.md`
- `Speech-Therapy_Workbase/wiki/product/concepts/requirements-traceability-matrix.md`
- `Speech-Therapy_Workbase/wiki/product/concepts/MVP-feature-spec.md`
- `Speech-Therapy_Workbase/wiki/product/concepts/Phase-1-future-tasks-decomposition.md`
- `Speech-Therapy_Workbase/wiki/product/concepts/HITL-system-flow.md` + `HITL-retraining-pipeline.md` + `HITL-operations-policy.md` + `expert-diversity-monitoring.md`
- `Speech-Therapy_Workbase/wiki/product/concepts/F9.4-ROI-simulator.md` + `F10-research-consent.md` + `F15-clinical-consultation-checklist.md` + `R6-Seg-B-Plan-B.md`
- `Speech-Therapy_Workbase/wiki/product/concepts/change-management-process.md` + `glossary.md`
- `Speech-Therapy_Workbase/wiki/product/concepts/SRS-evolution.md`

### 8.3 Wiki clinical/ (V07 §1.4 + §6.11 reference)
- `Speech-Therapy_Workbase/wiki/clinical/concepts/` (19 페이지)
- `Speech-Therapy_Workbase/wiki/clinical/entities/` (40+ 페이지)
- `Speech-Therapy_Workbase/wiki/clinical/log.md` + `README.md` + `index.md`

### 8.4 본 sub-session 자산 (V07 §12 컴플라이언스 + §0 Revision History)
- [`docs/compliance-lawyer-consultation-brief.md`](../docs/compliance-lawyer-consultation-brief.md)
- [`tasks/03_Tasks_Breakdown_SRS_reinforce.md`](03_Tasks_Breakdown_SRS_reinforce.md) (§10 Sprint sub-task)
- [`tasks/08_Project_Gantt_Chart_병렬_트랙.md`](08_Project_Gantt_Chart_병렬_트랙.md)
- `memory/project_compliance_grill_3a.md`
- `Prompt/대화기록_2026-05-27.md` (28 commits 종합)
- 실 Prisma schema: [`prisma/schema.prisma`](../prisma/schema.prisma)

---

**— End of SRS V06 ↔ Wiki Gap Analysis, 2026-05-27 —**
