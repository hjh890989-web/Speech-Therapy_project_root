---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[INFRA] INFRA-002: Vercel Cron Jobs 4종 등록 + 모니터링 (D6 단순화)"
labels: 'phase:p1, mode:active, domain:infra, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: INFRA-002
- **Epic / Story**: Foundation 인프라 / 운영 자동화
- **Phase**: 🟡 P1
- **Mode**: 단순화 (D6 적용 — 음성 7일 폐기 Cron은 No-op로 등록)
- **Discope 적용**: D6 (음성 미저장 정책)
- **목적**: SRS의 4종 Cron(주간 리포트, 7일 폐기, 24h HITL 에스컬레이션, D+3 동의서 리마인더)을 Vercel Cron Jobs로 등록·모니터링. 1주 발견된 실패 즉시 Slack Alert.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-005 (음성 7일 폐기 Cron)
  - REQ-FUNC-027 (주간 리포트 Cron)
  - REQ-FUNC-033 (HITL 24h 자동 에스컬레이션)
  - REQ-FUNC-060 (서명 D+3 리마인더)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-7 INFRA-002 (단순화)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §3.2 [비용 함정 2 — Cron 한도]

## ✅ Task Breakdown
- [ ] `vercel.json` 4개 Cron 등록:
  ```json
  {
    "crons": [
      {"path": "/api/cron/weekly-reports", "schedule": "0 3 * * 0"},
      {"path": "/api/cron/audio-cleanup", "schedule": "0 3 * * 0"},
      {"path": "/api/cron/hitl-monitor", "schedule": "0 * * * *"},
      {"path": "/api/cron/consent-reminder", "schedule": "0 9 * * *"}
    ]
  }
  ```
- [ ] 각 Cron Route Handler:
  - 1: `/api/cron/weekly-reports` — FR-C-010 책임
  - 2: `/api/cron/audio-cleanup` — FR-C-004 (Sprint 1엔 No-op, P2 활성)
  - 3: `/api/cron/hitl-monitor` — FR-C-014 (1시간 주기)
  - 4: `/api/cron/consent-reminder` — FR-C-018 (P2)
- [ ] 공통 헬퍼 `lib/cron-auth.ts`:
  - `verifyCronSecret(request)` — `Authorization: Bearer ${CRON_SECRET}` 검증
  - 외부 호출 차단
- [ ] 실행 모니터링:
  - 각 Cron 시작/종료 시 `cron_executions` 테이블 INSERT (옵션) 또는 Vercel Logs 활용
  - 결과 JSON에 `successCount, failureCount, durationMs` 포함
- [ ] 실패 알림:
  - 5건 이상 실패 시 Slack Alert
  - 1주 연속 실패 시 admin 채널 Critical Alert
- [ ] **Vercel Pro Plan 필요** — Hobby는 1개 한도 (검토 보고서 §3.2 [비용 함정 2])
- [ ] CRON_SECRET 환경 변수 등록 (INFRA-001 통합)

## 🧪 Acceptance Criteria
**Scenario 1: 4개 Cron 모두 활성화**
- **Given**: vercel.json 등록 + Vercel Pro
- **When**: Vercel Dashboard 확인
- **Then**: 4개 Cron 활성, 다음 실행 시각 표시

**Scenario 2: CRON_SECRET 인증**
- **Given**: 외부 호출 (헤더 없음)
- **When**: GET 시도
- **Then**: 401 Unauthorized

**Scenario 3: 정상 실행 1회**
- **Given**: 수동 트리거 (Vercel Dashboard 또는 curl + CRON_SECRET)
- **When**: 각 Cron 호출
- **Then**: 200 OK + 결과 JSON

**Scenario 4: 실패 시 Slack Alert**
- **Given**: Cron 내부 5건 실패
- **When**: 실행 종료
- **Then**: Slack 알림 1건 발송

**Scenario 5: D6 — 음성 폐기 No-op**
- **Given**: Sprint 1엔 음성 미저장
- **When**: audio-cleanup Cron 실행
- **Then**: deletedCount: 0, 정상 종료

**Scenario 6: Pro Plan 검증**
- **Given**: Vercel Hobby에서 시도
- **When**: 4개 Cron 등록
- **Then**: 1개만 활성 (Hobby 한도) → Pro 전환 필요 메시지

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-005/027/033/060**: 4종 Cron 동작
- **C-TEC-007**: Vercel Cron 사용
- **횡단 제약**:
  - [ ] CRON_SECRET 인증 — 외부 차단
  - [ ] **검토 보고서 §3.2 [비용 함정 2]** — Vercel Pro 필수 명시
  - [ ] 실패 격리 + 재시도 (Cron 자체는 재시도 안 됨, 다음 주기 대기)
- **G2 비용 가드**: Vercel Function 호출 비용 모니터링

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 4개 Cron 모두 Vercel Production 등록
- [ ] CRON_SECRET 환경 변수 등록
- [ ] 1회 수동 실행 검증 (각 Cron)
- [ ] Slack Alert 1회 발송 검증
- [ ] `tsc --strict` 0 errors
- [ ] D6 적용 사유 README 명시
- [ ] PR 본문에 REQ-FUNC-005/027/033/060 + D6 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-001 (Vercel Pro), FR-C-004/010/014/018 (Cron 핸들러 구현)
- **Blocks**: 모든 Cron 의존 기능 (주간 리포트, HITL 모니터링 등)
- **Discope 영향**: D6 — audio-cleanup Cron은 Sprint 1엔 No-op (음성 미저장)
