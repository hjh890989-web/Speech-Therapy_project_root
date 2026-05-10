---
type: source
pillar: product
title: PRD ↔ SRS Mapping & Compliance Review (9 기준)
source_path: ../../../raw/66_PRD_to_SRS_Mapping_Review.md
source_type: review
authors: []
year: 2026
ingested: 2026-05-09
tags: [PRD, SRS, 매핑검증, ISO29148, Quality Gate, 클러스터55-67]
---

# PRD ↔ SRS Mapping Review — 요약

> **한 줄 요약.** PRD V10 → SRS V05/V06 변환의 9가지 기준 검증. **전 항목 PASS** — Implementation-Ready 상태. PRD 비즈니스 의도 100% 보존 + V05 기술 제약 (Next.js 풀스택) 충실 반영.

## 9 검증 기준 + 결과

| # | 검증 항목 | PRD 소스 | SRS 타겟 | 결과 |
|---|---|---|---|---|
| 1 | 개요·목표 | §1 (북극성 KPI) | §1.1 Purpose, §1.2 Scope, §4.2 NFR | **Pass (우수)** |
| 2 | 페르소나 | §2 (Seg A/B/C/D) | §2 Stakeholders, §1.3 Definitions | **Pass (완벽)** |
| 3 | 사용자 스토리·AC | §3 (S1-S6) | §4.1 FR, §5 Traceability | **Pass (우수)** |
| 4 | 기능 요구 (Epic) | §4 (F1-F18 MoSCoW) | §4.1 FR (REQ-FUNC-001~061) | **Pass (특이사항)** |
| 5 | 비기능 요구 | §5 NFR | §4.2 NFR (REQ-NF-001~030) | **Pass (스택 최적화)** |
| 6 | 데이터·인터페이스 | §6 (API, Schema) | §3 System Context, §3.5 API, §6.1 ERD | **Pass (완벽)** |
| 7 | 범위·리스크·가정 | §7-§8 | §1.2 Scope, §1.5 Constraints | **Pass (완화 구체화)** |
| 8 | 실험·롤아웃 | (PRD Validation) | §6.6 Validation Plan, §6.7 Contingency | **Pass (그로스 흡수)** |
| 9 | 근거 (인터뷰·JTBD) | §9 부록 | §1.4 References | **Pass** |

## 핵심 발견 (특이사항)

### #4 기능 요구사항 — V05 기술 제약 반영
> PRD에서는 **일반적 '기능'**으로 명세된 것이 SRS에서는 **구체적 기술 명세**로 구체화:
> - PRD "API" → SRS `Server Action` / `Route Handler`
> - PRD "모바일" → SRS `PWA Service Worker` + `Capacitor`
> - PRD "DB" → SRS `Prisma + Supabase PostgreSQL + pgvector`

→ **PRD의 비즈니스 의도 100% 보존** + V05 기술 스택의 충실한 변환.

### #5 비기능 요구 — 실용적 고도화
> 단순 성능 기준 → V05 아키텍처 제약 반영:
> - "응답 p95 ≤800ms" → "**Vercel Serverless 10s timeout 제약 고려**"
> - 비용 통제 (REQ-NF-018: 유저당 ₩5,250) 등 비즈니스 제약을 NFR로 편입.

### #7 리스크 — 신규 R7, R8 도출
> Vercel/Supabase 종속성 리스크:
> - **R7**: Vercel 함수 Timeout (10-60s)
> - **R8**: Supabase 무료 티어 제한
> → 두 리스크 모두 **아키텍처 제약사항**으로 관리.

### #8 그로스 의도 흡수
> EXP-2 실패 시 M3 리텐션 피벗(Plan B)이 SRS §6.7 Contingency Plan에 시스템 차원으로 흡수. 단순 개발 명세서가 아닌 **비즈니스 연속성 계획**까지.

### #9 양방향 추적성
> PRD Source → SRS REQ → TC ID 1:1:1:1 매핑. 요구사항 표의 `Source` 컬럼이 PRD Story를 가리키고, Story는 PRD 부록 (인터뷰/JTBD)을 가리킴.

## 총평

> **Pass — Implementation-Ready 상태**
>
> SRS V05/V06 ([[product/sources/65-SRS-V06-Final]]) 는 PRD V10 ([[product/sources/54-PRD-V10-Final]]) 의 비즈니스 의도를 100% 보존하면서 V05 기술 제약을 충실히 반영. **엔지니어가 즉시 개발 착수 가능한 수준**.

## 인용 가능 위치

| 주제 | 원본 위치 |
|---|---|
| 9 검증 항목 표 | 전체 (L8~L88) |
| #4 V05 기술 변환 특이사항 | L40~L44 |
| #5 비용 통제 NFR | L51~L53 |
| #7 R7, R8 신규 | L70~L71 |
| #8 EXP-2 Plan B 흡수 | L77~L79 |
| 총평 | L91~L93 |

## Clinical cross-link

- 본 페이지는 PRD↔SRS 매핑 검증이라 직접 임상 cross-link 없음. 단, [[product/sources/65-SRS-V06-Final]] 와 [[product/sources/54-PRD-V10-Final]] 의 임상 매핑이 본 검증을 통해 SRS 차원에서 보존됨을 확인.

## 관련 product 페이지
- [[product/sources/54-PRD-V10-Final]] — Source PRD
- [[product/sources/65-SRS-V06-Final]] — Target SRS (검증 대상)
- [[product/concepts/PRD-evolution]] — V01-V10 진화
- [[product/concepts/SRS-evolution]] — V01-V06 진화 + 본 검증 결과
- [[product/concepts/MVP-feature-spec]] — 21 Epic 정본 (PRD↔SRS 정합)
