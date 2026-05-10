# Speech-Therapy Wiki — Hybrid Knowledge Base

언어치료 **제품 개발(Product) ↔ 임상 언어치료(Clinical)** 두 기둥을 동등하게 다루는 지식베이스. [llm-wiki.md](../llm-wiki.md) 의 LLM 위키 패턴을 하이브리드로 인스턴스화했습니다.

## 두 기둥

| Pillar | 위치 | 다루는 것 |
|---|---|---|
| **A · Product** | [product/](product/) | 시장·경쟁 분석, 고객 리서치(JTBD/Persona/CJM), VPS·PRD·SRS 진화, 엔지니어링 태스크 |
| **B · Clinical** | [clinical/](clinical/) | 조음·유창성·언어발달·신경언어 등 장애 유형, 평가 도구, 치료 기법, 임상 가이드 |

핵심 가치는 두 영역 사이의 **명시적 cross-link** 입니다. 제품 결정에는 임상 근거가, 임상 지식에는 제품적 함의가 따라옵니다.

## 어떻게 탐색하는가

- **[index.md](index.md)** — 양 기둥 전체 페이지 카탈로그 + cross-link 현황. 여기서 시작하세요.
- **[log.md](log.md)** — 작업 이력 타임라인.
- 각 기둥은 동일한 3-종 패턴:
  - `concepts/` — 프레임워크·개념·종합 분석
  - `entities/` — 도구·인물·기관·경쟁사·페르소나
  - `sources/` — 원본 자료의 요약 페이지

## 어떻게 추가하는가

1. 원본 자료를 [`../raw/`](../raw/) 에 둔다 (이미지·PDF는 [`../raw/assets/`](../raw/assets/)).
2. Claude에게 `이 자료를 위키에 정리해줘` 라고 요청한다.
3. Claude가 자료의 성격을 보고 product / clinical 어느 기둥에 배치할지 제안하고, 사용자 확인 후 요약 페이지 생성, 영향받는 개념·엔티티 페이지 갱신, 다른 기둥과의 cross-link 탐색, [index.md](index.md) 와 [log.md](log.md) 업데이트를 수행한다.

대량 자료(예: PRD V01→V10)는 timeline 페이지 하나로 일괄 정리할 수 있습니다.

## 어떻게 질문하는가

- `X에 대해 위키에 뭐가 있어?` → 양 기둥에서 검색해 종합 답변.
- `이 결정의 임상 근거가 뭐야?` → product → clinical 역방향 추적.
- `X와 Y 비교해줘` → 적절한 기둥의 `concepts/` 아래 비교 페이지 신규 생성.
- `위키 린트 돌려줘` → 모순·고아 페이지·**도메인 간 cross-link 누락** 점검.

## 운영 규칙

전체 운영 규칙은 워크스페이스 루트의 [`../CLAUDE.md`](../CLAUDE.md) 에 정의되어 있습니다. Claude Code 세션 시작 시 자동 로드.

## 원칙

- `raw/` 의 원본은 **불변**. Claude는 읽기만 한다.
- `wiki/` 는 Claude가 작성·유지보수한다.
- 모든 사실 주장에는 출처 페이지 링크.
- 두 기둥 어느 쪽과도 한 번 이상 cross-link 되지 않은 페이지는 린트 의심 항목.
- 환자/내담자 식별 가능 정보는 익명화 후에만 기록.
