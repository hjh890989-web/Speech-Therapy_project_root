---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-011: Supabase RLS 정책 + Audit Log 통합 (역할별 분리)"
labels: 'phase:p1, mode:active, domain:db, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-011
- **Epic / Story**: 보안 횡단 (REQ-NF-019)
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Supabase RLS(Row-Level Security) 정책으로 역할별(parent/teacher/principal/expert/admin) 데이터 접근 격리 + Supabase Audit Log 활성화. R4 영유아 정보 보호 + 다중 테넌트(B2B) 데이터 누수 방지의 최후 방어선.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-NF-019 (RBAC + Supabase RLS, Audit Log)
  - C-TEC-003 (Supabase 사용)
  - R4 (영유아 음성 무단 수집/유출 방어)
- **Task 강화판**: §3-1 DB-011

## ✅ Task Breakdown
- [ ] Supabase 대시보드 → Authentication → Policies 활성화 검증
- [ ] 모든 사용자 데이터 테이블에 RLS Enable: `users, session_logs, evaluation_results, mission_cards (read-only), weekly_reports, reward_progress, hitl_queue, institutions, consent_signatures`
- [ ] **users 테이블 정책**:
  - SELECT: 자기 자신만 (`auth.uid() = id`)
  - UPDATE: 자기 자신만
  - INSERT: 신규 가입 시 (Supabase Auth trigger)
  - admin: 전체 SELECT/UPDATE 가능
- [ ] **evaluation_results / session_logs / weekly_reports / reward_progress 정책**:
  - SELECT: `auth.uid() = user_id`
  - INSERT: `auth.uid() = user_id` (Server Action에서 자동 보장)
  - 익명 진단(`anon`): 무로그인 진단 결과는 anonymous_user_id 컬럼으로 분기 또는 별도 정책
- [ ] **mission_cards 정책**:
  - SELECT: 모든 authenticated 사용자 (read-only 카탈로그)
  - INSERT/UPDATE: admin만
- [ ] **hitl_queue 정책**:
  - SELECT: expert 또는 admin만
  - UPDATE: assignedExpertId == auth.uid() 또는 admin
- [ ] **institutions / consent_signatures 정책 (P2)**:
  - SELECT: 해당 기관의 principal/teacher만
  - admin: 전체 가능
- [ ] Supabase Audit Log 활성화 (Pro 플랜 필요 — 또는 트리거로 별도 audit_log 테이블 구현)
- [ ] `audit_log` 테이블 옵션 (Free 티어 폴백): `id, table_name, row_id, operation, actor_id, payload jsonb, created_at`
- [ ] PostgreSQL 트리거: 모든 UPDATE/DELETE → audit_log INSERT
- [ ] RLS 정책 단위 테스트 (`prisma + supabase-js`로 시나리오 시뮬)
- [ ] 정책 문서화 — `docs/rls-policies.md` 작성

## 🧪 Acceptance Criteria
**Scenario 1: 부모 자기 데이터만 SELECT 가능**
- **Given**: parent 역할 + auth.uid() = X
- **When**: `SELECT * FROM evaluation_results WHERE user_id = Y` (다른 사용자)
- **Then**: 0 rows 반환 (RLS 차단)

**Scenario 2: 부모 자기 데이터 SELECT 정상**
- **Given**: parent 역할 + auth.uid() = X
- **When**: `SELECT * FROM evaluation_results WHERE user_id = X`
- **Then**: 자신의 row 정상 반환

**Scenario 3: expert HITL 큐 접근**
- **Given**: expert 역할
- **When**: `SELECT * FROM hitl_queue`
- **Then**: 본인 할당 + 미할당 pending 모두 가능

**Scenario 4: Audit Log 동작**
- **Given**: parent가 자기 reward_progress UPDATE
- **When**: Prisma UPDATE
- **Then**: audit_log에 row 1건 INSERT (operation='UPDATE', actor_id=auth.uid())

**Scenario 5: 익명 진단 격리**
- **Given**: 무로그인 사용자가 anonymous_user_id로 evaluation_results INSERT
- **When**: 같은 anonymous_user_id로 SELECT (localStorage UUID)
- **Then**: 본인 row만 조회 (다른 anonymous_user_id 차단)

**Scenario 6: admin 전체 접근**
- **Given**: admin 역할
- **When**: 임의 테이블 SELECT
- **Then**: 전체 row 반환

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: RBAC + RLS + Audit Log 필수
- **횡단 제약**:
  - [ ] R4 — 영유아 정보 다중 사용자 누출 방지
  - [ ] R3 — B2B 기관 간 데이터 격리 (P2 institutions 정책)
- **성능**: RLS는 모든 쿼리에 WHERE 추가 → 인덱스 필수 (DB-005, DB-007, DB-009 인덱스가 user_id 포함)
- **R8 보호**: Supabase Free 티어에서 RLS 자체는 비용 영향 없음. Audit Log Pro 옵션 사용 시 비용 발생 → audit_log 테이블 폴백 권장

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 9개 테이블 RLS Enable + 정책 작성
- [ ] audit_log 트리거 동작 검증
- [ ] `tsc --strict` 0 errors
- [ ] RLS 단위 테스트 6개 시나리오 통과
- [ ] `docs/rls-policies.md` 작성 (각 테이블별 정책 표)
- [ ] PR 본문에 REQ-NF-019 + R4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-002 (users + role enum), DB-003, DB-004, DB-005, DB-007, DB-008, DB-009, DB-010 (모든 테이블 정책 적용)
- **Blocks**: API-010 (Auth + Middleware RBAC와 페어), SEC-002 (RBAC 통합), 모든 P2 B2B 기능
- **Discope 영향**: 해당 없음
