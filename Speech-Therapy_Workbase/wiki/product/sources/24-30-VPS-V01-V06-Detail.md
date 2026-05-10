---
type: source
pillar: product
category: VPS-evolution
aliases: [VPS V01-V06, raw 24-30, 멀티 LLM 사이클, BMC 정합 사이클]
tags: [VPS, V01, V02, V03, V04, V05, V06, BMC, Sonnet, Gemini, Merged, multi-llm-workflow, 클러스터24-30]
---

# VPS V01-V06 + BMC 통합 정독 — 멀티 LLM 사이클 + Best-of-Breed 검증

raw 24 (BMC, 14KB) + raw 25-28 (V01-V04 멀티 LLM, 44KB) + raw 29-30 (V05-V06 Merged, 23KB). **VPS-evolution + multi-llm-workflow 정본의 raw 검증**.

> 정독 범위: 헤더 + 핵심 섹션 + 변경점 명시 (혼합 sampling). 7개 파일 81KB 총량 → ~250 grep 결과 + 주요 표·VP 차이 정밀 비교.

## 진화 표 (V07 Restructured 직전 상태)

| 버전 | raw | 작성 LLM | 시점 | 핵심 신규 |
|---|---|---|---|---|
| **BMC** | **24** | (분석본) | 2026-05 | 9-Block (CS/VP/CH/CR/RS/KR/KA/KP/CS_비용) + 핵심 가치 퍼널 3단계 + Phase 0~4 활동 | 
| **V01 Sonnet** | 25 | Sonnet | 2026-05 | **7-Block 분리 구조** (Pain·Job·Outcome·VP·Substitute·차별·Proof) × 4 Seg (A·C·B·D). AOS 정량 (4.0 / 3.0 / 3.2). Functional/Emotional/Social Job 3축 |
| **V02 Gemini** | 26 | Gemini | 2026-05 | **통합 표 형식** (Seg별 1 표 = Pain·Job·Substitute·차별·Proof) + ⭐ **JobMVP Feature Map** (10 기능 ① ~ ⑩) + Positioning Statement 신규 |
| **V03 Sonnet** | 27 | Sonnet | 2026-05 | V01 + **BMC 정합 패치** (TAM 1,080-1,800억 / 18-25만 가구 / Phase 명시). V01 narrative 유지 |
| **V04 Gemini** | 28 | Gemini | 2026-05 | V02 + BMC 정합 + **JobMVP Phase 0/1/2 명시** (V02 → V04에서 Phase 분배 정밀화) |
| **V05 Merged** | 29 | Merged | 2026-05 | ⭐ **[Overview] + [Deep Dive] Dashboard 패턴** 신규. V01-V04 4 LLM Best-of-Breed (V01 narrative + V02 JobMVP + V03 BMC 정합 + V04 Phase). AOS 점수 공식 인용 |
| **V06 Merged** | 30 | Merged | 2026-05 | V05 + **Business Operations 섹션 신규** (가격 정책 + 성공 지표 + 채널 타겟팅 + 리스크 관리) → "100점 마스터 문서" 자체 선언 |

→ **V06 → V07 Restructured (raw 31)** 에서 4단계 Part Ⅰ-Ⅳ 구조 신설 (Single Source of Truth 선언).

## 핵심 진화 ① — V01 (Sonnet) 7-Block 정립

V01이 정립한 **7-Block 패턴** (이후 V02-V07까지 모두 계승):

```
1-1. Pain / Needs (페르소나·CJM 기반, P1-P4)
1-2. Goal / Job (JTBD: Functional + Emotional + Social Job 3축)
1-3. Outcome (Importance + Satisfaction + AOS 정량)
1-4. Value Proposition
1-5. Substitute (기존 대안)
1-6. 차별적 가치
1-7. Proof (근거·검증)
```

V01의 정량 자산:
- **AOS 점수 정량화** (Importance × Max(I-S, 0)): 정상/비정상 5분 진단 = **4.0** / 또래 비교 = **3.0** / 미션 = **4.0** / 전문가 확인 = **3.2**
- **JTBD 3축 분리** (Functional / Emotional / Social) — Seg A: "5분 수치 진단" / "내가 과민한 게 아니었다" / "남편·시어머니 설득"

→ AOS 점수의 정량 패턴은 V07-V08까지 유지 (V07에서 Outcome ID O-1~O-4 + AOS/DOS 사분면으로 정밀화).

## 핵심 진화 ② — V02 (Gemini) JobMVP Feature Map 신규 ⭐

V02 첫 도입한 **JobMVP Feature Map** (10 기능):

| # | 기능 | Seg | 중요도 | 난이도 | MVP |
|---|---|---|---|---|---|
| ① | 무료 AI 음성 진단 엔진 | Seg A | 5 | 4 | ✔ |
| ② | 또래 비교 진단 리포트 | Seg A | 5 | 3 | ✔ |
| ③ | 진단 연계 맞춤 미션 카드 | Seg A·C | 5 | 3 | ✔ |
| ④ | 주간 발달 추이 그래프 | Seg B·C | 5 | 3 | ✔ |
| ⑤ | 카카오톡/SNS 공유 | Seg B | 4 | 2 | ✔ |
| ⑥ | 비동기 전문가 코멘트 | Seg A·C | 4 | 3 | ✖ Phase 1 |
| ⑦ | 외부 공유 PDF | Seg C | 3 | 2 | ✖ Phase 1 |
| ⑧ | 다자녀 비교 (Triage) | 공통 | 3 | 4 | ✖ Phase 2 |
| ⑨ | B2B 스크리닝 대시보드 | Seg D | 5 | 4 | ✖ Phase 3 |
| ⑩ | 학부모 동의서 자동화 | Seg D | 4 | 2 | ✖ Phase 3 |

→ V02의 ① ~ ⑩ = **V07-V08 F1-F10 Epic의 직접 조상**. V09 final에서 Sub-feature 분해 (F1-a/b, F3-a/b, F9-a/b/c/d) 됨. 정본 [[product/concepts/MVP-feature-spec]].

## 핵심 진화 ③ — V03/V04 BMC 정합 사이클

V01 (Sonnet) ↔ V02 (Gemini) 후, V03 (Sonnet) ↔ V04 (Gemini) 두번째 병렬 사이클:

| 항목 | V01/V02 (1차) | **V03/V04 (BMC 정합)** |
|---|---|---|
| TAM 명시 | 미명시 | **TAM 1,080-1,800억원** (raw 24 BMC와 정합) |
| 코어/확장 모수 | 미명시 | **18-25만 가구** (Seg A~D 합) |
| Phase 분배 | 우선순위만 (High/Mid) | **Phase 0/1/2/3 명시** (V04의 강점) |
| BMC 동기화 | 없음 | **V03 = V01 + 정합 / V04 = V02 + 정합** |

→ V03 명시: "BMC 및 Problem Definition 문서의 타임라인(Phase) 및 시장 규모(가구 수)와 완전히 싱크를 맞춘 최종 정합성 확보 버전."
→ V04 명시: "BMC 로드맵 타임라인 불일치(리포트 Phase 1, B2B Phase 2) 및 시장 규모/가구 수 정합성을 완벽히 동기화한 최종 업데이트 버전."

→ **이 단계에서 TAM 1,080-1,800억** (보수 정의) 정착. [[product/sources/13-Market-Sizing]] 의 72-96만 가구 (× 3.5만 ARPU × 12) = 3,024-4,032억과 다름. **이유**: V03/V04는 SAM 기준 (TAM 중 경계선+심화 + 온라인 수용 17-25만 × ARPU 4.2-7.0만) — 13에서 SAM 매출 714-1,050억 + B2B + Premium = 광의 SAM ≈ V03/V04 TAM. [[product/concepts/customer-segmentation]] § "TAM 정의 모순" 의 또 다른 정의 변형.

## 핵심 진화 ④ — V05 Merged "Best-of-Breed" 패턴 ⭐

V05가 정립한 **[Overview] + [Deep Dive] Dashboard 패턴**:

```
### Seg A
#### [Overview] 핵심 요약 (V02-V04 통합 표 차용)
  - Pain / Job / Substitute / 차별 / Proof (5행)

#### [Deep Dive] 상세 요구사항 (V01 narrative 차용)
  - JTBD 3축 (Functional + Emotional + Social)
  - AOS 점수별 Outcome 리스트 (4.0 / 3.2 / 3.0 등)

#### [Marketing] 카피라이팅 (V02 Positioning 차용)
```

→ **Best-of-Breed 패턴 검증**: V01 narrative 깊이 + V02-V04 표 가독성 + AOS 정량 모두 흡수. V09 Quality § Story AC + 페르소나 커버리지 표의 직접 조상.

→ Multi-LLM Workflow 정본 [[product/concepts/multi-llm-workflow]] 의 핵심 검증 사례 — VPS V01-V05 사이클은 **PRD V01-V05 (raw 40-44) + SRS V01-V05 (raw 57-64)에서도 동일하게 반복**.

## 핵심 진화 ⑤ — V06 Merged Business Operations 신규

V06 자체 선언: "비즈니스 완결성을 위한 가격 정책, 성공 지표, 채널 타겟팅, 리스크 관리(Business Operations) 섹션을 추가하여 100점짜리 마스터 문서로 완성."

신규 섹션 (V05에 없던 영역):
1. **가격 정책** — Basic 35K / Premium 50K / B2B 라이선스 (V05까지 BMC만 보유)
2. **성공 지표** — 북극성 KPI 후보 + 보조 KPI (V0.6 Sonnet에서 W-AUR 정식화)
3. **채널 타겟팅** — 맘카페·소아과·유치원 채널 매핑
4. **리스크 관리** — 규제·품질·B2B·개인정보 4축

→ V06 → V07 Restructured (raw 31) 에서 이 4 섹션이 Part Ⅳ "비즈니스 실행" 으로 재편됨.

## raw 24 BMC 핵심 — VPS의 토대

raw 24 (Business Model Canvas) 9-Block:

| Block | 핵심 |
|---|---|
| **CS** (고객 세그먼트) | Seg A·C·B·D 정립 + 회색지대 부모 |
| **VP** (가치 제안) | **3단계 핵심 가치 퍼널**: 1단계 무료 진단 → 2단계 맞춤 미션 → 3단계 시계열 리포트 |
| **CH** (채널) | 맘카페·소아과·유치원 + 카카오톡 + 키즈노트 |
| **CR** (고객 관계) | 100% 자동화 (Self-service) + 비동기 전문가 (Phase 1+) |
| **RS** (수익 흐름) | Basic 35K / Premium 50K / B2B 10-30만/月 / **데이터 라이선스 (Phase 3+)** ⚠️ V07 이후 단일 50만/年으로 변경 |
| **KR** (핵심 자원) | 누적 발달 궤적 데이터 + 조음 NLP + 전문가 풀 |
| **KA** (핵심 활동) | 7대 활동 (MVP 개발 → 100가정 파일럿 → 주간 미션 커리큘럼 → 리포트 시스템 → HITL A/B → B2B 5개소 → 임상 공동연구) |
| **KP** (핵심 파트너) | 유치원 연합회 + 언어재활사 풀 + 지역 소아과 |
| **CS_비용** | CAC + R&D + 전문가 변동비 + 커리큘럼 개발 + 임상 연구 협약비 |

→ ⚠️ **V07-V08 변경점 발견** + ✅ **명시적 사유 발견 (raw 31 §11-B 정독)**:
- V06 BMC raw 24 RS = "B2B 라이선스 월 10-30만 / 데이터 라이선스 Phase 3+"
- V06 raw 30 5-1 (Business Operations 4 섹션) = **B2B 미명시** (Basic + Premium만 5-1 표 포함). B2B는 §3 F9 Epic + §5-3 채널 전략에만 등장 → 모호한 위치.
- **V07 raw 31 §11-A** = "B2B 기관용 **연 500,000원**: 유치원/어린이집용 무제한 스크리닝 대시보드 라이선스 (Phase 2 도입)" **단일화 명시**.
- ⭐ **V07 raw 31 §11-B 정당화**: "B2B 라이선스 (ARR) 15% — 어린이집/유치원 연간 계약. **매출 비중은 낮으나 대량의 B2C 리드(학부모)를 물어오는 채널 역할**." → **사업 정체성 재정의: B2B = B2C 리드 채널**.

→ **본질**: V06까지 B2B 자체를 수익원 (월 10-30만 변동)으로 인식 → V07이 **"B2B = 매출보다 B2C 리드 캡처"** 채널로 재정의. 가격 단순화 (월 변동 → 연 50만 고정) + 데이터 라이선스 폐기 (R&D 환류 = T4-a 임상 연구 동의로 분리, 매출원 아님 [[product/concepts/F10-research-consent]]) 모두 이 재정의의 자연스러운 결과.

→ **데이터 라이선스 폐기 사유** (V06 → V07): (1) 임상 연구 협약 복잡성 (IRB + 기관 별 협상) (2) GDPR + 한국 개인정보보호법 부담 (3) F10 § T4-a/b/c 임상 연구 동의 = R&D 환류용으로 사업 모델에서 분리.

## 멀티 LLM 워크플로 — V01-V06 검증

[[product/concepts/multi-llm-workflow]] 의 7 단계 패턴 V01-V06 적용 검증:

| 단계 | 패턴 정의 | **VPS V01-V06 적용 사례** |
|---|---|---|
| 1. 호환성 검토 | (V07-V08은 raw 24 BMC + 분석 25 보고서 활용) | (이전 단계) |
| 2. 표준 프롬프트 | (없음 — V01 자유 작성) | (V01) |
| 3. **병렬 LLM 트랙** | LLM 1·LLM 2 병렬 작성 | **V01 Sonnet ↔ V02 Gemini** ⭐ (1차) / **V03 Sonnet ↔ V04 Gemini** (2차, BMC 정합) |
| 4. 명시적 검토 | (V07-V08의 검토 명시화는 V09 v0.8 패치부터 본격) | (없음 — V01-V06은 자체 메모만) |
| 5. 비교 매트릭스 | (없음) | (V05에서 처음 통합 시도) |
| 6. **Best-of-Breed 통합** | LLM 1 + LLM 2 + 보강 → Merged | ⭐ **V05 Merged = V01 (narrative) + V02-V04 (표·JobMVP·BMC 정합) Best-of-Breed** |
| 7. 후속 변환 | (V06 → V07-V08의 4단계 구조·Sub-feature 트리·BMC 9-Block은 후속 변환) | V06 → V07 4단계 + V08 Sub-feature → V09 5 DMU + 21 Sub-feature |

→ **VPS V01-V06 사이클이 후속 PRD/SRS 워크플로의 원형**. PRD v0.1 (Gemini) ~ v0.5 (Integrated) + SRS V01 (Opus) ~ V05 (Merged Master Final) 모두 동일 패턴 반복.

## 자체-인용 보강 사이클 (V07-V08과 동일 패턴)

V01-V06 단계에서도 V07-V08처럼 **자체 메모 명시 → 후속 버전 직접 실행** 패턴 발견:

| 자체 메모 | 후속 버전 직접 실행 |
|---|---|
| V01 단일 LLM 작성 | **V02에서 다른 LLM 통합 표 형식으로 재작성** |
| V01·V02 BMC 정합 부재 | **V03·V04에서 BMC 정합 패치 (TAM 1,080-1,800억 + Phase 명시)** |
| V01-V04 4 작성본 분산 | **V05에서 Merged Best-of-Breed 통합** |
| V05 Business Operations 부재 | **V06에서 가격·KPI·채널·리스크 4 섹션 신규** |
| V06 평면 구조 (10 섹션) | **V07에서 4단계 Part Ⅰ-Ⅳ 신설** |
| V07 Sub-feature 트리 부재 | V08에서 F1.1~F10.1 신설 |

→ "자체-인용 보강 사이클"은 V01-V06에서 시작 → V07-V08 (이전 ingest 발견) → V08 → V09 Quality (51 Findings 18건) → V09 Quality → V10 (Readiness Gate) 까지 **VPS·PRD 전체 9 차례 반복** 검증.

## VPS-evolution 갱신 사항 (정독 후 정정)

| 이전 추정 narrative | **정독 발견 (정확화)** |
|---|---|
| V01-V04 멀티 LLM 작성 | **V01 Sonnet ↔ V02 Gemini (1차)** + **V03 Sonnet ↔ V04 Gemini (2차, BMC 정합 추가)** = **2 사이클** |
| V05 Merged = V01-V04 1차 통합 | **V05 = "[Overview] + [Deep Dive]" Dashboard 패턴 신규** + V01 narrative + V02-V04 표·JobMVP 통합 |
| V06 Merged 보강 | **V06 = Business Operations 섹션 신규** (가격·KPI·채널·리스크). V07 Part Ⅳ "비즈니스 실행"의 조상 |
| BMC raw 24 = 별개 분석본 | **BMC = VPS의 토대** (CS/VP/CH/RS/KR/KA/KP 모두 V01부터 차용. RS는 V06 → V07-V08에서 단일화). |

## 출처

- raw/24_Business_Model_Canvas.md (14KB) — 9-Block + 핵심 가치 퍼널 3단계 + Phase 활동
- raw/25_Value_Proposition_Sheet_Sonnet_V01.md (12KB) — 7-Block × 4 Seg + AOS 정량
- raw/26_Value_Proposition_Sheet_Gemini_V02.md (9KB) — 통합 표 + JobMVP 10 기능 + Positioning
- raw/27_Value_Proposition_Sheet_Sonnet_V03.md (13KB) — V01 + BMC 정합 (TAM 1,080-1,800억)
- raw/28_Value_Proposition_Sheet_Gemini_V04.md (10KB) — V02 + BMC 정합 + Phase 0/1/2 명시
- raw/29_Value_Proposition_Sheet_Merged_V05.md (10KB) — Best-of-Breed Dashboard
- raw/30_Value_Proposition_Sheet_Merged_V06.md (13KB) — Business Operations 4 섹션

## 관련 product 페이지

- [[product/concepts/VPS-evolution]] — V01-V09 진화 정본 (V01-V06 narrative 정확화 대상)
- [[product/sources/31-32-VPS-V07-V08-Detail]] — V07 4단계 + V08 Sub-feature
- [[product/sources/39-VPS-V09-Final]] — V09 final
- [[product/concepts/multi-llm-workflow]] — 7-단계 패턴 검증의 원형 사례
- [[product/concepts/MVP-feature-spec]] — V02 JobMVP 10 기능 → 21 Epic 진화
- [[product/concepts/customer-segmentation]] — V03/V04 TAM 1,080-1,800억 정의

## Clinical cross-link

- V01 § "1-1. Pain (P4 진단 회피 심리)" = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 사설 센터 진입 회피 (장애 판정 두려움) — VPS 처음 등장.
- V01 § "1-2. Goal Job (Social Job: 남편·시어머니 설득)" = Seg B 데이터형 가족(아빠·조부모) 정립의 출발점 → V08 §9 페르소나 커버리지에서 D-1/D-2 분리 정합.
- raw 24 BMC § KR (핵심 자원: 전문가 풀) = [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격제도 ~17,000명. [[product/concepts/HITL-system-flow]] § expert pool 수급 정책의 토대.

## 보강 필요

- raw 25-30 본문 정밀 정독 — Seg D 변경점, JobMVP 10 → V07 Sub-feature 트리 매핑 정확화.
- ✅ BMC RS 변경 (V06 "B2B 10-30만 + 데이터 라이선스" → V07-V08 "연 50만 단일") **명시적 사유 발견** (raw 31 §11-B 정독): "B2B = 매출보다 B2C 리드 채널" 사업 정체성 재정의. 데이터 라이선스 폐기 = F10 § T4-a/b/c 임상 연구 동의로 분리 ([[product/concepts/F10-research-consent]]).
- V05/V06 Marketing 섹션 (Positioning Statement 후속 버전) 본문 정독.
- ✅ **V02/V04 JobMVP ⑧ 다자녀 비교 (Triage) 추적 완료** (44차):
  - V02 ⑧ (Phase 2, Low) → V04 ⑧ (Phase 2) → V05 **F8** (raw 29 L115, Phase 2 이후, 중요도 3·난이도 4) → V07 F8 (raw 31 §4 L225) → V08 F8 (raw 32 §4 L299) → **V09 제거** ⭐
  - V09 §4-2 리팩토링 (F1·F3·F9 분리 + F12+F13 / F19+F20 병합 + **F8 제거**) → §4-6 21 Epic 명단에서 F8 미포함.
  - **흡수 메커니즘**: V09 §11-F Land & Expand 전략 (raw 39 L676) "둘째/셋째 자녀 추가 = Triage 진단" 으로 흡수. F1-a 진단 엔진 재활용 (한 가구당 N명 자녀 가입 가능 = 별도 Epic 불필요).
  - **결론**: F8은 별도 Epic이 아닌 가구 단위 LTV 극대화 메커니즘. V05~V08까지 4 버전 명시 후 V09에서 단순화.
