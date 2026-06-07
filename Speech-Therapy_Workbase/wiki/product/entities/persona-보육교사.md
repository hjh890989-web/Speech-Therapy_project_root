---
type: entity
pillar: product
entity_kind: persona
aliases: [Seg D-2, 보육교사, 어린이집 교사, D-2 실무 운영자]
tags: [persona, Seg-D, D-2, DMU, 실무운영자, B2B2C, VPS-V08]
---

# persona-보육교사 (Seg D-2 · 실무 운영자)

기관 채널(어린이집·유치원) DMU에서 **D-1 결제권자([[product/entities/persona-오한솔]] 원장)** 와 분리된 **D-2 실무 운영자(보육 교사)**. VPS V08에서 Seg D를 D-1/D-2로 분리하며 정의된 DMU 페르소나 ([[product/sources/31-32-VPS-V07-V08-Detail]] § DMU 세분화).

> ⚠️ **stub** — 본 페이지는 55차 Lint에서 신규 생성. 기존 [[product/sources/31-32-VPS-V07-V08-Detail]]가 Seg D-2를 [[product/entities/persona-김민지]](= Non-user Seg A 워킹맘)로 잘못 링크한 모순을 해소하기 위해 작성. 상세 페르소나 본문은 보강 예정.

## DMU 프로파일 (VPS V08 기준)

| 항목 | 내용 |
|---|---|
| **세그먼트** | Seg D-2 (기관 채널 실무 운영자) |
| **역할** | 어린이집·유치원 보육/담임 교사 — 도구 실제 사용자 |
| **Job** | 학부모 감정 소모 + 업무 과중 방지 (관찰·기록·소통 부담 최소화) |
| **Pain** | 신규 도구 = 업무 과중 반발 ("또 입력하라고?") |
| **완화 전략** | **F9.2 Zero-touch** (자동 관찰·기록) + **F9.3 자동 PDF 리포트** → "마이크만 켜두면 끝" |
| **결제권** | 없음 (결제권자 = D-1 원장 [[product/entities/persona-오한솔]]) |

## Product 정합

- [[product/sources/31-32-VPS-V07-V08-Detail]] § DMU 세분화 — D-1/D-2 분리 출전
- [[product/concepts/customer-segmentation]] — 5 페르소나 (D-1/D-2 분리 정본)
- F9.2 Zero-touch / F9.3 자동 PDF = D-2 업무 과중 반발 방어 ([[product/concepts/MVP-feature-spec]])

## Clinical 정합

- 보육 교사 = 영유아 일상 환경 관찰자 → [[clinical/concepts/언어발달지연]] 조기 선별의 1차 접점 (가정 외)
- 자연스러운 일상 발화 관찰 = [[clinical/concepts/아동언어치료-핵심기법]] 4기법(평행 발화·확장 등)의 기관 적용 가능성

## 보강 필요

- 구체적 인물 프로파일 (이름·연차·기관 유형)
- B2B2C Phase 4 진입 시 D-2 온보딩 시나리오
- D-1(원장) ↔ D-2(교사) 의사결정 상호작용
