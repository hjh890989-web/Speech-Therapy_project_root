---
type: source
pillar: product
category: VPS-evolution
aliases: [VPS V07, VPS V08, 31, 32, VPS Restructured, VPS Detailed]
tags: [VPS, V07, V08, sub-feature-tree, BMC, ROI-simulator, traceability, 클러스터31-32]
---

# VPS V07-V08 — 4단계 구조 + Sub-feature 트리 + BMC

raw 31 (V07 Restructured, 423줄) + raw 32 (V08 Detailed, 650줄) — VPS V09 직전의 두 단계 진화. **V07 = 4단계 논리적 구조 신설 + KSF/AOS-DOS 정량화**, **V08 = Sub-feature 트리 + ROI 시뮬레이터 + BMC 9-Block + Traceability Matrix**.

## 진화 위치

| | V05/V06 | **V07 (raw 31)** | **V08 (raw 32)** | V09 (raw 39) |
|---|---|---|---|---|
| 구조 | 평면 | **4단계 Part Ⅰ-Ⅳ** ⭐ | 4단계 유지 | 4단계 유지 |
| 페르소나 | Seg A/B/C/D | Seg A/B/C/D + **E 비타겟** | + Seg D를 **D-1/D-2 분리** | 5 페르소나 확정 |
| KSF | 없음 | **§2.2 Top 4 신설** | 유지 | 유지 |
| AOS/DOS | 정성 | **§3.3 정량 사분면 (O-1~O-4)** | 유지 + 사분면 통합 전략 | 유지 |
| §6 MVP 로드맵 | Epic 목록 | Phase별 Epic 목록 (Sub-feature **공백**) | **Sub-feature 트리 (F1.1~F10.1)** ⭐ | 유지 |
| §11 비즈니스 모델 | 6부 (A-F) | 6부 유지 | **7부 (A-G) — ROI 시뮬레이터 + BMC 9-Block** ⭐ | 유지 |
| §13-2 B2B 영업 | "객관 리포트가 대신 말하게" | (V08 동일 구조) | **F9.4 ROI 시뮬레이터 + Zero-touch 프레임** | 유지 |
| Traceability | 없음 | 없음 | **부록 26 분석 보고서 매핑** ⭐ | 유지 |

## V07 신설 4단계 구조 (Part Ⅰ-Ⅳ)

V07이 도입한 "Single Source of Truth" 선언과 함께, VPS 전체를 4부로 재편:

```
Part Ⅰ. 가치 제안 (왜 만드는가?)
   §1 Problem-Solution Fit / §2 Canvas / §3 Proof
Part Ⅱ. Job-Feature 매핑 (무엇을 만드는가?)
   §4 Job-Value-Feature 매핑 / §5 공통 설계 원칙
Part Ⅲ. MVP 구현 (어떻게 만드는가?)
   §6 MVP 로드맵 / §7 GTM Copy
Part Ⅳ. 비즈니스 실행 (어떻게 버는가?)
   §8(V07)/§11(V08) 비즈니스 모델 / §9(V07)/§13(V08) 영업 시퀀스 /
   §10(V07)/§14(V08) GTM 검증 / §11(V07)/§15(V08) 리스크
```

V08은 이 구조 유지하며 §6과 §11에 깊이를 더함 + §9 페르소나 커버리지 검증, §14-4 BMC 9-Block, 부록 Traceability 신규.

## V07 정량화: KSF Top 4 + AOS/DOS 사분면

### §2.2 KSF Top 4 (V07 신설)
1. **초저비용 유입 엔진** (무료 진단을 미끼로 CAC 0원 수렴)
2. **가시화된 성과 증명** (시계열 데이터 = Lock-in 해자)
3. **B2B2C 파이프라인** (원장 1인 = 80가구 일괄 획득)
4. **규제 리스크 우회** (비의료/교육 카테고리)

### §3.3 AOS × DOS 사분면 (V07 정량화)
| 기회 | AOS | DOS | 사분면 | Phase |
|---|---|---|---|---|
| **O-1 진단 수치화** | 9.0 | 8.5 | 🔴 STAR | Phase 0 ([F1][F2]) |
| **O-2 대기 중 훈련** | 9.0 | 9.0 | 🔴 STAR | Phase 0 ([F3]) |
| **O-3 노력의 가시화** | 7.0 | 6.5 | 🟡 LEVERAGE | Phase 1 ([F4]) |
| **O-4 B2B 기관 도입** | 6.5 | 6.5 | 🟡 LEVERAGE | Phase 2 ([F9][F10]) |

→ **MVP 우선순위의 정량적 근거**: STAR 영역(AOS≥8.0, DOS≥8.0)을 먼저 찌른다.

## V08 핵심 진화 ① — §6 Sub-feature 트리

V07 §6 자체가 명시한 향후 보강점("각 Epic 하위의 세부 피쳐 트리 구조 추가 필요")을 V08이 직접 실행. **단순 Epic 목록 → 안전장치까지 포함된 Sub-feature 트리**:

### Phase 0 (코어 가치 검증 + 초기 유입 폭발)

| Epic | Sub-feature | 역할 |
|---|---|---|
| **[F1] 무료 AI 음성 진단** | F1.1 무로그인/원클릭 5분 진단 웹뷰 | 마찰력 제로화 (앱 설치 없이 브라우저) |
| | F1.2 조음/화용론 특화 음성 파서 | 영유아 발화 특화 알고리즘 |
| | **F1.3 [안전장치] 의료 면책 동의** | "교육적 참고 자료" 강제 동의 |
| **[F2] 또래 비교 리포트** | F2.1 백분위 시각화 대시보드 | "동일 월령 100명 중 85번째" |
| | F2.2 불안 완화 넛지 카피 | "지금부터 꾸준히 하면 극복 가능" |
| | F2.3 페이월 앱 설치 브릿지 | CVR 극대화 |
| **[F3] 맞춤 미션 카드** | F3.1 주차별 자동 배정 커리큘럼 | 5분 데일리 놀이 미션 |
| | F3.2 미션 인증 시스템 | 발화 음성/사진 업로드 → 데이터 은밀하게 축적 |

### Phase 1 (리텐션 + 바이럴)

| Epic | Sub-feature | 역할 |
|---|---|---|
| **[F4] 주간 발달 추이** | F4.1 시계열 스코어 대시보드 | 62→65→71 꺾은선 (3주 누적 = 해지 방어) |
| | F4.2 결제 연장 자동 트리거 | "다음 달 예측 시뮬레이션" 무기 |
| **[F5/F6]** | F5.1 카카오톡 성과 자랑하기 | 조부모/SNS 성취 뱃지 공유 |
| | **F6.1 [안전장치] 비동기 전문가 감수** | HITL — 의심 데이터 언어재활사 청취 |
| **[F7]** | F7.1 치료사용 요약 PDF | 외부 제출용 |

### Phase 2 (B2B 스케일업)

| Epic | Sub-feature | 역할 |
|---|---|---|
| **[F9] B2B 스크리닝 대시보드** | F9.1 원아 일괄 등록 + 동의서 자동 발송 | 행정력 낭비 제로 |
| | F9.2 Zero-touch 환경 음성 수집 | 자유놀이 시간 패시브 수집 (교사 만족도 최상) |
| | F9.3 학부모 상담용 원클릭 PDF | 면담 전날 자동 생성 (감정 소모 차단) |
| | **F9.4 ROI 웹 계산기** ⭐ | 원장 직접 입력 → 방어 매출액 산출 (V08 §11-E 신규 항목) |
| **[F10]** | F10.1 카카오톡 연동 서명 | 종이 없는 합법적 데이터 수집 |

→ Sprint 1 Core 8과 직접 매핑: F1.1→TASK FR-Q-001, F1.2→FR-C-002, F2.1→FR-Q-005, F4.1→FR-Q-009. 21 Epic 정본은 [[product/concepts/MVP-feature-spec]].

## V08 핵심 진화 ② — §11 비즈니스 모델 7부 (A-G)

V07 6부 → V08 7부. **신규 E (ROI 시뮬레이터)** + 기존 F→G 시프트.

| 절 | 내용 | V07/V08 |
|---|---|---|
| A | 과금 모델 (Lead-Gen 무료 / Basic 35K / Premium 50K / B2B 500K) | 양쪽 동일 |
| B | 수익 구조 비중 (B2C Basic 70% / Premium 15% / B2B 15%) | 양쪽 동일 |
| C | 비용 구조 (CAC / R&D / 변동 인건비) | 양쪽 동일 |
| D | 가격 수용성 (Pain 1: 3.5만 = 불안 해소 보험금 / Pain 2: 5만 = 센터 1회 비용 회피) | 양쪽 동일 |
| **E** | **B2B ROI 시뮬레이터** ⭐ — 원아 1명 이탈 = 연 600만 손실. 솔루션 50만 도입 = **1,100% ROI** | **V08 신규** |
| **F (V07: E)** | Lock-in + Land & Expand (3-4주 누적 데이터 → 해지 포기 / 무료 → Basic → Premium → 둘째 자녀) | 양쪽 동일 |
| **G (V07: F)** | 3개년 SOM 시나리오 (Y1 12K가구·50억 → Y3 60K가구·252억 / 누적 449억 / LTV:CAC ≥ 4.0) | 양쪽 동일 |

**§11-E 핵심 인사이트**: "원장(Seg D-1)은 교육적 가치보다 **재무 리스크 방어**에 지갑을 연다." → F9.4 ROI 웹 계산기를 영업 무기로 장착.

## V08 핵심 진화 ③ — §9 페르소나 커버리지 + Seg D 분리

| DMU | 최우선 Job | 시스템 혜택 | 미충족 리스크 방어 |
|---|---|---|---|
| Seg A (불안형) | 막연한 불안의 수치화 | F1+F2 | AI 오진 → Disclaimer + F6 HITL |
| Seg C (대기자) | 6개월 방치기간 대체 훈련 | F3+F7 | 동력 상실 → F4 주간 리포트 의지 부여 |
| Seg B (데이터형) | 성과 가시화 + 가족 공유 | F4+F5 | 신뢰도 → 점수 변화의 구체적 발음 데이터 근거 |
| **Seg D-1 (원장)** | 기관 신뢰도 + 학부모 민원/퇴소 방어 | F9 + ROI 시뮬레이터 | 비용 부담 → 1,100% ROI 재무 논리 |
| **Seg D-2 (보육 교사)** | 학부모 감정 소모 + 업무 과중 방지 | F9.2 Zero-touch + F9.3 자동 PDF | 업무 과중 반발 → "마이크만 켜두면 끝" |

→ V07까지 Seg D 단일 → V08에서 **D-1 결제권자 + D-2 실무 운영자** 분리. 각자 다른 Job/Pain/완화 전략. Persona spectrum 정본은 [[product/concepts/customer-segmentation]] / DMU 분리 entity는 [[product/entities/persona-오한솔]] (D-1) + [[product/entities/persona-김민지]] (D-2).

## V08 핵심 진화 ④ — §13-2 B2B 영업 시퀀스 강화

| 단계 | V07 카피 | **V08 카피 (강화)** |
|---|---|---|
| 1 접점 | 사립 유치원 연합회 브로셔 | 동일 |
| 2 Pain 공감 | "선생님의 주관이 아닌 객관적 리포트가 대신 말하게" | **"F9.2 Zero-touch 어필 + 원장에게 F9.4 ROI 시뮬레이터 직접 조작 → '교육 도입'이 아닌 '경영 방어 투자' 프레임 전환"** ⭐ |
| 3 PoC | 무료 도입 / 자연 음성 녹음 | 동일 |
| 4 락인 & 확장 | 키즈노트 결과지 발송 → B2C 앱 강제 설치 | 동일 |

→ **프레임 전환 전략**: V07 "감정 공감" → V08 "재무 논리". 원장 인지 부조화를 "교육 vs 경영" 축에서 "경영 방어"로 재정의.

## V08 핵심 진화 ⑤ — §14-4 BMC 9-Block (V08 only)

비즈니스 모델 캔버스 9-Block 통합 요약:
- **KP**: 유치원 연합회 / 언어재활사 풀 / 지역 소아청소년과
- **KA**: AI 추적 엔진 / B2C 퍼널 최적화 / B2B 대시보드 구축
- **KR**: **누적 발달 궤적 데이터** + 조음 특화 NLP 엔진 (가장 강력한 Lock-in)
- **VP**: [B2C] 5분 객관 수치화 + 발달 궤적 증명서 / [B2B] 원아 이탈 방어망
- **CR**: 100% 자동화 (Self-service) + HITL VIP 케어
- **CH**: 맘카페 오가닉 / 키즈노트 결과지 연동 / 소아과 대기실 QR
- **CS**: Seg A 불안형 / Seg C 대기자 / Seg D-1 원장
- **CS_비용**: CAC + STT 인프라 + Premium 변동 인건비
- **RS**: B2C Basic 35K (70%) + Premium 50K (15%) + B2B 50만/年 (15%)

## V08 핵심 진화 ⑥ — 부록 Traceability Matrix (V08 only)

26 사전 분석 보고서 → VPS 섹션별 매핑. "감으로 작성된 게 아님" 증명:

| VPS 섹션 | 근거 보고서 |
|---|---|
| §1 Problem-Solution | 문제정의서 + FGI/JTBD |
| §2 Canvas | 경쟁사 브리핑 + 가치사슬 + 포터 5F |
| §3 Proof | TAM-SAM-SOM + 페르소나별 AOS/DOS |
| §4 Job-Value 매핑 | RTM + 소프트웨어 에픽 분류 |
| §11 BizModel | BMC + 린 캔버스 |
| §15 리스크 | 법적 규제 분석 + 의료기기 우회 검토서 |

Feature별 근거: F1=FGI+AOS, F4=RTM+JTBD, F6=규제+RTM, F9=B2B 심층+BMC, F10=개인정보보호법.

→ V09 (raw 39)에서 이 Traceability가 더 정교화되며 18 Quality Improvement(raw 51)로 이어짐.

## §3 Seg E 비타겟층 추가 (V07 신규)

V07 §3에서 5번째 세그먼트 **Seg E** 명시 추가:
- 의도: "이 시장은 우리가 타겟하지 않는다"는 명시적 디스코프
- Seg E = 이미 진단 받고 치료 중인 가구 (의료 영역) / 영어 중심 가구 (시장 다름)
- 효과: Seg A/B/C/D 집중도 향상 + 의료 규제 회피 (ADR-04와 정합)

## V07 §5 vs V08 §5 — 공통 설계 원칙 (변동 없음)

3대 안전 프로토콜은 V07/V08 동일:
1. 의료적 진단 분리 (Disclaimer 강제)
2. 데이터 수집 합법화 (법정대리인 동의)
3. HITL 감수 (런칭 초기 AI 오진 방어)

→ ADR-02 (HITL) + ADR-04 (의료 용어 배제)와 직접 정합. 정본 [[product/concepts/architecture-decisions]].

## VPS V07-V08의 워크플로 시사

| 패턴 | V07 적용 | V08 강화 |
|---|---|---|
| **자기-인용 보강 사이클** | "향후 보강점: Sub-feature 트리 필요" 명시 | V08이 그 빈칸을 직접 채움 (F1.1~F10.1) |
| **정성→정량 전환** | KSF Top 4, AOS/DOS 사분면 신설 | 사분면 통합 전략(§3.3) 추가 |
| **DMU 세분화** | Seg D 단일 | D-1(결제) + D-2(실무) 분리 → 미충족 리스크 방어 컬럼 |
| **재무 논리 무기화** | (없음) | §11-E ROI 시뮬레이터 + F9.4 신규 |
| **추적 가능성** | (없음) | 부록 26 분석 보고서 Traceability Matrix |

→ V08의 **"향후 보강점 자기 명시 + 후속 버전이 직접 실행"** 패턴은 V09→V09 Quality(raw 51 18 Findings)→ PRD V10에서도 반복됨.

## 출처
- raw/31_VPS_V07_Restructured.md — Part Ⅰ-Ⅳ 구조 + KSF + AOS/DOS 사분면 + Seg E
- raw/32_VPS_V08_Detailed.md — Sub-feature 트리 (§6) + ROI 시뮬레이터 (§11-E) + BMC 9-Block (§14-4) + Traceability (부록)

## 관련 product 페이지

- [[product/concepts/VPS-evolution]] — V01-V09 전체 타임라인 정본
- [[product/concepts/MVP-feature-spec]] — 21 Epic 정본 (V08 Sub-feature가 직접 매핑)
- [[product/concepts/customer-segmentation]] — 5 페르소나 (D-1/D-2 분리 정본)
- [[product/concepts/architecture-decisions]] — 7 ADR (§5 공통 설계 원칙 정합)
- [[product/concepts/jtbd-insights]] — JTBD H-A/H-C/H-B 검증 (§3 Proof 근거)
- [[product/sources/39-VPS-V09-Final]] — V08 → V09 진화
- [[product/entities/persona-오한솔]] — Seg D-1 원장
- [[product/entities/persona-김민지]] — Seg D-2 교사

## 보강 필요
- raw 30 (VPS V06) 정독 — V06 → V07 4단계 구조 도입 직전 상태 비교.
- raw 38 (V09 사전) + raw 51 (V09 Quality 18 Findings) → V08 BMC가 V09에서 어떻게 정교화되었는지.
- F9.4 ROI 시뮬레이터 → 현 88 Task에 매핑 미완 (FR-Q/FR-C 후속 task 신규 필요 가능성).
