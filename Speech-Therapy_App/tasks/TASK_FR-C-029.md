---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-029: F16 Service Worker push subscription 등록 (PWA + iOS Safari)"
labels: 'phase:p1, mode:pending, domain:fr-c, epic:f16, sprint:phase1plus'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-029
- **Epic / Story**: F16 오프라인 일반화 푸시 알림 (Phase 1+)
- **Phase**: 🟡 P1+ (D5 PWA 부활 의존)
- **Mode**: 명세대로
- **Discope 적용**: D5 부활 트리거 — 농촌 사용자 비율 N%+ + iOS Safari + EXP-2 통과 시 활성
- **목적**: 일상 발화 유도 시점 푸시 알림 (예: "저녁 먹을 때 '맛있어요' 한번 말해보세요") — Service Worker 등록 + push subscription (endpoint + p256dh + auth) DB 영속 + iOS Safari 16.4+ 지원 (PWA add-to-home-screen 의존). D5 PWA Descope 부활 후 활성.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1 Epic F16 — 오프라인 일반화 푸시 알림
  - REQ-FUNC-040 (Web Push API + 일 1회 18:00 + 옵트인 only)
  - ADR-10 (D5 PWA 부활 의존성)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-029

## ✅ Task Breakdown
- [ ] `public/sw.js` Service Worker 작성 — `push` event listener + `notificationclick` 핸들러
- [ ] `app/(authed)/settings/notifications/page.tsx` 에 "푸시 알림 받기" 토글 추가
- [ ] `hooks/usePushSubscription.ts` Client Hook:
  - `Notification.requestPermission()` 호출 + `navigator.serviceWorker.register('/sw.js')`
  - `registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY})`
  - subscription → Server Action `subscribe_push` 전달
- [ ] `app/actions/subscribe-push.ts` Server Action:
  - Zod: `{ endpoint: string, keys: { p256dh: string, auth: string } }`
  - `push_subscriptions` DB INSERT (DB-018) + `User.notificationPreference.pushAlert = true` UPDATE
- [ ] iOS Safari 16.4+ 지원 — `'standalone' in navigator` 확인 + add-to-home-screen 안내 모달
- [ ] D5 부활 조건 검증 — `getCurrentPhase()` (ADR-13) 가 'phase1Push' enable 시만 노출
- [ ] PIPA 가드 — 동의 user 만 subscription 허용 (인증 user PIPA)
- [ ] dismissCount 통계 — 알림 dismiss 시 카운트 (3회 이상 dismiss user 는 빈도 감소)

## 🧪 Acceptance Criteria
**Scenario 1: 옵트인 user — subscription 등록 (REQ-FUNC-040)**
- **Given**: 사용자 `/settings/notifications` 에서 토글 ON + 권한 허용
- **When**: `subscribe_push({endpoint, keys})`
- **Then**: push_subscriptions INSERT 1건 + User.notificationPreference.pushAlert = true

**Scenario 2: 일 1회 18:00 발송 (API-020 정합)**
- **Given**: 활성 subscription
- **When**: Cron `/api/push/dispatch` 18:00 실행
- **Then**: Web Push 발송 1건 + lastSentAt UPDATE

**Scenario 3: 옵트인 외 user — 알림 미수신 (REQ-FUNC-040 AC)**
- **Given**: User.notificationPreference.pushAlert = false
- **When**: Cron dispatch 실행
- **Then**: 발송 skip — 0건

**Scenario 4: iOS Safari add-to-home-screen 안내**
- **Given**: iOS Safari + standalone 미상태
- **When**: 토글 ON 시도
- **Then**: "홈 화면에 추가 후 다시 시도" 모달 노출

**Scenario 5: dismissCount 3회 → 빈도 감소**
- **Given**: 사용자가 알림 3회 연속 dismiss
- **When**: Cron dispatch
- **Then**: 본 user 발송 빈도 주 1회 → 월 1회 (정책 적응)

**Scenario 6: D5 PWA 미부활 시 본 task 비활성 (ADR-10)**
- **Given**: `getCurrentPhase()` !== 'phase1Push'
- **When**: `/settings/notifications` 페이지 렌더
- **Then**: 토글 미노출 + 본 hook 미동작

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-040**: Web Push 일 1회 18:00 + 옵트인 only
- **ADR-10**: D5 부활 + 일 활성 1,000명+ 이후 활성
- **횡단 제약**:
  - [x] R7 PIPA 위반: 인증 user PIPA 동의 + notification 옵트인 이중 게이트
  - [x] CON-04: 알림 카피 자체 의료 표현 무위반 ("발음 발달" / "함께 이야기")
  - [x] 정보통신망법 §50: 옵트인 user 만 — §12.8 정합
- **iOS 제약**: Safari 16.4+ + PWA add-to-home-screen 필수 (네이티브 unrestricted push 불가)

## 🏁 Definition of Done
- [ ] Service Worker + subscription hook 6 scenario 통과
- [ ] iOS Safari + Android Chrome 둘 다 검증
- [ ] dismissCount 통계 정상 누적
- [ ] D5 PWA 부활 시만 활성 검증 (ADR-13 phase gate)
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-040 + ADR-10 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-018 (push_subscriptions), API-020 (subscribe_push + dispatch), INFRA-003 (Vercel Cron / 외부 cron), D5 PWA 부활 (외부 의존 — 농촌 비율 + EXP-2 통과)
- **Blocks**: TEST-021 (F16 PWA 푸시 — Cron 발송 + dismissCount 통계)
- **Discope 영향**: D5 부활 의존 — 미부활 시 본 task 보류
