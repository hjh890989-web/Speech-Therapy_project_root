---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Ops] OPS-001: CS 4시간 응답 + HITL 48h SLA + 어드민 운영 워크플로 (D4)"
labels: 'phase:p1, mode:active, domain:ops, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: OPS-001
- **Epic / Story**: Foundation 운영 / 고객 지원
- **Phase**: 🟡 P1
- **Mode**: 명세대로 (D4 적용으로 Supabase Studio 1차 도구)
- **Discope 적용**: D4 (어드민 페이지 미구축 → Studio + Slack 운영)
- **목적**: CS 최초 응답 ≤ 4h + HITL 피드백 ≤ 48h SLA 자동화 + 1인 운영자가 실수 없이 따라할 수 있는 어드민 운영 워크플로 정립. D4 적용으로 Supabase Studio + Slack을 1차 도구로 채택.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-NF-011 (CS 최초 응답 ≤ 4시간)
  - REQ-NF-012 (HITL 피드백 ≤ 48시간)
- **Task 강화판**: §3-7 OPS-001
- **검토 보고서**: §1.2 [추가 D4]

## ✅ Task Breakdown
- [ ] CS 채널 셋업:
  - Resend 또는 Sendgrid Free로 `support@yourdomain` 이메일 자동 회신:
    - "4시간 내 답변드리겠습니다" + 영업 시간 안내
  - 카카오 채널/디스코드 (옵션) — D4 정신에 부합 시 단순 채택
- [ ] 어드민 운영 가이드 (`docs/admin-operations.md`):
  - 1. **HITL 검토 워크플로**:
     - Slack 알림 수신 → Supabase Studio 진입 → SQL UPDATE → 부모 알림 발송 (FR-Q-008·FR-C-013과 통합)
  - 2. **CS 응답 워크플로**:
     - 사용자 문의 이메일 수신 → 검토 → 4시간 내 답변
     - 자주 묻는 질문 템플릿 (`docs/cs-templates.md`)
  - 3. **이슈 트래킹**:
     - GitHub Issues 또는 Linear Free
     - 우선순위 라벨 (P0/P1/P2)
  - 4. **신규 기능 안내**:
     - 메일링 리스트 또는 인앱 알림 (P1 후반 도입 검토)
- [ ] SLA 자동 추적:
  - CS — Resend webhook 또는 수동 입력으로 응답 시간 기록
  - HITL — DB-009의 createdAt → completedAt 차이로 자동 측정 (FR-C-013 통합)
- [ ] 주간 SLA 보고서:
  - 매주 월요일 Slack에 자동 보고
  - CS 평균 응답 시간 + HITL 평균 검토 시간 + SLA 위반 건수
- [ ] 1인 운영 백업 계획:
  - 부재 시 자동 응답 메시지
  - 마스터 재활사가 임시 admin 권한 부여 (RBAC)
  - 비상 연락처 README
- [ ] **D4 적용 명시 — Studio + Slack 1차**:
  - 어드민 페이지 도입은 P1 후반 EXP-2 통과 시
  - 본 태스크는 운영 매뉴얼 위주

## 🧪 Acceptance Criteria
**Scenario 1: CS 자동 회신 (REQ-NF-011)**
- **Given**: 사용자가 support@ 이메일 발송
- **When**: 5분 내
- **Then**: 자동 회신 1건 (4시간 약속)

**Scenario 2: HITL 평균 < 48h (REQ-NF-012)**
- **Given**: 1주간 HITL 큐 처리 50건
- **When**: SLA 측정
- **Then**: 평균 < 48시간, 위반 건수 < 5%

**Scenario 3: Studio 운영 워크플로**
- **Given**: 신규 전문가 온보딩
- **When**: docs/admin-operations.md 따라 검토
- **Then**: 5분 이내 Studio에서 큐 조회 + UPDATE 가능

**Scenario 4: 주간 SLA 보고서**
- **Given**: 매주 월요일
- **When**: 자동 Cron
- **Then**: Slack 보고서 1건 (CS + HITL 평균 + 위반 건수)

**Scenario 5: 부재 시 백업**
- **Given**: 운영자 휴가 1일
- **When**: 사용자 문의
- **Then**: 자동 응답 + 마스터 재활사 임시 admin 활성

**Scenario 6: SLA 위반 트래킹**
- **Given**: 5건 SLA 위반
- **When**: 주간 보고
- **Then**: admin Slack Critical 알림 + 원인 분석 의무

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-011/012**: CS 4h + HITL 48h
- **D4 적용**: Studio + Slack 1차, 어드민 페이지 P1 후반
- **횡단 제약**:
  - [ ] R3 — 1인 운영 부담 최소화 (D4 정신)
  - [ ] R4 — CS 답변 시 자녀 식별 정보 미요청·미저장
- **G2 비용 가드**: Resend Free 100/일, 이메일 비용 0

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] CS 자동 회신 1회 검증
- [ ] 어드민 운영 가이드 + 영상 매뉴얼 (Loom 권장)
- [ ] 주간 SLA 보고서 1회 자동 발송
- [ ] 1인 운영 백업 계획 README
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-NF-011/012 + D4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-008 (admin placeholder), FR-C-013 (HITL UPDATE), INFRA-002 (Cron), DB-009
- **Blocks**: P1 합격 게이트 (운영 안정성)
- **Discope 영향**: D4 — Studio + Slack 운영. 어드민 페이지 P1 후반
