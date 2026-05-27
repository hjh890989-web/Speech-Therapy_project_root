---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-020: /status 시스템 상태 페이지 + /api/health Route Handler"
labels: 'phase:p0, mode:active, domain:fr-q, epic:ops-uptime, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-020
- **Epic / Story**: 운영 페이지 — Uptime SLA 노출 (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: REQ-NF-007 (Uptime ≥ 99.9%) 의 외부 가시 노출 — `/api/health` GET Route Handler 가 DB / Gemini / STT 핵심 의존을 ping 한 결과를 `/status` 페이지가 read-only 표시. UptimeRobot / Cron 외부 모니터링 + 사용자 운영 상태 확인 진입점.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.5.2 — `/api/health` GET (REQ-NF-007 uptime 확인, public)
  - §3.5.5 — `/status` 시스템 상태 (운영, ConsentRedirectGate 제외)
  - REQ-NF-007 (Uptime ≥ 99.9%, 월 ≤ 43분)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-A FR-Q-020

## ✅ Task Breakdown
- [x] `app/api/health/route.ts` — GET Route Handler
  - DB ping: `prisma.$queryRaw\`SELECT 1\``
  - Gemini ping: timeout 2s 헬스체크 (옵션)
  - 반환 JSON: `{ status: 'ok' | 'degraded' | 'down', db, ai, ts }`
  - HTTP 200 OK / 503 Service Unavailable (down 시)
  - `revalidate = 0` (캐시 금지 — 실시간)
- [x] `app/(public)/status/page.tsx` — `/api/health` fetch + 상태 카드 표시
  - 각 의존성 (DB / Gemini / STT) 의 ok/degraded/down 표시
  - 마지막 점검 timestamp
  - 30초마다 client refetch
- [x] `/status` + `/api/health` 둘 다 `ConsentRedirectGate` 제외 (운영)
- [x] `/api/health` 는 public — 인증 불필요 (외부 모니터링 위해)

## 🧪 Acceptance Criteria
**Scenario 1: 정상 (REQ-NF-007)**
- **Given**: DB + Gemini 정상
- **When**: `GET /api/health`
- **Then**: HTTP 200 + `{ status: 'ok', db: 'ok', ai: 'ok', ts: ... }`

**Scenario 2: DB 다운 시 503**
- **Given**: Prisma `$queryRaw` timeout
- **When**: `GET /api/health`
- **Then**: HTTP 503 + `{ status: 'down', db: 'down', ... }` + UptimeRobot 알림

**Scenario 3: `/status` 페이지 렌더**
- **Given**: 익명 또는 인증 user
- **When**: `/status` 진입
- **Then**: 3 의존성 카드 (DB / AI / STT) + 마지막 timestamp 표시

**Scenario 4: ConsentRedirectGate 제외**
- **Given**: PIPA 미동의 인증 user
- **When**: `/status` 진입
- **Then**: redirect 없이 정상 렌더 (운영)

**Scenario 5: 캐시 금지**
- **Given**: `/api/health` 호출 직후 의존성 down 발생
- **When**: 1초 후 재호출
- **Then**: 캐시 미적용 — 최신 상태 (`status: 'down'`) 반환

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-007**: Uptime ≥ 99.9% (월 ≤ 43분 다운) — UptimeRobot + `/api/health` 5분 cron
- **횡단 제약**:
  - [ ] CON-04: `/status` 카피에 의료 표현 없음 (운영 텍스트)
  - [x] R4 개인정보: `/api/health` 응답에 PII 없음 (status / ts 만)
  - [ ] R7 PIPA: 운영 페이지 — 동의 무관
- **성능**: `/api/health` p95 ≤ 500ms (외부 모니터링 friendly)

## 🏁 Definition of Done
- [x] `/api/health` GET 200/503 동작
- [x] `/status` 페이지 3 카드 렌더 + 30초 refetch
- [x] ConsentRedirectGate 제외 검증
- [x] `tsc --strict` 0 errors
- [x] UptimeRobot 또는 외부 monitoring 등록 (INFRA-001)
- [x] PR 본문에 REQ-NF-007 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-001 (Vercel 배포 + 외부 monitoring 설정), DB-001 (Prisma 연결)
- **Blocks**: MON-002 (Uptime SLA 추적), OPS-003 (장애 대응 runbook)
- **Discope 영향**: 해당 없음
