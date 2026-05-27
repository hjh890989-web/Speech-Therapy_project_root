---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-019: /admin/* RBAC 라우트 11종 (audit / teacher / hitl / principal / cushion-notes / funnel / pdf / timeline / totp-reset / students-import)"
labels: 'phase:p0, mode:active, domain:fr-q, epic:admin-rbac, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-019
- **Epic / Story**: Admin RBAC 라우트 묶음 (V07 신규 — MVP 100%)
- **Phase**: 🟢 P0 → ✅ Done (MVP 100%)
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: admin / teacher / principal / expert role 의 운영 페이지 11 종 — RBAC 가드 + `ConsentRedirectGate` 제외 (운영 흐름). AuditLog 회계감사 / HITL 큐 / 원장-원아 대시보드 / 알림장 일괄 / 퍼널 CVR / PDF / 타임라인 / TOTP 복구.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.5.4 Admin 라우트 (RBAC + ConsentRedirectGate 제외) — 11 종 표
  - REQ-NF-019 (RBAC + 1년 audit_log 보관)
- **DB**: DB-013 (AuditLog + audit_trigger_fn) 의 회계감사 데이터 소스
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-A FR-Q-019

## ✅ Task Breakdown
- [x] `/admin/audit/page.tsx` — AuditLog cursor 페이지네이션 + actorId / tableName / action 필터 (MON-007)
- [x] `/admin/teacher/page.tsx` — 반 / 원아 대시보드 (teacher / principal)
- [x] `/admin/teacher/students/[userId]/offline-entry/page.tsx` — 오프라인 활동 입력 (teacher)
- [x] `/admin/hitl/page.tsx` + `/admin/hitl/[id]/page.tsx` — HITL 큐 list + detail (expert / admin)
- [x] `/admin/students/import/page.tsx` — 원아 CSV 일괄 등록 (teacher / principal)
- [x] `/admin/principal/page.tsx` — 원장 대시보드 (principal)
- [x] `/admin/cushion-notes/page.tsx` — 알림장 일괄 발송 (teacher)
- [x] `/admin/funnel/page.tsx` — MON-001 퍼널 CVR 대시보드 (admin)
- [x] `/admin/centers/pdf/[userId]/page.tsx` — jsPDF 다운로드 (teacher / principal)
- [x] `/admin/timeline/[userId]/page.tsx` — 자녀 통합 타임라인 (teacher)
- [x] `/admin/security/totp-reset/page.tsx` — TOTP reset (admin only, 부모 lockout 복구)
- [x] 모든 `/admin/*` 라우트에 `requireRole(['admin', 'teacher', 'expert', 'principal'])` server-side 가드 적용
- [x] `/admin/*` 전 노드 `ConsentRedirectGate` 제외 (운영 흐름)

## 🧪 Acceptance Criteria
**Scenario 1: RBAC 가드 (REQ-NF-019)**
- **Given**: role='parent' 인증 user
- **When**: `/admin/audit` 진입 시도
- **Then**: 403 또는 `/` redirect + AuditLog 에 `denied_access` 기록

**Scenario 2: `/admin/audit` cursor 페이지네이션 (MON-007)**
- **Given**: AuditLog 10만 행
- **When**: admin role 으로 `/admin/audit?cursor=...&tableName=User`
- **Then**: 50 row + nextCursor 반환 + 필터 정상

**Scenario 3: `/admin/hitl/[id]` 보정 점수 입력 (REQ-NF-019)**
- **Given**: expert role + HITLQueue row id=h1
- **When**: groundTruthScore 입력 + 저장
- **Then**: HITLQueue UPDATE + audit_hitl_changes TRIGGER 발화 + AuditLog INSERT

**Scenario 4: `/admin/security/totp-reset` 부모 lockout 복구**
- **Given**: admin role + 부모 lockout 상태
- **When**: TOTP factor 삭제 실행
- **Then**: Supabase MFA factor DELETE + AuditLog + 부모 재로그인 가능

**Scenario 5: ConsentRedirectGate 제외 검증**
- **Given**: PIPA 미동의 admin role
- **When**: `/admin/funnel` 진입
- **Then**: redirect 없이 정상 렌더 (admin 운영 흐름)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: RBAC 4 role 분리 (admin / teacher / expert / principal) + 1년+ AuditLog
- **횡단 제약**:
  - [x] CON-04: admin UI 카피도 금칙어 무위반
  - [x] R4 개인정보: 자녀 PII 표시 시 AuditLog sanitize 적용 ([REDACTED])
  - [ ] CON-04 Disclaimer: admin 페이지는 외부 노출 없음 — 미적용

## 🏁 Definition of Done
- [x] 11 라우트 모두 정상 렌더 + RBAC 가드 동작
- [x] `/admin/audit` cursor 페이지네이션 + 필터 검증
- [x] HITL 큐 보정 + AuditLog 자동 캡처 검증
- [x] ConsentRedirectGate 제외 검증
- [x] `tsc --strict` 0 errors
- [x] PR 본문에 REQ-NF-019 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-016 (Auth + RBAC requireRole), DB-013 (AuditLog TRIGGER), DB-009 (HITLQueue), DB-011 (RBAC 컬럼)
- **Blocks**: MON-007 (`/admin/audit` 데이터 소스 페이지), MON-001 (`/admin/funnel` 퍼널 대시보드), OPS-002 (HITL 운영)
- **Discope 영향**: 해당 없음
