---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-020: useAnonymousConsent hook + localStorage marker (익명 PIPA)"
labels: 'phase:p0, mode:active, domain:fr-c, epic:compliance, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-020
- **Epic / Story**: Compliance / 익명 user PIPA (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 익명 user 의 PIPA 동의 상태를 localStorage 에 영속화하여 재방문 시 자동 prefill. iOS Safari ITP 7일 cookie 한도 회피 + Sprint 2 SP2_3+4 의 localStorage 권위 패턴 적용. 인증 user 의 DB 컬럼 (DB-015) 대비 — 익명 user 는 localStorage 가 1차 source of truth.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.2.1 흐름 (인증 + 익명 통합) — localStorage 마커 흐름
  - §3.6.4 PIPA 동의 흐름 (V07 신규)
  - REQ-NF-025 (PIPA §22-6) / REQ-NF-026 (PIPA §17)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-020
- **Commit**: `f9cf258` (PIPA 익명 user)
- **참고 메모리**: `reference_vercel_hobby_workarounds.md` §8 iOS ITP cookie + localStorage 권위 패턴

## ✅ Task Breakdown
- [x] `hooks/useAnonymousConsent.ts` Custom Hook 작성 (`'use client'`)
  - 반환: `{ pipaConsentedAt: string | null, overseasConsentedAt: string | null, setConsent: (pipa: boolean, overseas: boolean) => void, revoke: () => void }`
  - localStorage key: `pipa_consented_at` + `overseas_consented_at` (ISO 8601)
- [x] `setConsent(true, true)` — `localStorage.setItem('pipa_consented_at', new Date().toISOString())` + overseas 동일
- [x] `revoke()` — 두 key 모두 `localStorage.removeItem` (GDPR 잊혀질 권리)
- [x] SSR 안전 가드 — `typeof window === 'undefined'` 분기 → 초기 null
- [x] `useEffect` hydration 후 localStorage 읽기 + `useState` sync
- [x] `analyzeDiagnosis` 익명 분기 호출 시 본 hook 의 값 → `input.pipaUnderageConsent` + `input.overseasTransferConsent` boolean 전달
- [x] FR-C-021 의 `PrivacyConsentForm` + `DiagnosisForm` inline 체크박스 와 binding

## 🧪 Acceptance Criteria
**Scenario 1: 익명 user — 동의 체크 시 localStorage 영속 (REQ-NF-025/026)**
- **Given**: 익명 user `/diagnose` 페이지 — 두 체크박스 ✅
- **When**: `setConsent(true, true)` 호출
- **Then**: `localStorage.pipa_consented_at` + `localStorage.overseas_consented_at` 둘 다 ISO timestamp 저장

**Scenario 2: 재방문 시 자동 prefill**
- **Given**: 이전 방문에서 동의한 익명 user (localStorage 에 두 key 존재)
- **When**: `/diagnose` 재진입 시 hook 호출
- **Then**: 두 체크박스 자동 ✅ + "결과 확인" 버튼 enabled

**Scenario 3: SSR 안전 — hydration 전 null**
- **Given**: Next.js 16 App Router 의 Server Component 초기 렌더
- **When**: 본 hook 의 초기 상태
- **Then**: 두 값 모두 null (typeof window 가드)

**Scenario 4: 동의 철회 — GDPR 잊혀질 권리**
- **Given**: 동의 상태 익명 user
- **When**: `revoke()` 호출
- **Then**: localStorage 두 key 모두 제거 + state null 복귀

**Scenario 5: iOS Safari 7일 cookie 한도 우회 (TEST-018 정합)**
- **Given**: iOS Safari ITP 환경 (cookie 7일 후 자동 삭제)
- **When**: 8일 후 재방문
- **Then**: localStorage 값 유지 — 동의 prefill 정상 (cookie 사라져도 OK)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-025**: PIPA §22-6 만 14세 미만 부모 대리 동의 — 익명 user 분기
- **REQ-NF-026**: PIPA §17 국외 이전 동의 — 익명 user 분기
- **횡단 제약**:
  - [x] R7 PIPA 위반: 익명 user 동의 1차 source — FR-C-022 5층 가드의 입력
  - [x] R4 개인정보: localStorage 키는 timestamp 만 — PII 아님
  - [ ] CON-04: 본 hook 자체는 카피 미보유 (FR-C-021 책임)
- **iOS ITP 우회**: localStorage 권위 패턴 (`reference_vercel_hobby_workarounds.md` §8)

## 🏁 Definition of Done
- [x] `useAnonymousConsent` 5 scenario 통과
- [x] `tsc --strict` 0 errors
- [x] SSR hydration 경고 없음 (Next.js 16)
- [x] iOS Safari 8일 후 재방문 시 prefill 검증 (수동 + TEST-018 자동)
- [x] `f9cf258` commit 본문에 REQ-NF-025/026 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-015 (User PIPA 컬럼 — 인증/익명 동일 column 정합)
- **Blocks**: FR-C-021 (PrivacyConsentForm), FR-C-022 (analyzeDiagnosis 5층 가드), TEST-015 (consent-flow E2E 익명 시나리오)
- **Discope 영향**: 해당 없음
