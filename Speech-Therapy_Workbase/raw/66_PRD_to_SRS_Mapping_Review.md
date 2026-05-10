# PRD ↔ SRS (V05) Mapping & Compliance Review
Date: 2026-05-08  
Target PRD: `54_PRD_V10_Final.md`  
Target SRS: `65_SRS_V05_Nextjs_Fullstack_Final.md`

본 문서는 PRD의 비즈니스 요구사항과 기획 의도가 ISO/IEC/IEEE 29148:2018 기반의 SRS에 기술적 누락이나 왜곡 없이 올바르게 매핑되었는지 9가지 기준에 따라 검증한 결과입니다.

---

## 1. 개요·목표 매핑 검증

* **PRD 소스:** §1. 제품 개요 및 목표 (문제 정의, 북극성 KPI)
* **SRS 타겟:** `§1.1 Purpose`, `§1.2 Scope`, `§4.2 NFR`
* **검증 결과: Pass (우수)**
  * PRD의 "초진 2~3개월 대기, 교사 업무 가중" 등 문제 정의가 SRS `§1.1`의 "4대 극한(Four Extremes)" 철학으로 기술적으로 번역되어 반영됨.
  * PRD의 북극성 지표(W-AUR ≥ 60%)와 보조 KPI(M3 리텐션 ≥ 40%)가 SRS `§4.2 NFR` (REQ-NF-025, 026)의 정량적 임계치로 정확히 할당됨.
  * PRD의 타겟 시장(TAM-SAM-SOM)이 `§1.1 Business Context`로 명시되어 엔지니어가 비즈니스 맥락을 이해하도록 구조화됨.

## 2. 사용자와 페르소나 매핑 검증

* **PRD 소스:** §2. 타겟 유저 페르소나 (Seg A/B/C/D) 및 의사결정구조
* **SRS 타겟:** `§2. Stakeholders`, `§1.3 Definitions`
* **검증 결과: Pass (완벽)**
  * PRD의 세그먼트별 페르소나(불안형 엄마, 데이터형 아빠, 원장, 교사)가 SRS `§2 Stakeholders` 표의 역할/책임/관심사/성공기준으로 1:1 매핑됨.
  * PRD에 기술된 의사결정 단위(DMU)의 상호작용이 SRS `Stakeholder DMU Dependency` 다이어그램으로 시각화되어 기능 개발의 맥락을 제공함.
  * W-AUR, HITL, Zero-touch 등의 핵심 비즈니스 용어가 `§1.3 Definitions`에 명확히 정의됨.

## 3. 사용자 스토리와 AC 매핑 검증

* **PRD 소스:** §3. 핵심 사용자 스토리 (S1~S6)
* **SRS 타겟:** `§4.1 Functional Requirements`, `§5. Traceability Matrix`
* **검증 결과: Pass (우수)**
  * PRD의 사용자 스토리(예: S1 5분 진단)가 SRS 기능 요구사항의 상위 카테고리(Epic F1-b)로 분해됨.
  * PRD 스토리 내부의 Acceptance Criteria들이 `REQ-FUNC-001` 등의 세부 G/W/T(Given/When/Then) 항목으로 치환되어 테스트 가능성을 확보함.
  * SRS `§5 Traceability Matrix`에서 PRD의 Story ID(S1~S6)와 SRS의 REQ-FUNC, REQ-NF, TC ID가 1:1:1로 매핑되어 QA 준비가 완료됨.

## 4. 기능 요구사항 (Epic) 매핑 검증

* **PRD 소스:** §4. 기능 요구사항 명세 (Epics F1~F18, MSCW)
* **SRS 타겟:** `§4.1 Functional Requirements`
* **검증 결과: Pass (일부 아키텍처적 변형 반영)**
  * PRD의 기능 정의(F1 3축 엔진, F3 난이도 조절 등)가 원자적 단위의 요구사항(REQ-FUNC-001~061)으로 잘게 쪼개져 명세됨.
  * PRD의 MSCW 우선순위(Must/Should/Could)가 SRS의 Phase 0(MVP), Phase 1(리텐션), Phase 2(B2B) 구조로 논리적으로 전환됨.
  * **[특이사항]** V05 기술 제약사항(Next.js 풀스택)에 따라, PRD에서는 일반적인 '기능'으로 명세되었으나 SRS에서는 구체적인 기술 명세(`Server Action`, `Route Handler`, `PWA Service Worker`)로 구체화되어 매핑됨.

## 5. 비기능 요구사항 매핑 검증

* **PRD 소스:** §5. 비기능 요구사항 (성능, 보안, 비용 등)
* **SRS 타겟:** `§4.2 Non-Functional Requirements`
* **검증 결과: Pass (기술 스택에 맞춤 최적화)**
  * PRD의 품질 요구사항(응답속도, 가용성, 데이터 폐기)이 `REQ-NF-001 ~ REQ-NF-030`으로 계량화되어 테이블로 정리됨.
  * 단순한 성능 기준이 아닌, "진단 응답 p95 ≤ 800ms (Vercel Serverless 10s 제약 고려)" 등 V05 아키텍처 제약을 반영하여 훨씬 실용적으로 고도화됨.
  * 비용 통제(REQ-NF-018: 유저당 ₩5,250) 등 비즈니스 제약이 NFR로 편입됨.

## 6. 데이터·인터페이스 개요 매핑 검증

* **PRD 소스:** §6. 주요 데이터/인터페이스 (API, Schema 개요)
* **SRS 타겟:** `§3. System Context`, `§3.5 API Overview`, `§6.1 ERD`
* **검증 결과: Pass (완벽)**
  * PRD의 거시적 데이터 플로우가 SRS `§3.2 Component Diagram`과 `§3.6 Sequence Diagram`으로 상세 구현 시나리오화 됨.
  * 일반적인 API 목록이 V05 스택에 맞추어 `Server Actions`와 `Route Handlers` 목록으로 정교하게 치환됨.
  * 엔터티 개요가 `§6.1 ERD (Supabase PostgreSQL 기준)`로 스키마/관계도까지 완성됨.

## 7. 범위, 리스크·가정·의존성 매핑 검증

* **PRD 소스:** §7. 릴리즈 범위 및 §8. 리스크/가정
* **SRS 타겟:** `§1.2 Scope`, `§1.5 Constraints, Assumptions & Dependencies`
* **검증 결과: Pass (리스크 완화 전략의 구체화)**
  * In-Scope / Out-of-Scope가 명확히 분리되었으며, 네이티브 앱 개발이 PWA/Capacitor로 제외(Out)된 점이 정확히 반영됨.
  * PRD의 의료법 위반 리스크(R1), 교사 거부 리스크(R3) 등이 SRS `§1.5.3 Risk Mitigation`에서 완화 전략(금칙어 스캐너, Zero-touch 등)과 시스템 기능(REQ-FUNC)으로 방어됨.
  * Vercel/Supabase 종속성 리스크(R7, R8)가 새롭게 도출되어 아키텍처 제약사항으로 관리됨.

## 8. 실험·롤아웃·측정 매핑 검증

* **PRD 소스:** PRD 내부의 검증(Validation) 및 그로스 실험 항목
* **SRS 타겟:** `§6.6 Validation Plan (EXP-1~4)`, `§6.7 Contingency Plan`
* **검증 결과: Pass (기능과 실험의 결합)**
  * PRD의 가설 검증 계획이 `EXP-1~4`로 구조화되어 부록에 명시됨.
  * 단순 개발 명세서로 끝나지 않고, "EXP-2 실패 시 M3 리텐션 피벗(Plan B)" 등 비즈니스 연속성 계획이 `§6.7`에 포함되어 PRD의 그로스 의도를 완벽히 흡수함.

## 9. 근거 (인터뷰, JTBD 등) 매핑 검증

* **PRD 소스:** §9. 부록 (기회 매트릭스, JTBD 인터뷰 등)
* **SRS 타겟:** `§1.4 References`
* **검증 결과: Pass**
  * PRD 및 선행 문서(VPS 등)가 REF-01 ~ REF-06으로 식별자(ID) 부여되어 관리됨.
  * 요구사항 표의 `Source` 컬럼이 스토리를 가리키고, 스토리는 다시 PRD의 근거를 가리켜 완전한 양방향 추적성을 확보함.

---

## 총평 및 결론

**통과 (Pass)**: 현재 작성된 `65_SRS_V05_Nextjs_Fullstack_Final.md` 문서는 제공된 PRD의 비즈니스적 의도를 100% 보존하면서도, 기술적 제약사항(V05 Next.js 풀스택 아키텍처)을 충실히 반영하여 엔지니어가 즉시 개발에 착수할 수 있는 수준의 **Implementation-Ready 상태**임을 확인했습니다.
