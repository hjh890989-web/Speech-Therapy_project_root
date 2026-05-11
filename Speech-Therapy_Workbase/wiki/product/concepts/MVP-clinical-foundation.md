---
type: concept
pillar: product
category: synthesis
aliases: [MVP 임상 토대 정본, 영유아 임상 토대, F1-b·F1-a·F3-b·F11·F15·HITL 임상 근거]
tags: [F1-a, F1-b, F3-b, F11, F15, HITL, 임상토대, ADR-04, ADR-09, ADR-14, 영유아, 다문화, 회색지대부모, Tye-Murray, Rhea-Paul, 클러스터-임상통합]
---

# MVP 임상 토대 정본 — Clinical Foundation Synthesis

⭐⭐⭐ **54차 ingest 임상 정독 결과 종합** (Tye-Murray + Rhea Paul + 한국 35+ 편) → **MVP 6 핵심 기능 영역의 임상 근거 정본**. F15-clinical-consultation-checklist 13 항목 + F3-b·F1-a·F1-b·F11·HITL 임상 토대 통합.

> 본 페이지 = clinical → product 양방향 cross-link의 product 측 통합 진입점. 54차 ingest로 식별된 모든 임상 정본을 MVP 기능별 매핑.

## 1. F1-b 5분 진단 — 영유아 임상 토대 정본 ⭐⭐⭐

[[product/concepts/MVP-feature-spec]] § F1-b (REQ-FUNC-008~011) 5분 양육자 보고식 무로그인 진단.

### 1.1 핵심 임상 원칙 — Sparks (1989, Rhea Paul Ch6)

> "**영아 평가의 목적은 미래 행동을 예측하는 것이 아니라 영아의 현재 강점과 요구를 평가하는 것이다.**" (Rhea Paul, Ch6 영아, book p.234)

→ **F1-b는 "미래 예측" X — "현재 강점·요구 평가"**. ADR-04 (의료 용어 배제) 정합. "장애" 라벨링 X.

### 1.2 영유아 6 발달 지표 — Tye-Murray Ch14 (book p.561)

본 위키 [[clinical/concepts/인공와우-청능재활]] § J에서 직접 인용 — F1-b 양육자 보고식 입력 항목 정본:

| 연령 | 핵심 지표 |
|---|---|
| **신생아** | 큰 소리 놀람 |
| **2-3개월** | 부모 목소리 반응, 음질 변화 구별 (행복 vs 슬픔) |
| **4-6개월** | 소리 쪽 고개 돌림, 자음+모음 결합 ("바-") |
| **6-12개월** | 음절 옹알이 ("바-바-바"), 비언어 의사소통 |
| **12개월쯤** | 이름 반응, "아니오" 이해, 요구 응답 |
| **12-18개월** | 성인 같은 말소리 리듬, 첫 단어 |

→ F1-b 입력 폼 **≤3 항목** 정합 (SELSI 양육자 보고식 + Tye-Murray + Sparks 원칙 통합)

### 1.3 한국 자격시험 위험군 영역 — 공식 출제 (STT 통합)

본 위키 [[clinical/concepts/언어발달지연]] § G — 한국 1·2급 언어재활사 자격시험 공식 위험군:
- **말 늦은 아동 (Late Talker)**
- **다문화 가정 아동** ⭐
- **이중언어 아동**

→ MVP "회색지대 부모 30-50만" 타깃 = **한국 임상 공식 출제 영역**. 시장 정당화.

### 1.4 회색지대 부모 시장 정당화 — Rhea Paul Ch6 (book p.241)

> "**중재의 경우 엄마 학력이 고등학교 이하인 영아에게 가장 효과적**"

→ MVP F1-b = **사회경제적 격차 해소 메커니즘**. [[product/entities/persona-이지수]] (Seg A) + [[product/entities/persona-이미란]] (다문화) 임상 토대 정합.

### 1.5 F1-b 입력 항목 정본 — 3 단계 위계

본 위키 [[clinical/concepts/인공와우-청능재활]] § P에서 직접 매핑:

```
F1-b 5분 진단 — 양육자 보고식 ≤3 항목

[Step 1: 큰 카테고리]
  - 만 0-12개월 (Tye-Murray 신생아~12개월쯤)
  - 만 1-2세 (Tye-Murray 12-18개월 + SELSI 12-35개월)
  - 만 2-7세 (PRES + REVT + U-TAP 영역)
        ↓
[Step 2: 핵심 발달 지표 1-2 항목]
  Tye-Murray 6 지표에서 연령별 선택
        ↓
[Step 3: 임상 의심 결과]
  - 정상 범위 → 발달 모니터링 권고
  - 의심 → F1-a 3축 AI 분석 + HITL 자격자 의뢰
```

→ ADR-04 정합: "장애" 단어 X, "발달 모니터링·의심" 표현

---

## 2. F1-a 3축 AI 분석 — 임상 토대 정본 ⭐⭐⭐

[[product/concepts/MVP-feature-spec]] § F1-a (REQ-FUNC-001~007) 3축 AI 음성 분석 (articulation·linguistic·acoustic).

### 2.1 ASHA (1993) DLD 정의 — Rhea Paul Ch1 직접 출전

> "(1) 언어의 **형식 form** (음운론·형태론·구문론), (2) 언어의 **내용 content** (의미론), 그리고/또는 (3) 의사소통의 **언어 기능 use** (화용론)" (ASHA 1993, P.40)

→ F1-a linguistic 3 하위영역 = ASHA form + content + use 직접 매핑 (Bloom & Lahey 모델 ASHA 공식)

### 2.2 임상 측정 단위 통합 라이브러리 (9 종)

본 위키 [[product/concepts/F15-clinical-consultation-checklist]] § 12에서 식별 — F1-a 후처리 단위:

| 단위 / 도구 | 영역 | 출전 |
|---|---|---|
| **C-unit + MLC-w + MNC** | 발화 분석 (대화·설명) | [[clinical/concepts/단순언어장애-SLI]] § B (이현정 2008) |
| **T-unit + MLT-w + NDW** | 쓰기 분석 (학령기) | [[clinical/concepts/지적장애-언어중재]] § I (박수진 2019) |
| **CIU** (Correct Information Unit) | 이야기 정보 분석 | [[clinical/concepts/자폐-화용중재]] § D-8 (김소망 2017) |
| **이야기문법 5 + 결속표지 5** | 서사담화 | [[clinical/concepts/내러티브-담화-추론-중재]] § C (김현진 2021) |
| **내포문 5 유형** | 구문 산출 | [[clinical/concepts/지적장애-언어중재]] § B (한수진 2011) |
| **추론 4 유형 + 오류 4 유형** | 추론 능력 | [[clinical/concepts/학습장애-언어재활]] § B (유경진 2017) |
| **추론 3 유형** (예측·연결·감정) | PDD 추론 | [[clinical/concepts/자폐-화용중재]] § D-10 (최숲 2007) |
| **유추추론 매트릭스** | 유추 능력 | [[clinical/concepts/지적장애-언어중재]] § G-4 (김화수 외 2019) |
| **이상한 이야기 + 2차순위 마음이론** | ASD 마음이론 (회피) | [[clinical/concepts/자폐-화용중재]] § D-7 (최수영 2020) |

→ 영유아 적응: C-unit → MLU. 이야기문법 5 → 단순 4 (배경·시도·결과·종결).

### 2.3 CLD 검사 17 수정 제언 — Rhea Paul Ch5 (Goldstein & Iglesias 2006)

본 위키 [[clinical/concepts/다문화-언어발달]] § G-4 — F1-a 다문화 적응 임상 표준:

핵심 4 적용 항목:
- 8: 지시어 바꾸어 말하기 → F1-a UI 다문화 옵션
- 10: 추가 대답 시간 + 항목 반복 → F1-a 응답 시간 제한 해제
- 16: 검사 표준 틀리면 "왜 그렇게 답했나" 옵션
- 17: **"절대 평가 점수는 의뢰인이 속한 집단에서 유효할 경우에만 신중 사용"** = **AI 진단 false negative 방지** 임상 표준 ⭐

→ Persona 이미란 (다문화) 임상 토대 직접 정본

### 2.4 한국어 특이성 6 종 — Persona 이미란 직접 매핑

본 위키 [[clinical/concepts/다문화-언어발달]] § F + [[clinical/concepts/조음장애]] § C 통합:
1. **연음규칙** (5-6세부터 발달)
2. **무의미·겹받침** 처리
3. **연어 (Collocation)**
4. **동음이의어** (한국어 음절 단순성)
5. (잠재) **존대법**
6. ⭐ **한국어 음운 변동 (정상 변동)** — 예: 국 + 물 → **궁물** (비음화). **결함 X — F1-a false positive 방지 핵심**

→ F1-a 모델 다양화 시 한국어 특이적 결함 영역 검증 데이터셋 필수. **정상 음운 변동은 결함으로 분류 ⛔** (한국 임상 학부 표준 커리큘럼).

### 2.5 평가 도구 5 기준 + 학습 데이터셋 구성 ⭐⭐⭐ (Rhea Paul Ch2)

본 위키 [[clinical/concepts/언어발달지연]] § O-P 직접 출전:

**평가 도구 5 기준** (Rhea Paul Ch2 book p.50-51):
1. **신뢰도** (동형검사 신뢰도)
2. **타당도**
3. **진단 정확도** (Dollaghan 2004)
4. **표준화** — 규준 표본 ≥ **100명/연령대**, 다양성, 사회경제·인종 배경 포함
5. **표본 대표성**

**MVP F1-a 학습 데이터셋 구성 원칙** (Peña, Spaulding & Plante 2006) ⭐⭐⭐:
- **규준 표본 = 정상 아동 위주** — 언어장애 아동 포함 시 판별 정확도 ↓
- 변별 검증 = 정상 + 장애 양 그룹 비교
- → F1-a **학습 데이터셋 (정상 표본) + 검증 데이터셋 (정상 + 장애 양 그룹) 분리**

→ ⭐ 본 § 2.3 CLD 17 § 17 (절대 평가 점수 신중 사용) + 본 § 2.5 (Peña 원칙) = AI 진단 false negative + false positive 양방향 방지 핵심.

### 2.6 IDEA 'evaluation' vs 'assessment' (Rhea Paul Ch2 book p.30)

본 위키 [[clinical/concepts/언어발달지연]] § N 직접 출전:

| 단계 | MVP 매핑 |
|---|---|
| **evaluation** (서비스 적합 여부) | **F1-b 5분 진단** — 진단·장애명 X (6세 이하) |
| **assessment** (적합 판정 후 상세 사정) | **F1-a + HITL 통합** |

→ ADR-04 (의료 용어 배제) 정합 — F1-b는 절대 진단 라벨 사용 X.

### 2.7 두 조망 통합 출력 — Rhea Paul Ch2 (book p.30) ⭐

> "**우리의 목적은 아동이 언어 형식과/혹은 내용, 사용 측면에서 심각한 장애를 가지고 있는지 결정하는 것과, 그 결함을 정상 언어습득 발달과정과 비교하여 상세히 기술하는 것, 이 결함이 아동의 일상 활동에 미치는 영향을 결정하는 것이다.**"

→ ⭐ **MVP F1-a + HITL 통합 출력 3 요소 정본**:
1. **3 영역 결함 유무** (form / content / use — ASHA 1993)
2. **정상 발달 비교** (Tomblin 자연주의적 조망)
3. **일상 영향 평가** (Tomblin 규준적 조망)

→ HITL 자격자 의견 작성 표준

### 2.5 임상 판단 위계 — Tomblin (2008) 2 조망

본 위키 [[clinical/concepts/언어발달지연]] § C:
- **자연주의적 조망**: Fey -1.25 SD 측정 기반 → F1-a 자동 채점
- **규준적 조망**: 사회적 기대 부적합 → ADR-04 의료 용어 배제 + "차이→방해→장애 3단계 위계"

→ F1-a 출력 = **2 조망 통합**. 단순 점수 X + 사회적 기대 부적합 신호 함께 제공.

---

## 3. F3-b 적응형 난이도 엔진 — 임상 토대 정본 ⭐⭐ (Tye-Murray Ch4)

[[product/concepts/MVP-feature-spec]] § F3-b (REQ-FUNC-015~023).

본 위키 [[clinical/concepts/인공와우-청능재활]] § G에서 직접 인용:

### 3.1 6 난이도 변수 (Tye-Murray 그림 4-5, book p.142-143)

| # | 변수 | 쉬움 ↔ 어려움 |
|---|---|---|
| 1 | **자극 형태** | 폐쇄형 ↔ 제한형 ↔ 개방형 |
| 2 | **자극 단위** | 단어 ↔ 구 ↔ 문장 |
| 3 | **자극 유사성** | 비슷하지 않음 ↔ 비슷함 |
| 4 | **맥락** | 높음 ↔ 낮음 |
| 5 | **과제** | 구조화됨 ↔ 자연스러움 |
| 6 | **신호대잡음비** | 좋음 ↔ 나쁨 |

### 3.2 임상 운영 임계 (Tye-Murray, book p.143)

- **80%+ 정확도** → 난이도 ↑
- **50% 미만 정확도** → 난이도 ↓

→ F3-b 자동 상·하향 임계값 **정본**

### 3.3 4단계 위계 (Erber 1982, Tye-Murray Ch4)

- 감지 (Detection)
- 변별 (Discrimination)
- 확인 (Identification)
- 이해 (Comprehension)

→ F3-b 4 단계 레벨 직접 매핑

---

## 4. F11 부모 음성 클로닝 동화 — 임상 토대 정본 ⭐⭐

[[product/concepts/MVP-feature-spec]] § F11 (REQ-FUNC-036~037) + ADR-09 윤리 화이트리스트.

### 4.1 부모 정서 5 단계 — Tye-Murray Ch14 (book p.521)

본 위키 [[clinical/concepts/인공와우-청능재활]] § K:

| 단계 | 특징 | 임상 대응 |
|---|---|---|
| 1. 충격 | 명함·혼란·당혹감 | 명확·단순 정보 |
| 2. 부정 | 사실·결과 부정 | 가족 시간·지원 |
| 3. 슬픔 | 정상적 반응 | Montoya 2007: 적극적 듣기 |
| 4. 죄의식·분노 | 책임감 | 정서 공감 |
| 5. 수용 | 중재 적극 참여 | 본격 중재 |

→ HITL 1·2급 자격자의 부모 응대 표준

### 4.2 청능사 자기평가 6 체크리스트 — Edwards (2003)

- 부모 말 결론 없이 진심으로 듣기
- 느낌 표현 행동
- 부모 걱정 꺼낼 시점 세심
- 내용 + 느낌 공유 기회
- 부모 느낌 지지
- 부모 요구 말하기 기술 개발

→ HITL 자격자 면담 표준 임상 출전

### 4.3 가족 중심 실제 — Rhea Paul Ch5

본 위키 [[clinical/concepts/다문화-언어발달]] § G-5:
> "**CLD 가족과의 상호작용에 우리 자신의 추정과 기대가 어떻게 영향을 미치는지 인식할 필요**" (Kohnert 2008)

→ HITL 다양성 모니터링 ([[product/concepts/expert-diversity-monitoring]]) 임상 정합

### 4.4 4 핵심기법 — 본 위키 [[clinical/concepts/아동언어치료-핵심기법]]

- 평행 발화 (Parallel Talk)
- 확장 (Expansion)
- 기다리기 (Wait Time)
- 반응적 상호작용 (Responsive Interaction)

→ F11 동화 콘텐츠 ALLOWED_CONTENT_TYPES (storybook, lullaby) = 4 기법과 정합 (일방향 콘텐츠만)

### 4.5 4 패러다임 + 형식적/비형식적 훈련 — Tye-Murray + 한국 ID

본 위키 [[clinical/concepts/인공와우-청능재활]] § B-5 + [[clinical/concepts/지적장애-언어중재]] § B:
- 어린 아동 = **비형식적 훈련** = 가족 매개 일상 환경 중재 (Tye-Murray Ch4)
- 한국 ID 중재 4 패러다임: 사회적 의사소통 · 이야기 바꾸어 쓰기 · 애니메이션 · 생각말하기

→ F11 동화 콘텐츠 = 비형식적 가정 환경 일방향 콘텐츠 정합

---

## 5. F15 LLM 챗봇 — 임상 토대 정본 (이미 13 항목)

[[product/concepts/F15-clinical-consultation-checklist]]에 통합되어 있음. 핵심 발견:

### 5.1 F15 시나리오 8 추론 유형 — 박후임 2008 직접 매핑

본 위키 [[clinical/concepts/내러티브-담화-추론-중재]] § D:
- 제목 · 인물 성격 · 감정 · 이어질 내용 · 생략 · 원인-결과 · 배경 · 주제

### 5.2 F15 난이도 위계 — 3 출전 통합

- Level 1 (만 4세): 사실 + 명시적 — 김혜정 2010
- Level 2 (만 5세): 응집성 + 암시적 — 유경진 2017
- Level 3 (만 6-7세): 정교 + 함축적 — 최숲 2007
- ⛔ 회피: 평가적 추론 + 감정 추론

### 5.3 F15 자문 13 항목 — 자문 풀 7 그룹

이화여대 김영태(1순위) + 대구대 김화수 / 단국대 황민아(2순위) + 부산가톨릭대·광주여대·이화여대 이소현(3순위) + 연세대 김향희(회피용)

---

## 6. HITL 시스템 — 임상 토대 정본 ⭐

[[product/concepts/HITL-system-flow]] + [[product/concepts/HITL-operations-policy]].

### 6.1 임상가 팀 접근 — Transdisciplinary 정합

본 위키 [[clinical/concepts/언어발달지연]] § B:
- **Transdisciplinary 모델**: 팀 일원이 분야 간 정보·기술 공유. 한 명이 주로 평가, 나머지는 관찰·제안. 상호 훈련

→ HITL = Transdisciplinary 정합 — 1차 AI(언어재활사 자격) → 큐 → 청능사·임상심리 자문 가능

### 6.2 Jamie 사례 — 진단 핵심 모순 ⭐

본 위키 [[clinical/concepts/언어발달지연]] § D — Rhea Paul Ch1:
- 생활연령 기반 평가 (Reese) vs **정신연령 기반 평가** (Timmons)
- 둘 다 임상적으로 정당 — 결정자에 따라 달라짐

→ **HITL 전문가 자문 시 양 관점 명시 + 부모 의사결정 지원 필수**

### 6.3 ASHA 2002 청능사 vs SLP 역할 분담 — Tye-Murray Ch1

본 위키 [[clinical/concepts/인공와우-청능재활]] § E:
- 청능사: 청각 시스템·평가·기기·청력보존 주도
- SLP: 말·언어 평가·의사소통 수행력 주도 (1:1 환경)
- **학교 환경 = SLP 주도** (1:1 시간 길어 아동 잘 앎)

→ HITL 1·2급 자격자 풀에서 청능사 + 언어재활사 분리 가능

---

## 7. ADR 정합 — 의료 용어 배제 정본

[[product/concepts/architecture-decisions]] § ADR-04.

### 7.1 차이 → 방해 → 장애 3단계 — DLD 진단·평가 핸드아웃 (한국)

본 위키 [[clinical/concepts/언어발달지연]] § D:
- **차이 (difference)** — 말소리가 다른가?
- **방해 (disturbance)** — 의사전달을 방해하는가?
- **장애 (disorder)** — 장애 상황을 발생시키는가?

→ MVP UI 단어 정본: "차이·방해·백분위" 사용 / "장애·지체" 회피

### 7.2 Tomblin 규준적 조망 — Rhea Paul Ch1 직접 출전

> "**아동의 언어 성취 수준이 바람직하지 못한 결과를 낳을 만큼의 수용 불가한 수준일 때 언어장애가 존재한다**" (Tomblin 2008)

→ ADR-04 정합 정본 — "장애" 라벨링은 사회적 기대 부적합 결과에 한정

### 7.3 WHO 모델 — Tye-Murray Ch1

> "**WHO는 '장애 (handicap)' 용어를 경멸적·오명 의미로 사용 자제 권고**"

→ UI에서 "청각장애" 단어 회피 정본

---

## 8. 한국 임상 자문 풀 매트릭스 — 7 그룹

본 위키 [[product/concepts/F15-clinical-consultation-checklist]] § 13에서 식별:

| 순위 | 기관·연구자 | 전문 영역 |
|---|---|---|
| **1순위** ⭐⭐⭐ | 이화여대 김영태 (+ 임동선·심현섭·성지은·이영미) | ASD 화용·SLI 평가·KOPLAC·다문화 한국어 |
| **2순위** ⭐⭐ | 대구대 김화수 | ID·다문화·노인 (Rhea Paul·Tye-Murray 한국어 번역 책임자) |
| **2순위** ⭐⭐ | 단국대 황민아·최소영 | 학령기 추론 (PDD/SLI/LD) + 다문화 어휘 |
| **3순위** ⭐ | 부산가톨릭대 이희란·김미배 | 학령기 화용 + 추론 4 유형 |
| **3순위** ⭐ | 광주여대 박은실·신혜정 | ASD 임상 중재 (스크립트) |
| **3순위** ⭐ | 이화여대 이소현 (특수교육) | ASD 행동·교육 단일대상 |
| **회피용** ⛔ | 연세대 김향희 | 신경언어 회피 영역 자문 (참조용) |

→ 김화수 = 한국 임상 번역 + ID + 다문화 + 노인 다영역. **F15 자문 + Rhea Paul·Tye-Murray 한국어판 인용 출처** 모두 가능.

---

## 9. Cross-link 양방향 활성화 매트릭스

본 페이지 생성으로 다음 양방향 페어 활성화:

| Clinical 페이지 | Product 매핑 |
|---|---|
| [[clinical/concepts/언어발달지연]] | **§ 1 F1-b** (Sparks·Tye-Murray) + § 2 F1-a (ASHA·Tomblin) + § 6 HITL (Jamie) + § 7 ADR-04 (3단계 위계) |
| [[clinical/concepts/인공와우-청능재활]] | § 1 F1-b (Ch14 6 지표) + **§ 3 F3-b** (Ch4 6 변수 + 80%/50%) + **§ 4 F11** (부모 5 단계) + § 6 HITL (ASHA 2002) + § 7 ADR-04 (WHO) |
| [[clinical/concepts/다문화-언어발달]] | § 2 F1-a (CLD 17 검사) + § 4 F11 (가족 중심) |
| [[clinical/concepts/자폐-화용중재]] | § 5 F15 (8 자문 항목) — F15-checklist 참조 |
| [[clinical/concepts/지적장애-언어중재]] | § 2 F1-a (T-unit 등) + § 4 F11 (4 패러다임) |
| [[clinical/concepts/단순언어장애-SLI]] | § 2 F1-a (C-unit) |
| [[clinical/concepts/학습장애-언어재활]] | § 5 F15 (Level 1-3) |
| [[clinical/concepts/내러티브-담화-추론-중재]] | § 5 F15 (8 추론 유형) |
| [[clinical/concepts/신경인지장애-노인의사소통]] | § 7 ADR-04 (회피 영역 5 사유) |
| [[clinical/concepts/한국-언어치료-트랙비교]] | § 1 F1-b (한국 자격시험) + § 6 HITL (트랙 정합) |

→ ⭐⭐⭐ **10 양방향 페어 활성화**. 본 페이지 = 54차 ingest cross-link 가치 통합 진입점.

---

## 10. 후속 보강 후보

- ⏳ Rhea Paul Ch4 § 특수 장애인 (지적장애·자폐·감각결함) → § 1.6 위험군 보강
- ⏳ Tye-Murray Ch1 § WHO 모델 추가 직접 인용 → § 7.3 강화
- ⏳ STT 결과 통합 (조음음운장애·유창성·신경언어·음성 4편) → 5대 장애 정합 영역
- ⏳ ADR-04 + ADR-09 + ADR-14 임상 토대 직접 인용 보강 ([[product/concepts/architecture-decisions]])
- ⏳ Open Issues Dashboard 갱신 ([[product/concepts/open-issues-dashboard]])

## 출처 (54차 ingest 누적)

### Clinical 정독 (35+편)
- Tye-Murray *Foundations of Aural Rehabilitation* 3rd ed. 한국어판 (Ch1·Ch4·Ch14)
- Rhea Paul *Language Disorders from Infancy through Adolescence* 한국어판 (Ch1·Ch5·Ch6)
- 한국 5 disorder 영역 + 추론 + 다문화 + 신경인지 한국 35+ 편
- 한국 1·2급 언어재활사 자격시험 강의 STT (언어발달장애 1편 47분)

### Product 측 cross-link 활성화
- 본 페이지 § 9 — 10 양방향 페어 매트릭스