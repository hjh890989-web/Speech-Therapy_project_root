---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[INFRA] INFRA-006: GitHub Actions cron 워크플로 — Vercel Hobby 2 cron 한도 우회 6 cron 이관"
labels: 'phase:p0, mode:active, domain:infra, epic:cron, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: INFRA-006
- **Epic / Story**: Cron 운영 자동화 (V07 신규 — Vercel Hobby 한도 우회)
- **Phase**: 🟢 P0 → ✅ Done (본 sub-session)
- **Mode**: 명세대로 + 🔵 분리 (Vercel 2 + GitHub Actions 6)
- **Discope 적용**: 해당 없음 (Vercel Hobby cron 정책 영구 대응)
- **목적**: Vercel Hobby plan 의 cron 한도 (최대 2개 + daily-only) 를 우회하여 6 cron 을 GitHub Actions 로 이관. `external-crons.yml` 1 워크플로 + Bearer `CRON_SECRET` 검증 + curl -L 패턴. 5/26~5/27 Vercel deploy 차단 사고 (cron 한도 위반) 의 영구 fix.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §7.3 운영 정책 — Vercel Hobby cron 분리 (2 Vercel + 6 GitHub Actions)
  - ADR-05 (Cron 분리 결정)
  - REQ-NF-007 (Uptime ≥ 99.9% — cron 실패 시 Slack alert)
- **Reference 메모리**: `reference_vercel_hobby_workarounds.md` §1, §3
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-A INFRA-006
- **Workflow**: `.github/workflows/external-crons.yml`

## ✅ Task Breakdown
- [x] `.github/workflows/external-crons.yml` 작성 — 6 schedule 정의
  - `hitl-monitor` — daily 자정 KST (48h SLA 검증)
  - `consent-reminder` — daily 09:00 KST (D+3 리마인더)
  - `consent-expire` — daily 03:00 KST (7일 만료 알림)
  - `funnel-alert` — daily 23:00 KST (CVR ±20% 알림)
  - `hitl-escalation` — daily 11:00 KST (24h 초과 자동 배정)
  - `error-monitor` — every 30min (STT 에러율)
- [x] 각 step: `curl -L -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" $URL` 패턴
- [x] `workflow_dispatch` 추가 — 수동 트리거 (디버깅용)
- [x] GitHub repo secrets 등록: `CRON_SECRET` + `VERCEL_PROD_URL`
- [x] curl -L 플래그 적용 — Vercel 엣지 308 redirect chain follow
- [x] Vercel cron 2 슬롯은 `audio-cleanup` + `weekly-reports` 만 잔류 (INFRA-007)

## 🧪 Acceptance Criteria
**Scenario 1: Vercel Hobby cron 한도 위반 회피 (REQ-NF-007)**
- **Given**: 8 cron 필요 + Vercel Hobby 한도 2
- **When**: 본 INFRA-006 적용 후 push
- **Then**: Vercel deploy `success` (이전 5/26 `failure` 패턴 해소)

**Scenario 2: GitHub Actions cron 정상 트리거**
- **Given**: `external-crons.yml` 적용 + repo secrets 설정
- **When**: schedule 트리거 (cron 표현식 매칭)
- **Then**: 6 endpoint 모두 200 응답 + audit_log 기록

**Scenario 3: curl -L 308 follow (메모리 패턴)**
- **Given**: GitHub Actions step 실행
- **When**: `curl -L -H "Authorization: ..." https://...`
- **Then**: 엣지 308 → 최종 200 OK (Next.js 함수 도달)

**Scenario 4: Bearer 검증 실패**
- **Given**: secret 부재 또는 잘못된 토큰
- **When**: cron POST
- **Then**: 401 Unauthorized + Slack alert (MON-005)

**Scenario 5: workflow_dispatch 수동 트리거 (디버깅)**
- **Given**: GitHub Actions UI 의 "Run workflow" 버튼
- **When**: 사용자 클릭
- **Then**: 6 cron 모두 즉시 실행 + 결과 확인 가능

## ⚙️ Technical & Non-Functional Constraints
- **Vercel Hobby**: cron 한도 2개 + daily-only — GitHub Actions 6 이관 필수 영구 정책
- **REQ-NF-007**: Uptime ≥ 99.9% — cron 실패 시 Slack alert (MON-005 연동)
- **횡단 제약**:
  - [x] R4 개인정보: cron 자체는 metadata, 개별 작업이 audit_log 책임
  - [x] CON-03 7일 폐기: audio-cleanup 은 Vercel 측 책임 (INFRA-007)
  - [x] G2 비용: Vercel Hobby 0$ + GitHub Actions 무료 (public repo) / 월 2,000분 (private)
- **메모리 패턴**: `curl -L` 플래그 필수 (Vercel 엣지 308 회피)

## 🏁 Definition of Done
- [x] `external-crons.yml` 6 job 모두 정의 + cron 표현식 정합
- [x] `CRON_SECRET` + `VERCEL_PROD_URL` repo secrets 등록
- [x] 6 endpoint 수동 트리거 검증 (workflow_dispatch) → 모두 200 응답
- [x] Vercel deploy 차단 사고 (`failure`) 해소 — 본 sub-session 이후 정상
- [x] PR 본문에 §7.3 + ADR-05 + REQ-NF-007 매핑
- [x] `reference_vercel_hobby_workarounds.md` §1 패턴 준수

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-001 (Vercel 배포), API-010 (Bearer 패턴 확립), API-017 (cron Route Handler 8종)
- **Blocks**: API-017 (8 cron 운영), MON-005 (PIPA 위반 알림 cron 의존)
- **Discope 영향**: 해당 없음 (Hobby plan 정책 영구 대응)
