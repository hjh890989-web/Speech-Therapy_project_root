---
type: concept
pillar: product
category: framework
aliases: [용어 사전, Glossary, 약어 정의, 도메인 용어 통합]
tags: [Glossary, 용어, 약어, 도메인용어, 온보딩, raw53, 클러스터통합]
---

# Glossary — 도메인·기술·비즈니스 용어 통합 사전

raw 53 § 선택적 보강 § "용어 사전 (Glossary)" 권고 직접 실행. **신규 합류 개발자·자문 임상가·B2B 영업팀의 온보딩 지원 단일 페이지**. W-AUR, HITL, AOS/DOS, DMU, CJM 등 위키 전반에 흩어진 약어·전문 용어 정의 통합.

> raw 53 § 선택적 보강 (Low): "W-AUR, HITL, AOS/DOS, DMU, CJM 등 도메인 용어 정의를 문서 말미에 추가하여 신규 합류 개발자 온보딩 지원" — **본 페이지가 그 정본**. raw 53 보강 권고 2건 (변경 관리 + Glossary) 모두 ✅ 처리 완료.

## 1. 비즈니스 KPI

| 약어 | 풀이 | 정의 | 본 위키 정본 |
|---|---|---|---|
| **W-AUR** | Weekly Active User Retention | 주간 발음 미션 완수율. **북극성 KPI — 트랙A(발음)** (≥60%) | [[product/sources/52-PRD-V09-Quality-Improvement]] § §1.3 |
| **W-LER** | Weekly Literacy Engagement Rate | 주간 문해 활동률(engagement). **북극성 보조지표 — 트랙B(문해)**. 활동일 ≥2(`W_LER_MIN_DAYS`), 완수율 아님·target은 baseline 후 | ADR 북극성 2트랙 (`lib/reports/wler-trend.ts`) |
| **M3** | Month-3 Retention | 3개월 차 리텐션 유지율 (≥40%) | RTM § REQ-NF-026 |
| **CVR** | Conversion Rate | 무료 진단 → Basic 결제 전환율 (≥8%) | RTM § REQ-NF-027 |
| **CAC** | Customer Acquisition Cost | 고객 획득 비용 (목표 ≤30,000원 → B2B 제휴 후 10,000원↓) | [[product/concepts/customer-segmentation]] |
| **LTV** | Lifetime Value | 고객 생애 가치 (3년 누적 매출 / 가구 수) |
| **LTV:CAC** | LTV ÷ CAC 비율 | 단위 경제성. 목표 **≥4.0** (REQ-NF-022 모니터링 <3.0 시 주간 리뷰) | [[product/concepts/Porter-5-Forces-Analysis]] |
| **MRR** | Monthly Recurring Revenue | 월간 정기 구독 매출 (B2C Basic 35K + Premium 50K) |
| **ARR** | Annual Recurring Revenue | 연간 정기 매출 (B2B 라이선스 50만/년) |
| **Churn** | 자발적 해지율 | 월간 (목표 ≤5%, 업계 평균 10-15%) | RTM § REQ-NF-029 |
| **SOM** | Serviceable Obtainable Market | 1년차 도달 가능 시장. 보수 5K-12.5K / 광의 12K 가구 | [[product/concepts/customer-segmentation]] § TAM 정의 모순 |
| **SAM** | Serviceable Available Market | 핵심 타깃 시장. 보수 17-25만 / 광의 22.5만 가구 |
| **TAM** | Total Addressable Market | 전체 잠재 시장. 보수 72-96만 / 광의 150만 가구 |

## 2. 페르소나·세그먼트·JTBD

| 약어 | 풀이 | 정의 | 본 위키 정본 |
|---|---|---|---|
| **Seg A** | Segment A | 불안형 탐색자 (12-15만 가구, 60-70% SOM 기여). 대표: 이지수·박민정 | [[product/entities/persona-이지수]] |
| **Seg B** | Segment B | 데이터형 가족 (3-5만, 아빠/조부모). 대표: 박민정 (Seg A→B 진화). H-B ⚠️ 부분 검증 (R6) |
| **Seg C** | Segment C | 센터 대기자 (2-3만, 핵심 결제자). 대표: 최수현 |
| **Seg D-1** | D-1 결제권자 | 유치원 원장 (~5,000 기관). DOS 1위. 대표: 오한솔 | [[product/entities/persona-오한솔]] |
| **Seg D-2** | D-2 게이트키퍼 | 보육 교사 (실무 운영자). 거부권 보유. 대표: 김민지 |
| **DMU** | Decision Making Unit | 의사결정 단위. B2C는 부모 단일, B2B는 원장(D-1)+교사(D-2) 분리 |
| **JTBD** | Job-to-be-Done | "고객이 우리 제품을 고용해 해결하려는 일". 3축 (Functional + Emotional + Social) | [[product/concepts/jtbd-insights]] |
| **AOS** | Achievement Opportunity Score | 성취 기회 점수 = Imp × (1 - Sat/5). 4.0+ = 최우선 | [[product/concepts/opportunity-quadrants]] |
| **DOS** | Demand Opportunity Score | 시장 파급력 = (Imp - Sat) × Market Relevance. ≥8.0 = 초과 달성 |
| **CJM** | Customer Journey Map | 고객 여정 매핑. 4단계 (의심·탐색 → 대기·절망 → 체념·유지 → 기관 갈등) | [[product/concepts/customer-journey]] |
| **Persona Spectrum** | 13 페르소나 | Core 5 + Adjacent 3 + Extreme 2 + Non-user 3 | [[product/sources/15-Persona-Spectrum]] |
| **황금 교차점** | Golden Intersection | Pain ≥5 × Sat ≤2. 5명: 이지수·박민정·최수현·이미란·강지방 |

## 3. 임상 (Clinical)

| 약어 | 풀이 | 정의 | 본 위키 정본 |
|---|---|---|---|
| **HITL** | Human-in-the-Loop | AI + 인간 전문가 하이브리드. confidence <70 자동 큐 + 48h SLA + 0.5%/500건/0.3% 재학습 게이트 | [[product/concepts/HITL-system-flow]] + [[product/concepts/HITL-retraining-pipeline]] |
| **STT** | Speech-to-Text | 음성→텍스트 변환 (Web Speech API D1 + Vercel AI SDK 후속) |
| **TTS** | Text-to-Speech | 텍스트→음성 합성 (F11 부모 음성 클로닝 ElevenLabs) |
| **VAD** | Voice Activity Detection | 음성 활동 감지 (F9-b Zero-touch Web Worker) |
| **SLP** | Speech-Language Pathologist | 언어재활사 (1급/2급, 한국 ~17,000명) | [[clinical/concepts/한국-언어치료-트랙비교]] |
| **AAC** | Augmentative & Alternative Communication | 보완대체의사소통. PECS 등 (MVP 회피 영역) | [[clinical/entities/PECS]] |
| **MIT** | Melodic Intonation Therapy | 멜로디 억양 치료. 실어증 따라말하기 훈련 | [[clinical/concepts/실어증]] |
| **ASD** | Autism Spectrum Disorder | 자폐 스펙트럼 장애. MVP 회피 (단, ASD 경계선 군 = 황보름 페르소나 = HITL confidence 60% 가설) | [[clinical/concepts/자폐-화용중재]] |
| **DTx** | Digital Therapeutics | 디지털 치료기기. 식약처 인허가 영역. **MVP 회피** (ADR-04) |

### 평가 도구 (Standardized Tests)

| 약어 | 풀이 | 영역 | 본 위키 정본 |
|---|---|---|---|
| **K-WAB** | Korean-Western Aphasia Battery | 한국판 웨스턴 실어증 검사 (성인, MVP 회피) | [[clinical/entities/K-WAB]] |
| **K-BNT** | Korean-Boston Naming Test | 한국판 보스턴 이름대기 검사 (성인, 회피) | [[clinical/entities/K-BNT]] |
| **SELSI** | Sequenced Language Scale for Infants | 영유아 언어발달 선별검사 (MVP F1-a 임상 토대) | [[clinical/entities/SELSI]] |
| **PRES** | Preschool Receptive-Expressive Language Scale | 취학전 수용·표현 언어발달 (linguistic 점수 토대) | [[clinical/entities/PRES]] |
| **REVT** | Receptive & Expressive Vocabulary Test | 어휘력 검사 (REVT-R/REVT-E, 가장 흔히 사용) | [[clinical/entities/REVT]] |
| **U-TAP** | Urimal Test of Articulation and Phonology | 우리말 조음음운평가 (**MVP 가장 직접적 매핑** ⭐⭐) | [[clinical/entities/U-TAP]] |
| **KOPLAC** | Korean Pragmatic Language Assessment | 한국어 화용언어능력검사 (F15 영감) | [[clinical/entities/KOPLAC]] |
| **PECS** | Picture Exchange Communication System | 그림교환의사소통체계 (AAC, 회피) | [[clinical/entities/PECS]] |

### 문해 구인 (Literacy, 트랙B — 연습-only)

> 트랙B(읽기·말)는 점수·밴드·판정 없는 **연습-only**(`bandShippable=false`·`referenceBand=null`). 아래는 놀이 난이도 위계의 임상 영감 — 측정 척도 아님(만2~4 일반 모집단 규준 빈약).

| 용어 | 풀이 | 정의 | 본 위키 정본 |
|---|---|---|---|
| **음운인식** | Phonological Awareness | 말소리 단위(운율·음절·음소) 인식·조작. 읽기 선행지표 | [[clinical/concepts/읽기-선행지표-발달규준]] §2.A |
| **해독** | Decoding | 자소-음소 대응으로 글자→소리 | [[clinical/concepts/읽기-선행지표-발달규준]] §2.B |
| **RAN** | Rapid Automatized Naming | 빠른 자동 이름대기. 읽기유창성 예측 | [[clinical/concepts/읽기-선행지표-발달규준]] §2.C |
| **읽기유창성** | Reading Fluency | 정확·속도·운율 있는 읽기 | [[clinical/concepts/읽기-선행지표-발달규준]] §2.D |
| **SVR** | Simple View of Reading | 읽기이해 = 해독 × 언어이해 | [[clinical/concepts/읽기-선행지표-발달규준]] |
| **연습-only** | practice-only | 문해 트랙 불변 — 점수·밴드·또래백분위·판정 미산출, 활동 빈도(engagement)만 | `lib/literacy/stages.ts` `bandShippable=false` |

## 4. 제품·요구사항

| 약어 | 풀이 | 정의 | 본 위키 정본 |
|---|---|---|---|
| **VPS** | Value Proposition Sheet | 가치 제안 시트 (V01-V09 9 버전 진화) | [[product/concepts/VPS-evolution]] |
| **PRD** | Product Requirements Document | 제품 요구사항 문서 (V01-V10 10 버전) | [[product/concepts/PRD-evolution]] |
| **SRS** | Software Requirements Specification | 소프트웨어 요구사항 명세 (V01-V06 6 버전, ISO 29148) | [[product/concepts/SRS-evolution]] |
| **BMC** | Business Model Canvas | 비즈니스 모델 캔버스 9-Block | [[product/sources/24-30-VPS-V01-V06-Detail]] § raw 24 |
| **MVP** | Minimum Viable Product | 최소 기능 제품. 21 Epic / 4 Phase | [[product/concepts/MVP-feature-spec]] |
| **Epic** | Feature Group | 기능 묶음. F1-a~F18 (21개). REQ-FUNC 평균 3.1/Epic | [[product/concepts/MVP-feature-spec]] |
| **Story** | User Story | 사용자 스토리. S1-S6 (As a / I want / So that 3부 구조) |
| **AC** | Acceptance Criteria | 수용 기준. GWT (Given-When-Then) 형식 + 정량 임계 |
| **GWT** | Given-When-Then | AC 표준 형식 (시나리오 명세) |
| **Neg AC** | Negative AC | 실패 케이스 AC (각 Story 2건+ 강제) |
| **REQ-FUNC** | Functional Requirement | 기능 요구사항 (61개 + HITL 4 cross-cutting = 65) | [[product/sources/65-SRS-V06-Final]] |
| **REQ-NF** | Non-Functional Requirement | 비기능 요구사항 (30개: 성능·SLA·신뢰성·보안·모니터링·KPI) |
| **MoSCoW** | Must·Should·Could·Won't | 우선순위 4단계 (Must=Phase 0, Should=Phase 1, Could=Phase 2, Won't=명시적 제외) |
| **RTM** | Requirements Traceability Matrix | 요구사항 추적 매트릭스 (5축: REQ × Epic × Task × Persona × ADR) | [[product/concepts/requirements-traceability-matrix]] |
| **트랙A / 트랙B** | Track A / Track B | 2트랙 비대칭: A=발음·발화 "확인"(만2~7, 표준화 규준) / B=읽기·말 "놀이·연습"(만2~12, 연습-only). "측정 vs 측정" 아님 | 재정렬 청사진 §3 · VPS V10 |
| **bandShippable** | 출시 가능 밴드 | 문해 단계별 참고밴드 출시 가능 여부. **전 단계 false**(Phase 2 규준검증 0건) | `lib/literacy/stages.ts` |
| **REQ-LIT** | Literacy Requirement | 문해 트랙 연습 콘텐츠 요구(측정 REQ 아님). 14게임 ↔ S0~S4 | SRS V08 §4.1 |

## 5. 기술 스택 (Technical)

| 약어 | 풀이 | 정의 | 본 위키 정본 |
|---|---|---|---|
| **C-TEC-001~007** | Constraint Technical | V05/V06 신규 7 기술 제약 (Next.js + Server Actions + Supabase + Tailwind/shadcn + Vercel AI SDK + Gemini + Vercel) | [[product/concepts/tech-architecture]] |
| **PWA** | Progressive Web App | 웹앱 = 앱 (Service Worker + manifest). D2 Capacitor 우회 |
| **RSC** | React Server Components | Next.js App Router 서버 컴포넌트 |
| **SSR** | Server-Side Rendering | 서버 측 렌더링 |
| **RLS** | Row Level Security | Supabase 행 단위 보안 (RBAC 구현 메커니즘) |
| **RBAC** | Role-Based Access Control | 역할 기반 접근 제어 (Next.js Middleware + Supabase RLS) |
| **CRUD** | Create·Read·Update·Delete | 데이터 4 기본 작업 |
| **CQRS** | Command Query Responsibility Segregation | 명령(Write) ↔ 조회(Read) 분리. 본 위키 = FR-Q (14 Read) + FR-C (18 Write) | [[product/concepts/task-breakdown-overview]] |
| **DTO** | Data Transfer Object | 데이터 전송 객체 (API 페이로드) |
| **Edge Runtime** | Vercel Edge | 짧은 응답·전 세계 배포 (D7 Descope) |
| **OPS** | Operations | 운영 task 카테고리 (88 Task 중 1개) |
| **MOCK** | Mock data | 픽스처 task (88 Task 중 3개) |
| **HITL Queue** | hitl_queue 테이블 | DB-009. confidence <70 시 자동 INSERT + 48h slaDueAt | [[product/concepts/HITL-system-flow]] |

## 6. 아키텍처·거버넌스

| 약어 | 풀이 | 정의 | 본 위키 정본 |
|---|---|---|---|
| **ADR** | Architecture Decision Record | 아키텍처 결정 기록. ADR-01~15 (15 ADR 정본) | [[product/concepts/architecture-decisions]] |
| **CR** | Change Request | 변경 요청. 3-Tier (Minor/Major/Strategic) + 7단계 워크플로 | [[product/concepts/change-management-process]] |
| **RACI** | Responsible·Accountable·Consulted·Informed | 책임 매트릭스 (R 실행 / A 책임 / C 자문 / I 통보) |
| **CTO** | Chief Technology Officer | 기술 총괄 (HITL 재학습 시작 승인 권한) |
| **DevOps** | Development Operations | 개발+운영 통합. Supabase BaaS로 0일 부트스트랩 (ADR-06) |
| **MLOps** | Machine Learning Operations | ML 운영. HITL 루프백 재학습 = ML Ops의 핵심 |
| **Quality Gate** | 품질 게이트 | Readiness Gate. 6대 기준 38 항목 ≥85% (PRD V09 = 97% PASS) | [[product/sources/PRD-Intermediate-Reviews-Meta]] |

## 7. 마케팅·영업

| 약어 | 풀이 | 정의 | 본 위키 정본 |
|---|---|---|---|
| **GTM** | Go-to-Market | 시장 진입 전략 (V09 §10 카피·§13 시퀀스·§14 검증) | [[product/sources/39-VPS-V09-Final]] |
| **CTR** | Click-Through Rate | 클릭률 (랜딩 페이지 ≥15% 가설) |
| **ROI** | Return on Investment | 투자 회수율. **B2B 1,100% ROI** = F9.4 영업 무기 (원아 1명 이탈 600만 ÷ 솔루션 50만) | [[product/concepts/F9.4-ROI-simulator]] |
| **FOMO** | Fear of Missing Out | 소외 불안. **Lock-in #4 메커니즘** (원장 알림장 → 학부모 FOMO) |
| **Wedge** | 쐐기 채널 | 우회 진입 파트너십 (유치원 연합회 + 소아청소년과 + 맘카페 인플루언서) |
| **Trojan Horse** | 트로이 목마 | Win-Win 채널 침투 전략 (원장 1인 = 80가구 일괄 유입) |
| **Switch Trigger** | 전환 트리거 | JTBD 핵심 발견. 3대 인사이트: 객관화 넛지 (Seg A) + 대기 죄책감 (Seg C) + 민원 방어 무기 (Seg D-1) |
| **Lock-in** | 이탈 방어 | 4중 Lock-in (데이터 매몰 + 아동 주도 + 가족 네트워크 + B2B2C FOMO) | [[product/concepts/MVP-feature-spec]] |
| **Land & Expand** | 진입 후 확장 | 무료 진단 (Land) → Basic (Expand) → Premium → 둘째 자녀 |

## 8. 페이즈·실험·리스크

| 약어 | 풀이 | 정의 | 본 위키 정본 |
|---|---|---|---|
| **Phase 0** | MVP 코어 | 6 Epic (F1-a/F1-b/F2/F3-a/F3-b/F12) + REQ-FUNC-001~026 |
| **Phase 1** | 리텐션·바이럴 | 10 Epic (F4~F18) + REQ-FUNC-027~045 + HITL-001~004 |
| **Phase 2** | B2B 스케일업 | 5 Epic (F9-a/F9-b/F9-c/F9-d/F10) + REQ-FUNC-046~061 |
| **EXP-1** | 전환 톤 A/B | DTx 톤 vs 코칭 톤. CVR +2%p (n=500, 2주) |
| **EXP-2** | 리포트 락인 A/B | 발달 예측 시뮬레이션 효과. M3 ≥40% (n=800, 4-8주) |
| **EXP-3** | Zero-touch PoC | B2B 기관 도입 수락률 ≥20% (10 기관) |
| **EXP-4** | 가격 앵커링 A/B | 결제 시작률 +5%p (n=1,000, 2주) |
| **R1~R8** | 8 Risks | 규제(R1) + 품질(R2) + B2B(R3) + 개인정보(R4) + 채널(R5) + Seg B 가설(R6) + Vercel Timeout(R7) + Supabase 무료(R8) | [[product/sources/52-PRD-V09-Quality-Improvement]] § §7.2 |
| **D1~D8** | 8 Descope | Web Speech(D1) + Capacitor(D2) + Zero-touch(D3) + HITL Slack(D4) + PWA(D5) + pgvector(D6) + Edge Runtime(D7) + 키즈노트(D8) | [[product/concepts/MVP-descope-plan]] |
| **P0~P3** | 18 Findings 우선순위 | P0 (CJM 8) + P1 (Lock-in/가정/모니터링 3) + P2 (NFR/HITL/산술/Trace 5) + P3 (NFR 텍스트 2) | [[product/sources/PRD-Intermediate-Reviews-Meta]] § raw 51 |

## 9. 프레임워크 (Strategy)

| 약어 | 풀이 | 정의 | 본 위키 정본 |
|---|---|---|---|
| **Porter's 5F** | 5 Competitive Forces | 산업 매력도 분석 (5축) | [[product/concepts/Porter-5-Forces-Analysis]] |
| **Value Chain** | 가치사슬 분석 | 5경쟁사 3유형 분류 + KSF #2 효과 검증 | [[product/concepts/Value-Chain-Analysis]] |
| **KSF** | Key Success Factor | Top 5 핵심 성공 요인 (진단-교육 퍼널 / 효과 검증 / 비동기 코칭 / 발달 리포트 / 비의료 카테고리) | [[product/concepts/Key-Success-Factors]] |
| **Best-of-Breed** | 최선 통합 | 멀티 LLM 사이클 산물 (Sonnet + Gemini + Merged) | [[product/concepts/multi-llm-workflow]] |

## 10. 도구·외부 의존성

| 도구 | 영역 | 한도/비용 |
|---|---|---|
| **Vercel** | 호스팅 + Cron + Edge + AI SDK + Analytics | Free / Pro $20/月 |
| **Supabase** | DB + Auth + Storage + Realtime + Studio | Free 500MB DB / 1GB Storage / Pro $25/月 |
| **Gemini** | LLM (Vercel AI SDK 통합) | Free 15 RPM / Pro 추후 |
| **Resend** | 이메일 발송 (HITL + F9.4 + F10) | Free 100/일 (3,000/월) |
| **Slack Webhook** | 알림 (HITL + 모니터링) | Free 무제한 |
| **ElevenLabs** | TTS 클로닝 (F11) | Free 10K chars/月 → $5/月 30K |
| **Web Speech API** | 클라이언트 STT (D1 우회) | 무료 (브라우저 내장) |
| **Amplitude** | 코호트 분석 (EXP-2 등) | Free 한도 |
| **Web Push API** | 푸시 알림 (F16) | 무료 |
| **react-pdf** | PDF 생성 (F7 + F9.4) | OSS 무료 |
| **shadcn/ui** | UI 컴포넌트 라이브러리 | OSS 무료 (C-TEC-004) |

## 11. 자주 헷갈리는 약어 ⚠️

| 약어 | 의미 | 헷갈리는 다른 의미 |
|---|---|---|
| **CR** | Change Request (변경 요청) | Customer Relationship (BMC 9-Block 중) — 본 위키에서 변경 요청만 사용 |
| **CS** | Customer Segment (BMC) | Customer Service (CS팀) — 문맥으로 구분 |
| **MR** | Marginal Risk (AOS/DOS) | Merge Request (Git) — 본 위키에서 AOS/DOS 의미만 |
| **ROI** | Return on Investment (재무) | Region of Interest (이미지 처리) — 본 위키 = 재무 |
| **F1, F2, ...** | Feature Epic (F1-a 등) | F1 점수 (분류 모델 평가) — 본 위키 = Feature |

## 12. raw 자료 번호 → 정본 매핑 (자주 인용)

| raw 번호 | 자료 | 정본 페이지 |
|---|---|---|
| **0** | 임상 세션 가이드 | [[clinical/sources/0-언어치료-실제-세션-상세가이드]] |
| **13** | 시장 규모 (TAM 보수 정의) | [[product/sources/13-Market-Sizing]] |
| **24-32, 39** | VPS V01-V09 | [[product/concepts/VPS-evolution]] |
| **40-54** | PRD V01-V10 | [[product/concepts/PRD-evolution]] |
| **51** | V08 Quality Review (18 Findings) | [[product/sources/PRD-Intermediate-Reviews-Meta]] § 4 |
| **52** | V0.9 Quality Improvement (자체 반영) | [[product/sources/52-PRD-V09-Quality-Improvement]] |
| **53** | V09 Final Readiness Gate (97% PASS) | [[product/sources/PRD-Intermediate-Reviews-Meta]] § 5 + [[product/concepts/change-management-process]] |
| **54** | PRD V10 Final | [[product/sources/54-PRD-V10-Final]] |
| **55-67** | SRS V01-V06 | [[product/concepts/SRS-evolution]] |
| **65** | SRS V06 Final | [[product/sources/65-SRS-V06-Final]] |
| **67** | MVP Descope | [[product/concepts/MVP-descope-plan]] |

## 사용 가이드

### 신규 합류 개발자 온보딩 순서

1. **본 Glossary** 한 번 훑기 → 약어 익숙해지기
2. [[product/concepts/MVP-feature-spec]] § 21 Epic 정본 읽기 (제품 그림)
3. [[product/concepts/requirements-traceability-matrix]] RTM (전체 매핑 인덱스)
4. [[product/sources/65-SRS-V06-Final]] § REQ-FUNC 61 (+HITL 4) 정독
5. [[product/concepts/architecture-decisions]] § 15 ADR 읽기 (왜 이렇게 결정?)
6. [[product/concepts/task-breakdown-overview]] § 88 Task 매핑 (Sprint 1 코어 8)

### 임상 자문가 온보딩 순서

1. 본 Glossary § 임상 (Clinical) — DTx 회피 영역 + MVP 핵심 영역 구분
2. [[clinical/concepts/한국-언어치료-트랙비교]] (트랙 1 vs 2 매핑)
3. [[clinical/entities/U-TAP]] + [[clinical/entities/REVT]] + [[clinical/entities/PRES]] (3 평가 도구)
4. [[product/concepts/HITL-system-flow]] (전문가 운영 모델)
5. [[product/entities/persona-황보름]] + [[product/entities/persona-강지방]] (포용 설계 페르소나)

### B2B 영업팀 온보딩 순서

1. 본 Glossary § 마케팅·영업 (GTM·ROI·FOMO·Wedge)
2. [[product/entities/persona-오한솔]] (Seg D-1 직접 타깃)
3. [[product/concepts/F9.4-ROI-simulator]] (1,100% ROI 영업 무기)
4. [[product/sources/39-VPS-V09-Final]] § §13-2 영업 시퀀스
5. [[product/concepts/MVP-descope-plan]] § D8 (키즈노트 우회)

## 출처

- raw/53_PRD_V09_Final_Readiness_Gate.md § 선택적 보강 § "용어 사전 (Glossary)" 권고 (Low)
- 본 위키 30+ 페이지의 약어·용어 통합 (참조 페이지 표 형식)

## 관련 product 페이지

- [[product/concepts/change-management-process]] — raw 53 보강 권고 1건 (변경 관리)
- [[product/concepts/requirements-traceability-matrix]] — RTM 정본 (REQ-FUNC ID 빠른 조회)
- [[product/concepts/MVP-feature-spec]] — 21 Epic + Phase 0/1/2
- [[product/concepts/architecture-decisions]] — 15 ADR 정본
- [[product/sources/PRD-Intermediate-Reviews-Meta]] — 5단계 PRD 진화 사이클

## 보강 필요

- 도메인 신규 약어 추가 (Phase 1+2 진입 시 ML Ops 운영 용어 확장).
- 용어별 영문 표준 표기 (논문·임상 보고서 인용 시 영문 통일).
- 다문화 가정 ([[product/entities/persona-이미란]]) 대상 영문 Glossary 별도 후보.
- B2B PoC 단계 신규 용어 (PoC 메트릭 + Cohort 분석 용어).

---

✅ raw 53 § 선택적 보강 권고 2건 모두 완료:
- [[product/concepts/change-management-process]] (31차) + 본 페이지 (33차)
- raw 53 보강 후속 작업 종결.
