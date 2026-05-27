---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-022: analyzeDiagnosis PIPA 가드 (2층 인증 + 5층 익명 boolean)"
labels: 'phase:p0, mode:active, domain:fr-c, epic:compliance, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-022
- **Epic / Story**: Compliance / PIPA 5중 가드 2+5층 (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: ADR-16 PIPA 5중 가드의 2층 (인증 user `assertConsentedIfAuthenticated`) + 5층 (익명 user input boolean). 두 layer 모두 미동의 시 `ConsentRequiredError` throw — `analyzeDiagnosis` 의 가장 강한 binding. 핵심 Server Action (V06 FR-C-001) 위에 PIPA 가드를 입혀 STT → Gemini 호출 차단.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.4.2 2층 — analyzeDiagnosis 인증 user 가드
  - §12.4.5 5층 — 익명 user boolean 가드
  - §12.4.6 가드 매트릭스
  - REQ-NF-029 (PIPA 5중 가드)
  - ADR-16
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-022
- **Commits**: `a6378b9` (Server Action 2층) + `f9cf258` (5층 익명 boolean)
- **선행 Task**: FR-C-001 (V06 base — 3축 스코어링 Server Action 로직)

## ✅ Task Breakdown
- [x] `app/actions/diagnosis.ts` 의 `analyzeDiagnosis(input)` 진입부 직후 PIPA 가드 추가
- [x] 2층 — 인증 분기:
  ```typescript
  if (input.userId) {
    await assertConsentedIfAuthenticated(input.userId);
    // 미동의 시 lib/consent/assert.ts 가 ConsentRequiredError throw
  }
  ```
- [x] 5층 — 익명 분기:
  ```typescript
  if (!input.userId) {
    if (!input.pipaUnderageConsent || !input.overseasTransferConsent) {
      throw new ConsentRequiredError();
    }
  }
  ```
- [x] `lib/consent/assert.ts` 의 `assertConsentedIfAuthenticated(userId)` helper:
  - `prisma.user.findUnique({where: {id: userId}, select: {pipaUnderageConsentAt: true, overseasTransferConsentAt: true}})`
  - 둘 중 하나라도 NULL 시 throw `ConsentRequiredError`
- [x] `lib/errors.ts` 의 `ConsentRequiredError extends Error` 클래스 — code: `'CONSENT_REQUIRED'`
- [x] 5층 익명 user — User upsert 시 `pipaUnderageConsentAt` + `overseasTransferConsentAt` 자동 INSERT (DB-015 정합)
- [x] FR-C-001 의 기존 STT → Gemini → INSERT 흐름은 무수정 — 가드만 prepend

## 🧪 Acceptance Criteria
**Scenario 1: 인증 user 동의 — 정상 분석 (REQ-NF-029)**
- **Given**: User.pipaUnderageConsentAt + overseasTransferConsentAt 둘 다 timestamp
- **When**: `analyzeDiagnosis(input)` 호출
- **Then**: 가드 통과 → 3축 점수 분석 → INSERT 성공

**Scenario 2: 인증 user 미동의 — ConsentRequiredError throw (2층)**
- **Given**: User.pipaUnderageConsentAt = NULL
- **When**: `analyzeDiagnosis(input)` 호출
- **Then**: `ConsentRequiredError` throw + Gemini 미호출 + DB 변경 없음

**Scenario 3: 익명 user 두 boolean true — 정상 분석 (5층)**
- **Given**: input.userId == null + pipaUnderageConsent: true + overseasTransferConsent: true
- **When**: `analyzeDiagnosis(input)` 호출
- **Then**: 가드 통과 → User upsert (두 컬럼 now) → 3축 분석 → INSERT 성공

**Scenario 4: 익명 user 한 boolean false — ConsentRequiredError (5층)**
- **Given**: input.userId == null + pipaUnderageConsent: true + overseasTransferConsent: false
- **When**: `analyzeDiagnosis(input)` 호출
- **Then**: `ConsentRequiredError` throw + Gemini 미호출

**Scenario 5: 동의 user — Gemini PII 마스킹 통과 (FR-C-025 정합)**
- **Given**: 동의 user + transcript 에 "010-1234-5678" 포함
- **When**: 가드 통과 후 Gemini 호출 직전
- **Then**: `pii-mask.ts` 가 전화번호 마스킹 → Gemini 호출 안전

**Scenario 6: 5층 익명 upsert 시 audit_log 자동 capture**
- **Given**: 익명 user 의 5층 가드 통과 + User upsert
- **When**: DB-013 의 `audit_user_changes` TRIGGER 발화
- **Then**: AuditLog INSERT 1건 (action='INSERT', actorId=null, newData sanitized)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-029**: PIPA 5중 가드 — 본 Server Action 이 2+5층 (가장 강력)
- **REQ-NF-001**: p95 ≤ 800ms — 가드 자체는 DB 1 query (User select) ≤ 50ms
- **횡단 제약**:
  - [x] R7 PIPA 위반: 미동의 user 의 국외 이전 (Google Cloud Speech + Gemini) 차단
  - [x] CON-04: ConsentRequiredError 메시지 자체 의료 표현 무위반
  - [x] R4 개인정보: 5층 익명 upsert 시 audit_log 자동 capture
- **graceful 분기 미적용**: 본 Server Action 은 throw — UI 가 catch 후 redirect (FR-C-019 1층) 또는 inline 동의 UI 노출 (FR-C-021)

## 🏁 Definition of Done
- [x] `analyzeDiagnosis` 6 scenario 통과
- [x] `ConsentRequiredError` 클래스 정의 + try/catch 검증
- [x] `tsc --strict` 0 errors
- [x] E2E `consent-flow.spec.ts` 20/20 PASS
- [x] `a6378b9` (2층) + `f9cf258` (5층) commit 본문에 REQ-NF-029 매핑
- [x] audit_log INSERT 검증 (TEST-017 정합)

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-001 (V06 base analyzeDiagnosis), DB-015 (User PIPA 컬럼), API-014 (assertConsentedIfAuthenticated helper), FR-C-020 (useAnonymousConsent — input 의 두 boolean 출처), FR-C-025 (PII 마스킹)
- **Blocks**: SEC-005, SEC-006, SEC-009 (5중 가드 통합), TEST-015 (consent-flow E2E)
- **Discope 영향**: 해당 없음
