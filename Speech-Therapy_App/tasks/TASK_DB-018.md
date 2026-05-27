---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-018: push_subscriptions 테이블 (F16 오프라인 일반화 푸시)"
labels: 'phase:p1, mode:active, domain:db, epic:f16, sprint:p1+'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-018
- **Epic / Story**: F16 오프라인 일반화 푸시 알림 (V07 신규)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로
- **Discope 적용**: D5 PWA 부활 의존 (ADR-10)
- **목적**: Web Push API 구독 정보 저장 — 일상 발화 유도 시점 알림 ("저녁 먹을 때 '맛있어요' 한번 말해보세요"). 옵트인 user 만 발송. D5 PWA Service Worker 부활 후 활성.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1 Epic F16 — 오프라인 일반화 푸시 알림
  - REQ-FUNC-040 (Web Push API + 일 1회 18:00)
  - ADR-10 (D5 PWA Service Worker 부활 조건)
- **Wiki**: `Phase-1-future-tasks-decomposition` §F16

## ✅ Task Breakdown
- [ ] `prisma/schema.prisma` 에 `PushSubscription` model 추가:
  - `userId String` (FK)
  - `endpoint String @unique` (Web Push endpoint URL)
  - `p256dh String` (VAPID public key)
  - `auth String` (VAPID auth secret)
  - `lastSentAt DateTime?`
  - `dismissCount Int @default(0)`
  - `createdAt DateTime @default(now())`
- [ ] `@@index([userId])` + `@@index([lastSentAt])`
- [ ] migration `20260620000000_add_push_subscriptions`
- [ ] `notificationPreference` JSONB (User.notificationPreference) 의 `f16PushEnabled` 옵트인 flag 검증
- [ ] D5 PWA 부활 시점에 활성 (조건: 농촌 사용자 비율 N%+ + iOS Safari 지원 + EXP-2 통과)

## 🧪 Acceptance Criteria
**Scenario 1: 구독 등록 (REQ-FUNC-040)**
- **Given**: 사용자 옵트인 + Service Worker 활성
- **When**: `subscribe_push` Server Action 호출
- **Then**: PushSubscription INSERT (endpoint + p256dh + auth)

**Scenario 2: 일 1회 18:00 발송 Cron**
- **Given**: 활성 구독 1,000건
- **When**: `/api/cron/push-dispatch` 실행 (일 1회 18:00)
- **Then**: 활성 구독 조회 → Web Push 발송 + lastSentAt UPDATE

**Scenario 3: dismissCount 통계**
- **Given**: 사용자 푸시 dismiss
- **When**: 클라이언트 SW → `/api/push/dismiss` POST
- **Then**: dismissCount +1 UPDATE (Phase 2 정책 — N회 dismiss 시 자동 옵트아웃)

**Scenario 4: 옵트아웃 시 endpoint 삭제 (정보통신망법 §50)**
- **Given**: `/settings/notifications` 에서 사용자 토글 OFF
- **When**: `unsubscribe_push` Server Action
- **Then**: PushSubscription DELETE + User.notificationPreference.f16PushEnabled = false

## ⚙️ Technical & Non-Functional Constraints
- **ADR-10**: D5 PWA 부활 조건 — Phase 1+ EXP-2 통과 후
- **정보통신망법 §50**: 영리 광고 사용자 명시 옵트인 필수
- **횡단 제약**:
  - [ ] R4 개인정보: endpoint 는 push gateway URL, PII 아님
  - [ ] G2 비용: Web Push 자체 무료, Vercel Cron Hobby 한도 외 (GitHub Actions cron-job.org 검토)
  - [ ] CON-04: 푸시 메시지 카피 의 금칙어 자동 검증

## 🏁 Definition of Done
- [ ] Prisma migration 성공
- [ ] VAPID public/private key pair 생성 + 환경변수 분리
- [ ] Service Worker `push` 이벤트 수신 검증
- [ ] 옵트인/옵트아웃 흐름 단위 테스트
- [ ] `tsc --strict` 0 errors

## 🚧 Dependencies & Blockers
- **Depends on**: DB-002 (User.notificationPreference), INFRA-003 (PWA + Service Worker, D5 부활)
- **Blocks**: API-020 (subscribe_push), FR-C-029 (Service Worker 등록), TEST-021 (PWA 푸시)
- **Discope 영향**: D5 (PWA 오프라인 보류) 부활 조건 충족 시만 활성. 일 활성 사용자 1,000명+ 검증 필요.
