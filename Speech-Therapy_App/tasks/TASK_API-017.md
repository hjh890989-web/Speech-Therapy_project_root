---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Route Handler] API-017: Cron 8종 묶음 (Vercel Hobby 2 + GitHub Actions 6 이관)"
labels: 'phase:p0, mode:active, domain:api, epic:cron, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-017
- **Epic / Story**: Cron 운영 자동화 (V07 신규 — Vercel Hobby 한도 우회)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로 + 🔵 분리 (Vercel 2 + GitHub Actions 6)
- **Discope 적용**: 해당 없음 (Vercel Hobby cron 한도 정책 대응)
- **목적**: 8 Cron Route Handler — 운영 자동화 (음성 폐기 / 주간 리포트 / HITL 모니터 / 동의 리마인더 / 동의 만료 / 퍼널 alert / HITL 에스컬레이션 / error monitor). Bearer `CRON_SECRET` 검증 + curl -L 패턴.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.5.2 Route Handlers — `/api/cron/*` 8종
  - §7.3 운영 정책 — Vercel Hobby cron 분리 (2 + 외부 6)
- **Reference 메모리**: `reference_vercel_hobby_workarounds.md` — Hobby cron 한도 + curl -L 패턴

## ✅ Task Breakdown
- [x] **Vercel Hobby 2 cron** (vercel.json 의 crons 배열):
  - `/api/cron/audio-cleanup` (일 1회 03:00) — REQ-FUNC-005 + ADR-03 (7일 폐기)
  - `/api/cron/weekly-reports` (주 일요일 10:00) — REQ-FUNC-027
- [x] **GitHub Actions 6 cron** (`.github/workflows/external-crons.yml`):
  - hitl-monitor (24h SLA 검증) / consent-reminder (D+3 리마인더)
  - consent-expire (7일 만료 알림) / funnel-alert (CVR ±20%)
  - hitl-escalation (24h 초과 자동 배정) / error-monitor (STT 에러율)
  - 매 cron 은 `curl -L -H "Authorization: Bearer $CRON_SECRET" $URL`
- [x] `app/api/cron/[name]/route.ts` 패턴 — Bearer 검증 + 실 로직 + JSON 응답
- [x] `lib/cron/verify-bearer.ts` 공통 helper
- [x] `CRON_SECRET` env 등록 (Vercel + GitHub Actions Secrets)

## 🧪 Acceptance Criteria
**Scenario 1: audio-cleanup (REQ-FUNC-005 + ADR-03)**
- **Given**: SessionLog.audioVectorUri 의 음성 파일 ≥ 7일 old
- **When**: 일 1회 03:00 Cron 실행
- **Then**: Supabase Storage DELETE + audit_log 추적 (D6 적용 시 Sprint 1 단순화: 음성 미저장 → no-op)

**Scenario 2: weekly-reports (REQ-FUNC-027)**
- **Given**: 활성 user N명
- **When**: 일요일 10:00 Cron
- **Then**: WeeklyReport INSERT batch + Resend 이메일 발송 (옵트인만)

**Scenario 3: Bearer 검증 (REQ-NF-019)**
- **Given**: 외부 호출자 Bearer 없음
- **When**: cron URL POST
- **Then**: 401 Unauthorized

**Scenario 4: curl -L (메모리 패턴)**
- **Given**: GitHub Actions cron 실행
- **When**: `curl -L -H "Authorization: ..." https://...`
- **Then**: Vercel redirect 302 follow → 정상 200 응답

**Scenario 5: 6 GitHub Actions cron 정상 실행**
- **Given**: external-crons.yml 6 schedule
- **When**: 자동 트리거 (cron 표현식)
- **Then**: 각 endpoint 200 응답 + audit_log 기록

## ⚙️ Technical & Non-Functional Constraints
- **Vercel Hobby**: cron 한도 2개 + daily-only — GitHub Actions 6 이관 필수
- **REQ-NF-007**: Uptime ≥ 99.9% — Cron 실패 시 Slack alert (MON-005)
- **횡단 제약**:
  - [x] R4 개인정보: cron 자체는 metadata, 개별 작업이 audit
  - [x] CON-03 7일 폐기: audio-cleanup 책임
  - [x] G2 비용: Vercel Hobby 0$ 유지

## 🏁 Definition of Done
- [x] 8 cron 모두 Bearer 검증 통과
- [x] 6 GitHub Actions workflow 정상 실행 (수동 트리거 검증)
- [x] curl -L 패턴 적용
- [x] CRON_SECRET env 등록 (Vercel + GHA)
- [x] `tsc --strict` 0 errors
- [x] INFRA-006 (GHA cron 이관) + INFRA-007 (Vercel Hobby 2) 통합

## 🚧 Dependencies & Blockers
- **Depends on**: API-010 (Auth 의 Bearer 패턴), INFRA-001 (Vercel), INFRA-006 (GHA cron)
- **Blocks**: FR-C-004 (7일 폐기), FR-C-010 (주간 리포트), FR-C-014 (24h 에스컬레이션)
- **Discope 영향**: 해당 없음 (Hobby plan 정책 영구 대응)
