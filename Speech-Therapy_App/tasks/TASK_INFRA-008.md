---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[INFRA] INFRA-008: Supabase Studio SQL Editor 적용 패턴 — prod migration 안전 path"
labels: 'phase:p0, mode:active, domain:infra, epic:migration, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: INFRA-008
- **Epic / Story**: Prod Migration 안전 적용 (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done (본 sub-session)
- **Mode**: 명세대로 (운영 패턴 표준화)
- **Discope 적용**: 해당 없음
- **목적**: `npx prisma migrate deploy` 가 로컬 환경 ETIMEDOUT (api.vercel.com 76.76.21.112 차단) 으로 막힐 때 사용하는 prod migration 안전 적용 path. **Supabase Studio SQL Editor + PowerShell `clip` + 진단 SQL + idempotency 가드** 4 단계 표준화. DB-013 (AuditLog TRIGGER) + DB-015 (PIPA 컬럼) 실 적용 검증 완료.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.9 운영 정책 — prod migration 적용 path
  - §6.1.3 TRIGGER 3종 (DB-013 의존)
- **Reference 메모리**: `reference_supabase_migration_apply.md` 전체
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-A INFRA-008
- **검증 사례**: `20260522210000_audit_log_triggers/migration.sql` + `20260527140000_add_user_pipa_consent_columns/migration.sql`

## ✅ Task Breakdown
- [x] 적용 path 3종 비교 문서화 (메모리에 영구 보존)
  - Supabase Studio SQL Editor ⭐⭐⭐ (권장, ETIMEDOUT 영향 0)
  - `npx prisma migrate deploy` ⭐⭐ (DIRECT_URL 필요)
  - `psql` 직접 ⭐ (credential risk)
- [x] PowerShell 클립보드 복사 패턴 표준화:
  - `Get-Content "<absolute path>" -Raw | clip` → Studio SQL Editor 붙여넣기
- [x] 진단 SQL 패턴 — `information_schema.columns` + `pg_trigger` + `pg_proc` 단일 row boolean
- [x] Idempotency 가드 표준 적용:
  - `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`
  - `DROP TRIGGER IF EXISTS ... CASCADE` 후 CREATE
  - `CREATE OR REPLACE FUNCTION`
- [x] DB-013 적용 검증 — 221 lines migration 전체 paste → 3 TRIGGER + 2 함수 생성 확인
- [x] DB-015 적용 검증 — 5/27 1차 실패 (rollback 추정) + 2차 재시도 성공 학습

## 🧪 Acceptance Criteria
**Scenario 1: DB-013 AuditLog TRIGGER 정상 적용**
- **Given**: 221 lines `20260522210000_audit_log_triggers/migration.sql` 파일
- **When**: PowerShell `clip` → Studio SQL Editor paste → Run
- **Then**: `SELECT proname FROM pg_proc WHERE proname IN ('audit_trigger_fn', 'audit_sanitize_jsonb')` → 2 row + `pg_trigger` 에 3 TRIGGER 존재

**Scenario 2: DB-015 PIPA 컬럼 재시도 학습 (5/27)**
- **Given**: 1차 시도 "Success" 보고했으나 컬럼 미존재
- **When**: 진단 SQL `EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='pipaUnderageConsentAt')` 실행
- **Then**: 1차 → false 식별 → 2차 재시도 → true 확정

**Scenario 3: Idempotency 재실행 안전**
- **Given**: 이미 적용된 migration 을 두 번째 paste + Run
- **When**: SQL 재실행
- **Then**: 에러 없음 (모든 DDL 이 `IF NOT EXISTS` / `OR REPLACE` 가드)

**Scenario 4: ETIMEDOUT 우회**
- **Given**: 로컬 PowerShell 의 `npx prisma migrate deploy` 가 api.vercel.com ETIMEDOUT
- **When**: Studio SQL Editor 로 직접 paste + Run
- **Then**: 환경 네트워크 영향 0, 적용 성공

**Scenario 5: 진단 SQL 단일 row 검증**
- **Given**: 여러 migration 의 적용 여부 확인 필요
- **When**: 메모리 §진단 SQL 패턴 의 EXISTS 7 컬럼 boolean SELECT 실행
- **Then**: 한 row 의 boolean 값으로 어느 게 미적용인지 즉시 식별

## ⚙️ Technical & Non-Functional Constraints
- **운영 risk**: psql 직접은 credential 노출 risk → 회피
- **CI 한계**: `prisma-drift` job 은 DATABASE_URL secret 미설정 시 skip → schema 변경 PR 시 prod 적용 가장 먼저 수행
- **횡단 제약**:
  - [x] R4 개인정보: TRIGGER 가 R4 sanitize 의 핵심 — 적용 누락 = R4 미작동
  - [x] G2 비용: Supabase Studio 무료
- **Idempotency 표준**: 모든 migration SQL 의 DDL 이 가드 보장

## 🏁 Definition of Done
- [x] DB-013 prod 적용 검증 (`pg_proc` + `pg_trigger` 4 row)
- [x] DB-015 prod 적용 검증 (`information_schema.columns` 7 PIPA 컬럼)
- [x] PowerShell clip 패턴 메모리 영구 보존
- [x] 진단 SQL 템플릿 메모리 보존
- [x] 모든 migration SQL idempotency 가드 검증
- [x] PR 본문에 §12.9 + reference 메모리 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-001 (Vercel 배포), DB-001 (Supabase 프로젝트)
- **Blocks**: DB-013 (prod 적용), DB-014, DB-015 (PIPA 컬럼 적용), 모든 향후 schema 변경
- **Discope 영향**: 해당 없음
