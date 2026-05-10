---
type: index
updated: 2026-05-10
---

# Wiki Index

Speech-Therapy 지식베이스의 전체 페이지 카탈로그. **두 기둥(Product / Clinical) 하이브리드** 구조이며, 새 질문에 답할 때는 양쪽 모두에서 후보 페이지를 찾습니다. 자료 수집(ingest) 시마다 Claude가 갱신합니다.

> 마지막 갱신: **2026-05-10** (54차 ingest: **raw/assets/언어치료 자료/ 폴더 batch ingest** — 약 180개 임상 자료 (PDF 120 + AVI 51 + HWP 11 + PPTX 1 + ZIP 2). **종합 인벤토리 source 1 신규** + **신규 clinical concepts 8개** (유창성장애·음성장애·학습장애-언어재활·단순언어장애-SLI·다문화-언어발달·지적장애-언어중재·신경인지장애-노인의사소통·내러티브-담화-추론-중재) + **신규 entity 1개** (KOCS) + 기존 concepts **6개 보강** (조음장애·자폐-화용중재·언어발달지연·마비말장애·실어증·인공와우-청능재활). clinical 20 → **30 페이지** / 전체 102 → **112**. 후속 ingest 우선순위: 자폐-화용중재 (18편 신규 풀) + 지적장애-언어중재 (25편) + 내러티브-담화-추론-중재 (35+편).)
> 이전 갱신: **2026-05-09** (53차 ingest: 신규 raw 7 임상 자료 (231KB) 통합 정독 — SELSI/PRES/REVT/U-TAP 4 entity 본문 보강 + 언어발달지연·아동언어치료-핵심기법 2 concept 보강 + 학령전 4도구 비교·NISE-B·ACT 2 신규 concept + 통합 source 1 신규.)

---

## ── Pillar A · Product ──

### product/concepts — 프레임워크 · 제품 결정 · 종합 분석

| 페이지 | 카테고리 | 한 줄 요약 |
|---|---|---|
| [[product/concepts/Porter-5-Forces-Analysis]] | framework | Porter's 5F + Unit Economics 정량 보강. 산업 매력도 = 조건부 Medium-High (LTV:CAC 9.0x, M3≥40%, 1:200 커버리지 조건) |
| [[product/concepts/Value-Chain-Analysis]] | framework | 5경쟁사를 3유형(진단게이트키퍼·풀스택O2O·AI자가학습)으로 분류, 진입 포지션 = 진단-교육 브릿지 |
| [[product/concepts/Key-Success-Factors]] | synthesis | Top 5 KSF (진단-교육 퍼널 / 효과 검증 / 비동기 코칭 / 발달 리포트 / 비의료 카테고리). 순차적 의존 관계 |
| [[product/concepts/competitive-landscape]] | synthesis | 8경쟁사 4카테고리 + 포지셔닝맵 + 화이트스페이스 18-24개월 골든타임 |
| [[product/concepts/problem-definition]] | product_decision | **통합 v1.0**. 회색지대 부모 30-50만 / 1뿌리 3가지(진단·방법·효과) / "홈 랭귀지 코칭" 카테고리 / Phase 0-3 로드맵 |
| [[product/concepts/customer-segmentation]] | synthesis | TAM 72-96만 / SAM 17-25만 / SOM 5-12.5K. 4세그먼트(A·B·C·D) + 13페르소나 + 9 설계 시사점 + 4 Phase |
| [[product/concepts/customer-journey]] | synthesis | Core 5 페르소나 5단계 여정. 11개 핵심 UX·기능 요구 + 단계별 KPI |
| [[product/concepts/jtbd-insights]] | synthesis | JTBD 4 핵심 발견(방법론=구매·공유=리텐션·센터+앱·Non-user 외부충격) + AOS-DOS + **MVP 5대 우선순위** + ✅ Go |
| [[product/concepts/opportunity-quadrants]] | synthesis | AOS-DOS 4사분면 + Pain 4 클러스터 + **황금 교차점 4명** (Phase 0 파일럿 타깃) + 사분면별 전략 |
| [[product/concepts/MVP-feature-spec]] | synthesis | **MVP 정본** — 21 Epic + 4 Phase + 7 KPI + 4 Extremes + 4중 Lock-in + HITL + UX 4 모순 해결 + 230 SP |
| [[product/concepts/VPS-evolution]] | timeline | VPS V01→V09 진화 9 버전. V09 = PRD V10 직접 기반 (B2B2C DMU 5분리 + 21 Sub-feature) |
| [[product/concepts/PRD-evolution]] | timeline | PRD V01→V10 진화 10 버전. V10 = SRS Readiness Gate 100% 달성 Golden Master (멀티 LLM 작성 + 4개 Quality Gate) |
| [[product/concepts/SRS-evolution]] | timeline | SRS V01→V06 진화 6 버전. **Opus + Gemini 병렬 → V05 Merged → V06 Next.js Full-stack 기술 전환**. PRD↔SRS 매핑 9 항목 PASS |
| [[product/concepts/tech-architecture]] | framework | **Tech Architecture 정본** — C-TEC-001~007 + Next.js + Vercel + Supabase + Gemini + PWA. 4 Layer Component + 9 API + 운영비 $30/월 |
| [[product/concepts/MVP-descope-plan]] | product_decision | **바이브 코딩 1주차 Action Item** — 텍스트 모드 → 음성 → 카톡/키즈노트 우회. R5 회피 메커니즘 |
| [[product/concepts/task-breakdown-overview]] | synthesis | ⭐ **21 Epic ↔ 88 Task 매핑 정본**. Sprint 1 7일 8 코어 + 8 Descope + Phase 진입 관문 + Critical Path |
| [[product/concepts/architecture-decisions]] | framework | ⭐ **15 ADR 정본** — ADR-01~04 (비즈니스·규제) + V05 신규 ADR-05~07 (기술 스택) + 🆕 위키 합성 1차 ADR-08~12 (F9.4·F11·F16·HITL 재학습·변경 관리) + 🆕🆕 위키 합성 2차 ADR-13~15 (system_config·F15 안전 게이트·IRB 자문위원회) + V09 §4-3 4 모순 원칙 통합 |
| [[product/concepts/multi-llm-workflow]] | framework | ⭐ **Multi-LLM Best-of-Breed 작성 패턴 정본** — 7 단계 (호환성·프롬프트·병렬·검토·비교·통합·후속변환). VPS·PRD·SRS 공통 적용 |
| [[product/concepts/HITL-system-flow]] | synthesis | ⭐ **HITL 시스템 흐름 정본** — 4 원칙 + 9 단계 흐름 (AI 1차 → API-005 큐 → API-006 Studio → PostgreSQL 트리거 → Resend → Cron 24h/48h → 어뷰징 방어 → 루프백 0.5%/500건/0.3%). 운영비 $0/월 + 임상 안전망 |
| [[product/concepts/requirements-traceability-matrix]] | synthesis | ⭐⭐ **RTM 정본** — 99 REQ × 21 Epic × 88 Task × 13 Persona × 7 ADR × 9 Descope = **5축 추적성 100% 완성**. REQ-FUNC ID 빠른 조회 Lookup + Phase 0/1/2 통합 매핑 |
| [[product/concepts/F9.4-ROI-simulator]] | synthesis | ⭐ **F9.4 ROI 시뮬레이터 매핑 + UI 설계** — VPS V08 신규 영업 무기 (1,100% ROI 산식). F9-a 흡수 vs 독립 Epic 분석 + 5 신규 task 분해 (88→93) + UI 3-Step 설계 + ADR-XX 무로그인 분리 후보 |
| [[product/concepts/Phase-1-future-tasks-decomposition]] | synthesis | ⭐ **F11/F15/F16/F17/F18 task 분해 제안** — RTM 미추출 5 Epic의 13 신규 task / 21 SP 분해. F11 윤리 차단 (REQ-037) + F15 KOPLAC 영감 + F16 D5 부활 의존성 + F17/F18 보강. 88 → 108 Task 후보 |
| [[product/concepts/HITL-retraining-pipeline]] | synthesis | ⭐ **HITL 루프백 재학습 파이프라인** — model_retraining_data 스키마 (자동 INSERT 트리거) + 3단계 게이트 운영 흐름 (0.5%·500건·0.3%) + RACI 책임 매트릭스 + 3 신규 task / 5.5 SP + ADR-XX 후보 |
| [[product/concepts/change-management-process]] | framework | ⭐ **변경 관리 프로세스 정본** — raw 53 § 선택적 보강 권고 직접 실행. 3-Tier (Minor/Major/Strategic) + CR 워크플로 7단계 + CR 템플릿 + 위키 적용 사례 5종 + raw 53 38 항목 정독 (97% PASS) + 감점 2건 후속 |
| [[product/concepts/glossary]] | framework | ⭐ **Glossary 정본** — raw 53 보강 권고 2건 중 마지막 (Glossary). 12 카테고리 (KPI·페르소나·임상·제품·기술·ADR·영업·페이즈·프레임워크·도구·헷갈리는 약어·raw 매핑) + 3 온보딩 순서 (개발자/임상가/영업팀) |
| [[product/concepts/R6-Seg-B-Plan-B]] | synthesis | ⭐ **Seg B Plan B 정본** — raw 53 감점 5-7 후속 처리. EXP-2 실패 (M3<30%) 시 F4 + F18 → **F4-Plus 통합 Epic** 재구성 + Lock-in #1 강화 (데이터 매몰 + 미래 손실 회피) + CR Tier 2 처리 흐름 + Plan C 이중 안전망 |
| [[product/concepts/expert-diversity-monitoring]] | synthesis | ⭐ **expertId 다양성 모니터링** — HITL 재학습 데이터 편향 방어. Phase 1 (단순 Threshold + Top-3) + Phase 2 (HHI + Gini) 이중 모니터링 + Vercel Cron 자동화 + 위반 대응 시나리오 3종 |
| [[product/concepts/F10-research-consent]] | synthesis | ⭐ **F10 임상 연구 활용 동의 보강** — T1-T4 4-Tier Opt-in + T4-a/b/c granular consent (모델 개선 / 학술 발표 / 외부 협력) + DB-010 보강 + sync_retraining_data 트리거 갱신 + 마이그레이션 시나리오 + GDPR/한국법 정합 |
| [[product/concepts/F15-clinical-consultation-checklist]] | synthesis | ⭐ **F15 KOPLAC 임상 자문 체크리스트** — Phase 1 진입 전 **13 항목** (54차 ingest 보강: 기존 9 + 8 추론 유형 정본 + 난이도 위계 + 측정 단위 라이브러리 + 자문 풀 7 그룹). 자문 일정 4주 + 비용 82만 (3-4인 풀 권고). 한국 임상 7 그룹 매트릭스 (이화여대 김영태/이소현 + 대구대 김화수 + 단국대 황민아 + 부산가톨릭대·광주여대·연세대) |
| [[product/concepts/HITL-operations-policy]] | synthesis | ⭐ **HITL 운영 정책 정본** — Phase별 expert 풀 정량화 (3-5/5-10/15-25명 + 1급/2급 비율 + 운영비) + getCurrentPhase() env+DB 하이브리드 + system_config 테이블 + IRB 5단계 절차 + RACI Phase 변경 권한 |
| [[product/concepts/open-issues-dashboard]] | synthesis | ⭐⭐ **Open Issues 대시보드 (메타)** — 39+ 차 ingest 누적 28 잔여 이슈 통합. 8 카테고리 (사용자 확정/Phase 진입 전/Phase 운영/임상 법적/기술/모니터링/정독 잔여/ADR 후보 6종) + 처리 시점 매트릭스 + 영향 페이지 역추적 + Phase 진입 체크리스트 |

### product/entities — 경쟁사 · 페르소나 · 이해관계자

| 페이지 | 종류 | 한 줄 요약 |
|---|---|---|
| [[product/entities/에이치투케이]] | competitor | 소중한글, KAIST 출신, 한글 파닉스 특화, AI 자동화 85%+ |
| [[product/entities/캐치잇플레이]] | competitor | 게이미피케이션 + 다국어, 본 시장 직접 경쟁 약함 |
| [[product/entities/와우키키]] | competitor | 하이동동, 멀티모달 AI, 부모-교사-아동 삼자 연동 (가장 직접적 경쟁자) |
| [[product/entities/네오폰스]] | competitor | 토키랜드, **식약처 DTx 임상승인** 보유 (규제 해자) |
| [[product/entities/말과학놀이터]] | competitor | 뉴로톡, 장애음성 STT, B2G 통합돌봄 (B2C 직접경쟁 약함) |
| [[product/entities/두부]] | competitor | 舊 두브레인, **시리즈B 210억** (시장 최대 자본력), 메타버스 + 부모 코칭 |
| [[product/entities/에듀템]] | competitor | ELA API 공급사, **자체 vs 외주 결정 포인트** (잠재 외주 후보) |
| [[product/entities/송앤스타크]] | competitor | 스피치맵, 5분 AI 진단, **공격 대상** (2027 B2C 전환 전 윈도우) |
| [[product/entities/persona-이지수]] | persona | Core-1, Seg A, "검색만 3개월". 진입 장벽 최고 + 볼륨 최대 |
| [[product/entities/persona-박민정]] | persona | Core-2, Seg A→B, "데이터로 직성". 고LTV + 바이럴 시작점 |
| [[product/entities/persona-최수현]] | persona | Core-3, Seg C 센터 대기, "전문가 말 들어야". 이탈 시점 = 센터 치료 시작 |
| [[product/entities/persona-김태희]] | persona | Core-4, 비용 민감, 쌍둥이. Triage + 5분 UX 기준 |
| [[product/entities/persona-정유나]] | persona | Core-5, Seg A, "성장 기록". 긴급도↓ + LTV↑ + 인스타 바이럴 |
| [[product/entities/persona-오한솔]] | persona | Adjacent-1, 유치원 원장, **DOS 1위 (3.0)** ⭐. 1명 설득=80가구 (Phase 4 B2B2C 핵심) |
| [[product/entities/persona-김민지]] | persona | Non-user-3, "유튜브 거짓 안심". SAM 70-80% / 직접 전환 불가 → 외부 충격 마케팅 필요 |
| [[product/entities/persona-손지훈]] | persona | Adjacent-2, 아동심리상담사. **Q1 혁신기회** (DOS 1.4) — 신뢰 앵커 + 전문가 파트너 (Phase 2-3) |
| [[product/entities/persona-이미란]] | persona | Adjacent-3, 다문화 가정. **AOS 4.0 ⭐ + 황금 교차점 4명** + Q2 포용 설계 (이중언어 차별화) |
| [[product/entities/persona-황보름]] | persona | Extreme-1, ASD 경계선. 비전형 발화 = AI 인식 실패. **HITL confidence 60% 강제 게이트** + 모델 다양화 (Q2 포용) |
| [[product/entities/persona-강지방]] | persona | Extreme-2, 농촌 거주. **AOS 4.0 + 황금 교차점 5명**. 경량 + 오프라인 PWA + LTE 절약 (D5 부활 트리거 후보) |
| [[product/entities/persona-윤성민]] | persona | Non-user-1, 아버지. Goal 부재 → 직접 타깃 0. **이탈 방어 게이트 + 가족 단톡방 공유 (Lock-in #3)** |
| [[product/entities/persona-송혜경]] | persona | Non-user-2, 외할머니. **Q3 과잉투자 경계 (DOS -0.4)**. 소아과 신뢰 앵커 우회 + 가족 갈등 트리거 방어 |

### product/sources — 비즈니스 · 제품 · 엔지니어링 자료

| 페이지 | 자료 종류 | 핵심 시사점 |
|---|---|---|
| [[product/sources/02-Porter-5F-reinforce]] | competitive_analysis | Porter's 5F의 정량 보강. LTV:CAC 9.0x 조건부 매력도, GO/PIVOT/NO-GO 기준 |
| [[product/sources/05-Competitive-Briefing-Merged]] | competitive_analysis | 8경쟁사 4카테고리 분류 + 포지셔닝맵 + 화이트스페이스 |
| [[product/sources/06-Competitive-Value-Chain]] | competitive_analysis | 5경쟁사 가치사슬 분해 + 3유형 + 송앤스타크 = 최약체 |
| [[product/sources/07-Key-Success-Factors]] | competitive_analysis | Top 5 KSF 도출 + 순차 의존 + 정량 판단 기준 |
| [[product/sources/09-Problem-Definition-VC]] | problem_definition | VC 관점 솔직 판단. "100가정 파일럿이 단일 검증 게이트" |
| [[product/sources/12-Problem-Definition-Final]] | problem_definition | **통합 최종본**. "홈 랭귀지 코칭" 카테고리 신설 + 3단계 가치 퍼널 + Phase 0-3 |
| [[product/sources/14-Market-Segmentation]] | market_research | TAM-SAM-SOM 정의 + 4세그먼트 + Seg A 상세 (CAC 2-3만, LTV:CAC 4.2-10.5x) |
| [[product/sources/15-Persona-Spectrum]] | customer_research | 13개 페르소나 (Core 5 / Adjacent 3 / Extreme 2 / Non-user 3) + 9 설계 시사점 |
| [[product/sources/16-Customer-Journey-Map-Core]] | customer_research | Core 5명의 5단계 여정 + 단계별 페인 → 11개 UX·기능 요구 도출 |
| [[product/sources/22-23-JTBD-Interview-Results]] | customer_research | ⚠️ **시뮬레이션** 인터뷰 6명 + AOS/DOS 11항목 + 4 Forces + 4 핵심 발견 + ✅ Go + MVP 5대 |
| [[product/sources/18-19-Pain-Goal-Opportunity]] | customer_research | Pain 4 클러스터 + 중요도×만족도 매트릭스 + AOS·DOS 산출 + **4사분면 + 황금 교차점 4명** |
| [[product/sources/13-Market-Sizing]] | market_research | 글로벌 212.5억$ + 한국 발달재활 11.7만 명 + **합격률 17.2% 급락** + 출현율 3.3-15% + 14개 출처 |
| [[product/sources/17-Customer-Journey-Map-Others]] | customer_research | Adjacent 3 + Extreme 2 + Non-user 3 — 5단계 여정 (Non-user는 이탈·진입 전략 구조) |
| [[product/sources/33-37-Competitor-UX-Analysis]] | competitive_analysis | 4 그룹 14개 경쟁사 + **4대 UX 모순 해결 원칙** + 21 Epic UX 매핑 |
| [[product/sources/39-VPS-V09-Final]] | vps | VPS Final (부분 정독). DMU 5분리 + 21 Sub-feature + "홈 랭귀지 코칭" 카테고리 명명 |
| [[product/sources/54-PRD-V10-Final]] | prd | **PRD Golden Master** — 21 Epic + 4 Phase + 7 KPI + HITL + 4 Extremes + 4중 Lock-in + 230 SP |
| [[product/sources/65-SRS-V06-Final]] | srs | **SRS Implementation-Ready** — ISO 29148 + 65 REQ-FUNC + 30 REQ-NF + Traceability Matrix + Next.js Full-stack (C-TEC) |
| [[product/sources/66-PRD-to-SRS-Mapping-Review]] | review | PRD V10 ↔ SRS V05/V06 9 항목 검증 = **전체 PASS**. Implementation-Ready 인증 |
| [[product/sources/67-MVP-Descope-Review]] | review | 바이브 코딩 관점 Descope. 1주차 텍스트 모드 + 카톡/키즈노트 우회 + 운영비 $30/월 |
| [[product/sources/TASKS-Task-Breakdown]] | task_breakdown | **88 Task 인덱스** (DB 11+API 12+MOCK 3+FR-Q 14+FR-C 18+TEST 14+NFR/Infra/Sec/Mon/Ops 16) + Sprint 1 + 8 Descope (TASKS/01+03+02+04 통합) |
| [[product/sources/SRS-V01-V05-Multi-LLM-Workflow]] | meta_workflow | SRS V01-V05 워크플로 메타 5종 통합 (55 호환성 + 56 프롬프트 + 58 V01 검토 + 61 V03 검토 + 63 비교) |
| [[product/sources/TASKS-Sprint-1-Core-Detail]] | task_detail | ⭐ **Sprint 1 코어 8 Task 상세** — 11 TASK_*.md (DB·API·FR-Q·FR-C·INFRA) G/W/T + Files + Build + Verify + Dependencies |
| [[product/sources/TASKS-Sprint-1-Dependent-Detail]] | task_detail | ⭐ **Sprint 1 직접 의존 7 Task** — FR-C-002(D4) + API-004/011 + **SEC-004** (Upstash 3중 Rate Limit) + TEST-001/004/009 (합격 게이트) |
| [[product/sources/TASKS-Sprint-1-Remaining-Detail]] | task_detail | ⭐ **Sprint 1 의존 잔여 4 Task** — API-005 (D4 Replace HITL 큐 + Slack 웹훅) + MOCK-001 (P0 Sprint 1 핵심 픽스처) + MOCK-002 grantReward(P0)/curriculum(P1) + MOCK-003 (P1) |
| [[product/sources/TASKS-API-Routes-MOCK-Dependencies]] | task_detail | ⭐ **MOCK-002/003 의존 API 4종** — API-002 (curriculum 멱등성) + API-006 (D4 Studio + PostgreSQL 트리거) + API-007 (D8 클립보드) + API-008 (검토 §2.2 일반 웹 폼) |
| [[product/sources/TASKS-TEST-Phase-0-1-2-Complete]] | task_detail | ⭐ **TEST 11종 (Phase 0-2 완성)** — TEST-002/003/005/006/007/010/011/014 (P1, 58 시나리오) + TEST-012 (P2) + TEST-008/013 (Hold) + 자녀 R4 6중 검증 |
| [[product/sources/PRD-Intermediate-Reviews-Meta]] | meta_workflow | ⭐ **PRD V01-V09 진화 5 메타** — 44 (4 LLM 9항목 매트릭스) + 47 (7 매핑 85%) + 49 (7 패치) + 51 (18건) + 53 (97% PASS) |
| [[product/sources/31-32-VPS-V07-V08-Detail]] | vps | ⭐ **VPS V07-V08 부분 정독** — V07 4단계 구조 신설 + KSF Top 4 + AOS/DOS 사분면 / V08 Sub-feature 트리 (F1.1~F10.1) + ROI 시뮬레이터 (1,100% ROI) + Seg D-1/D-2 분리 + BMC 9-Block + 26 보고서 Traceability |
| [[product/sources/52-PRD-V09-Quality-Improvement]] | prd | ⭐ **PRD V0.9 Quality 정독** — 18 결함 P0/P1/P2 분류 (CJM KPI 8건 수치화 + Lock-in 4중 KPI + 가정→EXP 매핑 + 모니터링 5종 + Story AC 30+ 측정 임계치 + **HITL 루프백 재학습 3단계** + 산술 교정 + Traceability + NFR↔AC). SRS-Ready 확정판 |
| [[product/sources/24-30-VPS-V01-V06-Detail]] | vps | ⭐ **VPS V01-V06 + BMC 정독** — V01 Sonnet 7-Block + V02 Gemini JobMVP 10 + V03/V04 BMC 정합 + V05 Best-of-Breed Dashboard + V06 Business Operations 4 섹션. 멀티 LLM 워크플로 원형 검증 |

---

## ── Pillar B · Clinical ──

### clinical/concepts — 장애 유형 · 치료 기법 · 발달 규준 · 종합 분석

| 페이지 | 카테고리 | 한 줄 요약 |
|---|---|---|
| [[clinical/concepts/학령전-언어평가-도구-비교]] | synthesis | ⭐ **4 도구 비교 정본** — SELSI(4-35개월) + PRES(2;0-6;11) + REVT(2;6-성인) + U-TAP/U-TAP2(2;6-7) 통합 매트릭스 + 도구 선택 알고리즘 + MVP F1-a 3축 매핑 |
| [[clinical/concepts/NISE-B-ACT-학습장애검사]] | assessment_domain | ⭐ **NISE-B·ACT 학습장애 검사** — 국립특수교육원 + 읽기·쓰기·수학 도구적 기술. 만 5세+. **MVP 회피 영역 + 부분 영감** (만 5-7세 음운인식·해독). 트랙 3 신규 분류 후보 |
| [[clinical/concepts/실어증]] | disorder | 뇌손상 후 언어 기능 장애. 평가 K-WAB·K-BNT, 단계적 단서 위계 기반 4영역 훈련. **54차 보강** (영상·교재) |
| [[clinical/concepts/마비말장애]] | disorder | 신경계 손상 운동언어장애. 호흡·발성·공명·조음·운율 5하위체계 단계 훈련. **54차 보강** (영상·논문) |
| [[clinical/concepts/인공와우-청능재활]] | disorder | 인공와우 후 청능훈련. 매핑 + 4단계 위계. **54차 본문 보강 1차+2차** (Tye-Murray 최적화본 + part1 OCR — CHAPTER 4 청능 훈련 본문 정독). ⭐⭐ **Erber 1982 출전 직접 인용 + 4단계 위계 (소리 인식·변별·확인·이해) 본 교재 정합 + 4 계획 원칙 + 6 난이도 변수 + 80%/50% 임계** = F3-b 임상 토대 정본 |
| [[clinical/concepts/언어발달지연]] | disorder | 트랙2 가장 흔한 대상. 어휘→문장→담화 단계적 향상. **54차 본문 보강 1차** (DLD 진단·평가 핸드아웃 정독 — Fey 1986 SD -1.25 출전 + Darley 진단·평가 정의 + 팀 접근 3 모델 + 차이→방해→장애 3단계 + 평가 4 목적). Rhea Paul OCR 후속 |
| [[clinical/concepts/조음장애]] | disorder | 목표 음소 정확 산출. 놀이 기반 + 단음→대화 6단계 위계. **54차 보강** (영상·음운기억 논문) |
| [[clinical/concepts/자폐-화용중재]] | technique | ASD 화용·사회적 의사소통. 의사소통 의도→차례→상황→관심 공유 4축. **54차 본문 보강 1차+2차+3차** (영문 7편 + 국문 10편 정독 — 80%+ 완료). 한국 ASD 연구 4 축 그룹 (이화여대 김영태/이소현 + 광주여대 박은실 + 단국대 황민아). **F15 자문 체크리스트 12 항목** + CIU 단위 + 추론 3 유형 + 이상한 이야기 과제 표준 |
| [[clinical/concepts/아동언어치료-핵심기법]] | technique | 4기법: 평행 발화 / 확장 / 기다리기 / 반응적 상호작용. 부모 코칭 핵심 |
| [[clinical/concepts/한국-언어치료-트랙비교]] | synthesis | 의료기관 vs 사설 센터 트랙 + 비용·바우처·1급/2급. **제품 시장 세그의 토대** |
| [[clinical/concepts/유창성장애]] | disorder | 🆕 **54차 신규** — 말더듬·속화. 5대 영역 중 하나. **MVP 회피 영역** (스텁) |
| [[clinical/concepts/음성장애]] | disorder | 🆕 **54차 신규** — 성대·호흡·공명 이상. 트랙1 의료 영역. **MVP 회피 영역** (스텁) |
| [[clinical/concepts/학습장애-언어재활]] | disorder | 🆕 **54차 신규** + ⭐ **본문 1차 보강** — 한국 3편 정독 (박예슬 정교화추론·도구추론 + 유경진 추론 4 유형·오류 4 유형 + 현혜숙 관용어 이해). F15 챗봇 영유아 추론 위계 Level 1-3 통합 |
| [[clinical/concepts/단순언어장애-SLI]] | disorder | 🆕 **54차 신규** + ⭐ **본문 1차 보강** — 한국 3편 정독 (문주희 사회성·집행기능·이야기 + 이현정 C-unit·MLC-w·MNC + 정수연 개인화 예측추론). SLI vs ASD 감별 표 + 한국 학령기 측정 단위 통합 라이브러리 |
| [[clinical/concepts/다문화-언어발달]] | disorder | 🆕 **54차 신규** + ⭐ **본문 1차 보강** — 한국 4편 정독 (Jang 동음이의어 + Jo 연어 + 김선경 한-베 연음규칙·어머니 상관 + 김현진 cross). Persona 이미란 임상 토대 강화 ⭐⭐. 한국어 특이적 결함 영역 5종 식별 (연음·겹받침·연어·동음이의어). 단국대 황민아·정미란 + 이화여대 김영태 |
| [[clinical/concepts/지적장애-언어중재]] | disorder | 🆕 **54차 신규** + ⭐⭐ **본문 1차+2차 보강** — 한국 11편 정독 (5+6) — KOPLAC + 청소년 마음이론 + 4 패러다임 + 대구대 김화수 핵심 그룹 (8편 지도) + T-unit/MLT-w/NDW + 유추추론 매트릭스 + 내포문 5유형 + Frog Stories. ID 발달 위계 (학령전→청소년→성인) 정본. 잔여 14편 |
| [[clinical/concepts/신경인지장애-노인의사소통]] | disorder | 🆕 **54차 신규** + ⭐ **본문 1차 보강** — 한국 4편 정독 (Kim 2017 AD 숫자 처리·고유어/한자어 + 강경미 의사소통-인지 통합 + 천정민 예술-언어 통합 그룹). **인지적 연속선** + 한국 평가 도구 6 종 (K-MMSE/K-MoCA/HCRS/GDS/CDR/SGDS) + MVP 회피 5 사유 명세. 연세대 김향희 + 대구대 김화수 |
| [[clinical/concepts/내러티브-담화-추론-중재]] | synthesis | 🆕 **54차 신규** + ⭐⭐ **본문 1차 보강** — 한국 5편 정독 (김혜정 동기추론 위계 + 이지현 증거성표지 + 백재은 LLD 양식효과 + 김현진 다문화 서사담화 + 박후임 애니메이션 17차시 8 추론유형). **F15 챗봇 직접 임상 토대 정본** (시나리오 8 유형 + 난이도 위계 + 자문 체크리스트 5 항목) |

### clinical/entities — 평가 도구 · 인물 · 기관 · 프로토콜

| 페이지 | 종류 | 한 줄 요약 |
|---|---|---|
| [[clinical/entities/K-WAB]] | assessment | 한국판 웨스턴 실어증 검사 |
| [[clinical/entities/K-BNT]] | assessment | 한국판 보스턴 이름대기 검사 |
| [[clinical/entities/SELSI]] | assessment | 영유아 언어발달 선별검사 |
| [[clinical/entities/PRES]] | assessment | 취학전 아동 수용·표현 언어발달 검사 |
| [[clinical/entities/REVT]] | assessment | 수용·표현 어휘력 검사 (REVT-R / REVT-E) |
| [[clinical/entities/U-TAP]] | assessment | 우리말 조음음운평가 — 조음장애 진단 표준 |
| [[clinical/entities/KOPLAC]] | assessment | 한국어 화용언어능력검사 |
| [[clinical/entities/PECS]] | protocol | 그림교환의사소통체계 — AAC, ASD 의사소통 의도 |
| [[clinical/entities/KOCS]] | assessment | 🆕 **54차 신규** — 한국 아동 말더듬 검사. [[clinical/concepts/유창성장애]] 평가 표준 (스텁) |

### clinical/sources — 임상 자료 요약

| 페이지 | 자료 종류 | 연도 | 핵심 시사점 |
|---|---|---|---|
| [[clinical/sources/0-언어치료-실제-세션-상세가이드]] | clinical_note | 2025 | 한국 언어치료 두 트랙 + 세션 구조 + 평가 도구 + 비용 제도 종합 |
| [[clinical/sources/2026-05-09-한국-영유아-언어평가-DLD-NISE]] | clinical_note | 2026 | ⭐ **신규 7 자료 통합** (231KB) — SELSI/PRES/REVT/U-TAP 체크리스트 + 4도구 통합 가이드 + DLD 단계적 중재·4 핵심기법 + NISE-B·ACT 학습장애 검사 |
| [[clinical/sources/2026-05-10-언어치료-자료실-종합-인벤토리]] | clinical_note | 2026 | ⭐⭐ **54차 batch ingest** — raw/assets/언어치료 자료/ 전체 ~180 파일 종합 카탈로그 (PDF 120 + AVI 51 + HWP 11). 5대 장애 영역 강의 영상 24편 + 교재 (Rhea Paul/Manning/Tye-Murray) + ASD 18편 + 지적장애 25편 + 학습장애 15편 + 추론 35+편 + 다문화 5편 외. 후속 ingest 진입점 |

---

## Cross-link 현황 ⭐

> 두 기둥 사이의 명시적 cross-link은 이 위키의 핵심 가치입니다. **2차 ingest로 첫 양방향 활성화.**

### Product → Clinical (실제 링크)

| Product 페이지 | Clinical 참조 | 매핑 의미 |
|---|---|---|
| [[product/concepts/Porter-5-Forces-Analysis]] | [[clinical/concepts/한국-언어치료-트랙비교]] §자격제도, §비용 | 공급자 협상력 + WTP 상한선의 임상 근거 |
| [[product/concepts/Porter-5-Forces-Analysis]] | [[clinical/concepts/아동언어치료-핵심기법]] | 대체재(부모 직접 교육) = 4기법 자가 적용 시도 |
| [[product/concepts/Value-Chain-Analysis]] | [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙1+2 | 풀스택 O2O = 트랙 결합형의 디지털화 |
| [[product/concepts/Value-Chain-Analysis]] | [[clinical/entities/REVT]], [[clinical/entities/U-TAP]] | KSF #2 효과 검증의 임상 표준 |
| [[product/concepts/Value-Chain-Analysis]] | [[clinical/concepts/아동언어치료-핵심기법]] | 비동기 코칭 = 4기법의 텍스트 재현 |
| [[product/concepts/Key-Success-Factors]] | [[clinical/entities/SELSI]], [[clinical/entities/PRES]], [[clinical/entities/REVT]], [[clinical/entities/U-TAP]], [[clinical/entities/KOPLAC]] | KSF #1·#2의 임상 표준 도구 (5개) |
| [[product/concepts/Key-Success-Factors]] | [[clinical/concepts/한국-언어치료-트랙비교]] | KSF #3·#4·#5의 임상 트랙 매핑 |
| [[product/concepts/competitive-landscape]] | [[clinical/concepts/실어증]], [[clinical/concepts/마비말장애]] | 카테고리 B(DTx) = 트랙1 임상 영역 (회피) |
| [[product/concepts/competitive-landscape]] | [[clinical/concepts/한국-언어치료-트랙비교]] | 우리 위치 = 트랙2 진입 직전 + 대기 단계 |
| [[product/concepts/problem-definition]] | [[clinical/concepts/언어발달지연]] §평가 도구 | 회색지대 = 임상 평가 만나기 전 단계 |
| [[product/concepts/problem-definition]] | [[clinical/concepts/한국-언어치료-트랙비교]] §전문 인력 수급 | 센터 대기 3-6개월의 구조적 원인 |
| [[product/entities/네오폰스]] | [[clinical/concepts/실어증]] | DTx 타깃 영역 (회피) |
| [[product/entities/말과학놀이터]] | [[clinical/concepts/마비말장애]], [[clinical/concepts/조음장애]] | 장애음성 STT 임상 영역 |
| [[product/entities/두부]] | [[clinical/concepts/언어발달지연]], [[clinical/concepts/자폐-화용중재]], [[clinical/concepts/아동언어치료-핵심기법]] | 두부홈즈 = 4기법 클래스화 |
| [[product/entities/송앤스타크]] | [[clinical/entities/SELSI]], [[clinical/entities/PRES]], [[clinical/entities/REVT]], [[clinical/entities/U-TAP]] | 5분 AI 진단 vs 임상 표준 60-90분 |
| 모든 product/sources (5건) | 다양한 clinical 페이지 | 각 source의 §"Clinical 기둥 cross-link" 참조 |

### Clinical → Product (실제 링크) ✅

| Clinical 페이지 | Product 참조 | 매핑 의미 |
|---|---|---|
| [[clinical/sources/0-언어치료-실제-세션-상세가이드]] | competitive-landscape, KSF, Porter-5F, problem-definition, Value-Chain, 송앤스타크 | 8개 임상 사실의 표 형태 양방향 매핑 |
| [[clinical/concepts/한국-언어치료-트랙비교]] | competitive-landscape, problem-definition, Porter-5F, KSF, (예정 PRD-evolution) | 트랙 구분 → 5개 제품 결정의 임상 토대 |
| [[clinical/concepts/아동언어치료-핵심기법]] | KSF, problem-definition, Porter-5F, (예정 PRD-evolution) | 4기법 → 부모 코칭 기능·페인 메커니즘 |
| [[clinical/concepts/실어증]] | competitive-landscape (DTx 회피), ADR-04, PRD V10 § Won't, 네오폰스 | ⛔ **MVP 회피 영역** — 의료기관 트랙1 |
| [[clinical/concepts/마비말장애]] | competitive-landscape (DTx 회피), ADR-04, PRD V10 § Won't, 말과학놀이터 | ⛔ **MVP 회피 영역** — 트랙1 운동언어 (말과학놀이터 직접 타깃) |
| [[clinical/concepts/인공와우-청능재활]] | competitive-landscape (DTx 회피), ADR-04, MVP-feature-spec § F3-b, PRD V10 § Won't | ⛔ 회피 영역 + ⭐ **4단계 위계 = F3-b 적응형 난이도 영감** |
| [[clinical/concepts/조음장애]] | MVP-feature-spec § F1-a/F3-b/F11, HITL-system-flow (groundTruthScore.articulation), U-TAP, KSF #2, 말과학놀이터, competitive-landscape | ⭐ **MVP 핵심 타깃** — 3축 AI articulation 점수 직접 매핑 |
| [[clinical/entities/K-WAB]] | KSF #2, Value-Chain, Porter-5F, PRD V10 § Won't | ⛔ 회피 영역 (60-90분 vs 5분 단축 사례) |
| [[clinical/entities/K-BNT]] | KSF #2, MVP-feature-spec § F3-b, PRD V10 § Won't | ⛔ 회피 영역 + 단서 위계 = F3-b 영감 |
| [[clinical/entities/SELSI]] | ⭐ MVP-feature-spec § F1-a, KSF #2, Porter-5F, customer-segmentation, HITL-system-flow | ⭐ **MVP F1-a 5분 진단 임상 토대** |
| [[clinical/entities/PRES]] | ⭐ MVP-feature-spec § F1-a 3축, HITL-system-flow groundTruthScore.linguistic, KSF #2, PRD V10 § Won't | ⭐ **3축 linguistic 점수 임상 토대** |
| [[clinical/entities/REVT]] | ⭐ MVP-feature-spec § F1-a + F4 + F15, HITL-system-flow, KSF #2, Value-Chain, persona-박민정 | ⭐ **linguistic 어휘 영역 가장 흔히 사용** |
| [[clinical/entities/U-TAP]] | ⭐⭐ MVP-feature-spec § F1-a, HITL-system-flow groundTruthScore.articulation, KSF #2, persona-박민정, Value-Chain | ⭐⭐ **MVP 가장 직접적 매핑 (조음 핵심)** |
| [[clinical/entities/KOPLAC]] | ◐ MVP-feature-spec § F15, KSF #2, PRD V10 § Won't | ◐ MVP 부분 영역 (F15 챗봇 영감) |
| [[clinical/entities/PECS]] | ⛔ competitive-landscape, PRD V10 § Won't, ADR-04 | ⛔ 회피 영역 (AAC 임상) |

### 카운트

- **product → clinical 인용 페이지**: 21개 (모든 product/concepts 7 + 9 source + 5 persona entity)
- **clinical → product 실제 링크**: **15개 페이지에서 60+건** (8 entities backlink 활성화 — 21차 ingest 완성)
- **양방향 연결된 페이지 쌍** (3차 ingest 후):
  - [[clinical/concepts/한국-언어치료-트랙비교]] ↔ {Porter-5F, competitive-landscape, KSF, problem-definition, customer-segmentation, customer-journey} (6쌍)
  - [[clinical/concepts/아동언어치료-핵심기법]] ↔ {KSF, problem-definition} (2쌍)
  - [[clinical/sources/0-언어치료-실제-세션-상세가이드]] ↔ {KSF, problem-definition, 송앤스타크} (3쌍)
  - [[clinical/concepts/언어발달지연]] ↔ {customer-segmentation, problem-definition, customer-journey} (3쌍)
  - [[clinical/entities/U-TAP]] ↔ {persona-박민정, customer-journey, KSF} (3쌍)
  - = **17+ 양방향 페어 활성** (cross-link 밀도 급증)

---

## 통계

| 영역 | concepts | entities | sources | 합계 |
|---|---:|---:|---:|---:|
| product  | 31 | 21 | 30 | **82** |
| clinical | 18 | 9 | 3 | **30** |
| **전체** | **49** | **30** | **33** | **112** |

raw 자료 처리 현황:
- ✅ clinical: `0_언어치료_실제_세션_상세가이드.md` (1/1) + **2026-05-09 신규 7 자료** (SELSI/PRES/REVT/U-TAP/4도구 통합/DLD/NISE-B) 정독 완료 + **2026-05-10 신규 raw/assets/언어치료 자료/ ~180 파일 인벤토리** (1차 카탈로그 — 후속 ingest 본문 보강 단계)
- ✅ product · 전략 클러스터(1-9): 5/9 (1·3·4·8 미독, 2·5·6·7·9는 통합본만 정리)
- ✅ product · 리서치 클러스터(10-23): 11/14 (12·13·14·15·16·17·18·19·22·23 정리. 미독: 10·11·20·21 — 모두 중간본·계획본으로 후순위)
- ✅ product · VPS 진화(24-32, 39): **10/10 정독 완성** (24 BMC + 25-30 V01-V06 + 31 V07 + 32 V08 + 39 V09 final + timeline)
- ✅ product · 경쟁사 UX(33-37): 5/5 통합 source
- ◐ product · PRD 진화(40-54): 7/15 (54 V10 + **52 V0.9 Quality 본문** + 검토 메타 5: 44·47·49·51·53 + timeline)
- ✅ product · SRS 진화(55-67): 8/13 (55+56 메타 + 58+61+63 검토·비교 + 65 V06 전체 + 66 매핑 + 67 Descope + 2 timeline. 미독: 57·59·60·62·64 본문 V01-V05)
- ◐ product · TASKS/: 41/100+ (메타 4 + Sprint 1 코어 11 + 의존 7 + 잔여 4 + MOCK 의존 API 4 + **TEST 11** = TEST-001~014 모두 정독)
- ⬜ product · VPS V01-V06 (raw 24-30): 0/7 (V07-V08 정독으로 V01-V06 미독만 잔존)
