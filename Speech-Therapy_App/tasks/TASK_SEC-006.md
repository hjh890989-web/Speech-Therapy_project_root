---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Security] SEC-006: PIPA §17 국외 이전 동의 — STT (Google US) + Gemini (US/global) 통합 동의"
labels: 'phase:p0, mode:active, domain:sec, epic:pipa, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: SEC-006
- **Epic / Story**: PIPA §17 국외 이전 동의 (V07 핵심 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 한국 PIPA §17 의 국외 이전 동의 의무 — Google Cloud Speech-to-Text (US 리전) + Gemini API (US/global) 호출 전 별도 동의 필수. SEC-005 의 부모 대리 동의와 통합 UI + 별도 DB 컬럼 `overseasTransferConsentAt` 영속. 5중 가드의 2축.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.2 PIPA §17 국외 이전 동의 의무
  - REQ-NF-026 (국외 이전 동의 영속)
  - §6.1.1 User schema — `overseasTransferConsentAt DateTime?`
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-B SEC-006
- **Commits**: `f976388` + `f9cf258` (PIPA 두 동의 통합 commit)

## ✅ Task Breakdown
- [x] DB-015 의 `User.overseasTransferConsentAt DateTime?` 컬럼 추가
- [x] `PrivacyConsentForm` 의 2번째 체크박스 — "STT (Google Cloud, 미국) + Gemini (미국/글로벌) 국외 이전 동의"
- [x] `savePrivacyConsent` Server Action — `overseasTransferConsentAt = now()` 영속
- [x] 익명 user: `localStorage.overseas_consented_at` (FR-C-020)
- [x] 동의 UI 문구 — 처리 위탁업체 (Google LLC US), 보유 기간, 거부 시 서비스 이용 불가 명시 (PIPA §17 형식)
- [x] `analyzeDiagnosis` Server Action 가드 — 국외 이전 미동의 시 차단 (Gemini 미호출)
- [x] `/privacy` 페이지 §국외 이전 동의 섹션 placeholder (OPS-004 정식 교체 대기)

## 🧪 Acceptance Criteria
**Scenario 1: 통합 동의 흐름 (REQ-NF-026)**
- **Given**: 인증 user + 두 컬럼 NULL
- **When**: `/settings/privacy-consent` 에서 두 체크박스 + 제출
- **Then**: `pipaUnderageConsentAt + overseasTransferConsentAt` 동시 UPDATE

**Scenario 2: 국외 이전 미동의 시 Gemini 차단**
- **Given**: `pipaUnderageConsentAt` 만 설정 + `overseasTransferConsentAt = NULL`
- **When**: `analyzeDiagnosis` 호출
- **Then**: `ConsentRequiredError` throw (Gemini API 미호출)

**Scenario 3: PIPA §17 형식 문구 검증**
- **Given**: `/settings/privacy-consent` UI 렌더링
- **When**: 동의 카피 자동 검사
- **Then**: "Google LLC", "미국", "보유기간", "거부 시 이용 불가" 4 키워드 모두 노출

**Scenario 4: 익명 user localStorage marker**
- **Given**: 익명 user
- **When**: 진단 폼의 두 체크박스 + 제출
- **Then**: `localStorage.pipa_consented_at + overseas_consented_at` 동시 ISO timestamp 저장

**Scenario 5: audit_log 추적**
- **Given**: 인증 user 동의 갱신
- **When**: `savePrivacyConsent` Server Action 실행 (`withActor`)
- **Then**: AuditLog INSERT (oldData/newData sanitized + actorId 캡처)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-026**: PIPA §17 국외 이전 동의 영속 (별도 DB column)
- **법적 강행 규정**: 위반 시 행정처분 + 형사처벌 risk
- **횡단 제약**:
  - [x] R4 개인정보: 영유아 음성/transcript 의 미국 전송 = R4 의 핵심 risk
  - [x] CON-04: 동의 카피에 의료 금칙어 무위반
  - [x] CON-05 5중 가드: 본 SEC-006 = 2축 (SEC-005 와 짝)
- **운영**: Gemini 모델 / 리전 변경 시 동의 문구 재검토 + 재동의 필요

## 🏁 Definition of Done
- [x] DB-015 `overseasTransferConsentAt` 컬럼 prod 적용
- [x] `PrivacyConsentForm` 2 체크박스 UI 렌더링 검증
- [x] `savePrivacyConsent` 통합 영속 단위 테스트 통과
- [x] PIPA §17 형식 문구 (Google LLC + 미국 + 보유기간 + 거부 시 영향) 모두 노출 검증
- [x] `analyzeDiagnosis` 미동의 시 Gemini 미호출 검증
- [x] PR 본문에 REQ-NF-026 + §12.2 매핑
- [x] TEST-015 consent-flow.spec.ts 20/20 PASS

## 🚧 Dependencies & Blockers
- **Depends on**: DB-015 (User PIPA 컬럼), SEC-005 (PIPA §22-6 짝 컬럼), FR-C-021 (`PrivacyConsentForm`), API-014 (PIPA 3+4층 Server Action)
- **Blocks**: SEC-009 (5중 가드 통합), TEST-015, OPS-004 (`/privacy` 정식 교체)
- **Discope 영향**: 해당 없음
