---
type: source
pillar: product
title: Competitive Briefing — 통합 경쟁사 브리핑 (Merged)
source_path: ../../../raw/5_Competitive Briefing_Merged.md
source_type: competitive_analysis
authors: []
year: 2026
ingested: 2026-05-09
tags: [경쟁사, 시장구조, 포지셔닝맵, DTx, 클러스터1-9]
---

# Competitive Briefing (Merged) — 요약

> **한 줄 요약.** 8개 주요 경쟁사를 4개 카테고리로 분류하고, **DTx 쏠림으로 비의료 B2C 교육 카테고리에 절대 강자 부재**(white space)임을 도출. Opus(3) + Gemini(4) 두 분석을 통합한 최종본.

기반 문서: `3_Competitive Briefing_Opus.md`, `4_Competitive Briefing_Gemini.md`. 본 문서가 통합 최종본.

## 4개 경쟁사 카테고리

### A. AI 언어교육 앱 (B2C) — 비의료/교육 중심
- [[product/entities/에이치투케이]] (소중한글) — KAIST 출신, 2017, 한글 파닉스 특화
- [[product/entities/캐치잇플레이]] — 2017, 게이미피케이션 + 다국어 확장
- [[product/entities/와우키키]] (하이동동) — 2023, 멀티모달 AI(입모양+발성), 부모·교사·아동 삼자 연동

### B. AI 언어재활 솔루션 (DTx 지향) — 의료 연계/치료 중심
- [[product/entities/네오폰스]] (토키랜드) — 삼성 C-Lab 출신, **식약처 임상시험 계획 승인**
- [[product/entities/말과학놀이터]] (뉴로톡) — 정부지원, 장애음성 특화 STT
- [[product/entities/두부]] (舊 두브레인) — **시리즈B 210억** (시장 최대 자본력), 메타버스 사회성

### C. AI 기술공급 (B2B)
- [[product/entities/에듀템]] — ELA(음성인식·발음평가 API) SaaS/API, AI 교과서 참여

### D. 진단 플랫폼
- [[product/entities/송앤스타크]] (스피치맵) — 5분 AI 진단, 식약처 2등급 추진, 2027 B2C 전환 예정

## 포지셔닝 맵

```
                    교육 (Education)
                        ▲
                        │
     에이치투케이        │        캐치잇플레이
     (소중한글)          │
  B2C ◀────────────────┼───────────────▶ B2B
                        │
     와우키키            │        에듀템
     네오폰스            │
     두부                │        송앤스타크
     말과학놀이터        │
                        ▼
                    치료 (Therapy/DTx)
```

## 핵심 인사이트 — White Space

1. **DTx 쏠림**: 두부·말과학놀이터·네오폰스 등 다수가 식약처 인허가에 자원 집중.
2. **리더십 공백 (기회)**: 비의료 B2C 언어발달 특화 시장은 절대 강자 부재 → **18~24개월 골든타임** (송앤스타크 B2C 전환 2027 + 와우키키 확장 + 대형 교육기업 진출 전).

→ [[product/concepts/competitive-landscape]] 에서 종합.

## 신규 진입 차별화 기회 (Top 3)

| 기회 | 전략 | 위험도 | 잠재력 |
|---|---|---|---|
| 진단-교육 퍼널 | 송앤스타크식 진단을 무료 전환 트리거로 | 중 | **매우 높음** |
| 비동기 부모 코칭 | 텍스트 기반 전문가 코칭 구독 | 낮음 | 높음 |
| 데이터 시각화 리포트 | 주간/월간 발달 추이 대시보드 | 낮음 | 높음 |

## 규제 대응

- **클라우드 보안 인증(CSAP)** — B2G 확장을 위해 초기 아키텍처부터 고려.
- **의료기기 오인 주의** — "치료/재활" 단어 사용 배제, "교육/훈련"으로 포지셔닝.

## 인용 가능 위치

| 주제 | 원본 위치 |
|---|---|
| 카테고리 A (B2C 교육) | L24~L32 |
| 카테고리 B (DTx) | L36~L44 |
| 카테고리 C (B2B), D (진단) | L48~L51 |
| 포지셔닝 맵 | L57~L75 |
| White space 도출 | L77~L80 |
| 신규 진입 기회 | L102~L106 |

## Clinical 기둥 cross-link

- 카테고리 B(DTx)의 "치료" 포지션은 [[clinical/concepts/실어증]], [[clinical/concepts/마비말장애]] 등 트랙1 임상 영역과 직접 매핑됨. 우리는 그 영역을 의도적으로 회피.
- 우리 타깃("회색지대 부모")은 [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 진입 직전 대기·자가 학습 단계.

## 한계

- 비상장 기업의 매출·운영 데이터는 추정 포함.
- 카테고리 A의 캐치잇플레이는 다국어 확장으로 본 시장 직접 경쟁자가 아닐 가능성 — 별도 검증 필요.
- 카테고리 D의 송앤스타크는 가장 위협적 경쟁사. 가치사슬 분석([[product/sources/06-Competitive-Value-Chain]])에서 "최약체"로 식별되나 그것은 **현재** 기준이며 2027 B2C 전환 후 재평가 필요.
