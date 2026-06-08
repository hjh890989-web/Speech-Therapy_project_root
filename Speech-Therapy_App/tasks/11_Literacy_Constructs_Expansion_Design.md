# 읽기 발달 선행지표(Literacy Precursor) 확장 설계서 — CR-2026-007

> **목적**: 55차 NISE-B·ACT ingest(2026-06-07)와 wiki 신규 브릿지 [`F1a-F4-임상설계-reference`](../../Speech-Therapy_Workbase/wiki/product/concepts/F1a-F4-임상설계-reference.md)가 도입한 임상 구인(**음운인식·해독·RAN·추론 4수준**)을 앱 F1-a/F4/F15의 **정식 추가 구인**으로 채택하기 위한 통합 설계. VPS→PRD→SRS→tasks 전파의 source of truth.
> **작성일**: 2026-06-08
> **결정 근거**: 사용자 스코프 결정 = **전면 확장**(만 5-7세 읽기 준비도 선행지표를 MVP F1-a/F4에 추가, F15 추론 위계 Phase 1). 2026-06-08 검토 세션.
> **선행 분석**: [`09_SRS_V06_vs_Wiki_Gap_Analysis.md`](09_SRS_V06_vs_Wiki_Gap_Analysis.md)(V06→V07 갭, 이미 V07로 흡수) + 본 세션 3-track 조사(wiki 델타 / 스펙 상태 / 앱 구현).
> **방법론**: V07의 CR-2026-006(임상 정밀도 CL-01~07) 전례를 그대로 따름 — `REQ-FUNC-CL-NN` 충돌회피 네임스페이스 + task `*-LIT-NN` 네임스페이스.

---

## §1. 배경 — 두 패러다임

현 MVP F1-a/F4는 **조음 정확도(articulation, 만 2-7세)** 패러다임으로 내적 정합(MVP↔PRD↔SRS 三方 정합, 2026-06-08 확인)이며, CR-2026-006으로 음운변동 false-positive·발달위계·표준화 절단점까지 REQ화됨(CL-01~07).

55차 NISE-B·ACT 자료는 이와 **인접하지만 별개**인 **읽기 발달 선행지표(literacy precursor, 만 5-7세)** 패러다임을 가져왔다:

| 구인 | 정의 | 분야 표준 근거(NISE 소유 아님) |
|---|---|---|
| **음운 인식**(phonological awareness) | 음절/음소 합성·분절·변별·대치 | [[clinical/concepts/학습장애-언어재활]] 음운인식↔읽기, [[clinical/entities/Scarborough]] |
| **해독**(decoding, 자소-음소 대응) | 규칙/불규칙·의미/무의미 단어 음독 | [[clinical/entities/U-TAP]] 음운변동, [[clinical/concepts/조음장애]] |
| **RAN**(빠른 자동 이름대기) | 음운 인출 자동화(난독 예측, 이중결손 가설) | [[clinical/entities/RAN-빠른자동이름대기]] |
| **추론 4수준**(읽기이해) | 사실·추론·비판·평가적 이해 | [[clinical/concepts/내러티브-담화-추론-중재]] |

> ⚠️ **이건 "문서 최신화"가 아니라 제품 임상 표면의 확장**이다. 따라서 단정적 결정이 아니라 VPS→PRD→SRS→tasks 사슬 전체에 REQ로 전파한다.

---

## §2. 저작권·원본성 게이트 (모든 작업의 전제 — 위반 금지)

[`F1a-F4-임상설계-reference`](../../Speech-Therapy_Workbase/wiki/product/concepts/F1a-F4-임상설계-reference.md) § 저작권 경계를 본 설계의 **하드 제약**으로 승격한다. 아래는 앱에서 넘지 않는다:

1. ❌ NISE-B·ACT의 **문항·지문·자극·단어목록·정답을 복사**(또는 미세변형 후 사용)
2. ❌ 앱을 **"NISE-B·ACT"라 칭하거나 그 규준(norms)·타당도를 주장**
3. ❌ 앱이 NISE-B·ACT를 **시행·복제하는 진단 도구**라 표시

✅ **허용**: 측정 **구인**(음운인식/해독/RAN/추론 = 분야 표준 지식)을 근거로 **자체 문항·자극·콘텐츠를 직접 제작**하고 **자체 척도로 채점**. → 본 설계의 모든 콘텐츠 task(`MOCK-LIT-*`)는 **자체 제작**이며, 채점은 0/1·시간 기반의 분야 표준 방식.

📌 **상업 출시 게이트**: 출시 전 **① NISE-B·ACT 명칭/규준/문항 미사용 + ② 원본성 법률 검토** 확인. [[product/concepts/architecture-decisions]] § ADR-04(비의료·진단 용어 차단)와 동반 — "학습장애"·"난독증" 진단 용어도 UI 노출 금지(위험 신호는 "발음·읽기 준비 확인" 톤으로만).

→ **신규 ADR-18 후보**: "읽기 발달 선행지표 원본 콘텐츠 원칙" (§7).

---

## §3. 구인 → 앱 기능 → REQ → Task 매핑

| 구인 | 앱 기능 매핑 | 자체 채점 | 신규 REQ | 연령 게이트 |
|---|---|---|---|---|
| 음운 인식 | **F1-a** linguistic 사전과제 + **F4** 음운인식 축 | 합성·탈락·대치 0/1 (자기교정 3초 허용) | REQ-FUNC-CL-08 | 만 5-7세 |
| 해독 | **F1-a** articulation (자체 무의미음절 생성기) | 정/오 0/1 + 실 오반응 기록 | REQ-FUNC-CL-09 | 만 5-7세 |
| RAN + 읽기유창성 | **F1-a** acoustic (자동화 영감) | RAN 완료시간 / 1분 정확음절수 | REQ-FUNC-CL-10 | 만 5-7세(읽기유창성 6-7세) |
| 추론 4수준 | **F15** 발화 유도 챗봇 시나리오 위계 | 사실·추론·비판·평가 위계 응답 | REQ-FUNC-CL-11 | Phase 1 |
| (cross-cutting) | 원본성·연령게이트·난이도위계·아이템풀 | — | REQ-FUNC-CL-12 | — |

> **MVP 범위 한정**(reference §3): 음운인식·해독·유창성 = ⭐핵심(F1-a/F4) · 추론 = ◐부분(F15) · **쓰기·수학·읽기이해 고학년 = ⛔회피**(학령기·도구적 기술 = ADR-04 + 영유아 외).

---

## §4. SRS V07 신규 REQ — CR-2026-007 (CL-08 ~ CL-12)

> 아래는 SRS V07 §4.1의 CR-2026-006 절(CL-01~07) 직후에 삽입할 **신규 절 전문**이다. CL-01~07과 동일 표 형식. 구현 게이트는 CR-2026-006 정책 준용(채점 로직 변경분은 KOPLAC 자문 검증 후 wiring).

### D. 읽기 발달 선행지표 (Phase 0 — F1-a/F4 확장, 만 5-7세 조건부)

| REQ ID | 요구사항 | Source | AC |
|:---|:---|:---:|:---|
| **REQ-FUNC-CL-08** ⭐ | F1-a 진단에 **음운 인식 사전과제**(음절 합성·탈락·대치) 추가. 자체 제작 한국어 고빈도 2-3음절 단어 풀 기반 미니게임. 점수는 F4 리포트의 '음운인식 축'에 반영 | F1a-F4 ref §2.A, `clinical/concepts/학습장애-언어재활` | 만 5세+ 세션에서 음운인식 N문항 노출, **0/1 채점(자기교정 3초 내 허용)**, F4 음운인식 축 점수 산출. **자체 문항 — NISE 단어목록·순서·지문 미사용**(CL-12) |
| **REQ-FUNC-CL-09** | F1-a articulation에 **해독(자소-음소 대응) 과제** — 자체 **무의미 음절/단어 생성기**로 음운 처리 검증(통째 암기 배제). 어두/어중/어말 위치별 자체 자극 | F1a-F4 ref §2.B, `clinical/entities/U-TAP` §음운변동 | 무의미음절 생성기 자체 구현, **0/1 채점 + 실 오반응 기록(중재용)**, 오반응 패턴을 F4 음소 핀셋/음운변동(CL-01/F4 제품화)에 연결 |
| **REQ-FUNC-CL-10** | F1-a acoustic에 **RAN(빠른 자동 이름대기)** + (만 6-7세) **자체 1분 읽기** 부분 영감. RAN = 자체 사물·색깔 배열판, 읽기유창성 = 자체 이야기글/설명글 | F1a-F4 ref §2.C, `clinical/entities/RAN-빠른자동이름대기` 이중결손가설 | RAN **완료시간/개수** 측정(NISE 보드판 미복제), 읽기유창성 **1분 정확 음절 수**. 위험 신호는 **"학습장애/난독증" 용어 미사용**(ADR-04) — "읽기 준비 확인" 톤 |
| **REQ-FUNC-CL-11** | (Phase 1) **F15 챗봇 추론 시나리오 4수준 위계**(사실 → 추론 → 비판 → 평가). 자체 짧은 시나리오 기반 추론 질문을 위계적으로 prompt 생성 | F1a-F4 ref §2.D, `clinical/concepts/내러티브-담화-추론-중재` | F15 시나리오가 4수준 위계로 구조화(현 자유발화 → 위계 시나리오), NISE 지문 미사용. **§10 KOPLAC 자문 통과 후 활성**(ADR-14 게이트와 정합) |
| **REQ-FUNC-CL-12** | (cross-cutting) **원본성·연령게이트·정량화 제약**: ① 모든 literacy 콘텐츠 자체 제작 + 자체 척도(§2 게이트), ② 미니게임은 **만 5-7세에만** 조건부 노출(만 2-4세 세션엔 미노출), ③ 각 구인 미니게임의 **난이도 위계 + 아이템 풀 규모를 정량 명세**(F3-b 6단계 위계 프레임 재사용), ④ 상업 출시 전 원본성 법률검토 | §2 게이트, ADR-18 후보, `product/concepts/MVP-clinical-foundation` 위계 | 연령 분기 자동 검증(만 4세 이하 = literacy 미노출 0건), 구인별 아이템 풀 ≥ N개·6단계 매핑 문서화, 법률검토 OPS task 등록 |

#### 구현 단계화 / 게이트
- **CL-08/09/10**(콘텐츠 + 채점): 채점 로직 신규 → **KOPLAC 임상 자문(§10)으로 음운인식/해독/RAN 채점 규칙 검증 후 wiring** (CR-2026-006의 CL-01~04 정책 준용). 콘텐츠 제작(`MOCK-LIT-*`)·UI는 자문과 병행 착수 가능.
- **CL-11**(F15 추론): 기존 ADR-14 F15 임상 안전 게이트(§6.9 KOPLAC 13항목)에 추론 위계 항목 추가 후 활성.
- **CL-12**(cross-cutting): 즉시 적용(설계·검증 제약).
- **우선순위**: CL-08(음운인식, F1-a/F4 핵심) + F4 제품화(아래 §5 `FR-C-LIT-02`) 최우선 — F4 음운변동 엔진이 이미 존재(`lib/diagnose/clinical/*`)하므로 ROI 최고.
- **RTM 영향(≥5)**: REQ-FUNC-001/002(진단 엔진), REQ-FUNC-CL-01/05(음운변동·6단계 위계), REQ-FUNC-027(F4 리포트), REQ-FUNC-038(F15), SP3_2D(백분위).

---

## §5. Task 분해 — `*-LIT-NN` 네임스페이스 (신규 11 task / ~24 SP)

> V07 기존 ID(DB-012~018, API-013~020 등)와 충돌 회피 위해 **`LIT` 네임스페이스** 사용(CL REQ 네임스페이스와 동일 전략).

### 5-A. 콘텐츠/데이터 (자체 제작 — §2 게이트 준수)

| Task ID | 종류 | 명세 | 선행 | SP | 우선 |
|:---|:---|:---|:---|:---:|:---|
| **DB-LIT-01** | DB | `EvaluationResult` 확장 — `phonemeAwarenessScore`/`decodingScore`/`ranTimeMs`/`readingFluencyScore` (nullable, 만 5-7세만) + **`errorPattern` JSONB**(F4 제품화 공유) | DB-001 | 1 | 🟢 P0 |
| **MOCK-LIT-01** | 콘텐츠 | **음운인식 아이템 풀** — 자체 한국어 고빈도 2-3음절 단어 세트 + 합성/탈락/대치 미니게임 정의(6단계 위계 매핑). NISE 목록 미사용 | — | 2 | 🟢 P0 |
| **MOCK-LIT-02** | 콘텐츠 | **해독 무의미음절 생성기** — 한글 자소-음소 규칙 기반 자체 생성 알고리즘 + 어두/어중/어말 시드 풀 | — | 2 | 🟢 P0 |
| **MOCK-LIT-03** | 콘텐츠 | **RAN 배열판 자극**(자체 사물·색깔 SVG) + **자체 1분 읽기 지문**(이야기글·설명글, 추천도서 인용 0) | — | 2 | 🟡 P1 |
| **MOCK-LIT-04** | 콘텐츠 | **추론 4수준 시나리오 풀**(F15 prompt 위계 — 사실/추론/비판/평가) | — | 2 | 🟡 P1 |

### 5-B. 로직/UI

| Task ID | 종류 | 명세 | 선행 | SP | 우선 |
|:---|:---|:---|:---|:---:|:---|
| **FR-Q-LIT-01** | Read/UI | 음운인식·해독·RAN 미니게임 UI(`diagnose` 플로우 확장, **만 5-7세 조건부**). 기존 `components/missions/*` + `mission-config` 6단계 위계 컴포넌트 재사용 | MOCK-LIT-01/02/03 | 3 | 🟢 P0 |
| **FR-C-LIT-01** | Write | literacy 채점 로직(음운인식·해독 0/1 + 자기교정 3초 + RAN 시간/유창성 음절수) + `EvaluationResult` 저장 + 연령 게이트(만 5-7세) | DB-LIT-01, MOCK-LIT-* | 3 | 🟢 P0 |
| **FR-C-LIT-02** ⭐ | Write | **F4 음운변동 제품화**(기존 엔진 wiring) — KOPLAC 검증(CR-2026-006) 해제 + `errorPattern` 저장 + 결과 페이지 **음소별 오류 유형/핀셋 UI** 렌더(현재 밴드 1줄로만 소비됨) | DB-LIT-01, CL-01 자문 | 3 | 🟢 P0 |
| **FR-Q-LIT-02** | Read/UI | F4 주간 리포트에 **음운인식/해독/RAN 축 추가**(음소 핀셋 그래프 확장) | FR-C-LIT-01, REQ-FUNC-027 | 2 | 🟡 P1 |
| **API-LIT-01** | API | F15 `chat-system-prompt` 확장 — 추론 4수준 시나리오 위계 prompt(`lib/ai/chat-system-prompt.ts`) | API-019 | 2 | 🟡 P1 |
| **TEST-LIT-01** | TEST | literacy 채점·**연령게이트(만 4세↓ 미노출 0건)**·**원본성(NISE 미복제) lint**·RAN 시간측정 단위/통합 | FR-C-LIT-01/02 | 2 | 🟢 P0 |

> **재사용 자산**: 조음 미션의 6단계 난이도 위계 + 아이템 풀(5음소×6단계=30세트, [`lib/mocks/mission-config.ts`](../lib/mocks/mission-config.ts)) + 적응형 난이도([`lib/missions/adaptive-difficulty.ts`](../lib/missions/adaptive-difficulty.ts)) + F4 음운변동 엔진([`lib/diagnose/clinical/phonological-variation.ts`](../lib/diagnose/clinical/phonological-variation.ts), 현 DRAFT). → 신규 구인은 **아이템 풀(JSON) + 채점 함수만 추가**하는 구조로 설계.

### 5-C. 운영
| Task ID | 종류 | 명세 | SP |
|:---|:---|:---|:---:|
| **OPS-LIT-01** | OPS | 상업 출시 전 **원본성 법률 검토**(NISE 명칭/규준/문항 미사용 확인) — `docs/compliance-lawyer-consultation-brief.md` 항목 추가 | 0.5 |

---

## §6. PRD V10 / VPS 델타

### 6-A. PRD V10 (in-place 보강 — `docs/54_PRD_V10_Final.md`)
- **F1-a feature 보강**: F1-a.6 "(만 5-7세) 읽기 발달 선행지표 측정 모듈 — 음운인식·해독·RAN 자체 미니게임" 추가.
- **F4 feature 보강**: F4에 "음운인식/해독/RAN 축 시각화" 추가.
- **Won't / CON 신규**: "NISE-B·ACT 명칭·규준·문항 복제" = 명시 제외 + **CON-05(원본성)** 신설: literacy 콘텐츠는 자체 제작·자체 척도, "학습장애/난독증" 진단 용어 배제(ADR-04 정합).

### 6-B. VPS — raw/ 불변 → 직접 편집 불가
- VPS V09 원본([`raw/39_VPS_V09_final_UX_reinforce.md`](../../Speech-Therapy_Workbase/raw/39_VPS_V09_final_UX_reinforce.md))은 **wiki 스키마 §7에 따라 수정 금지**.
- **VPS V10 델타 제안**(본 설계서가 정본): F1-a를 "조음·TTR·MLU"에서 **"만 5-7세 읽기 준비도 선행지표(음운인식·해독·RAN) 측정"으로 가치 확장** — 새 JTBD("우리 아이 학교 가기 전 읽기 준비됐나?") 포착. F4.1 음소 핀셋에 음운인식 축. F15.1에 추론 위계.
- 반영처: wiki [[product/concepts/VPS-evolution]]에 "V10 후보(literacy 확장)" 항목 추가(본 설계서 link). 실제 VPS V10 raw 문서 작성은 owner 결정.

---

## §7. ADR-18 후보 — 읽기 발달 선행지표 원본 콘텐츠 원칙

> **결정**: 음운인식·해독·RAN·추론을 **분야 표준 구인**으로 측정하되, ① NISE-B·ACT 명칭·문항·규준 미복제, ② 자체 콘텐츠·자체 척도, ③ 비의료·진단용어 배제(ADR-04 정합, "학습장애/난독증" 미노출), ④ 만 5-7세 연령 게이트, ⑤ 상업 출시 전 원본성 법률검토.
> **상태**: 후보 — RACI 위원회(admin + clinical expert + IRB) 승인 시 SRS §6.8 정식 등재(ADR-17과 함께).

---

## §8. ⚠️ 별개 잔여 갭 발견 (literacy와 무관, §3-B)

본 조사 중 발견 — **literacy 결정과 독립**이나 모델 품질(AI false +/-)에 직결:

| 항목 | 현 SRS V07 상태 | 권고 |
|---|---|---|
| **Peña 데이터셋 구성 원칙**(규준표본=정상 / 검증=정상+장애 분리, ≥100명/연령대) | ❌ **0건**(grep 확인) — V07 미반영 | F1-a 데이터셋 grounding REQ로 보강(별도 CR 또는 ADR-17 AC) |
| **F1-a 측정 단위 9종 라이브러리**(C-unit/MLC-w/NDW/CIU…) | ◐ §10 KOPLAC 체크리스트 1줄(MLU/TTR)만 — F1-a spec 아님 | F1-a 후처리 단위 명세화 |
| **F1-b 영유아 6 발달 지표**(Tye-Murray Ch14) | 미확인(추정 미반영) | REQ-FUNC-008~011 입력 항목 점검 |

→ wiki [`MVP-clinical-foundation`](../../Speech-Therapy_Workbase/wiki/product/concepts/MVP-clinical-foundation.md)의 actionable 정본이 갭분석 09 §3.7에서 "reference 나열"로 격하돼 V07 본문 미흡수였음.

✅ **반영 완료 (2026-06-08, CR-2026-008)**: SRS V07 §4.1 에 **REQ-FUNC-CL-13~15** 신규 — Peña 데이터셋 원칙(CL-13) + F1-a 측정 단위 라이브러리(CL-14) + F1-b 영유아 지표·Sparks(CL-15). 더해 **코드 갭 발견·명시**: `lib/peer-percentile.ts` 실측 경로가 ±6개월·동일음소 전 표본(정상+지연 혼재) pooling = Peña 위반 → CL-13 AC + 코드 주석으로 명문화(동작 불변, 정상 발달 라벨링 = 후속 task). literacy/KOPLAC 무관·현 live 진단 품질 직결.

---

## §9. 다음 단계

1. **본 설계서 검토 + SRS/PRD/tasks 전파**(본 세션 진행) — CL-08~12 SRS 삽입, LIT task 등록, PRD 보강.
2. **임상 자문**: 음운인식/해독/RAN 채점 규칙 + 추론 위계 KOPLAC 검증. → **자문 패킷 작성 완료**: [`docs/clinical-consultation-packet_CL08-10_literacy.md`](../docs/clinical-consultation-packet_CL08-10_literacy.md)(CL-01~04 선례 형식, 발송 준비됨 — 읽기/학습 전문가 풀 3~4인, ~4주·~82만). **착수 = 외부 컨택**(제품팀).
3. **콘텐츠 제작**: `MOCK-LIT-01~04` 자체 아이템 풀(저작권 게이트 §2 준수).
4. **구현**: F4 제품화(`FR-C-LIT-02`, 최우선 ROI) → 음운인식 미니게임(`FR-Q-LIT-01`/`FR-C-LIT-01`) → F15 추론(Phase 1).
5. **출시 전**: 원본성 법률검토(`OPS-LIT-01`).

---

**— End of CR-2026-007 Literacy Expansion Design, 2026-06-08 —**
