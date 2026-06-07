---
type: concept
pillar: product
category: timeline
aliases: [VPS V01-V09, Value Proposition Sheet 진화, VPS 타임라인]
tags: [VPS, evolution, timeline, V01-V09, 클러스터24-39]
---

# VPS Evolution — V01 → V09 진화 타임라인

Value Proposition Sheet의 9차례 진화 과정. **V09가 [[product/sources/54-PRD-V10-Final]] 의 직접 기반**.

> ✅ **V01-V09 전 구간 정독 완료**. raw 24-30 = [[product/sources/24-30-VPS-V01-V06-Detail]] 헤더+핵심 grep 정독 / raw 31-32 = [[product/sources/31-32-VPS-V07-V08-Detail]] 정독본 / raw 39 = [[product/sources/39-VPS-V09-Final]] 정독본 (V09 §4-2 Epic 리팩토링 + §4-3 4 모순 원칙 + §4-5 18 경쟁사 시사점 매핑 + §9 페르소나 커버리지 V2 41차 추가 정독으로 완성도 65%).

## 진화 표

| 버전 | raw | 작성자/단계 | 주요 변경점 (추정) |
|---|---|---|---|
| **BMC** | **24** | (분석본) | **VPS의 토대** — 9-Block + 핵심 가치 퍼널 3단계 + Phase 0~4 활동 |
| **V01** | 25 | Sonnet | ⭐ **7-Block 정립** (Pain·Job·Outcome·VP·Substitute·차별·Proof) × 4 Seg + JTBD 3축(F/E/S) + AOS 정량 (4.0/3.2/3.0) |
| **V02** | 26 | Gemini | ⭐ **JobMVP Feature Map 10 기능 신규** (① 무료 진단 ~ ⑩ 동의서 자동화 = F1-F10 직접 조상) + Positioning Statement |
| **V03** | 27 | Sonnet | V01 + **BMC 정합 패치** (TAM 1,080-1,800억 / 18-25만 가구 / Phase 명시) |
| **V04** | 28 | Gemini | V02 + BMC 정합 + **JobMVP Phase 0/1/2 명시** |
| **V05** | 29 | Merged | ⭐ **[Overview] + [Deep Dive] Dashboard 패턴 신규** = V01 narrative + V02-V04 표·JobMVP·BMC 정합 Best-of-Breed |
| **V06** | 30 | Merged | ⭐ **Business Operations 4 섹션 신규** (가격 정책·성공 지표·채널 타겟팅·리스크 관리) → V07 Part Ⅳ "비즈니스 실행"의 조상. "100점 마스터" 자체 선언 |
| **V07** | 31 | Restructured ⭐ | **4단계 Part Ⅰ-Ⅳ 구조 신설** + KSF Top 4 + AOS/DOS 사분면 정량화 + Seg E 비타겟 추가. §6 자체 명시: "Sub-feature 트리 미완" → V08에 인계 |
| **V08** | 32 | Detailed ⭐ | V07 4단계 유지. **§6 Sub-feature 트리 (F1.1~F10.1)** + **§11-E ROI 시뮬레이터 (1,100% ROI)** + **F9.4 ROI 계산기** + **§9 페르소나 커버리지 (Seg D-1/D-2 분리)** + **§14-4 BMC 9-Block** + **부록 26 보고서 Traceability** |
| **V09 final** | 39 | UX Reinforce | **B2B2C DMU 5분리 + 21 Sub-feature + 카테고리 명명 + 26 보고서 통합** |

## V09 핵심 진화 (vs V07/V08)

[[product/sources/39-VPS-V09-Final]] 에서 정독한 부분:

| 항목 | V07 (이전) | **V09 final** |
|---|---|---|
| **DMU 세분화** | Seg A·C 2종 | **A·C·B·D-1·D-2 5종** ⭐ |
| **MVP 단위** | F1-F10 (10개) | **F1-a/b, F3-a/b, F9-a/b/c/d 등 21 Sub-feature** ⭐ |
| **카테고리** | "비의료 B2C 교육" 잠정 | **"홈 랭귀지 코칭"** 공식 명명 ⭐ |
| **JTBD 검증** | 추론 | 5 페르소나 중 4 완전 + 1 ⚠️ 부분 (Seg B → R6) |
| **사전 분석** | 일부 | **26개 사전 보고서 통합 추적** |

## V07 → V08 → V09 진화 흐름 (정독 기반 정정)

> 정정: V08은 이미 §9에서 Seg D-1/D-2 분리 + §6 Sub-feature 트리(F1.1~F10.1) 보유. V09는 이를 더 정교화한 단계.

| 항목 | **V07 (raw 31)** | **V08 (raw 32)** | **V09 (raw 39)** |
|---|---|---|---|
| 구조 | **4단계 Part Ⅰ-Ⅳ 신설** | 4단계 유지 | 4단계 유지 |
| §6 MVP | Phase별 Epic 목록 (Sub-feature **공백**) | **F1.1~F10.1 Sub-feature 트리** | 21 Sub-feature 정밀화 (F1-a/b 등) + PRD 매핑 |
| §11 BizModel | 6부 (A-F) | **7부 (A-G) — ROI 시뮬레이터 신규** | 유지 |
| Seg D | D 단일 | **D-1 결제권자 + D-2 실무 운영자** | 5 페르소나 확정 |
| §9 페르소나 커버리지 | (없음) | 미충족 리스크 방어 컬럼 신규 | 26 보고서 Traceability와 통합 |
| §14-4 BMC 9-Block | (없음) | **신규** | 보완 |
| 부록 Traceability | (없음) | **26 보고서 매핑 신규** | 보완 |
| 카테고리 | "비의료 B2C 교육" 잠정 | 동일 | **"홈 랭귀지 코칭"** 공식 명명 |
| JTBD 검증 | H-A/H-C 시나리오 | 동일 | 5 페르소나 중 4 완전 + 1 ⚠️ R6 부분 |

→ V09 = **PRD 전환 직전 마스터 문서**. V07-V08의 Sub-feature 트리 + ROI 시뮬레이터 + DMU 분리 → V09에서 21 Epic + 카테고리 명명 + 26 보고서 통합으로 완성.

## V07-V08 정독 핵심 발견 (raw 31·32)

[[product/sources/31-32-VPS-V07-V08-Detail]] 참조. 6대 진화점:

1. **V07 4단계 구조 신설** — Part Ⅰ 가치 → Ⅱ 매핑 → Ⅲ 구현 → Ⅳ 비즈니스. "Single Source of Truth" 선언.
2. **V07 정량화** — KSF Top 4 + AOS/DOS 사분면 (O-1 9.0/8.5, O-2 9.0/9.0, O-3 7.0/6.5, O-4 6.5/6.5) + Seg E 비타겟.
3. **V08 §6 Sub-feature 트리** — V07이 자체 명시한 "Sub-feature 트리 미완" 보강점을 V08이 직접 실행. F1.1~F10.1 + 안전장치 (F1.3 면책 / F6.1 HITL).
4. **V08 §11-E ROI 시뮬레이터** — 원아 1명 이탈 = 연 600만 손실 / 솔루션 50만 = **1,100% ROI**. F9.4 ROI 웹 계산기 영업 무기화. **재무 논리로 프레임 전환** (교육 도입 → 경영 방어 투자).
5. **V08 §9 페르소나 커버리지 + Seg D-1/D-2 분리** — DMU 5분리는 V09가 아닌 V08에서 시작.
6. **V08 §14-4 BMC 9-Block + 부록 Traceability Matrix** — 26 사전 분석 보고서 → VPS 섹션별 추적.

학습 패턴: **자기-인용 보강 사이클** (V07 "보강점 미완 명시" → V08 직접 실행) + **정성→정량 전환** (KSF/AOS·DOS 정량화) + **재무 논리 무기화** (ROI 시뮬레이터).

## V09 → PRD V10 매핑

V09의 §6 (MVP Sub-feature) → PRD V10의 21 Epic이 거의 1:1 매핑 ([[product/concepts/MVP-feature-spec]] § 21 Epic).

V09 → PRD V10 추가 요소:
- SRS Readiness Gate 6대 기준
- ADR-001 (북극성 KPI 선정 근거)
- 4중 Lock-in 메커니즘 명문화
- 4 Experiment (EXP-1~4)
- R6 Plan B (Seg B 피벗 시나리오)
- 230 SP / 24 sprints 분해 (⚠️ 21 Epic 실제 합 219; §4.4 합계행 +11 오차)

## 타임라인 그래프

```
V01 (Sonnet)  ─┐
V02 (Gemini)  ─┤
V03 (Sonnet)  ─┤── 1차 멀티 LLM 작성 (V01-V04)
V04 (Gemini)  ─┘
   ↓
V05 (Merged)  ── 1차 통합
V06 (Merged)  ── 보강
   ↓
V07 (Restructured) ── 구조 재편
V08 (Detailed)     ── Sub-feature 명세화
   ↓
V09 (UX Reinforce) ─⭐ DMU 5분리 + 21 Sub-feature + 카테고리 명명
   ↓
PRD V01-V10        ── 본격 PRD 진화 ([[product/concepts/PRD-evolution]])
```

## 학습 포인트 (개발 워크플로 시사)

| 패턴 | 의미 |
|---|---|
| **멀티 LLM 멀티 패스** (Sonnet ↔ Gemini ↔ Merged) | 단일 LLM의 편향 회피, 상호 검토 |
| **9 버전의 점진 정제** | 캔버스 → 캔버스 + 페르소나 → DMU 분리 → Sub-feature → UX Reinforce |
| **VPS → PRD → SRS 단계 분리** | 사업·UX (VPS) / 제품·기능 (PRD) / 시스템·구현 (SRS) 책임 분리 |

## 출처
- [[product/sources/24-30-VPS-V01-V06-Detail]] (V01-V06 + BMC 정독)
- [[product/sources/31-32-VPS-V07-V08-Detail]] (V07-V08 부분 정독)
- [[product/sources/39-VPS-V09-Final]] (V09 정본, 부분 정독)
- [[product/sources/54-PRD-V10-Final]] (V09 흡수 검증)

## Clinical cross-link

- "홈 랭귀지 코칭" 카테고리 명명의 임상 토대 = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 사전 + [[clinical/concepts/아동언어치료-핵심기법]].
- V09의 5 DMU 분리 = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 매 세션 5-10분 부모 상담의 디지털 보완 + B2B2C 확장.

## 보강 필요
- V09 자체 §10 (GTM Copy), §13 (영업 시퀀스), §14 (검증) — 부분 정독.
- VPS V09 → PRD V01 첫 변환 (raw 40_PRD_V01_Gemini)에서 무엇이 추가/수정되었는지 차이.
- raw 51 (V09 Quality 18 Findings) — V08 BMC가 어떻게 재정교화되어 PRD V10에 흡수되었는지.
- F9.4 ROI 시뮬레이터 → 88 Task 매핑 미완 (FR-Q/FR-C 후속 task 신규 필요 가능성).
- ✅ BMC RS 변경 (V06 "B2B 10-30만 + 데이터 라이선스" → V07-V08 "연 50만 단일") 명시적 사유: raw 31 §11-B = "B2B = 매출보다 B2C 리드 채널" 재정의. 데이터 라이선스 폐기 = F10 § T4-a/b/c 임상 연구 동의로 분리 ([[product/sources/24-30-VPS-V01-V06-Detail]] § V07-V08 변경점).
- V02/V04 JobMVP ⑧ 다자녀 비교 (Triage) → V07-V08 어느 Epic으로 진화했는지 매핑 (F8 후보).
