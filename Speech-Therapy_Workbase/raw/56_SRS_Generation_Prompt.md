# SRS 생성 프롬프트 — Home Language Coaching Platform

> 이 프롬프트를 AI에 그대로 입력하고, PRD 문서(`54_PRD_V10_Final.md`)를 함께 첨부하세요.

---

당신은 ISO/IEC/IEEE 29148:2018 표준에 정통한 Senior Requirements Engineer입니다.
당신의 임무는 내가 제공하는 PRD(Product Requirements Document)를 기반으로
완전하고 상세하며, 테스트 가능하고, 추적 가능한 SRS(Software Requirements Specification)를 작성하는 것입니다.

아래의 규칙과 출력 구조를 반드시 준수하여 작성하십시오.

================================================================
# 1. 목적
PRD의 모든 내용을 기반으로 다음 기준을 충족하는 SRS를 생성하십시오.
- ISO 29148 완전 준수
- Functional / Non-Functional / Interface / Data / Constraints 분리
- 테스트 가능(AC 포함) + 추적성(Traceability Matrix 포함)
- Story S1~S6 + HITL 프로토콜 → REQ-FUNC
- KPI/성능 지표 → REQ-NF
- API/Entity → Interface/Data Model
- 핵심 + 상세 시퀀스 다이어그램 포함

================================================================
# 2. 입력
첨부된 PRD 문서 `54_PRD_V10_Final.md` (Home Language Coaching Platform PRD v1.0 Final)를
유일한 비즈니스/기능 요구의 원천(Source of Truth)으로 사용하십시오.

본 PRD는 다음 구조를 포함합니다:
- §1~§4: 목표, 페르소나, 사용자 스토리(S1~S6 + HITL), 기능 요구사항(21개 Epic, MoSCoW)
- §5: 비기능 요구사항(성능/신뢰성/SLA/보안/모니터링)
- §6: 시스템 아키텍처(ERD + API 명세)
- §7: 범위(In/Out), 리스크(R1~R6 + R6 피벗 시나리오), 가정 및 의존성
- §8: 실험/롤아웃 계획(EXP-1~4), 벤치마크, Lock-in 전략
- §9: 근거(AOS/DOS, JTBD, TAM-SAM-SOM, Traceability)
- §10: ADR(아키텍처 결정 기록 4건)
- §11: 용어 사전(Glossary 30개 항목)

================================================================
# 3. 출력: SRS 전체 구조
아래 구조는 절대 변경하지 말고 그대로 사용하십시오.

# Software Requirements Specification (SRS)
Document ID: SRS-001
Revision: 1.0
Date: <오늘 날짜>
Standard: ISO/IEC/IEEE 29148:2018

-------------------------------------------------
1. Introduction
   1.1 Purpose
   1.2 Scope (In-Scope / Out-of-Scope)
   1.3 Definitions, Acronyms, Abbreviations
   1.4 References (REF-XX)
   1.5 Constraints, Assumptions & Dependencies

2. Stakeholders
   - 역할(Role), 책임(Responsibility), 관심사(Interest), 성공 기준(Success Criteria)

3. System Context and Interfaces
   3.1 External Systems
   3.2 Client Applications
   3.3 API Overview
   3.4 Interaction Sequences (핵심 시퀀스 다이어그램 Mermaid 차트 포함)

4. Specific Requirements

   4.1 Functional Requirements (테이블 필수)
      - REQ-FUNC-xxx 형태의 ID
      - Story는 Source로 명시
      - AC(Given/When/Then)는 Acceptance Criteria로 변환
      - Negative AC는 Exception Handling 요구사항으로 변환
      - MoSCoW → Priority 컬럼 + Phase 태그 반영
      - 하나의 Story/Epic은 여러 개의 REQ-FUNC로 분해
      - HITL 프로토콜은 REQ-FUNC-HITL-xxx로 별도 분해

   4.2 Non-Functional Requirements (테이블 필수)
      - 성능(p95, latency, throughput)
      - 가용성(SLA, RPO, RTO, MTTR)
      - 보안(TLS, RBAC, 감사 로그, 음성 원본 보관/폐기)
      - 비용(단위 처리 비용)
      - 운영/모니터링 지표 (5종 대시보드)
      - Scalability, Maintainability 포함

5. Traceability Matrix
   - Story ↔ Requirement ID ↔ Test Case ID

6. Appendix
   6.1 API Endpoint List
   6.2 Entity & Data Model (표 필수)
   6.3 Detailed Interaction Models
       (상세 시퀀스 다이어그램, Mermaid 차트 형태로 작성)
   6.4 Implementation Timeline (Gantt 참조)
   6.5 Validation Plan (EXP-1~4 실험 설계)
   6.6 Contingency Plan (R6 피벗 시나리오)
   6.7 ADR Reference (ADR-01~04 원문)

================================================================
# 4. PRD → SRS 매핑 규칙 (필수 준수)

[PRD §1. 개요 및 목표 → SRS 1. Introduction]
- PRD §1.1: 문제 정의 (4대 Pain Cluster) → SRS 1.1 Purpose
- PRD §1.2: Desired Outcome (O-1~O-4) → SRS 1.2 Scope + SRS 4.2 NFR 정량 기준
- PRD §1.3: 북극성/보조 KPI (W-AUR 등 7개) → SRS 4.2 NFR
- PRD §1.4: 차별 가치 (Differential Value) → SRS 1.1 Purpose 하위 설계 철학
- PRD §1.5: 전환 트리거 3대 인사이트 → SRS 2. Stakeholders Interest

[PRD §2. 사용자와 역학 관계 → SRS 2. Stakeholders + 1.3 Definitions]
- PRD §2.1: 페르소나 (Seg A/B/C/D-1/D-2) → SRS 2.x Stakeholder 역할로 변환
- PRD §2.2: DMU 영향력 관계 → SRS 2.x 역할 간 의존성으로 기술
- PRD §2.3: Intervention Dependency → SRS 3. System Context 참조
- PRD §2.4: CJM 매핑 + KPI → SRS 2.x Stakeholders의 Success Criteria

[PRD §3. 사용자 스토리와 AC → SRS 4.1 Functional Requirements]
- PRD: Story S1~S6 = SRS: 요구사항의 Source
- PRD: AC (Given/When/Then) = SRS: Acceptance Criteria
- PRD: Negative AC = SRS: Exception Handling 요구사항
- PRD: HITL 안전 프로토콜 4원칙 (자동 에스컬레이션/의료 판단 회피/SLA 보장/루프백 재학습)
  = SRS: REQ-FUNC-HITL-xxx 형태의 크로스커팅 기능 요구사항으로 분해

[PRD §4. 기능 요구사항 MoSCoW → SRS 4.1 Functional Requirements]
- PRD: 21개 Epic (Must 6 / Should 10 / Could 5)
  = SRS: 다수의 REQ-FUNC로 분해 (최소 63개)
- PRD: Won't 4건 = SRS: 1.2 Scope Out-of-Scope에 명시
- PRD: MoSCoW → SRS: Priority 컬럼 + Phase 태그
- PRD §4-0: 4대 극한 가치 선언 → SRS: 1.1 Purpose의 Design Philosophy
- PRD §4.2: Gantt 로드맵 → SRS: Appendix 6.4 Implementation Timeline
- PRD §4.3: 수익 구조 → SRS: 1.1 Purpose 비즈니스 컨텍스트
- PRD §4.4: 스프린트 분해 → SRS: 각 REQ-FUNC의 Effort Estimate 참조

[PRD §5. 비기능 요구사항 → SRS 4.2 Non-Functional Requirements]
- PRD: 성능 6항목, 신뢰성 4항목, SLA 6항목, 보안 3항목, 모니터링 5종
  → SRS 4.2 NFR 표로 전환 (REQ-NF-xxx ID 부여)

[PRD §6. 시스템 및 데이터 아키텍처 → SRS 3. System Context + Appendix]
- PRD §6.1: ERD → Appendix 6.2 Entity & Data Model
- PRD §6.2: API 명세 → SRS 3.3 API Overview + Appendix 6.1 API Endpoint List

[PRD §7. 범위, 리스크, 가정 → SRS 1.2 Scope + 1.5 Constraints]
- PRD §7.1: In/Out Scope → SRS 1.2 Scope
- PRD §7.2: 리스크 R1~R6 → SRS 1.5 Constraints & Risk Mitigation
- PRD §7.2 R6 Plan B: 피벗 시나리오 → Appendix 6.6 Contingency Plan
- PRD §7.3: 가정 A1~A4 + 의존성 D1~D4 → SRS 1.5 Assumptions & Dependencies

[PRD §8. 실험, 롤아웃 → Appendix + SRS 4.2 NFR]
- PRD §8.1~8.3: 실험 설계 EXP-1~4 → Appendix 6.5 Validation Plan
- PRD §8.4: 벤치마크 8항목 → SRS 4.2 NFR 성능 기준 참조
- PRD §8.5: Lock-in 전략 → SRS 4.1 관련 REQ-FUNC의 Rationale

[PRD §9. 근거 → References]
- PRD §9.0: AOS/DOS 매트릭스 → REF-01
- PRD §9.0-b: JTBD 검증 상태 → REF-02
- PRD §9.0-c: TAM-SAM-SOM → REF-03
- PRD §9.1: Traceability Matrix → REF-04
- PRD §9.3: VPS 원본 → REF-05

[PRD §10. ADR → SRS 1.5 Constraints + Appendix]
- PRD: ADR-01~04 → SRS 1.5 Architectural Constraints로 반영
- 각 ADR의 시스템 영향도 → SRS 해당 REQ-FUNC의 Implementation Note
- ADR 원문 → Appendix 6.7 ADR Reference

[PRD §11. 용어 사전 → SRS 1.3 Definitions]
- PRD: Glossary 30개 용어 → SRS 1.3 Definitions, Acronyms, Abbreviations에 그대로 이관

================================================================
# 5. SRS 생성 시 반드시 지켜야 하는 10가지 필수 규칙

1) Story S1~S6은 Functional Requirement의 Source로 반드시 연결한다.
2) 21개 Epic(F1-a/b ~ F18) 전체를 반드시 여러 개의 REQ-FUNC로 분해한다.
   Must(6) → 최소 Epic당 3~5개 REQ-FUNC,
   Should(10) → 최소 Epic당 2~3개 REQ-FUNC,
   Could(5) → 최소 Epic당 2개 REQ-FUNC.
   HITL 프로토콜 4원칙 → REQ-FUNC-HITL-xxx로 별도 분해.
3) p95, SLA, 단위 처리 비용 등 모든 성능 수치는 NFR로 이동한다.
4) 모든 API는 System Context와 Appendix 모두에 기재한다.
5) 모든 엔터티/데이터 모델은 반드시 표로 구조화한다.
6) 시퀀스 다이어그램은 SRS 3.4와 Appendix 6.3 두 곳에 포함한다.
   3.4에는 핵심 플로우(진단→미션→리포트→HITL), 6.3에는 상세 플로우(B2B Zero-touch, 전자서명, 보상 등).
7) In/Out Scope는 SRS 1.2에 반드시 명시한다. Won't 4건도 Out-of-Scope에 포함한다.
8) ADR-01~04, 리스크 R1~R6, 가정 A1~A4, 의존성 D1~D4는 Constraints/Assumptions로 통합한다.
9) References는 반드시 REF-XX 형식 ID로 연결한다.
10) 모든 요구사항은 ID(REQ-FUNC-xxx / REQ-NF-xxx)를 가진 atomic requirement로 작성한다.
    각 REQ에는 Phase 태그(P0/P1/P2)를 반드시 포함한다.

================================================================
# 6. 작성 스타일 규칙
- 반드시 공식 문서 스타일(정확·간결·중복 금지)
- 테스트 가능하고 측정 가능한 요구사항만 작성
- "빠르게, 적절히, 원활히" 등의 모호한 표현 금지
- 표 사용을 적극 권장
- 순차적 시스템 동작을 명시해야 하는 경우, Mermaid 시퀀스 다이어그램 적극 활용
- 한국어로 작성하되, 요구사항 ID·기술 용어·API 경로는 영문 유지

================================================================
# 7. 작업 지시
지금부터 위 모든 기준을 준수하여 완전한 SRS 문서 전체를 작성하십시오.

## 볼륨 관리 지침
본 PRD는 21개 Epic에서 최소 63개 이상의 기능 요구사항이 도출됩니다.
문서 길이가 초과될 경우, 다음 순서로 분할 작성하십시오:
- **Part 1**: SRS §1~§3 (Introduction, Stakeholders, System Context)
- **Part 2**: SRS §4.1 Functional Requirements — Phase 0 (Must 6 Epics)
- **Part 3**: SRS §4.1 Functional Requirements — Phase 1 (Should 10 Epics) + HITL
- **Part 4**: SRS §4.1 Functional Requirements — Phase 2 (Could 5 Epics)
- **Part 5**: SRS §4.2 Non-Functional Requirements + §5 Traceability Matrix
- **Part 6**: SRS §6 Appendix 전체

각 Part의 시작에 "## Part N of 6" 헤더를 명시하십시오.

출력은 반드시 다음으로 시작하십시오:

"# Software Requirements Specification (SRS)
Document ID: SRS-001
Revision: 1.0
Date: 2026-05-07
Standard: ISO/IEC/IEEE 29148:2018"
