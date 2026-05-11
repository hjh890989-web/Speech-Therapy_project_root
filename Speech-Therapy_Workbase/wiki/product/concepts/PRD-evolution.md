---
type: concept
pillar: product
category: timeline
aliases: [PRD V01-V10, Product Requirements Document 진화, PRD 타임라인]
tags: [PRD, evolution, timeline, V01-V10, 클러스터40-54]
---

# PRD Evolution — V01 → V10 진화 타임라인

Product Requirements Document의 10차례 진화 과정. **V10이 SRS Readiness Gate 100% 달성한 Golden Master**, [[product/sources/54-PRD-V10-Final]] 정본.

> ⚠️ **중간본 V01-V08 미독, V09 (raw 52) 부분 정독 완료**. raw 40-51 = V10 Revision History 기반 추정 / raw 52 V0.9 Quality = [[product/sources/52-PRD-V09-Quality-Improvement]] 정독본 / raw 54 V10 = 정독본.

## 진화 표 (V10 Revision History 발췌)

| 버전 | raw | 일자 | 작성 LLM | 주요 변경 |
|---|---|---|---|---|
| **v0.1** | 40 | 2026-05-05 | Gemini | **최초 초안**: 4대 Pain, 5분 무료 진단, 대기 미션 등 핵심 개념 + 초기 기능 요구 |
| v0.2 | 41 | 2026-05-06 | Cursor | **리스크·AC 보완**: 의료/규제 회피, Zero-touch 아키텍처, AC 강화 |
| v0.3 | 42 | 2026-05-06 | Opus | **구조화·로드맵**: **21 Epic 구체화** + MoSCoW + Phase별 Gantt + 의존성 다이어그램 |
| v0.4 | 43 | 2026-05-06 | GPT-4o | **내용 흐름 최적화**: 기술 스택 + NFR 고도화 + 논리 흐름 교정 |
| v0.5 | 44/45 | 2026-05-07 | Integrated | **통합·논리 보강**: V01-V04 종합 + ERD 시각화 + API 명세 + A/B Test 매트릭스 + 롤아웃 |
| v0.6 | 46 | 2026-05-07 | Sonnet | **수치화·B2C/B2B 타겟**: 북극성 KPI (W-AUR) + B2C/B2B 전환 목표 + O-1~O-4 + 벤치마크 |
| v0.7 | 47/48 | 2026-05-07 | Master | **SRS 마스터본**: V05 증명 논리 + V06 수치 목표 완벽 병합 → SRS 전환 기준선 (Baseline) |
| v0.8 | 49/50 | 2026-05-07 | Improvement | **VPS 검토 7대 결함 패치**: 북극성 ADR + AOS/DOS 기회 수치 + JTBD 검증 (Seg B 리스크) + TAM 명시 |
| v0.9 | 51/52 | 2026-05-07 | Quality Improvement ⭐ | **품질 리뷰 18건 결함 반영** (정독). 51 = 외부 LLM 메타 18 Findings 발견 / 52 = **자체 반영 SRS-Ready 확정판**. CJM KPI 8건 수치화(P0) + Lock-in 4중 KPI 등록·가정 A1-A4→EXP 매핑·모니터링 5종(P1) + Story AC 30+ 측정 임계치·**HITL 루프백 재학습 3단계**(0.5%/500건/0.3%)·산술 교정(17,000배)·Traceability·NFR↔AC 연결(P2) → [[product/sources/52-PRD-V09-Quality-Improvement]] |
| **v1.0** | **54** | 2026-05-07 | **Master** | **SRS Readiness Gate 100% 달성**: Epic별 스프린트 분해(§4.4) + Seg B 피벗 시나리오(§7.2 R6) + 용어사전(§11) |

> 추가: raw 53_PRD_V09_Final_Readiness_Gate (Gate 통과 검증) → V10 Final 사이의 검증 단계.

## 진화 패턴 핵심

### V01 → V05: 멀티 LLM 멀티 패스 (병렬 작성 → 통합)
```
V01 Gemini    ─┐
V02 Cursor   ─┤
V03 Opus      ─┤── V05 Integrated (V01-V04 통합)
V04 GPT-4o   ─┘
```

### V05 → V07: 단계별 강화
- V05 Integrated → V06 Sonnet (수치화) → V07 Master (SRS 기준선)

### V08-V10: 결함 검토·품질 게이트
- V08 (VPS 결함 7건) → V09 (품질 18건) → V10 (Readiness Gate 100%)

## 주요 진화점

### V01 → V03 (구조화)
- 21 Epic 명세 신설
- MoSCoW 우선순위
- Gantt 로드맵
- → [[product/concepts/MVP-feature-spec]] § 21 Epic의 골격 형성

### V03 → V05 (시각화·통합)
- ERD (DB 스키마)
- API 인터페이스 명세
- A/B 실험 매트릭스
- 롤아웃 계획

### V05 → V07 (수치화)
- 북극성 KPI = W-AUR (≥60%)
- 보조 KPI 6개 (M3, CVR, Zero-touch 등)
- O-1~O-4 (4 Outcomes 정량)
- 8 벤치마크

### V08 (VPS 검토 7대 결함 패치)
- ADR-001 (북극성 KPI 선정 근거 문서화)
- AOS/DOS 매트릭스 통합
- **Seg B JTBD ⚠️ 부분 검증 명시** + R6 리스크 연결
- TAM-SAM-SOM 시장 규모 명시

### V09 (품질 리뷰 18건) — raw 52 정독 기반 정확화

**P0 (CJM KPI 8건 수치화)** — V08 정성 narrative → 4 페르소나 × CJM 단계 정량:
- Seg A: CVR≥8% / 첫 미션 진입 ≥50% / WAU ≥60% / 외부 공유 ≥15%
- Seg C: 첫 주 완료 ≥70% / M2 지속 ≥50%
- Seg B: M3 ≥40% / 단톡방 공유 ≥95%
- Seg D: 수동 조작 0회 / 서명 ≥85% / 알림장 승인 ≥90%

**P1 (3건)**:
- **Lock-in 4중 전략별 타겟 KPI 등록** (§8.5): 데이터 매몰 Churn≤5% / 아동 주도 DAU 유지 / 가족 네트워크 리퍼럴 / B2B2C FOMO CAC 0원
- **가정 A1-A4 → EXP 매핑** (§7.3): A1 가격→EXP-4 / A2 바이럴→§8.1 CTR / A3 환경→EXP-1+W-AUR / A4 B2B→EXP-3
- **모니터링 5종 대시보드 + 알림 임계치** (§5): 퍼널±20% / STT 5분 3% / LTV:CAC<3 / HITL 큐 24h 3건 / 외부 API 1h 5%

**P2 (5건)**:
- **Story AC 30+ 측정 임계치 + Neg AC** (§3 S1-S6) — 모든 AC가 측정 가능 임계치
- **HITL 루프백 재학습 3단계 명문화** (§3 4번째 원칙): ① 오진율 0.5% 초과 → 즉시 롤백 ② 보정 500건 누적 후 파인튜닝 재개 ③ 0.3% 이하 후 재배포
- **산술 교정** (§1.4): 시간 단축 ≥17,000배 = `2개월 ≈ 87,000분 ÷ 5분`
- **Traceability** (§9.1): PRD 섹션 ↔ 근거 문서 8건 매핑 (V08 부록 26 보고서 → PRD 본문 통합)
- **NFR ↔ AC 연결** (§5): NFR 성능 표 "연결 AC" 컬럼 신규 (S1-AC3, S1-AC2 등)

**P3 (2건)** — V09 Quality v0.9 헤더에서 P0/P1/P2 분류에 누락 (NFR 본문 §5에 흡수만):
- **F-05 Cold Start ≤1.5초 AC 미연결** → §5 성능 표 "연결 AC = 공통 (앱 UX 기본 요건). QA 별도 수행" 추가
- **F-06 SLA CS 응답 시간 측정 도구 명시** → §5 SLA 비고 "Zendesk/Freshdesk SLA 트래킹 + 관리자 에스컬레이션" 추가

✅ **18건 = P0(8) + P1(3) + P2(5) + P3(2)** (raw 51 재정독 정밀 매칭, 2026-05-09).

### V09 → V10 (Readiness Gate)
- §4.4 Epic별 스프린트 분해 추정 (230 SP / 24 sprints)
- §7.2 R6 Seg B 검증 실패 시 피벗 시나리오 (Plan B) 구체화
- §11 Glossary 용어사전 추가

## ⭐ Quality Gate 패턴 — 정량 5 사이클 (12차 ingest 보강)

> 정본: [[product/sources/PRD-Intermediate-Reviews-Meta]] — 44·47·49·51·53 메타 5종 정독.

| 단계 | raw | 게이트 | 결과 |
|---|---|---|---|
| **V01-V04 멀티 LLM 비교** (raw 44) | 184줄 | **9 항목 매트릭스** × 4 LLM (Gemini · Cursor · Opus · GPT) | V02 Opus가 압도적 골격 우승 + Best-of-Breed 6 항목 융합 권고 |
| **V05-V07 통합 + VPS↔PRD 매핑** (raw 47) | 186줄 | **7 변환 규칙 점검** | 매핑 완성도 **85%** + 3건 부분 결함 (Seg B JTBD 괴리 / 수익 모델 미반영 / Proof 원본 수치 미인용) |
| **V07 Patch** (raw 49) | 190줄 | **7 결함 패치** | ADR-001 신규 + §4.3 비즈니스 모델 + §9.0 AOS/DOS + §9.0-b JTBD 검증 + §9.0-c TAM-SAM-SOM + R6 + REWARD_PROGRESS ERD |
| **V08 품질 리뷰** (raw 51) | 180줄 | **5 체크리스트 + 추가** = 18건 | P0 CJM KPI 8건 + P1 3건 (모니터링·Lock-in·가정→실험) + P2 5건 (산술·Traceability 등) + P3 2건 |
| **V09 Readiness Gate** (raw 53) | 170줄 | **6 대항목 38 세부 항목 정량 채점** | **97% PASS** (6/6 영역). 감점 2건 (3-5 SP 추정 + 5-7 R6 Plan B) 모두 SRS 단계로 이관 |

→ 단순 작성→검토 사이클이 아니라 **정량 점수화로 객관화된 5 단계 게이트**.

### 4 LLM 강점 매트릭스 (raw 44)

| LLM | 고유 강점 |
|---|---|
| V01 Gemini | CJM journey + **HITL 독립 Story 6** (SLA 48h, 오진율 0.5%) |
| V02 Cursor | **Critical Path + 리스크 노드 Mermaid** + 안전 AC 내장 + **EXP-4 가격 앵커링** |
| **V02 Opus** ⭐ | **21 Epic + Gantt + NFR↔AC 역추적 + 6 엔터티 ER + 실험 게이트 + Proof 6** |
| V03 GPT | **Won't 명시** + WAU 북극성 + 사용자당 비용 |

### V07 Patch 7건 효과 (raw 49)

| # | 패치 | V08+ 영향 |
|---|---|---|
| 1 | Seg B `so that` "양육 성취감 인정" 복원 | 사용자 심리 동기 회복 |
| 2 | **ADR-001** 북극성 KPI 선정 근거 신규 | W-AUR > O-1 채택 논리 명문화 |
| 3 | **§4.3 비즈니스 모델 신설** | Freemium 4티어 + 70/15/15% + Y3 누적 449억 |
| 4 | **REWARD_PROGRESS ERD** | F12 게이미피케이션 누적 보상 추적 |
| 5 | **§9.0 AOS/DOS** 원본 인용 | 정량 기회 점수 (O-1/O-2 AOS 9.0) |
| 6 | **§9.0-b JTBD 검증 상태** | Seg B ⚠️ 부분 검증 명시 |
| 7a | **§9.0-c TAM-SAM-SOM** | TAM 150만 → SOM 15만 → 1Y 12K |
| 7b | **§7.1 R6** Seg B 부분 검증 리스크 | EXP-2 Plan B 연결 |

### V08 Quality Review 18건 결함 분포 (raw 51)

| 영역 | 합격/결함 | 우선 |
|---|---|---|
| Outcome–KPI 연계 | 4/1 | 🟡 F-01 |
| AC GWT | 30/2 | 🟡 F-02·F-03 |
| NFR | 14/3 | 🟡 F-04~F-06 |
| Differential Value | 7/1 | 🟢 F-07 (1,000배→17,000배 산술) |
| Proof 연결 | 12/3 | 🟡 F-08~F-10 |
| **CJM KPI** ⭐ | **8/8** | **🔴 P0** |

→ **P0 CJM KPI 8건이 최치명적**: 정성 문구 → 정량 임계 (예: "WAU" → "WAU ≥60%").

### V09 Readiness Gate 6 영역 점수 (raw 53)

| # | 영역 | % |
|---|---|---|
| 1 | 목표·지표 | **100%** |
| 2 | 스토리·AC | **100%** |
| 3 | 기능 요구 | 92% (-0.5 SP 추정) |
| 4 | 비기능 | **100%** |
| 5 | 리스크·가정 | 93% (-0.5 R6 Plan B) |
| 6 | 범위 In/Out | **100%** |
| **종합** | | **97%** ✅ PASS |

> PASS 조건: 종합 ≥85% + 개별 ≥70% — 크게 상회. SRS Golden Master 인증.

## 출처
- [[product/sources/54-PRD-V10-Final]] (Revision History L8-L21)
- [[product/sources/PRD-Intermediate-Reviews-Meta]] (5 메타 통합 정본 — 44·47·49·51·53)
- raw/40~54 파일명 (V01-V10 sequence)

## 관련 product 페이지
- [[product/concepts/VPS-evolution]] — VPS V01-V09 (PRD의 직접 기반)
- [[product/concepts/MVP-feature-spec]] — V10 종합 정본
- [[product/sources/54-PRD-V10-Final]] — V10 정독본

## Clinical 기둥 cross-link
- [[product/concepts/MVP-clinical-foundation]] — V10 임상 토대 통합본 (F1-a·F11·F15 임상 근거)
- [[clinical/concepts/언어발달지연]] — V10 F1-a 영유아 평가 임상 토대 (DLD 진단)
- [[clinical/concepts/조음장애]] — V10 F1-a articulation 한국어 특이성

## 보강 필요
- V01-V09 중간본 정독 후 각 버전 차이 narrative 정확화.
- 특히 V08 "VPS 검토 7대 결함" + V09 "품질 18건"의 구체적 결함 항목 — 학습 가치 높음.
- V05 Integrated의 ERD/API 명세 (V10 §6에 흡수) — 시스템 아키텍처 진화로서 별도 페이지 후보.
- raw 55_SRS_Prompt_Compatibility_Review (V10 → SRS 변환 검토) — SRS evolution timeline의 시작점.
