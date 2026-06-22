# Software Requirements Specification (SRS V08) — Two-Track Realignment (2트랙 비대칭)

> **문서 ID**: SRS-001 V08 (= SRS V07 Merged Master 구조 계승 + 2트랙 비대칭 재정렬)
> **base**: [`docs/65_SRS_V07_Merged_Master_Final.md`](65_SRS_V07_Merged_Master_Final.md) (발음 단일트랙 정본, 95 REQ + 16 ADR + 14 Entity)
> **상위 근거**: [`docs/VPS_V10_TwoTrack_Realign.md`](VPS_V10_TwoTrack_Realign.md) · [`docs/realignment/00_2track_realignment_blueprint.md`](realignment/00_2track_realignment_blueprint.md) (§3 트랙정의 · §6 SRS 스펙 · §7 근거맵 · §8 게이트) · PRD V11(2트랙 재정렬판, 작성 예정)
> **작성일**: 2026-06-22
> **상태**: 신규 정본 — 트랙A(발음 V07 계승) 위에 트랙B(문해 연습-only)를 **firewall 분리**로 신설. SRS V07 은 발음 단일트랙 정본으로 보존(불변 이력 아님 — 발음 REQ 의 source of truth 로 계속 참조). V01~V07 raw 는 불변 이력.

---

## 🔷 트랙 비대칭 선언 (본 SRS 의 최상위 불변 원칙)

> **"트랙A(발음)는 표준화 규준으로 또래를 비교해 '확인'하고, 트랙B(문해)는 점수·밴드·판정 없이 '놀이·연습'한다 — 측정 vs 측정이 아니다."**

| 항목 | **트랙A — 발음·발화 발달 "확인"** | **트랙B — 읽기·말 "놀이·연습"** |
|---|---|---|
| 연령 도메인 | 만 2~7세 (24~84개월, `diagnose` 상한) | 만 2~12세 (24~144개월, `lib/literacy/stages.ts`) |
| 산출 | 또래 비교 점수·백분위·추이 (**확인 허용**) | **engagement 만** (활동 횟수·활동일), `referenceBand=null` |
| 임상 토대 | 표준화 규준 (U-TAP PCC 절단점, SELSI ±SD) | 발달 단계·선행지표·중재 위계 (규준 차용 ✗) |
| 핵심 동사 | 확인 / 비교 / 추이 | 놀이 / 연습 / 함께 / 단계에 맞춰 |
| 출시 검증 상태 | 표준화 규준 보유 → 확인 출시 가능 | **출시 밴드 0건**(전 단계 `bandShippable=false`) → 연습-only 유지 |

⚠️ **동사 분리 강제(시스템 불변)**: "확인(probe)·측정·평가·준비도 평가·스크리닝"은 **발음(트랙A) 전용**. 문해(트랙B)에는 절대 적용 금지. 트랙B 산출 명칭은 "활동률 / engagement"로만 — "완수율 / 미션"이 아니다. 본 불변은 §1.5 CON-06 + §4.1 REQ-LIT firewall + §10 KOPLAC 자문 범위에서 강제된다.

---

# §0. Revision History — V07 → V08

## 0.1 V08 핵심 변경 (2트랙 비대칭 재정렬)

V08 은 V07(발음 단일트랙)을 base 로, 라이브 문해 트랙(CR-2026-009, 만 2~12세, 14게임, 2026-06-22 공개 런치)을 **측정 REQ 에서 분리(firewall)** 하여 통합한다.

1. **§1.1 Purpose 재작성** — "영유아 언어 발달 지연 스크리닝" 단일 패러다임 → **2트랙 비대칭**("발음 확인" + "문해 놀이·연습"). '지연/스크리닝' 프레임 제거.
2. **§1.2 Scope** — In-Scope 에 트랙B(문해 놀이 콘텐츠) 행 신설. Out-of-Scope 에 **"문해 측정·등급·판정 + 학습장애·난독·읽기지연·지체 라벨"** 명문.
3. **§1.5 CON-06 신설** — "문해 연습-only 톤·금칙어 금지·`bandShippable=false` 동안 참고밴드 미노출" 시스템 제약(CON-04 의 문해 확장).
4. **§4.1 FR firewall** — V07 의 측정성 literacy REQ(`REQ-FUNC-CL-08~12`)를 **`REQ-LIT-NN`(연습 콘텐츠) 네임스페이스로 신설·분리**. 14게임 ↔ S0~S4 ↔ 플래그 ↔ 산출=활동 완료/노출만. CL-12 의 "만 5-7세 조건부·만 2-4세 미노출"이 `stages.ts` S0(만 2~4세 활성)과 모순 → 정정.
5. **§10 KOPLAC** — 트랙B 자문 범위를 "**채점/판정 아님 — 활동 난이도 위계·연령 적합성·CON-04 톤**"으로 한정.
6. **북극성** — 트랙A `W-AUR ≥ 60%`(불변) + 트랙B `W-LER`(주간 문해 활동률, engagement) 보조지표 신설(옵션 C 지향·A 1차).

## 0.2 V07 → V08 변경 매트릭스

| 영역 | V07 (발음 단일트랙) | V08 (2트랙 비대칭) | 변화 |
|---|---|---|---|
| §1.1 Purpose | "발달 지연 + 즉각 스크리닝" 단일 패러다임 | **2트랙 비대칭**(확인 vs 놀이), '지연/스크리닝' 제거 | 재작성 |
| §1.2 Scope | 발음 In/Out, 의료 진단 제외 | + 트랙B In-Scope 행 + **문해 측정·등급·판정·금칙어 라벨 Out** | 확장 |
| §1.3 Definitions | W-AUR + HITL 등 | + **트랙A/B · 연습-only · bandShippable · W-LER · engagement · 음운인식 · 해독 · RAN · SVR** | +9 용어 |
| §1.5 Constraints | CON-01~05 | **+ CON-06**(문해 연습-only 톤·금칙어·밴드 미노출) | +1 CON |
| §4.1 FR (literacy) | `REQ-FUNC-CL-08~12` = **측정성**(F1-a/F4 흡수, "음운인식 축 점수 산출", "만 5-7세 조건부") | **`REQ-LIT-01~14` 신설**(연습 콘텐츠, 14게임↔S0~S4↔플래그, 산출=활동 완료/노출) — CL-08~12 와 firewall 분리 | 신규 네임스페이스 |
| §4.1 모순 정정 | CL-12 ② "만 5-7세 조건부 노출 / 만 2-4세 미노출" | `stages.ts` S0(만 2~4세 활성)·`LITERACY_AGE_MIN_MONTHS=24` 와 모순 → **제거·정정**(연령 라우팅 = `isAgeEligible`) | 결함 정정 |
| §10 KOPLAC | 발음 채점 규칙 자문(13항목) | + **트랙B 자문 = 채점/판정 아님, 난이도 위계·연령 적합성·CON-04 톤** | 범위 한정 |
| 북극성 KPI | W-AUR ≥ 60% 단일 | **W-AUR(불변) + W-LER(engagement 보조)** | 이원화(옵션 C 지향) |

## 0.3 V07 자산의 처분 (firewall 원칙)

> ⚠️ **핵심 firewall 원칙**: V07 의 `REQ-FUNC-CL-08~12`(읽기 선행지표를 **발음 진단 엔진 F1-a/F4 의 채점 축으로 흡수**한 측정성 요구)는 **트랙A(발음 진단 정밀도) 맥락에 한해서만 의미**가 있으며, 라이브 문해 트랙(트랙B `/literacy`, 연습-only)과는 **별개**다. V08 은 양자를 혼동하지 않도록 분리한다.

| V07 REQ | 성격 | V08 처분 |
|---|---|---|
| `REQ-FUNC-CL-08~10` (음운인식/해독/RAN 채점 축, F1-a/F4) | **측정성**(발음 진단 엔진 채점) | 트랙A 영역으로 **격리** — KOPLAC 채점 자문 게이트 유지(§10). **트랙B `/literacy` 14게임과 무관**. 본 V08 §4.1 트랙B 에서는 미사용. |
| `REQ-FUNC-CL-11` (F15 챗봇 추론 4수준) | 트랙A F15(발화 유도) 콘텐츠 위계 | 트랙A 유지. 트랙B 연습 콘텐츠 위계는 `REQ-LIT` 가 별도 정의. |
| `REQ-FUNC-CL-12` (literacy 원본성·연령게이트·정량 명세) | cross-cutting (일부 결함) | ① 원본성(비복제) = **CON-06 + REQ-LIT-13 으로 승계**, ② "만 5-7세 조건부 노출 / 만 2-4세 미노출" = `stages.ts` 와 **모순 → 폐기**(정정), ③ 난이도 위계·아이템 풀 명세 = `REQ-LIT` 로 승계, ④ 법률검토 `OPS-LIT-01` = 2026-06-22 완료(게이트 해소). |

---

# §1. Introduction

## 1.1 Purpose (V08 재작성 — 2트랙 비대칭)

본 SRS 는 **부모용 2트랙 비대칭 아동 발달 가이드 서비스**(DTx 아님, 의료 보조 도구)의 소프트웨어 요구사항을 ISO/IEC/IEEE 29148:2018 표준에 따라 정의한다. 본 시스템은 **서로 다른 두 임상 토대**에 근거한 두 트랙을 **비대칭으로** 제공한다.

- **트랙A — 발음·발화 발달 "확인"** (만 2~7세, 24~84개월): 표준화 규준(U-TAP·SELSI)에 근거해 또래 비교로 발음 발달 위치를 **확인**한다. AI 기반 분석 + 전문가 감수(HITL)로 부모가 "지금 무엇을 집에서 함께하면 되는지" 방향을 잡게 한다. (← V07 의 발음 단일트랙 정본을 계승하되 '지연 스크리닝' 프레임을 '발달 확인'으로 재프레임.)
- **트랙B — 읽기·말 "놀이·연습"** (만 2~12세, 24~144개월): 출시 가능한 임상 참고밴드가 0건(전 단계 `bandShippable=false`)이므로, **점수·밴드·또래백분위·판정 없이** 발달 단계에 맞춘 읽기·말 **놀이를 매주 꾸준히 이어가게** 한다. 산출은 engagement(활동 횟수·활동일)뿐이다.

> **핵심 선언**: **문해는 진단하지 않는다(스크리닝하지 않는다). 연령에 맞는 읽기·말 놀이를 매주 이어가게 한다.** 트랙B 의 가치는 "측정 충격"이 아니라 "연습 지속"이다. 본 SRS 전반에서 '지연(delay)'·'스크리닝(screening)'·'준비도 평가'는 **트랙A(발음)에 한정**되며, 트랙B 에는 적용되지 않는다.

### Design Philosophy — 트랙별 가치 동력 (비대칭)

| 트랙 | 가치 동력 | 정량 목표(북극성) |
|:---|:---|:---|
| **트랙A 발음** | 발달 확인 충격 → 가이드 → 추이 (측정 정당) | **W-AUR ≥ 60%** (주간 발음 미션 완수율, 불변) |
| **트랙B 문해** | 연습 지속 → 습관 → engagement (측정 부재) | **W-LER** (주간 문해 활동률, engagement) — baseline 축적 후 동격 승격 |

### Business Context

- **트랙A TAM**: 국내 만 2~7세 영유아 가구 (~150만, V07 계승) / SAM ~22.5만 / SOM ~15만.
- **트랙B 모집단**: 학령기(만 8~12세) 포함 만 2~12세로 확장 — 발음(≤84개월)보다 넓다. 가치 = 측정 수요가 아닌 **연습 지속**(engagement). 만 2~4세는 정상 규준이 빈약하여 연습-only 가 임상적으로 정당(§7 근거).
- **수익 모델**: Freemium → Basic ₩35,000/월 → Premium ₩50,000/월 → B2B ₩500,000/년 (트랙A 중심). 트랙B 재결제 동력 = 활동 습관의 지속(점수 증명 아님).

## 1.2 Scope (V08 — 2트랙)

### In-Scope

| 영역 | 트랙 | 연령 도메인 | 설명 | 산출 | Phase |
|:---|:---:|:---|:---|:---|:---:|
| AI 발음 발달 확인 | A | 24~84개월 | 음성 기반 3축 분석 + 또래 백분위 확인 리포트 | 점수·백분위·추이 | P0 |
| B2C 발음 홈케어 | A | 24~84개월 | 맞춤 데일리 미션 + 적응형 난이도 + 보상 | 미션 완수(W-AUR) | P0 |
| B2C 발음 리텐션 | A | 24~84개월 | 주간 추이 리포트 + 공유 + 예측 | 시계열 추이 | P1 |
| HITL 품질관리 | A | — | 전문가 비동기 감수(48h SLA) | 보정 점수 | P1 |
| B2B 연동 | A | — | Zero-touch 수집 + 원장 대시보드 + 전자서명 | 발달 확인 리포트 | P2 |
| **읽기·말 놀이·연습** ⭐ | **B** | **24~144개월** | **5단계 사다리(S0~S4) 라우팅 + 14게임 연습 콘텐츠** | **engagement 만**(`referenceBand=null`) | **라이브(CR-009)** |
| **문해 주간 활동 리포트** ⭐ | **B** | **24~144개월** | **주간 활동 횟수·활동일·단계별·놀이별 분포** | **engagement 만**(점수·등급 0) | **라이브** |

> ⚠️ **트랙B In-Scope 경계 명문(ADR-04 L88 스코프 충돌 해소)**: **학령기(만 8~12세) 문해 _놀이 콘텐츠_ 는 In-Scope**다(CR-2026-009 학령기 전면확장이 ADR-04 영유아-only 스코프를 상향대체). 단, 문해의 **점수화·학년 판정·고학년 읽기이해 _측정_** 은 여전히 Out-of-Scope(아래). 즉 "학령기 놀이=In / 학령기 측정=Out"으로 경계를 명문화하여 충돌을 명시 해소한다(암묵 화해 금지).

### Out-of-Scope

| 제외 항목 | 제외 사유 |
|:---|:---|
| 의료적 진단/장애 판정 (양 트랙) | DTx 인허가 규제 리스크 (R1, CON-04) |
| **문해 점수·밴드·또래백분위 산출** ⭐ | 출시 가능 임상 규준 0건 — `bandShippable=false`(연습-only, CON-06) |
| **문해 정상/위험 판정·심각도·학년 판정·준비도 평가** ⭐ | 트랙B 는 "측정/평가/확인(probe)" 미적용 — 발음 전용(CON-06) |
| **문해 고학년 읽기이해 _측정_** ⭐ | 놀이 콘텐츠는 In-Scope 이나 측정·점수화는 Out (ADR-04 L88 경계) |
| **"학습장애·난독·읽기장애·지연·지체" 라벨** (문해 맥락) ⭐ | CON-04 추가 금칙어 — 외부 임상 KB 라벨 직수입 금지(CON-06) |
| 실시간 원격 진료/텔레메디슨 | 의료법 저촉 + MVP 복잡도 |
| 교정 훈련에 부모 음성 클로닝 적용 (트랙A) | 윤리적 딥페이크 리스크 (REQ-FUNC-037, ADR-09) |
| 일반 성인 발음 교정 | 타겟 세그먼트 희석 |
| 오프라인 센터 예약/결제망 연동 | 오프라인 인프라(EMR) 의존성 분리 |

## 1.3 Definitions, Acronyms, Abbreviations (V07 계승 + V08 신규)

> §9 Glossary(V07 12 카테고리)에 더해 V08 트랙B 용어를 추가한다.

| 용어 | 정의 |
|:---|:---|
| **W-AUR** | Weekly Active User Rate. 주간 **발음 미션 완수율**. 트랙A 북극성 KPI(불변). 분자 = 그 주 발음 미션 완료 ≥ 4 인 distinct 사용자 / 분모 = 진단 ∪ 미션 활성 distinct 사용자 (`lib/reports/waur-trend.ts`, `W_AUR_MIN_MISSIONS=4`·`W_AUR_TARGET_RATE=0.6`) |
| **W-LER** ⭐ | Weekly Literacy Engagement Rate. 주간 **문해 활동률(engagement)**. 트랙B 보조지표(신설). **완수율 아님** — 활동일·활동 횟수 기반. 임계 = lib 상수 1곳(`W_LER_MIN_DAYS`/`W_LER_MIN_SESSIONS`)에 박음. baseline 축적 후 트랙A 와 동격 북극성 승격(옵션 C) |
| **트랙A / 트랙B** ⭐ | 트랙A = 발음·발화 발달 "확인"(만 2~7, 표준화 규준). 트랙B = 읽기·말 "놀이·연습"(만 2~12, 연습-only) |
| **연습-only (practice-only)** ⭐ | 트랙B 의 산출 원칙 — 점수·밴드·또래백분위·판정·심각도·"측정/평가/확인(probe)" **0건**, engagement(`referenceBand=null`)만 |
| **engagement** ⭐ | 트랙B 산출 단위 — 활동 횟수·활동일(놀이 완료 = 활동 1건). raw 점수는 놀이마다 의미가 달라 교차 합산 무의미 |
| **bandShippable** ⭐ | `stages.ts` 단계 메타 플래그. `false` = 출시 가능 임상 규준 밴드 없음 → 참고밴드(display) 미노출. **전 단계(S0~S4) `false`**(2026-06-22 규준검증 결과 확정) |
| **음운인식 / 해독 / RAN / SVR** ⭐ | 음운인식(phonological awareness) / 해독(decoding, 자소-음소 대응) / RAN(빠른 자동 이름대기) / SVR(Simple View of Reading = 읽기이해 = 해독 × 언어이해). 트랙B 놀이의 **구인(영감)**일 뿐 측정 척도가 아니다 |
| **HITL** | Human-in-the-Loop. AI + 전문가 하이브리드 품질 보증 (트랙A) |
| **CON-04 / CON-06** | 의료 금칙어 배제(공통) / 문해 연습-only 톤·금칙어·밴드 미노출(트랙B, §1.5) |

## 1.4 References (V08)

- [`docs/65_SRS_V07_Merged_Master_Final.md`](65_SRS_V07_Merged_Master_Final.md) — SRS V07(트랙A 발음 REQ 의 source of truth, V08 의 base 구조)
- [`docs/VPS_V10_TwoTrack_Realign.md`](VPS_V10_TwoTrack_Realign.md) — VPS V10(2트랙 가치제안, V08 상위 근거)
- [`docs/realignment/00_2track_realignment_blueprint.md`](realignment/00_2track_realignment_blueprint.md) — 2트랙 재정렬 청사진(§3·§6·§7·§8)
- PRD V11(2트랙 비대칭 재정렬판) — RTM 상호 정합(작성 예정)
- 코드 source of truth: [`lib/literacy/stages.ts`](../lib/literacy/stages.ts) · [`lib/literacy/registry.ts`](../lib/literacy/registry.ts) · [`lib/reports/literacy-weekly.ts`](../lib/reports/literacy-weekly.ts) · [`lib/reports/waur-trend.ts`](../lib/reports/waur-trend.ts)
- [`Speech-Therapy_Workbase/wiki/product/concepts/SRS-evolution.md`] — SRS 진화 타임라인(V08 행 추가)
- [`Speech-Therapy_Workbase/wiki/product/concepts/requirements-traceability-matrix.md`] — RTM
- 임상 근거(.ingest/txt 원문 대조분): S003(음운인식 위계)·S090/S133(SVR·음운처리)·S113·S160 — §7 근거맵
- AGENTS.md §1·§2.1 CON-04 (2트랙 비대칭 정체성 + 문해 금칙어)
- PIPA / 의료기기법 / 약관규제법 (§12 V07 계승) — 약관·처리방침 법무 재확인 = 2026-06-22 사용자 완료(게이트 해소)

## 1.5 Constraints, Assumptions & Dependencies

### 1.5.1 Architectural Constraints (V07 CON-01~05 + V08 CON-06)

V07 의 CON-01~05(§6.8 ADR-01~16 연계)를 계승하고, 트랙B 연습-only 를 강제하는 **CON-06 을 신설**한다.

| ID | 제약 사항 | 시스템 영향 | 근거 |
|:---|:---|:---|:---|
| **CON-01** | Zero-touch 수집 전면 도입(교사 능동 조작 배제) | 엣지 VAD + 버퍼링 | ADR-01, R3 |
| **CON-02** | HITL 비동기 감수 필수(Confidence < 70 → 큐) | 어드민 뷰 + 큐 할당(트랙A) | ADR-02, R2 |
| **CON-03** | 원본 음성 ≤ 7일 폐기 | 벡터화 + audio-cleanup cron(트랙A) | ADR-03, R4 |
| **CON-04** | **의료 용어 하드코딩 배제(공통)**: "치료/진단/장애" 0건. **문해(트랙B) 추가 금칙어 "학습장애·난독·읽기장애·지연·지체" 0건** — 대안: 발음="발달 확인", 문해="읽기·말 놀이/연습", 공통="발달 가이드"/"어려움" | FE 금칙어 정규식 스캐너 + 자동화 QA | ADR-04, R1 |
| **CON-05** | PIPA 5중 가드(미동의 인증·익명 user 의 진단/미션 차단) | ConsentRedirectGate + Server Action 가드 | ADR-16 |
| **CON-06** ⭐ | **문해(트랙B) 연습-only 톤 + 측정 동사 금지 + 밴드 미노출** (V08 신규) | 아래 §1.5.1a 세부 강제 | 청사진 §8, `stages.ts` 임상 게이트, AGENTS.md §2.1 |

### 1.5.1a CON-06 세부 (트랙B 연습-only 시스템 강제)

> CON-06 은 트랙B 가 **"측정 vs 측정"이 아님**을 시스템 레벨에서 보장하는 제약이다. CON-04(금칙어)의 트랙B 확장 + 측정성 카피·산출의 전면 금지를 합친다.

1. **측정 동사 금지**: 문해 UI·카피·API 응답에 "측정·평가·확인(probe)·준비도 평가·스크리닝·점수·등급·밴드·또래백분위·정상/위험·심각도" **0건**. 동사는 "놀이/연습/함께/단계에 맞춰"만. (⚠️ **"읽기·말 발달 _확인_" 표기 금지** — "확인(probe)"은 발음(트랙A) 전용.)
2. **산출 = engagement 만**: 트랙B 산출은 활동 횟수·활동일(`aggregateLiteracyWeekly` → `totalSessions`·`activeDays`·`byStage`·`byGame`)뿐. `referenceBand=null`. raw 점수(정답수·완료시간 ms·완료 1)는 놀이마다 의미가 달라 교차 합산·정확도 합산 금지.
3. **`bandShippable=false` 동안 참고밴드 미노출**: `stages.ts` 전 단계(S0~S4) `bandShippable=false` → 참고밴드(display)를 부모에게 **노출하지 않는다**. 플립 경로 = KOLRA·BASA-R 정식 매뉴얼 규준표 확보 또는 NISE 2026 표준화 최종규준 발표 시에만 재검토(그 전까지 연습-only 유지 확정).
4. **학년/단계 라벨 대신 놀이명**: stage(S0~S4)·학년 라벨은 **구인 분류·표시용**이며, 부모·자녀에게는 **놀이명만** 노출(clin-2). 연령 라우팅은 stage 태그가 아니라 게임 자체 연령게이트(`isAgeEligible`)로 한다.
5. **연령 도메인 분리**: 발음 규준 ≤84개월 / 문해 24~144개월(`LITERACY_AGE_MIN/MAX_MONTHS=24/144`) — 서로 오염 금지. 트랙A 의 또래 백분위 프레임이 트랙B 로 전이되면 CON-06 위반.
6. **비복제**: NISE-B·ACT/KOLRA/REVT/U-TAP 의 문항·지문·규준·명칭 복제 금지 — 구인·발달 사실·중재 위계만 영감(REQ-LIT-13).
7. **(raw 데이터 불변 가드)**: raw 점수·HITL·escalation·저장은 본 연습-only 제약과 무관한 별도 활동 — **연습-only 는 display 레이어에만 적용**(임상 채점 보정 원칙과 정합). 채점/저장 wiring 시 escalation 회귀 금지.

### 1.5.2 Risk Mitigation (V07 R1~R7 계승 + V08 R8)

| Risk ID | 리스크 | 영향도 | 완화 전략 |
|:---|:---|:---:|:---|
| **R1** | 서비스가 의료행위로 취급 | 🔴 High | Disclaimer 강제 + 비의료 포지셔닝 (ADR-04 + CON-04) |
| **R8** ⭐ | **측정 프레임 회귀**(트랙A 백분위·"확인" 프레임이 트랙B 로 전이 → 연습-only 위반) (V08 신규) | 🔴 High | **CON-06 시스템 강제** + 외부 KB 임상 라벨 직수입 금지 + 북극성 옵션 C(통합 단일 rate 회피) + 정량치 표면화 전 .ingest 원문 대조 |
| R2~R7 | (V07 계승: STT 실패 / 교사 거부 / 음성 유출 / API 변경 / Seg B 검증 / PIPA) | — | V07 §1.5.2 참조 |

### 1.5.3 Assumptions & Dependencies (V07 계승 + V08 신규)

| ID | 가정/의존성 | 검증/대안 |
|:---|:---|:---|
| **A5** ⭐ | 트랙B engagement(연습 지속)가 점수 증명 없이도 리텐션을 견인 (V08 신규) | W-LER baseline 축적 후 실측(옵션 A 1차) |
| **A6** ⭐ | 만 2~4세 정상 규준 빈약 상태에서 연습-only 가 임상·법무상 정당 (V08 신규) | 약관·처리방침 법무 재확인 = 2026-06-22 완료(게이트 해소) |
| **D7** ⭐ | 트랙B 14게임 활성 플래그 상태(`LITERACY_*_ENABLED`)가 허브 노출을 게이팅 (V08 신규) | `isEnabled()` / `enabledLiteracyGames()` — 플래그 off 게임은 허브 제외 |
| A1~A4, D1~D6 | (V07 계승) | V07 §1.5.3 참조 |

---

# §2. Stakeholders (V07 계승 + V08 트랙B 정합)

V07 §2 의 11 stakeholder(Seg A/C/B/D-1/D-2 + HITL 1급/2급 + System Admin + IRB + 임상 자문위원 + 변호사)를 계승하고, 트랙B 페르소나·자문 범위를 정합한다.

## 2.1 V08 트랙B 정합 사항

- **트랙B 신규 페르소나(상위 = VPS V10 §1, PRD V11 §3)**: ① 학령전 읽기준비형(만 5~7), ② 학령기 읽기 따라가기형(만 8~12). 두 페르소나의 여정 종착 = **놀이 지속**(판정·등급·또래 위치 확인 아님). persona frontmatter `track: A|B|both` 태그.
- **임상 자문위원(KOPLAC) — 트랙별 자문 범위 비대칭(§10)**:
  - 트랙A = **발음 채점 규칙 검증**(음운변동 false positive, 발달 위계 연령 보정, 표준화 절단점 정합).
  - 트랙B = **채점/판정 아님** — 활동 **난이도 위계·연령 적합성·CON-04 톤**만 자문. (트랙B 자문은 "점수 규준"을 만들지 않는다 — 만들면 연습-only 위반.)

---

# §3. System Context and Interfaces (V07 계승 + 트랙B 표면)

V07 §3(UC·Component·External·Client·API·Sequence)을 계승. 트랙B 추가 표면만 명시한다.

## 3.1 트랙B 추가 표면 (V08)

| 요소 | 책임 | source of truth |
|:---|:---|:---|
| `/literacy` 허브 | 활성(플래그 on) 놀이만 카드 노출(미공개 누출 0) | `enabledLiteracyGames()` |
| `/literacy/start` | 월령(24~144) → 단계(S0~S4) → **실제 적격 놀이** 라우팅(dead-end 0) | `enabledGamesForAge(ageMonths)` |
| `/literacy/<slug>` (14게임) | 개별 놀이 플레이 → 완료 시 활동 1건 기록 | `LITERACY_GAMES` (registry.ts) |
| 주간 리포트 '문해력 활동' 축 | 활동 횟수·활동일·단계별·놀이별 분포 표시(점수·등급 0) | `aggregateLiteracyWeekly` (literacy-weekly.ts) |

> 트랙B 는 발음 진단 엔진(F1-a)의 bolt-on 이 아니라 **독립 표면**이다. 연령 도메인(24~144개월)이 발음 diagnose(≤84개월)와 분리되어 있어 상호 오염 0(CON-06 §5).

---

# §4. Specific Requirements

## 4.0 트랙별 FR firewall 원칙

> **firewall 선언**: 트랙A 의 측정성 REQ(`REQ-FUNC-NNN`, `REQ-FUNC-CL-NN`)와 트랙B 의 연습 콘텐츠 REQ(`REQ-LIT-NN`)는 **네임스페이스로 분리**된다. 트랙B REQ 는 어떤 경우에도 점수·밴드·판정·또래비교를 산출 책임으로 갖지 않는다(CON-06). 양 네임스페이스는 산출 의미가 다르므로 RTM 에서도 별도 행으로 추적한다.

## 4.1 트랙A — 발음 발달 확인 (V07 계승)

V07 §4.1 의 발음 REQ 전체(Phase 0 26 + Phase 1+ 36 + HITL 7 + Phase 2 16 + NF 35 + `REQ-FUNC-CL-01~15`)를 **그대로 계승**한다. V07 이 트랙A 의 source of truth 다. V08 의 변경은 다음 2가지뿐:

1. **카피 재프레임(CON-04)**: 발음 결과 카피의 '진단/스크리닝/지연'을 '발달 확인'으로(V07 의 CR-2026-004 정합 — result 페이지 "진단"→"발음 확인" 이미 반영).
2. **`REQ-FUNC-CL-08~12`(읽기 선행지표) 의 격리**: 이들은 **발음 진단 엔진(F1-a/F4)의 채점 축**으로 도입된 측정성 요구로, **트랙A 정밀도 맥락에 한정**된다(§0.3). 라이브 문해 트랙(`/literacy` 14게임)과는 **무관**하며, 트랙B 요구는 아래 §4.2 `REQ-LIT` 가 별도로 정의한다. CL-08~10 채점 wiring 은 KOPLAC 채점 자문 게이트(§10) 유지.

## 4.2 트랙B — 읽기·말 놀이·연습 (REQ-LIT 신설 · 연습-only)

> **ID 규칙**: 측정성 `REQ-FUNC-CL-NN`(발음 채점 정밀도)과 **충돌·혼동을 피하기 위해** 트랙B 연습 콘텐츠는 독립 네임스페이스 **`REQ-LIT-NN`** 을 사용한다(CL = Clinical precision/측정 ↔ LIT = Literacy practice/연습).
> **source of truth**: `lib/literacy/registry.ts`(`LITERACY_GAMES` 실측 **14개**) + `lib/literacy/stages.ts`(5단계 S0~S4) + `lib/reports/literacy-weekly.ts`(engagement 집계).
> **공통 AC(전 REQ-LIT 적용)**: 산출 = **활동 완료/노출만**(`referenceBand=null`). 점수·밴드·또래백분위·판정·심각도 산출 **0건**. 단계명·놀이명·소개에 금칙어("치료/진단/장애" + "학습장애·난독·읽기장애·지연·지체") **0건**(CON-04/CON-06).

### 4.2.A 라우팅·게이팅·산출 (트랙B 기반 REQ)

| REQ ID | 요구사항 | source | AC |
|:---|:---|:---|:---|
| **REQ-LIT-01** ⭐ | **연령 도메인 분리**: 문해 연령 도메인 = 24~144개월(만 2~12세), 발음 diagnose(≤84개월)와 독립. 도메인 밖 입력은 라우팅 null | `stages.ts` `LITERACY_AGE_MIN/MAX_MONTHS=24/144`, `isLiteracyAgeEligible` | Given: ageMonths, When: 24~144 내, Then: 단계 매핑 / 밖이면 null. 발음 84 상한과 교차 오염 `0건` |
| **REQ-LIT-02** ⭐ | **5단계 사다리(S0~S4) 매핑**: 월령 → 단계(단조·비중첩·연속 분할, 라우팅 결정성). 단계는 **구인 분류·표시용** | `stages.ts` `stageForAgeMonths` (S0 24~59 / S1 60~83 / S2 84~107 / S3 108~131 / S4 132~144) | 결정적 순수 함수 — 동일 월령 → 동일 단계. 경계 인접 구인은 게임 연령게이트가 처리 |
| **REQ-LIT-03** ⭐ | **연령 라우팅 = 게임 자체 연령게이트**: `/literacy/start` 는 stage 태그가 아니라 게임 `isAgeEligible` 로 적격 놀이를 라우팅(dead-end 0, 직접진입과 대칭) | `registry.ts` `enabledGamesForAge(ageMonths)` | Given: 월령, When: start 진입, Then: 적격·활성 놀이만 반환. stage-route 와 직접진입 대칭(dead-end `0건`) |
| **REQ-LIT-04** ⭐ | **플래그 게이팅**: 각 게임 default off, 활성 플래그 on 일 때만 허브 노출. 미공개 콘텐츠 누출 0 | `registry.ts` `isEnabled()` / `enabledLiteracyGames()` | Given: 플래그 off 게임, When: 허브 렌더, Then: 목록 제외(노출 `0건`) |
| **REQ-LIT-05** ⭐ | **산출 = engagement 만**: 주간 집계가 `totalSessions`·`activeDays`·`byStage`·`byGame` 만 산출. **점수 등급·판정·임상밴드 미산출** | `literacy-weekly.ts` `aggregateLiteracyWeekly` | Given: 한 주 LiteracyResult 행, When: 집계, Then: 활동량 4필드만 반환. 0건이면 null(카드 미렌더). 점수·밴드 필드 `0개` |
| **REQ-LIT-06** ⭐ | **참고밴드 미노출(bandShippable=false)**: 전 단계 `bandShippable=false` 동안 참고밴드(display) 미노출. raw 점수 교차 합산 금지 | `stages.ts` 전 단계 `bandShippable=false` | Given: 임의 단계, When: 부모 표시, Then: 참고밴드·점수밴드 렌더 `0건`. `referenceBand=null` 검증 |
| **REQ-LIT-07** ⭐ | **놀이명 노출(clin-2)**: 부모·자녀에게 학년/단계(stage) 라벨 대신 **놀이명**만 노출 | `registry.ts` `title`(자녀 친화), `stages.ts` `title`(부모 친화) | Given: 놀이 카드, When: 렌더, Then: 놀이명 노출 / 학년·점수 라벨 `0건` |
| **REQ-LIT-08** ⭐ | **금칙어·측정 동사 0건(CON-04/CON-06)**: 트랙B 전 표면에 측정 동사·금칙어 0건 | CON-04 정규식 스캐너 + CON-06 | Given: 트랙B UI 텍스트, When: 스캔, Then: "치료/진단/장애 + 학습장애/난독/읽기장애/지연/지체 + 측정/평가/확인(probe)/점수/밴드/백분위/판정/심각도" `0건` |

### 4.2.B 14게임 ↔ S0~S4 ↔ 플래그 ↔ 산출 매핑 (REQ-LIT-09~14, 게임군별)

> 각 게임은 **독립 REQ 가 아니라 게임군(단계 구인) 단위**로 묶어 추적한다(REQ 폭발 방지). 모든 게임의 산출 = **활동 완료 = 1건**(놀이별 raw 점수는 중재용 내부 기록일 뿐 산출 아님). 게임의 표시 stage 는 구인 분류용이며 실제 노출은 `isAgeEligible` 가 결정한다(§4.2.A REQ-LIT-03).

| REQ ID | 게임군(구인) | 게임(slug) — 14게임 | 표시 stage | 산출 |
|:---|:---|:---|:---:|:---|
| **REQ-LIT-09** | 발현적 문해(어휘·음절 음운인식·이야기) | 낱말 놀이(vocabulary) · 소리 따라 말하기(nonword-repetition) · 이야기 놀이(narrative) | S0 | 활동 완료=1 |
| **REQ-LIT-10** | 읽기 입문(음소 음운인식·자소-음소·RAN) | 소리 놀이(phonological-awareness) · 소리 내어 읽기(decoding) · 빨리 이름대기(ran) | S1 | 활동 완료=1 |
| **REQ-LIT-11** | 해독·철자(음운규칙·철자·받아쓰기) | 소리 변신 놀이(phono-rules) · 받아쓰기 놀이(spelling) · 소리 규칙 읽기(read-rules) | S2 | 활동 완료=1 |
| **REQ-LIT-12** | 유창성·이해(읽기유창성·사실적 이해) | 또박또박 읽기(reading-fluency) · 글 읽고 답하기(reading-comprehension) | S3 | 활동 완료=1 |
| **REQ-LIT-13** | 읽기로 배우기(추론·평가·형태소) + **비복제 원칙** | 생각 나누기(inference) · 숨은 뜻 찾기(inference-reading) · 낱말 조각 놀이(morphology) | S4 | 활동 완료=1. **NISE-B·ACT/KOLRA/REVT/U-TAP 문항·지문·규준·명칭 복제 금지 — 자체 콘텐츠**(CON-06 §6) |
| **REQ-LIT-14** | **W-LER 보조지표 산출**(engagement 북극성) | (전 14게임 활동 합산) | — | **W-LER**(주간 문해 활동률) — 활동일·활동 횟수 기반. **완수율/미션 프레임 금지**. 임계 = `W_LER_MIN_DAYS`/`W_LER_MIN_SESSIONS` 상수 1곳 |

> 게임 합계 = **14개**(S0: 3 / S1: 3 / S2: 3 / S3: 2 / S4: 3 = 14, registry.ts `LITERACY_GAMES` 실측 정합).

### 4.2.C 결함 정정 — V07 CL-12 ②의 stages.ts 모순 (firewall 정정)

> ⚠️ **정정**: V07 `REQ-FUNC-CL-12` ②는 "literacy 미니게임을 **만 5-7세에만 조건부 노출**, **만 2-4세 미노출**, 만 4세 이하 = literacy 미노출 `0건`"을 요구했다. 이는 CR-2026-009(학령기 전면확장) 이전 만 5-7세 읽기준비도 패러다임의 잔재로, **현 정본 코드와 모순**된다.
>
> - `stages.ts`: `LITERACY_AGE_MIN_MONTHS = 24`(만 2세 0개월) — **만 2세부터 도메인 내**.
> - `stages.ts` S0 = 만 2~4세(24~59개월) **활성 단계**(발현적 문해: 어휘·음절 음운인식·인쇄물 개념·듣기이해·이야기 듣기).
> - 따라서 "만 2-4세 미노출"은 S0 의 존재 자체와 충돌.
>
> **정정 결론(REQ-LIT-01/02/03 으로 대체)**: 연령 게이팅은 "만 5-7세 조건부"라는 **고정 컷오프가 아니라**, **게임 자체 연령게이트(`isAgeEligible`)**로 한다(만 2~12 전 구간, 게임별 적격 연령 상이). CL-12 ②는 **폐기**한다. CL-12 의 ①(원본성/비복제)은 CON-06 §6 + REQ-LIT-13 으로, ③(난이도 위계·아이템 풀 명세)은 REQ-LIT-09~13 으로, ④(법률검토)는 OPS-LIT-01(2026-06-22 완료)로 **승계**한다.

## 4.3 북극성 (2트랙 비대칭 — 옵션 C 지향 · A 1차)

| 트랙 | 북극성 지표 | 정의 | source |
|:---|:---|:---|:---|
| **트랙A** | **W-AUR ≥ 60%** (불변) | 주간 발음 미션 완수율 | `computeWaurForWeek` (waur-trend.ts) |
| **트랙B** | **W-LER** (보조지표 신설) | 주간 문해 활동률(engagement) — baseline 축적 후 동격 승격(옵션 C) | `aggregateLiteracyWeekly` + 신설 집계 함수 1개 |

> ⚠️ **북극성 가드**: ① 트랙B 지표명·카피 = "활동률/engagement"만(완수율/미션 프레임 금지). ② W-LER target ≥60% 무근거 차용 금지 — 옵션 A 로 baseline 측정 후 산정. ③ 통합 단일 rate(옵션 B) 비채택 — 비대칭 평탄화 + 발음 시계열 단절 회피(R8).

---

# §5~§9. (V07 계승)

V07 §5(HITL)·§6(ERD·ADR·Validation·Contingency)·§7(운영)·§8(변경 관리)·§9(Glossary)를 계승한다. V08 의 추가:

- **§6 Entity**: 트랙B `LiteracyResult`(영속) — `stage`·`gameSlug`·`rawScore`(내부 중재 기록, 산출 아님)·`createdAt`. raw 점수는 산출되지 않으며 engagement 집계에만 사용(CON-06 §2).
- **§8 변경 관리**: 본 V08 = CR-2026-009(문해 학령기 전면확장)의 SRS 반영 + 2트랙 비대칭 firewall. RACI Tier 3(전략) — 승인 완료(2026-06-22).
- **§9 Glossary**: §1.3 의 V08 신규 9 용어 추가.

---

# §10. KOPLAC 임상 자문 — 트랙별 범위 (비대칭)

V07 §10 의 KOPLAC 13 항목 자문 풀(7 그룹)을 계승하되, **트랙별 자문 범위를 비대칭으로 한정**한다.

| 트랙 | 자문 범위 | 자문이 하는 것 / 안 하는 것 |
|:---|:---|:---|
| **트랙A 발음** | **채점 규칙 검증** — 음운변동 false positive 회피(CL-01), 발달 위계 연령 보정(CL-02), 표준화 절단점 정합(CL-03), 단일 변동 분석(CL-04). CL-08~10(음운인식/해독/RAN 채점 축) wiring 게이트 | ✅ 채점 규칙·절단점·발달 위계 검증 (측정 정당성 확보) |
| **트랙B 문해** ⭐ | **채점/판정 아님** — 활동 **난이도 위계·연령 적합성·CON-04 톤**만 자문 | ✅ 놀이 난이도 위계가 발달 순서에 맞는지 / 연령 적합한지 / 부모 친화 톤(금칙어 0)인지. ❌ **점수 규준·절단점·정상범위·판정 기준 생성 금지**(생성 시 연습-only 위반) |

> ⚠️ **트랙B 자문 가드**: KOPLAC 자문이 트랙B 에 "점수 밴드/규준"을 부여하면 CON-06(연습-only)·`bandShippable=false` 와 충돌한다. 트랙B 자문은 **콘텐츠 위계·연령·톤**에 한정되며, 그 결과는 `bandShippable` 플립의 근거가 되지 않는다(플립 경로 = 정식 표준화 규준 확보뿐, §1.5.1a CON-06 §3).

---

# §11. (V07 계승) — R6 Seg B Plan B

V07 §11(R6 Seg B Plan B + F4-Plus)을 계승한다. 트랙B 는 별도 피벗 시나리오 없음(라이브 운영 중, W-LER baseline 축적이 1차 검증).

---

# §12. 컴플라이언스 (V07 계승 + 트랙B)

V07 §12(PIPA + 의료기기법 + 5중 가드 + 출시 체크리스트)를 계승. 트랙B 추가:

- **트랙B 약관·처리방침**: 문해를 "놀이·연습" 동사로 분리 서술(측정 소지 제거). 법무 재확인 = **2026-06-22 사용자 완료**(게이트 해소, A6).
- **트랙B 출시 체크리스트(연습-only)**:
  - [ ] CON-06 금칙어·측정 동사 0건(트랙B 전 표면)
  - [ ] `referenceBand=null` · 전 단계 `bandShippable=false` 검증
  - [ ] 플래그 off 게임 허브 노출 0건
  - [ ] 연령 도메인 분리(발음 ≤84 / 문해 24~144) 오염 0건
  - [ ] 놀이명 노출(학년·점수 라벨 0건, clin-2)
  - [ ] W-LER 명칭 = "활동률/engagement"(완수율/미션 0건)

---

# §13. 자가점검 (CON-04 · 연습-only · firewall)

## 13.1 CON-04 금칙어 점검 (본 문서 신규 카피)
- 공통 금칙어 "치료/진단/장애": 본문 제품 카피 **0건**(금지 대상 명시·정정 서술 목적 언급은 제품 카피 아님).
- 문해 추가 금칙어 "학습장애·난독·읽기장애·지연·지체": 본문 **0건**(Out-of-Scope·CON-06·근거맵에서 "금지 대상"으로만 명시).
- '지연/스크리닝': §1.1 에서 트랙A(발음)에 한정 + 트랙B 제거 명문.

## 13.2 연습-only(트랙B) 점검
- 트랙B 산출: engagement(활동 횟수·활동일·단계별·놀이별 분포)만 — 점수·밴드·백분위·판정 **0건**. `referenceBand=null`·`bandShippable=false` 명문(CON-06, REQ-LIT-05/06).
- 트랙B 동사: 놀이/연습/함께/단계에 맞춰만 — **"확인(probe)/측정/평가/스크리닝" 미적용**(발음 전용 분리, CON-06 §1).
- 학년/단계 라벨 대신 놀이명(clin-2, REQ-LIT-07) 명문.
- 북극성 트랙B = "활동률/engagement"(완수율/미션 프레임 0건, REQ-LIT-14).

## 13.3 firewall 점검
- 측정성 `REQ-FUNC-CL-08~12`(발음 진단 채점 축) ↔ 연습 `REQ-LIT-01~14`(문해 놀이) **네임스페이스 분리** 명문(§0.3·§4.0).
- CL-12 ②(만 5-7세 조건부·만 2-4세 미노출) ↔ `stages.ts` S0(만 2~4세 활성) **모순 정정**(§4.2.C — 폐기, REQ-LIT-01/02/03 으로 대체).
- §10 KOPLAC 트랙B 자문 = "채점/판정 아님"으로 한정 명문.

## 13.4 연령 도메인 분리 점검
- 발음 규준 ≤84개월 / 문해 24~144개월 — 본문 전반 분리(CON-06 §5, REQ-LIT-01), 상호 오염 0건.

## 13.5 코드 정합 점검
- 14게임(`LITERACY_GAMES` 실측 14) ↔ REQ-LIT-09~13 매핑 정합(S0:3/S1:3/S2:3/S3:2/S4:3=14).
- engagement 집계(`aggregateLiteracyWeekly` 4필드) ↔ REQ-LIT-05 정합.
- 연령 라우팅(`enabledGamesForAge`/`isAgeEligible`) ↔ REQ-LIT-03 정합.

> **자가점검 결론**: CON-04 PASS · 연습-only(CON-06) PASS · firewall(CL ↔ LIT 분리 + CL-12 모순 정정) PASS · 연령 도메인 분리 PASS · 코드 정합 PASS · 비대칭(확인 vs 놀이) 선언 일관 유지.

---

*본 SRS V08 은 [`docs/realignment/00_2track_realignment_blueprint.md`](realignment/00_2track_realignment_blueprint.md)(§3·§6·§7·§8)와 [`docs/VPS_V10_TwoTrack_Realign.md`](VPS_V10_TwoTrack_Realign.md)를 상위 근거로, SRS V07(발음 단일트랙)의 구조를 계승하여 트랙B(문해 연습-only)를 firewall 분리로 신설한 2트랙 비대칭 정본이다. V01~V07 raw 는 불변 이력으로 보존한다. (작성일: 2026-06-22)*
