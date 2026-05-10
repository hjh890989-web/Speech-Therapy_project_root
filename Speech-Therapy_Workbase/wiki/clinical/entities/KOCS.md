---
type: entity
pillar: clinical
entity_kind: assessment
aliases: [한국 아동 말더듬 검사, Korean Childhood Stuttering Test, KOCS]
tags: [말더듬, 유창성, 학령전, 학령기, 표준화검사, 트랙2]
---

# KOCS (한국 아동 말더듬 검사)

한국 아동의 **말더듬 빈도·유형·정도**를 평가하는 표준화 검사. [[clinical/concepts/유창성장애]] 영역의 한국 임상 표준 도구.

> ⚠️ **본 페이지는 스텁(stub)** — 2026-05-10 batch ingest로 자료 식별. 후속 ingest에서 본문 보강 예정.

## 핵심 자료
- [한국 아동 말더듬 검사(KOCS) 표준화 연구](../../../raw/assets/언어치료 자료/한국 아동 말더듬 검사(KOCS) 표준화 연구.pdf)
- 사용 영역: [[clinical/concepts/유창성장애]] 평가
- 첫 등장: [[clinical/sources/2026-05-10-언어치료-자료실-종합-인벤토리]]

## 보강 필요

- 적용 연령
- 개발자·표준화 발행 연도
- 하위 검사 구성 (Stuttering-Like Disfluency vs Other Disfluency)
- 임상 절단점 (백분위·표준점수)
- SSI-4 (Stuttering Severity Instrument) 등 국제 도구와의 비교

## Product cross-link — MVP 회피 영역 ⛔

| Product 페이지 | 매핑 의미 |
|---|---|
| [[clinical/concepts/유창성장애]] | MVP 회피 영역 (말더듬 ≠ 조음 정확도) |
| [[product/concepts/MVP-feature-spec]] § F1-a articulation | F1-a articulation 점수와 **명시적 분리** 필요 |
| [[product/concepts/architecture-decisions]] § ADR-04 | "말더듬 진단" 용어 회피 |

→ MVP에서는 평가 도구로 매핑하지 않음. 본 entity는 임상 영역 명세상 존재 기록 + 회피 영역의 임상 토대 명시 목적.
