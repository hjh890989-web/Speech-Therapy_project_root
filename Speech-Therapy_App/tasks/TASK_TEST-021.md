---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-021: F16 D5 PWA Service Worker 푸시 구독 + Cron 일 1회 18:00 발송 + dismissCount 통계"
labels: 'phase:p1, mode:active, domain:test, epic:f16-push, sprint:p1-plus'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-021
- **Epic / Story**: F16 PWA Web Push 알림 (V07 신규 — D5 부활 의존)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로 + D5 부활 트리거 (일 활성 1,000명+ 이후)
- **Discope 적용**: D5 부활 의존 (Phase 0 에는 ADR-10 별 D5 적용 보류, Phase 1+ 부활)
- **목적**: F16 일상 발화 유도 알림 ("저녁 먹을 때 '맛있어요' 한번 말해보세요") 의 PWA Service Worker push subscription + Cron 일 1회 18:00 발송 + dismissCount 통계 검증. iOS Safari 16.4+ 지원 (옵트인 user 만). FR-C-029 의 ✅ Done evidence.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 F16 (PWA 푸시 알림)
  - REQ-FUNC-040 (Web Push API + 일 1회 18:00 발송 + 옵트인)
  - ADR-10 (PWA 푸시 — D5 부활 의존)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §3 TEST-021
- **선행 구현**: FR-C-029 (Service Worker), DB-018 (push_subscriptions), API-020 (`/api/push/dispatch`)

## ✅ Task Breakdown
- [ ] `__tests__/integration/f16-push-subscription.test.ts`:
  - test 1 — `subscribe_push` Server Action 호출 → push_subscriptions INSERT (endpoint/p256dh/auth)
  - test 2 — 중복 구독 멱등성 — 동일 endpoint 재INSERT 차단 (UNIQUE)
  - test 3 — Cron `/api/push/dispatch` 일 1회 18:00 실행 → 옵트인 user 만 발송
  - test 4 — 옵트아웃 user (notificationPreference=false) → 발송 0건
  - test 5 — dismissCount UPDATE — 사용자가 dismiss 시 +1
- [ ] e2e — `/chat` 또는 `/missions` 페이지에서 Service Worker 등록 + 구독 prompt → 허용 → DB INSERT 검증
- [ ] iOS Safari 16.4+ 시뮬 (Pixel 5 + WebKit) — push 구독 정상 동작 검증
- [ ] Cron 단위 테스트 — `/api/push/dispatch` 단독 호출 시 옵트인 user 만 fetch + payload 정합
- [ ] dismissCount 통계 — 30일 누적 dismissCount > 5 인 user 자동 옵트아웃 정책 검증

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: Service Worker 구독 등록 (REQ-FUNC-040)**
- **Given**: user 가 `/missions` 진입 + 알림 권한 허용
- **When**: subscribe_push Server Action
- **Then**: push_subscriptions INSERT 1건 (endpoint/p256dh/auth/userId)

**Scenario 2: 일 1회 18:00 발송 (Cron + 옵트인)**
- **Given**: 옵트인 user 10명, 시각 18:00 KST
- **When**: Cron `/api/push/dispatch` 실행
- **Then**: 10건 web-push 발송, payload `{title, body, icon}` 정합

**Scenario 3: 옵트아웃 user 발송 0건**
- **Given**: user.notificationPreference=false
- **When**: Cron 실행
- **Then**: 해당 user fetch skip, 발송 0건

**Scenario 4: 중복 구독 멱등성**
- **Given**: 기존 push_subscriptions row, 동일 endpoint
- **When**: subscribe_push 재호출
- **Then**: INSERT skip (UPDATE only — lastSentAt 갱신), UNIQUE constraint 위반 없음

**Scenario 5: dismissCount 통계**
- **Given**: user 가 알림 5회 dismiss
- **When**: 각 dismiss 시 Server Action call
- **Then**: push_subscriptions.dismissCount = 5 누적

**Scenario 6: 자동 옵트아웃 (30일 dismissCount > 5)**
- **Given**: 30일 누적 dismissCount=6 user
- **When**: Cron 발송 시도
- **Then**: 발송 skip + notificationPreference 자동 false 갱신 + audit_log 추적

**Scenario 7: iOS Safari 16.4+ 호환**
- **Given**: iOS Safari 16.4+ device (PWA 설치)
- **When**: 구독 prompt
- **Then**: 허용 후 endpoint 정상 발급 + DB INSERT

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-040**: Web Push + 일 1회 18:00 + 옵트인
- **ADR-10**: PWA 푸시 정책 (D5 부활 의존, Phase 1+)
- **횡단 제약**:
  - [ ] **R4**: push payload 에 자녀 식별 정보 0건 (generic 메시지)
  - [ ] **CON-04**: payload 본문에 의료 금칙어 0건
  - [ ] **Disclaimer**: push 자체에 disclaimer 미포함 (PWA 알림 한계), `/missions` 페이지 disclaimer 노출
  - [ ] **G2 비용**: web-push 라이브러리 무료, Vercel/GHA Cron 0$
- **D5 부활 트리거**: 일 활성 1,000명+ 이후 — 이전엔 Cron skip

## 🏁 Definition of Done
- [ ] 7 시나리오 통합 + e2e 테스트 PASS
- [ ] iOS Safari 16.4+ 호환성 검증
- [ ] Cron `/api/push/dispatch` 일 1회 18:00 스케줄 등록 + 동작 검증
- [ ] dismissCount 자동 옵트아웃 정책 검증
- [ ] UNIQUE constraint 멱등성 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-040 + ADR-10 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-029 (Service Worker push), DB-018 (push_subscriptions), API-020 (`/api/push/dispatch`), INFRA-003 (PWA manifest)
- **Blocks**: F16 정식 활성 (D5 부활 후)
- **Discope 영향**: D5 부활 의존 — Phase 1+ + DAU 1,000명+ 트리거
