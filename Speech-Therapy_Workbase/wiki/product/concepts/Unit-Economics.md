---
type: concept
pillar: product
category: synthesis
aliases: [유닛 이코노믹스, Unit Economics, LTV-CAC]
tags: [unit-economics, LTV, CAC, payback]
---

# Unit Economics

> **v1.0 (2트랙 구조)** — 단일트랙 stub 에서 졸업(2026-06-22 재정렬). 핵심 지표 + 발음/문해 2트랙 단위 경제 구조를 정리. 트랙B(문해) 정량치는 **파일럿 실측 전 — 구조만 확정, 수치 pending**. inline 출처는 아래 §inline 유지.

## 핵심 지표 (보강 예정)

- **CAC** (Customer Acquisition Cost) — 채널별 / Segment별
- **LTV** (Lifetime Value) — Retention 곡선 기반
- **Payback Period** — 누적 매출이 CAC 회수까지
- **LTV:CAC 비율** — 9.0x 목표 (보수 TAM 기준, [[product/concepts/customer-segmentation]] 참조)

## 2트랙 단위 경제 (CR-2026-009 재정렬)

> 발음(트랙A)·문해(트랙B)는 **수익 동력이 비대칭**이라 단위 경제도 분리해 본다. 트랙B 정량치는 **파일럿 실측 전 — 구조만 확정, 수치 pending**(연습-only라 점수 산출물 과금 논리와 다름).

| 항목 | 트랙A — 발음 "확인" (만2~7) | 트랙B — 읽기·말 "놀이·연습" (만2~12) |
|---|---|---|
| 가치 동력 | 측정 충격 → 가이드 → 점수 추이 | 연습 지속 → 습관 → engagement |
| 리텐션 지표 | W-AUR(주간 미션 완수율) | W-LER(주간 문해 활동률, engagement) |
| 과금 위치 | 점수 산출물 구독(Basic 35K / Premium 50K) | **미정** — 무료 Lead-gen vs tier 편입 owner 결정 |
| CAC | 채널별(맘카페·인스타) ≤30K → B2B 제휴 10K↓ | 트랙A 퍼널 교차활용 가정(별도 실측 필요) |
| LTV:CAC | ≥4.0(목표) / 9.0x(보수 TAM) | pending(파일럿) |
| Lock-in | 점수 데이터 해자 | 발달단계 연속 활동·습관 |

⚠️ 트랙B 수치는 W-LER baseline 축적 + 파일럿 후 확정. 트랙A 수치는 기존 정본([[product/concepts/Porter-5-Forces-Analysis]]·[[product/concepts/customer-segmentation]]) 계승. 근거: [[product/concepts/VPS-evolution]] V10 · ADR 북극성 2트랙(`docs/realignment/ADR_NorthStar_2track.md`).

## inline 현재 출처

- [[product/concepts/Key-Success-Factors]] — LTV:CAC 9.0x 정량 보강
- [[product/sources/02-Porter-5F-reinforce]] — Porter 5F 분석 내 단위 경제성
- [[product/sources/12-Problem-Definition-Final]] — Problem-Definition 단계 경제성 가정
