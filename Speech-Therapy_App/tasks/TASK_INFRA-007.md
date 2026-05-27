---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[INFRA] INFRA-007: Vercel Hobby 2 cron (audio-cleanup + weekly-reports) + Bearer + curl -L"
labels: 'phase:p0, mode:active, domain:infra, epic:cron, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: INFRA-007
- **Epic / Story**: Cron 운영 자동화 (V07 신규 — Vercel Hobby 2 슬롯 활용)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Vercel Hobby 의 잔여 2 cron 슬롯에 `audio-cleanup` (CON-03 7일 폐기 책임) 과 `weekly-reports` (W-AUR 리텐션 KPI) 배치. Bearer `CRON_SECRET` 검증 + curl -L 패턴. INFRA-006 (GitHub Actions 6) 과 짝.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §7.3 운영 정책 — Vercel Hobby 2 cron + GitHub Actions 6
  - REQ-FUNC-005 + ADR-03 (음성 7일 폐기)
  - REQ-FUNC-027 (W-AUR 주간 리포트)
- **Reference 메모리**: `reference_vercel_hobby_workarounds.md` §1, §3
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-A INFRA-007
- **vercel.json**: crons 배열 2 entry

## ✅ Task Breakdown
- [x] `vercel.json` 의 `crons` 배열에 2 entry 추가:
  - `{ "path": "/api/cron/audio-cleanup", "schedule": "0 3 * * *" }` (daily 03:00 KST)
  - `{ "path": "/api/cron/weekly-reports", "schedule": "0 10 * * 0" }` (일요일 10:00 KST)
- [x] `lib/cron/verify-bearer.ts` 공통 helper — `Authorization: Bearer <CRON_SECRET>` 검증
- [x] `app/api/cron/audio-cleanup/route.ts` — Supabase Storage DELETE + audit_log
- [x] `app/api/cron/weekly-reports/route.ts` — WeeklyReport INSERT batch + Resend 발송
- [x] `CRON_SECRET` 환경변수 Vercel 등록 (Production + Preview)
- [x] daily-only 정책 준수 — Hobby 한도 (24h+ 간격) 위반 없음

## 🧪 Acceptance Criteria
**Scenario 1: audio-cleanup (REQ-FUNC-005 + ADR-03)**
- **Given**: SessionLog.audioVectorUri 의 음성 ≥ 7일 old
- **When**: 일 1회 03:00 KST Vercel Cron 트리거
- **Then**: Supabase Storage DELETE + audit_log INSERT
- **Note**: Sprint 1 정책은 음성 미저장 → 사실상 no-op (방어적 cron)

**Scenario 2: weekly-reports (REQ-FUNC-027)**
- **Given**: 활성 user N명 (옵트인 알림)
- **When**: 일요일 10:00 KST Vercel Cron
- **Then**: WeeklyReport INSERT batch + Resend 이메일 발송

**Scenario 3: Bearer 검증 (REQ-NF-019)**
- **Given**: 외부 호출자 (Bearer 없음)
- **When**: `POST /api/cron/audio-cleanup`
- **Then**: 401 Unauthorized

**Scenario 4: curl -L 308 follow**
- **Given**: 외부 ping (예: 모니터링)
- **When**: `curl -L -H "Authorization: Bearer $CRON_SECRET" $URL`
- **Then**: Vercel 엣지 308 → 최종 200 OK

**Scenario 5: Hobby 한도 준수**
- **Given**: vercel.json crons 배열 길이 = 2 + 모든 schedule daily 이상
- **When**: `vercel deploy --prod`
- **Then**: deploy success (한도 위반 시 즉시 실패)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-007**: Uptime ≥ 99.9% — Cron 실패 시 Slack alert
- **Vercel Hobby 한도**: 2 cron 슬롯 + daily-only (24h+ 간격)
- **횡단 제약**:
  - [x] CON-03 7일 폐기: audio-cleanup 의 핵심 책임
  - [x] R4 개인정보: 폐기 자체가 R4 완화 메커니즘
  - [x] G2 비용: Vercel Hobby 0$ 유지
- **Bearer 패턴**: `verify-bearer.ts` 공통 helper 재사용 (API-017 6 cron 동일)

## 🏁 Definition of Done
- [x] `vercel.json` crons 2 entry 정상 배포
- [x] 2 endpoint 수동 호출 검증 (`curl -L`) → 200 응답
- [x] `CRON_SECRET` Vercel env 등록 + GitHub Actions secrets 동기화 (INFRA-006 공유)
- [x] `lib/cron/verify-bearer.ts` 단위 테스트 통과
- [x] `tsc --strict` 0 errors
- [x] PR 본문에 REQ-FUNC-005/027 + REQ-NF-007 + ADR-03 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-001 (Vercel 배포), API-010 (Bearer 패턴), DB-001 (Supabase)
- **Blocks**: API-017 (8 cron 통합 운영), FR-C-004 (7일 폐기 정책), FR-C-010 (주간 리포트)
- **Discope 영향**: 해당 없음
