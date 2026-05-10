---
type: concept
pillar: product
category: synthesis
aliases: [F10 임상 연구 활용 동의, 부모 동의서 보강, 익명화 데이터 연구 동의, GDPR Opt-in]
tags: [F10, 동의서, GDPR, R4, 개인정보, 임상연구, model_retraining_data, ADR-03, CR-Tier2, 클러스터통합]
---

# F10 부모 동의서 임상 연구 활용 옵션 — 신규 Sub-feature 설계

[[product/concepts/HITL-retraining-pipeline]] § 윤리·법적 § "재학습 데이터 동의" 후속 정본. **익명화된 발달 데이터 임상 연구 활용 옵션을 F10 전자서명 동의서에 추가**하는 설계 + REQ-FUNC + AC + 법적 근거 + UX 흐름.

> 보강 필요 항목: "재학습 데이터 동의 옵션 (F10 전자서명 보강 필요)" — **본 페이지가 그 보강 정본**. **CR Tier 2 처리 권고**.

## 배경 — 현 F10 동의서의 한계

### 현 F10 동의 항목 (PRD V10 기준)

| 동의 항목 | 의무 여부 | 데이터 종류 | 보존 기간 |
|---|---|---|---|
| **음성 데이터 수집·분석** | ✅ 필수 | 음성 원본 + STT 텍스트 + 점수 | 7일 폐기 (ADR-03) → 익명화 점수만 영구 |
| **결과 활용** | ✅ 필수 | 점수·백분위 결과 | 구독 기간 + 1년 |
| **B2B 기관 (선택)** | ⚪ 옵션 | 원장 명의 리포트 발송 | 기관 계약 기간 |

### 한계 — 임상 연구 활용 명시적 동의 부재

```
현 흐름:
  부모 동의 → 음성 7일 폐기 + 익명화 점수 영구 보관
            → model_retraining_data INSERT (HITL 보정 시)
            → AI 모델 파인튜닝 (내부 활용)

⚠️ 명시적 동의 부재:
  - 익명화 점수가 임상 학술 연구에 활용될 수 있는지
  - 외부 임상가·학회와 데이터 공유 가능한지
  - 모델 파인튜닝 = 임상 연구 vs 단순 서비스 개선 구분
```

→ **GDPR Article 6 (lawful basis) + 한국 개인정보보호법 §22 (목적 외 이용)** 상 명시적 별도 동의 필요. 현 F10은 이를 누락.

## ⭐ 권장 설계 — 4-Tier Opt-in

### 동의 항목 재구조화

| Tier | 동의 항목 | 의무 | 데이터 | 활용 범위 |
|---|---|---|---|---|
| **T1 필수** | 음성 데이터 수집·분석 | ✅ | 원본 7일 + 익명화 점수 영구 | 본인 서비스 제공만 |
| **T2 필수** | 결과 활용 | ✅ | 점수·백분위 | 본인 리포트 + 가족 공유 (F5) |
| **T3 옵션** | B2B 기관 명의 리포트 (Phase 2) | ⚪ | 결과 PDF | 등록 기관에만 |
| **T4 옵션 ⭐** | **익명화 데이터 임상 연구 활용** | ⚪ | model_retraining_data 익명화 점수만 | **모델 개선 + 학술 발표 + 외부 임상 협력** |

→ T4 신규 동의가 본 보강의 핵심.

### T4 동의 세부 옵션 (3 sub-checkbox)

부모가 T4 동의 시 다음 3 sub-옵션을 별도 선택 가능:

```
☐ T4-a 모델 정확도 개선 (HITL 재학습 데이터 환류)
☐ T4-b 학술 발표 (논문·학회 연구 결과 — 익명 통계만)
☐ T4-c 외부 임상가·학회 데이터 공유 (협력 연구 기관 한정)
```

**개별 Opt-in**: 각 sub-옵션은 독립적. T4-a만 동의 가능 / T4-c는 거부 가능.

→ GDPR "granular consent" 원칙 정합.

## 신규 task 분해 (3종)

| 신규 ID 후보 | 종류 | 명세 | SP |
|---|---|---|---|
| **FR-Q-NEW-F10R-1** `consent_research_section` | Read | F10 동의서 페이지에 T4 + 3 sub-checkbox UI 추가. 각 sub-옵션 설명 모달 (학술 발표 = 통계만 / 외부 공유 = 협력 기관 한정 등) | 1.5 |
| **FR-C-NEW-F10R-1** `update_research_consent` | Write | 동의 변경 Server Action — 4 boolean 필드 (T4 + T4-a/b/c) DB UPDATE + 변경 audit_log INSERT | 1 |
| **DB-NEW-F10R-1** `consent_signatures` 테이블 보강 | DB | 기존 테이블 (DB-010)에 4 컬럼 추가 (researchConsent, researchModelImprovement, researchAcademic, researchExternalShare) + 인덱스 | 0.5 |
| **합계** | — | **F10R = 3 SP** | 3 |

→ 88 Task → 91 Task (HITL 재학습 3 + F9.4 5 + Phase 1 15 + 본 3 = **26 신규 / 36.5 SP**).

## REQ-FUNC 보강 후보 (SRS V07 후속)

| ID 후보 | 명세 (Atomic G/W/T) |
|---|---|
| **REQ-FUNC-NEW-F10R-1** | Given F10 동의서 페이지 / When 부모 진입 / Then T4 임상 연구 활용 + 3 sub-checkbox 노출 + 각 설명 모달 + 모두 기본 unchecked (Opt-in) |
| **REQ-FUNC-NEW-F10R-2** | Given T4-a/b/c 중 1+ 체크 / When 서명 제출 / Then DB UPDATE researchConsent=true + 해당 sub-옵션 boolean 갱신 + audit_log INSERT |
| **REQ-FUNC-NEW-F10R-3** | Given 부모 마이페이지 / When "임상 연구 동의 변경" 클릭 / Then 즉시 sub-옵션 변경 가능 + 효력 즉시 발생 (model_retraining_data 신규 INSERT 차단) |
| **REQ-FUNC-NEW-F10R-4** | Given T4-c 동의 (외부 공유) / When 데이터 공유 트리거 / Then **별도 매니저 승인** 강제 (외부 공유는 자동 불가, 수동 검토만) |

→ **REQ-FUNC-059~061 (F10) → 059~065 확장** 가능성.

## 데이터 흐름 — model_retraining_data 통합

```sql
-- DB-NEW-F10R-1: consent_signatures 테이블 보강
ALTER TABLE consent_signatures 
ADD COLUMN researchConsent BOOLEAN DEFAULT false,
ADD COLUMN researchModelImprovement BOOLEAN DEFAULT false,
ADD COLUMN researchAcademic BOOLEAN DEFAULT false,
ADD COLUMN researchExternalShare BOOLEAN DEFAULT false,
ADD COLUMN consentVersion VARCHAR(10),
ADD COLUMN consentUpdatedAt TIMESTAMP;

CREATE INDEX idx_consent_research ON consent_signatures(userId, researchConsent) WHERE researchConsent = true;
```

```sql
-- HITL-retraining-pipeline § sync_retraining_data 트리거 갱신
-- model_retraining_data INSERT 전 동의 확인
CREATE OR REPLACE FUNCTION sync_retraining_data()
RETURNS TRIGGER AS $$
DECLARE
  consent_research BOOLEAN;
  consent_model_improvement BOOLEAN;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- ⭐ 신규: T4-a (모델 개선) 동의 확인
    SELECT cs.researchConsent, cs.researchModelImprovement INTO consent_research, consent_model_improvement
    FROM session_logs sl
    JOIN consent_signatures cs ON sl.user_id = cs.user_id
    WHERE sl.session_id = NEW.sessionId;
    
    IF consent_research = true AND consent_model_improvement = true THEN
      INSERT INTO model_retraining_data (...)  -- 기존 명세
      ;
    ELSE
      -- 동의 없으면 model_retraining_data 미INSERT (HITL은 정상 진행, 재학습만 차단)
      INSERT INTO audit_log (event, sessionId, reason)
      VALUES ('retraining_consent_skipped', NEW.sessionId, 'no_consent');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

→ **HITL 시스템 자체는 정상 작동** (음성 데이터 수집·분석 = T1 필수 동의). **재학습 데이터 환류만** T4-a 동의에 의존.

## UX 흐름 — F10 동의서 페이지

```
┌──────────────────────────────────────────────┐
│ 학부모 동의서                                   │
│                                              │
│ [필수] 1. 음성 데이터 수집·분석 동의              │
│   ✅ 동의합니다 (서비스 이용 필수)              │
│                                              │
│ [필수] 2. 결과 활용 동의                       │
│   ✅ 동의합니다 (서비스 이용 필수)              │
│                                              │
│ [선택] 3. 기관 명의 리포트 발송 (B2B)          │
│   ☐ 동의합니다 / ☐ 동의하지 않습니다            │
│                                              │
│ [선택] 4. 익명화 데이터 임상 연구 활용  ⭐     │
│   ☐ 동의합니다 (아래 sub-옵션 선택 가능)       │
│      ☐ 4-a 모델 정확도 개선                   │
│      ☐ 4-b 학술 발표 (익명 통계)              │
│      ☐ 4-c 외부 임상 협력 (별도 매니저 승인)   │
│                                              │
│   ℹ️ "익명화"란? [모달] 부모·자녀 식별 정보   │
│      삭제 후 점수만 보존. 음성·이름·생년월일   │
│      모두 삭제됨.                             │
│                                              │
│ [선택] 본 동의는 언제든 마이페이지에서 변경      │
│        가능합니다.                            │
│                                              │
│ [전자서명 → ]                                 │
└──────────────────────────────────────────────┘
```

### 마이페이지 변경 흐름

```
설정 → 개인정보 → 임상 연구 활용 동의
   ├─ T4 전체 ON/OFF
   ├─ T4-a 모델 개선 ON/OFF
   ├─ T4-b 학술 발표 ON/OFF
   └─ T4-c 외부 공유 ON/OFF (변경 시 매니저 알림)

변경 효력: 즉시
- T4 OFF: 신규 model_retraining_data INSERT 차단 (기존 데이터는 익명화 상태로 유지)
- T4 다시 ON: 신규 INSERT 재개 (소급 미적용)
```

## 법적 근거 매핑

| 법령 | 조항 | 본 설계의 정합 |
|---|---|---|
| **GDPR Art. 6** | Lawful basis (Consent) | T4가 명시적 별도 동의 = 합법 근거 (a) Consent |
| **GDPR Art. 7** | Granular consent | T4-a/b/c 개별 Opt-in = granular 원칙 정합 |
| **GDPR Art. 17** | Right to erasure | 마이페이지 즉시 변경 = 철회권 보장 |
| **GDPR Art. 25** | Data Protection by Design | 기본값 unchecked + 익명화 강제 |
| **한국 개인정보보호법 §22** | 목적 외 이용 | T4가 별도 동의 = 합법 |
| **한국 개인정보보호법 §39-3** | 동의 철회 | 마이페이지 변경 = 철회권 |
| **아동보호법 §26-2** | 영유아 데이터 보호 | 음성 7일 폐기 (ADR-03) + 익명화 |

→ **GDPR + 한국 모두 정합**. 외부 공유 (T4-c)는 매니저 수동 승인으로 추가 보호.

## 기존 부모 (마이그레이션 시나리오)

서비스 출시 후 본 보강이 추가될 때 **이미 결제 중인 부모**의 처리:

| 시나리오 | 처리 |
|---|---|
| **신규 가입** | T4 노출 (Opt-in) — 위 흐름 |
| **기존 부모 (T4 동의 미수집)** | 다음 로그인 시 모달 강제 노출. 단, T4는 **선택** (거부 가능). 기존 데이터는 익명화 상태로 유지하되 신규 model_retraining_data INSERT는 차단 |
| **기존 부모 (T4 거부)** | model_retraining_data 누적 차단. AI 모델은 다른 동의자 데이터로만 개선 |

→ 마이그레이션 자체가 CR Tier 2 (Major) 처리.

## ADR 영향

| 기존 ADR | 영향 | 조치 |
|---|---|---|
| **ADR-03 7일 폐기** | 음성 원본은 동일 (T1 필수 동의 영역) | 영향 없음 |
| **ADR-04 의료 용어 배제** | T4 동의 모달 카피에 "진단/치료" 단어 배제 | 정합 |
| **ADR-11 HITL 재학습 책임 분리** | T4-a 동의 데이터만 재학습 사용 → ML Ops 검증 항목 추가 | 신규 검증 단계 |

→ **신규 ADR 불필요** (기존 ADR 정합).

## CR Tier 2 처리 흐름

```
[1] 변경 제안: F10 동의서 보강 (Phase 1 진입 직전 또는 마이그레이션 시점)
       ↓
[2] 영향 분석: REQ-FUNC-059~061 → 059~065 (4 신규) + 88→91 Task + DB-010 보강
       ↓
[3] 리뷰: PM (1차) + 법무 자문 (2차, GDPR + 한국 개인정보보호법 검증) + Quality Gate
       ↓
[4] 승인: SRS V06 → V07 minor + Revision History
       ↓
[5] 머지: F10 페이지 + 마이페이지 + DB 마이그레이션 + 기존 부모 모달 강제 노출
       ↓
[6] 검증: T4 동의률 측정 (≥30% 가설) + 거부 시 model_retraining_data 차단 자동 검증
       ↓
[7] 통보: HITL-retraining-pipeline + RTM + ADR 양방향 갱신
```

## KPI 신규 후보

| KPI | 임계 | 측정 |
|---|---|---|
| T4 동의률 (전체 부모) | ≥30% | DB query (researchConsent=true / total) |
| T4-a 모델 개선 동의률 | ≥25% | DB query |
| T4-b 학술 발표 동의률 | ≥15% | DB query (보수적) |
| T4-c 외부 공유 동의률 | ≥5% | DB query (가장 보수) |
| T4 거부 시 가구 결제 유지율 | ≥95% (T4가 결제 결정에 영향 없는지 검증) | 결제 DB 코호트 분석 |

→ T4 거부 부모도 결제 유지 = 동의 강제 압박 없음 검증 (윤리 안전망).

## Persona 영향

| Persona | 매핑 |
|---|---|
| **이지수 (불안형)** | T4 모달 카피에 "AI 정확도 개선 = 더 정확한 진단" 메시지 → T4-a 동의률 ↑ 가설 |
| **박민정 (데이터형)** | T4-b 학술 발표 동의 가능성 높음 — "자녀 발달이 학계에 기여" 자부심 |
| **최수현 (대기자)** | T4 거부 가능성 높음 (의료 영역 회의) — Disclaimer 강화 필요 |
| **황보름 (ASD 경계선)** | **T4-a 핵심 기여자** — 비전형 발화 데이터가 모델 다양화에 직접 기여 |
| **송혜경 (외할머니)** | T4 전체 거부 가능성 높음 (전통 양육 + AI 회의). 가구 단위 동의 = 부모(딸) 권한만 인정 |

## 임상 정합

- **익명화 데이터 임상 학술 발표** = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙 2 사설 센터 임상가의 학술 활동 토대. 아동 데이터의 부모 동의 후 학회 발표는 일반적 임상 관행.
- **외부 임상가·학회 협력** = [[clinical/concepts/아동언어치료-핵심기법]] § 4기법 정밀화 학술 연구 + [[clinical/entities/U-TAP]] / [[clinical/entities/REVT]] 등 표준 도구 갱신 협력 가능성.
- **별도 매니저 승인** (T4-c) = 외부 데이터 공유 = 임상 윤리위원회 (IRB) 검토 패턴의 디지털 변형.

## 보강 필요

- T4-c 외부 공유 시 IRB (Institutional Review Board) 절차 정의 — 학회·기관별 절차.
- 청소년 (만 13세+) 본인 동의 추가 필요 여부 검토 (현 만 2-7세 영유아 = 부모 단독 동의 충분).
- T4 동의 카피 A/B (절대 강요 카피 vs 자발 카피) — 동의률 영향 측정.
- 마이그레이션 시점 결정 (Phase 0 vs Phase 1 진입) — 운영 비용 vs 윤리 가치 트레이드오프.
- 외부 임상 협력 기관 사전 확보 (T4-c 활성화 전).

## 출처

- [[product/concepts/HITL-retraining-pipeline]] § 윤리·법적 § "재학습 데이터 동의"
- [[product/sources/65-SRS-V06-Final]] § REQ-FUNC-059~061 (F10 현 명세)
- [[product/concepts/architecture-decisions]] § ADR-03 (7일 폐기) + ADR-04 (의료 용어 배제)

## 관련 product 페이지

- [[product/concepts/MVP-feature-spec]] § F10 전자서명 Epic
- [[product/concepts/HITL-retraining-pipeline]] § sync_retraining_data 트리거 갱신
- [[product/concepts/expert-diversity-monitoring]] § 임상 자문 (T4-c 외부 공유와 연계)
- [[product/concepts/change-management-process]] § Tier 2 처리 흐름

## Clinical 정합

- [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 학술 활동 = T4-b 학술 발표 동의의 임상 토대
- [[clinical/concepts/아동언어치료-핵심기법]] § 4기법 정밀화 = T4-c 외부 협력 연구 가능 영역
- [[clinical/entities/U-TAP]] § 음운변동 분석 = T4-a 모델 개선의 임상 데이터 (가장 직접적)

---

✅ HITL-retraining-pipeline § 보강 필요 항목 1건 해소 (재학습 데이터 동의 옵션).
