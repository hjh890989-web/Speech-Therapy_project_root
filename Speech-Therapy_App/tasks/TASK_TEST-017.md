---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-017: audit_log_triggers R4 sanitize 검증 — [REDACTED] 치환 단위 + 통합"
labels: 'phase:p1, mode:active, domain:test, epic:audit-r4, sprint:p1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-017
- **Epic / Story**: AuditLog R4 sanitize 검증 (V07 신규)
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: DB-013 의 `audit_trigger_fn` + `audit_sanitize_jsonb` 의 R4 sanitize 기능 검증. User / HITLQueue / RewardLog INSERT/UPDATE 시 영유아 의심 키 (`realname` / `ssn` / `rrn` / `email` / `phone` / `address` / `birthdate`) `[REDACTED]` 자동 치환 단위 + 통합 테스트. 본 sub-session 의 핵심 PIPA + R4 정합 evidence.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §6.1.3 audit_trigger_fn + audit_sanitize_jsonb (V07 신규)
  - REQ-NF-019 (감사 로그 1년+ 보관)
  - R4 (영유아 음성 무단 수집/유출)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §3 TEST-017
- **선행 구현**: [`TASK_DB-013.md`](TASK_DB-013.md) (3 TRIGGER + sanitize 함수)

## ✅ Task Breakdown
- [ ] `__tests__/integration/audit-r4-sanitize.test.ts` 작성:
  - test 1 — User UPDATE 시 AuditLog INSERT 1건 + sanitize 검증
  - test 2 — HITLQueue UPDATE (groundTruthScore 보정) 시 expertComment 의 인명 `[REDACTED]` 치환
  - test 3 — RewardLog INSERT 시 oldData=null, newData 의 의심 키 sanitize
  - test 4 — JSONB 중첩 구조 (e.g. `{user: {realname: "..."}}`) 재귀 sanitize
  - test 5 — 의심 키 외 (e.g. score, status) sanitize 미적용 검증 (false positive 방지)
  - test 6 — actorId NULL 케이스 (system cron job) 정상 INSERT
  - test 7 — withActor() helper 호출 시 audit.actor_id GUC 정확 캡처
- [ ] 단위 테스트 — `audit_sanitize_jsonb` 함수 단독 호출:
  - input: `{"realname": "홍길동", "score": 80, "child": {"birthdate": "2020-01-01"}}`
  - expected: `{"realname": "[REDACTED]", "score": 80, "child": {"birthdate": "[REDACTED]"}}`
- [x] 통합 테스트 — **실 PostgreSQL(PGlite in-process WASM)로 TRIGGER 발화 검증** (`__tests__/integration/audit-r4-sanitize-db.test.ts`, 10 PASS, 2026-06-02):
  - **in-memory PostgreSQL(PGlite=PG16 WASM) 채택** — Supabase shadow branch 불요(vitest in-process, 외부 DB/CI service 0). pg-mem 은 plpgsql 미지원이라 배제.
  - 실제 `migration.sql`(audit_sanitize_jsonb + audit_trigger_fn + 3 TRIGGER) 로드 → 4개 테이블 최소 스캐폴드에 INSERT/UPDATE/DELETE 발화
  - AuditLog row 조회 → action(`{Table}_{op}`) + actorId(GUC `audit.actor_id` 캡처 / 'system' fallback) + sanitized diff(중첩 재귀·false-positive 0) 검증
- [ ] 의심 키 7종 (`realname / ssn / rrn / email / phone / address / birthdate`) 7 케이스 매트릭스 검증
- [ ] `pg_proc` 함수 존재 검증 SQL (smoke test)

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: User UPDATE 자동 capture (REQ-NF-019)**
- **Given**: User row id='u1', `withActor('u1', () => prisma.user.update(...))`
- **When**: pipaUnderageConsentAt 갱신
- **Then**: AuditLog INSERT 1건, action='UPDATE', actorId='u1', oldData/newData sanitized

**Scenario 2: R4 sanitize — realname [REDACTED] (R4)**
- **Given**: User row 에 (가설 컬럼) `realname: "홍길동"`
- **When**: UPDATE 발화
- **Then**: AuditLog.oldData.realname = `"[REDACTED]"`, newData.realname = `"[REDACTED]"`

**Scenario 3: JSONB 중첩 재귀 sanitize**
- **Given**: HITLQueue.groundTruthScore = `{"expertComment": "...", "metadata": {"phone": "010-..."}}`
- **When**: TRIGGER 발화
- **Then**: 중첩 `metadata.phone` 도 `[REDACTED]` 치환

**Scenario 4: 비의심 키 false positive 방지**
- **Given**: JSONB `{score: 80, articulation: 75}`
- **When**: sanitize 호출
- **Then**: score=80, articulation=75 유지 (변경 없음)

**Scenario 5: actorId NULL 케이스 (system cron)**
- **Given**: cron 이 `audit.actor_id` GUC 미설정 후 User UPDATE
- **When**: TRIGGER 발화
- **Then**: AuditLog.actorId=NULL, 나머지 컬럼 정상 INSERT (R4 sanitize 정상 작동)

**Scenario 6: 7 의심 키 매트릭스 (단위 테스트)**
- **Given**: 7 키 각각 단일 input JSONB
- **When**: audit_sanitize_jsonb 호출
- **Then**: 7개 모두 `[REDACTED]` 치환 (`realname / ssn / rrn / email / phone / address / birthdate`)

**Scenario 7: HITLQueue 보정 추적성 (REQ-NF-019)**
- **Given**: expert groundTruthScore UPDATE
- **When**: TRIGGER
- **Then**: AuditLog row (oldData=null score, newData=보정 점수, sanitized expertComment) 저장

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: 감사 로그 1년+ 보관
- **R4 sanitize**: 영유아 개인정보 [REDACTED] 자동 — 본 task 핵심 검증
- **횡단 제약**:
  - [ ] **R4**: 본 task 자체가 R4 sanitize 검증
  - [ ] **CON-04**: test fixture 에 의료 금칙어 0건
  - [ ] **Disclaimer**: 적용 없음 (test infra)
  - [ ] **G2**: shadow branch DB 무료 한도 내
- **성능**: TRIGGER 자체는 INSERT/UPDATE 당 ~1ms 추가, 1만 건/일 가정 시 무영향

## 🏁 Definition of Done
- [ ] 7 시나리오 모두 PASS (`__tests__/integration/audit-r4-sanitize.test.ts`)
- [ ] 7 의심 키 매트릭스 단위 테스트 PASS
- [ ] `pg_proc` 에 audit_sanitize_jsonb 존재 검증 smoke test
- [ ] 비의심 키 false positive 0건 검증
- [ ] withActor() helper unit test PASS
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-NF-019 + R4 + DB-013 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-013 (audit_trigger_fn + audit_sanitize_jsonb + 3 TRIGGER), DB-014 (RewardLog), DB-009 (HITLQueue), `lib/db/with-actor.ts`
- **Blocks**: (없음) — DB-013 의 ✅ Done evidence
- **Discope 영향**: 해당 없음
