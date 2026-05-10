---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-018: 동의서 발송 + D+3 리마인더 + 7일 만료 처리 (Replace 검토 §2.2)"
labels: 'phase:p2, mode:replace, domain:fr-c, epic:f10'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-018
- **Epic / Story**: F10 학부모 전자서명 / S4
- **Phase**: 🔴 P2
- **Mode**: 🔵 Replace (검토 §2.2 — 카카오 미연동, Resend 이메일 + Vercel Cron)
- **Discope 적용**: 검토 보고서 §2.2 [추가 E2] (모두싸인 미연동, 일반 웹 폼)
- **목적**: 학부모 동의서 라이프사이클 자동화 — Resend 이메일로 서명 링크 발송 + D+3 리마인더 + 7일 만료 + 자동 재발송 옵션. 서명 완료율 ≥ 85% 목표 (REQ-FUNC-060).

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-059 (카카오 전자서명 → 본 태스크는 Resend로 대체)
  - REQ-FUNC-060 (D+3 리마인더, 완료율 ≥ 85%)
  - REQ-FUNC-061 (7일 초과 만료 + 재발송)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-5 FR-C-018 (Replace)
- **검토 보고서**: §2.2 [추가 E2]

## ✅ Task Breakdown
- [ ] **발송 흐름**:
  - FR-C-016 (원아 일괄 등록) 또는 수동 발송 시 트리거
  - DB-010 INSERT → token 생성
  - API-012 Resend 이메일 발송 (기관명·자녀 닉네임·서명 링크 + 7일 만료 안내)
  - lastReminderAt = NOW(), remindersSentCount = 1
- [ ] **D+3 리마인더 Cron** (`/api/cron/consent-reminder/route.ts`):
  - 매일 09:00 KST 실행
  - 조건: status='pending' + lastReminderAt < NOW() - 3 days + remindersSentCount < 3 (총 3회 한도)
  - Resend 이메일 발송: "동의서 서명을 잊지 마세요"
  - remindersSentCount += 1, lastReminderAt = NOW()
- [ ] **7일 만료 처리**:
  - status='expired' 일괄 갱신
  - 원장에게 Slack 알림 ("미서명 N건 만료") — 재발송 결정 보조
- [ ] **재발송**:
  - 원장이 만료된 row에 대해 "재발송" 버튼 클릭
  - 새 token 발급 + DB INSERT (기존 row는 status='expired' 유지)
- [ ] 서명 완료율 측정 KPI:
  - `signed / (pending + signed + expired)` 비율
  - REQ-FUNC-060 ≥ 85% 목표
  - 일별 통계 → admin 대시보드 (FR-Q-009 부분 통합)
- [ ] CRON_SECRET 인증
- [ ] Vercel Analytics 이벤트:
  - `consent_email_sent`
  - `consent_reminder_sent` (level: 1, 2, 3)
  - `consent_signed`
  - `consent_expired`

## 🧪 Acceptance Criteria
**Scenario 1: 동의서 발송 (REQ-FUNC-059)**
- **Given**: 신규 원아 등록 (FR-C-016)
- **When**: 자동 트리거
- **Then**: Resend 이메일 1건 발송, DB-010 row 생성

**Scenario 2: D+3 리마인더 (REQ-FUNC-060)**
- **Given**: pending row + 3일 경과 + remindersSentCount=1
- **When**: Cron
- **Then**: Resend 이메일 1건 + remindersSentCount=2

**Scenario 3: 7일 만료**
- **Given**: pending row + 8일 경과
- **When**: Cron
- **Then**: status='expired', 원장 Slack 알림

**Scenario 4: 완료율 측정 (REQ-FUNC-060 KPI)**
- **Given**: 100건 (signed 90 + expired 10)
- **When**: 측정
- **Then**: 90% (목표 ≥ 85%)

**Scenario 5: 재발송**
- **Given**: 만료된 row
- **When**: 원장이 "재발송" 클릭
- **Then**: 신규 row + 새 token, 이메일 1건 발송

**Scenario 6: 카카오 미연동 (검토 §2.2)**
- **Given**: 코드 검사
- **When**: 카카오 SDK 검색
- **Then**: 의존성 0건

**Scenario 7: 리마인더 3회 한도**
- **Given**: 4회째 발송 시도
- **When**: Cron
- **Then**: 발송 안 됨 (한도 초과)

**Scenario 8: CRON_SECRET 인증**
- **Given**: 외부 호출
- **When**: 헤더 누락
- **Then**: 401

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-059~061**: 라이프사이클
- **검토 §2.2**: 카카오 미연동, Resend 이메일
- **횡단 제약**:
  - [ ] 리마인더 3회 한도 (스팸 방지)
  - [ ] CRON_SECRET 인증
  - [ ] R4 — 이메일 페이로드에 자녀 본명 미포함
- **G2 비용 가드**: Resend Free 100/일 (3,000/월)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Cron 등록 + 1회 실행 검증
- [ ] Resend 이메일 발송 검증 (3종: 발송·리마인더·만료)
- [ ] 완료율 KPI 측정 활성
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-059~061 + 검토 §2.2 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-010 (consent_signatures), API-008 (consent sign), API-012 (Resend), INFRA-002 (Cron 4종), FR-C-016 (트리거)
- **Blocks**: 없음
- **Discope 영향**: 검토 §2.2 — 카카오 미연동, Resend + Vercel Cron으로 대체. 모두싸인 등 솔루션은 B2B 5건 후 도입
