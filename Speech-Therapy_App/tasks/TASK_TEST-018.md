---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-018: anonymous_user_id cookie + localStorage 권위 + iOS Safari 7일 ITP 우회 + 익명→인증 마이그레이션"
labels: 'phase:p0, mode:active, domain:test, epic:anonymous-id-itp, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-018
- **Epic / Story**: iOS Safari ITP cookie 우회 + 익명→인증 마이그레이션 (Sprint 2 SP2_3+4)
- **Phase**: 🟢 P0 → ✅ Done (Sprint 2 마감)
- **Mode**: 명세대로 + localStorage 권위 패턴
- **Discope 적용**: 해당 없음 (iOS Safari ITP 7일 cookie 한도 정책 영구 대응)
- **목적**: `anonymous_user_id` cookie + localStorage 양쪽 저장 권위 패턴 검증 — iOS Safari ITP 의 7일 first-party cookie 만료 한도 우회. 익명 user 가 7일 후 재방문 시 localStorage 권위로 식별 유지. 익명→인증 user 마이그레이션 시 anonymous_user_id 기반 데이터 (별 누적, evaluation_results) 전부 이관 검증.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.6.4 익명 user identity 관리
  - §12.2 PIPA 익명 user 동의 (localStorage marker)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §3 TEST-018
- **Reference 메모리**: `reference_vercel_hobby_workarounds.md` §8 iOS ITP cookie + localStorage 권위 패턴
- **Sprint 2 SP2_3+4**: 별 누적 fix + localStorage 권위

## ✅ Task Breakdown
- [x] `e2e/anonymous-identity.spec.ts` 작성:
  - test 1 — 익명 user 진입 시 cookie + localStorage 양쪽에 anonymous_user_id 저장 검증
  - test 2 — cookie 삭제 시뮬 후 재방문 → localStorage 권위로 동일 ID 복원 검증
  - test 3 — 별 누적 — 익명 user 진단 5건 → 별 5개 localStorage + DB 누적 정합
  - test 4 — 익명→인증 마이그레이션 — Magic Link 로그인 후 anonymous_user_id → user.id 이관 검증
  - test 5 — 마이그레이션 후 별 누적 보존 (evaluation_results.anonymousUserId → user.id update)
- [x] `lib/identity/anonymous-id.ts` helper 단위 테스트:
  - `getOrCreateAnonymousId()` — cookie 미존재 시 localStorage 조회, 둘 다 없으면 생성
  - 7일 cookie 만료 후 localStorage 권위 우선 검증
- [x] iOS Safari (chromium-mobile Pixel 5 with WebKit 시뮬) 환경 검증 — Playwright project
- [x] 익명→인증 마이그레이션 — `app/auth/callback/route.ts` 의 익명 ID 통합 로직
- [x] Sprint 2 SP2_4 별 누적 fix evidence — localStorage 우선 + DB 사후 sync 패턴

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: cookie + localStorage 양쪽 저장 (Sprint 2 SP2_3)**
- **Given**: 익명 user 첫 방문
- **When**: getOrCreateAnonymousId() 호출
- **Then**: cookie `anonymous_user_id=uuid-X` 설정 + localStorage `anonymous_user_id=uuid-X` 설정

**Scenario 2: iOS Safari 7일 ITP 우회 — localStorage 권위**
- **Given**: cookie 7일 후 만료 (iOS Safari ITP), localStorage 유지
- **When**: 재방문 시 getOrCreateAnonymousId()
- **Then**: localStorage 값 우선 사용 → cookie 재생성 (동일 ID 유지)

**Scenario 3: 양쪽 모두 삭제 시 신규 생성**
- **Given**: cookie + localStorage 양쪽 삭제 (브라우저 정리)
- **When**: 재방문
- **Then**: 새 UUID 생성 + 양쪽 저장 (기존 데이터 분리됨, expected behavior)

**Scenario 4: 별 누적 fix (Sprint 2 SP2_4)**
- **Given**: 익명 user 진단 5건 완료
- **When**: 별 누적 UI 확인
- **Then**: localStorage stars=5 + DB rewardLog count=5 정합

**Scenario 5: 익명→인증 마이그레이션**
- **Given**: 익명 user (uuid-X) 가 별 5개 + evaluation_results 3건 보유, Magic Link 로그인
- **When**: `/auth/callback` 처리
- **Then**: evaluation_results.anonymousUserId='uuid-X' → user.id='u1' UPDATE, rewardLog 동일 마이그레이션, localStorage anonymous_user_id 삭제

**Scenario 6: 마이그레이션 멱등성**
- **Given**: 이미 마이그레이션된 user
- **When**: 같은 anonymous_user_id 로 재시도
- **Then**: 중복 마이그레이션 0건 (UNIQUE constraint or idempotency check)

**Scenario 7: PIPA 익명 동의 marker 검증 (§12.2)**
- **Given**: 익명 user 동의 후
- **When**: localStorage 조회
- **Then**: `pipa_consented_at` + `overseas_consented_at` timestamp 저장

## ⚙️ Technical & Non-Functional Constraints
- **iOS Safari ITP**: first-party cookie 7일 만료 정책 (reference 메모리 §8)
- **횡단 제약**:
  - [x] **R4**: anonymous_user_id 는 UUID, 개인정보 0건
  - [x] **CON-04**: 의료 금칙어 0건
  - [x] **Disclaimer**: 익명 user 도 MedicalDisclaimerFooter 노출 (FR-C-026 책임)
  - [x] **G2**: 무료 한도 내
- **§12.2 PIPA**: 익명 user 동의 marker 정합

## 🏁 Definition of Done
- [x] 7 시나리오 e2e/anonymous-identity.spec.ts PASS
- [x] `lib/identity/anonymous-id.ts` helper 단위 테스트 PASS
- [x] iOS Safari (Pixel 5 + WebKit) 환경 검증
- [x] 익명→인증 마이그레이션 idempotency 검증
- [x] Sprint 2 SP2_4 별 누적 fix evidence (commit 매핑)
- [x] `tsc --strict` 0 errors
- [x] PR 본문에 Sprint 2 SP2_3+4 + §12.2 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-020 (useAnonymousConsent hook), Sprint 2 SP2_3 (cookie+localStorage 권위), SP2_4 (별 누적 fix), DB-002 (User), DB-005 (EvaluationResult), API-016 (Auth callback)
- **Blocks**: (없음) — Sprint 2 의 ✅ Done evidence
- **Discope 영향**: 해당 없음 (iOS Safari ITP 영구 대응)
