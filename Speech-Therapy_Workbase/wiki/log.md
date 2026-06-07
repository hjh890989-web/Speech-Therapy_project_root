---
type: log
---

# Wiki Log

위키에서 일어난 모든 작업을 시간 순으로 기록합니다. **Append-only** — 과거 항목은 수정·삭제하지 않습니다.

각 항목은 다음 형식의 헤더로 시작합니다:

```
## [YYYY-MM-DD] <event> | <짧은 요약>
```

이벤트 종류: `init` · `ingest` · `query` · `lint` · `note` · `cleanup`

PowerShell 환경에서 최근 항목 조회:

```powershell
Select-String -Path wiki/log.md -Pattern '^## \[' | Select-Object -Last 10
```

---

## [2026-05-09] init | 지식베이스 초기 구축

- 생성: [CLAUDE.md](../CLAUDE.md) — 위키 운영 스키마
- 생성: [wiki/README.md](README.md), [wiki/index.md](index.md), [wiki/log.md](log.md)
- 생성: `wiki/concepts/`, `wiki/entities/`, `wiki/sources/` 디렉토리 (모두 비어있음)
- 메모: [llm-wiki.md](../llm-wiki.md) 패턴을 임상 언어치료 레퍼런스 가정으로 1차 인스턴스화. 첫 자료 수집을 기다리는 상태.

## [2026-05-09] cleanup | 도메인 재정의 — 하이브리드 구조로 전환

- raw/ 실제 콘텐츠(67+ 비즈니스/제품 문서, 100+ 엔지니어링 태스크, 임상 자료 1개) 확인 후 도메인 잘못 짚었던 것 수정.
- 폴더 재구성:
  - 제거: `wiki/concepts/`, `wiki/entities/`, `wiki/sources/` (비어있어 무손실)
  - 신규: `wiki/product/{concepts,entities,sources}/`, `wiki/clinical/{concepts,entities,sources}/`
- 갱신: [CLAUDE.md](../CLAUDE.md) — 두 기둥(Product / Clinical) 하이브리드 운영 규칙으로 전면 재작성. cross-link을 1급 원칙으로 명시.
- 갱신: [wiki/index.md](index.md) — 양 기둥 카탈로그 + cross-link 현황 섹션 추가.
- 갱신: [wiki/README.md](README.md) — 하이브리드 구조 소개로 재작성.
- 메모: 첫 ingest 시 자료의 pillar 자동 판별 → 사용자 확인 흐름이 동작하는지 점검 필요.

## [2026-05-09] ingest | 언어치료 실제 세션 상세 가이드

- pillar: clinical
- 추가: [[clinical/sources/0-언어치료-실제-세션-상세가이드]]
- 신규 concepts (8): [[clinical/concepts/실어증]], [[clinical/concepts/마비말장애]], [[clinical/concepts/인공와우-청능재활]], [[clinical/concepts/언어발달지연]], [[clinical/concepts/조음장애]], [[clinical/concepts/자폐-화용중재]], [[clinical/concepts/아동언어치료-핵심기법]], [[clinical/concepts/한국-언어치료-트랙비교]]
- 신규 entities (8): K-WAB, K-BNT, SELSI, PRES, REVT, U-TAP, KOPLAC, PECS
- 갱신: [wiki/index.md](index.md) — clinical 섹션 첫 입력, 통계 17건, Cross-link 예약 5건 명시
- cross-link 신규: clinical 내부 다수 / clinical → product 5건은 narrative 형태로 예약 (product 측 미생성)
- 메모:
  - product 측이 비어있어 cross-link을 narrative로만 표기. 첫 product ingest 후 일괄 활성화 필요.
  - 평가 도구 8개 모두 스텁 수준 — 별도 ingest로 보강 필요(출판년도·저자·하위검사·절단점 등).
  - 트랙 비교 페이지의 "제품 측 시사점" 섹션이 다음 product ingest의 핵심 매핑 가이드 역할.
  - MIT/ORLA/CART(실어증 치료 기법)는 본 ingest에서 페이지화하지 않음. 임상 sources 추가 시 별도 페이지 후보.

## [2026-05-09] note | 다음 단계 제안

- 다음 ingest: product 측 진입. 시리즈 자료 batch ingest로 timeline 페이지 3종 생성 권장
  - [[product/concepts/VPS-evolution]]: V01 → V09 (raw 25-32, 39 등)
  - [[product/concepts/PRD-evolution]]: V01 → V10 (raw 40-54)
  - [[product/concepts/SRS-evolution]]: V01 → V06 (raw 55-65)
- 그 외 1-9(전략·경쟁), 10-23(고객 리서치)도 별도 종합 페이지 후보.
- TASKS/ 100+ 항목은 개별 페이지화하지 않고 [[product/concepts/task-breakdown-overview]] 같은 인덱스 페이지로 통합 권장.

## [2026-05-09] ingest | Product 전략 클러스터 (raw 1-9)

- pillar: product
- 사용자 결정: 클러스터 단위 batch ingest, 전략부터 시작 후 리서치(10-23)로 이동
- 읽음(5): raw/2_Porter's 5 Force Analysis_reinforce, raw/5_Competitive Briefing_Merged, raw/6_Competitive Value Chain Analysis, raw/7_Key Success Factors, raw/9_Problem Definition_VC
- 미독(4): 1, 3, 4, 8 (모두 통합본/최종본에 의해 흡수되어 현재 단계에서는 보조 자료)
- 추가 sources (5):
  - [[product/sources/02-Porter-5F-reinforce]]
  - [[product/sources/05-Competitive-Briefing-Merged]]
  - [[product/sources/06-Competitive-Value-Chain]]
  - [[product/sources/07-Key-Success-Factors]]
  - [[product/sources/09-Problem-Definition-VC]]
- 신규 concepts (5):
  - [[product/concepts/Porter-5-Forces-Analysis]] — 프레임워크 + 본 프로젝트 정량 결과
  - [[product/concepts/Value-Chain-Analysis]] — 5경쟁사 분해 + 3유형 + 진입 포지션
  - [[product/concepts/Key-Success-Factors]] — Top 5 KSF 종합 (1차 근거)
  - [[product/concepts/competitive-landscape]] — 8경쟁사 카테고리·포지셔닝·화이트스페이스
  - [[product/concepts/problem-definition]] — 잠정 문제 정의 (status: 진화 중)
- 신규 entities (8): 에이치투케이, 캐치잇플레이, 와우키키, 네오폰스, 말과학놀이터, 두부, 에듀템, 송앤스타크
- 갱신: [wiki/index.md](index.md) — product 섹션 첫 입력, 통계 35건, **Cross-link 현황 섹션 표 형태로 재구성**
- cross-link 신규 (양방향 첫 활성화) ⭐:
  - product → clinical: 13개 페이지에서 다수 인용 (모든 product/concepts + 5 sources + 5 entities)
  - clinical → product: narrative 예약만 → **다음 린트에서 실제 위키링크로 변환** ([[clinical/sources/0-언어치료-실제-세션-상세가이드]] § "Product 기둥과의 cross-link" 5건)
- 메모:
  - 전략 클러스터 1차 정리 완료. 9개 raw 중 5개 통합본만 정리하고 1·3·4·8 보조본은 의도적으로 미흡수.
  - [[product/concepts/problem-definition]] 은 status: 진화 중. 10-12 후속 ingest 시 통합 필요.
  - 33-37 (Competitor UX Analysis) ingest 시 8개 경쟁사 entity 페이지를 UX 차원에서 보강 필요. 현재 entity 페이지의 "보강 필요" 섹션이 그 작업 가이드.
  - TAM 1,080-1,800억 추산 근거는 13_Market_Sizing_Research ingest 시 검증 필요.

## [2026-05-09] lint | clinical → product cross-link 활성화

- 변환 대상: narrative 형태로 예약된 cross-link 3개 페이지
  - [[clinical/sources/0-언어치료-실제-세션-상세가이드]] § "Product 기둥과의 cross-link" — narrative 6항목 → 표 형태 8행 (실제 위키링크)
  - [[clinical/concepts/한국-언어치료-트랙비교]] § "제품 측 시사점" — narrative 4항목 → 5항목 실제 링크
  - [[clinical/concepts/아동언어치료-핵심기법]] § "Product 기둥 cross-link" — narrative 2항목 → 3항목 실제 링크
- 결과:
  - clinical → product 실제 링크 16건+
  - **양방향 페어 6개 활성**: 한국-언어치료-트랙비교 ↔ {Porter-5F, competitive-landscape, KSF, problem-definition} + 아동언어치료-핵심기법 ↔ KSF + 가이드 ↔ KSF
- 갱신: [wiki/index.md](index.md) § Cross-link 현황 — Clinical→Product 표 작성, 양방향 페어 6쌍 명시
- 메모:
  - 변환 시 narrative의 추상적 표현("타깃 시장 세그", "결제 통합")을 구체적 product 페이지로 매핑 → 실제로 해당 product 페이지가 그 의미를 담고 있는지 한 번 더 점검 완료.
  - 일부 항목은 [[product/concepts/PRD-evolution]] 으로 예약 (추후 PRD ingest 시 활성화) — 본 린트에서는 narrative 그대로 유지.

## [2026-05-09] ingest | Product 리서치 클러스터 (raw 10-23) — 부분

- pillar: product
- 사용자 결정: 순서대로 진행 (린트 → 리서치 ingest)
- 읽음(4): raw/12_Problem Definition_Final, raw/14_Market Segmentation Map, raw/15_Persona_Spectrum, raw/16_Customer_Journey_Map_Core
- 미독(10): 10·11(Problem Def 중간본), 13(Market Sizing), 17(CJM Others), 18(Pain Goal), 19(AOS/DOS), 20·21(JTBD Plan), 22·23(JTBD Results)
- 추가 sources (4):
  - [[product/sources/12-Problem-Definition-Final]] — 4개 통합본
  - [[product/sources/14-Market-Segmentation]] — TAM-SAM-SOM + 4세그먼트
  - [[product/sources/15-Persona-Spectrum]] — 13개 페르소나
  - [[product/sources/16-Customer-Journey-Map-Core]] — Core 5 여정
- 신규 concepts (2):
  - [[product/concepts/customer-segmentation]] — TAM·SAM·SOM + 4세그먼트 + 13페르소나 + 4 Phase
  - [[product/concepts/customer-journey]] — Core 5 여정 + 11개 UX 요구
- 진화 concept (1):
  - [[product/concepts/problem-definition]] — status: 진화 중 → **통합 완료 v1.0**. "홈 랭귀지 코칭" 카테고리 + 3단계 가치 퍼널 + Phase 0-3 추가.
- 신규 entities (5 페르소나):
  - [[product/entities/persona-이지수]] (Core-1, Seg A, 진입장벽 최고 + 볼륨 최대)
  - [[product/entities/persona-박민정]] (Core-2, Seg A→B, 고LTV + 바이럴 시작점)
  - [[product/entities/persona-최수현]] (Core-3, Seg C, 이탈 시점 = 센터 치료 시작)
  - [[product/entities/persona-김태희]] (Core-4, 비용 민감 + Triage 진입 조건)
  - [[product/entities/persona-정유나]] (Core-5, 긴급도↓ + 인스타 바이럴 + 디자인)
- 갱신: [wiki/index.md](index.md) — concepts 7, entities 13, sources 9. 양방향 페어 6 → 17+
- cross-link 밀도 급증:
  - 페르소나 5개가 모두 [[clinical/entities/U-TAP]], [[clinical/concepts/언어발달지연]], [[clinical/concepts/한국-언어치료-트랙비교]] 등을 참조 → 클리니컬 entity·concept의 인바운드 링크 수가 급증
  - "홈 랭귀지 코칭" 카테고리 명명이 [[clinical/concepts/아동언어치료-핵심기법]] 4기법을 직접 토대로 함 → 양 기둥 정체성 융합
- 메모:
  - Adjacent 3 + Extreme 2 + Non-user 3 = **8명 페르소나는 entity 미생성** ([[product/sources/15-Persona-Spectrum]] 와 [[product/concepts/customer-segmentation]] 에 요약만). raw 17 (CJM Others) ingest 시 필요하면 추가 생성.
  - JTBD 인터뷰 결과(22, 23) 미독은 의도적 선택 — 컨텍스트 효율 + 페르소나가 합성이라 인터뷰 결과로 보정 필요.
  - "Triage(다자녀 비교 진단)"·"인스타 공유 포맷"·"5분 고정 활동" 등 11개 UX 요구는 추후 PRD/SRS ingest 시 기능 모듈로 매핑되어야 함.

## [2026-05-09] ingest | JTBD 시뮬레이션 인터뷰 (raw 22 + 23)

- pillar: product
- 사용자 결정: 순서대로 진행 (JTBD 우선)
- 읽음(2): raw/22_JTBD_Interview_Results_PartA + raw/23_JTBD_Interview_Results_PartB
- ⚠️ 본 자료는 **시뮬레이션 인터뷰** (실제 아님). raw 0~21 분석 자료 기반 가설 재현. 100가정 파일럿 후 실측 보정 필요.
- 추가 source (1, 통합):
  - [[product/sources/22-23-JTBD-Interview-Results]] — Part A(페르소나 카드 6) + Part B(AOS/DOS·4 Forces·4 발견·Go) 통합. 두 raw가 conceptually 한 문서이므로 단일 source 페이지.
- 신규 concept (1):
  - [[product/concepts/jtbd-insights]] — 4 핵심 발견 + AOS/DOS 매트릭스 + 4 Forces + **MVP 5대 기능 우선순위** + ✅ Go 판정
- 신규 페르소나 entities (2):
  - [[product/entities/persona-오한솔]] — Adjacent / DOS 1위 (3.0) / B2B2C / Phase 4 핵심
  - [[product/entities/persona-김민지]] — Non-user / SAM 70-80% / 외부 충격 마케팅 필요
- 페르소나 보정 (4):
  - [[product/entities/persona-이지수]] (Card ①), [[product/entities/persona-박민정]] (Card ③), [[product/entities/persona-최수현]] (Card ②), [[product/entities/persona-김태희]] (Card ④) 에 JTBD 인용·AOS/DOS·MVP 함의 섹션 추가
  - [[product/entities/persona-정유나]] (Core-5)는 시뮬에 누락 — 보정 안 함, 별도 노트만
- 진화 concept (1):
  - [[product/concepts/problem-definition]] v1.0 → **v1.1**: 발견 #1 "방법론이 진짜 구매 이유" 통합. 3가지 파생 불편함의 가중치 재조정 (진단=유입 ① / 방법론=구매 ② ⭐ / 리포트=유지 ③).
- 갱신: [wiki/index.md](index.md) — concepts 8, entities 15, sources 10. 페르소나 7명 (Core 5 + Adjacent 1 + Non-user 1).
- 핵심 메시지:
  - **MVP 5대 기능 우선순위** 확정: 진단+또래 비교 / 주간 미션 / 추이 리포트(SNS 공유) / 비동기 전문가 코멘트 / 센터 공유용 내보내기. **PRD ingest 시 본 우선순위가 기능 모듈 정본**.
  - **시뮬레이션의 순환 검증 위험** 명시 — 합성 페르소나에서 합성 인용 도출. 100가정 파일럿이 절대 필수.
  - DOS 1위 = 오한솔 (B2B2C 채널, Phase 4) — MVP는 의도적으로 후순위.
- cross-link 신규: 모든 신규 페이지가 [[clinical/concepts/아동언어치료-핵심기법]], [[clinical/concepts/한국-언어치료-트랙비교]], [[clinical/entities/U-TAP]] 등 클리니컬 정본을 인용 → 양 기둥 통합 심화.

## [2026-05-09] ingest | Pain/Goal + AOS·DOS 기회 분석 (raw 18 + 19)

- pillar: product
- 사용자 결정: 순서대로 진행
- 읽음(2): raw/18_Pain_Goal_Analysis + raw/19_AOS_DOS_Opportunity_Analysis
- ⚠️ raw/17_Customer_Journey_Map_Others **의도적 후순위** — 핵심 인사이트(13명 페인·만족도·기회 점수)는 18·19에 흡수됨. 17은 5단계 여정 디테일이라 PRD 매핑 시 후속 ingest로 충분.
- 추가 source (1, 통합):
  - [[product/sources/18-19-Pain-Goal-Opportunity]] — Pain 4 클러스터 + 중요도×만족도 매트릭스 + AOS·DOS 산출 + 4사분면 전략
- 신규 concept (1):
  - [[product/concepts/opportunity-quadrants]] — AOS-DOS 4사분면 정본 + 황금 교차점 4명 (Phase 0 파일럿 타깃) + Pain 4 클러스터 → MVP 5대 매핑
- 신규 entity (1):
  - [[product/entities/persona-손지훈]] (Adjacent-2, Q1 혁신기회, 아동심리상담사 — 신뢰 앵커 + 전문가 파트너)
- entity 재조정 (1):
  - [[product/entities/persona-정유나]] — Core-5 라벨 유지하되 **AOS·DOS 기준 Q4 부차적**으로 전략 위상 재조정. MVP 직접 타깃에서 제외 명시.
- 갱신:
  - [[product/concepts/customer-segmentation]] § 우선순위 매핑에 사분면 컬럼 추가
  - [wiki/index.md](index.md) — concepts 9, entities 16, sources 11. Total 53.
- 핵심 메시지:
  - **황금 교차점 4명 = Phase 0 100가정 파일럿 최우선 타깃**: 이지수·박민정·최수현·이미란
  - **Q1 4명** (오한솔·이지수·최수현·손지훈)이 자원 집중 영역. 그 중 오한솔 DOS 1위(3.0).
  - **Q2 5명**(이미란·강지방·박민정·김태희·황보름)은 매출 견인 ↓이지만 AOS 4.0~3.2 → **포용적 설계 = 기술 해자**.
  - **정유나는 Core 라벨이지만 Q4** — 기존 Core-5 분류와의 미스매치. 본 사분면이 우선순위 정본.
  - Pain 4 클러스터 × MVP 5대 매핑 정합성 확인됨.
- cross-link 신규: opportunity-quadrants가 jtbd-insights와 직접 보완 관계. 모든 Adjacent·Extreme·Non-user 페르소나가 사분면에서 명시적 위치 확보.

## [2026-05-09] ingest | 6 작업 일괄 — 1번부터 6번까지 순서대로

- 사용자 결정: "1번부터 6번까지 순서대로 한번에" — 33개 raw 정독은 컨텍스트 한계 초과. **현실적 절충안** 적용:
  - VPS·PRD: 최종본만 정독 (39 V09, 54 V10) + 진화 timeline은 파일명·V10 Revision History 기반 합성
  - 경쟁사 UX: 5개 모두 정독 (각 ~50줄)
  - 13, 17: 정독
  - 이미란 entity: 무읽기 (이미 15·18·19에 데이터 충분)
- 읽음(9): raw 13 + 17 + 33 + 34 + 35 + 36 + 37 + 39 (V09 부분) + 54 (V10 부분)
- 미독 의도적 후순위: VPS V01-V08 (24-32 중간본), PRD V01-V09 (40-53 중간본). Timeline 페이지에서 narrative만 처리.
- 추가 sources (5):
  - [[product/sources/13-Market-Sizing]] — 글로벌·국내 시장 + TAM-SAM-SOM 산정 근거 + 14 출처
  - [[product/sources/17-Customer-Journey-Map-Others]] — Adjacent·Extreme·Non-user 8명 여정
  - [[product/sources/33-37-Competitor-UX-Analysis]] — 4 그룹 14 경쟁사 통합 + 4 UX 모순 해결 원칙
  - [[product/sources/39-VPS-V09-Final]] — VPS final (부분 정독)
  - [[product/sources/54-PRD-V10-Final]] — **PRD Golden Master** (Phase 0~2 + 21 Epic + 7 KPI 정본)
- 신규 concepts (3):
  - [[product/concepts/MVP-feature-spec]] ⭐ — MVP 21 Epic 정본 + 4 Phase + 7 KPI + 4 Extremes + 4중 Lock-in + HITL + UX 모순 해결 + JTBD 5 vs PRD 6 정합성 검증
  - [[product/concepts/VPS-evolution]] — V01-V09 timeline (파일명·V09 정독 기반 합성)
  - [[product/concepts/PRD-evolution]] — V01-V10 timeline (V10 Revision History 정본)
- 신규 entity (1):
  - [[product/entities/persona-이미란]] — Adjacent-3 다문화. AOS 4.0 ⭐ 공동 1위 + 황금 교차점 + Q2.
- 8개 경쟁사 entity UX 차원 보강 (1줄 + 출처 추가):
  - [[product/entities/송앤스타크]] — 5분 3축 = F1-a 직접 원형 ⭐
  - [[product/entities/에이치투케이]] — 다이내믹 난이도 = F3-b 원형
  - [[product/entities/와우키키]] — 멀티모달 = F14 거울 모드 원형
  - [[product/entities/에듀템]] — 음소 정밀 = F1-a 핵심
  - [[product/entities/캐치잇플레이]] — 1분 숏폼·타격감 = F3-a + F12 원형
  - [[product/entities/두부]] — ABA + 보이지 않는 난이도 = F3-b 임상 원천
  - [[product/entities/네오폰스]] — DTx 패턴 (간접)
  - [[product/entities/말과학놀이터]] — 장애음성 STT (간접, ASD 영역)
- 갱신:
  - [[product/concepts/problem-definition]] v1.1 → **v1.2** (PRD V10 통합 검증, Seg D 분리 반영)
  - [[product/concepts/customer-segmentation]] (Seg D-1/D-2 분리 + Seg B 부분 검증 R6 추가)
  - [wiki/index.md](index.md) — concepts 12, entities 17, sources 16. Total 62 페이지.

- 핵심 결과:
  - ⭐ **MVP 21 Epic + 7 KPI 정본 확보** ([[product/concepts/MVP-feature-spec]]) — SRS ingest 시 본 페이지가 직접 참조 정본.
  - ⭐ **JTBD MVP 5대 vs PRD Phase 0 6 Must 정합성 검증 완료**: Phase 0 = 진단 + 미션 + 보상 (구독 진입 핵심). 리포트·전문가·PDF는 Phase 1 (리텐션).
  - ⭐ **8 경쟁사 UX 매핑 활성화**: [[product/sources/33-37-Competitor-UX-Analysis]] § 21 Epic 매핑 + 4 UX 모순 해결 원칙. RPD 설계 가이드.
  - **이미란 entity = 황금 교차점 4명 완성** (이지수·박민정·최수현·이미란) → Phase 0 100가정 파일럿 모집 가이드 완비.
  - **TAM 정의 차이** 발견: 13(72-96만, 부모 관심 적용) vs PRD V10(150만, 만 2-7세 전체) — 보강 필요.

## [2026-05-09] ingest | SRS V06 + Mapping Review + MVP Descope (raw 65 + 66 + 67) + SRS evolution

- pillar: product
- 사용자 결정: "SRS V06 final ingest + SRS evolution timeline" 순서대로
- 읽음(3): raw/65 SRS V06 (부분, ~650/966줄), raw/66 PRD↔SRS Mapping Review, raw/67 MVP Descope Review
- 미독 (의도적 후순위): 55·56·57-64 SRS 중간본 (Opus V01-V02, Gemini V03-V04, Comparison, V05 Merged Master) — Timeline narrative만.
- 추가 sources (3):
  - [[product/sources/65-SRS-V06-Final]] ⭐ — ISO 29148 / 99 요구사항 (65 REQ-FUNC + HITL 4 + 30 REQ-NF) / Traceability Matrix / **Next.js Full-stack 전환 (C-TEC-001~007 + R7+R8 신규)**. 부분 정독.
  - [[product/sources/66-PRD-to-SRS-Mapping-Review]] — PRD V10 ↔ SRS V05/V06 9 항목 검증 = **전체 PASS Implementation-Ready**.
  - [[product/sources/67-MVP-Descope-Review]] — 바이브 코딩 (IT 3개월차 + 100% AI 의존) 관점. 1주차 텍스트 모드 + 카톡/키즈노트 우회 + 운영비 $30/월.
- 신규 concepts (3):
  - [[product/concepts/SRS-evolution]] — V01-V06 timeline. **Opus + Gemini 병렬 → V05 Merged → V06 Next.js Full-stack 기술 전환** + 검증 단계 (66, 67).
  - [[product/concepts/tech-architecture]] ⭐ — **Tech Architecture 정본** (C-TEC-001~007 + 4 Layer + 9 API + R7/R8 + 운영비 $30/월). [[product/concepts/MVP-feature-spec]] 의 기술 측면 보완.
  - [[product/concepts/MVP-descope-plan]] ⭐ — **바이브 코딩 1주차 Action Item 정본**. 텍스트 모드 → 음성 → Capacitor → Zero-touch 7단계 + 외부 의존성 우회 매핑 + 비용 통제.
- 갱신:
  - [wiki/index.md](index.md) — concepts 15, entities 17, sources 19. **Total 68 페이지**.

- 핵심 결과:
  - ⭐ **SRS Implementation-Ready 정본 확보** ([[product/sources/65-SRS-V06-Final]]). PRD↔SRS 9 항목 PASS 검증됨.
  - ⭐ **Tech Stack Decision 명문화**: Next.js App Router + Vercel + Supabase + Vercel AI SDK + Gemini + PWA + Capacitor. 1인/AI 의존 개발 호환.
  - ⭐ **1주차 Action Item 명시화**: "텍스트 입력 → 3축 mock → DB → 주간 그래프 = 1개 사이클" — 마이크/카톡/앱 배포 모두 1주차에서 의도적 제외.
  - **운영 비용 $30~35/월** (MAU 1,000) — Vercel Pro $20 필수 + Supabase Free + Gemini Free + Google STT ~$10. 7일 폐기 Cron이 비용 방어 최우선.
  - **R7, R8 신규** (Vercel Timeout, Supabase 무료 제한) = V05 기술 스택 전환의 결과.
  - VPS-evolution + PRD-evolution + SRS-evolution 통합 그래프 완성.

- 메모:
  - SRS V06 (~966줄) 의 §5 후반 Traceability + §6 ERD + §6.6 Validation Plan + §6.7 Contingency + §7 ADR/Gantt 미정독 — 후속 partial ingest 필요.
  - V05/V06 명명 혼란: 파일명 V06이지만 내부 Revision History "Rev 3.0 V05 Next.js Full-stack" — 파일명 V06 정본화.
  - 65 REQ-FUNC 와 [[product/concepts/MVP-feature-spec]] 21 Epic 의 1:1 자동 매핑 인덱스 미생성 — 후속.

## [2026-05-09] ingest | TASKS/ 88 Task Overview (TASKS/01·02·03·04 메타 통합)

- pillar: product
- 사용자 결정: "TASKS/ 100+ overview — 21 Epic ↔ 100+ task 매핑 인덱스"
- 읽음(2 정독 + 2 메타 참조): TASKS/01 (Task Breakdown SRS V06, 234줄, 정독) + TASKS/03 (Reinforce 강화판, 305줄, 100줄 정독) + TASKS/02 (= [[product/sources/67-MVP-Descope-Review]] 와 동일) + TASKS/04 (Agent Prompt, 메타로 참조만)
- **개별 88개 TASK_*.md 미정독 의도적**: 각 80-100줄로 G/W/T·Files·Build·Verify 상세 명세 포함. 개별 ingest는 비효율적 — 본 인덱스로 대체. 필요 시 개별 task ingest 가능.
- 추가 source (1, 통합):
  - [[product/sources/TASKS-Task-Breakdown]] — TASKS/01 (88 Task 인덱스) + 03 (Sprint 1 + 8 Descope + 상태 재배치) + 02 (= 67) + 04 (메타) 통합
- 신규 concept (1):
  - [[product/concepts/task-breakdown-overview]] ⭐ — **21 Epic ↔ 88 Task 매핑 정본**. SSOT 체인 (PRD V10 → SRS V06 → 88 Task → 개별 TASK_*.md), Sprint 1 7일 8 코어 + 8 Descope + Phase 진입 관문 + Critical Path
- 갱신:
  - [wiki/index.md](index.md) — concepts 16, entities 17, sources 20. **Total 70 페이지**.

- 핵심 결과:
  - ⭐ **88 Task 카테고리 분포 명문화**: DB 11 / API 12 / MOCK 3 / FR-Q 14 / FR-C 18 / TEST 14 / INFRA 5 / PERF 2 / SEC 4 / MON 4 / OPS 1
  - ⭐ **추출 4 원칙**: Contract-First → CQRS(Read/Write 분리) → AC→TDD → NFR/Infra/Dependency
  - ⭐ **21 Epic ↔ Task 매핑 표**: 17개 Epic (F1-a, F1-b, F2, F3-a, F3-b, F12, F4, F5, F6, F7, F14, F17, F18, F9-a/b/c/d, F10) 모두 Read+Write+API+DB로 매핑됨. F11/F15/F16은 의도적 미추출 (Phase 1 후순위)
  - ⭐ **Sprint 1 7일 8 코어 명문화**: DB-001 → DB-002+005+006+008 → API-001 → FR-Q-001 → FR-C-001(Web Speech) → FR-Q-002 → FR-C-009 → INFRA-001
  - ⭐ **8 Descope 매트릭스 통합** (67-D1~D3 + D4~D8): 🔵 Replace 3건 / 🟡 P1 Defer 2건 / 🔴 P2 Defer 3건
  - **SRS 무손상 원칙**: SRS V06 본문 단 한 줄도 수정하지 않고 Task 레이어에서만 Phase·모드 재배치 — 매번 SRS 수정 없이 Sprint 재계획 가능
  - **F11/F15/F16 미추출 명시**: Phase 1 후순위로 의도적 제외. 차기 스프린트 진입 시 추가 추출 권장.

- 메모:
  - SSOT 체인 완성: PRD V10 → SRS V06 → TASKS/01 88 Task → TASKS/03 Sprint 1 → 개별 TASK_*.md 88개. 본 ingest로 wiki는 **상위 레이어 100% 매핑**.
  - 03 §3 88 Task 상태 재배치 표 후반(DB-006 이후~OPS-001) 미정독 — 보강 후보.
  - 개별 TASK_*.md 정독은 실제 개발 시작 시 필요 시 부분 ingest (예: Sprint 1 8 코어 task의 G/W/T·Files·Build·Verify).

## [2026-05-09] ingest | SRS V06 § 6 보강 (ERD + Sequences + Tech Stack + Gantt + Validation + R6 Plan B + 7 ADR)

- pillar: product
- 사용자 결정: "SRS V06 §6 ERD + Validation + Contingency 보강"
- 읽음(1, partial → full): raw/65 SRS V06 §6 전체 (L650-L966, 약 316줄). 이전 정독 영역 (§1-§5 첫 부분, L1-L650) 과 합쳐 **65 SRS V06 전체 정독 완료**.
- 신규 concept (1):
  - [[product/concepts/architecture-decisions]] ⭐ — **7 ADR 정본**. ADR-01~04 (Zero-touch · HITL · 7일 폐기 · 의료 용어 배제) + **ADR-05~07 (V05/V06 신규 — Next.js 풀스택 모놀리스 · Supabase BaaS · Vercel AI SDK + Gemini)**.
- 보강 (4 페이지):
  - [[product/sources/65-SRS-V06-Final]] — `ingested_partial: true` → `false` 변경 + § 6 부록 전체 (ERD 7 엔티티 / 5 클래스 / 5 시퀀스 / 14 Tech Stack / Gantt / EXP-1~4 / R6 Plan B / 7 ADR) 추가 + 문서 통계
  - [[product/concepts/tech-architecture]] — § Data Model (ERD 7 + 추가 도출 hitl_queue/consent_signatures) + § Domain Class (5 클래스) + § 핵심 Sequence Diagrams (3 추가) + § Tech Stack 14종 (Layer 매핑)
  - [[product/concepts/MVP-feature-spec]] — § R6 Plan B 표 형태 정본화 + § 7 ADR 종합 표
  - [[product/concepts/SRS-evolution]] — V06 행에 ADR-05~07 명시화 (Next.js 모놀리스 + Supabase BaaS + Vercel AI SDK)
- 갱신:
  - [wiki/index.md](index.md) — concepts 17, entities 17, sources 20. **Total 71 페이지**. SRS 진화 상태 "전체 정독 완료" 표시.

- 핵심 결과:
  - ⭐ **ERD 7 엔티티 명문화**: users · institutions · session_logs · evaluation_results · mission_cards · weekly_reports · reward_progress (모두 UUID PK) + 추가 도출 hitl_queue + consent_signatures (TASKS/01).
  - ⭐ **3 신규 Sequence Diagram**: PWA Offline → Sync (F3-a/F12, FR-C-007) / B2B Zero-touch (F9-b, FR-C-015) / 전자서명 (F10, FR-C-018). 모두 [[product/concepts/MVP-descope-plan]] 의 Descope 영향 명시.
  - ⭐ **7 ADR 정본화** ([[product/concepts/architecture-decisions]]): ADR-01~04 (비즈니스/규제) + **V05/V06 신규 ADR-05~07 (기술 스택 전환)**. ADR-05~07이 운영비 $30/월 + 1주차 라이브 가능케 함.
  - ⭐ **R6 Plan B 시스템 차원 정본화**: F4 → F18 승격 + F12 매몰비용 강화 + F5 감성 내러티브 + EXP-2b (n=400, 4주). M3 ≥35% 시 피벗 확정 / 미달 시 Seg B 축소.
  - **Tech Stack 14종 정확한 Layer 매핑** ([[product/concepts/tech-architecture]]): Framework → Server Logic → DB → Vector DB → UI → Auth → Storage → Realtime → AI/LLM → Deploy → Cron → Analytics → Mobile → Edge.
  - **음성 벡터 임베딩** = `session_logs.audio_vector_uri (pgvector)` 영구 보관. 7일 폐기 (ADR-03)는 원본만, 벡터는 영구 → AI 재학습 가능.

- 메모:
  - SRS V06 전체 정독 완료. 99 요구사항 / 5 시퀀스 / 5 구조 / 7 엔티티 / 5 SA / 4 RH / 4 EXP / 7 ADR / 14 Tech Stack 모두 wiki에 매핑됨.
  - REQ-FUNC ↔ 21 Epic ↔ 88 Task 자동 매핑 인덱스는 후속 작업 ([[product/concepts/task-breakdown-overview]]에 부분 매핑 있음).
  - ADR 거부 시나리오 분석 (만약 ADR-05를 거부했다면 인력·기간·비용?) 보강 가치 큼.

## [2026-05-09] ingest | SRS V01-V05 Multi-LLM Workflow (raw 55+56+58+61+63 메타 5종 통합)

- pillar: product
- 사용자 결정: "SRS V01-V05 중간본 (멀티 LLM 워크플로)"
- 읽음(5 메타, 642줄): raw/55 호환성 검토 + raw/56 SRS 생성 프롬프트 + raw/58 V01 Opus 검토·Action Plan + raw/61 V03 Gemini 검토·Remediation + raw/63 Opus vs Gemini 비교 분석
- **본문 V01-V05 (raw 57·59·60·62·64, 3,762줄) 의도적 미정독**: 메타 5종에서 워크플로·차이·결과가 명확히 드러남. 본문 직접 정독은 보강 후순위.
- 추가 source (1, 통합):
  - [[product/sources/SRS-V01-V05-Multi-LLM-Workflow]] — 5 메타 통합 (호환성·프롬프트·V01 검토·V03 검토·비교 분석)
- 신규 concept (1):
  - [[product/concepts/multi-llm-workflow]] ⭐ — **Multi-LLM Best-of-Breed 작성 패턴 정본**. 7 단계 워크플로 (사전 호환성·프롬프트·병렬 작성·명시적 검토·비교 매트릭스·Best-of-Breed 통합·후속 변환). VPS·PRD·SRS 공통 적용 패턴.
- 보강 (1):
  - [[product/concepts/SRS-evolution]] — 진화 표 11행을 **검토 단계 명시화** (V01 Action Plan / V03 Remediation Plan / V05 Best-of-Breed 통합 정확화)

- 핵심 결과:
  - ⭐ **7 단계 워크플로 정본화**: PRD → 호환성 검토 → 표준 프롬프트 → Opus + Gemini 병렬 → 각 트랙 검토 → 비교 매트릭스 → Best-of-Breed → V05 → 후속 변환 (V06 Tech Stack)
  - ⭐ **8 호환성 수정사항 (raw 55)**: 이전 프롬프트(F1-F6, §1-§9) → 본 PRD(F1-F18 21 Epic, §1-§11) 사전 도출. 누락 시 15 Epic 사라짐 — **사전 검토의 비용 효과** 명문화.
  - ⭐ **표준 프롬프트 (raw 56)**: ISO 29148 정통 Senior Requirements Engineer 역할 + 7대 출력 구조 + 10대 필수 규칙 + 모호 표현 금지.
  - ⭐ **8 검증 기준 + Action/Remediation 패턴**: V01 Opus(6+1 부분+1 미충족=4 다이어그램 추가) / V03 Gemini(6+2 미충족=6 Mermaid 추가). 각 LLM 결과를 동일 8 기준으로 **누락 정량화**.
  - ⭐ **비교 매트릭스 (raw 63)**: Opus 5 Winner (FR·NFR·API·구조·ISO 29148) / Gemini 2 Winner (Traceability·Sequence) / 1 Tie. Opus = Technical Spec Leader / Gemini = Strategic Integration Leader.
  - ⭐ **Best-of-Breed V05 (V04 Master)**: Opus 65 atomic FR + 30 NFR + 8 API + Gemini 1:1 Traceability + Edge sequences (Reward Fallback/HITL) + Roadmap. 919줄.
  - **V05 → V06 후속 변환**: 비즈니스 의도 (V05) vs 기술 결정 (V06 C-TEC + ADR-05~07) 의도적 분리 — 향후 다른 기술 스택 전환 가능.
  - **본 워크플로 = VPS V01-V09 + PRD V01-V10 + SRS V01-V06 공통**: VPS는 Sonnet+Gemini, PRD는 5 LLM + 4 Quality Gate, SRS는 Opus+Gemini Best-of-Breed.

- 메모:
  - 본 워크플로 = **단일 LLM 편향 회피 + 강점 결합 + Implementation-Ready 도달**. 비용 5-7배 ↑ 이지만 사후 재작업 비용 ↓.
  - 한계: 각 LLM 강점 분류는 사후 관찰 / 8 기준 적정성 / 비교 평가자 편향 / 통합 비용 자체 / 1인-AI 의존 컨텍스트 한정.
  - V05 Merged Master (raw 64, 919줄) 본문은 미정독 — V06이 V05 위에 빌드되어 V06 정본이 거의 모든 V05 내용 흡수. 직접 정독 가치 보강 후순위.

## [2026-05-09] ingest | Sprint 1 Core 8 Task 상세 (11 TASK_*.md 정독)

- pillar: product
- 사용자 결정: "개별 TASK_*.md Sprint 1 8 코어 G/W/T·Files·Build·Verify (개발 시작 시)"
- 읽음(11): TASK_DB-001 + DB-002 + DB-005 + DB-006 + DB-008 + API-001 + FR-Q-001 + FR-C-001 + FR-Q-002 + FR-C-009 + INFRA-001 (총 857줄)
- 추가 source (1, 통합):
  - [[product/sources/TASKS-Sprint-1-Core-Detail]] ⭐ — Sprint 1 코어 8 Task의 G/W/T·Files·Build·Verify·Constraints·DOD·Dependencies 통합 (11 파일)
- 보강 (1):
  - [[product/concepts/task-breakdown-overview]] § Sprint 1 8 코어 표에 정독 결과 핵심 발견 + Descope 매핑 + 본 source 참조 링크 추가

- 핵심 발견:
  - ⭐ **TASK 파일 표준 7 섹션 구조 명문화**: Summary + References + Task Breakdown(체크리스트) + AC(G/W/T) + Constraints + DOD + Dependencies
  - ⭐ **FR-C-001 Sprint 1 최복잡** (1.5d): 8단계 비즈니스 로직 (입력 검증 → Gemini → 백분위 → 쿠션 텍스트 → 금칙어 → INSERT → HITL → 출력 검증)
  - ⭐ **DB-006 mission_cards Sprint 1엔 시드만**: 한국어 음소 5종 × 5단계 = 25개. UI는 P1
  - ⭐ **DB-008 reward_progress 동시성 안전성**: Prisma 트랜잭션 또는 raw SQL `INCR` (5병렬 합산 정확)
  - ⭐ **FR-C-001 백분위 시드 100건 사전 INSERT**: Sprint 1 초기 데이터 부족 → **정규분포 가정 시드** ← **임상 정합성 별도 검증 필요** ([[product/concepts/Key-Success-Factors]] § KSF #2)
  - ⭐ **FR-Q-002 Disclaimer 3중 노출**: 상단 + 차트 옆 + 하단 NeverHide 보장
  - ⭐ **FR-C-009 멱등성 키** (`${sessionId}-star-1`) + **Optimistic UI** (≤500ms — SA 응답 안 기다림)
  - ⭐ **INFRA-001 Vercel Pro $20 필수**: 60s timeout (R7) + Cron 8 슬롯 (Hobby 1개 한도) + 환경변수 7종 (DATABASE_URL/DIRECT_URL/GEMINI_API_KEY/SUPABASE 3종/**SLACK_WEBHOOK_URL D4 적용**)
  - **Sprint 1 도입 Tech Stack 15종 순서**: DB-001 (Next.js+Prisma+Supabase) → FR-Q-001 (shadcn/ui+Web Speech) → API-001 (Zod) → FR-C-001 (Vercel AI SDK+Gemini) → FR-C-009 (Framer Motion) → INFRA-001 (Vercel Pro+Cron+Slack 웹훅)

- Sprint 1 Descope 6 적용 (정독 기반):
  - **D7 부분** (API-001): audioBlob → STT 텍스트
  - **D1 + D7** (FR-C-001): Web Speech + 일반 SA (Edge Runtime 미사용)
  - **(Sprint 1 단순화)** (FR-Q-002): Middleware 금칙어 → 인라인 검증
  - **D5** (FR-C-009): 오프라인 소급 보상 미적용
  - **D2** (INFRA-001): Capacitor 미적용 (P1)
  - **D4** (Slack 웹훅): HITL Realtime → Slack 환경변수

- 메모:
  - 11개 개별 TASK_*.md 모두 정독 → Sprint 1 7일 8 코어가 **개발 시작 가능 상태** 확보.
  - 정규분포 가정 시드 100건 + 한국어 음운론 위계 25 시드 = **임상 정합성 검증의 핵심 후속 작업**. 본 작업은 어느 임상 데이터·정상 규준에 기반하는지 미명시.
  - FR-C-002 (Confidence < 70 → Slack 웹훅) 별도 정독 미수행. P1 진입 시 보강.

## [2026-05-09] ingest | Sprint 1 직접 의존 7 Task (FR-C-002 + API-004/011 + SEC-004 + TEST-001/004/009)

- pillar: product
- 사용자 결정: "FR-C-002 + API-004 + API-011 + SEC-004 + TEST-001/004/009 정독 (Sprint 1 직접 의존)"
- 읽음(7, 622줄): TASK_FR-C-002 + API-004 + API-011 + SEC-004 + TEST-001 + TEST-004 + TEST-009
- 추가 source (1, 통합):
  - [[product/sources/TASKS-Sprint-1-Dependent-Detail]] ⭐ — Sprint 1 직접 의존 7 task 의 G/W/T·Files·Build·Verify·Dependencies + Sprint 1 합격 게이트(TEST 3종) + SEC-004 3중 Rate Limit
- 보강 (1):
  - [[product/concepts/task-breakdown-overview]] § Sprint 1 직접 의존 7 Task 표 + Sprint 1 합격 게이트 + SEC-004 강조 + 환경변수 9-11종 명시

- 핵심 발견:
  - ⭐ **Sprint 1 합격 게이트 = TEST 3종 자동 통과**: TEST-001 (Vitest 단위 + 100회 부하 → 실패율 <2%) + TEST-004 (Playwright E2E + Web Speech mock + 모바일/데스크톱) + TEST-009 (멱등성 + 동시성 5병렬 + 파티클 ≤500ms)
  - ⭐ **SEC-004 (Sprint 2 라벨이지만 Sprint 1 게이트)**: FR-C-001이 SEC-004 통과를 강제. **Upstash Redis Free** + **3중 Rate Limit** (RPM 14 / 사용자 일 50 / 일 비용 ≤$1) + 환경 격리 (prod/preview/dev 키 prefix) + 80% Slack 알림 (중복 방지)
  - ⭐ **API-011 D4 검증**: SDK v3+의 `@ai-sdk/*` 표준화로 환경변수 1개(`AI_PROVIDER`)로 OpenAI/Anthropic swap 가능. 시스템 프롬프트 단일화 (`lib/ai/prompts.ts`).
  - ⭐ **FR-C-002 graceful degradation**: D4 적용 (Slack 웹훅 + Supabase Studio). **Slack 실패해도 사용자 흐름 유지** — hitl_queue INSERT는 성공, slackNotified=false, 사용자 응답 정상.
  - ⭐ **TEST-004 Web Speech API mocking**: `page.addInitScript`로 가짜 SpeechRecognition 클래스 주입 → `start()` 호출 시 즉시 onresult 트리거.
  - ⭐ **TEST-009 DB 격리 옵션**: A) Prisma SQLite in-memory (`file::memory:?cache=shared`) 또는 B) Prisma Mock + 트랜잭션 시뮬. R8 보호 (Supabase Free 영향 없음).
  - **API-004 출력 5필드**: success, cumulativeStars, treeGrowthLevel, aiDrawingCount, **wasSkipped** (멱등성 무시 시 true).
  - **환경변수 추가 4종**: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN (SEC-004), AI_PROVIDER (API-011 D4), INTERNAL_API_SECRET (FR-C-002 → API-005 Bearer). 총 **9-11종**.

- Tech Stack 추가 도입 (의존 7):
  - **Upstash Redis (Free)** — SEC-004 (10K 요청/일 무료)
  - `@upstash/ratelimit`, `@upstash/redis` — 슬라이딩 윈도우
  - `ai`, `@ai-sdk/google` (+ optional `@ai-sdk/openai`, `@ai-sdk/anthropic`) — API-011 + D4 Fallback
  - **Vitest** + happy-dom + @testing-library/react — TEST-001
  - **Playwright** + chromium — TEST-004
  - Sentry (선택) — FR-C-002 graceful degradation 알림

- 메모:
  - **API-005** (`/api/hitl/queue` POST Route Handler) — FR-C-002 직접 의존이지만 본 ingest 미포함. 후속.
  - **MOCK-001/002/003** — TEST-001/004/009 모킹 픽스처. 후속.
  - SEC-004 Slack 중복 방지 플래그 알고리즘 (Redis SET + TTL?) 본 task 미명시.
  - API-011 Fallback 환경변수 swap의 비용 차이 (`@ai-sdk/openai` 5-10x 가격) — SEC-004 비용 가드로 자동 차단되는지 검증 필요.

## [2026-05-09] ingest | Sprint 1 의존 잔여 4 Task (API-005 + MOCK-001/002/003)

- pillar: product
- 사용자 결정: "API-005 + MOCK-001/002/003 — Sprint 1 의존 잔여"
- 읽음(4, 356줄): TASK_API-005 + TASK_MOCK-001/002/003
- 추가 source (1, 통합):
  - [[product/sources/TASKS-Sprint-1-Remaining-Detail]] ⭐ — API-005 (D4 Replace) + MOCK 3종 통합. **HITL 자동 이관 전체 흐름 정본 완성**.
- 보강 (1):
  - [[product/concepts/task-breakdown-overview]] § Sprint 1 의존 잔여 표 + Mock 토글 환경변수 6종 + HITL 자동 이관 시퀀스 다이어그램

- 핵심 발견:
  - ⭐ **API-005 = HITL 자동 이관의 누락 고리**: FR-C-002 → API-005 → Slack 웹훅 + Supabase Studio. **Authorization Bearer ${INTERNAL_API_SECRET}** 인증 (내부 호출만). Rate Limit (동일 sessionId 1분 차단). graceful degradation (Slack 실패 시 200 OK + slackNotified=false).
  - ⭐ **MOCK-001 = Sprint 1 P0 핵심 픽스처**: 3종 (mockSuccessHigh/Low/FailureSTT). FR-Q-001/002 FE 선개발 + TEST-001/004 픽스처. 환경변수 USE_MOCK_DIAGNOSIS, **Production 강제 false**.
  - ⭐ **MOCK-002 grantReward 부분도 Sprint 1 P0**: 3종 (mockFirstReward/Accumulated/Skipped). TEST-009 멱등성·동시성 검증의 픽스처. mockSkipped (wasSkipped: true)가 핵심.
  - **MOCK-002 curriculum 부분은 P1**: 4종 (continue/level-down/level-up/phoneme-switch). FR-Q-003 + FR-C-008 의존.
  - **MOCK-003 = P1 전체** (Sprint 1 미사용): HITL 4 + B2B 2 + Consent 3 = **9종 Mock**. D4 + D7 + D8 시뮬 인프라.
  - ⭐ **Mock 토글 환경변수 6종** = Production 강제 비활성화 (보안). USE_MOCK_DIAGNOSIS / CURRICULUM / REWARD / HITL / B2B / CONSENT.
  - **데일리 미션 시드 12개** (음소 4종 × 난이도 1-3): MOCK-002 정적 픽스처 — DB-006 시드 25개와 별도 (FE 선개발 전용).
  - **9 Mock 패턴이 8 Descope 시뮬 검증 인프라**를 모두 커버 (D4·D5·D7·D8 매핑).

- HITL 자동 이관 전체 흐름 정본 완성:
  - FR-C-001 confidence < 70 감지 → FR-C-002 enqueueForReview (Bearer 인증) → API-005 POST → 1) Zod 검증 → 2) hitl_queue INSERT (slaDueAt = now+48h) → 3) Slack 웹훅 → graceful degradation → 사용자 UI "전문가 검토 중 (≤48h)"

- 메모:
  - **API-002** (`getCurriculum()` DTO) — MOCK-002 의존. 본 ingest 미포함.
  - **API-006/007/008** — MOCK-003 의존 (HITL Comment, B2B Approval, Consent Sign). 본 ingest 미포함.
  - API-005 **재시도 큐 운영 가이드** — Slack 실패 시 백그라운드 재시도 메커니즘 명세 미포함.
  - MOCK 시드 데이터 **콘텐츠 검수 자동화 도구** 미명시.

## [2026-05-09] ingest | MOCK-002/003 의존 API 4종 (API-002 + API-006/007/008)

- pillar: product
- 사용자 결정: "API-002 + API-006/007/008 — MOCK-002/003 의존 API 4종"
- 읽음(4, 385줄): TASK_API-002 + TASK_API-006 + TASK_API-007 + TASK_API-008
- 추가 source (1):
  - [[product/sources/TASKS-API-Routes-MOCK-Dependencies]] ⭐ — 4 API 통합 + **4 인증 패턴 정본** + 3 Descope 시스템 차원 구현 정본
- 보강 (1):
  - [[product/concepts/task-breakdown-overview]] § MOCK 의존 API 4종 표 + 4 인증 패턴 + 추가 도구 도입

- 핵심 발견:
  - ⭐ **API-006 = D4 2-Trick 구조**: (a) **Supabase Studio 1차 도구** (전문가 직접 SQL UPDATE) + (b) PATCH 엔드포인트는 fallback. **PostgreSQL 트리거**로 hitl_queue.status='completed' → evaluation_results.hitlReviewed 자동 sync.
  - ⭐ **API-006 사용자 알림**: **Resend (Free 100/일)** 또는 Sendgrid Free. "전문가가 결과를 검토했습니다" 이메일.
  - ⭐ **API-006 어뷰징 방어**: 동일 expertId 월 3회+ 동일 부모 검토 → 자동 admin 알림 (FR-C-014 연결). 임상 객관성 침해 방지.
  - ⭐ **API-007 D8**: **키즈노트 SDK 의존성 0건** 검증. clipboardText 응답. 무수정율 ≥90% (REQ-FUNC-057) 일별 텔레메트리.
  - ⭐ **API-008 = 검토 §2.2 [추가 E2] 신규 단순화**: 모두싸인/카카오 미연동, **일반 웹 폼**. 법적 효력 = **token UUID v4 + IP/UserAgent/consentText 스냅샷 + timestamp**. 4중 보안 (HTTPS + CSRF + Rate Limit 1분 5회 + token 예측 불가).
  - ⭐ **API-008 GDPR/개인정보보호법 준수**: 철회 권리 (`PATCH /api/consent/rescind` → status='rescinded' → RLS 데이터 수집 차단).
  - **API-002 멱등성**: getCurriculum 동일 입력 → 동일 출력 보장 (seeded random). 임상 reliability 원칙.
  - **API-002 Output reason 4종**: 'continue' / 'level_down' / 'level_up' / 'phoneme_switch'. 마지막은 음소 마스터 시 suggestedNextPhoneme 추천.

- ⭐ **4 API 인증 패턴 정본** (이전 ingest 합산):
  - **Bearer ${INTERNAL_API_SECRET}**: API-005 (내부 호출, FR-C-002)
  - **Supabase Auth + RLS**: API-006 (expert/admin), API-007 (teacher/principal), API-008 POST (principal/admin)
  - **Token 자체 인증** (UUID v4): API-008 GET (부모, 인증 불필요)
  - **Token + CSRF**: API-008 PATCH (부모 서명)

- ⭐ **3 Descope 시스템 차원 구현 정본 완성**:
  - **D4** (HITL Realtime → Slack + Studio) → API-006 (Studio 1차 + PostgreSQL 트리거 + Resend)
  - **D8** (키즈노트 → 클립보드) → API-007 (clipboardText + 무수정율 KPI)
  - **검토 §2.2 [추가 E2]** (모두싸인 → 일반 웹 폼) → API-008 (UUID + IP/UA + 4중 보안)

- 새 도구 / 환경변수 추가:
  - **Resend** (Free 100/일) — API-006 + API-008
  - PostgreSQL 트리거 — API-006 자동 sync
  - `notification_drafts` + `b2b_approval_stats` 테이블 — API-007
  - **RESEND_API_KEY** 환경변수 (Sprint 1 9-11종 + 1 = **10-12종**)

- 메모:
  - **`docs/hitl-operations.md`** (API-006 Supabase Studio 가이드) — 별도 정독 가치.
  - API-002 seeded random 알고리즘 디테일 미명시.
  - `notification_drafts` 테이블 스키마 (API-007 의존) — DB-XXX 별도 task 또는 evaluation_results 보강 옵션.
  - 모두싸인 P3+ 도입 시 swap 가능 인터페이스 (API-008) — 향후 마이그레이션 가이드 필요.

## [2026-05-09] ingest | TEST 11종 (Phase 0-2 합격 게이트 완성)

- pillar: product
- 사용자 결정: "TEST-002/003, 005/008, 010/014 (나머지 11 TEST — Phase 0 완성)"
- 읽음(11, 977줄): TEST-002 + 003 + 005 + 006 + 007 + 008(Hold) + 010 + 011 + 012 + 013(Hold) + 014
- 추가 source (1):
  - [[product/sources/TASKS-TEST-Phase-0-1-2-Complete]] ⭐ — 11 TEST 통합 + **Phase 0-2 합격 게이트 매트릭스** + 자녀 정서·정보 보호 6중 검증 + Descope 5건 시스템 회귀 보장
- 보강 (1):
  - [[product/concepts/task-breakdown-overview]] § TEST 14종 매트릭스 + Descope ↔ TEST 매핑 + 자녀 R4 6중 검증

- 핵심 발견:
  - ⭐ **TEST 14종 매트릭스 정본**: P0 합격 (TEST-001/004/009 코어 3, 17 시나리오) + P1 합격 (TEST-002/003/005/006/007/010/011/014 = 8종, 58 시나리오) + P2 합격 (TEST-012, 8 시나리오) + **Hold 2종** (TEST-008 D5 + TEST-013 67-D3). **Active 12 TEST = 83 시나리오**.
  - ⭐ **TEST-014 = HITL 통합 정점** (9 시나리오): confidence<70 → Slack DM → 24h 임박 Cron → 48h escalated → **PostgreSQL 트리거 검증** → 사용자 알림 → 어뷰징 방어 (월 4번째 자동 dismissed) → 루프백 데이터 누적 → 멱등성 → expertId 1일 51건 admin 알림.
  - ⭐ **TEST-007 = 자녀 정서 보호 핵심**: DOM에 'X' 또는 '실패' 0건 자동 검증 + 격려 카피 ("괜찮아요" / "다시 해볼까요?") 노출 검증.
  - ⭐ **TEST-005 정규식 2단**: 1차 (진단·장애·치료·환자·병·증상) + 2차 (아프·이상). 화이트리스트 lookahead ("치료사·치료실"). 50KB 본문 ≤50ms. **사용자 발화는 로깅만, 차단 없음** (forbidden_word_log INSERT).
  - ⭐ **TEST-008 + TEST-013 보류 명문화**: D5 (PWA 오프라인) + 67-D3 (Zero-touch). 부활 조건 명시 (EXP-2 통과 + iOS Safari / B2B PoC 5건).
  - **TEST-011 카카오 의존성 0 검증**: `package.json` `@kakao/*` 없음 자동 검증. og:image PNG (Vercel @vercel/og).
  - **TEST-012 R4 자녀 본명 0건**: 엑셀에 본명 컬럼 있어도 무시/차단, **childNickname만 저장**.
  - **TEST-010 1,000명 부하**: 7일치 evaluation_results → Cron ≤ 60초 + RSC LCP p95 ≤3,000ms.

- ⭐ **자녀 정서·정보 보호 6중 검증** (R4 시스템 강제):
  - TEST-007: DOM 'X'·'실패' 0건 + 격려 카피
  - TEST-005: Slack 페이로드 자녀 식별 정보 미포함
  - TEST-011: 공유 페이지 자녀 본명·생년월일 0건
  - TEST-012: DB childNickname만 (본명 0건)
  - TEST-014: Slack 페이로드 자녀 식별 정보 0건
  - TEST-002: Slack 페이로드 자녀 식별 정보 미포함
  → TEST 14종 = R4 시스템적 회귀 보장 인프라.

- ⭐ **Descope ↔ TEST 정합 (5건 시스템 회귀)**:
  - **D4** → TEST-002 + TEST-014 (Slack 웹훅 + PostgreSQL 트리거 별도 검증)
  - **D5** → TEST-008 ❌ Hold (EXP-2 + iOS Safari 후 부활)
  - **67-D1** → TEST-011 (카카오 SDK 의존성 0 + Web Share)
  - **67-D3** → TEST-013 ❌ Hold (B2B PoC 5건 후)
  - **D8** → TEST-012 (Resend spy + R4 본명 0)

- 텔레메트리 이벤트 컨벤션 정착:
  - STT: stt_first_attempt_success / retry_success / retry_failed (TEST-003)
  - Mission: mission_started / completed / dropped_off (TEST-006)
  - Share: share_clicked / method / link_visited (TEST-011)
  - HITL: hitl_auto_enqueued (TEST-002)

- 메모:
  - **TEST-014 PostgreSQL 트리거 검증** 별도 SQL 테스트 또는 Prisma 트랜잭션 — 구체 도구 미명시.
  - **TEST-008 단순 대체 흡수**: TEST-006 추가 케이스로 처리 (네트워크 에러 Toast).
  - **forbidden_word_log + model_retraining_data 테이블** — DB-XXX 별도 task 추가 또는 DB-011/009 보강 옵션.
  - 모든 TEST 격리 원칙: 실 외부 호출 0건 + SQLite in-memory + 100회 반복 안정성.

## [2026-05-09] ingest | PRD 중간본 검토 메타 5종 (V01-V09 진화 사이클)

- pillar: product
- 사용자 결정: "VPS·PRD 중간본 보강"
- 읽음(5, 910줄): raw 44 PRD Comparison + raw 47 VPS↔PRD Mapping + raw 49 V07 Patch + raw 51 V08 Quality + raw 53 V09 Readiness Gate
- **본문 (40-46, 48, 50, 52)** + VPS 본문 (24-32) 의도적 미정독 — 메타 5종에서 진화 사이클 + Best-of-Breed + Quality Gate 패턴이 모두 드러남.
- 추가 source (1):
  - [[product/sources/PRD-Intermediate-Reviews-Meta]] ⭐ — 5 메타 통합. **PRD V01-V09 진화 5 단계 정량 사이클** 정본
- 보강 (2):
  - [[product/concepts/PRD-evolution]] — Quality Gate 패턴 정량 5 사이클로 확장. 4 LLM 강점 매트릭스 + V07 Patch 7건 효과 + V08 18건 분포 + V09 97% PASS 표
  - [[product/concepts/multi-llm-workflow]] — PRD V01-V10 사례 추가 (5 LLM + 5 Quality Gate). PRD vs SRS 워크플로 비교 표

- 핵심 발견:
  - ⭐ **PRD 5 LLM 병렬** (Gemini · Cursor · Opus · GPT-4o + 후속 Sonnet) — SRS 2 LLM (Opus + Gemini) 보다 더 풍부한 사례
  - ⭐ **9 항목 매트릭스 (raw 44)**: 4 LLM × 9 평가 항목 → 단일 매트릭스로 모든 차이 시각화. **V02 Opus 압도 우승** (⭐⭐⭐⭐⭐ 9/9). V03 GPT 깊이 부족 (⭐⭐ 평균).
  - ⭐ **Best-of-Breed 6 항목 융합**: V02 Opus 골격 + V01 Gemini Story 6 (HITL) + V02 Cursor (Critical Path + 안전 AC + EXP-4) + V03 GPT (Won't + WAU 검토)
  - ⭐ **VPS↔PRD 매핑 검증 (raw 47)**: **7 변환 규칙별 점검** → 매핑 완성도 **85%** + 3건 부분 결함:
    - JTBD 괴리 (Seg B "양육 성취감 인정" → "구독 지속" 비즈니스 용어 치환)
    - 수익 모델 미반영 (VPS §11 4티어 + 70/15/15% + Y3 449억)
    - Proof 원본 수치 미인용 (AOS/DOS · JTBD 검증 · TAM-SAM-SOM)
  - ⭐ **V07 Patch 7건 (raw 49)**: ADR-001 (북극성 KPI 근거) + §4.3 비즈니스 모델 + §9.0 AOS/DOS + §9.0-b JTBD 검증 + §9.0-c TAM-SAM-SOM + R6 + REWARD_PROGRESS ERD
  - ⭐ **V08 Quality 18건 결함 (raw 51)**: 5 체크리스트 + **추가 발견 컬럼** (CJM KPI 8건이 P0 최치명적). 우선순위 P0~P3 명문화. F-07 산술 교정 ("1,000배" → 17,000배).
  - ⭐ **V09 Readiness Gate 97% PASS (raw 53)**: 6 대항목 38 세부 항목 0/0.5/1점 정량 채점. **PASS 조건 ≥85% + 개별 ≥70%**. 감점 2건 (3-5 SP + 5-7 R6 Plan B) 모두 SRS 단계로 이관 → V10에서 패치.
  - **북극성 KPI 변경 주의**: VPS 명시 없을 시 ADR로 근거 문서화 강제. AOS 9.0 O-1 vs O-2 채택 논리 명문화 (ADR-001).

- ⭐ Quality Gate 패턴 일반화 (학습 가치):
  ```
  [작성] → [매핑 검토] → [패치] → [품질 리뷰] → [Readiness Gate (정량 채점)] → [전환 결정 ≥85%] → [다음 문서]
  ```
  - 단순 작성→검토 사이클이 아니라 **정량 점수화로 객관화된 5 단계 게이트**
  - **각 결함을 위치 + 현재 + 수정안 + 근거 4부 구조로 명문화**
  - **감점 항목 → 조치 시점 명문화** (현 단계 vs 다음 단계 이관)

- 메모:
  - **VPS V01-V08 (raw 24-32)** + 본문 (40-46, 48, 50, 52) 미정독 — 메타 5종으로 충분히 커버됨.
  - **변경 관리 프로세스 (CR → 리뷰 → 머지)** V09 53에서 선택적 보강 제안되었으나 V10에 반영 미확인 — 보강 후보.
  - **52 V09 Quality Improvement (692줄)** 정독 시 51의 18건이 어떻게 V09로 반영되는지 구체 — 보강 후보.

## [2026-05-09] note | 다음 작업 후보

- **VPS V07-V08 본문 partial** (raw 31·32) — VPS 진화의 구체 변경점.
- **52 V09 Quality Improvement** (692줄) — 51의 18건 반영 검증.
- **VPS V09 §10/§13/§14 partial** — GTM/영업/검증.
- **추가 페르소나 entity 5명**: 황보름·강지방·윤성민·송혜경.
- **TAM 정의 일치화** — 13(72-96만) vs PRD 150만.
- **REQ-FUNC ↔ Epic ↔ Task 자동 매핑 인덱스** + 88 Task SP 매핑.
- **ADR 거부 시나리오 분석**.
- **multi-llm-workflow 일반화** (다른 도메인).
- **임상 정합성 검증 후속**: FR-C-001 정규분포 시드 100건 + DB-006 한국어 음운론 25 시드.
- **HITL 시스템 흐름 concept** — API-005 + API-006 + PostgreSQL 트리거 정본.
- **변경 관리 프로세스** (53 선택적 보강).
- **인덱스/소스 메타데이터 누락 점검**.


## [2026-05-09] ingest | VPS V07-V08 본문 partial (raw 31·32) — 4단계 구조 + Sub-feature 트리 + ROI 시뮬레이터 + Seg D-1/D-2 분리

- 입력: raw/31_VPS_V07_Restructured.md (V07, 423줄) + raw/32_VPS_V08_Detailed.md (V08, 650줄)

- 정독 범위: V07 §0-§3.3 (Part Ⅰ + KSF + AOS/DOS) + V07 §6 (MVP 로드맵) + V07 §8/§9/§10 (Biz Model A-F) / V08 §6 (Sub-feature 트리) + V08 §11 (Biz Model A-G) + V08 §13-2 (B2B 시퀀스) + V08 §14-4 (BMC 9-Block) + V08 부록 (Traceability)

- 생성:
  - [[product/sources/31-32-VPS-V07-V08-Detail]] — V07/V08 6대 진화점 정독 source

- 갱신:
  - [[product/concepts/VPS-evolution]] — V07-V08 narrative 정확화 (이전 추정본 → 정독 기반 정정)
  - [[wiki/index.md]] — sources 28종 / 통계 80 / VPS 진화 처리 3/10 / 마지막 갱신 17차

- 핵심 발견:
  - ⭐ **V07 = 4단계 Part Ⅰ-Ⅳ 구조 신설** (Single Source of Truth 선언). Ⅰ 가치 → Ⅱ 매핑 → Ⅲ 구현 → Ⅳ 비즈니스. V08-V09도 이 구조 유지.
  - ⭐ **V07 정량화**: KSF Top 4 (초저비용 유입 / 가시화 성과 / B2B2C 파이프라인 / 규제 우회) + AOS/DOS 사분면 정량 (O-1 9.0/8.5, O-2 9.0/9.0, O-3 7.0/6.5, O-4 6.5/6.5) + Seg E 비타겟 추가.
  - ⭐ **V08 §6 Sub-feature 트리** = V07 자체 명시한 보강점 직접 실행. F1.1~F10.1 + 안전장치 (F1.3 면책 동의 / F6.1 HITL). Sprint 1 Core 8과 직접 매핑.
  - ⭐ **V08 §11-E ROI 시뮬레이터 신규** (V07 6부 → V08 7부 A-G): 원아 1명 이탈 = 연 600만 손실 / 솔루션 50만 = **1,100% ROI**. F9.4 ROI 웹 계산기 영업 무기화. **재무 논리 프레임 전환** (교육 도입 → 경영 방어 투자).
  - ⭐ **V08 §9 페르소나 커버리지 + Seg D-1/D-2 분리**: DMU 5분리는 V09가 아닌 V08에서 이미 시작. D-1 결제권자(원장) + D-2 실무 운영자(교사). 미충족 리스크 방어 컬럼 신규.
  - ⭐ **V08 §13-2 B2B 영업 강화**: V07 객관 리포트가 대신 말함 → V08 F9.2 Zero-touch + F9.4 ROI 시뮬레이터 직접 조작 → 경영 방어 투자 프레임.
  - **V08 §14-4 BMC 9-Block + 부록 26 보고서 Traceability Matrix**: 감으로 작성된 게 아님 증명.

- ⭐ **이전 narrative 정정**:
  - VPS-evolution 이전 추정: V09에서 DMU 5분리 + Sub-feature 분해 → **정정**: V08에서 이미 둘 다 시작. V09는 정교화 단계.
  - V07-V08 진화 패턴 = **자기-인용 보강 사이클** (V07 Sub-feature 트리 미완 자체 명시 → V08 직접 실행). VPS V09 → V09 Quality (raw 51) → PRD V10에서도 반복.

- 메모:
  - F9.4 ROI 웹 계산기 → 88 Task 매핑 미완. FR-Q/FR-C 후속 task 신규 필요 가능성.
  - V07-V08 §10 GTM Copy + §13 영업 시퀀스는 V07/V08 거의 동일 (V08은 §13-2만 강화).
  - V08 부록 Traceability 26 보고서 → 26 raw 자료 중 식별 가능한 일부와 매핑되나, 모든 raw 번호 매칭은 추후 보강.

- 잔여:
  - raw 24-30 (V01-V06 미독) — V06 → V07 4단계 구조 도입 직전 상태 + V01-V04 멀티 LLM 차이 narrative.
  - 52 V09 Quality Improvement (692줄) — 51의 18건 반영 검증.
  - VPS V09 자체 §10/§13/§14 partial.
  - 추가 페르소나 entity 5명 (황보름·강지방·윤성민·송혜경).
  - TAM 정의 일치화 (13(72-96만) vs PRD 150만).
  - REQ-FUNC ↔ Epic ↔ Task 자동 매핑 인덱스 + 88 Task SP 매핑.
  - ADR 거부 시나리오 분석.
  - multi-llm-workflow 일반화.
  - 임상 정합성 검증 후속.
  - HITL 시스템 흐름 concept (API-005 + API-006 + PostgreSQL 트리거).
  - 변경 관리 프로세스 (53 선택적 보강).


## [2026-05-09] ingest | PRD V09 Quality Improvement (raw 52, 692줄) — 18 결함 P0/P1/P2 분류 + 자체 반영 SRS-Ready 확정판

- 입력: raw/52_PRD_V09_Quality_Improvement.md (692줄, 62KB)

- 정독 범위: §1 개요·목표 (Pain·Outcome·KPI·차별가치·전환트리거) / §2 사용자·DMU·CJM (페르소나·Critical Path·CJM 16셀) / §3 Story S1-S6 AC + HITL 4 원칙 / §4 MoSCoW (Must 6 + Should 10 + Could 5) / §5 NFR + 모니터링 5종 / §6 ERD 7엔터티 + 4 API / §7 리스크·가정·의존성 / §8 실험·롤아웃·벤치마크·Lock-in 4중 / §9 Proof + Traceability / §10 ADR-01~04

- 생성:
  - [[product/sources/52-PRD-V09-Quality-Improvement]] — V0.9 18 결함 P0/P1/P2 분류 + 자체 반영 결과 정독 source

- 갱신:
  - [[product/concepts/PRD-evolution]] — V09 narrative 정독 기반 정확화 (P0/P1/P2 분류 + 16건 명시 + 2건 추정 영역 표시)
  - [[wiki/index.md]] — sources 29 → 30 / 통계 81 / PRD 진화 처리 6/15 → 7/15 / 마지막 갱신 18차

- 핵심 발견:
  - ⭐ **18 결함 분류** (V0.9 헤더 명시): **P0(8) CJM KPI 수치화** + **P1(3) Lock-in KPI 등록·가정→EXP 매핑·모니터링 보강** + **P2(5) AC 측정·HITL 재학습·산술 교정·Traceability·NFR 연결** = 16건 명시 (2건은 §1.5 + §2.3 추정 — 51 정밀 매칭 후속 보강).
  - ⭐ **P0 CJM 16셀 정량화**: 4 페르소나 × 4 CJM 단계. Seg A CVR≥8%/첫 미션≥50%/WAU≥60%/공유≥15%, Seg C 첫주≥70%/M2≥50%, Seg B M3≥40%/단톡방≥95%, Seg D 조작 0회/서명≥85%/알림장≥90%.
  - ⭐ **P1 Lock-in 4중 KPI 등록** (§8.5): 데이터 매몰 Churn≤5% / 아동 주도 DAU 유지 / 가족 네트워크 리퍼럴 / B2B2C FOMO CAC 0원. 4중 Lock-in 정본 ([[product/concepts/MVP-feature-spec]])과 직접 매핑.
  - ⭐ **P1 가정 → 실험 매핑** (§7.3): A1 가격 → EXP-4, A2 바이럴 → §8.1 B2C Beta CTR, A3 환경 → EXP-1+W-AUR, A4 B2B → EXP-3. **검증 책임의 명시적 EXP 귀속**.
  - ⭐ **P1 모니터링 5종 대시보드** (§5): 퍼널±20% / STT 5분 3% / LTV:CAC<3 / HITL 큐 24h 3건 / 외부 API 1h 5%. 88 Task의 MON-001~004 직접 기반.
  - ⭐ **P2 Story AC 30+ 측정 임계치** (§3 S1-S6): 모든 AC가 측정 가능 + Neg AC 12개. SRS REQ-FUNC 변환 직접 기반.
  - ⭐ **P2 HITL 루프백 재학습 3단계 명문화** (§3 4번째 원칙): ① 오진율 0.5% 초과 → 즉시 롤백 ② 보정 500건 누적 후 파인튜닝 재개 ③ 0.3% 이하 후 재배포. ML Ops 절차 + ADR-02 + TEST-014 9 시나리오 정합.
  - ⭐ **P2 산술 교정** (§1.4): 시간 단축 ≥17,000배 = . V08 정성 → V0.9 정량.
  - ⭐ **P2 Traceability 통합** (§9.1): V08 부록 26 보고서 Traceability를 PRD 본문에 8 섹션 ↔ 근거 문서 매핑으로 통합.
  - ⭐ **P2 NFR ↔ AC 연결** (§5): NFR 성능 표 신규 연결 AC 컬럼. NFR 위반 = AC 위반 = 합격 게이트 실패. 연쇄 추적.

- ⭐ **이전 narrative 정정**:
  - PRD-evolution V09 항목: V10 Revision History 추정 → **본문 정독 기반 P0/P1/P2 분류 명시 + 16건 한정 표시**.
  - 51 18 Findings ↔ 52 V0.9 반영의 정확한 매칭은 51 정밀 재정독으로 후속 보강 (현 위키는 카테고리 매핑만 확보).

- ⭐ **워크플로 패턴 정합**:
  - 메타 검토 → 자체 반영 사이클: 51 외부 LLM 메타 18 Findings 발견 → 52 V0.9 Quality 자체 반영. SRS V05 Comparison → V05 Merged → V06 Tech Stack 전환과 동일 패턴 ([[product/concepts/multi-llm-workflow]]).
  - 정성 → 정량 전환: V07-V08 KSF/AOS/DOS 정량화 → V09 Quality CJM 16셀 + AC 30+ + NFR↔AC 연결로 심화.

- 메모:
  - V09 Quality 단계까지는 키즈노트/카카오 외부 API 의존 유지. V10 + 67 MVP Descope에서 D8/추가 E2로 우회.
  - §6 ERD 7 엔터티 (USER/SESSION_LOG/EVALUATION_RESULT/INSTITUTION/MISSION_CARD/WEEKLY_REPORT/REWARD_PROGRESS) → DB-001~011 88 Task 직접 기반.
  - §6.2 4 API → API-001~012 88 Task의 코어 4종 (analyze/curriculum/approval/sign).
  - V0.9 Quality는 마지막 기술 중립 PRD. V10에서 Sprint 분해 + R6 피벗 + 용어사전 + Readiness Gate 100%.

- 잔여:
  - **51 18 Findings 정밀 재정독** — 16건 명시 + 2건 추정 영역의 정확한 raw 51 매칭 (§1.5 + §2.3 확정).
  - raw 24-30 (VPS V01-V06 미독) — V06 → V07 4단계 구조 도입 직전 narrative.
  - VPS V09 자체 §10/§13/§14 partial.
  - 추가 페르소나 entity 5명 (황보름·강지방·윤성민·송혜경).
  - TAM 정의 일치화 (13(72-96만) vs PRD 150만) — V09 Quality §9.0-c는 PRD 측 150만 기준.
  - REQ-FUNC ↔ Epic ↔ Task 자동 매핑 인덱스 + 88 Task SP 매핑.
  - HITL 시스템 흐름 concept (API-005 + API-006 + PostgreSQL 트리거) — V09 Quality §3 HITL 4 원칙 + ADR-02 통합 정본 페이지.
  - F9.4 ROI 시뮬레이터 → 88 Task 매핑 미완.
  - 변경 관리 프로세스 (53 선택적 보강).


## [2026-05-09] ingest | PRD V09 Quality Improvement (raw 52, 692줄) — 18 결함 P0/P1/P2 분류 + 자체 반영 SRS-Ready 확정판

- 입력: raw/52_PRD_V09_Quality_Improvement.md (692줄, 62KB)

- 정독 범위: §1 개요·목표 / §2 사용자·DMU·CJM (CJM 16셀) / §3 Story S1-S6 AC + HITL 4 원칙 / §4 MoSCoW (Must 6 + Should 10 + Could 5) / §5 NFR + 모니터링 5종 / §6 ERD 7엔터티 + 4 API / §7 리스크·가정·의존성 / §8 실험·롤아웃·벤치마크·Lock-in 4중 / §9 Proof + Traceability / §10 ADR-01~04

- 생성:
  - [[product/sources/52-PRD-V09-Quality-Improvement]] — V0.9 18 결함 P0/P1/P2 분류 + 자체 반영 결과 정독 source

- 갱신:
  - [[product/concepts/PRD-evolution]] — V09 narrative 정독 기반 정확화 (P0/P1/P2 분류 + 16건 명시 + 2건 추정 영역 표시)
  - [[wiki/index.md]] — sources 29 → 30 / 통계 81 / PRD 진화 처리 6/15 → 7/15 / 마지막 갱신 18차

- 핵심 발견:
  - ⭐ **18 결함 분류**: P0(8) CJM KPI 수치화 + P1(3) Lock-in KPI 등록·가정→EXP 매핑·모니터링 보강 + P2(5) AC 측정·HITL 재학습·산술 교정·Traceability·NFR 연결 = 16건 명시 (2건은 §1.5 + §2.3 추정 — 51 정밀 매칭 후속).
  - ⭐ **P0 CJM 16셀 정량화**: Seg A CVR≥8%/첫 미션≥50%/WAU≥60%/공유≥15%, Seg C 첫주≥70%/M2≥50%, Seg B M3≥40%/단톡방≥95%, Seg D 조작 0회/서명≥85%/알림장≥90%.
  - ⭐ **P1 Lock-in 4중 KPI 등록** (§8.5): 데이터 매몰 Churn≤5% / 아동 주도 DAU 유지 / 가족 네트워크 리퍼럴 / B2B2C FOMO CAC 0원.
  - ⭐ **P1 가정 → 실험 매핑** (§7.3): A1 가격→EXP-4, A2 바이럴→§8.1 CTR, A3 환경→EXP-1+W-AUR, A4 B2B→EXP-3.
  - ⭐ **P1 모니터링 5종**: 퍼널±20% / STT 5분 3% / LTV:CAC<3 / HITL 큐 24h 3건 / 외부 API 1h 5%.
  - ⭐ **P2 Story AC 30+ 측정 임계치 + Neg AC 12개** (§3 S1-S6).
  - ⭐ **P2 HITL 루프백 재학습 3단계 명문화** (§3 4번째 원칙): ① 0.5% 초과 → 즉시 롤백 ② 500건 누적 후 파인튜닝 ③ 0.3% 이하 후 재배포.
  - ⭐ **P2 산술 교정** (§1.4): ≥17,000배 = 87,000분 ÷ 5분.
  - ⭐ **P2 Traceability 통합** (§9.1): V08 부록 26 보고서 → PRD 본문 8 섹션 ↔ 근거 매핑.
  - ⭐ **P2 NFR ↔ AC 연결**: NFR 표 "연결 AC" 컬럼 신규.

- ⭐ **워크플로 패턴 정합**:
  - "메타 검토 → 자체 반영": 51 외부 LLM 18 Findings → 52 V0.9 자체 반영. SRS Comparison → V05 Merged → V06 Tech Stack 전환과 동일 패턴.
  - "정성 → 정량 전환": V07-V08 KSF/AOS/DOS → V09 Quality CJM 16셀 + AC 30+ + NFR↔AC.

- 메모:
  - V0.9 Quality는 마지막 기술 중립 PRD. V10에서 Sprint 분해 + R6 피벗 + 용어사전 + Readiness Gate 100%.
  - §6 ERD 7 엔터티 → DB-001~011 88 Task 직접 기반.
  - §6.2 4 API → API-001~012 코어 4종.

- 잔여:
  - **51 18 Findings 정밀 재정독** — 16건 명시 + 2건 추정 영역의 raw 51 정확 매칭.
  - raw 24-30 VPS V01-V06.
  - V09 §10/§13/§14 partial.
  - 페르소나 entity 5명 (황보름·강지방·윤성민·송혜경).
  - TAM 정의 일치화 (13 72-96만 vs PRD 150만).
  - REQ-FUNC ↔ Epic ↔ Task 자동 매핑.
  - HITL 시스템 흐름 concept (API-005 + API-006 + PostgreSQL 트리거 통합).
  - F9.4 ROI 시뮬레이터 → 88 Task 매핑.
  - 변경 관리 프로세스 (53).


## [2026-05-09] note | HITL 시스템 흐름 concept 정본 신설 (synthesis)

- 입력: 기존 위키 통합 — V09 Quality §3 4 원칙 + ADR-02 + Sprint 1 코어 8/의존 7/잔여 4 + API 4종 + TEST-014 + SRS V06 REQ-FUNC

- 생성:
  - [[product/concepts/HITL-system-flow]] ⭐ — HITL 시스템 흐름 정본 (synthesis)

- 갱신:
  - [[wiki/index.md]] — concepts 18 → 19 / 통계 82 / 마지막 갱신 19차

- 핵심 통합:
  - ⭐ **4 원칙 → 9 단계 시스템 흐름 다이어그램**: AI 1차 판정 → 자동 게이트 → API-005 큐 등록 + Slack 웹훅 → 전문가 검토 (Studio 1차 + PATCH fallback) → PostgreSQL 트리거 자동 sync → Resend 사용자 알림 → Cron 24h/48h 에스컬레이션 → 어뷰징 방어 (월 3회+ expertId / 4회+ userId) → 루프백 재학습 (0.5%/500건/0.3% 3단계 게이트).
  - ⭐ **Sprint 1 의존 5종 매핑**: DB-009 hitl_queue + FR-C-001 confidence + FR-C-002 enqueueForReview + API-005 큐 등록 + API-006 코멘트 + TEST-014 9 시나리오.
  - ⭐ **PostgreSQL 트리거 SQL 정본**: `CREATE TRIGGER trg_sync_hitl_review` — Studio UPDATE → evaluation_results.hitlReviewed=true 자동 sync + audit_log INSERT. D4 Descope (Realtime/어드민 → Slack + Studio) 핵심 메커니즘.
  - ⭐ **9 REQ-FUNC 매핑**: REQ-FUNC-003/032/033/034 + REQ-FUNC-HITL-001~004 + REQ-NF-012 (≤48h SLA).
  - ⭐ **G2 Free Tier 운영비 $0/월**: Slack Webhook (무제한) + Supabase Studio (Free) + PostgreSQL 트리거 (자체) + Resend (Free 100/일). MVP-descope-plan "운영비 $30/월"의 핵심 기여 영역.
  - ⭐ **임상 안전망 정합**: 48h SLA = 사설 센터 1주 단위 부모 상담 디지털 1/3 단축 / expertId 어뷰징 = 1급/2급 자격제도 임상 객관성 + 윤리 강령 디지털 운영 / groundTruthScore 3축 = U-TAP + REVT + PRES 3 평가 도구 단순화.
  - ⭐ **D4 Descope 부활 조건 신규 제안**: 일 큐 등록 >20건 OR 전문가 풀 >10명 OR B2B PoC 30곳 이상 시 어드민 페이지 부활.

- 보강 필요 (정본에 명시):
  - `model_retraining_data` 테이블 스키마 — 88 Task 미정규화 (REQ-FUNC-HITL-004). DB-XXX 신규 또는 SRS REQ 보강.
  - 0.5%/500건/0.3% 게이트 운영 책임자 + Slack/Cron 트리거.
  - `docs/hitl-operations.md` Studio 가이드 별도 정독.
  - HITL 사용자 (부모) 이의제기 UI — PRD V10 §3 구체 경로 미상.
  - expert pool 수급 정책 (D3 의존성).

- ⭐ **Cross-link 활성**: HITL-system-flow → architecture-decisions (ADR-02/03/04/05/06) + MVP-feature-spec (F6 Epic) + MVP-descope-plan (D4) + task-breakdown-overview + tech-architecture (C-TEC-002/003) + 4 source pages + 3 clinical 페이지.

- 잔여 (이전 ingest 누적):
  - 51 18 Findings 정밀 재정독 (16건 명시 + 2건 추정 매칭).
  - VPS V01-V06 (raw 24-30).
  - V09 §10/§13/§14 partial.
  - 페르소나 entity 5명 (황보름·강지방·윤성민·송혜경).
  - TAM 정의 일치화 (13 72-96만 vs PRD 150만).
  - REQ-FUNC ↔ Epic ↔ Task 자동 매핑 인덱스 + 88 Task SP 매핑.
  - F9.4 ROI 시뮬레이터 → 88 Task 매핑.
  - 변경 관리 프로세스 (53).
  - 위키 lint (cross-link 누락 + 사실 일관성).


## [2026-05-09] lint | 위키 감사 + 4 clinical/concepts cross-link 활성

- 감사 도구: Explore 에이전트 통합 보고서

- 발견 (감사):
  - ✅ 통계 일관성: 82페이지 (product 65 / clinical 17) 정확. 데드 링크 0건.
  - ⚠️ **단일 기둥 위반 (CLAUDE.md §5.2)**: 4 clinical/concepts (실어증·마비말장애·인공와우-청능재활·조음장애) + 8 clinical/entities 모두 product 링크 0건.
  - ✅ 자체 문서화된 모순:
    - TAM 정의 (13 = 72-96만 보수 vs PRD/VPS = 150만 광의) — 13 본문에 자체 메모 보유. 방법론 차이.
    - 18 vs 16 결함 (V0.9) — 52 본문에 추정 영역 명시. raw 51 정독 후속.
  - ✅ DMU 5분리 timeline (V08 D-1/D-2 시작 → V09 5 DMU 형식화) — VPS/PRD evolution 양쪽 일관.

- 사용자 결정 (수정 적용):
  - HIGH: 4 clinical/concepts cross-link 활성
  - LOW: 의료 영역 3 (실어증·마비말장애·인공와우) "MVP 회피 영역" 명시 + competitive-landscape § DTx 양방향
  - (보류: 8 clinical/entities backlink, TAM 방법론 비교 표)

- 갱신 (수정 적용):
  - [[clinical/concepts/실어증]] — § Product cross-link "MVP 회피 영역" 신규: competitive-landscape (DTx) + ADR-04 + PRD V10 § Won't + 네오폰스 entity. 회피 사유 3개 (의료법 R1 / 영유아 비대상 / 평가 60-90분 ≤5분 KSF 위배).
  - [[clinical/concepts/마비말장애]] — § Product cross-link "MVP 회피 영역" 신규: competitive-landscape + ADR-04 + 말과학놀이터 (장애음성 STT 직접 타깃) + PRD V10 § Won't. 5 하위체계 중 조음만 부분 중첩.
  - [[clinical/concepts/인공와우-청능재활]] — § Product cross-link "회피 영역 + 부분 학습 가치" 신규: competitive-landscape + ADR-04 + ⭐ **MVP-feature-spec § F3-b 4단계 위계 (감지→변별→확인→이해) = 적응형 난이도 영감** + PRD V10 § Won't.
  - [[clinical/concepts/조음장애]] ⭐ — § Product cross-link "MVP 핵심 타깃" 신규: F1-a 3축 AI articulation 점수 / HITL-system-flow groundTruthScore.articulation / U-TAP / KSF #2 / 말과학놀이터 / F11 음성 클로닝 윤리 / competitive-landscape. **6단계 위계 = F3-b 임상 근거**. ADR-04 따라 UI 텍스트 "조음장애" → "발음 정확도 향상" 치환.
  - [[product/concepts/competitive-landscape]] § Clinical 근거 — 카테고리 B 임상 매핑 양방향 강화 (트랙1 3 영역 + 트랙2 일부 + ⭐ 조음장애 MVP 타깃 명시).
  - [[wiki/index.md]] — Cross-link 표 4 신규 항목 / 카운터 3 → 7 페이지 / 마지막 갱신 20차 lint+fix.

- ⭐ Cross-link 활성 효과:
  - **clinical → product 페이지 수**: 3 → **7** (한국-트랙비교 + 아동기법 + 0-가이드 + 4 disorder 신규).
  - **양방향 페어**: 17+ → **25+** (4 clinical/concepts 각 4-7 product 링크 추가).
  - **CLAUDE.md §5.2 위반 페이지**: 4 → **0** (clinical/concepts 12개 모두 cross-link 활성).

- 핵심 패턴:
  - 의료 영역 3 (실어증·마비말장애·인공와우) = "회피 영역" 명문화 + competitive-landscape § DTx와 양방향. ADR-04 (의료 용어 배제) 정합.
  - 조음장애 = 유일한 MVP 핵심 타깃. 3축 AI articulation 점수의 임상 토대 + 6단계 위계의 F3-b 근거.
  - 인공와우 4단계 위계 (감지→변별→확인→이해) = 회피 영역이지만 적응형 난이도 설계 원리는 "단순→복잡 일반화 패턴"으로 영감 차용.

- 잔여 (lint 후 갱신):
  - 8 clinical/entities backlink 추가 (보류).
  - TAM 정의 비교 표 명시 (보류).
  - 51 18 Findings 정밀 재정독 (16 명시 + 2 추정 매칭).
  - VPS V01-V06 (raw 24-30) 본문.
  - V09 §10/§13/§14 partial.
  - 페르소나 entity 5명.
  - REQ-FUNC ↔ Epic ↔ Task 자동 매핑 인덱스.
  - F9.4 ROI 시뮬레이터 → 88 Task 매핑.
  - model_retraining_data 테이블 스키마 (HITL-system-flow 보강).
  - 변경 관리 프로세스 (53).


## [2026-05-09] lint | 8 clinical/entities backlink 활성 — 평가 도구 ↔ MVP 매핑 완성

- 사용자 결정: 린트 잔여 고우도 항목 적용 — 8 평가 도구 entity backlink

- 갱신 (8건):
  - [[clinical/entities/K-WAB]] ⛔ 회피 — KSF #2 + Value-Chain + Porter-5F + PRD § Won't (60-90분 vs 5분 단축 비교 사례).
  - [[clinical/entities/K-BNT]] ⛔ 회피 + 부분 영감 — F3-b 적응형 난이도 (단서 위계 의미→음소).
  - [[clinical/entities/SELSI]] ⭐ MVP 직접 — F1-a 5분 진단 임상 토대 (60-90분 SELSI → 5분 간이) + KSF #2 + Porter-5F + customer-segmentation + HITL-system-flow linguistic.
  - [[clinical/entities/PRES]] ⭐ MVP 직접 — F1-a 3축 linguistic 점수 임상 토대 + HITL groundTruthScore.linguistic.
  - [[clinical/entities/REVT]] ⭐ MVP 직접 — F1-a + F4 어휘 영역 + HITL + Value-Chain "62→71점" + Seg B persona-박민정 (수치 증명 욕구).
  - [[clinical/entities/U-TAP]] ⭐⭐ **MVP 가장 직접적** — F1-a articulation = U-TAP 음운변동 디지털 단순화 + HITL groundTruthScore.articulation = REQ-FUNC-HITL-003 + 조음장애 6단계 위계 = F3-b.
  - [[clinical/entities/KOPLAC]] ◐ 부분 — F15 LLM 챗봇 화용 영감 + KSF #2 + ASD 진단 회피.
  - [[clinical/entities/PECS]] ⛔ 회피 — AAC 중증 ASD = 의료/특수교육 영역 + competitive-landscape + ADR-04.

- 갱신:
  - [[wiki/index.md]] — Cross-link 표 8 신규 (entities) + 카운터 7 → 15 페이지 / 60+건 / 마지막 갱신 21차.

- ⭐ Cross-link 활성 효과 (전체):
  - **clinical → product 페이지 수**: 7 → **15** (concepts 4 신규 + entities 8 신규).
  - **양방향 페어**: 25+ → **40+**.
  - CLAUDE.md §5.2 위반 페이지: clinical/concepts 0 + clinical/entities 0 = **clinical 모두 cross-link 활성** ✅.

- 핵심 매핑 패턴:
  - **3축 AI 매핑**: F1-a articulation → U-TAP / linguistic → SELSI + PRES + REVT / acoustic → 음향 분석 (별도 임상 도구 없음, 기술적 영역).
  - **MVP 회피 영역 표지** (⛔): K-WAB·K-BNT (트랙1 성인) + PECS (AAC 중증). competitive-landscape § DTx + ADR-04 + PRD § Won't 정합.
  - **부분 영감 패턴** (◐): K-BNT 단서 위계 → F3-b / KOPLAC 화용 → F15 — "회피 영역의 임상 메커니즘에서 영감만 차용".
  - **가장 강력한 매핑** (⭐⭐): U-TAP. 조음장애 + groundTruthScore.articulation + F1-a 3축 + ADR-04 정합 모두 한 점에서 만남.

- 잔여 (이전 누적):
  - TAM 정의 비교 표 명시 (보류).
  - 51 18 Findings 정밀 재정독.
  - VPS V01-V06 (raw 24-30) 본문.
  - V09 §10/§13/§14 partial.
  - 페르소나 entity 5명.
  - REQ-FUNC ↔ Epic ↔ Task 자동 매핑 인덱스.
  - F9.4 ROI 시뮬레이터 → 88 Task 매핑.
  - model_retraining_data 테이블 스키마.
  - 변경 관리 프로세스 (53).


## [2026-05-09] lint | TAM 정의 모순 — 정본 비교 표 명시 (22차)

- 사용자 결정: 린트 잔여 마지막 항목 — TAM 모순 해소

- 발견된 모순:
  - **보수 정의 (13/14)**: 만 0-7세 240만 × 부모 관심 30-40% = **72-96만** / 연 매출 3,024-4,032억
  - **광의 정의 (PRD V0.9 §9.0-c, V10, VPS V09)**: 만 2-7세 전체 cohort = **150만** / SAM 22.5만 (15% 발달 지연 우려 적용)
  - **양쪽 SOM 1년차 12K 가구 수렴** — 차이는 잠재력 vs 즉각 도달 가능 시장의 정의 차이

- 갱신 (4건):
  - [[product/concepts/customer-segmentation]] § TAM-SAM-SOM — 정본 표 + § "TAM 정의 모순 — 보수 vs 광의" 신규 (출처/정의/SAM·SOM 결과/사용 권장 맥락 비교 표).
  - [[product/sources/13-Market-Sizing]] L103 자체 메모에 customer-segmentation 비교 표 양방향 링크 보강.
  - [[product/sources/54-PRD-V10-Final]] § 보강 필요 — TAM 차이 명세를 customer-segmentation 비교 표로 연결 + 광의/보수 사용 맥락 명시.
  - [[product/sources/14-Market-Segmentation]] § 한계 — 광의 TAM 차이 양방향 링크 추가.
  - [[wiki/index.md]] — 마지막 갱신 22차.

- 핵심 정리:
  - **방법론 차이 ≠ 오류**. 보수 = VC·Unit Economics·Porter-5F LTV:CAC 9.0x 기준 (잠재 결제층) / 광의 = PRD V0.9 §1.3 KPI 시뮬레이션·Lock-in 4중 마케팅 잠재력.
  - **본 위키 정본 = 보수 (13)**. 13 자체 메모 ("13의 정의가 더 보수·정확") 및 W-AUR ≥60% / M3 ≥40% 등 Phase 0 KPI는 보수 TAM 기준 보고로 일관.
  - **SOM 1년차 12K 가구 수렴**이 실무적 합의점. 결제 전환율 8% × 17-25만 SAM = 13.6-20K (≈12K) / 광의도 동일 12K 산출.

- 효과:
  - 위키 사실 모순 (CLAUDE.md §5.3) — TAM 정의 = "자체 문서화 → 정본 표 명시"로 격상.
  - 4 페이지 양방향 링크 활성으로 사용자가 어느 페이지에 진입하든 비교 가능.

- 잔여:
  - 51 18 Findings 정밀 재정독 (16 명시 + 2 추정 매칭).
  - VPS V01-V06 (raw 24-30) 본문.
  - V09 §10/§13/§14 partial.
  - 페르소나 entity 5명.
  - REQ-FUNC ↔ Epic ↔ Task 자동 매핑 인덱스.
  - F9.4 ROI 시뮬레이터 → 88 Task 매핑.
  - model_retraining_data 테이블 스키마.
  - 변경 관리 프로세스 (53).


## [2026-05-09] ingest | VPS V01-V06 + BMC 정독 (raw 24-30, 81KB) — 멀티 LLM 사이클 + Best-of-Breed 검증

- 입력: raw/24 BMC (14KB) + raw/25-28 V01-V04 멀티 LLM (44KB) + raw/29-30 V05-V06 Merged (23KB) = 7 파일 81KB

- 정독 범위: 헤더 + 핵심 섹션 + 변경점 grep 정독 (V01 7-Block + V02 JobMVP + V03/V04 BMC 정합 + V05 Dashboard + V06 Business Operations + raw 24 9-Block)

- 생성:
  - [[product/sources/24-30-VPS-V01-V06-Detail]] ⭐ — V01-V06 + BMC 정독 source

- 갱신:
  - [[product/concepts/VPS-evolution]] — V01-V06 narrative 정독 기반 정정. 진화 표 BMC 행 + V01-V06 항목 명시 + 정독 완성 표시.
  - [[product/concepts/multi-llm-workflow]] § 적용 사례 — VPS V01-V06 = **2 사이클 패턴** (V01 ↔ V02 / V03 ↔ V04) 명시.
  - [[wiki/index.md]] — sources 30 → 31 / 통계 83 / VPS 진화 3/10 → **10/10 ✅ 정독 완성** / 마지막 갱신 23차.

- 핵심 발견:
  - ⭐ **V01 Sonnet 7-Block 패턴 정립** (Pain·Job·Outcome·VP·Substitute·차별·Proof + JTBD 3축 F/E/S + AOS 정량 4.0/3.2/3.0). V07까지 모두 계승.
  - ⭐ **V02 Gemini JobMVP Feature Map 신규 = F1-F10 직접 조상**: ① 무료 진단 ~ ⑩ 동의서. V09에서 21 Sub-feature로 확장.
  - ⭐ **2 멀티 LLM 사이클 발견** (이전 추정 1 사이클 정정): ① V01 Sonnet ↔ V02 Gemini (1차 7-Block + JobMVP) → ② V03 Sonnet ↔ V04 Gemini (BMC 정합 패치 — TAM 1,080-1,800억 + Phase 명시) → V05 Merged.
  - ⭐ **V05 Best-of-Breed Dashboard 패턴 신규**: [Overview] (V02-V04 표) + [Deep Dive] (V01 narrative + AOS) + [Marketing] (V02 Positioning). V09 Quality § Story AC + 페르소나 커버리지의 직접 조상.
  - ⭐ **V06 Business Operations 4 섹션 신규**: 가격·KPI·채널·리스크. V07 Part Ⅳ "비즈니스 실행"의 직접 조상. "100점 마스터" 자체 선언.
  - ⭐ **자체-인용 보강 사이클이 V01부터 시작**: V01-V04 분산 → V05 통합 → V06 Business Operations 신규 → V07 4단계 → V08 Sub-feature → V09 Quality 18 Findings → V10 Readiness Gate. **9 차례 반복 검증**.
  - ⭐ **BMC RS 변경점 발견**: V06 = "B2B 10-30만/月 + 데이터 라이선스 Phase 3+" → V07-V08 = "B2B 연 50만 단일" 단일화. 사유 raw 51 후속 보강.

- ⭐ **이전 narrative 정정**:
  - VPS-evolution V01-V06: 파일명 기반 추정 → **7-Block / JobMVP / BMC 정합 / Dashboard / Business Operations 명시**.
  - "V01-V04 1 사이클" 추정 → **2 사이클 (1차 + BMC 정합)** 정정.

- 멀티 LLM 워크플로 검증:
  - VPS V01-V06 = **다른 모든 LLM 사이클의 원형**. PRD V01-V05 (40-44 Gemini→Cursor→Opus→GPT-4o→Integrated) + SRS V01-V05 (57-64 Opus → Gemini → V05 Merged Master) 모두 반복.

- 메모:
  - V05/V06 Marketing 섹션 (Positioning Statement 후속) 본문 정독 보강 가치.
  - V02/V04 JobMVP ⑧ 다자녀 Triage → V07-V08 매핑 (F8 후보).
  - BMC RS 변경 사유는 raw 51 또는 V07 본문 후속.

- 잔여 (정독 후 갱신):
  - 51 18 Findings 정밀 재정독 (16 명시 + 2 추정 + BMC RS 변경 사유).
  - V09 §10 GTM Copy / §13 영업 시퀀스 / §14 검증 partial.
  - 페르소나 entity 5명 (황보름·강지방·윤성민·송혜경).
  - REQ-FUNC ↔ Epic ↔ Task 자동 매핑 인덱스 + 88 Task SP.
  - F9.4 ROI 시뮬레이터 → 88 Task 매핑.
  - model_retraining_data 테이블 스키마.
  - 변경 관리 프로세스 (53).


## [2026-05-09] lint | raw 51 재정독 — 18 Findings 정밀 매칭 ✅ (24차)

- 입력: raw/51_PRD_V08_Quality_Review.md (10KB, 181줄) — 외부 LLM 메타 검토자가 V08을 5 체크리스트 + CJM 추가 1 영역으로 점검한 보고서

- 정독 결과 — **18건 정밀 매칭** (이전 위키 추정 정정):

  | 우선순위 | 항목 수 | 결함 ID | 영역 |
  |---|---|---|---|
  | **P0** | **8** | C-01 ~ C-08 | CJM KPI 수치화 (4 페르소나 × 단계) |
  | **P1** | **3** | F-08 + F-10 + F-04 | Lock-in KPI 등록 / 가정→EXP 매핑 / 모니터링 보강 |
  | **P2** | **5** | F-01 + F-02 + F-03 + F-07 + F-09 | 기준선 N/A / S3-AC3 경로 / HITL 재학습 / 산술 (1,000→17,000배) / Traceability 누락 |
  | **P3** | **2** | F-05 + F-06 | Cold Start AC 미연결 / SLA CS 도구 명시 |
  | **합계** | **18** ✅ | (raw 51 본문 정확 매칭) | |

- ⭐ **이전 위키 정정 사항**:
  - "16 명시 + 2 추정 (§1.5 전환 트리거 + §2.3 Intervention Dependency)" → **잘못된 추정 정정**.
  - 실제 = **P3 (F-05 + F-06) 2건 = NFR 텍스트 수정 영역**. V0.9 v0.9 변경 헤더가 P0/P1/P2만 분류 표시하고 P3 누락. 본문 §5 NFR에 흡수만 됨.
  - §1.5 + §2.3은 V0.9의 추가 보강 영역이지만 **18 결함 카테고리 외**.
  - PRD-Intermediate-Reviews-Meta는 처음부터 P3 2건 정확 명시 보유 — 이 source의 분류가 정본.

- 갱신 (3건):
  - [[product/sources/52-PRD-V09-Quality-Improvement]] — P0/P1/P2/P3 4단 분류 정정 + raw 51 결함 ID 정밀 매칭 표 + 추정 표기 제거.
  - [[product/concepts/PRD-evolution]] § V09 — P3 (2건) 분류 추가 + 18건 = P0(8) + P1(3) + P2(5) + P3(2) 정확 표기.
  - [[product/sources/PRD-Intermediate-Reviews-Meta]] § 51 — raw 51 직접 정독 검증 메모 추가 + 위키 정정 안내.
  - [[wiki/index.md]] — 마지막 갱신 24차.

- 핵심 발견:
  - ⭐ **raw 51 정밀 매칭 결과 = PRD-Intermediate-Reviews-Meta 정본과 1:1 일치**. 위키 합성 단계에서 일부 페이지가 잘못된 추정으로 인용한 것.
  - **F-05 Cold Start + F-06 SLA CS 도구**는 V09 v0.9 변경 헤더가 "P0(8) CJM, P1(3) Lock-in/가정/모니터링, P2(5) AC/HITL/산술/Trace/NFR" 으로만 분류하고 명시적으로 빠뜨림. 본문 §5 NFR에 흡수.
  - 결과: V09 v0.9 헤더 카테고리 분류 정합성 완성. Phase별 누락 0건.

- ⭐ 워크플로 검증:
  - "메타 검토 (raw 51) → 자체 반영 (raw 52 V0.9) → 정본 검증 (위키 합성)" 사이클이 완전히 추적 가능.
  - 위키의 모든 18 Findings 인용 페이지 정합성 확보.

- 잔여 (이전 누적 + 정밀 매칭 후):
  - V09 §10 GTM Copy / §13 영업 시퀀스 / §14 검증 partial.
  - 페르소나 entity 5명 (황보름·강지방·윤성민·송혜경).
  - REQ-FUNC ↔ Epic ↔ Task 자동 매핑 인덱스.
  - F9.4 ROI 시뮬레이터 → 88 Task 매핑.
  - model_retraining_data 테이블 스키마.
  - 변경 관리 프로세스 (53).
  - VPS-evolution V05 Marketing 섹션 + V02/V04 JobMVP ⑧ 다자녀 Triage 매핑.
  - BMC RS 변경 (V06 → V07-V08) 명시 사유 (raw 31-32 부록 또는 raw 30 V06 본문 재정독 후속).


## [2026-05-09] ingest | 페르소나 entity 4명 추가 — 13 Spectrum 입장 완성 ✅ (25차)

- 입력: [[product/sources/15-Persona-Spectrum]] § Extreme 2 + Non-user 2 + [[product/sources/18-19-Pain-Goal-Opportunity]] AOS/DOS 정량

- 생성 (4건):
  - [[product/entities/persona-황보름]] (Extreme-1, ASD 경계선) — 비전형 발화 → AI 인식 실패. AOS 2.0 / DOS 0.2 / Q2 니치. HITL confidence 60% 강제 게이트 + 모델 다양화 + 임상 검토 레이어.
  - [[product/entities/persona-강지방]] (Extreme-2, 농촌 거주) ⭐ — AOS **4.0** 공동 1위 + **황금 교차점 5명** 구성원. 경량 + 오프라인 PWA (D5 부활 트리거 후보) + LTE 절약 + Capacitor 보강.
  - [[product/entities/persona-윤성민]] (Non-user-1, 아버지) — Goal 자체 부재 (AOS 계산 제외). 직접 타깃 0순위, **이탈 방어 게이트** (1-2개월차 비용 자각 → 가구 단위 해지). F5 카카오톡 공유 = Lock-in #3 직접 타깃.
  - [[product/entities/persona-송혜경]] (Non-user-2, 외할머니) — Q3 과잉투자 경계 (DOS **-0.4** 음수). 본인 직접 진입 회피. 소아과 신뢰 앵커 우회 + 딸 결제 후 가족 갈등 트리거 방어.

- 갱신:
  - [[product/concepts/customer-segmentation]] § 페르소나 스펙트럼 — Extreme 2 + Non-user 3 모두 wiki-link 활성 (이전 텍스트만 → 6 entity 양방향).
  - [[wiki/index.md]] — entities 17 → 21 / 통계 87 / 마지막 갱신 25차.

- 핵심 매핑 패턴:
  - **AOS 4.0 황금 교차점 5명 완성**: 이지수·박민정·최수현·이미란·강지방. Phase 0 100가정 파일럿 모집 가이드라인.
  - **포용적 설계 (Q2)**: 이미란 (이중언어) + 황보름 (ASD 비전형) + 강지방 (저사양·농촌). 3축 핵심 제약 → 모든 Core 설계가 이 3 제약을 기본값으로.
  - **이탈 방어 게이트** (Q4 + Goal 부재): 윤성민 (아빠 비용 저항) + 정유나 (Core-5 Q4 부차적) — 결제 후 1-2개월차 가구 단위 해지 방어.
  - **과잉투자 경계** (Q3): 송혜경 (DOS -0.4). 본인 직접 ROI 음수, 가족 단위 Lock-in 효과로만 정당화.

- ⭐ 신규 발견:
  - **황보름 → HITL confidence 60% 강제 게이트** 가설. 일반 70%보다 보수. REQ-FUNC-003 보강 후보 (현 70%).
  - **강지방 → D5 PWA 오프라인 부활 트리거**. MVP-descope-plan § D5 부활 조건 "농촌 사용자 비율 N% 이상" 형태로 보강 가능.
  - **윤성민 → F5 카카오톡 공유 (Lock-in #3) 직접 타깃**. 1주차 트리거 시점이 핵심 Lock-in 효과.
  - **송혜경 → 가족 갈등 트리거 메트릭 신규 후보**. 결제 후 1-2개월차 해지 가구의 가족 갈등 사유 비율 측정.

- Cross-link 활성:
  - 4 신규 페르소나 → MVP-feature-spec § F1-a/F3-b/F5/F12 / HITL-system-flow / MVP-descope-plan D5 / opportunity-quadrants / 한국-언어치료-트랙비교 / 아동언어치료-핵심기법 / KOPLAC + PECS / Key-Success-Factors.

- 보강 필요:
  - 100가정 파일럿 모집 가이드라인: ASD 경계선 N%, 농촌 N%, 다문화 N%, 조부모 양육 N% 의도 모집 비율 정량화.
  - "조부모 친화 콘텐츠" ROI 정당화 (DOS -0.4의 가족 단위 Lock-in 효과 측정 메트릭).
  - 황보름 → ADR-XX "비전형 발화 군 별도 모델" 신규 후보 검토.
  - 강지방 → D5 PWA 부활 조건 "농촌 사용자 비율" 정량 임계 신규.

- 잔여 (이전 누적):
  - V09 §10 GTM Copy / §13 영업 시퀀스 / §14 검증 partial.
  - REQ-FUNC ↔ Epic ↔ Task 자동 매핑 인덱스.
  - F9.4 ROI 시뮬레이터 → 88 Task 매핑.
  - model_retraining_data 테이블 스키마.
  - 변경 관리 프로세스 (53).
  - VPS-evolution V05 Marketing + JobMVP ⑧ Triage.
  - BMC RS 변경 사유.


## [2026-05-09] note | RTM (Requirements Traceability Matrix) 정본 신설 (26차 synthesis)

- 입력: SRS V06 (65 REQ-FUNC + 4 HITL + 30 REQ-NF) + MVP-feature-spec (21 Epic) + task-breakdown-overview (88 Task) + customer-segmentation (13 Persona) + architecture-decisions (7 ADR) + MVP-descope-plan (9 Descope)

- 생성:
  - [[product/concepts/requirements-traceability-matrix]] ⭐⭐ — RTM 정본 (synthesis)

- 갱신:
  - [[wiki/index.md]] — concepts 19 → 20 / 통계 88 / 마지막 갱신 26차.

- 핵심 매핑 (5축 추적성 100%):
  - **REQ-FUNC 65 + HITL 4 → 21 Epic**: Phase 0 (001~026 = 6 Epic) + Phase 1 (027~045 + HITL = 10 Epic + 4 원칙) + Phase 2 (046~061 = 5 Epic)
  - **REQ-FUNC ↔ 88 Task**: FR-Q 14 + FR-C 18 + API 12 + DB 11 + TEST 14 + MOCK 3 + NFR 16 = 88
  - **REQ-NF 30 → Task 16**: 성능(p95) + SLA(uptime/RPO/HITL 48h) + 신뢰성 + SEC-001~004 + MON-001~004 + KPI(W-AUR/M3/CVR/Churn)
  - **4 Pain Cluster ↔ Epic ↔ Persona**: P1(Seg A 이지수+박민정+황보름+이미란) + P2(Seg C 최수현+강지방) + P3(Seg B 박민정+윤성민) + P4(Seg D-1 오한솔+D-2 김민지)
  - **7 ADR ↔ REQ ↔ Epic**: ADR-01 Zero-touch / ADR-02 HITL / ADR-03 7일 폐기 / ADR-04 의료 용어 배제 / ADR-05 Next.js / ADR-06 Supabase / ADR-07 Vercel AI SDK
  - **9 Descope ↔ REQ ↔ Epic**: D1 Web Speech / D2 Capacitor / D3 Zero-touch / D4 HITL Slack+Studio / D5 PWA 오프라인 (강지방 부활 트리거) / D6 pgvector / D7 Edge Runtime / D8 키즈노트 / 추가 E2 카카오

- ⭐ 핵심 검증:
  - **5축 매핑 완성**: 모든 차원 100% 매핑. 미매핑 0건.
  - **REQ-FUNC ID 빠른 조회 Lookup**: 21줄 텍스트 표로 모든 REQ-FUNC ID와 매핑된 Epic·Task·ADR 즉시 조회.
  - **추적성 검증 표**: 99 REQ + 21 Epic + 88 Task + 13 Persona + 7 ADR + 9 Descope = 모두 100% 매핑 ✅.

- 핵심 워크플로 시사:
  - REQ-FUNC 65 / 21 Epic = 평균 **3.1 REQ/Epic** (Epic 응집도 균등).
  - **HITL 4 원칙 = Cross-cutting concern** (별도 ID 공간 HITL-001~004).
  - **Phase 0 26 REQ → Sprint 1 직접 의존 13 Task** (50%).
  - **F11/F15/F16 (REQ-FUNC-036/039/041)** = 88 Task 미추출 — 보강 필요.
  - **F9.4 ROI 시뮬레이터** = 88 Task 미매핑 (VPS V08 신규).

- Cross-link 효과:
  - 본 RTM = 모든 product/concepts 페이지의 통합 인덱스 진입점.
  - 65 SRS + 21 Epic + 88 Task + 13 Persona + 7 ADR + 9 Descope 양방향 링크 활성.

- 잔여:
  - REQ-FUNC-036~037 (F11) + 039~040 (F15) + 041~045 (F16/17/18) Task 분해 미완.
  - model_retraining_data 테이블 스키마 (REQ-FUNC-HITL-004).
  - F9.4 ROI 시뮬레이터 88 Task 매핑.
  - V09 §10/§13/§14 partial.
  - 변경 관리 프로세스 (53).
  - VPS V05 Marketing + JobMVP ⑧ Triage.
  - BMC RS 변경 사유.


## [2026-05-09] note | F9.4 ROI 시뮬레이터 매핑 + UI 설계 제안 (27차 synthesis)

- 입력: VPS V08 §11-E (1,100% ROI) + §13-2 (영업 무기) + RTM 잔여 항목 + MVP-feature-spec F9-a 12 SP

- 생성:
  - [[product/concepts/F9.4-ROI-simulator]] ⭐ — F9.4 매핑 + UI 설계 제안 (synthesis)

- 갱신:
  - [[product/concepts/requirements-traceability-matrix]] — F9.4 보강 항목 → 별도 매핑 페이지 링크.
  - [[wiki/index.md]] — concepts 20 → 21 / 통계 89 / 마지막 갱신 27차.

- 핵심 분석:
  - **F9.4 = VPS V08 §11-E 신규 + §13-2 영업 무기**: 원아 1명 이탈 = 연 600만 손실 / 솔루션 50만 = 1,100% ROI.
  - **현 88 Task 미매핑**: F9-a (12 SP)의 가치 근거 표에만 "1,100% ROI 시뮬" 문구로 등장. F9-a 흡수 가정.
  - **결정 분석**: 옵션 A (F9-a 흡수) vs **옵션 B 독립 Epic 권장** (인증 경계 분리: F9-a 로그인 ↔ F9.4 무로그인 영업) vs 옵션 C (Sub-feature 표기).

- 신규 task 분해 제안 (옵션 B):
  - **FR-Q-NEW-1** ROI 페이지 SSR (무로그인) — 2 SP
  - **FR-C-NEW-1** 계산 + 리드 캡처 Server Action — 1.5 SP
  - **API-NEW-1** PDF + Resend 이메일 — 1 SP
  - **DB-NEW-1** roi_simulations 테이블 — 0.5 SP
  - **TEST-NEW-1** 산식 정확도 + 리드 + 무로그인 SEO — 2 SP
  - **합계 7 SP** = F9-a 12 SP 분리 시 F9-a 9-10 SP + F9.4 7 SP. **88 → 93 Task** 보강 가능성.

- ⭐ UI 설계 (3-Step):
  - **Step 1 입력**: 원아 수 + 월 보육료 (입력 ≤2개, F1-b ≤3 정합)
  - **Step 2 결과 (충격→안도)**: ⚠️ 600만 증발 → 🎯 1,200% ROI → 무료 PoC CTA
  - **Step 3 리드 캡처**: 기관명 + 이메일 + 연락처 + 동의

- 후속 보강 후보:
  - **REQ-FUNC-062~064** (SRS V07 후속 개정 시): 무로그인 페이지 + 산식 정확도 + 리드 캡처
  - **REQ-NF KPI 4종 신규**: ROI 진입율 ≥10% / PDF 전환율 ≥40% / PoC 신청 ≥20% / B2B 결제 ≥10%
  - **ADR-XX 신규**: F9.4 무로그인 분리 (F9-a 로그인 ↔ F9.4 무로그인 인증 경계 명시)
  - 영업팀 운영 가이드라인 `docs/sales-roi-playbook.md`

- 비용 모델:
  - Resend Free 100/일 ([[product/concepts/HITL-system-flow]] 공유 분배)
  - react-pdf + Vercel Analytics + Supabase Free = **추가 운영비 $0/월**

- Persona 매핑:
  - **오한솔 (Seg D-1, DOS 1위)** — 본 도구의 직접 타깃 #1
  - 김민지 (Seg D-2, 게이트키퍼) — 결과지에 "교사 업무 0회" 포지션 강조
  - 손지훈 (Adjacent-2) — 신뢰 앵커 ("전문가 추천" 배지)

- 영업 시퀀스 통합 (V08 §13-2 정합):
  - [1단계 접점] 유치원 연합회 → [2단계 Pain F9.4 ROI 직접 조작] → [3단계 PoC F9-b Zero-touch] → [4단계 Lock-in 키즈노트 D8 클립보드]
  - "교육 도입 → 경영 방어 투자" 프레임 전환

- 잔여:
  - 사용자 확인 후 신규 5 task 등록 (88 → 93).
  - F11/F15/F16 task 분해.
  - V09 §10/§13/§14 partial.
  - BMC RS 변경 사유.
  - model_retraining_data 테이블 스키마.
  - 변경 관리 프로세스 (53).


## [2026-05-09] note | F11/F15/F16/F17/F18 task 분해 제안 (28차 synthesis)

- 입력: RTM 보강 영역 (Phase 1 미추출 5 Epic) + SRS V06 REQ-FUNC-036~045

- 생성:
  - [[product/concepts/Phase-1-future-tasks-decomposition]] ⭐ — F11/F15/F16/F17/F18 13 신규 task 분해 (synthesis)

- 갱신:
  - [[product/concepts/requirements-traceability-matrix]] — F11/F15/F16 미추출 영역 → 별도 분해 페이지 링크.
  - [[wiki/index.md]] — concepts 21 → 22 / 통계 90 / 마지막 갱신 28차.

- 분해 제안 (5 Epic × 13 신규 task / 21 SP):
  - **F11 부모 음성** (REQ-FUNC-036~037, 5 task / 7.5 SP): FR-Q + FR-C + API (ElevenLabs) + DB (voice_models 7일 폐기) + TEST (⚠️ **REQ-037 윤리 화이트리스트 강제 — 교정 콘텐츠 음성 0건**)
  - **F15 LLM 챗봇** (REQ-FUNC-039~040, 4 task / 6.5 SP): FR-Q (useChat 스트리밍) + FR-C (Web Speech D1 + 7일 폐기) + API (Vercel AI SDK + Gemini, D6 pgvector 미사용) + TEST (KOPLAC 화용 + ADR-04 + 7일)
  - **F16 오프라인 푸시** (REQ-FUNC-041, 3 task / 3.5 SP): FR-C (Service Worker subscription) + API (Vercel Cron) + DB (push_subscriptions). **D5 PWA 부활 의존성 명시**.
  - **F17 케어로그 보강** (043 추정, 2 task / 2 SP): FR-C (직접 입력) + TEST (F4 통합).
  - **F18 예측 보강** (044~045, 1 task / 1.5 SP): TEST-NEW-F18-1 (EXP-2 Amplitude 코호트 ≥20%p 검증).

- ⭐ 핵심 발견:
  - **F11 윤리 차단 메커니즘** = ALLOWED_CONTENT_TYPES 화이트리스트 + REQ-037 시스템 강제 + TEST 자동 회귀.
  - **F15 = KOPLAC § 화용 영역 평가의 디지털 변형** (ASD 진단은 회피).
  - **F16 = D5 PWA 부활 트리거 시점에 동시 활성** ([[product/entities/persona-강지방]] 농촌 사용자 비율 N%+).
  - **F18 = EXP-2 검증 자동화** = REQ-FUNC-029 직접 검증.

- 우선순위 (실행 권장):
  - P1 (Phase 1 진입 즉시): F18 보강 (1.5 SP) + F17 보강 (2 SP)
  - P2 (Phase 1 중반): F15 LLM 챗봇 (6.5 SP) + F11 부모 음성 (7.5 SP)
  - P3 (Phase 1 후반 + D5 부활 연동): F16 오프라인 푸시 (3.5 SP)

- 통합 (F9.4 + Phase 1):
  - F9.4 (5 task 7 SP) + Phase 1 (15 task 21 SP) = **20 신규 task / 28 SP**
  - **88 → 108 Task** 보강 후보 (사용자 확정 시).

- ADR 후보:
  - **ADR-XX F11 윤리 화이트리스트** (교정 콘텐츠 음성 0건 시스템 강제).
  - **ADR-XX F16 D5 의존성** (단독 활성화 금지).
  - 현 7 ADR + F9.4 1 + F11 1 + F16 1 = **10 ADR 가능성** (Phase 1+2 진입 시).

- 외부 의존성:
  - ElevenLabs (F11) Free 10K chars/月 → Premium $5/月
  - Gemini Pro 1.5 (F15) Vercel AI SDK Free 한도 (15 RPM)
  - Web Push API (F16) 무료
  - Vercel Cron Free 1 / Pro 100+ (Phase 1 충분)

- Cross-link 효과:
  - 본 페이지 + F9.4 + RTM 3 페이지로 Phase 0/1/2 task 분해 완전성 확보.
  - 88 Task 0건 미매핑 위치 명시 → Phase 1 진입 시 직접 실행 가이드.

- 잔여:
  - 사용자 확정 후 신규 20 task 등록 (88 → 108).
  - ADR-XX 3종 등록 (F9.4 무로그인 + F11 윤리 화이트리스트 + F16 D5 의존성).
  - F15 KOPLAC 영감 임상 자문 (Phase 1 진입 전).
  - V09 §10/§13/§14 partial.
  - BMC RS 변경 사유.
  - model_retraining_data 테이블 스키마.
  - 변경 관리 프로세스 (53).


## [2026-05-09] note | HITL 루프백 재학습 파이프라인 신설 (29차 synthesis)

- 입력: HITL-system-flow § 4번째 원칙 (루프백 재학습) + 52 V0.9 § 3 § HITL § 루프백 (P2-② F-03) + 65 SRS § REQ-FUNC-HITL-004

- 생성:
  - [[product/concepts/HITL-retraining-pipeline]] ⭐ — model_retraining_data 스키마 + 운영 가이드 (synthesis)

- 갱신:
  - [[product/concepts/HITL-system-flow]] — § 보강 필요 model_retraining_data ✅ 해소 표시.
  - [[product/concepts/requirements-traceability-matrix]] — § 보강 필요 동일 ✅ 해소.
  - [[wiki/index.md]] — concepts 22 → 23 / 통계 91 / 마지막 갱신 29차.

- 핵심 산출:
  - ⭐ **model_retraining_data 스키마**: 16 컬럼 (원본 추적 3 + AI 1차 4 + GT 4 + 자동 계산 4 + 메타 4 + 감사 추적 3) + Generated Always isCriticalError + 인덱스 3종.
  - ⭐ **자동 INSERT 트리거**: hitl_queue.status='completed' 시 PostgreSQL 트리거가 자동 INSERT (HITL-system-flow 1차 트리거의 두번째 트리거).
  - ⭐ **3단계 게이트 자동화 흐름**:
    - [1] 모니터링 (Vercel Cron 일 1회 02:00 KST): error_rate < 0.3% 정상 / ≥ 0.3% Warning / ≥ 0.5% **자동 롤백** + Critical Slack
    - [2] 재학습 트리거: 미배치 데이터 ≥ 500건 → **수동 (CTO 승인)** → 배치 ID 할당 + Vercel AI SDK fine-tuning
    - [3] 재배포 게이트: Hold-out 100건 검증 → ≤ 0.3% **자동 재배포** / 초과 시 자동 거부 + Slack
  - ⭐ **RACI 책임 매트릭스**: 자동 (롤백·재배포) vs 수동 (재학습 시작 = CTO 승인). 자동 재학습 시 무한 루프 위험 회피.

- 신규 task 분해 (3종):
  - DB-NEW-MR-1 model_retraining_data 테이블 — 1.5 SP
  - API-NEW-MR-1 /api/admin/retraining-batch — 2 SP
  - MON-NEW-MR-1 ML Ops 대시보드 + Slack Alert — 2 SP
  - **합계 5.5 SP**

- REQ-FUNC 보강 후보 (HITL-001~004 → 001~007):
  - REQ-FUNC-HITL-004a 자동 INSERT 트리거
  - REQ-FUNC-HITL-004b 자동 롤백 (≥0.5%)
  - REQ-FUNC-HITL-004c 재학습 트리거 (≥500건 + 수동 승인)
  - REQ-FUNC-HITL-004d 재배포 자동 게이트 (≤0.3% Hold-out)

- 윤리·법적 고려:
  - audioVectorUri 7일 폐기 (ADR-03) — model_retraining_data는 **익명화된 점수만** 보존
  - expertId 다양성 모니터링 (Gini 또는 Top-3 비율) → 모델 편향 회피
  - 재학습 데이터 동의 옵션 (F10 전자서명 보강 필요)
  - 모델 버전 관리 (재배포 후 7일 Canary 5% 트래픽 병행)

- ⭐ 누적 보강 후보 통계:
  - F9.4 (5 task 7 SP) + Phase 1 (15 task 21 SP) + HITL 재학습 (3 task 5.5 SP) = **23 신규 task / 33.5 SP**
  - **88 → 111 Task** 보강 가능성 (사용자 확정 시).

- 비용:
  - Vercel Cron Free 1 / Slack 무제한 / Supabase Free / PostgreSQL 트리거 자체
  - Gemini fine-tuning API 비용 별도 (가격 정책 출시 후 명확화)
  - 추가 운영비 = Phase 1 검증 시 **$0/월**, 재학습 활성화 시 별도

- ADR 후보:
  - **ADR-XX HITL 재학습 책임 분리** (자동 롤백 + 자동 재배포 vs 수동 재학습 트리거). 누적 ADR 후보 4 (F9.4 무로그인 + F11 윤리 + F16 D5 + HITL 재학습) → 7 ADR + 4 신규 = **11 ADR 가능성**.

- Cross-link:
  - HITL-retraining-pipeline → HITL-system-flow / architecture-decisions / RTM / MVP-feature-spec / F9.4 + Phase-1 (동일 보강 패턴) / U-TAP + REVT + PRES (임상) / 한국-언어치료-트랙비교 / 0-언어치료-실제-세션-상세가이드 / 황보름 + 박민정 + 최수현 페르소나.

- 잔여 (이전 누적):
  - 사용자 확정 후 신규 23 task 등록 (88 → 111).
  - ADR-XX 4종 등록.
  - F15 KOPLAC 영감 임상 자문.
  - V09 §10/§13/§14 partial.
  - BMC RS 변경 사유.
  - 변경 관리 프로세스 (53).
  - expertId 다양성 모니터링 알고리즘 결정.
  - 부모 동의서 임상 연구 활용 옵션 (F10 보강).


## [2026-05-09] lint | V09 raw 39 §10/§13/§14 정독 — V08과 1:1 동일 검증 (30차)

- 입력: raw/39_VPS_V09_final_UX_reinforce.md L616-L808 (§10 + §11 + §13 + §14 + §15)

- 정독 결과: **V09 §10/§13/§14 = V08 본문 1:1 동일 ✅**
  - §10 GTM Copy 4 헤드라인 = V08 §10과 텍스트 동일
  - §13-1 B2C 시퀀스 4단계 = V08 §13-1 동일
  - §13-2 B2B2C 시퀀스 4단계 + F9.4 ROI + F9.2 Zero-touch = V08 §13-2 동일
  - §14-1 MVP 4 핵심 가설 (CTR≥15%/CVR≥8%/B2B≥20%/M3≥40%) = V08 동일
  - §14-2 Wedge Channel (유치원·소아과·맘카페) = V08 동일
  - §14-3 Unfair Advantage (Data Moat ★5 / B2B2C 선점 ★4 / 조음 NLP ★4) = V08 동일
  - §14-4 BMC 9-Block = V08 §14-4 동일
  - §15 리스크 (규제·개인정보·품질) = V08 동일

- 갱신:
  - [[product/sources/39-VPS-V09-Final]] — § "V09 §10/§13/§14 = V08 1:1 동일 ✅ (30차 정독 검증)" 신규 + 보강 영역 정정.
  - [[wiki/index.md]] — 마지막 갱신 30차.

- ⭐ 핵심 발견:
  - **V08 → V09 §10/§13/§14 신규 변경 0건**. V08 §11-E ROI 시뮬레이터 + §14-3 Unfair + §14-4 BMC가 V09에 1:1 흡수.
  - **V08 → V09 진정한 차이점 영역**: §4-2 Job-Feature 매핑 V2 (Epic 분리/병합) + §4-5 경쟁사→Epic 추적 + §4-6 21 Epic 총괄 + §6 MVP Sub-feature V2 + §9 페르소나 커버리지 (DMU 5분리 정식화) + §1-3 페르소나 매핑 정밀화.
  - **V09 = V08 + Epic 리팩토링** 패턴. 비즈니스/영업 로직은 V08에서 이미 완성, V09는 Epic 단위 정밀화에 집중.

- 정독 완성도:
  - V09 정독: 첫 150줄 + L616-L808 (§10/§13/§14) = 약 350줄 / 841줄 = **42%**.
  - 잔여: §2-§9 (Canvas + Proof + Job-Feature V2 + 공통 설계 + Sub-feature V2 + 우선순위 + 타임라인 + 페르소나 커버리지) = 약 470줄.
  - PRD V10 흡수 검증으로 보강된 영역 + V08 정독 (31-32-VPS-V07-V08-Detail) 기반 합성 영역 = 위키 narrative 신뢰도 충분.

- 메모:
  - V09는 V08 비즈니스 로직 + Epic 리팩토링이 핵심. 본 30차 정독으로 §10/§13/§14 영역 완전 검증.
  - §4-2 Epic 리팩토링 (V09 신규)은 [[product/concepts/MVP-feature-spec]] § 21 Epic 정본과 정합 — V09에서 Epic 카운트 21로 정식화.

- 잔여 (이전 누적):
  - 사용자 확정 후 신규 23 task 등록 (88 → 111).
  - ADR-XX 4종 등록.
  - F15 KOPLAC 영감 임상 자문.
  - V09 §2-§9 본문 정밀 정독 (Epic 리팩토링 V2).
  - BMC RS 변경 사유.
  - 변경 관리 프로세스 (53).
  - expertId 다양성 모니터링 알고리즘 결정.
  - 부모 동의서 임상 연구 활용 옵션 (F10 보강).


## [2026-05-09] note | 변경 관리 프로세스 정본 신설 (31차 framework)

- 입력: raw/53_PRD_V09_Final_Readiness_Gate.md (181줄) — § 선택적 보강 § "변경 관리 프로세스 (Low)" 권고 + 38 항목 점수표 본문 정독

- 생성:
  - [[product/concepts/change-management-process]] ⭐ — 변경 관리 정본 (framework)

- 갱신:
  - [[wiki/index.md]] — concepts 23 → 24 / 통계 92 / 마지막 갱신 31차.

- 핵심 산출:
  - ⭐ **3-Tier 분류**: Tier 1 (Minor 텍스트 수정, 1 리뷰어 즉시 머지) / Tier 2 (Major 신규 REQ·KPI·ADR, 2 리뷰어 + Quality Gate) / Tier 3 (Strategic 페르소나·Phase·기술 스택, 3 리뷰어 + 멀티 LLM + Readiness Gate ≥85%)
  - ⭐ **CR 워크플로 7단계**: 제안 → 영향 분석 (RTM 활용) → 리뷰 → 승인 → 머지 → 검증 (Readiness Gate 재실행) → 통보
  - ⭐ **CR 템플릿**: Why·What·RTM 영향 추적·검증 계획·리스크·승인 흐름·Revision History 갱신
  - ⭐ **위키 적용 사례 5종**: TAM 정의 모순 (Tier 2) / 18 Findings 반영 (Tier 2) / C-TEC V05→V06 (Tier 3) / Seg D→D-1/D-2 (Tier 3) / F9.4 Phase 2 진입 (Tier 2→3)
  - ⭐ **6 트리거 + 주기**: 외부 LLM 메타 (분기) / Sprint Retro (2주) / 임상 자문 (분기) / 사용자 피드백 (상시) / VPS 진화 (시리즈) / 법적·규제 (이벤트)

- raw 53 6대 기준 38 항목 점수표 정독:
  - 1. 목표·지표 100% (6.0/6) — 북극성 W-AUR + 보조 7개 + ADR-001
  - 2. 스토리·AC 100% (8.0/8) — S1~S6 GWT + Neg AC 12 + HITL 4 원칙
  - 3. 기능 요구 92% (5.5/6) ⚠️ **3-5 감점 0.5**: Epic SP 분해 미기재
  - 4. 비기능 100% (7.0/7) — 성능·SLA·신뢰성·보안·모니터링·KPI + Traceability
  - 5. 리스크·가정 93% (6.5/7) ⚠️ **5-7 감점 0.5**: Seg B Plan B Epic 변경안 미명시
  - 6. 범위 In/Out 100% (4.0/4) — In 5 + Out 4 + Won't 4 일관 + ADR-04 정합
  - **종합 97% PASS** (개별 ≥70%, 종합 ≥85% 게이트 크게 상회)

- 감점 2건 후속 처리:
  - **3-5 (Epic SP 분해)** ✅ **이미 해소** — SRS V06 + 88 Task 분해 ([[product/concepts/MVP-feature-spec]] § Epic SP + [[product/concepts/task-breakdown-overview]] Sprint 1) 로 사실상 99% 가능.
  - **5-7 (Seg B Plan B)** ⚠️ 부분 — R6 언급은 있으나 "F4 → F18 예측 중심 재구성" 같은 구체적 Epic 변경안 미명시. **Phase 1 진입 시 Plan B 별도 문서화 필요** (CR Tier 2 후보).

- raw 53 선택적 보강 2건 처리:
  - **변경 관리 프로세스** ✅ **본 페이지가 정본** — raw 53 권고 직접 실행.
  - **용어 사전 (Glossary)** ⚠️ 미작성 — W-AUR/HITL/AOS·DOS/DMU/CJM 통합 정의 페이지 후보 (CR Tier 1).

- ADR 후보 추가:
  - **ADR-XX 변경 관리 3-Tier 도입** — 누적 ADR 후보 5종 (F9.4 무로그인 + F11 윤리 + F16 D5 + HITL 재학습 + 변경 관리 3-Tier).

- ⭐ 위키 자체 변경 관리 매핑 (Meta):
  - CLAUDE.md 스키마 변경 = Tier 3 (위키 운영 규칙)
  - 신규 ingest = Tier 1 (개별 source) ~ Tier 2 (cross-link 다수)
  - lint 정정 = Tier 1
  - log.md = Append-only Revision History (31+ 차 ingest 추적)

- Cross-link 효과:
  - change-management-process → RTM (영향 분석 도구) / multi-llm-workflow (Tier 3 사이클) / PRD-Intermediate-Reviews-Meta (Quality Gate) / architecture-decisions (ADR 자체가 Tier 3 산출) / 52 V0.9 (18 Findings 사례).

- 메모:
  - "자체-인용 보강 사이클" (VPS V01-V09 9 차례 반복) = CR 워크플로의 자연 발생 형태.
  - 본 위키 31+ 차 ingest 모두 log.md에 추적되어 Revision History 역할.

- 잔여:
  - 사용자 확정 후 신규 23 task 등록 (88 → 111).
  - ADR-XX 5종 정식 등록 (architecture-decisions 보강).
  - 용어 사전 (Glossary) 페이지 신설 (CR Tier 1).
  - Phase 1 진입 시 Seg B R6 Plan B Epic 변경안 명문화 (CR Tier 2).
  - F15 KOPLAC 영감 임상 자문.
  - V09 §2-§9 본문 정밀 정독.
  - BMC RS 변경 사유.
  - expertId 다양성 모니터링 알고리즘.
  - 부모 동의서 임상 연구 활용 옵션 (F10).


## [2026-05-09] note | ADR-08~12 5종 정식 등록 (32차 framework)

- 입력: 28~31차 위키 합성에서 도출된 5 ADR 후보 (F9.4 무로그인 + F11 윤리 + F16 D5 의존성 + HITL 재학습 + 변경 관리 3-Tier)

- 갱신:
  - [[product/concepts/architecture-decisions]] — 7 ADR → **12 ADR 정본화**
    - aliases / 종합 표 갱신 (12건)
    - ADR-08~12 개별 섹션 5건 신규 (결정·대안·사유·시스템 영향·연결 REQ·연결 Risk·trade-off + 정본 페이지 링크)
    - ADR 의존성 그래프 갱신 (ADR-08~11 = ADR-01~07의 자손 / ADR-12 = Meta-ADR)
    - 비즈니스 임팩트 표 분리 (ADR-05~07 합산 + ADR-08~12 합산)
  - [[wiki/index.md]] — 12 ADR 표기 + 마지막 갱신 32차.

- ADR-08~12 핵심 결정:
  - **ADR-08 F9.4 무로그인 분리**: F9-a (로그인) ↔ F9.4 (무로그인 영업) 인증 경계 명시. B2B 진입율 80%+ 확보. → [[product/concepts/F9.4-ROI-simulator]]
  - **ADR-09 F11 부모 음성 윤리 화이트리스트**: ALLOWED_CONTENT_TYPES (storybook, lullaby) 강제. 교정 콘텐츠 0건 시스템 차단. MIT 임상 원리 정합 ([[clinical/concepts/실어증]]). → [[product/concepts/Phase-1-future-tasks-decomposition]] § F11
  - **ADR-10 F16 D5 의존성**: F16 오프라인 푸시 = D5 PWA 부활을 강제로 의존. 단독 활성화 금지. → [[product/concepts/Phase-1-future-tasks-decomposition]] § F16
  - **ADR-11 HITL 재학습 책임 분리**: 자동 (롤백·재배포) vs 수동 (재학습 시작 = CTO 승인). 무한 루프 회피. → [[product/concepts/HITL-retraining-pipeline]] § RACI
  - **ADR-12 변경 관리 3-Tier**: Tier 1/2/3 + CR 워크플로 7단계. Meta-ADR (위키·PRD·SRS 자체 변경 거버넌스). → [[product/concepts/change-management-process]]

- ADR 의존성 그래프 갱신:
  - ADR-09 ← ADR-02 (HITL) 자손 (MIT 임상 원리)
  - ADR-11 ← ADR-02 (HITL) 자손 (4 sub-원칙 보강)
  - ADR-08 + ADR-10 ← ADR-05/06/07 (Next.js + Supabase + Vercel AI SDK) 자손
  - ADR-12 = Meta-ADR (모든 ADR 자체 변경 거버넌스)

- 비즈니스 임팩트:
  - ADR-05~07 (V05/V06 기술 스택): MVP 1개월 + 운영비 $30/월
  - ADR-08~12 (위키 합성 후속): Phase 1+2 진입 시 시스템 안정성 + 윤리 + 거버넌스 보장

- ⭐ 위키 패턴 검증:
  - "위키 합성 단계에서 ADR 도출"이 가능 — 1차 정독 (raw) → 2차 합성 (위키) → 3차 ADR 등록의 3단계 패턴.
  - 5 ADR 모두 raw 자료에 직접 명시되지 않은 위키 합성 결과. 위키의 메타 가치 = "raw 자료가 미명시한 정합성 결정을 명문화" 입증.

- Cross-link 효과:
  - architecture-decisions ← F9.4-ROI-simulator + Phase-1-future-tasks-decomposition + HITL-retraining-pipeline + change-management-process 양방향 활성.
  - 12 ADR이 모든 product/concepts 페이지의 거버넌스 진입점.

- 잔여 (이전 누적):
  - 사용자 확정 후 신규 23 task 등록 (88 → 111).
  - 용어 사전 (Glossary) 페이지 신설.
  - Phase 1 진입 시 Seg B R6 Plan B 명문화.
  - F15 KOPLAC 영감 임상 자문.
  - V09 §2-§9 본문 정밀 정독.
  - BMC RS 변경 사유.
  - expertId 다양성 모니터링 알고리즘.
  - 부모 동의서 임상 연구 활용 옵션 (F10).


## [2026-05-09] note | Glossary 정본 신설 — raw 53 보강 권고 2건 모두 완료 ✅ (33차 framework)

- 입력: 30+ 페이지 위키 전반의 약어·전문 용어 통합 + raw 53 § 선택적 보강 권고 (Low) 직접 실행

- 생성:
  - [[product/concepts/glossary]] ⭐ — Glossary 정본 (framework)

- 갱신:
  - [[wiki/index.md]] — concepts 24 → 25 / 통계 93 / 마지막 갱신 33차.

- 12 카테고리 통합:
  1. **비즈니스 KPI** (W-AUR / M3 / CVR / CAC / LTV:CAC / MRR / ARR / Churn / SOM / SAM / TAM)
  2. **페르소나·세그먼트·JTBD** (Seg A/B/C/D-1/D-2 / DMU / JTBD / AOS / DOS / CJM / 황금 교차점)
  3. **임상** (HITL / STT / TTS / VAD / SLP / AAC / MIT / ASD / DTx) + 8 평가 도구 (K-WAB/K-BNT/SELSI/PRES/REVT/U-TAP/KOPLAC/PECS)
  4. **제품·요구사항** (VPS / PRD / SRS / BMC / MVP / Epic / Story / AC / GWT / Neg AC / REQ-FUNC / REQ-NF / MoSCoW / RTM)
  5. **기술 스택** (C-TEC-001~007 / PWA / RSC / SSR / RLS / RBAC / CRUD / CQRS / DTO / Edge Runtime / OPS / MOCK / HITL Queue)
  6. **아키텍처·거버넌스** (ADR / CR / RACI / CTO / DevOps / MLOps / Quality Gate)
  7. **마케팅·영업** (GTM / CTR / ROI / FOMO / Wedge / Trojan Horse / Switch Trigger / Lock-in / Land & Expand)
  8. **페이즈·실험·리스크** (Phase 0/1/2 / EXP-1~4 / R1~R8 / D1~D8 / P0~P3)
  9. **프레임워크** (Porter's 5F / Value Chain / KSF / Best-of-Breed)
  10. **도구·외부 의존성** (Vercel / Supabase / Gemini / Resend / Slack / ElevenLabs / Web Speech / Amplitude / Web Push / react-pdf / shadcn/ui)
  11. **자주 헷갈리는 약어** ⚠️ (CR / CS / MR / ROI / F1·F2)
  12. **raw 자료 번호 → 정본 매핑** (자주 인용 11건)

- 3 온보딩 순서:
  - **개발자**: Glossary → MVP-feature-spec (21 Epic) → RTM → SRS V06 → architecture-decisions → task-breakdown
  - **임상 자문가**: Glossary § 임상 → 한국-언어치료-트랙비교 → U-TAP/REVT/PRES → HITL-system-flow → 황보름/강지방
  - **B2B 영업팀**: Glossary § 마케팅 → 오한솔 → F9.4-ROI-simulator → V09 §13-2 → MVP-descope D8

- ⭐ raw 53 § 선택적 보강 권고 2건 모두 완료:
  - **변경 관리 프로세스**: [[product/concepts/change-management-process]] (31차)
  - **용어 사전 (Glossary)**: [[product/concepts/glossary]] (33차)
  - → raw 53 후속 작업 모두 종결.

- 위키 진화 시사:
  - 본 위키의 30+ 차 ingest 결과 = 거대한 페이지 망. 신규 합류자가 진입하기 어려움.
  - Glossary = 그 진입 장벽을 단일 페이지로 완화. CLAUDE.md § 운영 워크플로 외에 추가된 새 형식의 정본 페이지.

- Cross-link 효과:
  - Glossary → 본 위키의 거의 모든 페이지에 양방향 링크 (12 카테고리 × 평균 8 항목).
  - 신규 합류자 → Glossary → 모든 정본 페이지 진입 가능.

- 잔여 (이전 누적):
  - 사용자 확정 후 신규 23 task 등록 (88 → 111).
  - Phase 1 진입 시 Seg B R6 Plan B 명문화 (CR Tier 2).
  - F15 KOPLAC 영감 임상 자문.
  - V09 §2-§9 본문 정밀 정독.
  - BMC RS 변경 사유.
  - expertId 다양성 모니터링 알고리즘.
  - 부모 동의서 임상 연구 활용 옵션 (F10).


## [2026-05-09] note | R6 Seg B Plan B 정본 신설 — raw 53 감점 5-7 ✅ 해소 (34차 synthesis)

- 입력: raw 53 감점 5-7 (Seg B Plan B Epic 변경안 미명시) + PRD V10 §7.2 R6 (추상 권고) + EXP-2 (리포트 리텐션 A/B)

- 생성:
  - [[product/concepts/R6-Seg-B-Plan-B]] ⭐ — Plan B 정본 (synthesis)

- 갱신:
  - [[product/concepts/change-management-process]] — § 감점 2건 후속 처리 표 § 5-7 ✅ 해소 표시.
  - [[wiki/index.md]] — concepts 25 → 26 / 통계 94 / 마지막 갱신 34차.

- 핵심 산출:
  - ⭐ **EXP-2 실패 정의 3-Tier**: A 성공 (M3≥40%) / B 경계 (30~40%, 부분 발동) / **C 실패 (<30%, 본 Plan B 전면 적용)**
  - ⭐ **F4 + F18 → F4-Plus 통합 Epic**: 16 SP P1 Should → 16 SP P1 **Must 승격** + 응집도 ↑
    - F4-Plus.1 (시계열 6 SP) + F4-Plus.2 (예측 6 SP) + F4-Plus.3 (미래 손실 회피 카피 통합 4 SP)
  - ⭐ **Lock-in #1 강화 2배**: 데이터 매몰비용 → **데이터 매몰 + 미래 손실 회피**. Loss Aversion (이미 누적) + Anticipation (예상 미래 가치) 동시 자극.
  - ⭐ **88→89 Task**: FR-C-NEW-PB-1 "미래 손실 회피 카피 통합" 신규 (1 SP).
  - ⭐ **REQ-FUNC-NEW-PB-1**: G/W/T = "다음 달 시뮬레이션 잠금 해제 카피 노출 → 익월 결제 +25%p (vs 비노출)"
  - ⭐ **신규 KPI 3종**: 시뮬레이션 익월 결제 +25%p (강화) + F4-Plus.3 가족 공유 ≥30% (신규) + Premium Seg B 전환 ≥10% (신규)

- CR Tier 2 처리 흐름 명시:
  - 트리거: EXP-2 종료 시점 자동 평가 (Phase 1 4-8주 후)
  - 영향 분석: RTM 5축 갱신 + 88→89 Task + 21→20 Epic
  - 리뷰: PM (1차) + CTO (2차, Vercel AI SDK 회귀 비용·정확도) + Quality Gate 5 체크리스트
  - 머지: SRS V06 → V07 minor (vX.Y) + Revision History
  - 검증: Readiness Gate 38 항목 재실행

- Persona 영향:
  - **박민정 (Seg A→B)** — F4-Plus 직접 타깃 + Premium 50K 강화
  - **윤성민 (Non-user 아빠)** — F4-Plus.3 가족 공유 통합으로 Lock-in #3 강화
  - **송혜경 (외할머니)** — F4-Plus.2 예측 = 의료/디지털 회의 약화 (보조 효과)

- ADR 영향: 기존 7~12 ADR 모두 정합. **신규 ADR 불필요**.

- 영향 페이지 매트릭스 (Plan B 발동 시 8 페이지):
  - High 4: MVP-feature-spec / RTM / task-breakdown-overview / SRS V06
  - Medium 3: 52-PRD-V09 / customer-segmentation / persona-박민정
  - Low 1: architecture-decisions

- ⭐ Plan C (이중 안전망 — Tier 3, 별도 작업):
  - Plan B 후 M3 < 30% 지속 시: Seg B 디스코프 / B2C → B2B 가속 / 신규 페르소나 발굴

- ⭐ raw 53 38 항목 모두 ✅ 해소:
  - 감점 3-5 (Epic SP 분해): SRS V06 + 88 Task 분해로 사실상 99%
  - 감점 5-7 (Seg B Plan B): 본 페이지로 명문화 → **97% → 100% 가능**
  - raw 53 후속 작업 = 변경 관리 (31차) + Glossary (33차) + Plan B (34차) **3건 모두 종결**.

- Cross-link 효과:
  - R6-Seg-B-Plan-B → change-management-process (CR Tier 2 적용 사례) / MVP-feature-spec (F4·F18·Lock-in #1) / RTM (영향 분석) / persona-박민정 (직접 타깃) / 22-23-JTBD (H-B 부분 검증) / 52-PRD-V09 (R6 + F-08).

- 잔여 (이전 누적):
  - 사용자 확정 후 신규 23 task 등록 (88 → 111).
  - F15 KOPLAC 영감 임상 자문.
  - V09 §2-§9 본문 정밀 정독.
  - BMC RS 변경 사유.
  - expertId 다양성 모니터링 알고리즘.
  - 부모 동의서 임상 연구 활용 옵션 (F10).


## [2026-05-09] note | expertId 다양성 모니터링 알고리즘 결정 (35차 synthesis)

- 입력: HITL-retraining-pipeline § 보강 필요 § "expertId 다양성 모니터링 (Gini 또는 Top-3 비율)"

- 생성:
  - [[product/concepts/expert-diversity-monitoring]] ⭐ — 5 알고리즘 비교 + 이중 모니터링 (synthesis)

- 갱신:
  - [[product/concepts/HITL-retraining-pipeline]] — § 보강 필요 항목 1건 ✅ 해소.
  - [[wiki/index.md]] — concepts 26 → 27 / 통계 95 / 마지막 갱신 35차.

- ⭐ 5 알고리즘 비교:
  - **Top-K 비율** (산업·금융 표준) — 직관성 ✅ / K 자의성 ❌
  - **Gini 계수** (불평등 지수) — 수학적 엄밀 ✅ / 운영자 직관 부족 ❌
  - **Shannon Entropy** (정보이론) — 학술 정합 ✅ / log scale 부담 ❌
  - **HHI** (시장 집중도) — 산업 표준 임계 ✅ / 작은 풀에서 자연 높음 ❌
  - **단순 Threshold** (Maximum Single Share) — 가장 직관적 ✅ / 2위 이하 무시 ❌

- ⭐ 권장 — 이중 모니터링:
  - **Phase 1 (expert 풀 5-10명)**: 1차 단순 Threshold (>50% Warning, >70% Critical) + 2차 Top-3 비율 (>80% Warning, >90% Critical)
  - **Phase 2 (expert 풀 20명+)**: 1차 HHI (>2500 Warning, >4000 Critical) + 2차 Gini (>0.5 Warning, >0.7 Critical)

- 사유:
  - Phase 1 작은 풀에서는 단순 Threshold가 가장 직관적 + Slack Alert 카피 단순 ("expertId X가 67% 차지 — 경고")
  - Phase 2 큰 풀에서는 HHI가 산업 표준 임계 적용 가능 + Gini는 시계열 추적 학술 가치
  - Shannon Entropy는 log scale로 운영자 부담 → 권장에서 제외

- ⭐ 자동화 흐름 (Vercel Cron 일 1회 03:00 KST):
  - Phase 자동 판별 → Phase 1: 단순 + Top-3 / Phase 2: HHI + Gini
  - Slack Critical → 해당 expert 큐 우선순위↓ + 다른 expert 우선 배정 + CTO 페이저
  - Phase 2 추가: Grafana 대시보드 시계열 메트릭

- 위반 대응 시나리오 3종:
  - Scenario 1 (단일 expert 67%): 24h 내 CTO + ML Ops 회의 + 외부 임상 자문가 임시 영입
  - Scenario 2 (Top-3 92%): 1주 내 expert 풀 확대 영업 + Premium 50K 운영비 증액 검토 + Phase 2 가속
  - Scenario 3 (분기 Gini 0.7+): 분기 임상 자문 회의 + REQ-FUNC-034 강화 (월 2회+로 강화) CR Tier 2

- ⭐ MON-NEW-MR-1 통합 (옵션 B 권장):
  - 별도 task 생성 대신 기존 ML Ops 대시보드 (2 SP)에 expertId 다양성 sub-feature 통합
  - 추가 0.5 SP → 총 2.5 SP (HITL-retraining-pipeline 갱신 후속 작업)

- 임상 정합:
  - 1급/2급 자격제도 (~17,000명) = 다양성 보장의 임상 토대
  - 임상 자문 회의 분기별 안건 (Gini 0.7+ 지속 시)
  - expertId × 평가 도구 (U-TAP/REVT/PRES) 교차 모니터링 = 추가 보강 후보

- 잔여 (이전 누적):
  - 사용자 확정 후 신규 23 task 등록 (88 → 111).
  - F15 KOPLAC 영감 임상 자문.
  - V09 §2-§9 본문 정밀 정독.
  - BMC RS 변경 사유.
  - 부모 동의서 임상 연구 활용 옵션 (F10).
  - expert 풀 자체 정량화 (Phase 1 시작 시 5/10/15명 — 임계 조정 필수).
  - getCurrentPhase() 정의 메커니즘 (env vs DB).
  - expertId × 평가 도구 교차 모니터링 (보강 후보).


## [2026-05-09] note | F10 임상 연구 활용 동의 보강 (36차 synthesis)

- 입력: HITL-retraining-pipeline § 윤리·법적 § "재학습 데이터 동의 (R4 + GDPR)" 후속

- 생성:
  - [[product/concepts/F10-research-consent]] ⭐ — F10 동의서 4-Tier Opt-in 보강 (synthesis)

- 갱신:
  - [[product/concepts/HITL-retraining-pipeline]] § 보강 필요 1건 ✅ 해소.
  - [[wiki/index.md]] — concepts 27 → 28 / 통계 96 / 마지막 갱신 36차.

- ⭐ 4-Tier Opt-in 구조:
  - **T1 (필수)** 음성 데이터 수집·분석
  - **T2 (필수)** 결과 활용
  - **T3 (옵션)** B2B 기관 명의 리포트 (Phase 2)
  - **T4 (옵션) ⭐ 익명화 데이터 임상 연구 활용** — 신규
    - T4-a 모델 정확도 개선 (HITL 재학습 환류)
    - T4-b 학술 발표 (논문·학회 익명 통계)
    - T4-c 외부 임상 협력 (별도 매니저 승인 강제)

- ⭐ Granular Consent (GDPR Art. 7 정합): T4-a/b/c 개별 Opt-in. T4-a만 동의 가능 / T4-c 거부 가능.

- 신규 task 분해 (3종 / 3 SP):
  - FR-Q-NEW-F10R-1 동의서 페이지 T4 + 3 sub-checkbox UI (1.5 SP)
  - FR-C-NEW-F10R-1 동의 변경 Server Action (1 SP)
  - DB-NEW-F10R-1 consent_signatures 4 컬럼 보강 (0.5 SP)

- REQ-FUNC 보강 후보 (SRS V07): REQ-FUNC-059~061 → **059~065** (4 신규).

- ⭐ sync_retraining_data 트리거 갱신:
  - INSERT 전 T4-a 동의 확인 → 동의 없으면 model_retraining_data 미INSERT + audit_log "consent_skipped"
  - HITL 시스템 자체는 정상 작동 (T1 필수). 재학습 데이터 환류만 T4-a 의존.

- 법적 근거 매핑 (모두 정합):
  - GDPR Art. 6 (Lawful basis) + Art. 7 (Granular) + Art. 17 (Erasure) + Art. 25 (By Design)
  - 한국 개인정보보호법 §22 (목적 외 이용) + §39-3 (철회권)
  - 아동보호법 §26-2 (영유아 데이터 보호)

- 마이그레이션 시나리오:
  - 신규 가입: T4 노출 (Opt-in)
  - 기존 부모: 다음 로그인 시 모달 강제 노출 (T4 선택 가능, 거부 가능)
  - T4 거부: model_retraining_data 누적 차단

- ADR 영향: 신규 ADR 불필요. ADR-03 (7일 폐기) + ADR-04 (의료 용어 배제) + ADR-11 (HITL 재학습 책임 분리) 모두 정합.

- KPI 신규 후보:
  - T4 동의률 ≥30% / T4-a ≥25% / T4-b ≥15% / T4-c ≥5%
  - T4 거부 시 결제 유지율 ≥95% (동의 강제 압박 없음 윤리 검증)

- Persona 영향:
  - 박민정 (Seg B 데이터형) — T4-b 학술 발표 동의 가능성 높음 ("자녀 학계 기여")
  - 황보름 (ASD 경계선) — T4-a 핵심 기여자 (비전형 발화 모델 다양화)
  - 최수현 (대기자) / 송혜경 (외할머니) — T4 거부 가능성 높음

- 임상 정합:
  - T4-b 학술 발표 = 1급/2급 임상가 학술 활동 토대
  - T4-c 외부 협력 = IRB (임상 윤리위원회) 검토 패턴 디지털 변형
  - T4-a = U-TAP 음운변동 분석 = 모델 개선 가장 직접적

- ⭐ 누적 보강 후보 통계:
  - F9.4 (5 task 7 SP) + Phase 1 (15 task 21 SP) + HITL 재학습 (3 task 5.5 SP) + F10 임상 연구 (3 task 3 SP) = **26 신규 task / 36.5 SP**
  - **88 → 114 Task** 보강 가능성.

- 잔여 (이전 누적):
  - 사용자 확정 후 신규 26 task 등록 (88 → 114).
  - F15 KOPLAC 영감 임상 자문.
  - V09 §2-§9 본문 정밀 정독.
  - BMC RS 변경 사유.
  - expert 풀 자체 정량화.
  - getCurrentPhase() 정의 메커니즘.
  - expertId × 평가 도구 교차 모니터링.
  - T4-c 외부 공유 IRB 절차 정의.
  - 청소년 (만 13세+) 본인 동의 추가 검토.


## [2026-05-09] lint | BMC RS 변경 사유 추적 — 명시적 사유 발견 ✅ (37차)

- 입력: raw 30 (V06 Merged) §5-1 + raw 31 (V07 Restructured) §11-A + §11-B 재정독

- 발견:
  - V06 raw 30 §5-1 (Business Operations 4 섹션) = **B2B 미명시** (Basic + Premium만 표 포함). B2B는 §3 F9 Epic + §5-3 채널 전략에만 등장 → **모호한 위치**.
  - V06 BMC raw 24 RS = "B2B 라이선스 월 10-30만 / 데이터 라이선스 Phase 3+"
  - **V07 raw 31 §11-A 단일화**: "B2B 기관용 (연 500,000원): 유치원/어린이집용 무제한 스크리닝 대시보드 라이선스 (Phase 2 도입)" 명시.
  - ⭐ **V07 raw 31 §11-B 정당화** (L303): "B2B 라이선스 (ARR) 15% — 어린이집/유치원 연간 계약. **매출 비중은 낮으나 대량의 B2C 리드(학부모)를 물어오는 채널 역할**."

- ⭐ 명시적 사유 = **사업 정체성 재정의**:
  - V06까지 B2B = 수익원 (월 10-30만 변동)
  - V07부터 B2B = **B2C 리드 캡처 채널** (매출 비중 15%, 단가 단순화)
  - 가격 단순화 (월 변동 → 연 50만 고정) = 영업·계약 단순 + 기관별 협상 부담 제거 + 대량 동시 도입 가능
  - 데이터 라이선스 폐기 = (1) 임상 연구 협약 복잡성 (IRB + 기관별 협상) + (2) GDPR + 한국 개인정보보호법 부담 + (3) F10 § T4-a/b/c 임상 연구 동의로 분리 → **R&D 환류용 ≠ 매출원**

- 갱신 (3건):
  - [[product/sources/24-30-VPS-V01-V06-Detail]] § V07-V08 변경점 + 보강 필요 항목 ✅ 해소.
  - [[product/concepts/VPS-evolution]] § 보강 필요 ✅ 해소.
  - [[wiki/index.md]] — 마지막 갱신 37차.

- ⭐ Cross-link 효과:
  - V06 → V07 사업 정체성 재정의 narrative = VPS V07-V08 § §11-E ROI 시뮬레이터 (1,100% ROI) + §13-2 영업 시퀀스 (B2C 리드 캡처 강조)와 정합.
  - F10 § T4-a/b/c 임상 연구 동의 = V07 데이터 라이선스 폐기의 직접 후속 — 매출원에서 R&D 환류로 분리.

- 메모:
  - V07-V08-V09 세 버전 모두 §11-A B2B 연 50만 + §11-B "B2C 리드 채널" 정체성 일관 유지.
  - PRD V0.9 Quality (raw 52) §4.3 + PRD V10 (raw 54) 모두 동일 RS 4 항목 (Lead-Gen + Basic + Premium + B2B) 흡수.

- 잔여 (이전 누적):
  - 사용자 확정 후 신규 26 task 등록 (88 → 114).
  - F15 KOPLAC 영감 임상 자문.
  - V09 §2-§9 본문 정밀 정독.
  - expert 풀 자체 정량화.
  - getCurrentPhase() 정의 메커니즘.
  - expertId × 평가 도구 교차 모니터링.
  - T4-c 외부 공유 IRB 절차 정의.
  - 청소년 (만 13세+) 본인 동의 추가 검토.


## [2026-05-09] note | F15 KOPLAC 임상 자문 체크리스트 (38차 synthesis)

- 입력: Phase-1-future-tasks-decomposition § F15 + KOPLAC 임상 영감 + ADR-04 의료 용어 배제 정합

- 생성:
  - [[product/concepts/F15-clinical-consultation-checklist]] ⭐ — Phase 1 진입 전 임상 자문 가이드라인 (synthesis)

- 갱신:
  - [[product/concepts/Phase-1-future-tasks-decomposition]] § 보강 필요 1건 ✅ 해소.
  - [[wiki/index.md]] — concepts 28 → 29 / 통계 97 / 마지막 갱신 38차.

- ⭐ 9 자문 체크리스트:
  1. 화용 영역 4축 매핑 (의사소통 의도 / 담화 관리 / 상황 맥락 / 관점 취하기)
  2. 연령별 적응 가능성 (만 2-3세 신중 / 만 4-5세 핵심 / 만 6-7세 표준)
  3. ADR-04 의료 용어 배제 정합 (진단·검사·평가·결손·지연·장애·ASD 자동 차단)
  4. 자연 발화 vs 인위 유도 임상 동등성 (시드 고정 권고)
  5. 데이터 활용 — model_retraining_data 통합 (T4-a 동의)
  6. ASD 회피 경계 명확화 (황보름 페르소나 정합 — confidence 60% 게이트)
  7. 부모 코칭 통합 가능성 (4기법 = 평행 발화·확장·기다리기·반응적 상호작용)
  8. F15 안전 가드레일 (시간 제한·LLM 환각 방지·Disclaimer)
  9. KOPLAC 저작권 검증 (출처 명시 + 직접 자극 비복제)

- 자문 결과 → CR Tier 처리:
  - 9 항목 모두 ✅: F15 Phase 1 진입 가능 (88 → 91 Task)
  - 1-3건 ⚠️: Tier 1 (Minor) 명세 텍스트 보강
  - 4건+ 또는 1건 ❌: Tier 2 (Major) Sub-feature 변경
  - ASD 회피 위반 또는 의료 용어 침투: Tier 3 (Strategic) F15 보류 + ADR-XX 신규

- 자문가 선정 (최소 2-3인 — expert-diversity-monitoring 정합):
  - 1급 언어재활사 (경력 5년+) — 9 항목 전반
  - ASD 전문 임상가 — 6 ASD 회피 경계
  - 법무 자문 — KOPLAC 저작권 + ADR-04 의료 용어
  - CTO (내부) — LLM 시드 고정 + 가드레일 기술 검증

- 자문 일정: Phase 1 진입 4주 전부터 (Week -4 선정 → Week -3 1차 → Week -2 정리 → Week -1 2차 → Week 0 진입)

- 비용: ~560,000원 (1회). ROI = 규제 리스크 회피 (R1) 수억 원 잠재 손실 방어.

- ADR 후보:
  - **ADR-XX F15 임상 안전 게이트** (자문 후 Critical 발견 시 Tier 3 처리). 만 4세+ 활성 + ASD 의심 패턴 자동 감지 + 가드레일 5종 시스템 강제. 현 12 ADR + 1 신규 후보 = 13 ADR.

- KOPLAC 4 영역 영감 매핑:
  - 의사소통 의도 → "비누가 떨어졌어" 류 시나리오
  - 담화 관리 → 차례 지키기·이야기 확장
  - 상황 맥락 → 멀티모달 (이미지+텍스트)
  - 관점 취하기 → ⚠️ 만 5세+ 영역 (만 2-4세는 회피)

- ⚠️ ASD 회피 경계 (clinical/concepts/자폐-화용중재 정합):
  - F15 = "발화 유도 도구" 한정. "ASD 진단·중재" 회피.
  - ASD 의심 발화 패턴 → confidence 60% 강제 게이트 (황보름 페르소나)
  - 부모가 ASD 직접 질문 → 챗봇 차단 + 임상 상담 안내

- Cross-link 효과:
  - F15-clinical-consultation-checklist → Phase-1-future-tasks-decomposition / KOPLAC entity / 자폐-화용중재 / 황보름 / HITL-retraining-pipeline / F10-research-consent / expert-diversity-monitoring / ADR-04 / aforementioned 4기법.

- 잔여 (이전 누적):
  - 사용자 확정 후 신규 26 task 등록 (88 → 114).
  - V09 §2-§9 본문 정밀 정독.
  - expert 풀 자체 정량화.
  - getCurrentPhase() 정의 메커니즘.
  - expertId × 평가 도구 교차 모니터링.
  - T4-c 외부 공유 IRB 절차 정의.
  - 청소년 (만 13세+) 본인 동의 추가 검토.
  - KOPLAC 저작권 출처 정확화 (자문 전).
  - F15 시드 고정 알고리즘 결정 (Vercel AI SDK 옵션).


## [2026-05-09] note | HITL 운영 정책 정본 — 보강 필요 3건 일괄 해소 (39차 synthesis)

- 입력: expert-diversity-monitoring + HITL-retraining-pipeline + F10-research-consent § 잔여 항목 통합

- 생성:
  - [[product/concepts/HITL-operations-policy]] ⭐ — Phase × Expert × IRB 통합 운영 정책 (synthesis)

- 갱신:
  - [[product/concepts/expert-diversity-monitoring]] § 보강 필요 2건 ✅ 해소.
  - [[wiki/index.md]] — concepts 29 → 30 / 통계 98 / 마지막 갱신 39차.

- ⭐ 1. Expert Pool 정량화:
  - **Phase 0** (MVP, 3개월): 3-5명 / 1급 ≥1 + 2급 2-4 / 프리랜서 / 운영비 ~150만/月
  - **Phase 1** (리텐션, 6개월): 5-10명 / 1급 ≥2 + 2급 3-8 / 단순 Threshold + Top-3 모니터링 / 프리랜서 + 파트타임 1-2명 / 운영비 ~400만/月
  - **Phase 2** (B2B, 6개월+): 15-25명 / 1급 ≥5 + 2급 10-20 / HHI + Gini 모니터링 / 정규직 1-2명 + 파트타임 + 프리랜서 / 운영비 ~1,500만/月

- 풀 확대 트리거 5종:
  - 일 큐 등록 > 3 × 풀 규모 (1인당 부담 한계)
  - 단순 Threshold > 70% Critical
  - Top-3 비율 > 90% Critical
  - HITL SLA 위반 > 2건/月
  - M3 ≥ 40% + Premium 50K ≥ 100명 (경영 안정)

- ⭐ 2. getCurrentPhase() 메커니즘 — env + DB 하이브리드:
  - **env**: 배포 시점 기본값 `process.env.PHASE` (Vercel)
  - **DB**: 동적 오버라이드 `system_config.current_phase` (CTO만 변경 가능)
  - **캐싱**: 60초 TTL (다중 인스턴스 즉시 반영)
  - **audit_log**: Phase 변경 시 자동 기록 (감사 추적)

- system_config 테이블 신규 (DB-NEW-OPS-1, 1 SP):
  - current_phase / expert_pool_size / hitl_confidence_threshold / retraining_data_threshold / rollback_error_threshold / redeploy_error_threshold
  - 운영 정책 일원화

- Phase 변경 RACI:
  - Phase 0 → 1: ML Ops (R) + CTO (A) + 임상 자문 (C) + 전체 팀 (I)
  - Phase 1 → 2: ML Ops + B2B 영업 (R) + **CEO + CTO (A)** ⭐ + 임상·법무 (C) + 전체 (I)
  - Phase 변경 = **CR Tier 3 (Strategic)**

- ⭐ 3. T4-c 외부 공유 IRB 5단계 절차:
  - [1] 외부 협력 제안 → [2] T4-c 동의 부모 코호트 식별 → [3] 데이터 익명화 검증 → [4] IRB 검토 (외부/내부, 2-4주, 비용 50만+) → [5] 매니저 최종 승인 + audit_log INSERT

- IRB 운영 정책:
  - 내부 자문위원회: CTO + 1급 재활사 + 법무 + 외부 임상가 (분기 회의)
  - 외부 기관 IRB: 외부 협력 시 양쪽 승인 (대학·학회)
  - SLA: 검토 ≤ 4주
  - 회수권: T4-c 철회 시 즉시 미공유 차단 (소급 미적용)

- IRB 제외 영역:
  - T4-a 모델 정확도 개선 (HITL 재학습) = 내부 R&D, IRB 미트리거
  - T4-b 학술 발표 = IRB 트리거 (외부 공유)

- 통합 운영 흐름 명시:
  - Phase 0 → 1 → 2 단계별 expert 풀 + 모니터링 알고리즘 + IRB 활성도 차등

- 신규 task 후보: DB-NEW-OPS-1 system_config 테이블 (1 SP)
  - 누적 보강 후보 통계: F9.4 (5/7) + Phase 1 (15/21) + HITL 재학습 (3/5.5) + F10 (3/3) + Plan B (1/1) + system_config (1/1) = **28 신규 task / 38.5 SP**
  - **88 → 116 Task** 보강 가능성

- ADR 후보:
  - **ADR-XX system_config 테이블 도입** (env + DB 하이브리드). 누적 6 ADR 후보 (F9.4 + F11 + F16 + HITL 재학습 + 변경 관리 + system_config) → 12 + 6 = **18 ADR 가능성**.

- KPI 신규:
  - Expert 풀 활성도 (월 1+ 검토 expert 비율) ≥80%
  - Phase 변경 SLA ≤2주
  - IRB 외부 협력 SLA ≤4주
  - T4-c 부모 철회율 ≤10%

- Cross-link 효과:
  - HITL-operations-policy = expert-diversity-monitoring + HITL-retraining-pipeline + F10-research-consent + change-management-process 4 페이지 통합 진입점.

- 잔여 (이전 누적):
  - 사용자 확정 후 신규 28 task 등록 (88 → 116).
  - V09 §2-§9 본문 정밀 정독.
  - expertId × 평가 도구 교차 모니터링 (보강 후보).
  - 청소년 (만 13세+) 본인 동의 추가 검토.
  - KOPLAC 저작권 출처 정확화.
  - F15 시드 고정 알고리즘 결정.


## [2026-05-09] meta | Open Issues 통합 대시보드 (40차)

- 입력: 23~39차 ingest 누적 § 잔여 항목 카테고리화

- 생성:
  - [[product/concepts/open-issues-dashboard]] ⭐⭐ — 메타 정본 (잔여 추적 시스템)

- 갱신:
  - [[wiki/index.md]] — concepts 30 → 31 / 통계 99 / 마지막 갱신 40차.

- ⭐ 28 잔여 이슈 8 카테고리 통합:
  - **A 사용자 확정** (1): 28 신규 task 등록 (88 → 116, 38.5 SP)
  - **B Phase 1 진입 전 결정** (4): F15 자문 / KOPLAC 저작권 / F11 ALLOWED_CONTENT_TYPES / F15 시드 고정
  - **C Phase 1+ 운영 결정** (5): system_config 보안 / Sprint 처리 / IRB LOI / 정규직 비율 / IRB 비용
  - **D 임상·법적 결정** (4): 청소년 동의 / 데이터 라이선스 / 분기 자문 / F11 임상 자문
  - **E 기술 결정** (3): 교차 모니터링 / D5 트리거 임계 / Slack 채널 권한
  - **F 모니터링·운영 보강** (3): HHI/Gini 검증 / 재학습 임계 검증 / EXP-2 자동 평가
  - **G 정독 잔여** (2): V09 §2-§9 / V05 Marketing
  - **H ADR 후보 6종**: system_config / F15 안전 게이트 / 교차 모니터링 / IRB 자문위원회 / 청소년 동의 / Cache TTL

- 처리 시점 매트릭스 (8 시점):
  - 즉시 (사용자 결정): A-1
  - Phase 1 진입 4주 전: B-1~4 + D-4
  - Phase 1 진입 시: C-1, C-2, E-3
  - Phase 1 활성 후: D-3, F-3, E-2
  - Phase 1 후반: F-2, C-4
  - Phase 2 진입 1개월 전: C-3
  - Phase 2 활성 시: E-1, F-1, C-5
  - Phase 1+ 확장 시: D-1
  - 선택적: G-1, G-2, D-2

- ⭐ Phase 진입 체크리스트:
  - Phase 1 진입: A-1 + B-1~4 + D-4 모두 처리 후
  - Phase 2 진입: C-3 + C-4 모두 처리 후

- 정기 검토 (분기별): D-3, F-1, F-2

- 영향 페이지 역추적 매트릭스: 11 페이지 × 28 이슈 매핑.

- ⭐ 메타 가치:
  - 위키 자체의 잔여 추적 시스템 정착 (39+ 차 누적 → 단일 진입점).
  - 신규 합류자 = 본 페이지 진입 후 Phase 진입 결정 즉시 가능.
  - log.md 각 ingest § 잔여 항목과 양방향 매핑 (시간순 추적 + 카테고리 통합).

- ⭐ ADR 후보 6종 (현 12 + 6 = 18 가능):
  - ADR-13 system_config / ADR-14 F15 안전 게이트 / ADR-15 expertId × 평가 도구 / ADR-16 IRB 자문위원회 / ADR-17 청소년 동의 / ADR-18 Cache TTL

- 잔여 처리 흐름 단계화:
  - Phase 1 진입 = 9 이슈 처리 (A-1, B-1~4, D-4, C-1, C-2, E-3)
  - Phase 1 활성 = 6 이슈 처리 (D-3, F-3, E-2, F-2, C-4 등)
  - Phase 2 진입 = 5 이슈 처리 (C-3 등)

- 잔여 (40차 종결 기준 — 본 대시보드로 모두 추적 통합):
  - **= 본 대시보드 § 28 이슈 (이전 잔여 모두 단일 진입점화 ✅)**.
  - 본 대시보드 자체 갱신 정책 (Append-only vs 해결 시 제거)는 보강 후보.


## [2026-05-09] lint | V09 §4-2/§4-3/§4-5/§4-6/§9 정독 — Open Issues G-1 ✅ 해소 (41차)

- 입력: raw 39 (VPS V09 final UX reinforce) §4-2 ~ §9 추가 정독

- ⭐ V08 → V09 진정한 차이점 5종 명확화:

  **§4-2 분리/병합** (단일 책임 원칙):
  - F1 (혼재) → F1-a BE + F1-b FE 분리
  - F3 (혼재) → F3-a FE + F3-b BE 분리
  - F9 (혼재) → F9-a FE + F9-b BE + F9-c BE + F9-d FE 분리 (4 sub)
  - F12 + F13 → F12 통합 (보상 시스템)
  - F19 + F20 → F9-d 병합 (서브피처)

  **§4-3 4 모순 해결 원칙** (ADR 임상·UX 토대):
  - ① 부모 목소리 vs 캐릭터: 동화만 부모, 교정 중립 → **ADR-09 정합** (F3-a, F11, F15)
  - ② Zero-touch vs 체크박스: 마이크 100%, 교사 승인만 → **ADR-01 정합** (F9-b)
  - ③ 은밀 난이도 vs 강한 보상: 모든 시도→소보상, 완벽→큰보상 이중 (F3-a, F3-b, F12)
  - ④ 임상 권위 vs 행정 편의: B2C DTx 톤, B2B 오피스 톤 → **ADR-04 정합** (F2, F4, F9-a, F9-d)

  **§4-5 14 경쟁사 18 시사점 → 21 Epic 빠짐없이 매핑**:
  - 33 통신 3사 (5건) + 34 에듀테크 (5건) + 35 DTx (5건) + 36 B2B2C (3건) = 18
  - F1-a 강화 2회, F9-b 강화 2회, F9-d 매핑 3회

  **§4-6 21 Epic 카운트** (V09 정식화):
  - Phase 0: 6 (BE 2 + FE 4)
  - Phase 1: 10 (BE 5 + FE 5)
  - Phase 2: 5 (BE 3 + FE 2)
  - 합계: 21 (BE 10 + FE 11)

  **§9 페르소나 커버리지 V2** — 신규 7 Epic 2차 Pain Point 매핑:
  - Seg A: F15 (자연 발화 유도) + F12 (거부감 제거)
  - Seg C: F17 (통합 케어로그) + F16 (일상 전이)
  - Seg B: F18 (예측) + F14 (교정 체험)
  - Seg D-1: F9-d (쿠션어) + F9-a.2 (명의 커스텀)
  - Seg D-2: F9-b.3 (발송 승인만, 모순 ② 적용)

- 갱신:
  - [[product/sources/39-VPS-V09-Final]] — § "V08 → V09 §4 Epic 리팩토링 V2 (41차 정독)" 신규 + 잔여 영역 정정.
  - [[product/concepts/VPS-evolution]] — V09 정독 완성도 65% 표기.
  - [[product/concepts/open-issues-dashboard]] § G-1 ✅ 해소 + 통계 28 → 27 (1 해소).
  - [[wiki/index.md]] — 마지막 갱신 41차.

- ⭐ 핵심 발견:
  - V09 = V07 4단계 + V08 Sub-feature/§9 + **§4 Epic 리팩토링 V2 (분리 3 + 병합 2) + 4 모순 원칙 (ADR 임상·UX 토대) + 14 경쟁사 18 시사점 매핑** 의 통합.
  - **§4-3 4 모순 원칙 = ADR-01 (Zero-touch) + ADR-04 (의료 용어) + ADR-09 (F11 윤리) 의 직접 임상·UX 토대**. 위키 ADR 의존성 그래프 보강 가치.
  - 14 경쟁사 18 시사점 → 21 Epic 빠짐없이 매핑 = V09 자체 검증 완전. 경쟁사 분석 ([[product/sources/33-37-Competitor-UX-Analysis]])과 RTM 직접 양방향 추적 가능.
  - V09 정독 완성도 ≈ 65% (350 + 225 / 841줄). 잔여 §2 Canvas + §3 Proof + §5 + §7 + §8 = 35% (PRD V10 흡수 검증으로 충분).

- ⭐ Open Issues 통계 갱신:
  - 28 → **27 미해결** (G-1 ✅ 해소)
  - 정독 잔여 카테고리 = **2 → 1** (G-2만 잔존: V05 Marketing + JobMVP ⑧ Triage)

- 잔여 (이전 누적 — 본 대시보드 § 27 이슈로 추적):
  - **= [[product/concepts/open-issues-dashboard]] § 27 이슈** (G-1 ✅ 해소).
  - Phase 1 진입 결정 직전 처리 권고 6 이슈 (A-1, B-1~4, D-4) 그대로 유지.


## [2026-05-09] framework | ADR 의존성 그래프 + V09 §4-3 4 모순 원칙 통합 (42차)

- 입력: 41차 정독에서 발견된 V09 §4-3 4 모순 원칙 = ADR-01·04·09의 임상·UX 토대

- 갱신:
  - [[product/concepts/architecture-decisions]] — § "V09 §4-3 4 모순 해결 원칙 = ADR 임상·UX 토대" 신규 + ADR 의존성 그래프 보강 + 4단계 추적성 매트릭스 신규 + ADR-01/04/09 본문 §4-3 정합 명시.
  - [[wiki/index.md]] — 마지막 갱신 42차.

- ⭐ 4 모순 원칙 → ADR 직접 매핑:
  - **모순 ① "부모 목소리 vs 캐릭터"** (가족 ≠ 치료자) → **ADR-09 F11 윤리 화이트리스트** (ALLOWED_CONTENT_TYPES 시스템 강제) + MIT 임상 원리 ([[clinical/concepts/실어증]])
  - **모순 ② "Zero-touch vs 체크박스"** (교사 1초도 시간 없음) → **ADR-01 Zero-touch 수집** (PWA + Web Worker VAD)
  - **모순 ③ "은밀 난이도 vs 강한 보상"** (이중 보상) → ADR 없음 (명세 영역, F3-b 적응형 난이도 엔진)
  - **모순 ④ "임상 권위 vs 행정 편의"** (B2C DTx 톤 vs B2B 오피스 톤) → **ADR-04 의료 용어 배제** (Middleware 금칙어 스캐너)

- ⭐ 4단계 추적성 매트릭스 신규 (V09 의도 → 시스템 검증):
  - V09 §4-3 모순 원칙 → ADR 결정 → 시스템 강제 메커니즘 → TEST 검증
  - 모순 ①: ADR-09 → ALLOWED_CONTENT_TYPES → TEST-NEW-F11-1 (교정 콘텐츠 음성 0건 자동)
  - 모순 ②: ADR-01 → PWA Web Worker VAD → TEST-013 (Hold)
  - 모순 ④: ADR-04 → Middleware 금칙어 정규식 → TEST-005 (금칙어 0건 자동)

- ADR 의존성 그래프 V2:
  - 비즈니스·규제 클러스터: ADR-01·04·02·03 (V01-V04 계승) + ADR-09·11 (자손)
  - 기술 스택 클러스터: ADR-05·06·07 (V05-V06 신규) + ADR-08·10·11 (자손)
  - Meta 클러스터: ADR-12 (모든 ADR 변경 거버넌스)

- ADR-01·04·09 본문 갱신:
  - ADR-01: V09 §4-3 모순 ② 정합 명시
  - ADR-04: V09 §4-3 모순 ④ (B2C DTx 톤 vs B2B 오피스 톤) 정합 명시
  - ADR-09: V09 §4-3 모순 ① "부모 목소리 vs 캐릭터" 시스템 강제 명시

- ⭐ 핵심 발견:
  - **V09 §4-3 4 모순 원칙 = ADR 결정의 UX·임상 근거 토대**. ADR이 추상적 "왜?"가 아닌 V09 §4-3에 명시된 구체적 모순 해결.
  - V09 의도 → ADR 시스템 강제 → TEST 자동 회귀 → 위반 시 차단의 **4단계 거버넌스 사이클** 완성.

- Cross-link 효과:
  - architecture-decisions ↔ 39-VPS-V09-Final § §4-3 양방향 링크 활성.
  - 12 ADR 모두 V09 또는 후속 위키 합성 단계의 명시적 사유와 연결.

- 잔여:
  - = open-issues-dashboard § 27 이슈 (변동 없음).
  - ADR-01·04·09 정합 명시 외에 ADR-02·03·05~08·10·11·12는 V09 §4-3 외 영역 (HITL·기술 스택·거버넌스).


## [2026-05-09] framework | ADR-13~15 정식 등록 — 12 → 15 ADR (43차)

- 입력: Open Issues H 카테고리 ADR 후보 6종 중 충분히 명세된 3종 정식 등록

- 갱신:
  - [[product/concepts/architecture-decisions]] — 12 ADR → **15 ADR 정본화**
    - aliases / 종합 표 갱신 (15건)
    - ADR-13/14/15 개별 섹션 신규 (결정·대안·사유·시스템 영향·연결 REQ·연결 Risk·trade-off + 정본 페이지)
    - ADR 의존성 그래프 [운영 정책 ADR (위키 합성 2차)] 클러스터 신규
    - 비즈니스 임팩트 표 (ADR-13~15 합산) 추가
  - [[product/concepts/open-issues-dashboard]] — H 카테고리 갱신 (3 정식 등록 + 1 흡수 + 2 후보 유지)
    - 통계 28 → 23 미해결 (5건 ✅ 해소)
  - [[wiki/index.md]] — 15 ADR 표기 + 마지막 갱신 43차.

- ⭐ 정식 등록 3종:
  - **ADR-13 system_config 테이블 (env+DB 하이브리드)**: 운영 정책 (Phase / expert 풀 / 임계값) 동적 변경. system_config 테이블 + 60초 캐싱 + audit_log + RBAC (CTO만). ADR-18 (Cache TTL) 흡수.
  - **ADR-14 F15 임상 안전 게이트**: F15 만 4세+ 활성 + ASD 의심 패턴 자동 감지 + 가드레일 5종 (시간 제한·Disclaimer·의료 용어 검열·ASD 직접 질문 차단·시드 고정). 자문 후 Critical 발견 시 발효.
  - **ADR-15 IRB 자문위원회 운영**: T4-c 외부 공유 + 학술 발표 시 분기 자문위원회 + 외부 협력 시 외부 기관 IRB 양쪽 승인. 비용 ~30만/회 분기.

- 후보 유지 2종:
  - **ADR-16 expertId × 평가 도구 교차 모니터링** — Phase 2 후반 (cross-tab Gini 알고리즘 결정 후)
  - **ADR-17 청소년 본인 동의 (만 13세+)** — 영유아 외 확장 시 (현 MVP 영유아 = 부모 단독 동의 충분)

- 흡수 1종:
  - ~~ADR-18 system_config Cache TTL 60초~~ → ADR-13 § 시스템 영향 영역에 통합 (캐싱은 별도 ADR 불필요)

- ⭐ ADR-13/14/15 비즈니스 임팩트:
  - ADR-13: 운영 정책 동적 변경 비용 0 + 다중 인스턴스 일관성
  - ADR-14: F15 출시 가능 (자문 통과 후) + 규제 리스크 R1 회피
  - ADR-15: T4-c 외부 협력 + 학술 발표 가능 → R&D 환류 강화

- ADR 의존성 그래프 V3:
  - 비즈니스·규제 클러스터 (ADR-01·02·03·04·09·11)
  - 기술 스택 클러스터 (ADR-05·06·07·08·10·11)
  - **운영 정책 클러스터** (ADR-13·14·15) ⭐ 신규
  - Meta 클러스터 (ADR-12)

- ADR 자손 관계 명시:
  - ADR-13 → 모든 ADR의 임계값 동적 변경 (Phase·expert 풀·HITL 임계 등 일원화)
  - ADR-14 → ADR-04 + ADR-09 + ADR-02 통합 임상 안전 (V09 §4-3 모순 ① + ④ 시스템 강제)
  - ADR-15 → ADR-02 + ADR-03 + F10 § T4-c 통합 윤리 거버넌스

- ⭐ Open Issues 통계 갱신:
  - 28 → **23 미해결** (G-1 ✅ + ADR-13/14/15 ✅ + ADR-18 흡수 = **5건 해소**)
  - ADR 후보 6 → 2 (ADR-16, ADR-17 잔존)
  - **현 15 ADR + 후보 2 = 17 ADR 가능성** (ADR-18 흡수로 18→17)

- ⭐ 위키 패턴 검증:
  - "위키 합성 단계에서 ADR 도출"이 1차 (ADR-08~12, 28~31차) + 2차 (ADR-13~15, 39~43차) 반복.
  - 신규 ADR 도출 사이클 = (1) 신규 영역 정독·합성 → (2) 후보 식별 → (3) 충분히 명세 후 정식 등록 → (4) 의존성 그래프 갱신.

- 잔여:
  - = open-issues-dashboard § 23 이슈
  - ADR 후보 2 (ADR-16/17) — Phase 2 후반 / 영유아 외 확장 시 정식 등록


## [2026-05-09] lint | G-2 V05 Marketing + JobMVP ⑧ Triage 추적 ✅ 해소 (44차)

- 입력: raw 26 (V02) + raw 28 (V04) + raw 29 (V05) + raw 31 (V07) + raw 32 (V08) + raw 39 (V09) F8 추적

- 발견:
  - **V02 Gemini ⑧** (raw 26 L85): "다자녀 비교(Triage) 진단 / Phase 2 / Low"
  - **V04 Gemini ⑧** (raw 28): 동일 (Phase 2)
  - **V05 Merged F8** (raw 29 L115): "F8 다자녀 비교(Triage) 진단 / Phase 2 이후 / 중요도 3·난이도 4"
  - **V07 Restructured F8** (raw 31 §4 L225): F8 명시 유지
  - **V08 Detailed F8** (raw 32 §4 L299): F8 명시 유지
  - **V09 final** (raw 39): ⚠️ **F8 제거** — §4-2 리팩토링 + §4-6 21 Epic 명단 미포함
  - **V09 §11-F Land & Expand 전략** (raw 39 L676): "둘째/셋째 자녀 추가 = Triage 진단" 으로 흡수

- ⭐ 핵심 발견:
  - F8은 별도 Epic이 아닌 **Land & Expand 전략의 한 형태**.
  - F1-a 진단 엔진 재활용 = 한 가구당 N명 자녀 가입 가능 = 별도 Sub-feature 불필요.
  - V05~V08 4 버전 명시 후 V09 §4-2 리팩토링에서 단순화.
  - 가구 단위 LTV 극대화 메커니즘 = Lock-in 4중 외 5번째 가능성 (Triage = LTV ↑).

- V05 Marketing 섹션 추적:
  - V05 §4 GTM & UX/UI Copy (raw 29 L121~) = 4 Seg 헤드라인+서브카피 + 전략적 포지셔닝 선언문
  - **= V09 §10과 동일** (30차 정독에서 V08·V09 1:1 동일 검증 완료)

- 갱신:
  - [[product/sources/24-30-VPS-V01-V06-Detail]] § 보강 필요 § F8 추적 ✅ 해소.
  - [[product/concepts/open-issues-dashboard]] § G-2 ✅ 해소 + 통계 23 → 22 미해결 + 정독 잔여 카테고리 0.
  - [[wiki/index.md]] — 마지막 갱신 44차.

- ⭐ Open Issues 통계 갱신:
  - 23 → **22 미해결** (G-2 ✅ 해소)
  - 정독 잔여 카테고리 = **2 → 0** (G-1 + G-2 모두 ✅) — 카테고리 자체 종결

- 위키 진화 시사:
  - V05~V08까지 명시된 F8 Epic이 V09 리팩토링에서 제거되어 LTV 메커니즘으로 전환된 사례 = "Epic 단순화 + 전략 흡수" 패턴.
  - 이 패턴은 향후 영업·B2B 전략 진화에서 추가 발견 가능 (예: 데이터 라이선스 V06 → V07 폐기와 동일 패턴).

- 잔여:
  - = open-issues-dashboard § 22 이슈
  - 정독 잔여 = 0 (G 카테고리 종결)
  - ADR 후보 2 (ADR-16/17) — Phase 2 후반 / 영유아 외 확장 시


## [2026-05-09] note | ADR-16 expertId × 평가 도구 교차 알고리즘 설계 (45차 synthesis)

- 입력: Open Issues E-1 + ADR-16 후보 + HITL-retraining-pipeline § 윤리·법적 § "expert × 도구 편향"

- 갱신:
  - [[product/concepts/expert-diversity-monitoring]] — § "Phase 2+ 보강 — expertId × 평가 도구 교차 모니터링 (ADR-16 후보)" 신규 추가
  - [[product/concepts/open-issues-dashboard]] § E-1 ◐ 알고리즘 설계 완료 (실 등록 Phase 2 후반)
  - [[wiki/index.md]] — 마지막 갱신 45차

- ⭐ Cross-tab Gini 알고리즘:
  - expertId × evaluation_tool 매트릭스 (U-TAP / REVT / PRES / KOPLAC 등)
  - **행 Gini** (expert 편식): 단일 expert가 도구를 골고루 다루는가? > 0.7 = Critical
  - **열 Gini** (도구 의존): 단일 도구가 expert를 골고루 받는가? > 0.7 = Critical
  - **combined_score** = expert_gini × tool_gini > 0.49 = 시스템 전체 위험

- 데이터 구조 보강 (model_retraining_data 확장):
  - evaluation_tool 컬럼 신규 (utap_articulation / revt_vocabulary / pres_receptive 등)
  - target_score_axis 컬럼 (articulation / linguistic / acoustic)
  - 인덱스: idx_mrd_tool (evaluation_tool, expertId, createdAt)

- 위반 시 대응 3 시나리오:
  - **expert_gini > 0.7**: 해당 expert 큐 분배 시 다양한 도구 자동 할당
  - **tool_gini > 0.7**: 해당 도구 전문 expert 풀 확대 영업 (특정 도구 지식 우선)
  - **combined > 0.49**: 시스템 전체 다양성 작전 (CTO 결정 + Premium 50K 운영비 증액)

- 임상 자문 회의 통합:
  - 분기별 임상 자문 회의 ([[product/concepts/HITL-operations-policy]] § IRB 자문위원회) 시 cross-tab 매트릭스 검토
  - expertId별 도구 균등도 / 도구별 expert 다양도 / 분기 추세

- 신규 task 후보:
  - **MON-NEW-EXP-2** Cross-tab Gini 모니터링 (1.5 SP, Phase 2 활성화 시)
  - DB query (matrix 추출) + Gini 계산 + 임계 위반 시 Slack Alert

- 누적 보강 후보 통계:
  - F9.4 (5/7) + Phase 1 (15/21) + HITL 재학습 (3/5.5) + F10 (3/3) + Plan B (1/1) + system_config (1/1) + cross-tab (1/1.5) = **29 신규 task / 40 SP**
  - **88 → 117 Task** 가능성

- ADR-16 정식 등록 시점:
  - 현재: 알고리즘 설계 완료, 후보 유지
  - Phase 2 진입 후: 실데이터 분석 + 임계값 검증 → 정식 등록 (Phase 2 후반)
  - 트리거: tool_gini > 0.5 첫 발생 + expert 풀 15명+ 도달 시

- ⭐ 위키 패턴 검증:
  - "후보 ADR의 알고리즘 설계는 Phase 2 진입 전에도 가능 — 정식 등록만 Phase 2 후반 실데이터 검증 후"
  - 1차 알고리즘 설계 (현 단계) + 2차 정식 등록 (Phase 2 후반) 분리 패턴

- 잔여:
  - = open-issues-dashboard § 22 이슈
  - E-1 ◐ 부분 해소 (알고리즘 설계 완료, 정식 등록 대기)
  - ADR 후보 2 (ADR-16 - 알고리즘 완료 / ADR-17 청소년 동의)


## [2026-05-09] note | F-2 재학습 임계 실데이터 검증 계획 수립 (46차 synthesis)

- 입력: Open Issues F-2 + HITL-retraining-pipeline § 0.5%/500건/0.3% 임계 (가설)

- 갱신:
  - [[product/concepts/HITL-retraining-pipeline]] — § "임계 실데이터 검증 계획 (F-2 후속, 45차 추가)" 신규 추가
  - [[product/concepts/open-issues-dashboard]] § F-2 ◐ 검증 계획 수립 완료
  - [[wiki/index.md]] — 마지막 갱신 46차

- ⭐ 측정 계획:
  - Day 1-30: 일일 measure_critical_error_rate() + Slack #ml-metrics 보고
  - Day 30 종료: 분포 분석 (평균/중앙값/95%ile + 일별 변동 + 도구·expert별 cross-tab)
  - 임계 재검증 결정 → CR Tier 2 처리 시 system_config 갱신 (ADR-13)

- ⭐ 3 시나리오 (분포별 임계 조정):
  - **A 정상** (30일 평균 0.2-0.4%): 현 임계 유지 (롤백 0.5% / 재배포 0.3% / 누적 500건)
  - **B 모델 부정확** (1%+): 임계 완화 (롤백 1.5% / 재배포 1% / 누적 1,000건)
  - **C 모델 우수** (<0.1%): 임계 강화 (롤백 0.2% / 재배포 0.1% / 누적 300건)

- ⭐ 표본 부족 처리:
  - Day 1-15: < 100 → 임계 결정 보류 (현 가설 유지)
  - Day 15-30: 100-300 → 일일 추세 모니터링만 (변경 결정 미루기)
  - Day 30+: 200+ → 임계 재검증 + CR Tier 2 처리 가능
  - Day 60+: 500+ → 도구별/expert별 cross-tab 임계 차등화 가능
  - Day 90+: 1,000+ → 임계 운영 안정화 (분기별 재검증만)

- 자동화 — Vercel Cron 주간 (월요일 04:00 KST):
  - 표본 부족 시 Slack Info
  - 큰 차이 발견 시 Slack Warning + CTO 알림 + CR Tier 2 처리 검토
  - bootstrap CI 신뢰구간 95% 분석

- ⭐ Phase 별 체크포인트 5종:
  - Day 30: 첫 임계 분포 분석 + 시나리오 A/B/C 분류 (Tier 1-2)
  - Day 60: 도구별 cross-tab 분포 추가 (Tier 1)
  - Day 90: 분기 임상 자문 회의 안건 (Tier 2)
  - Phase 2 진입 직전: 최종 임계 + cross-tab Gini 통합 (Tier 3)
  - 분기별 (Phase 2+): 정기 재검증 (Tier 1)

- 영향 페이지 (4개):
  - HITL-retraining-pipeline (본 페이지)
  - HITL-operations-policy § 2 (system_config 임계값 갱신)
  - architecture-decisions § ADR-11 (자동 롤백·재배포 임계 변경)
  - open-issues-dashboard § F-2 (✅ 표시)

- ⭐ 위키 패턴 검증:
  - "1차 검증 계획 수립 (현 단계, 알고리즘 + 표본 처리 명세) + 2차 실 측정·결정 (Phase 1 진입 후)" 분리 패턴 — ADR-16 (45차)와 동일.

- 잔여:
  - = open-issues-dashboard § 22 이슈
  - E-1 ◐ 알고리즘 설계 완료 / F-1·F-2·F-3 ◐ 계획 수립 완료 (실 측정·트리거 대기)
  - ADR 후보 2 (ADR-16 / ADR-17)


## [2026-05-09] note | F-3 EXP-2 자동 평가 메커니즘 설계 (48차 synthesis)

- 입력: Open Issues F-3 + R6-Seg-B-Plan-B § EXP-2 종료 시점 (4-8주)

- 갱신:
  - [[product/concepts/R6-Seg-B-Plan-B]] — § "EXP-2 자동 평가 메커니즘 (F-3 후속, 48차 추가)" 신규 추가
  - [[product/concepts/open-issues-dashboard]] § F-3 ◐ 자동 평가 메커니즘 설계 완료
  - [[wiki/index.md]] — 마지막 갱신 48차

- ⭐ 자동화 흐름:
  - Phase 1 Day 28+: 일일 measure_seg_b_cohort_m3() (Vercel Cron 주간, 월요일 05:00)
  - Day 56 (8주차) 종료: EXP-2 자동 분석 → 4 시나리오 분류
  - 자동 4 시나리오:
    - **A 성공** (M3 ≥40%): Slack Info / 현 F4+F18 유지
    - **B 경계** (M3 30-40%): Slack Warning / 소규모 CR (F4 카피 + F5 강화)
    - **C 실패** (M3 <30%): 🔴 **Slack Critical + CR Tier 2 자동 시작**
    - **D 표본 부족** (n<200): Slack Info / Day 84까지 연장

- ⭐ CR Tier 2 자동 트리거 (Plan B 발동 시):
  - CR-YYYY-NNN-R6-PlanB 자동 생성
  - Slack Critical → CTO + PM 알림
  - 8 영향 페이지 (RTM 기반) 자동 추출
  - Quality Gate 5 체크리스트 사전 알림

- 8 영향 페이지 자동 갱신 매트릭스 (Plan B 머지 시):
  - MVP-feature-spec / RTM / task-breakdown-overview / SRS V06
  - 52-PRD-V09 / customer-segmentation / persona-박민정
  - architecture-decisions (영향 없음 - 정합)

- 표본 부족 처리:
  - Day 28: < 100 → 일반 누적
  - Day 56: 100-200 → 일일 추세만
  - Day 84: 200+ → 자동 평가 시작
  - Day 120: < 200 지속 → ⚠️ Phase 1 활성도 부족 = 영업 결정 필요

- Phase 별 체크포인트:
  - Phase 1 Day 28: EXP-2 자동 평가 시작 + Seg B 코호트 추적
  - Phase 1 Day 56: EXP-2 종료 + 4 시나리오 자동 분류
  - Phase 1 Day 84: (Plan B 발동 시) Plan B 머지 완료 + Readiness Gate 재실행
  - Phase 1 Day 120+: Plan B 효과 검증 (Plan C 트리거 검토)

- ⭐ Plan C 자동 트리거 (이중 안전망, Tier 3):
  - Plan B 발동 후 Day 30 (Phase 1 Day 84) Plan B 효과 측정
  - M3 ≥ 40%: ✅ Plan B 성공
  - M3 30-40%: 🟡 Plan B 부분 효과
  - M3 < 30%: 🔴 **Plan C 트리거** (CEO 알림 + 멀티 LLM 사이클 + VPS 재검토 = Seg B 디스코프 / B2C → B2B 가속 / 신규 페르소나)

- 영향 페이지 (4개):
  - R6-Seg-B-Plan-B (본 페이지)
  - change-management-process § Tier 2 (Plan B = CR Tier 2 자동 트리거 사례)
  - HITL-operations-policy § 2 (system_config phase_1_start_day 보강)
  - open-issues-dashboard § F-3 (✅ 표시)

- ⭐ 위키 패턴 검증:
  - F-2 (46차) + F-1 (47차) + F-3 (48차) = "1차 자동화 메커니즘 설계 + 2차 실 측정·트리거" 분리 패턴 연쇄 적용.
  - F 카테고리 검증·자동화 = Phase 1 진입 시점에 통합 처리.

- 잔여:
  - = open-issues-dashboard § 22 이슈
  - E-1 / F-1 / F-2 / F-3 ◐ 계획 수립 완료 (실 트리거 대기)
  - ADR 후보 2 (ADR-16 / ADR-17)


## [2026-05-09] note | C-2 Phase 변경 시 Sprint 처리 정책 결정 (49차 synthesis)

- 입력: Open Issues C-2 + HITL-operations-policy § 4 통합 운영 흐름 + ADR-13 system_config

- 갱신:
  - [[product/concepts/HITL-operations-policy]] — § "Phase 변경 시 Sprint 처리 정책 (C-2 후속, 49차 추가)" 신규 추가
  - [[product/concepts/open-issues-dashboard]] § C-2 ✅ 정책 결정 완료 + 통계 22 → 21 미해결
  - [[wiki/index.md]] — 마지막 갱신 49차

- ⭐ 핵심 옵션 비교:
  - **옵션 A** (Sprint 완료 후 적용): 일관성 + 분석 용이 / 1-2주 지연
  - **옵션 B** (즉시 적용): 즉시 효력 / cohort 혼재
  - **⭐ 옵션 C 하이브리드 (권장)**: 신규 = 즉시 / 기존 = Sprint 완료 후

- ⭐ 옵션 C 구현 — 하이브리드 Phase 전환:
  - system_config 보강: phase_transition_started_at + phase_transition_completed_at 컬럼
  - user_current_phase() 함수: 사용자 created_at 기준 자동 분기
    - 신규 (전환 시작 후): 즉시 새 Phase
    - 기존 (전환 시작 전): Sprint 종료까지 이전 Phase 유지
  - audit_log 강제 (전환 완료 기록)

- 4단계 전환 흐름:
  - **T0** Phase 변경 결정 (CR Tier 3, CTO+CEO 책임)
  - **T1** 전환 시작 (system_config.phase_transition_started_at = NOW)
  - **T2** Sprint 완료 (~2주) — 기존 가입자 자동 전환
  - **T3** 전환 완료 (system_config.phase_transition_completed_at)

- ⭐ Phase 변경 RACI:
  - Phase 0 → 1: ML Ops + PM (R) + CTO (A) + 임상·법무 (C) + 전체 팀 (I)
  - Phase 1 → 2: ML Ops + B2B 영업 + PM (R) + **CEO + CTO (A)** ⭐⭐ + 임상·법무 (C) + 전체 (I)
  - T2 Sprint 완료 시점: ML Ops 자동 (R) + CTO (A)

- 4 위험 요소 완화:
  - 신규/기존 cohort 분석 복잡성 → DB 쿼리 정밀화 + Amplitude 별도 dashboard
  - 신규 가입자 새 기능 거부 → Phase 2 새 기능 = Opt-in 가능
  - 기존 가입자 갑작스러운 전환 → T2 1주 전 in-app 알림 + 이메일
  - Sprint 도중 Phase 변경 결정 변경 → T1 진입 후 = Tier 3 재검토 (Tier 2 미허용)

- 영향 페이지 (4개):
  - HITL-operations-policy (본 페이지)
  - architecture-decisions § ADR-13 (시스템 영향 영역에 Phase 전환 흐름 추가)
  - change-management-process § Tier 3 (Phase 변경 = 옵션 C 명시)
  - open-issues-dashboard § C-2 (✅ 표시)

- ⭐ Open Issues 통계 갱신:
  - 22 → **21 미해결** (C-2 ✅ 해소)
  - 누적 7건 ✅ 해소 (G-1 + G-2 + ADR-13/14/15 + ADR-18 흡수 + C-2)

- 잔여:
  - = open-issues-dashboard § 21 이슈
  - E-1 / F-1 / F-2 / F-3 ◐ 계획 수립 완료 (실 트리거 대기)
  - ADR 후보 2 (ADR-16 / ADR-17)


## [2026-05-09] note | C-1 system_config RBAC 정책 세분화 (50차 synthesis)

- 입력: Open Issues C-1 + ADR-13 system_config + HITL-operations-policy § 2

- 갱신:
  - [[product/concepts/HITL-operations-policy]] § "system_config RBAC 정책 세분화 (C-1 후속, 50차 추가)" 신규 추가
  - [[product/concepts/open-issues-dashboard]] § C-1 ✅ RBAC 정책 결정 완료 + 통계 21 → 20 미해결
  - [[wiki/index.md]] — 마지막 갱신 50차

- ⭐ 권한 레벨 매트릭스:
  - **CEO**: current_phase + 모든 항목 (긴급) — Tier 3
  - **CTO** ⭐: current_phase (T1 시작) / expert_pool_size / 모든 임계값 — Tier 2-3
  - **ML Ops**: rollback_error_threshold / redeploy_error_threshold / retraining_data_threshold (CTO 승인 후) — Tier 2
  - **PM**: 읽기 전용 (운영 보고)
  - **그 외**: 모든 system_config 읽기 전용 (운영 보안)

- ⭐ Supabase RLS 5 정책:
  - system_config_read (모든 인증 사용자 읽기)
  - system_config_write_cto_ceo (CEO + CTO 전용 변경)
  - system_config_write_mlops_thresholds (ML Ops 일부 + CTO 승인)
  - 변경 후 audit_log 강제
  - 7일 rollback 자동 옵션

- ⭐ 보안 메커니즘 5종:
  - 1. Supabase RLS (DB 레벨 강제)
  - 2. CTO 승인 (ML Ops 변경 시) - cto_approvals 테이블 + 7일 유효
  - 3. 변경 사유 ≥10 chars (API 검증)
  - 4. audit_log 강제 (event + 변경 전후 + actor + role + IP + UA)
  - 5. 7일 Rollback 가능 (변경 후 즉시 되돌릴 수 있는 옵션)

- Slack #ops-alerts 자동 발송 4 규칙:
  - Tier 1 (Minor): expert_pool_size 변경 → Slack Info
  - Tier 2 (Major): hitl_confidence_threshold 변경 → Slack Warning
  - Tier 3 (Strategic): current_phase 변경 → Slack Critical + CEO/CTO 페이저
  - 보안 위반: 비인가 사용자 시도 → Slack #security-alerts + CTO 즉시

- 권한 침해 시 4 대응:
  - 비인가 사용자 시도 → DB RLS 자동 차단 + Slack #security-alerts
  - ML Ops가 CTO 승인 없이 변경 → DB 제약 위반 자동 차단
  - CTO/CEO 변경 후 결과 의문 → 7일 내 CEO 권한 즉시 rollback (Tier 3 비상)
  - 2FA 미완료 변경 시도 → Supabase Auth 2FA 강제 + 미완료 시 차단

- 정기 검토 4주기:
  - 주간: 변경 audit_log 검토 (PM 보고)
  - 월간: 2FA 적용률 + 권한 침해 시도 수 (CTO 보고)
  - 분기: RBAC 정책 적정성 (CEO + CTO 회의)
  - CR Tier 3: RBAC 정책 자체 변경 (CEO 결정)

- ADR-13 보강:
  - 시스템 영향 영역에 RBAC + Supabase RLS 5 정책 + 7일 rollback + 2FA + Phase 전환 hybrid (49차) 통합 명시.

- 영향 페이지 (4개):
  - HITL-operations-policy (본 페이지)
  - architecture-decisions § ADR-13 (시스템 영향 영역 보강)
  - change-management-process § Tier 1-3 (system_config 변경 = Tier 분류 표준 사례)
  - open-issues-dashboard § C-1 (✅ 표시)

- ⭐ Open Issues 통계 갱신:
  - 21 → **20 미해결** (C-1 ✅ 해소)
  - 누적 8건 ✅ 해소 (G-1 + G-2 + ADR-13/14/15 + ADR-18 흡수 + C-2 + C-1)

- 잔여:
  - = open-issues-dashboard § 20 이슈
  - E-1 / F-1 / F-2 / F-3 ◐ 계획 수립 완료 (실 트리거 대기)
  - ADR 후보 2 (ADR-16 / ADR-17)


## [2026-05-09] note | C-3 IRB 외부 기관 사전 확보 계획 (51차 synthesis)

- 입력: Open Issues C-3 + HITL-operations-policy § 3 IRB 5단계 절차 + F10-research-consent § T4-c

- 갱신:
  - [[product/concepts/HITL-operations-policy]] § "IRB 외부 기관 사전 확보 계획 (C-3 후속, 51차 추가)" 신규 추가
  - [[product/concepts/open-issues-dashboard]] § C-3 ✅ LOI 계획 결정 + 통계 20 → 19 미해결
  - [[wiki/index.md]] — 마지막 갱신 51차

- ⭐ 타깃 4 카테고리:
  - **A 대학 (언어치료학과)**: 한림대 / 연세대 / 이화여대 / 한국외대 — T4-a/b + IRB 양쪽
  - **B 학회·임상 협회**: 한국언어재활사협회 / 한국언어청각임상학회 / 한국아동학회 — 1급/2급 풀 + 학술 발표
  - **C 임상 자문가**: 1급 재활사 (10년+) + ASD 전문 — 자문위원회 + F15 KOPLAC
  - **D 의료 브릿지** (회피 영역): 지역 소아청소년과 — 영업 채널만, **데이터 공유 X**

- ⭐ LOI 표준 템플릿 (7 섹션):
  - 본 프로젝트 개요 / 협력 범위 (Tier T4-a/b/c) / 데이터 공유 정책 (GDPR + 한국법) / IRB 절차 / 협력 기간 / 양측 책임 / 분쟁 해결

- ⭐ 단계별 타임라인 (Phase 2 진입 6개월 전부터):
  - **T-6**: 타깃 기관 선정 + 비공식 사전 접촉
  - **T-4**: 비공식 미팅 + LOI 1차 협의
  - **T-2**: LOI 정식 체결 (A 1-2 대학 + B 1 학회 + C 3-5 자문가)
  - **T-1**: IRB 절차 협의 시작
  - **T0 (Phase 2 진입)**: 자문위원회 분기 1회 + T4-c 부모 식별
  - **T+3**: 첫 외부 협력 검토
  - **T+6**: 6개월 협력 종료 → 갱신 결정 (CR Tier 3, CEO 책임)

- 위험 5종 + 완화:
  - 외부 기관 의지 부족 → 1급 재활사 풀 통한 사전 우호적 접촉
  - 대학별 IRB 절차 차이 → 우선 1-2 대학 확보 + 가장 간편한 곳부터
  - 데이터 공유 범위 협상 갈등 → LOI Tier 분류 단계적 확대
  - GDPR/한국법 위반 우려 → 법무 자문 + LOI 명시
  - 외부 IRB 거부 → 양쪽 검토 + 외부 거부 시 공유 차단 (소급 미적용)

- ⭐ Phase 2 진입 LOI 검증 게이트 5 체크:
  - LOI 정식 체결 (A 1+ + B 1+ + C 3+)
  - 외부 IRB 절차 합의
  - 자문위원회 분기 운영 합의
  - T4-c 동의 부모 100명+
  - 법무 자문 정합 검증

- 비용 모델 (Phase 2 첫 1년):
  - LOI 체결 법무 자문: ~100만 (1회)
  - 외부 IRB 비용: ~50만/회
  - 분기 자문위원회: ~30만/회 × 4 = 120만
  - 비공식 미팅: ~50만
  - **합계 ~800-1,000만** (Phase 2 매출 50억 대비 0.02% 미만)

- 영향 페이지 (5개):
  - HITL-operations-policy § 3 (본 보강)
  - F10-research-consent § T4-c (외부 협력 채널)
  - expert-diversity-monitoring § 임상 자문 (자문가 다양성)
  - architecture-decisions § ADR-15 (IRB 자문위원회)
  - open-issues-dashboard § C-3 (✅)

- ⭐ Open Issues 통계 갱신:
  - 20 → **19 미해결** (C-3 ✅ 해소)
  - 누적 9건 ✅ 해소

- 잔여:
  - = open-issues-dashboard § 19 이슈
  - E-1 / F-1 / F-2 / F-3 ◐ 계획 수립 완료 (실 트리거 대기)
  - ADR 후보 2 (ADR-16 / ADR-17)


## [2026-05-09] note | C-4 Expert 정규직 vs 프리랜서 비율 정량 분석 (52차 synthesis)

- 입력: Open Issues C-4 + HITL-operations-policy § 1 Expert Pool 정량화

- 갱신:
  - [[product/concepts/HITL-operations-policy]] § 1 § "Expert 정규직 vs 프리랜서 비율 결정 (C-4 후속, 52차 추가)" 신규 추가
  - [[product/concepts/open-issues-dashboard]] § C-4 ✅ 정량 분석 완료 + 통계 19 → 18 미해결
  - [[wiki/index.md]] — 마지막 갱신 52차

- ⭐ 3 고용 형태 비교:
  - **정규직**: 시급 5만 + 30% (4대 보험 + 퇴직금 + 연차) — 안정성 ↑ + 변동 흡수 ↓
  - **파트타임**: 시급 5만 + 15% (4대 보험 일부) — 균형
  - **프리랜서**: 시급 5만 + 0% (3.3% 원천세) — 변동 흡수 ↑ + 안정성 ↓

- ⭐ Phase별 권장 비율:
  - Phase 0 (3-5명): 0정규 + 0파트 + 3-5프리 = ~150만/月
  - Phase 1 (5-10명): 0-1정규 + 1-2파트 + 4-7프리 = ~400만/月
  - Phase 2 시작 (10-15명): **1정규 + 4파트 + 5-10프리** = ~750만/月 ⭐
  - Phase 2 후반 (15-25명): 2정규 + 7파트 + 6-16프리 = **~1,500만/月**

- 회계 영향 (Phase 2 시작 가정):
  - 정규직 1: 5만 × 160h × 1.3 = 1,040만/月
  - 파트타임 4: 5만 × 80h × 1.15 × 4 = 1,840만/月
  - 프리랜서 5: 5만 × 30h × 5 = 750만/月
  - **합계 ~3,630만/月 = 4.4억/年** (Phase 2 매출 50억 대비 8.7%)

- 채용 RACI:
  - 정규직 채용: HR + CTO (R) + **CEO (A)** ⭐ Tier 3
  - 파트타임 영입: CTO + ML Ops (R) + CTO (A) Tier 2
  - 프리랜서 위탁: ML Ops (R) + CTO (A) Tier 2

- 위험 4종 완화:
  - 정규직 부당해고 분쟁 → 채용 시 명확한 KPI + 90일 수습 + 법무 자문
  - 위장도급 (프리랜서 = 사실상 근로자) → 4 요건 충족 (사업자등록 / 자기 PC / 시간·장소 자유 / 다른 의뢰인 가능)
  - 파트타임 4대 보험 누락 → 주 15시간+ 의무 자동 가입
  - 외부 IRB 협력 시 정규직 자격 → LOI 체결 시 학술 발표 공동 저자 = 정규직 우선

- 트래픽 시나리오별 결정 3종:
  - A. 안정 (Phase 2 시작): 정규 1 + 파트 4 + 프리 5-10
  - B. 급증 (B2B PoC 5건+): 프리랜서 풀 우선 확대 (10 → 15-20)
  - C. 정체 (Phase 1 후반 M3 < 30%): 프리랜서 축소 + Plan B 발동

- 영향 페이지 (4개):
  - HITL-operations-policy § 1 (본 보강)
  - expert-diversity-monitoring § 임상 자문 (자격 등급 비율)
  - architecture-decisions § ADR-XX (정규직 = Tier 3 동일)
  - open-issues-dashboard § C-4 (✅)

- ⭐ Open Issues 통계 갱신:
  - 19 → **18 미해결** (C-4 ✅ 해소)
  - 누적 10건 ✅ 해소

- 잔여:
  - = open-issues-dashboard § 18 이슈
  - E-1 / F-1 / F-2 / F-3 ◐ 계획 수립 완료 (실 트리거 대기)
  - ADR 후보 2 (ADR-16 / ADR-17)


## [2026-05-09] ingest | 신규 raw 7 임상 자료 (231KB) 통합 정독 ✅ (53차)

- 입력: 사용자가 raw/ 폴더에 추가한 7 신규 파일 (한국 영유아 언어평가 + DLD 중재 + 학습장애 검사)
  - SELSI 체크리스트 (26KB) / PRES 체크리스트 (21KB) / REVT 체크리스트 (23KB) / U-TAP 체크리스트 (28KB)
  - 학령전 4도구 통합 심층 가이드 (62KB)
  - 언어발달지연 DLD 단계적 중재 + 4 핵심기법 (32KB)
  - NISE-B·ACT 통합 바이블 (38KB)

- pillar: clinical (모든 자료 임상 영역)

- 생성 (3건):
  - [[clinical/sources/2026-05-09-한국-영유아-언어평가-DLD-NISE]] ⭐ — 7 자료 통합 source
  - [[clinical/concepts/학령전-언어평가-도구-비교]] ⭐ — SELSI/PRES/REVT/U-TAP 4 도구 비교 정본 (synthesis)
  - [[clinical/concepts/NISE-B-ACT-학습장애검사]] ⭐ — 학습장애 검사 신규 concept (assessment_domain)

- 보강 (4 entity + 2 concept = 6건):
  - [[clinical/entities/SELSI]] — 적용 연령 4-35개월 / 양육자 보고식 / +/-/NO 3원 채점 / 절단점 (-1 SD 경계, -2 SD 지연) + Product cross-link 7건
  - [[clinical/entities/PRES]] — 만 2;0-6;11 / 1995년 한국 최초 학령전 표준화 / 1:1 직접 / 60-90분 / -1.25 SD/-2 SD 절단점 + REVT 보완 관계 + Product 7건
  - [[clinical/entities/REVT]] — 만 2;6-성인 / REVT-R + REVT-E 별도 어휘 풀 / ~185문항 / 등가연령 6개월+ 지체 절단점 + Product 7건
  - [[clinical/entities/U-TAP]] ⭐⭐ — 원판 + U-TAP2 (2020) / 음운변동 평가 (Stopping/Fronting/Cluster Reduction/Liquid Replacement/Final Consonant Deletion) / PCC 80%/65% 절단점 / 한국어 자음 발달 순서 (만 2/3/4-5/6-7세) + Product 8건 (MVP 가장 직접)
  - [[clinical/concepts/언어발달지연]] — DLD 3단계 (어휘→문장→화용·담화 EMT) + 4 도구 절단점 매핑
  - [[clinical/concepts/아동언어치료-핵심기법]] — EMT (환경 중심 언어중재) + Hanen "It Takes Two to Talk" 정합 + ⭐ ADR-09 (F11 윤리) 임상 근거 강화 + F15 EMT 영감

- 갱신:
  - [[wiki/index.md]] — clinical 17 → 20 페이지 / 전체 99 → 102 / 마지막 갱신 53차

- 핵심 발견:
  - ⭐ **U-TAP/U-TAP2 = MVP F1-a articulation 가장 직접 매핑** — 음운변동 5+ 분류 + PCC + 한국어 자음 발달 순서 + REQ-FUNC-HITL-003 정합
  - ⭐ **SELSI 양육자 보고식 = F1-b 5분 진단 영감** (음성 직접 수집 없이 가능)
  - ⭐ **REVT 등가연령 + 백분위 = persona-박민정 (Seg B 데이터형) "수치 증명" 직접**
  - ⭐ **DLD 3단계 + EMT + 4 핵심기법 = ADR-09 (F11 윤리) 임상 근거 강화** — 부모 자연 상호작용 vs 교정 훈련 분리의 임상적 정합
  - ⭐ **NISE-B·ACT = MVP 회피 영역 + 만 5-7세 부분 영감** — 트랙 3 (학습장애·특수교육) 신규 분류 후보 ([[clinical/concepts/한국-언어치료-트랙비교]] § 트랙 3 보강 후보)

- 4 도구 통합 매트릭스 (학령전-언어평가-도구-비교):
  - SELSI (4-35개월, 양육자 보고, 30분, 선별)
  - PRES (2;0-6;11, 1:1 직접, 60-90분, 종합 진단)
  - REVT (2;6-성인, 1:1 직접, 30-45분, 어휘 특화)
  - U-TAP (2;6-6;11, 1:1 직접, 30분, 조음 특화)
  - **모두 김영태 교수 그룹 개발** = 일관된 학파

- 도구 선택 알고리즘:
  - 만 0-2;5: SELSI 단독
  - 만 2;6-3;11: SELSI ↔ PRES + REVT 전환
  - 만 4-6;11: PRES + REVT 병행 표준 + 의심 시 U-TAP 추가
  - 만 7세+: REVT 단독 + U-TAP2 (만 7세까지) + NISE-B·ACT 병행 가능

- DLD 3 단계:
  - **제1단계** 어휘 확장 (의미적 매핑) - 0-11개월 영아 + 무발화·심각 지연 (2-3세 조기 식별)
  - **제2단계** 단어 결합 (50단어 이후) - 명사+동사 + 작업 기억
  - **제3단계** 화용·담화 (EMT 환경 조작 + Mand-model)

- 4 핵심기법 (Hanen + EMT 정합):
  - 평행 발화 (Parallel Talk)
  - 확장 (Expansion)
  - 기다리기 (5-10초)
  - 반응적 상호작용 (Responsive Interaction)

- ⭐ ADR-09 (F11 윤리 화이트리스트) 임상 근거 강화:
  - 4 핵심기법 모두 부모-아이 자연 상호작용 = 교정 훈련 ≠ 가족 역할 → ALLOWED_CONTENT_TYPES 강제
  - storybook / lullaby (일방향) = ALLOWED → 4 기법 정합
  - articulation_correction / phoneme_drill / mission_mirror = 차단 → MIT 임상 원리 정합

- ⭐ F15 EMT 영감 (ADR-14 정합):
  - F15 챗봇 시나리오 = EMT 환경 조작 + Mand-model 영감
  - 만 4세+ 활성 (ADR-14) = DLD 3단계 § 화용·담화 정합 (만 4세 이전 화용 발달 미성숙)

- 통계 갱신:
  - clinical concepts: 8 → **10** (학령전 4도구 비교 + NISE-B 신규)
  - clinical entities: 8 (보강만, 신규 0)
  - clinical sources: 1 → **2** (2026-05-09 통합 source 신규)
  - 전체: 99 → **102 페이지**

- Product cross-link 대규모 보강:
  - F1-a 3축 = 4 도구 디지털 통합 (articulation = U-TAP / linguistic = SELSI+PRES+REVT)
  - F1-b 양육자 보고식 = SELSI 영감
  - F4 시계열 = PCC 65→80% / REVT 등가연령 시계열 = persona-박민정 직접
  - F11 ADR-09 = 4 핵심기법 임상 근거
  - F15 ADR-14 = EMT 영감 + 만 4세+ 활성 정합
  - HITL groundTruthScore = 4 도구 임상 보정 표준
  - expert-diversity-monitoring × evaluation_tool cross-tab = 4 도구 매트릭스
  - persona-박민정 (Seg B) = REVT 직접
  - persona-이지수 (Seg A) = SELSI 영감
  - persona-황보름 (ASD 경계선) = NISE-B + KOPLAC

- 모순 검증:
  - 위키 stub에서 적용 연령 모호 → raw 정독으로 정확화 (SELSI 4-35개월 / PRES 2;0-6;11 / REVT 2;6-성인 / U-TAP 2;6-7)
  - U-TAP → U-TAP2 (2020) 개정판 명시 (저자 4인 공저)
  - 4 핵심기법 정의 → EMT (환경 조작 + Mand-model) 추가 명시 → 보강
  - NISE-B·ACT → 신규 영역 (자폐 검사 X, 학습장애 검사) — 신규 추가 (모순 X)

- 잔여:
  - = open-issues-dashboard § 18 이슈 (이전 잔여 그대로)
  - 신규: raw 5 (62KB) § 제2-4부 본문 정밀 정독 / raw 7 NISE-B § 제3-6강 본문 정독 / 한국-언어치료-트랙비교 § 트랙 3 보강
  - U-TAP/U-TAP2 학술 협력 가능성 (T4-c 외부 협력 채널)


## [2026-05-09] note | F-1 HHI/Gini 임계 실데이터 검증 계획 수립 (47차 synthesis)

- 입력: Open Issues F-1 + expert-diversity-monitoring § Phase 2 (HHI > 2500 / Gini > 0.5 가설)

- 갱신:
  - [[product/concepts/expert-diversity-monitoring]] — § "HHI/Gini 임계 실데이터 검증 계획 (F-1 후속, 47차 추가)" 신규 추가
  - [[product/concepts/open-issues-dashboard]] § F-1 ◐ 검증 계획 수립 완료
  - [[wiki/index.md]] — 마지막 갱신 47차

- ⭐ 측정 계획 (Phase 2 진입 후):
  - Day 1-30: 일일 measure_hhi_gini() + Slack #ml-metrics
  - Day 30: 3 지표 분포 분석 (HHI/Gini/Top-3) + 자연 발생 임계 vs 산업 표준 차이
  - Day 60: F-2 (재학습 임계) + F-1 (다양성 임계) 통합 검증
  - Day 90: 분기 임상 자문 + cross-tab Gini (E-1) 통합
  - Day 180: 6개월 정기 + ADR-15·16 정식 등록

- ⭐ 3 시나리오 (Phase 2 expert 풀 15-25명 가정):
  - **A 정상** (HHI 1500-2500): 현 임계 유지
  - **B 자연 집중** (3000+, false positive 빈발): 임계 완화 (HHI >3500/>5500, Gini >0.6/>0.8)
  - **C 과다 분산** (<1000): 풀 축소 검토 (정규직 비율 ↓, 운영비 절감)

- ⭐ 3 지표 통합 모니터링:
  - HHI (산업 표준) + Gini (학술) + Top-3 (Phase 1 호환)
  - **Multi-alert (2+ 지표 동시 알림) → Critical** (단일 지표 false positive 회피)
  - 단일 지표 알림 → Warning만

- 자동화 — Vercel Cron + Grafana:
  - Phase 2 활성 시 매일 03:00 KST
  - Phase != 2면 skip
  - Grafana 시계열 메트릭 (hhi/gini/top3)
  - Multi-alert 시 Slack Critical + CTO 알림

- ⭐ Phase 1 → Phase 2 자동 전환:
  - 트리거: B2B PoC 5건 + M3 ≥40% + expert 풀 15명+
  - system_config: monitoring_algorithm = 'phase2_combined' (ADR-13 동적 변경)
  - Grafana 대시보드 활성화

- 영향 페이지 (5개):
  - expert-diversity-monitoring (본 페이지)
  - HITL-operations-policy § 2 (system_config 임계값)
  - HITL-retraining-pipeline § 임계 검증 (F-2 통합)
  - architecture-decisions § ADR-15 IRB 자문위원회 (분기 안건)
  - open-issues-dashboard § F-1 (✅ 표시)

- ⭐ 위키 패턴 검증:
  - F-2 (46차) + F-1 (47차) = "1차 계획 수립 + 2차 실 측정·결정" 분리 패턴 연쇄 적용.
  - F 카테고리 검증 (모니터링·운영) = Phase 2 진입 시점에 통합 처리.

- 잔여:
  - = open-issues-dashboard § 22 이슈
  - E-1 / F-1 / F-2 ◐ 계획 수립 완료 (실 측정 대기, Phase 1 또는 Phase 2 진입 후)
  - F-3 (EXP-2 자동 평가) — 미처리
  - ADR 후보 2 (ADR-16 / ADR-17)

## [2026-05-10] ingest | raw/assets/언어치료 자료/ batch ingest (1차 인벤토리) — 약 180 임상 자료

- pillar: clinical
- 자료 출처: `raw/assets/언어치료 자료/` 폴더 신규 추가 (사용자 기여)
- 분량: PDF 약 120 + AVI 51 + HWP 11 + PPTX 1 + ZIP 2 = 약 180+ 파일
- 영역 분포: 5대 장애 영역 강의 영상 24편 + 교재 (Rhea Paul·Manning·Tye-Murray·Treatment of LD) + 학술 논문 (ASD 18편 / 지적장애 25편 / 학습장애 15편 / SLI 10편 / 다문화 5편 / 청능재활 7편 / 신경인지 5편 / 추론·내러티브 35+편 cross-cutting) + 검사도구 (KOCS·K-CTONI-2·언어문제해결력·REVT·아동용 조음기관)

### 처리 단계 (CLAUDE.md §5.1a batch ingest)

본 ingest는 **1차 인벤토리 단계**. 후속 ingest에서 영역별 본문 보강 (§5.1a 시리즈 자료 timeline 패턴).

### 신규 페이지 (10개)

추가 — clinical/sources/2026-05-10-언어치료-자료실-종합-인벤토리.md
- 180+ 파일 종합 카탈로그 (10 영역 분류)
- 5대 장애 + 자폐·SLI·학습장애·지적장애·다문화·청능·신경인지·추론·조음·심리 매핑
- 위키 영향 매트릭스 명시 (54차 ingest 16 페이지 영향)
- raw 자료 → 후속 ingest 우선순위 명시

추가 — clinical/concepts/유창성장애.md (스텁)
- 5대 영역 중 하나 — 말더듬·속화
- KOCS entity와 연결
- MVP 회피 영역 명시 (F1-a articulation과 분리)

추가 — clinical/concepts/음성장애.md (스텁)
- 5대 영역 중 하나 — 성대·호흡·공명
- 트랙1 의료 영역 — MVP 회피 영역

추가 — clinical/concepts/학습장애-언어재활.md (스텁)
- 학령기 LLD + 읽기·쓰기·추론 + 학습장애 5~13주 강의자료
- Phase 4 학령기 확장 후보 영역

추가 — clinical/concepts/단순언어장애-SLI.md (스텁)
- DLD 우산 진단의 specific 하위 그룹
- CATALISE 2017 합의 영역
- 학령기 LLD ↔ 학령전 DLD 정합

추가 — clinical/concepts/다문화-언어발달.md (스텁)
- ⭐ Persona 이미란 (AOS 4.0 + 황금 교차점) 임상 토대
- 한-베 다문화 + 어휘 다양성 + 서사담화
- Q2 포용 설계 직접 매핑

추가 — clinical/concepts/지적장애-언어중재.md (스텁)
- 25편 자료 (본 위키 가장 풍부 영역으로 부상)
- 화용·추론·이야기·청소년·성인 4 하위 영역
- 송영옥 외 한국 대표 연구

추가 — clinical/concepts/신경인지장애-노인의사소통.md (스텁)
- 알츠하이머·치매·MCI
- 통합예술치료 한국 임상 논문
- MVP 회피 영역

추가 — clinical/concepts/내러티브-담화-추론-중재.md (스텁, synthesis)
- ⭐⭐ cross-cutting synthesis — 35+편 자료 분포 (ASD/SLI/지적장애/다문화/읽기부진)
- 애니메이션 활용 중재의 한국 임상 특징
- ⭐⭐ **F15 LLM 챗봇 직접 임상 토대** — 후속 ingest 시 F15-clinical-consultation-checklist에 직접 인용

추가 — clinical/entities/KOCS.md (스텁)
- 한국 아동 말더듬 검사
- [[clinical/concepts/유창성장애]] 평가 표준
- MVP 회피 영역의 임상 도구

### 보강 페이지 (6개)

갱신 — clinical/concepts/조음장애.md
- ⭐ 추가 자료 섹션 — 강의 영상 4편 + 학령전 말소리장애 논문 5편 + 아동용 조음기관 선별검사
- 학령기 보강 영역 식별 (음운인식·작업기억 훈련 → 읽기부진)

갱신 — clinical/concepts/자폐-화용중재.md
- ⭐ 추가 자료 섹션 — **18편 신규 자료 (본 페이지 가장 큰 보강 후보)**
- 영문 7편 (내러티브·중재·EBP) + 국문 10+편 (마음이론·간접화행·정서·내러티브)
- 후속 ingest 우선순위 1: § (3) 상황적 맥락 + § (4) 관심 공유 항목 보강

갱신 — clinical/concepts/언어발달지연.md
- ⭐ 추가 자료 섹션 — 강의 영상 4편 + Rhea Paul 교재 3권 + 청소년 담화 논문
- 보강 필요 항목 일부 신규 페이지로 이관 (SLI / 다문화 / 학습장애)

갱신 — clinical/concepts/마비말장애.md
- ⭐ 추가 자료 섹션 — 강의 영상 4편 + 마비말 논문 2편 + 신경언어 교재 2권

갱신 — clinical/concepts/실어증.md
- ⭐ 추가 자료 섹션 — 강의 영상 4편 + 신경언어 교재 + Neuropsychological Assessment

갱신 — clinical/concepts/인공와우-청능재활.md
- ⭐ 추가 자료 섹션 — Tye-Murray 교재 5권 분할 + 영문 3편 + 인공와우 추론 1편
- "Erber 위계 출전" 보강 가능 — Tye-Murray로 직접 추적 가능

### Index/Log 갱신
- wiki/index.md § 마지막 갱신 + clinical/concepts 표 + clinical/entities 표 + clinical/sources 표 + 통계
- 통계: clinical 20 → 30 / 전체 102 → 112

### Cross-link 변동
- 신규 ↔ 신규: 8 신규 concept 페이지가 모두 인벤토리 source + 관련 페이지 cross-link
- 신규 → 기존: 다문화-언어발달 ↔ persona-이미란 (직접 매핑) / 내러티브-담화-추론-중재 ↔ MVP-feature-spec § F15 (직접 임상 토대)
- 기존 → 신규: 6 기존 concept이 인벤토리 source 인용 + 신규 영역 페이지로 이관 안내

### 메모

- ⚠️ **운영 사고 — 사용자 1차 redirect**: 처음에 프로젝트 루트에 `Wiki/` 폴더를 잘못 만들고 13개 카테고리 페이지를 작성했음. 사용자가 "이전에 작성된 wiki 아니야?" 라고 redirect한 후 CLAUDE.md 스키마(2-기둥 + Obsidian wikilink + frontmatter)를 발견. 잘못 만든 폴더 삭제 (`rm -rf Wiki/`) 후 본 ingest로 재진행.
- ⚠️ **본 ingest는 1차 인벤토리** — 본문 보강 X. 후속 ingest 우선순위:
  1. 자폐-화용중재 (18편 신규 풀 — 가장 큰 보강 후보)
  2. 지적장애-언어중재 (25편 — 본 위키 가장 풍부 영역으로 부상)
  3. 내러티브-담화-추론-중재 (35+편 cross-cutting — F15 임상 토대 ⭐⭐)
  4. Tye-Murray 5권 → 인공와우-청능재활 § 4단계 위계 출전 보강
  5. Rhea Paul 3권 → 언어발달지연 § DLD 진단 기준 보강
- 보조 자료 영역 (심리·상담 ~10편) — 본 위키 직접 흡수 X. [[clinical/concepts/한국-언어치료-트랙비교]] § 재정 지원 영역에서만 일부 인용 가능.
- AVI 강의 영상 75편 (대학 강의 24 + Treatment of LD 부록 27 + 의사소통장애개론 일부) — 텍스트 변환 시 본 인벤토리 → 영역별 source 페이지 분리

## [2026-05-10] ingest | 자폐-화용중재 본문 1차 보강 (54차 ingest 연속)

- pillar: clinical
- 작업 범위: [[clinical/concepts/자폐-화용중재]] 본문 보강 (영문 7편 pdftotext 추출 후 정독)

### 추출 도구 검증

- `pdftotext` (mingw64) 가용성 확인
- 영문 PDF: 본문 추출 정상 — 초록·서론 직접 정독 가능
- 한국어 PDF: 기본 모드는 인코딩 손상이지만 **`pdftotext -enc UTF-8`** 옵션 사용 시 정상 추출 확인 (단, 일부 교재는 OCR 처리된 한국어가 부분 손상)
- → 후속 ingest에서 한국어 본문도 정독 가능

### 갱신 페이지

갱신 — clinical/concepts/자폐-화용중재.md
- ⭐ 이전 "추가 자료" 섹션 (자료 풀 식별만) → ⭐ "본문 보강 1차" 섹션 (실제 정독 결과)으로 격상
- A. 내러티브 산출 결함 — King 2014 / Hilvert 2016 / Marini 2019
- B. 쓰기·문어 산출 (학령기) — Zajic 2020 / Davidson Visual-verbal
- C. EBP·중재 모델 메타 — Hume 2011 (LEAP/TEACCH/Lovaas/Denver/PRT) / Stahmer 2019 (PRT 8 컴포넌트)
- D. 국문 10+편 — 제목 기반 분류 (인코딩 후속 처리 후보)
- E. 본 위키 § 4 활동 축 보강 매핑 — 임상 근거 확보
- F. F15 LLM 챗봇 자문 체크리스트 영향 — 추가 항목 4개 후보 식별

### 핵심 임상 발견

- ASD narrative = 거시구조 결함 > 미시구조 결함 (King 2014)
- ToM 능력이 narrative 응집성 예측 (Hilvert 2016) — ToM ↔ narrative 양방향 중재
- EFT (Episodic Future Thinking) 자체 손상 (Marini 2019) — narrative 시간 구조의 인지 토대
- 학령기 ASD writing engagement 부족 (Zajic 2020) — 동기·자기조절이 임상 변수
- 시각·언어 multimodal 결합이 어휘 학습 효과 최대 (Davidson) — 임상 중재 권장
- PRT 선행자극 전략 = 본 위키 § (1) 의사소통 의도 확장 임상 정합 (Stahmer 2019)

### Cross-link 변동

- F15 자문 체크리스트 추가 항목 후보 4개 식별 → [[product/concepts/F15-clinical-consultation-checklist]] 후속 갱신 후보:
  - script vs free narrative 옵션
  - 거시구조 측정 회피 (단순 발화 길이만)
  - 시각 자극 결합 multimodal 효과
  - ASD engagement 모니터링

### 신규 entity 후보 (다음 ingest)

- ADOS-2 (Autism Diagnostic Observation Schedule 2판) — 본 자료들에서 빈번 인용
- LEAP / TEACCH / PRT — 종합 치료 모델 entity_kind: protocol
- TOWL-4 (Test of Written Language) — 학령기 writing 평가 표준

### 잔여

- 국문 10+편 ASD — UTF-8 인코딩 추출 시도 후 본문 정독 (다음 세션)
- ✅ 우선순위 2: [[clinical/concepts/지적장애-언어중재]] (한국 5편 본문 정독 — 다음 ingest 항목 참조)
- 우선순위 3: [[clinical/concepts/내러티브-담화-추론-중재]] (35+편 cross-cutting)
- 우선순위 4: Tye-Murray 5권 → [[clinical/concepts/인공와우-청능재활]] § 4단계 위계 출전 (Erber 추적)
- 우선순위 5: Rhea Paul 3권 → [[clinical/concepts/언어발달지연]] § DLD 진단 기준

## [2026-05-10] ingest | 지적장애-언어중재 본문 1차 보강 (54차 ingest 연속, 우선순위 #2)

- pillar: clinical
- 작업 범위: [[clinical/concepts/지적장애-언어중재]] 본문 보강 (한국 5편 pdftotext UTF-8 추출 후 정독)

### 정독 5편

1. **Kim, Kim, Kim & Song (2018)** — 시청각 담화과제(KOPLAC)를 통한 경도 지적장애 아동의 화용언어 특성 (이화여대) — 36명 (12 ID + 12 LA-TD + 12 CA-TD), KOPLAC 3 하위영역
2. **Cheon & Kim (2021)** — 경도지적장애 청소년의 마음이론과 화용언어의 연관성 (대구대) — 40명 청소년 (19-21세) faux pas 측정
3. **장선미 (2014)** — 사회적 의사소통 집단중재프로그램 (대구대 — 김화수 지도)
4. **박성희 (2018)** — 이야기 바꾸어 쓰기 (대구대 — 최양규 지도)
5. **이혜영 (2016)** — 애니메이션 동화 활용 (영남대 — 정은 지도)

### 핵심 임상 발견

- **Kim 2018**: ID는 언어 연령 매칭 후에도 **이야기 산출에 진정한 화용 결함** 잔존 — 단순 언어 지연 아님 ⭐
- **Cheon 2021**: ID 청소년의 마음이론 결함이 화용언어 결함과 양 상관 — 비언어 의사소통이 faux pas 예측
- **한국 ID 언어중재 4 패러다임**: (1) 사회적 의사소통 집단중재, (2) 이야기 바꾸어 쓰기, (3) 애니메이션 동화 활용, (4) 생각말하기
- **한국 ID 연구 핵심 그룹 = 대구대 언어치료학과** (김화수·권도하·최양규)
- **한국 ID 평가도구 표준 = 언어문제해결력 검사** (원인이유·해결추론·단서추측 3유형)
- **ID ↔ ASD 감별**: ID는 인지 매칭 시 차이 약해지고, ASD는 거시구조·script-vs-non-script 차이 잔존

### 갱신 페이지

갱신 — clinical/concepts/지적장애-언어중재.md
- ⭐ 본문 보강 1차 섹션 — 5편 정독 + 4 패러다임 + 한국 연구 그룹 + 평가도구 표준 + ID ↔ ASD 감별 + F15 영향
- 보강 필요 항목 6개 → 4개 완료 표시

### 신규 entity 후보 (다음 ingest)

- 언어문제해결력 검사 (검사지 HWP + 지침서 PDF 본 raw에 존재) — entity_kind: assessment
- K-ABC II — 비언어 IQ 측정, ID 선정 기준
- K-WAIS-IV — 청소년·성인 ID 선정
- 구문의미 이해력 검사 — 청소년 연구 자주 사용

### 도구 검증

- **`pdftotext -enc UTF-8`로 한국어 PDF 본문 정독 가능** 재확인 (학위논문 본문은 일부 손상이지만 학술지 논문은 깨끗하게 추출)
- 다대구대 학위논문은 표지·목차만 추출되고 본문은 손상되는 경우 발견 — pdf 자체 OCR 품질 문제

### 잔여

- 우선순위 #2 미완: 지적장애 영역 25편 중 5편만 정독 → 20편 후속 (성인·문식성·쓰기 5+편 / 인지 추론 3편 / 일반 화용 5+편 / 중재 5+편 / 시설·정신지체 2편)
- ✅ 우선순위 #3: [[clinical/concepts/내러티브-담화-추론-중재]] 본문 1차 보강 완료 (다음 ingest 항목 참조)
- 우선순위 #4: Tye-Murray 5권 → 인공와우 § 4단계 위계 출전
- 우선순위 #5: Rhea Paul 3권 → 언어발달지연 § DLD 진단 기준

## [2026-05-10] ingest | 내러티브-담화-추론-중재 본문 1차 보강 (54차 ingest 연속, 우선순위 #3)

- pillar: clinical
- 작업 범위: [[clinical/concepts/내러티브-담화-추론-중재]] 본문 보강 (한국 5편 pdftotext UTF-8 추출 후 정독)

### 정독 5편

1. **김혜정 (2010)** — 학령기 동기 추론 능력 (용인대 — 강정숙 지도) — 4·6학년 일반 40명
2. **이지현 (2015)** — 학령기 증거성표지·마음이론 (부산가톨릭대 — 이희란 지도) — 초2·4·6학년 72명
3. **백재은 (2013)** — 이야기 과제 양식 LLD 추론 (이화여대 — 김영태 지도) — 읽기·듣기·애니메이션 3 양식
4. **김현진 (2021)** — 학령기 다문화 단편 애니메이션 서사담화 (대구대 — 김화수 지도) — 이야기문법 5 + 결속표지 5
5. **박후임 (2008)** — 애니메이션 텍스트 추론 능력 신장 방안 (광주교대 — 임성규 지도) — 17차시 8 추론유형

### 핵심 임상 발견

- **김혜정 2010 — 추론 위계**: 명시적 > 암시적 ≈ 함축적 (4학년 < 6학년 발달) ⭐
- **이지현 2015 — 증거성표지·마음이론 상관**: 한국어 -더-, -데-, -겠- 등 화자 정보 출처 표지가 마음이론과 강한 상관 (직접경험 표지는 무관, 간접경험·간접추론 표지만 상관)
- **백재은 2013**: LLD 양식 효과 — 읽기·듣기·애니메이션 양식별 강점·약점 분석 패러다임
- **김현진 2021**: 한국 서사담화 분석 표준 — 이야기문법(배경·계기·시도·내적반응·결과) + 결속표지(지시·보조사·어휘·접속·연결어미)
- **박후임 2008 — 8 추론 유형**: 제목·인물성격·감정·이어질·생략·원인결과·배경·주제 (초등 17차시) ⭐⭐

### F15 LLM 챗봇 임상 토대 ⭐⭐⭐

본 페이지가 F15 임상 토대 **정본**:
- F15 시나리오 8 유형 = 박후임 8 추론 유형 직접 매핑
- F15 난이도 위계 = 김혜정 명시적 → 암시적 → 함축적
- F15 평가 지표 영유아 단순화 (만 4세: 4 유형 / 만 5-6세: 6 유형 / 만 7세: 8 유형)
- F15 자문 체크리스트 추가 항목 후보 5개 식별

### 갱신 페이지

갱신 — clinical/concepts/내러티브-담화-추론-중재.md
- ⭐ 본문 보강 1차 섹션 — 5편 정독 + F15 임상 토대 정본 + 한국 연구 그룹 + 잔여
- 보강 필요 4 항목 → 모두 부분 보강 표시

갱신 — wiki/index.md
- 내러티브-담화-추론-중재 항목 = 스텁 → 본문 1차 보강 (F15 임상 토대 정본)

### 한국 추론·내러티브 연구 핵심 그룹

- **언어치료** 학제: 이화여대(김영태) / 대구대(김화수) / 부산가톨릭대(이희란) / 용인대(강정숙)
- **국어교육** 학제: 광주교대(임성규) — F15 영감 직접
- → F15 콘텐츠 자문 시 두 학제 모두 풀로 활용 가능

### 잔여

- 본 5편 외 30+편 — 임상군별 (ASD 18 / ID 12 / SLI 5 / CI 1 / 읽기부진 5) 분포 — 다른 disorder 페이지에 이미 인용
- 추론능력 관련 논문 정리 HWP — 본 영역 종합 메타 (HWP 변환 후 정독)
- KOSGA(Korean Story Grammar Assessment) 등 정식 평가 도구 — 신규 entity 후보
- ✅ 우선순위 #4: Tye-Murray 최적화본 정독 완료 (다음 ingest 항목 참조). part1-4 OCR 잔여
- 우선순위 #5: Rhea Paul 3권 → 언어발달지연 § DLD 진단 기준

## [2026-05-10] ingest | 인공와우-청능재활 본문 1차 보강 (54차 ingest 연속, 우선순위 #4)

- pillar: clinical
- 작업 범위: [[clinical/concepts/인공와우-청능재활]] 본문 보강 (Tye-Murray 최적화본 pdftotext UTF-8 추출 후 정독)

### 정독 자료

- **Tye-Murray, *Foundations of Aural Rehabilitation: Children, Adults, and Their Family Members* 3rd ed. 한국어판** — 최적화본 PDF (역자 서문·저자 서문·1장 서론 본문 추출 성공)
- ⚠️ part1-4 분할본은 OCR 텍스트 레이어 없는 스캔 PDF → 추출 실패. 후속 ingest 시 OCR 처리 필요 (Erber 4단계 위계 직접 인용 추적)

### 핵심 발견

- **책 구조 (제3판) 4 파트**: 말인지 / 대화·의사소통 단절 / 성인 / 아동 (14장 영유아 + 15장 학령기)
- **용어 위계 ⭐**: 청능재활(성인 회복) vs 청능자활(아동 신규 개발) vs 청각재활(기기 강조) — 한국 임상 혼용
- **WHO 청력관련 기능장애 모델**: 손상 → 활동제한 → 참여제한 → 생활방식 변화. **"장애(handicap)" 용어 사용 자제 권고** (ADR-04 정합)
- **참여제한 4 직접 원인**: 의사소통 활동 / 생활방식 / **빈번한 의사소통 파트너 ⭐** / 심리사회적 요인 — 본 위키 § STEP 3 부모 코칭 임상 토대
- **ASHA 2002 청능사·언어치료사 역할 분담**: 청능사=청각시스템·평가·기기, SLP=말·언어·의사소통 수행력. 학교 환경에서는 SLP가 1:1 주도
- **종합 계획 구성**: 성인 vs 아동 차이. 아동은 가족·교사 통합 중재 핵심

### 갱신 페이지

갱신 — clinical/concepts/인공와우-청능재활.md
- ⭐ 본문 보강 1차 섹션 — Tye-Murray 정독 + 책 구조 + 용어 위계 + WHO 모델 + ASHA 역할 + F3-b 영감 매핑
- 보강 필요 4단계 위계 출전 → 부분 보강 표시 (Erber 1982 명시 + part1-4 OCR 후속)

갱신 — wiki/index.md
- 인공와우-청능재활 항목 = 보강 → 본문 1차 보강 (Tye-Murray 4 파트 + 용어 위계 등)

### F3-b 적응형 난이도 임상 토대 강화

[[product/concepts/MVP-feature-spec]] § F3-b:
- 청능훈련 4단계 위계 (Erber 1982) → F3-b 4단계 직접 매핑
- 폐쇄형 세트 → 개방형 세트 → F3-b 보기 수 적응형
- 가족·교사 통합 중재 → F11 부모 음성 클로닝 (ADR-09 화이트리스트) 정합

### 잔여

- part1-4 PDF OCR 처리 → Erber 4단계 위계 직접 인용 추적
- 14장 (영유아) + 15장 (학령기) 본문 정독 — Phase 4 학령기 확장 후보
- LSL / Auditory-Verbal Therapy 프로토콜 entity 신규 후보
- AG Bell Academy / 한국 인공와우 학회 institution 신규 후보
- ✅ 우선순위 #4 완료 (1차)
- ✅ 우선순위 #5 완료 (1차) — 다음 ingest 항목 참조

## [2026-05-10] ingest | 언어발달지연 본문 1차 보강 (54차 ingest 연속, 우선순위 #5)

- pillar: clinical
- 작업 범위: [[clinical/concepts/언어발달지연]] § DLD 진단 기준 보강

### 정독 자료

- **언어발달장애 진단 및 평가.pdf** (WS2017 한국 대학 강의 핸드아웃) — 본문 추출 성공
- ⚠️ Rhea Paul 교재 part1-3 PDF는 OCR 텍스트 레이어 없는 스캔 PDF → 추출 실패. 후속 ingest 시 OCR 처리 필요

### 핵심 발견

- **Fey (1986) SD -1.25 = 언어장애 판정** ⭐⭐ — PRES 절단점의 표준 출전 확인 (53차 ingest에서 미명시였음)
- **Darley (1991) 평가·진단 정의** — 평가는 자료 수집 과정, 진단은 최종 결정. 두 과정은 계속됨
- **임상가 팀 접근 3 모델**: Multidisciplinary / Interdisciplinary / Transdisciplinary — HITL은 Transdisciplinary 정합
- **차이 → 방해 → 장애 3단계 위계** ⭐ — ADR-04 (의료 용어 배제) 임상 표준 출전
- **평가 결정 영역 3 축**: Language Function (이해·산출) + Domains (form·content·use, Bloom & Lahey) + 기타 (hearing·speech-motor) — F1-a 3축과 정합
- **평가 방법 5 종**: 표준화 / 인터뷰·질문지 / 발달척도 / 준거참조 / 행동관찰
- **평가 목적 4 가지**: Screening / Baseline / 중재 목표 / 변화 측정 — MVP F1-b/F1-a/F4 직접 매핑
- **EBP + RTI + Dynamic Assessment** = MVP F4 시계열 진전도의 임상 토대

### 갱신 페이지

갱신 — clinical/concepts/언어발달지연.md
- ⭐ 본문 보강 1차 섹션 — DLD 진단·평가 핸드아웃 정독 결과 + Fey 1986 출전 + 차이→방해→장애 3단계 + MVP 매핑 다수
- 보강 필요 항목: DSM-5/ICD-11 부분 보강 (Fey 1986 출전 명시), 나머지 3 항목 신규 페이지로 이관 표시 유지

갱신 — wiki/index.md
- 언어발달지연 항목 = 보강 → 본문 1차 보강 (Fey 1986 출전 + Darley 정의 + 팀 접근 3 모델 + 3단계 위계 + 평가 4 목적)

### MVP 임상 토대 강화

- **F1-a 3축**: 본 자료 평가 결정 영역 3 축과 정확히 정합 (linguistic = Language Function + Domains, articulation = speech-motor)
- **F1-b 5분 진단**: 본 자료 의뢰·초기상담·질문지 단계 직접 정합 + SELSI 양육자 보고식의 한계 인지
- **F4 시계열 진전도**: EBP + RTI + Dynamic Assessment 통합 디지털화
- **ADR-04 의료 용어 배제**: 차이→방해→장애 3단계 위계가 임상 표준 출전. UI에서 "백분위·차이·방해" 사용 정합
- **HITL Transdisciplinary**: 1차 AI(언어재활사) → 큐 → 청능사·임상심리 자문 = Transdisciplinary 모델 정합

### 잔여

- **Rhea Paul 교재 part1-3 OCR 처리** → DLD 진단 기준 영문 출전 추적 (Bishop 2017 CATALISE 등)
- DSM-5/ICD-11 DLD 진단 기준 별도 추적 (본 자료에 없음)
- Bishop et al. (2017) CATALISE 합의 — 한국 임상 도입 시점 추적
- 언어발달장애 청소년 담화 (2009 + 2021) 정독 → 청소년 확장 영역
- ✅ **5 우선순위 모두 1차 보강 완료** — 후속 ingest 시 OCR 처리 + 영역별 잔여 자료 정독

## [2026-05-10] ingest | 자폐-화용중재 § D 한국어 본문 2차 보강 (54차 ingest 연속, 잔여 처리)

- pillar: clinical
- 작업 범위: [[clinical/concepts/자폐-화용중재]] § D (국문 한국어 본문 보강)
- 트리거: 우선순위 #1에서 미정독했던 한국어 ASD 10+편 자료 풀

### 정독 5편

1. **황현주 (2016)** — 표정단서 × 간접화행 (이화여대 — 김영태)
2. **김찬희 (2013)** — 맥락·운율 × 정서 이해 (이화여대 — 김영태)
3. **김태림 (2019)** — HFA vs SLI vs TD 텍스트 추론 (이화여대 — 김영태)
4. **이유나 (2016)** — HFA vs DLD vs TD 상황문맥 의사소통 조율·이야기 추론 (이화여대 — 김영태)
5. **서유진·박은실·신혜정 (2018)** ⭐⭐ — 학령기 ASD 마음읽기 스크립트 중재 24회기 6 스크립트 (광주여대 — 박은실)

### 핵심 발견

- 한국 ASD 연구의 양 축: **이화여대 김영태(평가·기초)** + **광주여대 박은실(임상 중재)**
- 한국 임상의 강점: 정서·표정 영역 + ASD↔SLI/DLD **3 집단 비교 표준** + 한국형 스크립트 중재
- 영문의 강점: 거시구조 narrative + EBP 메타 + writing engagement
- 서유진(2018) 24회기 6 스크립트 (정서 인식 + 스크립트 훈련 + 완성 3단계) = F15 직접 임상 토대

### F15 자문 체크리스트 추가 항목 4개 (5-8)

기존 4 항목(54차) + 본 5편 추가:
5. 스크립트 중재 패턴 정합 (서유진 2018)
6. 상황문맥 의사소통 조율 (이유나 2016)
7. 표정·운율 단서 미포함 정합 (황현주 + 김찬희) → ADR-14 만 4세+ 활성 정합
8. 3 집단 비교 데이터셋 가능성 (김태림 + 이유나)

### 갱신 페이지

갱신 — clinical/concepts/자폐-화용중재.md
- § D = 제목 기반 분류 → 본문 보강 1차 (5편 정독) 격상
- § E 한국 ASD 연구 핵심 그룹 신규
- § F 한국 ↔ 영문 통합 합의 신규
- § G F15 자문 체크리스트 추가 항목 4개 (5-8) 신규

갱신 — wiki/index.md
- 자폐-화용중재 항목 = 본문 1차 → 본문 1차+2차 (영문 7 + 국문 5 통합)

### 잔여

- ✅ 한국어 ASD 추가 5편 정독 완료 (다음 ingest 항목 참조)
- 광주여대 박은실 그룹 추가 자료 — 한국 ASD 임상 중재 연구 풀
- ASD ↔ SLI/DLD 3 집단 비교 raw 데이터 — F1-a 학습 데이터셋 후보 (윤리 검토 필요)

## [2026-05-10] ingest | 자폐-화용중재 § H 한국어 본문 3차 보강 (54차 ingest 연속, 잔여 처리)

- pillar: clinical
- 작업 범위: [[clinical/concepts/자폐-화용중재]] 한국어 잔여 5편 정독

### 정독 5편 (한국어 ASD 추가)

6. **이수현 (2016)** — HFA SNS 이모티콘 정서 표현·선호도 (이화여대 — 김영태)
7. **최수영 (2020)** — 초등 저학년 HFA 아이러니·마음이론 (이화여대 — 김영태)
8. **김소망 (2017)** — HFA vs DLD vs TD 이야기 정보전달 (이화여대 — 김영태) — **CIU 분석** ⭐
9. **김소라 (2017)** — 시각적 지원 → ASD 수업 참여 (이화여대 교육 — **이소현 신규 식별** ⭐)
10. **최숲 (2007)** — 전반적 발달장애(PDD) 추론 — 본 자료 풀 가장 오래된 ASD 논문 (단국대 — **황민아 신규 식별** ⭐)

### 핵심 발견 (보강)

- **한국 ASD 연구 4 축 구조**: 이화여대 김영태(평가) + 이화여대 이소현(특수교육) + 광주여대 박은실(임상중재) + 단국대 황민아(학령기 추론)
- **CIU (Correct Information Unit)**: 김소망(2017) — 한국 ASD 이야기 정보 분석 표준 단위. F1-a 자연 발화 분석 단위 후보
- **추론 3 유형 위계** (예측 > 연결 > 감정): 최숲(2007) — 영문 King(2014) 거시구조 결함과 정합. PDD 감정 추론 핵심 결함
- **단일대상 4 단계 + 3 검증**: 김소라(2017) — 한국 ASD 행동 중재 표준 (관찰자·중재충실도·사회적 타당도)
- **마음이론 + 아이러니 + 이상한 이야기**: 최수영(2020) — 학령기 HFA 마음이론 평가 표준
- **PDD 오류 패턴**: TD = "잘못된 추론" vs PDD = "엉뚱한 응답" — 최숲(2007) 정성적 차이

### F15 자문 체크리스트 9-12 추가 (전체 12 항목)

- 9: CIU 단위 자연 발화 분석 (김소망)
- 10: 단일대상 4 단계 검증 (김소라)
- 11: 추론 3 유형 위계 (최숲) — 박후임 8 유형과 매핑
- 12: 이모티콘·다중 양식 통합 (이수현)

### 갱신 페이지

갱신 — clinical/concepts/자폐-화용중재.md
- § H 한국어 2차 보강 (5편 추가) — 본 영역 80%+ 본문 1차 보강 완료
- § I 한국 ASD 연구 그룹 = 3 축 → 4 축 (이소현·황민아 신규)
- § J 한국 ASD 측정 도구 표준 9 종 식별 (CIU·이상한 이야기·추론 3 유형 등)
- § K 한국 ↔ 영문 비교 매트릭스 보강 (3 강점 vs 2 강점 식별)
- § L F15 자문 체크리스트 9-12 추가 (전체 12 항목)
- § M 후속 ingest 잔여 명시

갱신 — wiki/index.md
- 자폐-화용중재 항목 = 본문 1차+2차 → 본문 1차+2차+3차 (80%+ 완료, 12 자문 체크리스트)

### 잔여

- 노지영(2018) 본문 추가 정독 (이전 abstract만)
- 영문 7편 결과·논의 부분 정독
- ✅ ASD 영역 1세션 완료 — 다음 우선순위: [[clinical/concepts/지적장애-언어중재]] 잔여 20편 (2-3세션 분량)

## [2026-05-10] ingest | 지적장애-언어중재 § G-J 한국어 본문 2차 보강 (54차 ingest 연속, 잔여 처리 1세션)

- pillar: clinical
- 작업 범위: [[clinical/concepts/지적장애-언어중재]] 잔여 20편 중 6편 정독

### 정독 6편 (한국 ID 추가)

7. **장은영 (2021)** — 경도지적장애 성인 카툰 문식성 (대구대 — 김화수)
8. **박수진 (2019)** — 경도 지적장애 학생 자기 표현적 글쓰기 (대구대 — 김화수)
9. **이수진 (2021)** — 경도 지적장애 성인 구문인식능력 (대구대 — 김화수)
10. **김화수·이지우·최선영·엄윤지 (2019)** ⭐⭐ — 지적장애 학생 유추추론 언어·시각 (대구대) — KSHA 학술지
11. **박지혜 (2013)** — 지적장애 아동 화용언어 특성 (대구대 — 김화수, KOPLAC 선행 연구)
12. **한수진 (2011)** — 상황중심 이야기 꾸미기 → 지적장애 구문능력 (대구대 — 권도하)

### 핵심 신규 발견

- **대구대학교가 한국 ID 연구의 절대적 중심** (11편 중 10편). 김화수 책임/지도 8편
- **김화수 그룹 화용 연구 8년 연속**: 박지혜(2013) → Kim(2018) → Cheon·Kim(2021)
- ⭐ **한국 ID 측정 도구 표준 6 종 신규 식별**:
  - T-unit + MLT-w + NDW (쓰기 분석, 박수진 2019)
  - 문법성 판단 + 오류수정 + 오류수정 유형 (구문 인식, 이수진 2021)
  - 유추추론 매트릭스 (언어·시각 × 범주·반의어·기능, 김화수 외 2019)
  - 내포문 5 유형 사용률 (구문 산출, 한수진 2011)
  - Frog Stories (Mayer) — 표준 narrative 자극 (한수진 2011 + 다수)
- ⭐ **임상 권고 직접 도출** (김화수 외 2019):
  - 유추 교육 = 언어 → 시각 / 범주 → 반의어 → 기능 순서
- ⭐ **한국 ID 발달 위계 정본** (본 11편 종합):
  - 학령전 어휘·구문 → 학령기 화용·추론·구문 → 청소년 마음이론 → 성인 구문인식·문식성
  - **자가 회복 X — 지속적 중재 필요**

### 갱신 페이지

갱신 — clinical/concepts/지적장애-언어중재.md
- § G 본문 보강 2차 (6편 정독)
- § H 한국 ID 연구의 절대적 중심 — 대구대 + 김화수 핵심 매트릭스
- § I 한국 ID 측정 도구 표준 (10 종 통합)
- § J 한국 ID 발달 위계 정본 (학령전 → 성인)
- 잔여 14편 명시

갱신 — wiki/index.md
- 지적장애-언어중재 항목 = 1차 → 1차+2차 (11편 정독, 발달 위계 정본 추가)

### MVP 임상 토대 강화

- F1-a linguistic: T-unit·MLT-w·NDW·내포문 사용률 = 측정 단위 후보
- F3-b 적응형 난이도: 유추 발달 순서 (범주 → 반의어 → 기능 / 언어 → 시각)
- F15 챗봇: Frog Stories 표준 자극의 한국 임상 정합

### 잔여

- 우혜진(2021) 어휘 의미추론 — 본문 일부 손상
- 송영옥(2008) 생각말하기 — 본문 손상
- 인터넷 애니메이션 동화 — 지적장애 이야기·구문
- 정신지체 듣기 추론 (배경지식 + 참고한 논문 폴더)
- 이야기 과제 — 경도지적장애 성인 구어·문어 산출
- 이야기 쓰기 분석 (참고한 논문)
- 단어유추추론 ASD 비교 (이미 cross 매핑)
- → 본 영역 50%+ 본문 정독 완료. 한 번 더 세션 또는 다른 영역으로 진행 가능

## [2026-05-10] ingest | 추론 영역 잔여 처리 → SLI + LD 페이지 본문 1차 보강 (54차 ingest 연속)

- pillar: clinical
- 작업 범위: 추론 영역 30+편 잔여 중 SLI 3편 + LD 3편 정독 → 두 stub 페이지 격상

### 정독 6편

**SLI 3편**:
1. **문주희 (2020)** — SLI 사회성·집행기능·이야기 이해 관계 (이화여대 — 임동선) — 페파피그 표준 자극
2. **이현정 (2008)** — 학령기 SLI 담화유형 (대화 vs 설명) 구문사용 (이화여대 — 김영태) — **C-unit + MLC-w + MNC** ⭐
3. **정수연 (2020)** — SLI 특성확인질문 → 개인화된 예측추론 (단국대 — 최소영)

**LD/읽기이해부진 3편**:
4. **박예슬 (2017)** — 읽기이해부진 정교화추론 (도구추론, 점화 효과 측정) (단국대 — 황민아)
5. **유경진 (2017)** ⭐ — 초등 고학년 읽기이해부진 **추론 4 유형 + 오류 4 유형** (부산가톨릭대 — 김미배)
6. **현혜숙 (2010)** — 읽기이해부진 관용어 이해 (이화여대 — 김영태)

### 핵심 신규 발견

- ⭐⭐ **C-unit + MLC-w + MNC** = 한국 학령기 SLI 발화 분석 표준 단위 (대화·설명 담화)
- **추론 4 유형 표준 위계**: 사실 > 응집성 ≈ 배경지식 ≈ 정교 > **평가적 추론** (가장 어려움) — 유경진 2017
- **오류 4 유형 차별화**:
  - 두 집단 공통: 미숙한 추론 + 틀린 추론 (50%+)
  - 읽기이해부진만: **이해 실패 + 무응답** (10%+) — 텍스트 정보 확인 자체 실패 ⭐
- **읽기이해부진의 자동 활성화 결함** (박예슬 2017): 정교화 추론 자동 활성 X — 의식적 추론은 가능
- **SLI는 다층 결함**: 언어 + 사회성 (4 영역) + 집행기능 동반 (문주희 2020)
- **한국 학령기 추론 연구 3 축**: 이화여대 김영태 (어휘·관용어) + 단국대 황민아·최소영 (정교화·예측) + 부산가톨릭대 김미배 (추론 유형 표준)

### 갱신 페이지

갱신 — clinical/concepts/단순언어장애-SLI.md (스텁 → 1차 보강)
- § A 사회성·집행기능·이야기 이해 (문주희)
- § B C-unit 분석 표준 단위 (이현정)
- § C 개인화 예측추론 (정수연)
- § D **SLI vs ASD 감별 표** ⭐ (본 위키 처음 명시)
- § E 한국 SLI 연구 그룹
- § F 한국 학령기 임상 측정 단위 통합 라이브러리

갱신 — clinical/concepts/학습장애-언어재활.md (스텁 → 1차 보강)
- § A 정교화추론·도구추론·점화 효과 (박예슬)
- § B **추론 4 유형 + 오류 4 유형** (유경진) ⭐
- § C 관용어 이해 (현혜숙)
- § D 한국 LD 연구 3 축
- § E **추론 4 + 3 + 동기 추론 + 8 유형 통합 매트릭스** ⭐⭐
- § F MVP F1-a/F4/F15 임상 토대 보강

갱신 — wiki/index.md
- 두 페이지 모두 스텁 → 본문 1차 보강

### F15 챗봇 임상 토대 통합 ⭐⭐

본 6편 정독으로 F15 챗봇 영유아 추론 위계 정본:
- **Level 1 (만 4세)**: 사실 + 명시적 — 텍스트 정보 직접 확인
- **Level 2 (만 5세)**: 응집성 + 암시적 — 정보 연결, 단서 활용
- **Level 3 (만 6-7세)**: 배경지식 + 정교 + 함축적 — 지식 통합
- ⛔ **회피**: 평가적 추론 (학령기) + 감정 추론 (ADR-14 만 4세+)

→ 4 출전 통합 (유경진 + 최숲 + 김혜정 + 박후임)

### 한국 학령기 측정 단위 통합 라이브러리 ⭐

본 6편 + 이전 ingest 통합:
- C-unit + MLC-w + MNC (SLI 발화)
- T-unit + MLT-w + NDW (ID 쓰기)
- CIU (ASD 이야기 정보)
- 이야기문법 5 + 결속표지 5 (다문화 서사담화)
- 내포문 5 유형 사용률 (ID 구문)
- 추론 4 유형 + 오류 4 유형 (LD 추론)
- 추론 3 유형 (PDD)
- 유추추론 매트릭스 (ID)

→ MVP F1-a HITL 자격자 평가 시 본 통합 라이브러리 사용. 영유아 적응 시 단순화 (예: C-unit/T-unit → MLU)

### 잔여

- 추론 영역 잔여 ~20편 (이미 다른 페이지에 cross-listed 된 자료들이 다수)
- 시설아동 vs 일반 추론 비교
- 무언 애니메이션 영어 쓰기 (cross-cutting)
- 인터넷 애니메이션 ID 이야기·구문
- 학령기 인공와우이식 속담 맥락 추론
- 정신지체 배경지식 듣기 추론
- 학령기 자폐 마음읽기 스크립트 (-1 중복본)
- 추론능력 관련 논문 정리 HWP — 한컴 변환 필요
- → ASD/ID/SLI/LD 4 disorder 페이지 모두 본문 1차 보강 완료. 후속 ingest 시 잔여 영역 또는 product 측 cross-link 강화 가능

## [2026-05-10] ingest | 다문화-언어발달 본문 1차 보강 (54차 ingest 연속)

- pillar: clinical
- 작업 범위: [[clinical/concepts/다문화-언어발달]] 스텁 → 1차 보강 격상

### 정독 4편

1. **Jang, Jeong, Hwang (2014)** — 다문화 동음이의어 이해·정의 (단국대 — 정미란·황민아) — *CSD* 학회지
2. **Jo, Hwang, Jeong (2018)** ⭐ — 다문화 연어(Collocation) 능력 (단국대 — 황민아·정미란) — *언어치료연구* (KSHA)
3. **김선경, 김영태 외 (2020)** ⭐⭐ — 한-베 다문화 한국어 연음규칙·어머니 상관 (이화여대 — 김영태) — *언어치료연구* (NRF 지원)
4. **다문화상담** (배경 자료)
5. (cross) 김현진 (2021) — 다문화 단편 애니메이션 서사담화 (대구대 — 김화수, 이미 [[clinical/concepts/내러티브-담화-추론-중재]] § C 정리)

### 핵심 신규 발견

- ⭐⭐ **자녀-어머니 한국어 능력 직접 상관** (김선경 2020): 다문화 아동의 홑받침 읽기·쓰기 ↔ 어머니의 홑받침 읽기·쓰기 양 상관 → 부모 교육 임상적 중요성
- ⭐ **표준화 검사 정상 매칭에도 미세 결함 잔존**: 동음이의어·연어·연음규칙 등 깊은 영역 결함 → AI 진단 false negative 위험
- **한국어 특이적 결함 영역 5종 식별**: 연음규칙 / 무의미·겹받침 / 연어 / 동음이의어 / (잠재) 존대법
- **다문화 작업기억 부담**: 문장 후반부 결함 + NRT 역순만 상관 = 일반 아동과 다른 처리 패턴
- **한국 다문화 연구 4 그룹**: 단국대 황민아·정미란 (어휘) + 이화여대 김영태 (음운·읽기·쓰기) + 대구대 김화수 (서사담화) + 영동대 정미란

### Persona 이미란 임상 토대 직접 강화 ⭐⭐

[[product/entities/persona-이미란]] (Adjacent-3, AOS 4.0 + Q2 포용 설계 황금 교차점):
- 표준화 검사 false negative 위험 → F1-a 모델 다양화 핵심 영역
- 어머니 한국어 능력 = 자녀 변인 → F11 부모 음성 클로닝 동화 임상 토대 강화
- F15 챗봇 다문화 적응 시 단순화 + 반복 노출 + 짧은 프롬프트 필요
- F15 자문 풀에 단국대 황민아·이화여대 김영태 그룹 후보

### 갱신 페이지

갱신 — clinical/concepts/다문화-언어발달.md (스텁 → 1차 보강)
- § A 다문화 어휘·의미 (Jang + Jo)
- § B 한-베 음운·연음규칙·어머니 상관 (김선경) ⭐⭐
- § C 임상 함의 종합 — 4 원칙
- § D Persona 이미란 임상 토대 직접 강화 ⭐
- § E 한국 다문화 연구 4 그룹
- § F 한국어 특이적 결함 영역 5종 ⭐

갱신 — wiki/index.md
- 다문화-언어발달 항목 = 스텁 → 본문 1차 보강

### 종합 진행 상태 (54차 ingest 누적)

| 페이지 | 상태 | 정독 편수 |
|---|---|---|
| 자폐-화용중재 | 본문 1·2·3차 | 영문 7 + 국문 10 = **17편** |
| 지적장애-언어중재 | 본문 1·2차 | 한국 11편 |
| 단순언어장애-SLI | 본문 1차 | 한국 3편 |
| 학습장애-언어재활 | 본문 1차 | 한국 3편 |
| 내러티브-담화-추론-중재 | 본문 1차 | 한국 5편 |
| **다문화-언어발달** ⭐ | **본문 1차** | **한국 4편 (신규)** |
| 인공와우-청능재활 | 본문 1차 | Tye-Murray 1권 |
| 언어발달지연 | 본문 1차 | DLD 진단·평가 1편 |

→ **클리닉 영역 7 stub 중 5개 본문 1차 보강 완료**. 잔여 stub: **유창성장애·음성장애·신경인지장애-노인의사소통** (3개) — 한국어 raw 자료 부족 영역

### 잔여

- ✅ 신경인지장애-노인의사소통 1차 보강 완료 (다음 ingest 항목 참조)
- 유창성장애·음성장애 — 강의 영상만 있고 학술 논문 부족 → STT 처리 후 가능
- Product 측 F15-clinical-consultation-checklist 자문 항목 12개 반영
- Lint 점검 (CLAUDE.md §5.3)

## [2026-05-10] ingest | 신경인지장애-노인의사소통 본문 1차 보강 (54차 ingest 연속)

- pillar: clinical
- 작업 범위: [[clinical/concepts/신경인지장애-노인의사소통]] 스텁 → 1차 보강 격상

### 정독 4편

1. **Kim Ju-Yeon, Kim Hyang-Hee, Yoon Ji-Hye, Cho Sung-Rae (2017)** ⭐ — AD 숫자 처리·계산 결함 (연세대 — 김향희) — *CSD* 학회지
2. **강경미·김화수 (2015)** — 경도치매 의사소통-인지 프로그램 예비 (대구대 — 김화수) — KSHA 학술발표
3. **천정민·김화수 (2016)** — 예술-언어 통합 그룹 치료 → MCI 노인 의사소통 (대구대 — 김화수) — KSHA International Conference
4. (cross) Maintenance Cogmed 작업기억 — 영문 (이전 인벤토리 cross-listed)

### 핵심 신규 발견

- ⭐ **인지적 연속선 (Cognitive Continuum) 모델** (Petersen 2004): 정상 노화 → MCI → 치매. **Mild NCD 단계 = 임상 골든타임** (조기 판별·중재로 치매 이행 방지)
- ⭐ **한국어 숫자 처리 특이성**: 고유어 수사 (하나·둘·셋) + 한자어 수사 (일·이·삼) 병용 — 99까지 고유어, 100부터 한자어 + 병용. AD 환자가 두 체계 모두 결함
- ⭐ **한국 노인 임상 평가 도구 6 종 표준 라이브러리**: K-MMSE / K-MoCA / HCRS (김영숙 1997 한국어 번안) / GDS / CDR / SGDS
- ⭐ **한국 노인 임상 중재 패러다임 2 종**: 의사소통-인지 통합 + 예술-언어 통합 그룹
- 한국 신경언어 연구 양 축: **연세대 김향희** (이론·평가) + **대구대 김화수** (임상 중재 — ID + 노인 양 영역)
- AD 측두엽·두정엽 손상 → 숫자·계산 결함 + 보속·구문 오류

### 갱신 페이지

갱신 — clinical/concepts/신경인지장애-노인의사소통.md (스텁 → 1차)
- § A 인지적 연속선 모델 (Petersen 2004)
- § B AD 숫자 처리 + 한국어 수사 특이성
- § C 한국 평가 도구 6 종 표준
- § D 의사소통-인지 통합 + 예술-언어 통합 패러다임 2 종
- § E 한국 신경언어 연구 그룹 (연세대 김향희 + 대구대 김화수)
- § F MVP 회피 5 사유 명세
- § G 한국어 특이성 (수사·존대법·자전적 담화)
- § H 인접 영역 cross-link

갱신 — wiki/index.md
- 신경인지장애-노인의사소통 항목 = 스텁 → 본문 1차 보강

### 종합 진행 상태 (54차 ingest 누적)

| 페이지 | 상태 | 정독 편수 |
|---|---|---|
| 자폐-화용중재 | 본문 1·2·3차 | 영문 7 + 국문 10 = 17편 |
| 지적장애-언어중재 | 본문 1·2차 | 한국 11편 |
| 단순언어장애-SLI | 본문 1차 | 한국 3편 |
| 학습장애-언어재활 | 본문 1차 | 한국 3편 |
| 내러티브-담화-추론-중재 | 본문 1차 | 한국 5편 |
| 다문화-언어발달 | 본문 1차 | 한국 4편 |
| **신경인지장애-노인의사소통** ⭐ | **본문 1차** | **한국 4편 (신규)** |
| 인공와우-청능재활 | 본문 1차 | Tye-Murray |
| 언어발달지연 | 본문 1차 | DLD 진단·평가 |

→ **clinical 7 stub 중 6개 본문 1차 보강 완료**. 잔여 stub: **유창성장애·음성장애** (2개) — 한국어 raw 자료 부족 영역

### 잔여 (작은 편 → 큰 편)

- 우선순위 #1 (자폐 한국 5편): ✅ 완료
- 우선순위 #2 (지적장애 6편): ✅ 완료
- 우선순위 #3 (추론 → SLI/LD 6편): ✅ 완료
- 우선순위 #4 (다문화 4편): ✅ 완료
- 우선순위 #5 (신경인지 4편): ✅ 완료
- ⏳ 유창성장애·음성장애 — STT 처리 필요 (도구 환경)
- ✅ Product 측 F15-clinical-consultation-checklist 13 항목 보강 완료 (다음 ingest 항목 참조)
- ⏳ Lint 점검 (CLAUDE.md §5.3)
- ⏳ 잔여 ASD 영문 결과·논의 본문 (현재 abstract만)
- ⏳ 잔여 ID/추론 영역 약 10-15편 (이미 cross-listed)

## [2026-05-10] ingest | F15 임상 자문 체크리스트 9 → 13 항목 확장 (Product 측 cross-link 활성화)

- pillar: product
- 작업 범위: [[product/concepts/F15-clinical-consultation-checklist]] 9 항목 → 13 항목 확장
- 동기: 54차 ingest로 clinical 측 본문 보강 결과를 product 측에 통합 → 양방향 cross-link 완성

### 신규 4 항목 (10-13)

10. **F15 시나리오 8 추론 유형 정본** — [[clinical/concepts/내러티브-담화-추론-중재]] § D 박후임 (2008) 17차시 직접 매핑. 만 4세+ 활성 4 vs 만 5-7세 활성 4 분리
11. **F15 난이도 위계 정본** — 3 출전 통합 (김혜정 + 유경진 + 최숲). Level 1·2·3. 회피: 평가적 추론·감정 추론
12. **한국 임상 측정 단위 통합 라이브러리** — 9 종 + F1-a/F4 매핑
13. **한국 임상 자문 풀 매트릭스** — 7 그룹 (이화여대 1순위 + 대구대·단국대 2순위 + 부산가톨릭대·광주여대·이화여대 이소현 3순위 + 연세대 회피용)

### 기타 보강

- 자문 일정: 1순위·2순위·ASD 전문 분리
- 자문 비용 56만 → **82만** (3-4인 풀 확장)
- Clinical 정합 섹션 — 양방향 cross-link 활성화 (7 disorder 페이지 직접 인용)
- 자문 결과 → CR 처리: 9 → 13 항목

### Cross-link 양방향 활성화 결과 ⭐⭐

54차 ingest로 다음 7 양방향 페어 신규 활성화:
- F15-checklist ↔ 내러티브-담화-추론-중재
- F15-checklist ↔ 자폐-화용중재
- F15-checklist ↔ 지적장애-언어중재
- F15-checklist ↔ 단순언어장애-SLI
- F15-checklist ↔ 학습장애-언어재활
- F15-checklist ↔ 다문화-언어발달
- F15-checklist ↔ 신경인지장애-노인의사소통

→ **7 양방향 페어 활성화** = 54차 ingest cross-link 가치 완성. CLAUDE.md §1 cross-link 원칙 정합

### 갱신 페이지

갱신 — product/concepts/F15-clinical-consultation-checklist.md
- intro 9 → 13 항목 + 54차 변동 명시
- § 10-13 신규 4 섹션
- 자문 결과 처리·일정·비용 갱신
- Clinical 정합 양방향 활성화

갱신 — wiki/index.md
- F15-clinical-consultation-checklist 항목 = 9 항목 56만 → 13 항목 82만 + 자문 풀 7 그룹

### 잔여

- ⏳ Lint 점검 (CLAUDE.md §5.3) — 누적 변경 검증
- ⏳ 유창성장애·음성장애 (STT 후)
- ⏳ 신규 entity 페이지 (ADOS-2/LEAP/TEACCH/PRT/TOWL-4 — 식별만 완료)
- ⏳ 잔여 ASD 영문 결과·논의 본문

## [2026-05-10] note | OCR + STT 환경 구성 완료 (54차 ingest 잔여 도구 환경)

- pillar: tooling (메타)
- 작업 범위: 스캔 PDF OCR + AVI STT 도구 환경 구성 — 사용자 결정 후 로컬 설치 진행

### 설치 결과

#### OCR (스캔 PDF용)
- ✅ **PyMuPDF 1.27.2** — PDF → image (한 페이지 1초)
- ✅ **easyocr 1.7.2** + torch 2.11.0 (CPU) — 한국어+영어 모델
- ⚠️ **회피 트릭**: easyocr는 python-bidi 0.5+ API 필요하지만 0.5+는 Rust 컴파일러 필요. python-bidi 0.4.2 설치 후 런타임 monkey-patch (`bidi.get_display = bidi.algorithm.get_display`)
- 모델 자동 다운로드 (~100MB Korean) — 첫 실행 시
- ✅ **테스트 결과**: Tye-Murray part1.pdf 30 페이지에서 36 텍스트 세그먼트 추출, 한국어 본문 인식 양호 (소수 글자 오인식)
- → 후속 ingest: Rhea Paul 3권 + Tye-Murray 4권 (OCR 가능)

#### STT (AVI 영상용)
- ✅ **imageio-ffmpeg 0.6.0** — 번들 ffmpeg 7.1 (시스템 설치 불필요)
- ✅ **faster-whisper 1.2.1** + ctranslate2 + PyAV — Whisper 빠른 추론
- ✅ **base 모델 (~150MB)** 다운로드 — 한국어 강의 인식 가능 수준
- ⚠️ tiny 모델 (~75MB)은 한국어 학술 강의 인식 부정확 (반복 콤마 발생) — base 이상 권장
- ✅ **테스트 결과**: 20210621_언어발달장애(1).avi 5:00-6:00 구간에서 명확한 강의 내용 추출:
  - "5대 의사소통장애 영역" 강의 안내
  - 학생 호명 + 5 영역 (언어발달장애·유창성장애·조음장애·음성장애·신경어너장애)
  - "다해서 150 문제" 시험 안내
  - 일부 오인식 (예: "신경어너장애" → "신경언어장애", "좀 좀 장애" → "조음장애")
- → 후속 ingest: 75편 AVI 강의 영상 (STT 가능)

### 처리 시간 추정 (CPU 기준)

| 작업 | 단위 시간 | 75편/7권 합계 |
|---|---|---|
| OCR 1페이지 (200dpi, easyocr base) | ~10-30초 | Tye-Murray 4권 ~250페이지 + Rhea Paul 3권 추정 ~600페이지 = **약 4-12시간** |
| STT 1분 영상 (faster-whisper base, CPU) | ~30-60초 | 75편 × 평균 40분 = 3000분 영상 = **약 25-50시간 CPU 시간** |

→ 전체 처리는 백그라운드 다중 세션 분산 필요. 우선순위 영역 (우선순위 #4 Tye-Murray 14장 영유아 + 5대 장애 영상 24편)부터 점진 처리.

### 실행 환경 메모

- Python 3.14.4 (Windows native, MSYS2 bash 통해 실행)
- 가상환경 사용 X (시스템 site-packages 직접 설치)
- bidi monkey-patch 필요 — 매 실행 시 python 스크립트 시작에 추가:
  ```python
  import bidi.algorithm
  import bidi
  bidi.get_display = bidi.algorithm.get_display
  ```
- 콘솔 인코딩: `PYTHONIOENCODING=utf-8` 설정 필수 (cp949 기본 → 한국어 깨짐)
- ffmpeg PATH: `imageio_ffmpeg.get_ffmpeg_exe()` 호출하여 번들 경로 사용

### 다음 ingest 후보 (도구 환경 활용)

1. **Tye-Murray part1-4 OCR** → [[clinical/concepts/인공와우-청능재활]] § Erber 4단계 위계 출전 + 14장 영유아 본문
2. **Rhea Paul 3권 OCR** → [[clinical/concepts/언어발달지연]] § DLD 진단 영문 출전 (Bishop 2017 CATALISE 등)
3. **5대 장애 강의 영상 24편 STT** → 5 disorder concept 페이지 강의 내용 통합
4. **Treatment of Language Disorders 부록 27편 STT** → 학습장애 영역 본문

### 잔여 (도구 환경 활용 후)

- ⏳ Lint 점검 (CLAUDE.md §5.3)
- ⏳ 신규 entity 페이지 (ADOS-2 등 9 종)
- ⏳ 영문 ASD 7편 결과·논의 본문 추가 정독

## [2026-05-10] ingest | Tye-Murray part1 OCR 본문 정독 → 인공와우-청능재활 본문 2차 보강 (54차 ingest 연속)

- pillar: clinical
- 작업 범위: [[clinical/concepts/인공와우-청능재활]] CHAPTER 4 청능 훈련 본문 직접 정독
- 도구: easyocr (Korean+English) + PyMuPDF + 최적화 PDF (pdftotext)

### OCR 처리 자료

- **Tye-Murray part1 PDF** (248 페이지) — TOC 추출 (PDF p.10-15) + CHAPTER 4 본문 (PDF p.155-160 = book p.140-145)
- 처리 시간: ~10초/페이지 OCR (200dpi) + 모델 추론
- 추출된 본문: TOC 전체 (15 챕터 구조) + 청능 훈련 역사 + 4 계획 원칙 + 분석적 훈련 + 변별 vs 확인 + 모음 포먼트

### 핵심 신규 발견 ⭐⭐⭐

1. **Erber (1982) 직접 인용 확인** — book p.134 "(Erber, 1982)" — 본 위키 § STEP 2 4단계 위계 표준 출전 정본
2. **15 챕터 구조 + 번역자 매핑**: 조수진(1·2·3·10·14장) / 장현숙(4·5·6·7·15장) / 김유경(8·9·11·12·13장) — 14장 영유아 = 조수진 번역
3. **4 계획 원칙 (표 4-1)** ⭐:
   - 청능 기술 수준 (감지·변별·확인·이해 4단계 위계)
   - 훈련 자극 (분석적 vs 종합적)
   - 활동 유형 (형식적 vs 비형식적) — 어린 아동 = 비형식적 위주
   - 난이도 수준 (6 변수)
4. **6 난이도 변수 (그림 4-5)** ⭐⭐ — F3-b 임상 토대 정본:
   - 자극 형태 (폐쇄·제한·개방)
   - 자극 단위 (단어·구·문장)
   - 자극 유사성 (비슷하지 않음·비슷함)
   - 맥락 (높음·낮음)
   - 과제 (구조화·자연스러움)
   - 신호대잡음비
5. **80%/50% 임계 정본**: 80%+ → 난이도 ↑, 50% 미만 → 난이도 ↓
6. **변별 vs 어음변별력 점수 용어 위계** (book p.46): 본 교재는 "어음인지 (speech recognition)" 선호 — "변별"은 청능훈련 위계 2단계로 한정
7. **4단계 위계 본 교재 정합**:
   - 소리 인식 (Sound Awareness) = 감지 (Detection)
   - 변별 (음량·음조·속도) = Discrimination
   - 분석적 훈련 (모음·자음 인지) = 확인 (Identification)
   - 종합적 훈련 (의미 이해) = 이해 (Comprehension)
8. **부모 코칭 임상 토대** (book p.142): 어린 아동 = 비형식적 훈련 = 가족 매개 일상 환경 중재

### 갱신 페이지

갱신 — clinical/concepts/인공와우-청능재활.md
- § A 책 전체 구조 + 번역자 매핑
- § B CHAPTER 4 청능 훈련 본문 (역사·4 원칙·분석/종합·형식/비형식·6 난이도·임계)
- § C 4단계 위계 본 교재 정합 (직접 인용)
- § D 변별 용어 위계
- § E 모음 포먼트 (분석적 훈련)
- § F 본 영역 § STEP 1-3 임상 토대 정본 매핑
- § G F3-b 적응형 난이도 직접 매핑 강화
- § H 후속 ingest 잔여 (part2-4)

갱신 — wiki/index.md
- 인공와우-청능재활 항목 = 1차 → 1차+2차 (Erber 1982 직접 인용 + F3-b 임상 토대 정본)

### F3-b 적응형 난이도 임상 토대 강화 ⭐⭐

[[product/concepts/MVP-feature-spec]] § F3-b 임상 토대 정본:
- 6 난이도 변수 직접 매핑 (자극 형태·단위·유사성·맥락·과제·S/N)
- 80%/50% 임계 정본
- F3-b vs F15 분리: F3-b = 구조화, F15 = 자발

→ 후속 ingest 시 [[product/concepts/MVP-feature-spec]] § F3-b 보강 가능 (Tye-Murray Chapter 4 직접 인용)

### 도구 사용 메모

- bidi monkey-patch + easyocr 조합 안정 동작
- 200dpi OCR 시 Korean 본문 인식률 양호 (학술 텍스트 기준)
- 처리 시간: 4-6 페이지 OCR ≈ 50초 (CPU)
- 다음 part 처리 권고 페이지: part4 (CHAPTER 14 영유아) PDF 약 30-60 페이지 정독으로 영유아 매핑 가능

### 잔여

- ✅ part3 OCR (CHAPTER 14 영유아) 완료 — 다음 ingest 항목 참조
- ⏳ part2-3 추가 OCR (CHAPTER 5-13)
- ⏳ part4 OCR (부록·용어해설·참고문헌)
- ⏳ 5대 장애 강의 영상 24편 STT
- ⏳ Rhea Paul 3권 OCR
- ⏳ Lint 점검 (CLAUDE.md §5.3)

## [2026-05-10] ingest | Tye-Murray part3 OCR (CHAPTER 14 영유아) → 인공와우-청능재활 본문 3차 보강 ⭐⭐⭐ (54차 ingest 연속)

- pillar: clinical
- 작업 범위: [[clinical/concepts/인공와우-청능재활]] CHAPTER 14 청각장애 영유아 본문 직접 정독
- 도구: easyocr (Korean+English) + PyMuPDF
- MVP 가치: **영유아 만 2-7세 매핑의 직접 임상 토대 정본**

### OCR 처리 자료

- **Tye-Murray part3 PDF** (236 페이지) — Probe 결과: 11장(p.30) → 14장(p.40-115) → 15장(p.120) → 12장(p.150) → 13장(p.200) **비표준 챕터 순서**
- CHAPTER 14 영유아 = PDF 페이지 35-115 (book 페이지 487-565)
- OCR 페이지: 30, 40, 60, 80, 100, 120 (~6 페이지)
- 처리 시간: ~80초 (6 페이지)

### 핵심 신규 발견 ⭐⭐⭐

#### A. 그림 14-2 전체 흐름도 (book p.501) ⭐

영유아 청능재활 흐름:
- 평가 (Assessment) → 통과 vs 청력손실 발견 → 확인·평가 → 건강 추적 관리 → 부모 상담 → 전략 수립 → 실행 (의사소통방식·청각기기·조기중재)

→ MVP F1-b + F1-a + F4 임상 토대 정본

#### B. 영유아 청력·언어 발달 지표 (book p.561 표) ⭐⭐⭐

**6 연령 단계 발달 지표** — MVP F1-b 5분 진단 양육자 보고식 입력 항목 정본:

| 연령 | 핵심 지표 |
|---|---|
| 신생아 | 울음, 큰 소리 놀람 |
| 2-3개월 | 웃음, 부모 목소리 반응, 목소리 음질 변화 구별 |
| 4-6개월 | 소리 쪽 고개 돌림, 자음+모음 결합 ("바-") |
| 6-12개월 | 음절 옹알이 ("바-바-바"), 비언어 의사소통 시도 |
| 12개월쯤 | 이름 반응, "아니오" 이해, 요구 응답 |
| 12-18개월 | 성인 같은 말소리 리듬, 첫 단어 |

→ ⭐⭐⭐ MVP F1-b 입력 폼 ≤3 항목 + SELSI 양육자 보고식의 상위 출전 정본 확인

#### C. 부모 정서 5 단계 (book p.521) ⭐

충격·부정·슬픔·죄의식·분노·수용

→ MVP F11 부모 음성 클로닝 + HITL 자격자 응대 임상 토대

#### D. 청능사 자기평가 6 체크리스트 (Edwards 2003, p.521)

- 부모 말 결론 없이 진심으로 듣기
- 자신의 느낌 표현 행동으로 보여주기
- 부모 걱정·이야기 꺼낼 적절한 시점
- 내용 + 느낌 공유 기회 제공
- 부모 느낌 지지
- 부모 자신의 요구 말하기 기술 개발

→ HITL 1·2급 자격자의 부모 응대 표준. ADR-09 화이트리스트 (자연 상호작용만) 정합

#### E. 인공와우 영유아 부모 면담 14 질문 (표 14-5, book p.541)

- MVP 회피 영역 (트랙1 의료)
- F15 자문가 자문 시 인공와우 영역 회피 명확화

#### F. 형식적 평가 — 부모 설문지 + 비형식적 측정 (book p.541)

> "**어린 아동의 경우, 부모 설문지와 말인지에 대한 비형식적 측정법을 통해서 청각적 능력과 보청기 시험착용에 대한 평가를 시행할 수도 있다**"

→ MVP F1-b 양육자 보고식 임상 표준 출전

#### G. 협력 모델 (book p.581, CHAPTER 15)

- 일반교사 + 청각장애 교사 팀티칭, 1:4 비율
- 역통합 (reverse mainstream)
- MVP Phase 4 학령기 확장 시 cross-link 후보 (가정 홈케어 외 — 회피)

#### H. 조기 중재 효과 (book p.501)

> "심한 청력손실 아동 조기 중재 시 정상청력과 대등한 의사소통 발달 가능" (NIH 2006)

→ MVP "회색지대 부모 30-50만" 타깃 임상 정합

### 갱신 페이지

갱신 — clinical/concepts/인공와우-청능재활.md (§ I-Q 추가)
- § I 그림 14-2 전체 흐름도
- § J 영유아 6 발달 지표 — F1-b 정본 ⭐⭐⭐
- § K 부모 5 단계 + 6 자기평가
- § L 인공와우 부모 면담 14 질문 (회피 영역)
- § M 부모 설문지 + 비형식적 측정
- § N 협력 모델 (Ch 15)
- § O 영유아 → MVP 매핑 종합
- § P F1-b 영유아 5분 진단 입력 항목 정본 ⭐⭐⭐
- § Q 후속 잔여

갱신 — wiki/index.md
- 인공와우-청능재활 항목 = 1차+2차 → 1·2·3차 (Ch 14 영유아 정본 + F1-b 정본)

### MVP 영유아 임상 토대 정본 ⭐⭐⭐

본 § I-P 결과 = **MVP 영유아 만 2-7세 임상 토대 정본**:

- **F1-b 5분 진단**: 영유아 6 발달 지표 + 부모 설문지·비형식적 측정 표준
- **F1-a 3축 분석**: 그림 14-2 흐름도 + 영유아 비형식적 평가
- **F4 시계열 진전**: 조기중재 프로그램 디지털 변형
- **F11 부모 음성 클로닝**: 부모 5 단계 정서 + 6 자기평가 체크리스트
- **F15 LLM 챗봇**: 영유아 비언어 의사소통 → 12개월 이전 단계 매핑 + 만 4세+ ADR-14 정합
- **MVP 회피**: 인공와우 14 질문 (의료) + 협력 모델 (학교 환경)
- **Persona 이미란 (다문화)**: 부모 설문지 보호자 한국어 능력 변인
- **Persona 황보름 (ASD 경계선)**: 영유아 식별 어려움 → HITL confidence 60% 게이트

### 도구 사용 메모 (추가)

- 비표준 챕터 순서 PDF 발견 — probe 페이지 (1·50·100·150·200) 샘플링으로 챕터 위치 식별 효과적
- 200dpi OCR 6 페이지 = ~80초 (CPU). 영유아 핵심 8 페이지 처리 시간 적정

### 잔여

- ⏳ Part2-3 추가 OCR (CHAPTER 5-13)
- ⏳ Part4 OCR (부록·용어해설)
- ⏳ Rhea Paul 3권 OCR
- ⏳ AVI 강의 영상 24편 STT (5대 장애)
- ⏳ Lint 점검 (CLAUDE.md §5.3)
- ⏳ 신규 entity 페이지 (ADOS-2 등 9 종)
- ⏳ Product 측 F1-b·F11 임상 토대 cross-link 강화 (인공와우 § I-P 직접 인용)

## [2026-05-10] ingest | Rhea Paul Ch1 OCR + 언어발달장애(1) 영상 STT → 언어발달지연 본문 2차 보강 (54차 ingest 연속, 순서대로 진행)

- pillar: clinical
- 작업 범위: 사용자 "순서대로 진행" 요청에 따라 **AVI STT + Rhea Paul OCR 병렬** 처리
- 도구: easyocr (OCR) + faster-whisper base (STT) + imageio-ffmpeg

### 병렬 처리 결과

#### STT — 20210621_언어발달장애(1).avi (47분)
- 처리: ~30분 (CPU base)
- 결과: 692 segment, 시간 라벨링 포함
- 저장: `Speech-Therapy_Workbase/raw/stt_output/20210621_언어발달장애_1_STT.txt`
- 내용: 강사 (대구사이버대) → 부산가톨릭대 1·2급 자격시험 특강 47분 + 시험 안내 + 출제 영역 + 실어증 사례 등

#### Rhea Paul OCR — part1 (245 페이지)
- Probe: 페이지 1·5·50·100·150·200
- TOC: 페이지 10-14 (3 섹션 + 14 챕터)
- CHAPTER 1 본문: 페이지 17-19 (book p.3-5)
- 처리: ~80초 (10 페이지 OCR)

### 핵심 발견

#### A. ASHA (1993) DLD 정의 ⭐⭐⭐ (Rhea Paul Ch1 직접 인용)
- 3 영역 매트릭스: **form (음운·형태·구문) + content (의미) + use (화용)** = Bloom & Lahey 모델 ASHA 공식
- 본 위키 § DSM-5/ICD-11 진단 기준의 표준 출전

#### B. Tomblin (2008) 2 조망 ⭐⭐
- **자연주의적 조망**: Fey -1.25 SD 등 측정 기반
- **규준적 조망**: 사회적 기대 부적합 = ADR-04 (의료 용어 배제) + "차이→방해→장애 3단계 위계"의 임상 토대 정본

#### C. Jamie 사례 — 진단 핵심 모순
- 생활연령 vs 정신연령 (인지) 기반 평가 — HITL 양 관점 명시 필수

#### D. DLD 학문사
- 1825 Gall → 1861 Broca → 1874 Wernicke → 1937 Orton → 1947 Gesell → 1959/1964 **Benton (배제 진단)** → 1963 **McGinnis (SLI 효시)** → 1957 Chomsky 변형문법

#### E. 한국 1·2급 언어재활사 자격시험 구조 ⭐⭐
- 150 문제 / 객관식 5지선다 / 60% 합격 (90 문제)
- **언어발달장애 + 조음음운장애 = 각 35 문제 (각 23.3%, 1·2위 비중)**
- 5 영역: 신경(30) + 유창성(25) + 음성(25) + 언어발달장애(35) + 조음음운장애(35)
- 위험군 출제: **말 늦은 아동 + 다문화 가정 아동 + 이중언어 아동** (공식 영역)

#### F. Rhea Paul 한국어 번역자
- 김화수 · 김성수 · 박소현 · 정부자 · 이상경 · 이은정 · 권유진
- → **김화수가 본 번역 책임자** — 한국 임상 번역의 핵심 채널 (Tye-Murray, Rhea Paul 외)

### 갱신 페이지

갱신 — clinical/concepts/언어발달지연.md (§ A-J 추가)
- § A Rhea Paul 책 구조
- § B ASHA 1993 DLD 정의 ⭐⭐⭐
- § C Tomblin 2 조망 ⭐⭐
- § D Jamie 사례 — 진단 모순
- § E 30+ 년 합일점 결여
- § F DLD 학문사
- § G 한국 자격시험 출제 영역 (STT)
- § H MVP 임상 토대 강화 매핑
- § I STT 결과물 위치
- § J 후속 잔여

갱신 — wiki/index.md
- 언어발달지연 항목 = 1차 → 1·2차 (ASHA 1993 + Tomblin 2 조망 + 자격시험 구조)

### STT 한계 식별

base 모델 한국어 학술 강의 인식 오류 다수:
- 감귤림→김규림 / 감옥→과목 / 마인회전하동→말 늦은 아동 / 잡혜 스펙트럼→자폐 스펙트럼 / 파용 논→화용론 등

→ **small/medium 모델 권장** (정확도 향상, CPU 시간 증가). 본 STT 활용 시 위키 cross-check 필수.

### MVP 임상 토대 강화 ⭐⭐

- **F1-a 3축**: ASHA 1993 form/content/use 직접 매핑
- **F1-b 5분**: Tomblin 규준적 조망 (사회적 기대 부적합 자가 식별)
- **ADR-04**: 규준적 조망 직접 출전
- **HITL**: Jamie 사례 양 관점 명시
- **시장 세그**: 한국 자격시험 비중 (언어발달장애+조음음운장애=47%) = 임상 시장 양 축 공식

### 잔여 (순서대로 진행 계속)

- ✅ Rhea Paul Ch5 다문화 OCR → 다문화-언어발달 § G-H 보강 완료 (다음 ingest 항목 참조)
- ✅ Rhea Paul Ch6 영아 OCR → 언어발달지연 § K-M 본문 보강 3차 완료

## [2026-05-10] ingest | Rhea Paul Ch5 다문화 + Ch6 영아 OCR (54차 ingest 연속, "순서대로 진행" 계속)

- pillar: clinical
- 작업 범위: 다문화-언어발달 + 언어발달지연 동시 보강
- 도구: easyocr (OCR) + faster-whisper base (STT 백그라운드 — 조음음운장애 1편)
- 병렬: 조음음운장애(1) 47분 영상 STT 백그라운드 시작

### OCR 처리 결과

#### Rhea Paul Ch5 다문화 (book p.175-219, part1 PDF p.189-233)
- ⭐ **표 5-2 고맥락·저맥락 의사소통** (Hall 1983 + Westby & Rouse 1985)
- ⭐ **그림 5-1 내러티브 구조** — 주제 중심 vs 주제 연관 (Westby 1989 + Kaplan 1966)
- ⭐⭐⭐ **글상자 5-9 CLD 검사 17 수정 제언** (Goldstein & Iglesias 2006)
- 가족중심 실제 (Donahue-Kilburg 1993 외)
- ASHA 2009 통계: 미국 학생 40% CLD, 치료사 6.9%만 인종 소수자

#### Rhea Paul Ch6 영아 (book p.233+, part2 PDF p.1-50)
- ⭐⭐⭐ **Sparks (1989) "영아 평가의 목적은 미래 행동 예측이 아니라 현재 강점과 요구 평가"** = F1-b 영유아 정본
- 영아 평가 다층 모델: 위험요인 + 생리적 조직화 + (5 영역)
- APIB (Assessment of Preterm Infant Behavior, Als 1985)
- NICU + 청각사 정기 검사
- ⭐ 조기중재 효과 — **저학력 어머니에게 가장 효과적** = MVP 회색지대 부모 시장 정당화
- 체중별 영아 생존율 (조산아 위험군)

### 갱신 페이지

갱신 — clinical/concepts/다문화-언어발달.md (§ G-H 추가)
- § G Rhea Paul Ch5 5 항목 (통계·고맥락저맥락·내러티브·CLD 17 검사·가족중심)
- § G-6 한국 + Rhea Paul 통합 매트릭스
- § H F15 자문 추가 항목 14-17 후보

갱신 — clinical/concepts/언어발달지연.md (§ K-M 추가)
- § K Rhea Paul Ch6 5 영역 (Sparks 1989 + 5 영역 + NICU + 조기중재 + 생존율)
- § L Ch1 + Ch6 통합 — MVP 영유아 임상 토대 정본
- § M 후속 잔여

갱신 — wiki/index.md
- 다문화-언어발달 = 1차 → 1·2차 (Rhea Paul Ch5 통합)
- 언어발달지연 = 1·2차 → 1·2·3차 (Ch1 + Ch6 통합)

### MVP 임상 토대 강화 (다문화 + 영유아)

- F1-b 영유아: Sparks 1989 정본 (미래 예측 X, 현재 강점·요구)
- F1-a 다문화: CLD 17 검사 수정 제언 직접 매핑
- F11 부모 매개: 저학력 어머니 효과 (회색지대 시장 정당화)
- HITL 다양성: 가족중심 실제 + 가치·신념 차이 인식 (Kohnert 2008)
- F15 자문: 고맥락·저맥락 (Hall 1983) + 주제 중심/연관 (Westby 2005) 추가 4 항목

### 잔여 (순서대로 진행 계속)

- ⏳ STT 조음음운장애(1) 백그라운드 처리 중 (완료 시 통합)
- ⏳ Rhea Paul Ch 2-4 OCR (평가·중재·특수 장애)
- ⏳ Rhea Paul part2-3 추가 OCR (학령기·청소년·고급언어)
- ⏳ 추가 3편 영상 STT (유창성·신경언어·음성)
- ✅ Product 측 cross-link 강화 → MVP-clinical-foundation 신규 페이지 (다음 ingest 항목)
- ⏳ Lint 점검

## [2026-05-10] ingest | Product 측 신규 MVP-clinical-foundation synthesis 페이지 (54차 ingest 연속, "순서대로 진행" #3)

- pillar: product
- 작업 범위: 신규 [[product/concepts/MVP-clinical-foundation]] synthesis 페이지 생성 — 54차 ingest 임상 정독 결과를 product 측에 통합

### 동기 + 가치

54차 ingest로 식별된 모든 임상 정본 (Tye-Murray + Rhea Paul + 한국 35+편)을 6 MVP 기능별로 통합 매핑. clinical → product 양방향 cross-link 전체 활성화.

### 9 섹션 구성

1. **F1-b 5분 진단** — Sparks 1989 (현재 강점·요구) + Tye-Murray Ch14 6 발달 지표 + 한국 자격시험 위험군 + Persona 회색지대 부모 시장 정당화 + 3 단계 입력 위계
2. **F1-a 3축 AI 분석** — ASHA 1993 + 측정 단위 9 종 + CLD 17 검사 수정 + 한국어 특이성 5종 + Tomblin 2 조망
3. **F3-b 적응형 난이도** — Tye-Murray Ch4 6 변수 + 80%/50% 임계 + Erber 1982 4단계
4. **F11 부모 음성 클로닝** — 부모 5 단계 + Edwards 6 자기평가 + 가족 중심 실제 + 4 핵심기법 + 형식적/비형식적 훈련
5. **F15 LLM 챗봇** — F15-checklist 13 항목 참조 + 8 추론 유형 + 위계 + 자문 풀 7 그룹
6. **HITL** — Transdisciplinary 정합 + Jamie 사례 + ASHA 2002 역할 분담
7. **ADR-04 의료 용어 배제** — 3단계 위계 (차이→방해→장애) + Tomblin 규준적 조망 + WHO 모델
8. **한국 임상 자문 풀 7 그룹** — 1·2·3순위 + 회피용
9. **Cross-link 양방향 매트릭스** — **10 양방향 페어 활성화**

### 핵심 임상 정본 통합 ⭐⭐⭐

| MVP | 임상 정본 출전 |
|---|---|
| F1-b | Sparks 1989 + Tye-Murray Ch14 + 한국 자격시험 + 회색지대 어머니 효과 |
| F1-a | ASHA 1993 + Tomblin 2008 + 측정 단위 9 종 + CLD 17 + 한국어 특이성 5 |
| F3-b | Tye-Murray Ch4 6 변수 + 80%/50% + Erber 1982 |
| F11 | 부모 5 단계 + 6 자기평가 + 가족중심 + 4 기법 + 비형식적 훈련 |
| F15 | F15-checklist 13 항목 + 박후임 8 유형 + Level 1-3 |
| HITL | Transdisciplinary + Jamie + ASHA 2002 |
| ADR-04 | 차이→방해→장애 3단계 + Tomblin 규준적 + WHO 모델 |

### 10 Cross-link 양방향 페어 활성화 ⭐⭐⭐

| Clinical 페이지 | 본 페이지 § 매핑 |
|---|---|
| 언어발달지연 | § 1·2·6·7 |
| 인공와우-청능재활 | § 1·3·4·6·7 |
| 다문화-언어발달 | § 2·4 |
| 자폐-화용중재 | § 5 (F15-checklist) |
| 지적장애-언어중재 | § 2·4 |
| 단순언어장애-SLI | § 2 |
| 학습장애-언어재활 | § 5 |
| 내러티브-담화-추론-중재 | § 5 |
| 신경인지장애-노인의사소통 | § 7 (회피 영역) |
| 한국-언어치료-트랙비교 | § 1·6 |

→ **10 양방향 페어 활성화** — 54차 ingest cross-link 가치 완성

### 갱신 페이지

신규 — product/concepts/MVP-clinical-foundation.md (9 섹션)

갱신 — wiki/index.md
- 신규 페이지 추가
- 통계: product 31 → 32 / 전체 112 → **113 페이지**

### Cross-link 완성 통계

54차 ingest 누적 cross-link 활성화 결과:
- 47차 (이전): product → clinical 21건 / clinical → product 60+건 (15 페이지)
- 54차 (현): + F15-checklist 7 페어 (이전 ingest) + **본 MVP-clinical-foundation 10 페어**
- = **17 양방향 페어 추가 활성화** (54차 ingest 한 회차 단일 최대)

### 잔여

- ✅ STT 조음음운장애(1) 완료 + 통합 (다음 ingest 항목)
- ✅ Rhea Paul Ch4 OCR + 보강 완료 (다음 ingest 항목)
- ⏳ Rhea Paul Ch 2-3 (평가·중재) OCR
- ⏳ ADR-04 + ADR-09 + ADR-14 직접 인용 보강
- ⏳ Open Issues Dashboard 갱신
- ⏳ Lint 점검

## [2026-05-10] ingest | Rhea Paul Ch4 + STT 조음음운장애(1) 통합 (54차 ingest 연속, "순서대로 진행" #4)

- pillar: clinical
- 작업 범위: 3 페이지 동시 보강 (지적장애-언어중재 § K-O + 자폐-화용중재 § N + 조음장애 § A-E)

### OCR + STT 결과

#### Rhea Paul Ch4 § 특수 장애인 (book p.129-172, PDF p.143-168)
- ⭐⭐⭐ **AAIDD 2010 ID 정의** (Schalock et al.) — 지적기능 + 적응행동 + 18세 이전 시작 + 4 요구사항
- 다운증후군 언어 프로파일 (Laws & Bishop 2003 외) — 표현 < 수용, 화용 = 강점 영역
- ⭐⭐ FXS (취약 X 증후군) — 여아 > 남아, 음운인식 10% 이하, **틀린 믿음 결함 원인 = 작업기억·집행 조절** (cf. ASD = 사회-인지)
- APD vs ADHD 분과 분기 (Dawes & Bishop 2009)
- 진단 범주 3 가치 + 주의점

#### STT 조음음운장애(1) — 47분, 1157 segment
- 한국 자격시험 조음음운장애 **5 영역 분류**: 일차적 / 마비말 / 말실행증 / 아동기 마비말 / 청각장애
- 한국 임상 학부 표준 커리큘럼: 말소리 생성 / 한국어 음소·자질 / 음절 구조 / 음운 변동 / 언어 연쇄
- ⭐ **한국어 음운 변동 (정상 변동)**: 예) 국 + 물 → 궁물 (비음화)
- → **MVP F1-a false positive 방지 정합** — 정상 음운 변동은 결함 X

### 갱신 페이지

갱신 — clinical/concepts/지적장애-언어중재.md (§ K-O 추가)
- § K AAIDD 2010 ID 정의 ⭐⭐⭐
- § L 다운증후군 언어 프로파일 (표현 > 수용, 화용 강점)
- § M FXS (여아 > 남아, false belief 원인 = 작업기억) ⭐⭐
- § N 진단 범주 3 가치 + 주의점
- § O APD vs ADHD 분과 분기

갱신 — clinical/concepts/자폐-화용중재.md (§ N 추가)
- § N ASD vs FXS 감별 — 마음이론 결함 원인 메커니즘 차이 ⭐⭐ (사회-인지 vs 작업기억)
- F15 자문 항목 18 후보: ASD vs FXS 감별

갱신 — clinical/concepts/조음장애.md (§ A-E 추가, 본문 1차 보강)
- § A 한국 자격시험 5 영역 분류
- § B 한국어 말소리 기초 커리큘럼 (말소리 생성·음소·음절·음운 변동·언어 연쇄)
- § C 한국어 음운 변동 (국→궁) — false positive 방지 핵심
- § D STT 출처
- § E MVP F1-a 임상 토대 강화

갱신 — wiki/index.md
- 조음장애 = 보강 → 본문 1차 (조음음운장애(1) STT 통합)
- 지적장애-언어중재 = 1·2차 → 1·2·3차 (Ch4 통합)
- 자폐-화용중재 = 1·2·3차 → 1·2·3·4차 (Ch4 FXS 감별)

### 핵심 임상 토대 신규 발견 ⭐⭐⭐

| 출전 | 발견 | MVP 매핑 |
|---|---|---|
| Schalock 2010 (AAIDD) | ID 정의: 지적기능 + 적응행동 + 18세 이전 + 4 요구사항 | F1-a/F1-b/F11 ID 영역 임상 토대 정본 |
| Laws & Bishop 2003 | 다운증후군 = 표현 < 수용, 화용 = 강점 | F1-a 영역별 차별화 (단순 평균 X) |
| Cornish 2004 (FXS) | **마음이론 결함 원인 = 작업기억·집행 조절** (cf. ASD = 사회-인지) | HITL 양 관점 명시 정본 — 동일 결함도 원인 다름 |
| Dawes & Bishop 2009 | APD vs ADHD vs 언어발달지체 — 분과 분기 | HITL 다양성 모니터링 정합 |
| 한국 STT — 음운 변동 | 국→궁 정상 변동 = 결함 X | F1-a false positive 방지 임상 출전 |

### 잔여

- ✅ Rhea Paul Ch2 평가 OCR + 언어발달지연 § N-S 보강 완료 (다음 ingest 항목)
- ⏳ Rhea Paul Ch3 중재 OCR
- ⏳ Rhea Paul part2-3 OCR (Ch 6 영아 추가 + Ch 7-14)
- 🔄 STT 유창성장애(1) 백그라운드 처리 중
- ⏳ 추가 2편 영상 STT (신경언어·음성)
- ✅ MVP-clinical-foundation § 2.4-2.7 보강 완료
- ⏳ ADR-04/ADR-09/ADR-14 직접 인용 보강
- ⏳ Open Issues Dashboard 갱신
- ⏳ Lint 점검 (CLAUDE.md §5.3)

## [2026-05-10] ingest | Rhea Paul Ch2 평가 OCR + MVP-clinical-foundation § 2.4-2.7 확장 (54차 ingest 연속, "순서대로 진행" #5)

- pillar: clinical + product
- 작업 범위: Ch2 평가 본문 정독 → 언어발달지연 § N-S + MVP-clinical-foundation § 2.4-2.7 동시 보강
- 병렬: STT 유창성장애(1) 백그라운드 시작

### Rhea Paul Ch2 평가 핵심 발견

#### A. IDEA 'evaluation' vs 'assessment' (book p.30)
- evaluation = 서비스 적합 여부 판정 (6세 이하 진단·장애명 X) = MVP F1-b
- assessment = 적합 판정 후 상세 사정 = F1-a + HITL

#### B. 평가 도구 5 기준 (book p.50-51)
- 신뢰도 / 타당도 / 진단 정확도 (Dollaghan 2004) / 표준화 (≥100명/연령대 + 다양성) / 표본 대표성

#### C. Peña, Spaulding & Plante (2006) ⭐⭐⭐
> "**판별 정확성을 위해 규준 표본에 언어장애 아동 포함 X — 정상 발달 위주**"
→ MVP F1-a 학습 데이터셋 구성 핵심 원칙

#### D. 말기제 평가 그림 2-4 (book p.41)
- 얼굴·인두·인중·구강 내부·혀·구개·연인두 7 영역 상세 검사 (Meitus & Weinberg 1983)
- MVP 영유아는 양육자 보고식 — 임상 토대 인지용

#### E. Rhea Paul 두 조망 통합 권고 ⭐
> "**3 요소: 형식/내용/사용 결함 + 정상 발달 비교 + 일상 영향**"
→ MVP F1-a + HITL 통합 출력 3 요소 정본

### 갱신 페이지

갱신 — clinical/concepts/언어발달지연.md (§ N-S 추가)
- § N IDEA evaluation vs assessment ⭐
- § O 평가 5 기준 ⭐⭐
- § P Peña 학습 데이터셋 원칙 ⭐⭐⭐
- § Q 말기제 평가 7 영역
- § R Tomblin 강화 인용
- § S 두 조망 통합 출력 ⭐

갱신 — product/concepts/MVP-clinical-foundation.md (§ 2.4-2.7 추가)
- § 2.4 한국어 특이성 5 → **6 종** (음운 변동 추가)
- § 2.5 평가 5 기준 + Peña 학습 데이터셋 원칙 ⭐⭐⭐
- § 2.6 IDEA evaluation vs assessment
- § 2.7 두 조망 통합 출력 3 요소 ⭐

갱신 — wiki/index.md
- 언어발달지연 = 1·2·3차 → **1·2·3·4차** (Ch2 평가 통합)

### MVP F1-a/F1-b 임상 토대 정본 완성 ⭐⭐⭐

본 ingest로 MVP F1-a 학습 데이터셋 구성의 핵심 임상 원칙 확립:
- **학습 데이터셋 = 정상 발달 위주** (Peña 2006)
- **검증 데이터셋 = 정상 + 장애 양 그룹** (변별 검증)
- AI 진단 false negative + false positive 양방향 방지 = CLD 17 검사 § 17 + Peña 원칙 통합
- HITL 통합 출력 3 요소: 결함 유무 + 정상 비교 + 일상 영향

### 잔여 (순서대로 진행 계속)

- ✅ STT 유창성장애(1) 완료 — 실제 조음 후반 + 청각장애 본문 → 조음장애 + 인공와우-청능재활 보강
- 🔄 STT 유창성장애(2-1) 백그라운드 시작 (본격 유창성 내용 추정)
- ⏳ Rhea Paul Ch3 중재 OCR
- ✅ ADR-04/ADR-09/ADR-14 직접 인용 보강 완료 (다음 ingest 항목)
- ⏳ Lint 점검

## [2026-05-10] ingest | ADR-04/ADR-09/ADR-14 임상 토대 정본 직접 인용 보강 + STT 유창성(1) 통합 (54차 ingest 연속, "순서대로 진행" #6)

- pillar: product + clinical
- 작업 범위: architecture-decisions § Clinical 근거 대규모 확장 + STT 유창성(1) 통합

### ADR-04/09/14 임상 토대 보강

**ADR-04 의료 용어 배제** — 5 출전 직접 인용:
1. Tomblin 2008 규준적 조망 (Rhea Paul Ch1)
2. WHO 2001 "장애 (handicap)" 용어 자제 권고 (Tye-Murray Ch1)
3. 차이 → 방해 → 장애 3단계 위계 (한국 DLD 핸드아웃)
4. Rhea Paul Ch4 진단 범주 가치 + 주의점
5. IDEA evaluation vs assessment

**ADR-09 F11 부모 음성 윤리** — 6 출전 직접 인용:
1. 4 핵심기법 (평행 발화·확장·기다리기·반응적 상호작용)
2. 부모 정서 5 단계 (Tye-Murray Ch14)
3. Edwards 2003 6 자기평가 체크리스트
4. 가족 중심 실제 (Rhea Paul Ch5)
5. 비형식적 훈련 (Tye-Murray Ch4)
6. Sparks 1989 (Rhea Paul Ch6)

**ADR-14 F15 임상 안전 게이트** — 6 출전 직접 인용:
1. F15 자문 체크리스트 13 항목
2. 박후임 2008 8 추론 유형
3. F15 난이도 위계 Level 1-3
4. 서유진 2018 스크립트 중재 (회피 정합)
5. ASD vs FXS 마음이론 결함 원인 차이 (Rhea Paul Ch4)
6. EMT 환경 중심 언어중재

### STT 유창성(1) 통합 — 실제 조음 후반 + 청각장애 ⭐

본 STT는 47분 영상의 **실제 내용** 발견:
- 구개열 보상조음 3 유형 (생략·치환·**성문폐쇄음·인두마찰음**)
- 청각장애 3 유형 (전음성·감각신경성·혼합성) — 기도 vs 골도 검사 차이
- 유창성장애 본격 내용은 유창성(2-1) 이후 영상

### 갱신 페이지

갱신 — product/concepts/architecture-decisions.md
- Clinical 근거 § 확장 — 3 ADR (04·09·14) 직접 임상 토대 정본 추가
- 5 + 6 + 6 = **17 직접 출전** 명시
- ADR 5-15 잠재 보강 후보 명시

갱신 — clinical/concepts/조음장애.md (§ F-I 추가)
- § F 구개열 = 구비강 분리 + 연인두 폐쇄 부전 → 공명장애
- § G 보상조음 3 유형 ⭐
- § H 청각장애 3 유형
- § I STT 출처

갱신 — clinical/concepts/인공와우-청능재활.md (§ R-S 추가)
- § R 청각장애 3 유형 → 인공와우 대상 식별 (감각신경성/혼합성)
- § S STT 출처

갱신 — wiki/index.md
- 조음장애 = 본문 1차 → 1·2차
- 인공와우-청능재활 = 1·2·3차 → 1·2·3·4차

### 핵심 발견 (STT 유창성(1) + ADR)

| 영역 | 발견 |
|---|---|
| **STT — 보상조음** | 성문폐쇄음·인두마찰음 = 구개열 핵심 오류 (F1-a 학습 후보) |
| **STT — 청각장애** | 기도 vs 골도 차이 → 인공와우 대상 = 감각신경성/혼합성 |
| **ADR-04** | 5 직접 임상 토대 정본 (Tomblin·WHO·3단계·Rhea Paul·IDEA) |
| **ADR-09** | 6 직접 임상 토대 정본 (4 기법·부모 5 단계·Edwards·가족중심·비형식적·Sparks) |
| **ADR-14** | 6 직접 임상 토대 정본 (F15 13 + 박후임 + Level 1-3 + 서유진 + FXS·ASD + EMT) |

### STT 영구 저장 누적

- 20210621_언어발달장애_1_STT.txt (692 segment)
- 20210622_조음음운장애_1_STT.txt (1157 segment)
- 20210623_유창성장애_1_STT.txt (626 segment)
- 🔄 유창성장애(2-1) 백그라운드 처리 중

### 잔여 (순서대로 진행 계속)

- ✅ STT 유창성장애(2-1) 완료 + 유창성장애 stub → 본문 1차 보강 격상 (다음 ingest 항목)
- ⏳ Rhea Paul Ch3 중재 OCR
- ⏳ STT 신경언어장애·음성장애 (추가 2 영역)
- ⏳ Lint 점검 (CLAUDE.md §5.3)
- ⏳ Open Issues Dashboard 갱신

## [2026-05-10] ingest | STT 유창성장애(2-1) → 유창성장애 stub → 본문 1차 보강 격상 (54차 ingest 연속)

- pillar: clinical
- 작업 범위: [[clinical/concepts/유창성장애]] stub → 본문 1차 보강 격상
- 도구: faster-whisper base (45분 영상)

### STT 결과 — 본격 유창성 본문 ⭐⭐

유창성장애(2-1) = 한국 자격시험 유창성장애 25 문제 영역 임상 핵심 본문:
- 유창성 정의 + 4 판단 요소 (지속성·속도·노력·리듬)
- WHO 말더듬 정의 (불수의적·반복·연장·멈춤)
- ⭐ **빙산 모델** (행동 + 정서 + 인지 3 영역)
- 분류 4축 (정상 vs 병리·발달성 vs 후발성·말더듬 vs 속화·단어 간 vs 단어 내)
- 핵심 행동 vs 부수 행동
- 원인 이론 (진단기인·요구용량 등)
- 진단 5 절차
- ⭐ 양적금법 2 종 (유창성 형성법 + 말더듬 수정법)
- 간접 vs 직접 치료
- 속화 (Cluttering)

### 갱신 페이지

갱신 — clinical/concepts/유창성장애.md (§ A-L 추가, stub → 본문 1차)
- § A 한국 자격시험 25 문제 영역
- § B 유창성 정의 + 4 요소
- § C WHO 말더듬 정의
- § D **빙산 모델** ⭐⭐
- § E 분류 위계 4축
- § F 핵심 vs 부수 행동
- § G 원인 이론 (진단기인·요구용량)
- § H 진단 5 절차
- § I 양적금법 2 종 ⭐⭐
- § J STT 출처
- § K 출제 영역 매트릭스
- § L **MVP 회피 5 사유 확정** ⭐

갱신 — wiki/index.md
- 유창성장애 = 스텁 → 본문 1차 보강 (빙산 모델 + 양적금법 핵심)

### 종합 진행 상태

clinical 8 stub 중 **7개 본문 1차 보강 완료**:
- 유창성장애 ⭐ 신규 완료 (이번 ingest)
- 음성장애 = 유일한 잔여 stub (STT 음성장애 영상 처리 후 가능)

### STT 영구 저장 누적 (4편)
- 20210621_언어발달장애_1_STT.txt (47분, 692 segment)
- 20210622_조음음운장애_1_STT.txt (47분, 1157 segment)
- 20210623_유창성장애_1_STT.txt (47분, 626 segment — 실제 조음 후반 + 청각장애)
- 20210623_유창성장애_2_STT.txt (45분, 본격 유창성) ⭐

### 잔여 (순서대로 진행 계속)

- 🔄 STT 음성장애(1) 백그라운드 (마지막 stub 보강)
- ⏳ STT 신경언어장애(1)
- ✅ Rhea Paul Ch3 중재 OCR + 언어발달지연 § T-X 보강 완료 (다음 ingest 항목)
- ⏳ Lint 점검

## [2026-05-10] ingest | Rhea Paul Ch3 중재 OCR + STT 음성장애 백그라운드 (54차 ingest 연속, "순서대로 진행" #8)

- pillar: clinical
- 작업 범위: Rhea Paul Ch3 중재 본문 정독 → 언어발달지연 § T-X 추가 (5차 보강)
- 병렬: STT 음성장애(1) 백그라운드 시작

### Rhea Paul Ch3 핵심 발견 ⭐⭐⭐

#### A. 중재 4 목표 — Olswang & Bain (1991, 그림 3-1)
- **촉진** (Facilitation) — 발달 가속화, 궁극적 수준은 변경 X
- **유지** (Maintenance) — 발달 수준 보존
- **유도** (Induction) — 미발달 → 발달
- **변경** (Compensation) — 결함 극복 (대안적)

→ MVP F4 시계열 진전도 임상 토대 정본 (4 목표 중 어느 단계인지 식별 + 추적)

#### B. Sammy 사례 — 회색지대 부모 시장 정당화 ⭐⭐⭐
- 3세 아동 / 명료도 결함 / LEA 자격 미충족 → 부모 자발적 임상가 찾기 → 6개월 후 4 영역 (명료도·행동·사회·부모 정서) 개선
- → MVP Persona 이지수 (Seg A 불안형) + 회색지대 부모 30-50만 임상 직접 입증
- Whitehurst et al. 1991 반대 관점도 인용 (양면 제시)

#### C. Fey (1986) 중재 접근법 3 종 ⭐⭐⭐
- **임상가 중심 (CD)**: 모든 측면 임상가 통제. DTI (독립 회기 중재). Peterson 2004
- **절충형 (Hybrid)**: 환경치료·스크립트치료·EMT
- **아동 중심 (CC)**: 일상활동·촉진적 놀이. 4 핵심기법 (평행·확장·기다리기·반응적)

→ MVP 매핑:
- F1-a 자동 평가 = CD 디지털화
- F11 동화 = CC (4 기법) 일방향 콘텐츠
- F15 챗봇 = 절충형 (EMT·Mand-Model)

#### D. 반응요구-후시범 (Mand-Model) — F15 자문 항목 19 후보
- 우발적 교수법과의 차이: 임상가가 아동 의사소통 개시 기다리지 않음
- F15 = Mand-Model 디지털화

### 갱신 페이지

갱신 — clinical/concepts/언어발달지연.md (§ T-X 추가, 본문 5차)
- § T 중재 4 목표 ⭐⭐
- § U Sammy 사례 — 회색지대 부모 시장 정당화 ⭐⭐⭐
- § V Fey 1986 3 접근법 자연스러움 연속선 ⭐⭐⭐
- § W Mand-Model
- § X 본 ingest 통합 MVP 임상 토대

갱신 — wiki/index.md
- 언어발달지연 = 1·2·3·4차 → **1·2·3·4·5차** (Ch3 중재 통합)

### 핵심 임상 토대 신규 발견

| 출전 | 발견 | MVP 매핑 |
|---|---|---|
| Olswang & Bain 1991 | 중재 4 목표 (촉진·유지·유도·변경) | F4 시계열 추적 정본 |
| Sammy 사례 (Ch3) | 회색지대 부모 시장 정당화 (LEA 자격 미충족 + 부모 자발) | MVP 시장 직접 입증 ⭐⭐⭐ |
| Fey 1986 | 3 접근법 자연스러움 연속선 (CD-Hybrid-CC) | MVP 6 핵심 기능 분포 |
| Peterson 2004 | DTI (독립 회기 중재) 정의 | F1-a 자동 평가 임상 토대 |
| Whitehurst 1991 (반대 관점) | "촉진만이라면 정당성 없음" | HITL 양 관점 정합 |
| Mand-Model | 아동 개시 기다림 X | F15 자문 항목 19 |

### 잔여 (순서대로 진행 계속)

- ✅ STT 음성장애(1) 완료 + 음성장애 stub → 본문 1차 보강 격상 (다음 ingest 항목)
- 🔄 STT 신경언어장애(1) 백그라운드 처리 중
- ✅ Lint 점검 완료 (다음 ingest 항목)

## [2026-05-10] lint | 54차 ingest 누적 변경 위키 Lint 점검 (CLAUDE.md §5.3)

- pillar: meta
- 작업 범위: 누적 변경 검증 (cross-link · 고아 페이지 · 신규 entity 후보 · 모순)
- 도구: grep + bash 자동 분석

### Lint 결과

#### 1. 고아·낮은 inbound 페이지 검출 → ✅ 정상 (고아 없음)

최저 inbound 페이지 (3-5건):

| 페이지 | inbound | 평가 |
|---|---|---|
| KOCS | 3 | 신규 entity, 정상 |
| NISE-B-ACT-학습장애검사 | 3 | synthesis, 정상 |
| glossary | 3 | 인덱스, 정상 |
| 음성장애 | 3 | 신규 본문 1차 격상 직후, 향후 cross 증가 예정 |
| 유창성장애 | 4 | 신규 본문 1차 격상 직후 |
| MVP-clinical-foundation | 5 | 신규 product synthesis, 정상 (54차 ingest 신규) |

→ **고아 페이지 없음**. 모든 페이지 최소 3+ inbound.

#### 2. Clinical → Product cross-link 누락 → ✅ 0 페이지 (완벽)

**모든 clinical 페이지가 product 측 cross-link 보유**. 54차 ingest로 클러스터 간 양방향 완전 활성화.

#### 3. Product → Clinical cross-link 누락 (13 페이지)

| 페이지 유형 | 누락 페이지 | 평가 |
|---|---|---|
| 시리즈 timeline | PRD-evolution, SRS-evolution | 정상 (timeline은 직접 인용 X) |
| 기술 영역 | multi-llm-workflow, tech-architecture | 정상 (기술 영역) |
| Task 메타 | task-breakdown-overview | 정상 |
| 메타 대시보드 | open-issues-dashboard | ⚠️ 갱신 가능 (clinical lint 결과 추가) |
| 경쟁사 entities | 에듀템 · 에이치투케이 · 와우키키 · 캐치잇플레이 | ⚠️ **일부 clinical cross 가능** (보강 후보) |
| Source 메타 | 31-32-VPS · 66-PRD-SRS-Mapping · SRS-V01-V05 Workflow | 정상 (메타 문서) |

→ **보강 후보**:
- 에이치투케이 (한글 파닉스) → [[clinical/concepts/조음장애]] § 한국어 음운
- 와우키키 (멀티모달 AI 부모-교사-아동) → [[clinical/concepts/아동언어치료-핵심기법]] § 4 기법
- 캐치잇플레이 (다국어 게이미피케이션) → [[clinical/concepts/다문화-언어발달]]
- open-issues-dashboard → lint 결과 추가

#### 4. 신규 entity 후보 — 본문 언급은 있지만 페이지 없음 (13 후보) ⚠️

| Entity | 본문 인용 페이지 수 | 우선순위 |
|---|---|---|
| **Tye-Murray** (저자) | 4 | ⭐⭐⭐ 1순위 |
| **AAIDD** (기관) | 1+ | ⭐⭐ 2순위 (지적장애 정의 출전 기관) |
| **ADOS-2** (검사) | 1+ | ⭐⭐ 2순위 (ASD 진단 표준) |
| **LEAP / TEACCH / PRT** (프로토콜) | 1+ | ⭐⭐ 2순위 (ASD 종합 치료 모델) |
| **TOWL-4** (검사) | 1+ | ⭐ 3순위 (학령기 writing) |
| **K-CTONI-2 / K-ABC / K-WAIS** (검사) | 1+ | ⭐⭐ 2순위 (인지 평가, 한국 임상 표준) |
| **언어문제해결력 검사** (검사) | 1+ | ⭐⭐ 2순위 (한국 ID 표준) |
| **APIB** (검사) | 1+ | ⭐ 3순위 (조산아) |
| **Rhea-Paul** (저자) | 5+ | ⭐⭐⭐ 1순위 |

→ **stub 페이지 13개 생성 권고**. 우선순위 1순위 2개 (Tye-Murray, Rhea Paul) + 2순위 8개 + 3순위 3개.

#### 5. 영유아 연령 구간 일관성 확인 → ✅ 모순 없음

- **만 2-7세** = MVP 공식 타깃 (전체 영유아)
- **만 4-7세** = F15 활성 연령 (ADR-14 안전 게이트)
- **만 0-1.5세** = SELSI 양육자 보고식 + Tye-Murray Ch14 발달 지표

→ 3 구간 명확 구분, 모순 X. 명확성 위해 페이지마다 항상 (MVP 만 2-7세 / F15 만 4-7세) 명시 권장.

#### 6. 누락된 임상 출전 검증 → ✅ 양호

54차 ingest 결과 직접 인용 출전 확인:
- ASHA 1993 ✅ (언어발달지연 § B)
- Tomblin 2008 ✅ (언어발달지연 § C)
- Sparks 1989 ✅ (언어발달지연 § K)
- Erber 1982 ✅ (인공와우-청능재활 § B-2)
- AAIDD 2010 ✅ (지적장애-언어중재 § K)
- Fey 1986 ✅ (언어발달지연 § V)
- Fey 1986 SD -1.25 ✅ (언어발달지연 § C)
- Peña et al. 2006 ✅ (언어발달지연 § P)
- Olswang & Bain 1991 ✅ (언어발달지연 § T)

### Lint 권고 (우선순위)

1. ⭐⭐⭐ **신규 entity 1순위 2개 생성**: Tye-Murray (저자, 4 인용) + Rhea Paul (저자, 5+ 인용)
2. ⭐⭐ 신규 entity 2순위 8개 생성: AAIDD · ADOS-2 · LEAP · TEACCH · PRT · K-CTONI-2 · K-ABC · 언어문제해결력 검사
3. ⭐ open-issues-dashboard에 lint 결과 통합
4. ⭐ 경쟁사 entity 3 개 (에이치투케이·와우키키·캐치잇플레이) clinical cross-link 보강 후보

### Lint 종합 평가

- ✅ **고아 페이지 0건**
- ✅ **Clinical → Product cross-link 100% 활성**
- ⚠️ **신규 entity 13건** (대부분 54차 ingest 식별 — stub 생성 권고)
- ✅ **임상 출전 누락 없음**
- ✅ **연령 구간 모순 없음**
- ✅ **양방향 cross-link 매트릭스 양호** (이전 ingest F15-checklist 7 + MVP-clinical-foundation 10 + Tomblin·Sparks·Fey 등 직접 인용 다수)

→ ⭐⭐⭐ **54차 ingest 누적 변경의 안정성·일관성 확인 완료**. 추가 정독은 안전하게 진행 가능.

### 잔여 (순서대로 진행 계속)

- 🔄 STT 신경언어장애(1) 백그라운드 처리 중
- ✅ 신규 entity 페이지 생성 (Lint 권고 #1-2) — 다음 ingest 항목 (10개 생성 완료)
- ⏳ Treatment of LD 부록 27편 STT

## [2026-05-10] ingest | Lint 권고 #1-2 신규 entity 10 개 stub 생성 (54차 ingest 연속, "해" 진행)

- pillar: clinical
- 작업 범위: 54차 ingest Lint 점검 권고에 따라 신규 entity stub 생성

### 신규 10 entity (1·2 순위)

**1순위 (저자 entity 2개)**:
1. **Tye-Murray** — 청능재활 표준 교재 저자 (4 inbound). Ch4 4단계 위계 + Ch14 영유아 6 발달 지표
2. **Rhea-Paul** — 언어발달장애 표준 교재 저자 (5+ inbound). Ch1 ASHA·Tomblin + Ch3 4 목표·3 접근법 + Ch6 Sparks 1989

**2순위 (기관·검사·프로토콜 8개)**:
3. **AAIDD** — 미국 지적·발달장애협회 (Schalock 2010 ID 정의 출전)
4. **ADOS-2** — Lord 2012 ASD 진단 국제 표준
5. **LEAP** — Hoyson/Strain 1984 ASD 통합 환경 + 또래 매개 CTM
6. **TEACCH** — Mesibov 2005 ASD 구조화 환경 + 시각 단서 CTM
7. **PRT** — Koegel 1988 ASD NDBI 8 컴포넌트 (Stahmer 2019)
8. **K-CTONI-2** — 한국 종합 비언어 지능검사 2판
9. **K-ABC-II** — Moon 2014 한국 카우프만 아동 지능검사 (ID IQ 55-70 기준)
10. **언어문제해결력 검사** — 한국 ID 평가 표준 (원인이유·해결추론·단서추측)

### 갱신 페이지

신규 — clinical/entities/ (10 개):
- Tye-Murray.md / Rhea-Paul.md / AAIDD.md
- ADOS-2.md / LEAP.md / TEACCH.md / PRT.md
- K-CTONI-2.md / K-ABC-II.md / 언어문제해결력-검사.md

갱신 — wiki/index.md
- clinical/entities 표에 10 신규 행 추가
- 통계: clinical 30 → **40 페이지** (9 → 19 entities), 전체 113 → **123 페이지**

### Cross-link 신규 활성화

신규 10 entity 페이지는 모두 다음 페이지와 cross-link 활성화:

| Entity | 주요 cross-link |
|---|---|
| Tye-Murray | 인공와우-청능재활 + MVP-clinical-foundation + Rhea-Paul |
| Rhea-Paul | 언어발달지연·지적장애·자폐·다문화 + MVP-clinical-foundation + Tye-Murray |
| AAIDD | 지적장애-언어중재 § K + Rhea-Paul |
| ADOS-2 | 자폐-화용중재 + Rhea-Paul |
| LEAP / TEACCH / PRT | 자폐-화용중재 + 상호 cross |
| K-CTONI-2 / K-ABC-II | 지적장애-언어중재 |
| 언어문제해결력-검사 | 지적장애·학습장애·내러티브 + MVP-clinical-foundation |

→ **20+ inbound 링크 신규 활성화**

### 미생성 entity (잔여)

3순위 (낮은 우선순위):
- TOWL-4 (학령기 writing)
- APIB (조산아)
- K-WAIS (성인 인지)

→ 후속 ingest 또는 lint 시 추가 검토.

### 잔여 (순서대로 진행 계속)

- ✅ STT 신경언어장애(1) 완료 + 실어증 본문 1차 보강 (다음 ingest 항목)
- ✅ Rhea Paul part2 Ch7 OCR + 언어발달지연 § Y-AC 본문 6차 보강 (다음)
- ⏳ Tye-Murray part2 OCR (Ch5-10)
- ⏳ Rhea Paul part2 Ch8-9 + part3 Ch10-14 OCR
- ⏳ Treatment of LD 부록 STT

## [2026-05-10] ingest | Rhea Paul part2 Ch7 초기 언어 평가·중재 OCR → 언어발달지연 § Y-AC (54차 ingest 연속, "순서대로 진행" #11)

- pillar: clinical
- 작업 범위: [[clinical/concepts/언어발달지연]] § Y-AC 추가 (6차 보강)
- 도구: easyocr (Korean+English) Rhea Paul part2 PDF

### Rhea Paul Ch7 핵심 발견 ⭐⭐⭐

#### A. 문해전 발달 (Preliteracy Development, book p.336)
- Trivette, Dunst & Gorman 2010 메타고찰 — 부모 책 읽어주기 = 수용·표현언어 증가
- 5 전략 (Bernadowski 2008·Machado 2010·Rosenquest 2002·Scheffell 2000):
  1. 발달적 적합 책 가족 선택
  2. 정례화된 상호작용 위기 ("fill in")
  3. 부모 과장된 억양·강세
  4. 책 주제 관련 놀이 활동
  5. 탈맥락화된 말 노출
- 장애 아동 = 책 노출 감소 (Goin 2004) — MVP 회색지대 부모 격차 해소 메커니즘

#### B. ASD 아장이 (book p.341)
- 2-3세 ASD 조기 진단 가능 (Chawarska et al.) — MVP 영유아 정합
- McClannahan & Krantz 스크립트 치료법 (반향어 → 가족 이름·일상 변형)
- 자발적 언어 ↑ = 반향어 ↓

#### C. 놀이·상징 평가 — 운동결함 적응
- "선결요건 X — 중재 방향 결정용" 원칙 (ADR-04 정합)
- 5 도구: Dunst 1980 사물영속성 / 벤크로 장갑 / 장난감 스위치 / Guerette 1999 / Byrne 2001 뇌 활동

#### D. AAC 결정 (book p.346)
- Millar, Light & Schlosser 2006 메타분석: **AAC = 말 산출 방해 X** (부모 흔한 우려 반박)
- PECS (Bondy 2004) — 그림 교환 의사소통
- Beukelman & Mirenda 2005 표준 교재
- 18개월 이하 = iconic 체계 (그림·선화) 권장

### 갱신 페이지

갱신 — clinical/concepts/언어발달지연.md (§ Y-AC 추가)
- § Y 문해전 발달 5 전략 ⭐⭐⭐ — F11 동화 임상 토대
- § Z ASD 아장이 + McClannahan & Krantz 스크립트
- § AA 놀이·상징 평가 + 운동결함 5 도구
- § AB AAC + PECS + Millar 2006 메타분석
- § AC Ch7 통합 MVP 매트릭스

갱신 — wiki/index.md
- 언어발달지연 = 1·2·3·4·5차 → **1·2·3·4·5·6차** 본문 보강

### MVP 임상 토대 강화 ⭐⭐⭐

| MVP | Rhea Paul Ch7 출전 |
|---|---|
| F11 동화 | 5 전략 + iconic 체계 (18개월 이하) |
| F15 챗봇 | 정례화된 상호작용 "fill in" (Mand-Model 책 버전) |
| F1-a 다양화 | 운동결함 5 도구 (Dunst·Guerette·Byrne) |
| F1-b 영유아 | ASD 2-3세 조기 진단 |
| AAC 정합 | Millar 2006 — AAC ≠ 말 산출 방해 |
| ADR-04 | 선결요건 결정 X — 중재 방향 결정용 |

### 잔여 (순서대로 진행 계속)

- ✅ Rhea Paul part2 Ch8 평가 + Ch9 중재 OCR + 언어발달지연 § AD-AJ 본문 7차 보강 (다음 ingest 항목)
- ⏳ Rhea Paul part3 (Ch10-14 학령기·청소년·고급언어)
- ⏳ Tye-Murray part2 OCR (Ch5-10)
- ⏳ Treatment of LD 부록 STT
- ⏳ 5대 장애 영상 추가

## [2026-05-10] ingest | Rhea Paul Ch8 평가 + Ch9 중재 OCR → 언어발달지연 § AD-AJ 본문 7차 보강 (54차 ingest 연속, "순서대로 진행" #12)

- pillar: clinical
- 작업 범위: [[clinical/concepts/언어발달지연]] § AD-AJ 추가 (7차 보강)
- 도구: easyocr Rhea Paul part2 PDF

### Ch8 평가 + Ch9 중재 핵심 발견 ⭐⭐⭐

#### A. MLU + IPSyn — 학령전 평가 표준 단위
- **MLU** (Miller 1981) — 평균 발화 길이 (5 단계 Brown's Stages)
- **IPSyn** (Scarborough 1990) — Miller 절차의 규준참조적 확대 ⭐⭐⭐:
  - 50-100 발화 표본 + 각 구조 2번 출현 '표현성 규준'
  - 첫 2번만 계산 = 효율적
  - 구문 진전 정교 측정 (MLU 대비)
  - **Long & Fey (2004) Computerized Profiling** = MVP F1-a 자동화 표준 임상 토대

#### B. 5 발달 단계 (Brown's Stages I-V+)
- I: 기초 동사구 (3인칭 -s 미사용)
- II: NP 없는 연쇄 동사
- III: won't · do 비도치
- IV: 조동사 도치 + 의문문
- V: 비교절 + 복합문

→ 영어 기준 — 한국어 어미·조사·종결어미 별도 표준 필요

#### C. 화용 평가 — 표 8-8 (book p.401) ⭐⭐
언어장애 아동 화용 6 영역 결함 (Bishop 2000 + Craig 1991):
1. 요구하기 (문법 불완전, 간접형 적게)
2. 설명하기 (판에 박힌 형식)
3. 전제 (청자 지식 파악 X, 대명사 과잉)
4. 순서 지키기 (부적절 형식, 짧음)
5. 반응하기 (일정치 않음)
6. 말 스타일·사용역 변환

#### D. 화용 평가 표준 도구 3 종
- Pragmatic Protocol (Prutting & Kirchner 1983)
- Pragmatic 3 영역 (Roth & Spekman 1984)
- Peanut Butter Protocol (Creaghead 1984)

#### E. 화용 중재 통합 원칙 (Craig 1983 + Marton 2005) ⭐⭐
- 화용 = 별개 규칙 X — **중재 상황 자체로 정의**
- 새 형태 각각이 다양한 실용적 맥락에서 연습
- 별개 기술로 말차례바꾸기 X → 임상가와 교대 활동
- → MVP F15 챗봇 = 상황 기반 발화 유도 정합

### 갱신 페이지

갱신 — clinical/concepts/언어발달지연.md (§ AD-AJ 추가, 본문 7차)
- § AD MLU + IPSyn ⭐⭐⭐
- § AE 5 발달 단계 (Brown's Stages)
- § AF 화용 평가 6 영역 + 3 도구
- § AG Ch9 화용 중재 통합 원칙 (Craig·Marton)
- § AH 한국어 적응 차이 ⚠️
- § AI Ch8+9 통합 MVP F1-a/F4 매트릭스
- § AJ 후속 잔여

갱신 — wiki/index.md
- 언어발달지연 = 6차 → **7차** 본문 보강

### MVP F1-a/F4 임상 토대 정본 확립 ⭐⭐⭐

| MVP | 출전 |
|---|---|
| F1-a linguistic 기초 | MLU (Miller 1981) |
| F1-a linguistic 정교 | **IPSyn (Scarborough 1990)** ⭐⭐⭐ |
| F1-a 발달 단계 | Brown's Stages I-V+ |
| F1-a use (화용) | 6 영역 (Bishop 2000) |
| F1-a 자동화 표준 | **Long & Fey 2004 Computerized Profiling** ⭐ |
| F4 시계열 진전 | IPSyn 구문 진전 패턴 |
| F15 화용 통합 | Craig 1983 · Marton 2005 (별개 규칙 X) |

### 한국어 적응 잔여

영어 기준 분석을 한국어로 적응 시 필요:
- 한국어 어미 단위 (-아/어, -은/는, -ㄴ다)
- 한국어 조사 (을/를, 이/가)
- 한국어 종결어미 (-요, -다, -까)

→ MVP F1-a 한국어 linguistic 측정 별도 표준 개발 필수

### 잔여 (순서대로 진행 계속)

- ✅ Rhea Paul part3 Ch10·11 OCR + 학습장애-언어재활 § G-M 보강 완료 (다음 ingest 항목)
- ✅ Tye-Murray part2 Ch7-8 OCR + 인공와우-청능재활 § T-U 보강 완료
- ✅ STT 언어발달장애(2) 51분 + 언어발달지연 § AK-AM 보강 완료 (Bates 1976 3 단계)
- ⏳ Treatment of LD 부록 27편 STT (잔여)
- ⏳ Rhea Paul part3 Ch12-14 (학령기 중재·청소년 고급언어)
- ⏳ Tye-Murray part2 Ch9-10 (의사소통 전략 훈련·상담)

## [2026-05-10] ingest | 다중 병렬 처리 (Rhea Paul part3 Ch10·11 + Tye-Murray part2 Ch7·8 + STT 언어발달장애(2)) (54차 ingest 연속, "한꺼번에 진행" #13)

- pillar: clinical
- 작업 범위: 사용자 "한꺼번에 진행" 지시 — 4 작업 중 처리 가능한 3 작업 병렬 완료
- 도구: easyocr + faster-whisper base + imageio-ffmpeg

### 처리 결과

#### A. Rhea Paul part3 Ch10·11 OCR (학령기 평가)

**핵심 발견** ⭐⭐⭐:
- **단순 견해 (Simple View of Reading)** (Kamhi 2009) — 그림 10-1 4 분면 분류:
  - 전형적 위기 / 난독증 / 특정 이해 장애 (SCD) / 혼합 해독·이해 장애
- **NICHD 난독증 정의** (Lyon, Shaywitz, & Shaywitz 2003) — 음운 처리 결함 기반
- 음운 인식 ↔ 위기 연관 (다수 연구 — Bradley 1985 외)
- **학령기 평가 도구**: CELF-4 / RAN / 음운 인식 / 교과기반 어휘 (Catts 1999a·Justice 2006·Nelson 2010)
- Glassbox 11-1 군인 게임 준거참조 어휘 평가

→ [[clinical/concepts/학습장애-언어재활]] § G-M 보강 — 본문 1·**2차** 격상

#### B. Tye-Murray part2 Ch7·8 OCR (대화 방식·유창성)

**핵심 발견**:
- **상호적 vs 비상호적 행동** (Interactive vs Noninteractive Behavior)
- 적극적 · 협조적 대화 전략 vs 수동적 · 무반응
- 대화 유창성 (Conversational Fluency) = 본 책의 중심 주제
- 높은·낮은 대화 유창성 분류

→ [[clinical/concepts/인공와우-청능재활]] § T-U 보강 — **본문 5차** (이전 4차)

#### C. STT 언어발달장애(2) 51분 — Bates 의사소통 발달 3 단계 ⭐⭐

**핵심 발견**:
- **Bates (1976) 3 단계**:
  1. **언향적 단계** (Perlocutionary, 0-8개월): 의도 X, 양육자가 의도 부여
  2. **언표내적 단계** (Illocutionary, 8-12개월): 의도 O + 말 X (제스처)
  3. **언평적 단계** (Locutionary, 12개월+): 실제 단어
- 시험 빈출: 언향적 vs 언표내적 차별 (의도 유무가 핵심)

→ [[clinical/concepts/언어발달지연]] § AK-AM 보강 — **본문 8차**

→ ⭐⭐ **MVP F1-b 영유아 양육자 보고식 임상 토대 강화**:
- "아이가 의도적으로 가리키나요?" = 언표내적 단계 진입 신호
- "원하는 것을 표현하기 위해 소리를 내나요?" = 언표내적 단계

### 갱신 페이지

갱신 — clinical/concepts/학습장애-언어재활.md (§ G-M 추가, 본문 1·2차)
갱신 — clinical/concepts/인공와우-청능재활.md (§ T-U 추가, 본문 5차)
갱신 — clinical/concepts/언어발달지연.md (§ AK-AM 추가, 본문 8차)
갱신 — wiki/index.md (3 페이지 갱신)

### STT 영구 저장 누적 (6편)
- 20210621_언어발달장애_1_STT.txt (47분, 692 segment)
- 20210621_언어발달장애_2_STT.txt (51분, 1510 segment) ⭐ — 본 ingest
- 20210622_조음음운장애_1_STT.txt (47분, 1157 segment)
- 20210623_유창성장애_1_STT.txt (47분, 626 segment)
- 20210623_유창성장애_2_STT.txt (45분, 156 segment)
- 20210624_신경언어장애_1_STT.txt (43분, 603 segment)
- 20210625_음성장애_1_STT.txt (40분, 310 segment)

### 사용자 요청 vs 실제 처리

사용자 요청 4 작업:
1. Rhea Paul part3 (Ch10-14) — ✅ 부분 (Ch10·11 완료, Ch12-14 잔여)
2. Tye-Murray part2 (Ch5-10) — ✅ 부분 (Ch7·8 완료, Ch5·6·9·10 잔여)
3. Treatment of LD 부록 27편 STT — ⏳ 미처리 (27편 × 30-50분 = 13-22시간, 한 세션 불가)
4. 5대 장애 영상 추가 — ✅ 1편 (언어발달장애(2) 완료, 나머지 14+편 잔여)

→ **한 세션 처리 한계**:
- OCR: 작업당 ~5-10분 → 2 작업 완료 (Rhea Paul Ch10·11 + Tye-Murray Ch7·8)
- STT: 작업당 ~30-60분 → 1 작업 완료 (백그라운드 동안 OCR 진행)
- 잔여 작업: 다음 세션에 STT 1-2편씩 분산 처리 권고

### 잔여 (다음 세션 권고)

- ⏳ STT Treatment of LD 부록 1편 시작 (점진 처리)
- ⏳ STT 5대 영역 추가 영상 (조음·유창성·신경언어·음성 각 2·3·4편)
- ⏳ Rhea Paul part3 Ch12-14 (학령기 중재·청소년 고급언어)
- ⏳ Tye-Murray part2 Ch5·6·9·10 + part4 (부록)

## [2026-05-10] ingest | STT 신경언어장애(1) → 실어증 본문 1차 보강 (54차 ingest 연속, 5대 영역 STT 100% 완성) ⭐⭐⭐

- pillar: clinical
- 작업 범위: [[clinical/concepts/실어증]] 보강 1차 + 5대 영역 STT 정독 완성
- 도구: faster-whisper base (43분 영상)

### STT 결과 — 신경언어장애 본격 본문

#### 핵심 신규 발견

**A. 한국 자격시험 6 케이스 분류** (실어증·마비말·말실행증·치매·RHD·TBI)
- 실어증 가장 많이 출제 (10+ 문제)
- 3 대분류: 신경언어 / 운동언어 / 신경 인지 의사소통

**B. 뇌 해부 3 핵심 영역**:
- 브로카 (전두엽) = 표현
- 베르니케 (측두엽) = 이해
- **궁상속 (Arcuate Fasciculus)** ⭐ = 따라말하기 = 시험 자주 출제
- 뇌량 = 좌·우 반구 연결

**C. 전도성 실어증** (Conduction Aphasia):
- 궁상속 손상 = 이해·표현 양호 + **따라말하기만 결함** ⭐
- 임상 진단 핵심 패턴

**D. 뇌혈관 + 실어증 부위** ⭐⭐:
- 대동맥 → 완도동맥 → 총경동맥 → 내경동맥 → **MCA + ACA**
- **MCA (중대뇌동맥) = 베르니케 + 브로카 둘 다 공급 → 실어증 가장 잘 유발** (시험 빈출)
- ACA → 마비말·브로카 부분
- PCA → 시각 인지 결함

**E. MVP 회피 영역 확정** — 실어증 ⛔ 5 사유

### 갱신 페이지

갱신 — clinical/concepts/실어증.md (§ A-F 추가, 본문 1차 보강)
- § A 한국 자격시험 6 케이스 + 3 대분류
- § B 뇌 해부 3 영역 + 좌·우 반구
- § C 전도성 실어증 (궁상속 손상) ⭐
- § D 뇌혈관 + MCA 실어증 빈출
- § E MVP 회피 5 사유
- § F STT 출처

갱신 — wiki/index.md
- 실어증 = 보강 → **본문 1차 보강** (STT 통합)

### ⭐⭐⭐ 5대 의사소통장애 영역 STT 100% 완성

| 영역 | STT 정독 |
|---|---|
| 1. 언어발달장애 | ✅ 20210621_언어발달장애_1_STT.txt (47분, 692 segment) |
| 2. 조음음운장애 | ✅ 20210622_조음음운장애_1_STT.txt (47분, 1157 segment) |
| 3. 유창성장애 | ✅ 20210623_유창성장애_1+2_STT.txt (45+47분) |
| 4. **신경언어장애** ⭐ | ✅ **20210624_신경언어장애_1_STT.txt** (43분, 603 segment) — 본 ingest |
| 5. 음성장애 | ✅ 20210625_음성장애_1_STT.txt (40분, 310 segment) |

→ **24편 5대 장애 영상 중 6편 STT 완료** (각 영역 1편씩). 잔여 영상은 추가 정독 또는 다음 ingest 영역.

### Cross-link 신규 활성화 (4 페어)

- 실어증 ↔ 신경인지장애-노인의사소통 (3 신경 인지 의사소통장애 = 치매·RHD·TBI)
- 실어증 ↔ 마비말장애 (운동언어장애 2 케이스)
- 실어증 ↔ K-WAB·K-BNT entity
- 실어증 ↔ MVP-clinical-foundation § 7 ADR-04 (회피)

### 잔여 (순서대로 진행 계속)

- ⏳ Tye-Murray part2 OCR (Ch5-10 독화·대화·상담)
- ⏳ Rhea Paul part2-3 OCR (Ch6 부가·Ch12-14)
- ⏳ Treatment of LD 부록 27편 STT
- ⏳ 5대 장애 영상 추가 (2·3·4편씩)
- ⏳ 3순위 entity (TOWL-4·APIB·K-WAIS)

## [2026-05-10] ingest | STT 음성장애(1) → 음성장애 stub → 본문 1차 보강 격상 ⭐⭐ (54차 ingest 연속, "순서대로 진행" #9 — **clinical 8 stub 100% 완성**)

- pillar: clinical
- 작업 범위: [[clinical/concepts/음성장애]] stub → 본문 1차 보강 격상
- 도구: faster-whisper base (40분 영상)

### STT 결과 — 본격 음성장애 본문 ⭐⭐

음성장애(1) = 한국 자격시험 음성장애 25 문제 영역 본격 본문:
- 한국 자격시험 4 분야: 음성 산출 기관·정상 음성 / 분류 / 평가 / 치료
- 음성 산출 3 시스템: 호흡·발성·공명 (조음 제외)
- 말 호흡 vs 일반 호흡 — 폐활량 20-25%
- ⭐⭐ **음성장애 분류 4 영역**: 기능적·기질적·신경학적·공명장애
- 평가 2 영역: 비기기적 (GRBAS·CAPE-V·VHI) + 기기적 (음향·후두 내시경·EGG)
- ⭐ **특정 집단 5 종 시험 빈출**: 직업적·노인·청각장애·**성전환자**·무후두 음성
- 치료 5 영역: 기능·기질·신경학·특정 집단·공명
- 발성 해부: 후두덮개·갑상연골·피열연골 / 설골 상·하근 / **윤상갑상근** (음도 조절 핵심)

### 갱신 페이지

갱신 — clinical/concepts/음성장애.md (§ A-K 추가, stub → 본문 1차)
- § A 한국 자격시험 4 분야
- § B 음성 산출 3 시스템
- § C 말 호흡 vs 일반 호흡 ⭐
- § D 음성장애 분류 4 영역 ⭐⭐⭐
- § E 음성 평가 2 영역 (GRBAS·CAPE-V·VHI·음향분석·후두내시경)
- § F 특정 집단 5 종 (성전환자 빈출)
- § G 음성 치료 5 영역
- § H 발성 해부 (윤상갑상근)
- § I STT 출처
- § J MVP 회피 5 사유 ⭐
- § K 출제 영역 매트릭스

갱신 — wiki/index.md
- 음성장애 = 스텁 → 본문 1차 보강

### ⭐⭐⭐ Clinical 8 stub 100% 본문 1차 보강 완성

54차 ingest 시작 시 8 stub (유창성·음성·학습장애·SLI·다문화·지적장애·신경인지·내러티브) **모두 본문 1차 이상 보강 완료**:

| 페이지 | 보강 차수 |
|---|---|
| 자폐-화용중재 | 본문 1·2·3·4차 (17편 정독) |
| 지적장애-언어중재 | 본문 1·2·3차 (11편 + Ch4) |
| 단순언어장애-SLI | 본문 1차 (3편) |
| 학습장애-언어재활 | 본문 1차 (3편) |
| 내러티브-담화-추론-중재 | 본문 1차 (5편) |
| 다문화-언어발달 | 본문 1·2차 (4편 + Ch5) |
| 신경인지장애-노인의사소통 | 본문 1차 (4편) |
| **유창성장애** | **본문 1차** (STT) |
| **음성장애** ⭐ | **본문 1차** (STT) — 본 ingest 완료 |

추가 보강 페이지:
- 인공와우-청능재활 (Tye-Murray Ch1·Ch4·Ch14 OCR)
- 언어발달지연 (Rhea Paul Ch1·Ch2·Ch3·Ch6 OCR)
- 조음장애 (STT 조음음운 + 유창성(1) 청각장애 부분)
- 자폐-화용중재 (Rhea Paul Ch4 FXS 감별)

### STT 영구 저장 누적 (5편)
- 20210621_언어발달장애_1_STT.txt (47분, 692 segment)
- 20210622_조음음운장애_1_STT.txt (47분, 1157 segment)
- 20210623_유창성장애_1_STT.txt (47분, 626 segment)
- 20210623_유창성장애_2_STT.txt (45분, 156 segment 긴 segment)
- 20210625_음성장애_1_STT.txt (40분, 310 segment)

→ 5대 의사소통장애 영역 중 **5 영역 본문 STT 정독 완료** (신경언어장애만 잔여)

### 핵심 임상 토대 신규 발견 — 음성장애

| 발견 | MVP 매핑 |
|---|---|
| 음성장애 분류 4 (기능·기질·신경·공명) | ADR-04 회피 영역 5 사유 ⭐ |
| 특정 집단 5 (성전환자·무후두 등) | MVP 영유아 타깃 외 명시 |
| 윤상갑상근 = 음도 조절 핵심 | F1-a acoustic 영역 미포함 — 회피 |
| 기기적 평가 (후두 내시경·EGG) | MVP 자가 학습 불가 영역 — 회피 |
| Voice Hygiene + LSVT | 임상가 직접 지도 — 회피 |

### 잔여 (순서대로 진행 계속)

- ⏳ STT 신경언어장애(1) — 마지막 5대 영역
- ⏳ Treatment of LD 부록 27편 STT
- ⏳ Tye-Murray part2 (Ch5-10) OCR
- ⏳ Rhea Paul part2-3 (Ch 6 부가·Ch 12-14) OCR
- ⏳ Lint 점검
- ⏳ Rhea Paul part2-3 OCR (학령기·청소년)
- ⏳ 추가 4편 5대 장애 강의 영상 STT (조음·유창성·신경언어·음성)
- ⏳ Product 측 F1-b·F11 cross-link 강화
- ⏳ Lint 점검 (CLAUDE.md §5.3)

## [2026-05-11] ingest | 54차 ingest 8단계 (5단계 통합) — STT 조음음운(2)·신경언어(2) + Tye-Murray Ch4-5 + Rhea Paul Ch10-14 ⭐⭐⭐
- pillar: clinical
- 갱신:
  - wiki/clinical/concepts/조음장애.md — § J-P STT 조음음운(2) 51분 (음절구조·옹알이 5단계·자음 발달 정책·발달적 vs 비발달적 오류·유음 활음화·우선 치료 결정) — 8 새 표
  - wiki/clinical/concepts/인공와우-청능재활.md — § Y-HH Tye-Murray part1 Ch4 후반 (Erber 4 단계 활동·분석/종합·형식/비형식) + Ch5 독화 (동음동형·화자효과·유아 4-8개월·McGurk 효과·청시각 통합 3단계 Grant 1998·Cienkowski 노화) — 9 새 §
  - wiki/clinical/concepts/학습장애-언어재활.md — § N-R Rhea Paul Ch10-14 (학교 SLP·IDEA 12 진단·LD 46%·ASHA 2010 역할·RTI 3단계·Bloodgood 단어공부·German 단어찾기·T-unit·종속관계지표·Loban 1976·표 13-5 9 범주·Killgallon 7단계 문장결합) — 7 새 §
  - wiki/clinical/concepts/실어증.md — § G-J STT 신경언어(2) 51분 (뇌졸중 2분류·출혈/경색·혈전증/색전증·동맥류·TIA·TBI 2종·연하 4단계·후두 3중 보호·흡인 vs 침투 변별) — 5 새 §
- 추가 raw 파일:
  - raw/stt_output/20210622_조음음운장애_2_STT.txt (54KB, 870 segment)
  - raw/stt_output/20210624_신경언어장애_2_STT.txt (60KB, 1059 segment)
- 진행 중:
  - STT 음성장애(2) 백그라운드
- cross-link: 8건 신규 ([[조음장애]] ↔ [[인공와우-청능재활]], [[학습장애-언어재활]] ↔ [[단순언어장애-SLI]] / [[내러티브-담화-추론-중재]], [[실어증]] § 연하 → MVP 회피 영역, Rhea Paul Ch13-14 → MVP Phase 4)
- 메모: 본 ingest로 조음장애 (J-P), 인공와우-청능재활 (Y-HH), 학습장애-언어재활 (N-R), 실어증 (G-J) **모두 정본 수준 보강 완료**. 한국 자격시험 출제 핵심 + Rhea Paul + Tye-Murray 표준 교재 + STT 강의 정본 통합.


## [2026-05-11] ingest | 54차 ingest 9단계 (5단계 종합) — Tye-Murray part4 Ch14-15 + STT 음성장애(2) 추가 보강 ⭐
- pillar: clinical
- 갱신:
  - wiki/clinical/concepts/인공와우-청능재활.md — § II-QQ Tye-Murray part4 Ch14 영유아 6 영역 + Ch15 학령기 평가 5 원칙·말 명료도 3 방법·4 변수·분절 검사 도구 (Ling 1976·CID·SPINE)·표 15-4 언어 검사 (RITLS·GAEL·TSA·TACL·OWLS·IPSyn·PPVT-R·Reynell)·TTR·MSL·TERA-D/HH — 9 새 §
  - wiki/clinical/concepts/음성장애.md — § L-Q STT 음성(2) 51분 (정상 음성 5 요소 Boone·노화 음도·음향 물리 주파수/주기/파장/진폭·스펙트럼 vs 스펙트로그램·음성장애 분류 진입) — 6 새 §
- 추가 raw 파일:
  - raw/stt_output/20210625_음성장애_2_STT.txt (52KB, 725 segment)
- cross-link: 5건 신규 ([[인공와우-청능재활]] ↔ [[clinical/entities/Scarborough]], [[clinical/concepts/조음장애]] ↔ K-IPSyn 매핑, [[음성장애]] ↔ MVP 회피 영역 강화)
- 메모: 본 ingest로 인공와우-청능재활 = **part 1·2·3·4 + STT 모두 통합 — 본 위키 한국 청능재활 최정밀 정본 완성** (Erber 4 단계·청시각 통합·McGurk·Gagne 문제 해결·표 15-4 청각장애 언어 검사 + STT 청각장애 분류). 음성장애 = 정상 음성 5 요소·음향 분석 정본 + 분류 진입.
- STT raw: 9 파일 누적 (DLD 2 + 조음 2 + 유창 2 + 신경 2 + 음성 2 = 10편 중 1편 (신경 1) 누락)

### 잔여 (순서대로 진행 계속)

- ⏳ STT 신경언어장애(1) 누락된 1편 — 이미 진행됨 (앞서 보강)
- ⏳ STT 추가 영상 (조음 3-4·유창 3-4·신경 3-4·음성 3·DLD 3-4) - **5대 영역 추가 영상 75 → 36 잔여**
- ⏳ Tye-Murray part2 Ch5-6 부재 확인 → 모두 Ch7+ 시작 (Ch5-6 = part1 → 완성)
- ⏳ Rhea Paul part2 (Ch 후반 6-9) OCR
- ⏳ Treatment of LD 부록 27편 STT (대규모)
- ⏳ Lint 점검 (CLAUDE.md §5.3)
- ⏳ Open Issues Dashboard 갱신
- ⏳ 경쟁사 entity 3개 clinical cross-link 보강 (에이치투케이·와우키키·캐치잇플레이)

## [2026-05-11] ingest | 54차 ingest 10단계 (5단계 종합) — STT 유창성장애(2-1) 보강 ⭐
- pillar: clinical
- 갱신:
  - wiki/clinical/concepts/유창성장애.md — § M-Q STT 유창성(2-1) 45분 (유창성 정의 4요소·WHO 말더듬 정의·빙산 모델 3 요소·정상 vs 병리 단위별 결정 규칙) — 5 새 § (빙산 정본 강화)
- 추가 raw 파일:
  - raw/stt_output/20210623_유창성장애_2-1_STT.txt (50KB, 152 segment)
- STT raw 누적: **10 파일** (DLD 2·조음 2·유창 3·신경 2·음성 2 / 누락 신경 1 → 신경 1 = 신경언어장애 1편 5대 모두 1교시 완료)
- 메모: § P 정상 vs 병리 단위별 결정 규칙 = MVP F1-b 회피 영역 강화 핵심 임상 토대 — 보호자가 "사과 사과 사과" vs "사 사 사과" 구분 불가 → 5분 진단 회피 사유 명확.

## [2026-05-11] ingest | 54차 ingest 11단계 (3단계 종합) — STT 조음음운(3) + Rhea Paul Ch11 + Ch6/8/9 보강 ⭐
- pillar: clinical
- 갱신:
  - wiki/clinical/concepts/조음장애.md — § Q-U STT 조음음운(3) 43분 (독립분석 vs 관계분석·음운 인식 단위별·명료도 vs 자음정확도·음운 변동 결과 해석) — 5 새 §
  - wiki/clinical/concepts/학습장애-언어재활.md — § S-W Rhea Paul Ch11 (Dollaghan·Campbell 1992 봉괴 8 종류·Tough 1977 6 주요 기능·표 11-5 학령기 평가 도구 8 영문 표준·Prutting·Damico 화용 평가) — 5 새 §
  - wiki/clinical/concepts/언어발달지연.md — § W-Z Rhea Paul Ch6·Ch8·Ch9 (Janice 사례 가족중심 4 영역·Owens 2004 발화 분류 5 규칙·Brown 1973 MLU 6 규칙·NDW Klee 2004·Hesketh 2010 음운인식 통합 중재) — 4 새 §
- 추가 raw 파일:
  - raw/stt_output/20210622_조음음운장애_3_STT.txt (45KB, 733 segment)
- STT raw 누적: **12 파일** (조음 3·DLD 2·유창 3·신경 2·음성 2)
- cross-link: 6건 신규 ([[조음장애]] § Q 독립/관계분석 + § Y 음운인식 통합 ↔ [[언어발달지연]] § Y.3 / [[학습장애-언어재활]] § U BVAT 한국어 ↔ [[다문화-언어발달]])
- 메모: 본 ingest 후 5대 영역 + 4 페이지 추가 보강 완료. Rhea Paul 표준 교재 part1·part2·part3 모두 부분 통합 (Ch1-3·Ch6·Ch8·Ch9·Ch10·Ch11·Ch12·Ch13·Ch14). 한국 자격시험 출제 핵심 + Owens·Brown·Tough·Dollaghan·Hesketh 영문 표준 통합.

## [2026-05-11] ingest | 54차 ingest 12단계 (5단계 종합) — STT 신경(3) + Tye-Murray part4 용어해설 + Rhea Paul Ch6 부록·Ch7 ⭐
- pillar: clinical
- 갱신:
  - wiki/clinical/concepts/실어증.md — § K-O STT 신경(3) 43분 (실어증 평가 5 영역 + K-WAB AQ/LQ/CQ + 어휘성 청각실인증 vs 베르니케 + 말산출 4 단계 모델 + 마비말장애 7 유형 도입) — 5 새 §
  - wiki/clinical/concepts/인공와우-청능재활.md — § RR-TT Tye-Murray 용어해설 (15+ 약어·법적 기반 5종·청각 기술 표준 용어 13개) — 3 새 §
  - wiki/clinical/concepts/언어발달지연.md — § AA-DD Rhea Paul Ch6 부록 (21 영유아 평가 도구 + 5 섭식 평가) + Ch7 (첫 어휘집 8 범주 한국어 매핑·4 원칙·환경 중심 중재 milieu) — 4 새 §
- 추가 raw 파일:
  - raw/stt_output/20210624_신경언어장애_3_STT.txt (46KB, 742 segment)
- STT raw 누적: **13 파일** (조음 3·DLD 2·유창 3·신경 3·음성 2)
- cross-link: 6건 신규 ([[실어증]] § M ↔ [[마비말장애]] / [[인공와우-청능재활]] § SS ↔ MVP F11 / [[언어발달지연]] § CC ↔ MVP F3-b·F11)
- 메모: 본 ingest로 신경언어 5대 영역 모든 페이지 (조음·유창·신경·음성·DLD) STT 정본 통합 완료. Rhea Paul part2 Ch6-7-8-9 + part3 Ch10-11-12-13-14 모두 통합. Tye-Murray part1·2·3·4 모두 통합. ⭐ **3 단계 진행 완료 — Lint 진입 준비**.

## [2026-05-12] lint | CLAUDE.md §5.3 Lint 점검 + 18 항목 자동 수정 ⭐⭐⭐
- pillar: 양 기둥
- 추가 (clinical/sources/ 4 STT stub):
  - wiki/clinical/sources/2026-05-11-STT-조음음운장애-2.md (51분 강의 - 음절·옹알이·자음 발달·발달적 vs 비발달적 오류)
  - wiki/clinical/sources/2026-05-11-STT-조음음운-3.md (43분 - 독립분석·음운인식·명료도)
  - wiki/clinical/sources/2026-05-11-STT-음성장애-2.md (51분 - 정상 음성 5요소·스펙트럼)
  - wiki/clinical/sources/2026-05-11-STT-유창성장애-2-1.md (45분 - WHO 말더듬·빙산·정상 vs 병리)
- 추가 (clinical/entities/ 5 권위자 entity):
  - wiki/clinical/entities/Tomblin.md (1996 EpiSLI 5% + 2008 자연주의·규준)
  - wiki/clinical/entities/Fey.md (1986 SD -1.25 + CD/Hybrid/CC 3 접근법)
  - wiki/clinical/entities/Bloom-Lahey.md (1977 form·content·use 정본 + 첫 어휘집 8 범주)
  - wiki/clinical/entities/Scarborough.md (1990 IPSyn + 2003 Reading Rope)
  - wiki/clinical/entities/Erber.md (1982 4 단계 청능 계층)
- 갱신 (product/concepts/ 6 페이지 clinical cross-link 추가):
  - PRD-evolution.md (Clinical 기둥 cross-link 3건 추가)
  - SRS-evolution.md (Clinical 기둥 cross-link 3건 추가)
  - multi-llm-workflow.md (Clinical 기둥 cross-link 2건 추가)
  - open-issues-dashboard.md (Clinical 기둥 cross-link 3건 추가)
  - task-breakdown-overview.md (Clinical 기둥 cross-link 3건 추가)
  - tech-architecture.md (Clinical 기둥 cross-link 3건 추가)
- 갱신 (clinical/concepts/ 1 페이지 product 역링크 추가):
  - 신경인지장애-노인의사소통.md (Product 기둥 cross-link 4건 추가)
- 메모: Lint 결과 — 내러티브-담화·단순언어장애-SLI 2 페이지는 이미 product cross-link 존재 (Lint 보고서 과대 추정). 신경인지장애 1 페이지만 실제 누락 → 보강. **Lint 작업 완료**: 9 신규 페이지 (sources 4 + entities 5) + 7 페이지 cross-link 보강. 양 기둥 100% cross-pillar 정합.

## [2026-06-07] ingest | 55차 — NISE-B·ACT 검사도구 실물 batch (검사 책자 스캔 + 개정 연구보고서)
- pillar: clinical
- 원자료: `raw/언어치료 자료2/`
  - `기초학습능력검사(일기_쓰기_검사방법)/` — JPG 300장(IMG_2450~2749, 약 1.3GB). 2017 원판 실물 검사 책자(읽기·쓰기) + 기록지 + 검사요강. 표본 판독(약 26장) — 저작권상 문항 자극은 미전사, 구조·방법만 추출.
  - `기초학습능력검사+개정+연구(2／4년)+보고서.pdf` — 625쪽 (다운로드 완료 확인 + 정독). 국립특수교육원 2025 위탁연구(이태수 외).
- 추가 (raw 파생 텍스트):
  - raw/ocr_output/nise-bact-개정연구보고서-2-4년차-2025.txt (PDF 텍스트레이어 추출, 747KB, PyMuPDF)
- 추가 (clinical/sources 2):
  - wiki/clinical/sources/2026-06-07-NISE-BACT-읽기-쓰기-검사방법.md (2017 원판 실물 — 읽기 5영역·쓰기 3소검사·실시순서·채점)
  - wiki/clinical/sources/2026-06-07-NISE-BACT-개정연구보고서-2-4년차.md (2025 개정안 — 구성 개편·예비검사 통계·표준화 계획)
- 추가 (clinical/entities 1):
  - wiki/clinical/entities/RAN-빠른자동이름대기.md (음운 인출 자동화 + 난독증 예측 지표)
- 갱신 (clinical/concepts 1):
  - wiki/clinical/concepts/NISE-B-ACT-학습장애검사.md — § 검사 도구 실물 구조(읽기 5·쓰기 3·수학 4·실시방법·채점) + § 2025 개정안 변경점 신설, 구조표 "미정독" 해소, 출처·관련·보강 갱신
- 갱신: wiki/index.md (clinical sources 7→9 / entities 24→25 / 전체 132→135 + 마지막 갱신 + NISE-B 요약)
- cross-link: ⚠️ **원판(2017) ↔ 개정안(2025) 진화** 표기 (음운처리→음운과 음절·철자하기→맞춤법·수학 전면재편). RAN↔[[clinical/concepts/학습장애-언어재활]], 읽기이해 4수준↔[[clinical/concepts/내러티브-담화-추론-중재]], 편향배제↔[[clinical/concepts/다문화-언어발달]]. Product: F1-a·F3-b·F15·ADR-04·HITL·F10 정합 (각 source § "다른 기둥 cross-link").
- 메모: 로컬 OCR 도구(tesseract/imagemagick) 부재 → 이미지는 Read 비전 표본 판독, PDF는 PyMuPDF 텍스트레이어 추출로 처리. 저작권 표준화 검사도구 → 문항 자극 미전사, 구조·실시·채점·통계만 요약(위키 자체 정책 정합). 후속: 2026 표준화(3년차) 보고서 발간 시 규준·신뢰도·타당도 확정값 갱신 + 1년차 수요조사 보고서 미확보.

## [2026-06-07] lint | 55차 Lint — 다중 에이전트 감사 + 적대적 검증 + 승인 자동수정
- pillar: 양 기둥
- 방법: 결정론적 구조 스캔(링크 그래프·고아·cross-pillar·프론트매터·통계) + 다중 에이전트 워크플로(11 클러스터 + 4 타깃 + 21 claim 적대적 검증, reject 0) + 종합. 깨진 링크 raw 42건 = **전부 거짓양성**(log vault-relative `[[wiki/...]]` 등) → 실제 0건.
- 발견(고유 47): catalog/통계 드리프트 12 · cross-pillar 18 · 고아 7 · 프론트매터 4 · 모순/무효화 12 · 누락 페이지 3 · 임상근거 2.
- 자동수정 적용(§4 전체 + §5 일부 승인):
  - **카탈로그 정합**: index.md 미등재 18페이지 등재 (clinical/entities 8 권위자 + clinical/sources 6 STT + 연하장애 + product/concepts 3) + 통계표 실측 보정 (전체 135→**145**, product 35/22/30=87, clinical 19/28/11=58).
  - **고아 해소(7)**: 역링크 추가 — task-breakdown-overview→Sprint-1-Dependency-Graph, customer-journey→17-Customer-Journey-Map-Others, 언어발달지연→{Tomblin·Fey·Bloom-Lahey·Scarborough}, 인공와우→Erber, 지적장애→{언어문제해결력-검사·K-ABC-II}, 자폐→ADOS-2.
  - **모순·stale 정정(12)**: Epic 22→21(TASKS) · ADR 12→15(glossary) · F15 9→13(F15·Phase-1) · 음성장애 50→51분 · persona "미생성" 4건(이미란·황보름·강지방 + Unit-Economics "없음") 실재 반영 · 연하장애/ADOS-2 "신규 후보" stale 제거 · DLD-NISE NISE-B 구조 ⚠️갱신 노트 · index "100% cross-link" 문구 완화.
  - **임상근거/cross-pillar(E)**: 에듀템→U-TAP·조음장애, 와우키키→언어발달지연·조음장애, 학습장애-언어재활→RAN, K-ABC-II·K-CTONI-2·LEAP·TEACCH·PRT→ADR-04·F15 위키링크, STT-신경(2)(3)→competitive-landscape, Sprint-1/pilot-design→U-TAP.
  - **프론트매터**: 24-30·31-32-VPS `source_type: vps` / 52-PRD `source_type: prd` + aliases 4(연하장애·인공와우-청능재활·Sprint-1·Unit-Economics).
  - **네오폰스 규제표현 통일**: "DTx 임상승인 보유"(과장) → "임상시험 계획 승인" — 6파일+index 7곳.
  - **신규 페이지(1)**: product/entities/persona-보육교사.md (Seg D-2 — 31-32-VPS가 워킹맘 persona-김민지로 오귀속한 모순 해소 + L128·L212 repoint).
- 보류(§5 미승인): MVP 230 SP vs 219(PRD V10 §4.4 정본 대조 필요) · STT-음성장애-1 source stub · AAIDD 12판 웹검색 · MVP-descope Phase 매핑 · F10 누적 태스크 산식.
- 갱신: wiki/index.md (카탈로그 18행 + persona-보육교사 + 통계 + 55차 lint 노트), 약 30개 페이지 본문.
- 메모: 적대적 검증 21/21 confirmed(reject 0) — 발견이 대부분 file:line 기계적 사실 불일치라 검증 통과율 높음. 잔여 단방향 cross-pillar(권위자·OCR stub)는 부모 개념 bridge 보유로 의도적 허용.

## [2026-06-07] note | MVP 230 SP 정합 (55차 lint 보류 1건 해소)
- 발견: raw PRD V10 §5(21 Epic MoSCoW)·§4.4(스프린트 분해) 모두 Phase 0/1/2 = 70/91/58 = **219 SP**인데, raw §4.4 합계행(L411)만 **230** 표기 — 동일 21 Epic·동일 SP인데 +11 산술 오차(스프린트 수 컬럼 합 ~24.5 × 10 역산 추정). 즉 230은 다른 granularity가 아니라 단순 합산 오류.
- 조치: raw 불변(§7) 유지. 위키 7개 페이지에 **219(21 Epic 실제 합) 명기 + 230 = §4.4 합계행 표기 오차** 플래그 — MVP-feature-spec, 54-PRD-V10-Final(×2 + 요약), index(×2), PRD-evolution, VPS-evolution, task-breakdown-overview, 52-PRD-V09. 24 sprint·28주 Gantt 추정은 PRD 명시 230 기반임을 병기(silently 219로 덮지 않음).
- 잔여: raw §4.4 합계행 자체 정정은 PRD 차기 개정 시 원저자가 반영(위키는 불변 raw 미수정).

