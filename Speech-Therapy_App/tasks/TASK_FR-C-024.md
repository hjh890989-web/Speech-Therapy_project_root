---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-024: generateCushion PIPA 가드 (4층, SAFE_CUSHION_FALLBACK)"
labels: 'phase:p0, mode:active, domain:fr-c, epic:compliance, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-024
- **Epic / Story**: Compliance / PIPA 5중 가드 4층 (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: ADR-16 PIPA 5중 가드의 4층 — `generateCushion` Server Action 에서 미동의 user 의 Gemini (국외 이전) 호출 차단 + graceful fallback (`SAFE_CUSHION_FALLBACK` 정적 카피 반환). Gemini API key 비용 + 국외 이전 동시 차단.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.4.4 4층 — generateCushion 가드 (SAFE_CUSHION_FALLBACK)
  - §12.4.6 가드 매트릭스
  - REQ-NF-029 (PIPA 5중 가드)
  - REQ-NF-026 (PIPA §17 국외 이전)
  - ADR-16
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-024
- **Commit**: `41f431e` (3+4층 확장)

## ✅ Task Breakdown
- [x] `app/actions/cushion.ts` 의 `generateCushion(input)` 진입부에 가드 추가
- [x] graceful fallback 분기:
  ```typescript
  const consented = await checkConsentedIfAuthenticated(userId);
  if (!consented) {
    return { cushion: pickRandom(SAFE_CUSHION_FALLBACK), source: 'fallback' as const };
  }
  // 동의 user — Gemini 호출
  const maskedTranscript = maskPII(input.transcript); // FR-C-025
  const cushion = await geminiClient.generateContent(prompt);
  return { cushion, source: 'gemini' as const };
  ```
- [x] `lib/cushion-fallback.ts` 의 `SAFE_CUSHION_FALLBACK: readonly string[]` — 5개 정적 카피
  - 예: "발음이 점점 좋아지고 있어요!" / "꾸준한 연습이 가장 큰 힘이에요." / "조금씩 함께 해봐요." / "자녀의 노력이 멋져요." / "오늘도 한 걸음 나아갔어요."
- [x] CON-04 금칙어 무위반 자동 검증 (5개 카피 모두 `/(치료|진단|장애|환자)/` 0건)
- [x] PII 마스킹 통합 — 가드 통과 후 Gemini 호출 직전 `pii-mask.ts` (FR-C-025) 호출
- [x] 익명 user 분기 미적용 (가드 매트릭스 §12.4.6 — 별도 PR 검토)

## 🧪 Acceptance Criteria
**Scenario 1: 동의 user — Gemini 정상 호출 (REQ-NF-029)**
- **Given**: User.pipaUnderageConsentAt + overseasTransferConsentAt 둘 다 timestamp
- **When**: `generateCushion({userId, transcript: "사과"})`
- **Then**: Gemini 호출 → cushion 텍스트 + `source: 'gemini'` 반환

**Scenario 2: 미동의 user — SAFE_CUSHION_FALLBACK 반환 (4층, graceful)**
- **Given**: User.overseasTransferConsentAt = NULL
- **When**: `generateCushion(input)` 호출
- **Then**: Gemini 미호출 + 5개 카피 중 랜덤 1개 + `source: 'fallback'` 반환

**Scenario 3: SAFE_CUSHION_FALLBACK 5개 카피 CON-04 무위반**
- **Given**: SAFE_CUSHION_FALLBACK 배열
- **When**: 정규식 스캔
- **Then**: "치료/진단/장애/환자" 0건 — 정적 검증

**Scenario 4: Gemini 호출 전 PII 마스킹 (FR-C-025 정합)**
- **Given**: 동의 user + transcript 에 "010-1234-5678"
- **When**: 가드 통과 + Gemini 호출 직전
- **Then**: `maskPII` 가 전화번호 → `[PHONE_REDACTED]` 치환 후 Gemini 호출

**Scenario 5: 국외 이전 (Gemini 미국/글로벌) 차단**
- **Given**: User.overseasTransferConsentAt = NULL
- **When**: `generateCushion(input)` 호출
- **Then**: Gemini 미호출 — PIPA §17 위반 0건

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-029**: PIPA 5중 가드 — 본 Server Action 이 4층 (graceful + Gemini 미호출)
- **REQ-NF-026**: PIPA §17 국외 이전 차단 — Gemini 미호출 시 위반 0건
- **CON-04**: SAFE_CUSHION_FALLBACK 자체 의료 표현 무위반 자동 검증
- **횡단 제약**:
  - [x] R7 PIPA 위반: 미동의 user 의 Gemini 호출 차단
  - [x] CON-04: 5개 fallback 카피 + Gemini 응답 둘 다 검증
  - [x] R4 개인정보: PII 마스킹 (FR-C-025) 통합
- **비용 효과**: 미동의 user 의 Gemini 호출 미발생 → API 비용 절감

## 🏁 Definition of Done
- [x] `generateCushion` 5 scenario 통과
- [x] `SAFE_CUSHION_FALLBACK` 5개 카피 CON-04 무위반 검증
- [x] `tsc --strict` 0 errors
- [x] graceful 응답 type-safe (`source: 'gemini' | 'fallback'`)
- [x] `41f431e` commit 본문에 REQ-NF-029 + REQ-NF-026 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-014 (generateCushion Server Action), DB-015 (User PIPA 컬럼), FR-C-025 (PII 마스킹), API-011 (Gemini)
- **Blocks**: SEC-006 (PIPA §17), SEC-009 (5중 가드 통합), TEST-015 (consent-flow E2E 4층 분기)
- **Discope 영향**: 해당 없음
