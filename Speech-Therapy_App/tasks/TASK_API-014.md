---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Server Action] API-014: updateChildProfile + generateCushion (PIPA 3+4층 가드)"
labels: 'phase:p0, mode:active, domain:api, epic:compliance, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-014
- **Epic / Story**: Compliance / PIPA 5중 가드 3+4층 (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: ADR-16 PIPA 5중 가드의 3층 (updateChildProfile graceful 분기) + 4층 (generateCushion graceful fallback, Gemini 미호출 + SAFE_CUSHION_FALLBACK 반환).

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.5.1 Server Actions — updateChildProfile + generateCushion
  - §12.4.3 3층 — updateChildProfile
  - §12.4.4 4층 — generateCushion (SAFE_CUSHION_FALLBACK)
  - REQ-NF-029 (PIPA 5중 가드)
  - ADR-16

## ✅ Task Breakdown
- [x] `app/actions/update-child-profile.ts`:
  - `assertConsentedIfAuthenticated()` 호출 → 미동의 시 throw 대신 `{ ok: false, reason: "consent_required" }` 반환 (graceful)
  - 동의 user 만 자녀 정보 UPDATE
- [x] `app/actions/cushion.ts`:
  - `generateCushion(input)` — Gemini 호출 전 `assertConsentedIfAuthenticated()` 호출
  - 미동의 user — Gemini 미호출 + `SAFE_CUSHION_FALLBACK` ("발음이 점점 좋아지고 있어요!" 등 정적 카피) 반환
  - 동의 user — Gemini 호출 (lib/ai/pii-mask.ts FR-C-025 통과 후)
- [x] `lib/consent/assert.ts` — `assertConsentedIfAuthenticated()` 공통 helper
- [x] `lib/cushion-fallback.ts` — `SAFE_CUSHION_FALLBACK` 상수 5개 텍스트 (CON-04 검증 완료)

## 🧪 Acceptance Criteria
**Scenario 1: 동의 user — 정상 UPDATE (3층)**
- **Given**: User.pipaUnderageConsentAt 존재
- **When**: `updateChildProfile({preferredPhonemes: ["ㄹ"]})`
- **Then**: UPDATE 성공 + `{ok: true}` 반환

**Scenario 2: 미동의 인증 user — graceful 분기 (3층)**
- **Given**: User.pipaUnderageConsentAt = NULL
- **When**: `updateChildProfile(input)`
- **Then**: `{ok: false, reason: "consent_required"}` 반환 (throw 안 함, UI 가 redirect)

**Scenario 3: 동의 user — Gemini 정상 호출 (4층)**
- **Given**: 동의 user + transcript
- **When**: `generateCushion(input)`
- **Then**: Gemini 호출 → PII 마스킹 → cushion 텍스트 반환

**Scenario 4: 미동의 user — SAFE_CUSHION_FALLBACK (4층)**
- **Given**: User.overseasTransferConsentAt = NULL
- **When**: `generateCushion(input)`
- **Then**: Gemini 미호출 + 정적 5개 카피 중 1개 랜덤 반환

**Scenario 5: CON-04 금칙어 SAFE fallback 무위반**
- **Given**: SAFE_CUSHION_FALLBACK 5개 카피
- **When**: 금칙어 정규식 스캔
- **Then**: "치료"/"진단"/"장애" 0건

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-029**: PIPA 5중 가드 — 본 Server Action 이 3+4층
- **CON-04**: SAFE_CUSHION_FALLBACK 자체 무위반 자동 검증
- **횡단 제약**:
  - [x] CON-04: SAFE fallback 카피 검증 + Gemini 응답 검증
  - [x] R7 PIPA 위반: 미동의 user 의 국외 이전 (Gemini) 차단

## 🏁 Definition of Done
- [x] 2 Server Action graceful 분기 검증
- [x] SAFE_CUSHION_FALLBACK 5개 카피 CON-04 무위반
- [x] `tsc --strict` 0 errors
- [x] `41f431e` commit — 3+4층 확장

## 🚧 Dependencies & Blockers
- **Depends on**: DB-015, API-013, FR-C-025 (PII 마스킹), API-011 (Gemini)
- **Blocks**: FR-C-023 (3층 UI), FR-C-024 (4층 UI), SEC-009 (5중 가드 통합)
- **Discope 영향**: 해당 없음
