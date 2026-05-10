---
type: concept
pillar: product
category: framework
aliases: [변경 관리 프로세스, Change Request Process, PRD CR 절차, SRS 변경 관리]
tags: [변경관리, CR, ChangeRequest, 거버넌스, PRD, SRS, raw53, 클러스터통합]
---

# 변경 관리 프로세스 — PRD/SRS 변경 거버넌스

raw 53 (PRD V09 Final Readiness Gate) § 선택적 보강 제안 § "변경 관리 프로세스" — **PRD V0.9 → V10 → SRS 전환 후 어느 단계 문서가 변경될 때 따라야 할 승인·리뷰·머지 절차**의 정본. 본 페이지는 (1) raw 53이 명시한 보강 권고 + (2) 본 위키 운영 패턴 (멀티 LLM 사이클 + raw 51 18 Findings) 기반으로 합성.

> raw 53 § 선택적 보강 제안 (Low 우선순위): "PRD 변경 시 승인 절차(CR → 리뷰 → 머지) 정의를 Revision History 아래에 추가" — **본 페이지가 그 정의의 정본**.

## 변경 분류 (3-Tier)

| Tier | 영향 범위 | 예시 | 절차 |
|---|---|---|---|
| **Tier 1 (Minor)** | 텍스트 수정 / 오타 / 단일 표 셀 / 비기능 명세 미세 조정 | 산술 1,000→17,000배 (F-07) / 측정 도구 명시 (F-06) | **단일 리뷰어 승인** + 즉시 머지 + Revision History `vX.Y.Z` patch |
| **Tier 2 (Major)** | 신규 REQ / KPI 추가 / 신규 ADR / Epic 분리·병합 / NFR 임계 변경 | CJM KPI 8건 수치화 (P0) / Lock-in KPI 등록 (P1) / HITL 4 원칙 추가 | **2 리뷰어 + Quality Gate** + Revision History `vX.Y` minor + multi-LLM 비교 (선택) |
| **Tier 3 (Strategic)** | 페르소나 추가/제거 / Phase 재정의 / 기술 스택 전환 / 비즈니스 모델 변경 | C-TEC-001~007 V05→V06 (Next.js) / Seg D → D-1+D-2 분리 / Phase 0/1/2 SOM 시나리오 | **3 리뷰어 (CTO+CEO+도메인 자문) + 멀티 LLM 사이클 + Readiness Gate ≥85%** + Revision History `vX` major |

→ 멀티 LLM 사이클 정본 [[product/concepts/multi-llm-workflow]] / Readiness Gate 정본 [[product/sources/PRD-Intermediate-Reviews-Meta]] § 5단계.

## CR (Change Request) 워크플로

```
[1] 변경 제안 (Proposal)
    ├─ 발견 채널: 외부 LLM 메타 검토 / 사용자 피드백 / Sprint Retro / 임상 자문
    └─ 산출: CR 템플릿 작성 (이유·범위·영향·검증 계획)
        ↓
[2] 영향 분석 (Impact Analysis)
    ├─ Tier 분류 (1/2/3)
    ├─ 영향 추적: REQ × Epic × Task × Persona × ADR ([[product/concepts/requirements-traceability-matrix]] RTM 사용)
    └─ 위험도 평가
        ↓
[3] 리뷰 (Review)
    ├─ Tier 1: 1 리뷰어 (PM)
    ├─ Tier 2: 2 리뷰어 (PM + CTO/도메인) + Quality Gate 5 체크리스트
    └─ Tier 3: 3 리뷰어 (CTO+CEO+도메인) + 멀티 LLM 비교
        ↓
[4] 승인 (Approval)
    ├─ 승인 후 Revision History 항목 자동 생성
    └─ 거부 시 사유 + 재제안 가능
        ↓
[5] 머지 (Merge)
    ├─ Tier 1: 직접 머지 (Lite)
    ├─ Tier 2: 영향 받은 페이지 (RTM 기준) 일괄 갱신
    └─ Tier 3: 별도 ingest 라운드 + 위키 lint + 모든 cross-link 재검증
        ↓
[6] 검증 (Verify)
    ├─ Tier 2-3: Readiness Gate 재실행 (현 38 항목)
    └─ 새 결함 발견 시 → [1]로 되돌림
        ↓
[7] 통보 (Notify)
    └─ 영향 받은 모든 차원 (REQ·Epic·Task·Persona) 담당자에게 자동 알림
```

## CR 템플릿

```markdown
# CR-YYYY-NNN: [한 줄 요약]

## 1. 변경 이유 (Why)
- 트리거: [메타 검토 / 사용자 피드백 / Sprint Retro / 임상 자문]
- 출처: [페이지 또는 보고서 ID]

## 2. 변경 범위 (What)
- 영향 차원: [REQ / Epic / Task / Persona / ADR / Descope]
- Tier: [1 / 2 / 3]

## 3. RTM 영향 추적
- REQ-FUNC-XXX, REQ-NF-XXX 등 영향 ID 명시
- 영향 받는 Task: [개수]
- 영향 받는 Persona: [목록]

## 4. 검증 계획
- 측정 임계: [수치]
- TEST 시나리오: [TEST-XXX 신규/수정]
- Quality Gate 항목: [5 체크리스트 중 적용 영역]

## 5. 리스크
- 무엇을 깨뜨릴 수 있는가
- Rollback 계획

## 6. 승인 흐름
- [ ] 1차 리뷰어: ___
- [ ] 2차 리뷰어: ___ (Tier 2-3)
- [ ] 3차 리뷰어: ___ (Tier 3 only)
- [ ] Readiness Gate 재실행 (Tier 2-3)
- [ ] 머지 일자: ___

## 7. Revision History 갱신
- 신규 버전: vX.Y.Z
- 변경 요약: [한 줄]
```

## 본 위키에 적용된 변경 관리 사례 (역추적)

| 변경 사례 | Tier | 처리 패턴 | 위키 흔적 |
|---|---|---|---|
| **TAM 정의 모순** (13 72-96만 vs PRD 150만) | 2 | 두 정의 병행 + 비교 표 명시 (방법론 차이로 정정) | [[product/concepts/customer-segmentation]] § "TAM 정의 모순" 비교 표 |
| **18 Findings (raw 51) 반영** (V08 → V0.9) | 2 | 외부 LLM 메타 → 자체 반영 → SRS 게이트 재검증 | [[product/sources/52-PRD-V09-Quality-Improvement]] (P0/P1/P2/P3 분류) |
| **C-TEC-001~007 (V05 → V06 기술 전환)** | 3 | 비즈니스 의도 V05 분리 + 기술 결정 V06 신규 + ADR-05~07 추가 | [[product/sources/SRS-V01-V05-Multi-LLM-Workflow]] § 7단계 § 후속 변환 |
| **Seg D → D-1/D-2 분리** (V07-V08 단계) | 3 | 페르소나 entity 분할 + RTM 5축 추적성 보강 | [[product/sources/31-32-VPS-V07-V08-Detail]] § DMU 5분리 |
| **F9.4 ROI 시뮬레이터 (V08 신규)** | 2 (Phase 2 진입 시 3) | F9-a 흡수 가정 → 본 위키에서 독립 Epic 승격 분석 | [[product/concepts/F9.4-ROI-simulator]] |

→ 본 위키의 "**자체-인용 보강 사이클**" ([[product/concepts/VPS-evolution]] § 9 차례 반복 검증) = CR 워크플로의 자연 발생 형태.

## raw 53 6대 기준 38 항목 정독 (재검증)

| # | 영역 | 만점 | 점수 | % | 핵심 |
|---|---|---|---|---|---|
| **1** | 목표·지표 | 6 | **6.0** | 100% | 북극성 W-AUR ≥60% + 보조 7개 + ADR-001 근거 |
| **2** | 스토리·AC | 8 | **8.0** | 100% | S1~S6 GWT + Neg AC 12건 + HITL 4 원칙 |
| **3** | 기능 요구 | 6 | **5.5** | **92%** | ⚠️ **3-5 감점 0.5**: Epic 스프린트 분해 (SP 추정) 미기재 → SRS 단계로 이관 |
| **4** | 비기능 | 7 | **7.0** | 100% | 성능·SLA·신뢰성·보안·모니터링·KPI 모두 수치 + Traceability |
| **5** | 리스크·가정 | 7 | **6.5** | **93%** | ⚠️ **5-7 감점 0.5**: Seg B R6 피벗 Plan B Epic 변경안 미명시 → SRS 또는 Phase 1 진입 시 |
| **6** | 범위 In/Out | 4 | **4.0** | 100% | In 5 + Out 4 + Won't 4 일관 + ADR-04 정합 |
| **합계** | — | **38** | **37.0** | **97%** | ✅ **PASS** (개별 ≥70% + 종합 ≥85% 게이트 크게 상회) |

## 감점 2건 후속 처리

| 감점 ID | 현재 상태 | 권고 조치 | 본 위키에서의 처리 |
|---|---|---|---|
| **3-5** Epic SP 분해 | FE/BE 책임 분리 ✅ / SP 추정·스프린트 분해 ❌ | SRS 단계 JIRA 티켓 분해 | ✅ [[product/concepts/MVP-feature-spec]] § Epic SP 표 + [[product/concepts/task-breakdown-overview]] § Sprint 1 분해 (88 Task) — **SRS 단계에서 직접 해소 완료** |
| **5-7** Seg B Plan B | EXP-2 연결 ✅ / Epic 변경안 ❌ | SRS 또는 Phase 1 진입 시 Plan B 명문화 | ✅ **해소** — [[product/concepts/R6-Seg-B-Plan-B]] 신설 (33차 후속): F4 + F18 → F4-Plus 통합 Epic + 신규 KPI 3종 + CR Tier 2 처리 흐름 + Plan C 이중 안전망 + 위키 영향 8 페이지 매트릭스. raw 53 감점 5-7 명문화 완료. |

→ 감점 3-5는 SRS V06 + 88 Task 분해로 **이미 해소** (97% → 사실상 99% 가능).
→ 감점 5-7은 Phase 1 EXP-2 진입 직전 Plan B Epic 변경안 명문화 필요 (CR Tier 2 처리 권고).

## raw 53 선택적 보강 제안 (Low 2건)

| 제안 | 본 위키에서의 처리 |
|---|---|
| **용어 사전 (Glossary)** — W-AUR, HITL, AOS/DOS, DMU, CJM 등 | ⚠️ 미작성. 본 위키의 cross-link 기반 정의 (각 페이지가 자기 용어 정의) 가 대체. 별도 단일 Glossary 페이지 후보 (CR Tier 1) |
| **변경 관리 프로세스** | ✅ **본 페이지가 그 정본** (CR 워크플로 + 3-Tier + 템플릿) |

## 주기 — 정기 리뷰 vs 이벤트 트리거

| 트리거 | Tier | 주기 | 역할 |
|---|---|---|---|
| **외부 LLM 메타 검토** (raw 51 18 Findings 사례) | 2-3 | 분기별 (PRD/SRS major 직전) | Quality Gate 재실행 + 18 Findings 패턴 |
| **Sprint Retro** | 1-2 | 매 Sprint 종료 시 (2주) | Sprint 1 합격 게이트 미달 → 명세 보강 |
| **임상 자문** | 2 | 분기별 + 이벤트 (예: 새 임상 도구 도입) | F15 KOPLAC + F11 윤리 + REVT/U-TAP 보강 |
| **사용자 피드백** | 1-2 | 상시 (100가정 파일럿 후) | 페르소나 검증 + AC 임계 재검증 |
| **VPS 진화 (V01→V09)** | 3 | 시리즈 주기 | 멀티 LLM 9 차례 사이클 |
| **법적·규제 변경** | 3 | 이벤트 (의료기기 분류, 개인정보보호법 개정 등) | ADR 재검토 + Won't 영역 재정의 |

## 위키 자체 변경 관리 (Meta)

본 위키 자체도 변경 관리 대상:
- `CLAUDE.md` 스키마 변경 = Tier 3 (위키 운영 규칙 자체)
- 신규 ingest = Tier 1 (개별 source 페이지) ~ Tier 2 (cross-link 다수 갱신)
- lint 결과 정정 = Tier 1
- 페이지 통합·분할 = Tier 2 (역링크 영향)

→ [[wiki/log.md]] 가 Append-only로 자체 Revision History 역할. 30+ 차 ingest 모두 추적 가능.

## ADR 후보

- **ADR-XX 변경 관리 3-Tier 도입** — 본 페이지 정식 등록 시 ADR로 승격 가능. 누적 ADR 후보 5종 (F9.4 무로그인 + F11 윤리 + F16 D5 + HITL 재학습 + 변경 관리 3-Tier).

## 출처

- raw/53_PRD_V09_Final_Readiness_Gate.md § 선택적 보강 제안 § "변경 관리 프로세스 (Low)"
- [[product/sources/PRD-Intermediate-Reviews-Meta]] § 5. PRD V09 Final Readiness Gate (97% PASS)
- [[product/concepts/multi-llm-workflow]] § 7-단계 사이클 (Tier 3 사례)

## 관련 product 페이지

- [[product/concepts/requirements-traceability-matrix]] — RTM = Tier 분류·영향 분석의 핵심 도구
- [[product/concepts/multi-llm-workflow]] — Tier 3 멀티 LLM 사이클 정본
- [[product/sources/PRD-Intermediate-Reviews-Meta]] — Quality Gate 5단계 정본
- [[product/concepts/architecture-decisions]] — ADR 자체가 Tier 3 변경 산출물
- [[product/sources/52-PRD-V09-Quality-Improvement]] — 18 Findings 자체 반영 패턴 사례

## Clinical 정합

- **임상 자문 분기별 트리거** = [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격자 풀의 분기별 자문 회의 운영. F15 KOPLAC 영감 + F11 윤리 + 평가 도구 갱신 트리거.
- **법적·규제 변경** = [[clinical/concepts/실어증]] / [[clinical/concepts/마비말장애]] § DTx 의료기기 영역의 식약처 분류 변경 시 ADR-04 (의료 용어 배제) 재검토 필요.

## 보강 필요

- 용어 사전 (Glossary) 별도 페이지 — W-AUR, HITL, AOS/DOS, DMU, CJM, EXP-1~4, KPI 정의 통합.
- Phase 1 진입 직전 Seg B R6 Plan B Epic 변경안 명문화 (감점 5-7 후속 CR Tier 2).
- 사용자 피드백 채널 정의 (앱 내 / 맘카페 / B2B 영업 / Sprint Retro) 매트릭스.
- CR-YYYY-NNN 번호 부여 체계 정착 (실제 운영 시).
