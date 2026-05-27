---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-013: AuditLog 테이블 + audit_trigger_fn + R4 sanitize TRIGGER (3종)"
labels: 'phase:p0, mode:active, domain:db, epic:audit, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-013
- **Epic / Story**: Audit / Compliance (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: PostgreSQL TRIGGER 로 User / HITLQueue / RewardLog 의 INSERT/UPDATE/DELETE 자동 capture. R4 (영유아 개인정보 보호) 의 핵심 보호 장치 — 의심 키 `[REDACTED]` 자동 치환 + actorId GUC 캡처. 1년+ 보존 + `/admin/audit` 회계감사 페이지의 데이터 소스.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §6.1.3 audit_trigger_fn + audit_sanitize_jsonb (V07 신규)
  - REQ-NF-019 (감사 로그 1년+ 보관)
  - R4 (영유아 음성 무단 수집/유출)
- **ERD**: V07 §6.1.2 — `audit_logs (id, tableName, rowId, action, actorId, oldData JSONB sanitized, newData JSONB sanitized, createdAt)`
- **Migration**: `prisma/migrations/20260522210000_audit_log_triggers/migration.sql`
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §1-A DB-013

## ✅ Task Breakdown
- [x] `prisma/schema.prisma` 에 `AuditLog` model 추가 (`tableName / rowId / action / actorId / oldData JSONB / newData JSONB / createdAt`)
- [x] `prisma/migrations/20260522210000_audit_log_triggers/migration.sql` 작성:
  - 함수 `audit_trigger_fn()` — `current_setting('audit.actor_id', true)` GUC 캡처 + AuditLog INSERT
  - 함수 `audit_sanitize_jsonb(jsonb)` — 의심 키 (`realname`, `ssn`, `rrn`, `email`, `phone`, `address`, `birthdate`) → `[REDACTED]` 치환 (재귀)
  - TRIGGER 3종: `audit_user_changes` (User), `audit_hitl_changes` (HITLQueue), `audit_reward_log_inserts` (RewardLog)
- [x] `lib/db/with-actor.ts` 의 `withActor(userId, fn)` helper — Prisma transaction 내에서 `SELECT set_config('audit.actor_id', $1, true)` 실행
- [x] Supabase Studio SQL Editor 로 prod 적용 (INFRA-008 패턴)
- [x] `@@index([tableName, rowId])` + `@@index([actorId, createdAt(sort: Desc)])` 인덱스 추가

## 🧪 Acceptance Criteria
**Scenario 1: User UPDATE 시 자동 capture**
- **Given**: User row id=u1 의 `pipaUnderageConsentAt` 갱신
- **When**: `withActor(u1, () => prisma.user.update(...))`
- **Then**: AuditLog INSERT 1건 (`action='UPDATE'`, `actorId=u1`, oldData/newData sanitized)

**Scenario 2: R4 sanitize — 의심 키 [REDACTED]**
- **Given**: User row 에 `realname: "홍길동"` 컬럼 (가설)
- **When**: UPDATE 발생
- **Then**: AuditLog.oldData.realname = `"[REDACTED]"`, AuditLog.newData.realname = `"[REDACTED]"`

**Scenario 3: actorId 누락 시 NULL 허용**
- **Given**: 시스템 cron job 이 User UPDATE
- **When**: `audit.actor_id` GUC 미설정
- **Then**: AuditLog.actorId = NULL, 나머지 정상 INSERT

**Scenario 4: HITLQueue 보정 추적성 (REQ-NF-019)**
- **Given**: expert 가 HITLQueue.groundTruthScore UPDATE
- **When**: TRIGGER 발화
- **Then**: AuditLog 에 (oldData=null score, newData=보정 점수) sanitized 저장

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: 감사 로그 1년+ 보관 (cursor 페이지네이션 + cold storage 검토)
- **R4 sanitize**: 영유아 개인정보 [REDACTED] 자동 — 인적 검토 불가능한 키도 안전
- **횡단 제약**:
  - [x] R4 개인정보: TRIGGER 자체가 R4 의 핵심 메커니즘
  - [ ] CON-04: AuditLog 자체는 metadata, UI 미노출
- **성능**: TRIGGER 는 INSERT/UPDATE 당 1회 추가 — User UPDATE 1만 건/일 가정 시 무영향

## 🏁 Definition of Done
- [x] Prisma migration 성공 (dev + prod, Supabase Studio)
- [x] TRIGGER 3개 + 함수 2개 적용 (`pg_proc`, `pg_trigger` 검증)
- [x] `lib/db/with-actor.ts` 단위 테스트 통과
- [x] `tsc --strict` 0 errors
- [x] 회계감사 page `/admin/audit` 에서 query (MON-007)
- [x] PR `f976388` + `d05fb51` 본문에 REQ-NF-019 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-002 (User), DB-009 (HITLQueue), DB-014 (RewardLog), INFRA-008 (Supabase Studio)
- **Blocks**: SEC-009 (5중 가드 통합), MON-007 (`/admin/audit`), TEST-017 (R4 sanitize 검증)
- **Discope 영향**: 해당 없음
