---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Server Action + Route Handler] API-020: F16 push (subscribe_push + /api/push/dispatch)"
labels: 'phase:p1, mode:active, domain:api, epic:f16, sprint:p1+'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-020
- **Epic / Story**: F16 오프라인 일반화 푸시 알림 (V07 신규)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로
- **Discope 적용**: D5 PWA Service Worker 부활 의존
- **목적**: Web Push API 구독 등록 + 일 1회 18:00 발송 Cron. 옵트인 user 만.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1 Epic F16
  - REQ-FUNC-040 (Web Push 일 1회 18:00)
  - ADR-10 (D5 부활 조건)
  - 정보통신망법 §50 (영리 광고 옵트인)

## ✅ Task Breakdown
- [ ] `app/actions/subscribe-push.ts` Server Action:
  - Web Push subscription 객체 입력 (endpoint + p256dh + auth)
  - PushSubscription INSERT (DB-018) + User.notificationPreference.f16PushEnabled = true
- [ ] `/api/push/dispatch/route.ts` Route Handler (Cron 일 1회 18:00):
  - 활성 PushSubscription 조회 → `web-push` lib 으로 Web Push 발송
  - lastSentAt UPDATE
  - dismissCount ≥ 5 의 자동 옵트아웃 정책 (Phase 2)
- [ ] `app/actions/unsubscribe-push.ts` Server Action:
  - PushSubscription DELETE + notificationPreference 토글
- [ ] `lib/web-push/client.ts` — VAPID key 환경변수 + `web-push` lib wrapper
- [ ] Service Worker `push` 이벤트 핸들러 (FR-C-029 책임)
- [ ] 외부 Cron 서비스 검토 (Vercel Hobby 2개 한도 도달 시 cron-job.org)

## 🧪 Acceptance Criteria
**Scenario 1: 푸시 구독 (REQ-FUNC-040)**
- **Given**: 사용자 옵트인 + Service Worker 등록
- **When**: subscribe_push(subscription)
- **Then**: PushSubscription INSERT + notificationPreference 갱신

**Scenario 2: 일 1회 18:00 발송**
- **Given**: 활성 구독 1,000건
- **When**: Cron 실행
- **Then**: web-push 발송 + lastSentAt UPDATE

**Scenario 3: 옵트아웃 (정보통신망법 §50)**
- **Given**: `/settings/notifications` 토글 OFF
- **When**: unsubscribe_push
- **Then**: PushSubscription DELETE + 즉시 발송 중단

**Scenario 4: dismissCount 자동 옵트아웃 (Phase 2)**
- **Given**: dismissCount = 5
- **When**: Cron 발송 직전 검증
- **Then**: notificationPreference.f16PushEnabled = false UPDATE + 본 user skip

**Scenario 5: ADR-10 부활 조건**
- **Given**: 일 활성 사용자 < 1,000명
- **When**: API-020 활성화 시도
- **Then**: feature flag 비활성 — D5 부활 조건 미충족

## ⚙️ Technical & Non-Functional Constraints
- **ADR-10**: D5 PWA 부활 조건 충족 시만 활성
- **정보통신망법 §50**: 명시 옵트인 필수 — User.notificationPreference 토글
- **횡단 제약**:
  - [ ] R4 개인정보: endpoint 는 PII 아님
  - [ ] G2 비용: web-push 무료, Cron 외부 검토
  - [ ] CON-04: 푸시 카피 검증

## 🏁 Definition of Done
- [ ] VAPID key pair 생성 + env 등록
- [ ] subscribe_push + dispatch + unsubscribe 정상 동작
- [ ] 옵트아웃 즉시 반영
- [ ] `tsc --strict` 0 errors

## 🚧 Dependencies & Blockers
- **Depends on**: DB-018 (push_subscriptions), DB-002 (User.notificationPreference), INFRA-003 (PWA — D5 부활), API-017 (Cron)
- **Blocks**: FR-C-029 (Service Worker push 이벤트), TEST-021
- **Discope 영향**: D5 PWA 부활 조건 (농촌 비율 + iOS Safari + EXP-2 통과) 충족 시만 활성
