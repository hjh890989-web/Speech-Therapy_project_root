# Speech-Therapy 지식베이스 운영 규칙 (Hybrid)

이 문서는 Claude Code가 이 워크스페이스에서 지식베이스를 어떻게 구축·유지할지를 규정한 스키마(schema) 파일입니다. [llm-wiki.md](llm-wiki.md) / [llm-wiki.ko.md](llm-wiki.ko.md) 의 패턴을 **언어치료 제품 개발(Product) ↔ 임상 언어치료 도메인(Clinical) 하이브리드** 구조로 인스턴스화한 것입니다. Claude Code 세션이 시작될 때마다 자동으로 로드됩니다.

---

## 1. 도메인 — 두 기둥(Pillars)

이 위키는 두 영역의 지식을 **동등한 비중**으로 다루고, 두 영역 사이의 **명시적 cross-link**을 핵심 가치로 삼습니다. 제품 결정은 임상적 근거에 의해, 임상 지식은 제품 기능 설계에 의해 의미가 부여됩니다.

### Pillar A: Product (제품 개발)
이 워크스페이스의 raw 자료 다수가 속하는 영역입니다.
- 시장·경쟁 분석 (Porter's 5F, KSF, Competitive Briefing, Market Sizing/Segmentation)
- 고객 리서치 (Persona Spectrum, Customer Journey Map, JTBD Interviews, Pain/Goal Analysis)
- 제품 정의의 진화 (Business Model Canvas, Value Proposition Sheet V01→V09, Job-Feature Mapping)
- 경쟁사 UX 분석 (Telecom Kids AI / Edutech / DTx / B2B2C Platform)
- 제품·엔지니어링 스펙 (PRD V01→V10, SRS V01→V06)
- 엔지니어링 태스크 브레이크다운 (API/DB/FR-C/FR-Q/INFRA/MOCK/MON/OPS/PERF/SEC/TEST)

### Pillar B: Clinical (임상 언어치료)
제품의 도메인 토대를 이루는 영역입니다.
- 조음·음운 / 유창성 / 음성 / 언어발달 / 신경언어 / 삼킴 장애
- 보완대체의사소통(AAC), 평가 도구 / 표준화 검사 / 발달 규준
- 치료 기법 / 중재 프로토콜 / 실제 세션 가이드

### Cross-link 원칙

- 제품 페이지는 의사결정의 임상 근거를 명시적으로 인용한다 → `[[clinical/concepts/조음음운장애]]`
- 임상 페이지는 그것이 제품의 어느 기능·결정과 연결되는지 표시한다 → `[[product/product-spec/PRD-V10]]`
- 두 도메인 모두 `entities/`에 동시 등장하는 대상(예: 평가 도구, 치료사 페르소나)은 한 도메인에 정본을 두고 다른 도메인에서 링크한다.

## 2. 디렉토리 구조

```
Speech-Therapy_Workbase/
├── CLAUDE.md              # ← 본 스키마 파일
├── llm-wiki.md / llm-wiki.ko.md   # 패턴 원본
│
├── raw/                   # [Layer 1] 원본 자료 - 불변
│   ├── 1~67_*.md          #   전략·리서치·제품·스펙 문서
│   ├── TASKS/*.md         #   엔지니어링 태스크
│   ├── 0_언어치료_실제_세션_상세가이드.md   # 임상 자료
│   └── assets/            #   이미지/PDF/데이터
│
└── wiki/                  # [Layer 2] LLM이 작성·유지
    ├── README.md
    ├── index.md           #   전체 카탈로그 (양 기둥 모두)
    ├── log.md             #   작업 이력
    │
    ├── product/           #   ── Pillar A ──
    │   ├── concepts/      #     프레임워크·개념·종합 분석
    │   ├── entities/      #     경쟁사·페르소나·이해관계자
    │   └── sources/       #     raw/ 비즈니스·제품·엔지니어링 문서 요약
    │
    └── clinical/          #   ── Pillar B ──
        ├── concepts/      #     장애 유형·치료 기법·발달 규준
        ├── entities/      #     평가 도구·연구자·기관
        └── sources/       #     임상 자료 요약
```

## 3. 작성 언어와 표기

- 모든 위키 페이지는 **한국어**로 작성한다.
- 학술·전문 용어는 한국어 우선, 첫 등장 시 영문 병기: `조음장애(articulation disorder)`, `Job To Be Done(JTBD)`.
- 표준 약어(DSM-5, ICD-10, U-TAP, K-WAB, PRD, SRS, JTBD, BMC, VPC 등)는 원어를 유지한다.
- 인용 시 출처 페이지·문단 위치를 가능한 한 명시한다.

## 4. 페이지 종류와 명명 규칙

각 카테고리(`product/`, `clinical/`)는 동일한 3-종 페이지 패턴을 따릅니다.

### 4.1 `*/sources/` — 원본 자료 요약

원본 자료 1개당 sources 페이지 1개. 어느 기둥(product/clinical)에 두는지는 자료의 주된 성격으로 결정.

- **product/sources/** : raw/ 의 비즈니스·제품·엔지니어링 문서 (예: PRD, SRS, VPS, JTBD 인터뷰).
- **clinical/sources/** : 언어치료 임상 자료 (예: 논문, 임상 가이드, 세션 가이드).
- 파일명: `<원본번호 또는 날짜>-<짧은-슬러그>.md` 예) `54-PRD-V10-final.md`, `2026-05-09-DLD-진단기준.md`
- 프론트매터:
  ```yaml
  ---
  type: source
  pillar: product | clinical
  title: 원문 제목
  source_path: ../../../raw/원본파일명.md
  source_type: prd | srs | vps | jtbd | task | competitive_analysis | paper | guideline | clinical_note | lecture
  authors: [...]
  year: 2026
  ingested: 2026-05-09
  tags: [...]
  ---
  ```
- 본문 구조: **한 줄 요약 → 핵심 주장/내용 → 근거·방법 → 시사점 → 다른 기둥 cross-link → 같은 기둥 내 관련 페이지**.

### 4.2 `*/entities/` — 엔티티 페이지

| Pillar | 다루는 대상 |
|---|---|
| product/entities | 경쟁사 (Telecom Kids AI 등), 페르소나, 이해관계자 그룹, 채널, 파트너 |
| clinical/entities | 평가 도구·표준화 검사 (U-TAP, K-WAB, REVT 등), 인물(연구자·임상가), 기관, 치료 프로토콜 명칭 |

- 파일명: `엔티티-이름.md` (약어가 더 일반적이면 약어 사용)
- 프론트매터:
  ```yaml
  ---
  type: entity
  pillar: product | clinical
  entity_kind: competitor | persona | stakeholder | partner    # product
              | assessment | person | institution | protocol   # clinical
  aliases: [...]
  tags: [...]
  ---
  ```

### 4.3 `*/concepts/` — 개념 페이지

| Pillar | 다루는 대상 |
|---|---|
| product/concepts | 프레임워크 (Porter's 5F, JTBD, BMC, VPC), 제품 개념(MVP 범위, 핵심 가치제안), 종합 분석(VPS 진화 트래킹, PRD V01→V10 변경사), 결정 기록(ADR 성격) |
| clinical/concepts | 장애 유형, 이론, 발달 규준, 치료 기법, 평가 영역 |

- 파일명: `개념-이름.md` 예) `JTBD.md`, `VPS-evolution-V01-V09.md`, `조음음운장애.md`
- 프론트매터:
  ```yaml
  ---
  type: concept
  pillar: product | clinical
  category: framework | product_decision | synthesis | timeline | adr   # product
          | disorder | technique | theory | norm | assessment_domain    # clinical
  tags: [...]
  ---
  ```

### 4.4 상호 참조 규칙

- 페이지 간 링크는 **Obsidian 위키링크 `[[경로/페이지명]]`** 형식. 도메인 간 링크는 항상 도메인 접두어 포함: `[[clinical/concepts/조음음운장애]]`.
- 처음 도입되는 개념·엔티티는 즉시 링크를 만든다. 대상 페이지가 없으면 한 줄 **스텁(stub)** 이라도 생성.
- 본문 내 사실 인용은 sources 페이지로 위키링크: `…라고 보고된다([[clinical/sources/2026-05-09-DLD-진단기준]]).`
- 페이지가 다른 기둥과 **하나도 cross-link 되지 않는다면** 린트 단계에서 의심 항목으로 표시.

## 5. 운영 워크플로

### 5.1 Ingest — 자료 수집

사용자가 `raw/`에 새 파일을 두고 "이 자료 정리해줘" 와 같이 지시하면:

1. 원본을 읽고 핵심 시사점을 사용자와 한국어로 짧게 논의.
2. 자료의 주된 성격에 따라 `product/sources/` 또는 `clinical/sources/` 에 요약 페이지 작성. **frontmatter `pillar`** 를 반드시 지정.
3. 영향받는 `*/concepts/`, `*/entities/` 페이지를 생성·갱신. 새로 등장한 개념·도구·인물·경쟁사는 스텁이라도 만든다.
4. **다른 기둥과의 연결을 능동적으로 탐색**한다 — 제품 결정의 임상 근거, 임상 개념의 제품적 함의가 있다면 cross-link을 명시. 연결이 없으면 그 사실 자체를 메모.
5. [wiki/index.md](wiki/index.md) 갱신 — 양 기둥 표에 새 페이지 추가, 한 줄 요약 포함, 통계 업데이트.
6. [wiki/log.md](wiki/log.md) 에 항목 append: `## [YYYY-MM-DD] ingest | 자료 제목` + 변경 페이지 목록 + 추가된 cross-link 수.
7. 이전 자료와 **모순되는 주장**이 있으면 양쪽 페이지에 `> ⚠️` 표시.
8. 한 자료가 영향을 미치는 페이지 수의 감각: 작은 자료 5~10개, 큰 자료(PRD/SRS/VPS) 15~30개. 너무 적으면 cross-reference를 빠뜨린 것.

#### 5.1a 일괄 수집(batch ingest)
PRD V01→V10 같은 시리즈 자료는 한꺼번에 처리할 수 있다. 이 경우 시리즈 전체를 추적하는 **timeline 페이지** 를 `product/concepts/` 에 만들고(예: `PRD-evolution.md`), 개별 sources 페이지는 변경점 중심으로 짧게 작성.

### 5.2 Query — 질의

사용자가 위키에 대해 질문하면:

1. 먼저 [wiki/index.md](wiki/index.md) 를 읽어 양 기둥 모두에서 후보 페이지를 추린다.
2. 관련 페이지를 읽고 답변을 종합. **모든 사실 주장에 출처 페이지 링크**.
3. 답변이 새롭게 가치 있는 종합·비교라면 사용자 동의를 받아 적절한 기둥의 `concepts/` 아래 새 페이지로 저장 (`category: synthesis`).
4. log에 `## [YYYY-MM-DD] query | 질문 요약` append.

### 5.3 Lint — 위키 점검

사용자가 "린트 돌려줘" 등으로 지시하면 다음을 점검·보고:

- 페이지 간 **모순** (동일 사실에 대한 sources 간 불일치 포함)
- 새 자료에 의해 **무효화된 오래된 주장**
- 인바운드 링크 0인 **고아 페이지**
- 본문에서 언급되지만 자체 페이지가 없는 **중요 개념·엔티티**
- **누락된 cross-link** — 특히 *다른 기둥과 한 번도 연결되지 않은 페이지*
- **PRD/SRS/VPS의 임상 근거 누락** — product/ 페이지가 임상 주장을 펴는데 clinical/ 인용이 없으면 의심
- 보강 가능한 외부 검색 후보 (데이터 공백)

보고서 제시 후 승인된 항목만 자동 수정.

## 6. `log.md` 포맷

각 항목은 다음 헤더로 시작 — 단순 grep 파싱 가능.

```markdown
## [2026-05-09] ingest | 자료 제목
- pillar: product
- 추가: wiki/product/sources/54-PRD-V10-final.md
- 갱신: wiki/product/concepts/PRD-evolution.md, wiki/product/entities/페르소나-부모.md
- cross-link: → [[clinical/concepts/조음음운장애]] 1건 신규
- 메모: PRD V09 → V10에서 평가 항목 변경. 임상 근거 보강 필요.
```

이벤트 종류: `init` · `ingest` · `query` · `lint` · `note` · `cleanup`.

## 7. 금기 사항

- `raw/` 내 파일은 **절대 수정·삭제하지 않는다**. 원본은 불변.
- 출처 없는 사실 주장 금지. LLM 사전 지식이라면 `(일반 지식)` 으로 표시.
- 임상 권고를 단정적으로 적지 않는다. 항상 `[[자료]]에 따르면 …` 출처 귀속.
- 제품 결정을 단정적으로 적지 않는다. 항상 어느 PRD/VPS 버전·인터뷰의 결과인지 명시.
- 환자/내담자 식별 가능 정보는 익명화 후 기록.
- 기존 페이지를 통째로 새로 쓰지 않는다. 가능한 한 부분 갱신으로 구조와 인바운드 링크를 보존.

## 8. 자주 쓰는 지시 예시

| 사용자 지시 | Claude 동작 |
|---|---|
| "이 자료 위키에 정리해 줘" | §5.1 Ingest. pillar 자동 판별 후 사용자 확인. |
| "PRD V01부터 V10까지 흐름 정리해줘" | §5.1a batch ingest, `product/concepts/PRD-evolution.md` 생성. |
| "이 결정의 임상 근거가 뭐야?" | product → clinical 역방향 추적. 누락 시 보고. |
| "X와 Y 비교 페이지 만들어줘" | 적절한 기둥의 `concepts/` 아래 synthesis 페이지 생성. |
| "위키 린트 돌려줘" | §5.3 Lint. 도메인 간 cross-link 누락 강조. |
| "최근 작업 뭐였지?" | `log.md` 마지막 N개 항목 표시. |

## 9. 진화

이 스키마는 사용 과정에서 함께 진화시킨다. 규칙이 어색하다 느껴질 때마다 본 파일을 직접 수정하고, `log.md`에 `## [YYYY-MM-DD] note | CLAUDE.md 갱신` 으로 기록.
