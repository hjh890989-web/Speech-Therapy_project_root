---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-023: updateChildProfile PIPA 가드 (3층, graceful 분기)"
labels: 'phase:p0, mode:active, domain:fr-c, epic:compliance, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-023
- **Epic / Story**: Compliance / PIPA 5중 가드 3층 (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: ADR-16 PIPA 5중 가드의 3층 — `updateChildProfile` Server Action 에서 미동의 인증 user 의 자녀 정보 수정 차단. throw 가 아닌 graceful 분기 (`{ ok: false, reason: "consent_required" }` 반환) — UI 가 redirect 또는 동의 prompt 분기 처리 가능.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.4.3 3층 — updateChildProfile 가드
  - §12.4.6 가드 매트릭스
  - REQ-NF-029 (PIPA 5중 가드)
  - ADR-16
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-023
- **Commit**: `41f431e` (3+4층 확장)

## ✅ Task Breakdown
- [x] `app/actions/update-child-profile.ts` 의 `updateChildProfile(input)` 진입부에 가드 추가
- [x] graceful 분기:
  ```typescript
  const consented = await checkConsentedIfAuthenticated(userId);
  if (!consented) {
    return { ok: false, reason: "consent_required" as const };
  }
  // 동의 user 만 자녀 정보 UPDATE
  await prisma.user.update({...});
  return { ok: true };
  ```
- [x] `lib/consent/assert.ts` 의 `checkConsentedIfAuthenticated(userId)` boolean 반환 helper (assertConsentedIfAuthenticated 의 non-throw 버전)
- [x] Zod 입력 스키마 `lib/schemas/child-profile.ts`: `{ childAgeMonths: number, preferredPhonemes: string[] }`
- [x] `withActor(userId, () => prisma.user.update(...))` (DB-013 audit_log 정합)
- [x] UI 호출부 — `{ ok: false, reason: "consent_required" }` 응답 시 `router.push('/settings/privacy-consent')`

## 🧪 Acceptance Criteria
**Scenario 1: 동의 user — 정상 UPDATE (REQ-NF-029)**
- **Given**: User.pipaUnderageConsentAt + overseasTransferConsentAt 둘 다 timestamp
- **When**: `updateChildProfile({childAgeMonths: 36, preferredPhonemes: ["ㄹ"]})`
- **Then**: UPDATE 성공 + `{ok: true}` 반환 + audit_log INSERT

**Scenario 2: 미동의 user — graceful 반환 (throw 안 함)**
- **Given**: User.pipaUnderageConsentAt = NULL
- **When**: `updateChildProfile(input)` 호출
- **Then**: `{ok: false, reason: "consent_required"}` 반환 + DB UPDATE 없음 + throw 없음

**Scenario 3: UI 가 graceful 응답 catch → redirect**
- **Given**: `/settings/child` 페이지에서 본 Server Action 호출
- **When**: `{ok: false, reason: "consent_required"}` 응답
- **Then**: UI 가 `/settings/privacy-consent` 로 redirect

**Scenario 4: graceful 분기 시 audit_log 미발생 (UPDATE 없음)**
- **Given**: 미동의 user 의 graceful 응답
- **When**: TRIGGER 동작 검증
- **Then**: AuditLog INSERT 없음 (UPDATE 자체 미발생)

**Scenario 5: 익명 user 분기 미적용 (가드 매트릭스 §12.4.6)**
- **Given**: input.userId == null
- **When**: `updateChildProfile(input)` 호출
- **Then**: N/A — 본 Server Action 은 인증 user 전용 (admin 외 자연 차단)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-029**: PIPA 5중 가드 — 본 Server Action 이 3층 (graceful)
- **횡단 제약**:
  - [x] R7 PIPA 위반: 미동의 user 의 자녀 정보 수정 차단
  - [x] R4 개인정보: 자녀 이름 미수집 — childAgeMonths + preferredPhonemes 만
  - [x] CON-04: graceful 응답 reason 자체 무위반
- **graceful 정책**: 2층 (analyzeDiagnosis) 은 throw / 3+4층 은 graceful — UI 자연 분기 정합

## 🏁 Definition of Done
- [x] `updateChildProfile` 5 scenario 통과
- [x] `checkConsentedIfAuthenticated` boolean helper 검증
- [x] `tsc --strict` 0 errors
- [x] graceful 응답 type-safe (`{ok: true} | {ok: false, reason: "consent_required"}`)
- [x] `41f431e` commit 본문에 REQ-NF-029 + ADR-16 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-014 (updateChildProfile Server Action), DB-015 (User PIPA 컬럼), DB-013 (audit_log TRIGGER + withActor)
- **Blocks**: SEC-009 (5중 가드 통합), TEST-015 (consent-flow E2E 3층 분기)
- **Discope 영향**: 해당 없음
