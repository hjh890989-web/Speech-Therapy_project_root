---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Monitoring] MON-004: Uptime/MTTR/RPO/RTO 헬스체크 + 백업 검증"
labels: 'phase:p1, mode:active, domain:mon, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: MON-004
- **Epic / Story**: Foundation 가용성/SLA
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Uptime ≥ 99.9% + MTTR < 2h + RPO < 1h + RTO < 4h 자동 검증. Vercel/Supabase 외부 모니터링 + 정기 백업 복구 훈련.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-NF-007 (Uptime ≥ 99.9%)
  - REQ-NF-008 (MTTR < 2시간)
  - REQ-NF-009 (RPO < 1시간)
  - REQ-NF-010 (RTO < 4시간)
- **Task 강화판**: §3-7 MON-004

## ✅ Task Breakdown
- [ ] **외부 헬스체크 — UptimeRobot Free 또는 BetterStack**:
  - 5분 주기 ping `/api/health`
  - Production 도메인 대상
  - 다운타임 시 Slack + 이메일 알림
- [ ] `app/api/health/route.ts` 작성:
  - DB ping (Supabase 1 row SELECT)
  - Gemini API ping (작은 호출)
  - Storage ping (HEAD 요청)
  - 응답 ≤ 1초 + JSON `{status, services: {db, ai, storage}}`
- [ ] Uptime SLA 추적:
  - 월간 Uptime % 자동 계산 (UptimeRobot 대시보드)
  - 99.9% 미만 시 PostMortem 작성 의무
- [ ] **백업 검증 — RPO/RTO**:
  - Supabase 자동 백업 — 일 1회 (Free) / 시간당 1회 (Pro)
  - 매주 1회 백업 복구 훈련 (수동 또는 자동):
    - 별도 staging 환경에 최신 백업 복원 시도
    - 복구 시간 측정 (RTO < 4h)
- [ ] **MTTR 모니터링**:
  - 인시던트 발생 → 해결 시간 추적 (`incidents` 테이블 또는 Linear/GitHub Issues)
  - 월간 MTTR 평균 계산 + Slack 보고
- [ ] **PostMortem 템플릿** (`docs/postmortem-template.md`):
  - 발생 시각, 영향 범위, 근본 원인, 해결, 재발 방지
- [ ] Status Page (옵션):
  - `/status` 페이지에 현재 서비스 상태 표시
  - 사용자가 신뢰성 확인 가능

## 🧪 Acceptance Criteria
**Scenario 1: 헬스체크 정상 동작 (REQ-NF-007)**
- **Given**: Production 도메인
- **When**: GET /api/health
- **Then**: 200 + `{status: 'healthy', services: {db: 'up', ai: 'up', storage: 'up'}}`

**Scenario 2: 외부 모니터 다운 알림**
- **Given**: 인위적 장애 (Vercel 배포 롤백)
- **When**: UptimeRobot 5분 주기 검사
- **Then**: Slack + 이메일 알림 1건

**Scenario 3: 월간 Uptime 99.9%**
- **Given**: 30일 누적
- **When**: UptimeRobot 통계
- **Then**: ≥ 99.9% (다운 시간 ≤ 43분/월)

**Scenario 4: 백업 복구 RTO < 4h (REQ-NF-010)**
- **Given**: staging 환경
- **When**: 최신 백업 복원
- **Then**: 복원 완료 시간 < 4시간

**Scenario 5: RPO < 1h (REQ-NF-009)**
- **Given**: 백업 시점 - 장애 시점
- **When**: 데이터 손실 측정
- **Then**: < 1시간 분량 (Supabase Pro 시간당 백업)

**Scenario 6: PostMortem 의무**
- **Given**: SLA 위반 발생
- **When**: 사후 검토
- **Then**: postmortem 1건 작성, README에 링크

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-007/008/009/010**: 가용성/SLA 4종
- **횡단 제약**:
  - [ ] 헬스체크 응답 ≤ 1초 (외부 모니터 timeout 보호)
  - [ ] **Supabase Free 한계**: 일 1회 백업만 → RPO < 1h 위해 Pro 필요 시점 명시
- **G2 비용 가드**: UptimeRobot Free 50개 모니터, BetterStack Free 10개

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] /api/health 라우트 활성
- [ ] UptimeRobot 등록 + 1회 알림 검증
- [ ] 백업 복구 훈련 1회 수행 (RTO 측정)
- [ ] PostMortem 템플릿 작성
- [ ] Status Page (옵션) 활성
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-NF-007~010 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-001 (Vercel + Supabase), API-011 (Gemini ping)
- **Blocks**: P1 합격 게이트
- **Discope 영향**: 해당 없음
