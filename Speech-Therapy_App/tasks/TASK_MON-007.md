---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Monitoring] MON-007: AuditLog 회계감사 페이지 (/admin/audit) — cursor 페이지네이션 + 필터 + 1년+ 보존"
labels: 'phase:p0, mode:active, domain:mon, epic:audit-page, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: MON-007
- **Epic / Story**: AuditLog 회계감사 페이지 (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: DB-013 의 audit_logs 테이블을 운영 가시 + 외부 감사 대응 가능한 형태로 시각화. `/admin/audit` 페이지 — cursor 페이지네이션 + actorId / tableName / action 필터 + 1년+ 보존 정책 + JSONB sanitized data 의 안전 표시 (sensitive 키 자동 [REDACTED]). REQ-NF-019 의 핵심 충족.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §6.1.3 AuditLog 테이블 + TRIGGER (DB-013)
  - REQ-NF-019 (감사 로그 1년+ 보관)
  - §3.5.4 Admin RBAC `/admin/*` 11종
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-C MON-007
- **연관**: DB-013 (AuditLog + TRIGGER), FR-Q-019 (Admin RBAC 11 page)

## ✅ Task Breakdown
- [x] `app/admin/audit/page.tsx` RSC — cursor 기반 페이지네이션 + 필터 UI
- [x] `app/admin/audit/AuditFilters.tsx` — actorId + tableName + action + 기간 (from/to) 필터
- [x] `app/admin/audit/AuditTable.tsx` — JSONB oldData/newData 의 안전 표시 (이미 sanitized but UI 추가 mask)
- [x] cursor 페이지네이션 — `id DESC` + `?cursor=<lastId>&limit=50`
- [x] Admin RBAC 가드 — `User.role = 'admin'` 만 진입 (proxy.ts 미들웨어)
- [x] 1년+ 보존 — 별도 cold archive job 미구현 (DB 적정 사이즈일 때 활성)
- [x] CSV export 버튼 — 감사 대응 시 다운로드 (UTF-8 + BOM)
- [x] FR-Q-019 의 Admin 11 page 중 `/admin/audit` 위치 정합
- [x] index — `@@index([actorId, createdAt(sort: Desc)])` + `@@index([tableName, rowId])` 활용

## 🧪 Acceptance Criteria
**Scenario 1: cursor 페이지네이션 (REQ-NF-019)**
- **Given**: audit_logs 10,000+ row
- **When**: `/admin/audit?limit=50` 진입
- **Then**: 최신 50건 표시 + 하단 "다음" 버튼 → `?cursor=<lastId>` 로 다음 50건

**Scenario 2: actorId 필터**
- **Given**: 특정 user (u1) 가 한 모든 변경 추적 필요
- **When**: 필터 `actorId=u1` 적용
- **Then**: u1 가 actor 인 audit_log 만 표시 + `@@index([actorId, createdAt])` 활용

**Scenario 3: tableName + action 복합 필터**
- **Given**: HITLQueue 의 UPDATE 만 추적 (전문가 보정 추적)
- **When**: `tableName=HITLQueue&action=UPDATE`
- **Then**: 해당 row 만 + oldData (보정 전 score) vs newData (보정 후 score) 비교 가능

**Scenario 4: JSONB sanitized 안전 표시 (R4)**
- **Given**: oldData = `{"realname": "[REDACTED]", "score": 75}`
- **When**: UI 표시
- **Then**: `realname` 컬럼은 회색 처리 + "[REDACTED]" 표시 (DB-013 의 R4 sanitize 그대로)

**Scenario 5: CSV export**
- **Given**: 필터 적용된 결과 100건
- **When**: "CSV 다운로드" 클릭
- **Then**: UTF-8 + BOM CSV 다운로드 + 한국어 컬럼 헤더

**Scenario 6: Admin RBAC 가드**
- **Given**: 일반 user 가 `/admin/audit` 직접 진입 시도
- **When**: proxy.ts middleware 검사
- **Then**: 403 Forbidden + `/` redirect + audit_log INSERT (시도 자체 기록)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: 감사 로그 1년+ 보관 + cursor 페이지네이션
- **횡단 제약**:
  - [x] R4 개인정보: oldData/newData 의 sanitize 는 DB-013 TRIGGER 책임, 본 UI 는 표시만
  - [x] CON-04 금칙어: UI 카피에 "치료/진단/장애" 미사용
  - [x] G2 비용: Supabase free tier 내 (1GB DB 미만)
- **성능**: cursor 페이지네이션 — `id DESC` 인덱스 활용, OFFSET 미사용 (대량 데이터 성능)
- **운영**: 1년+ 보존은 DB 사이즈 모니터링 + 1년 초과 row cold storage 검토 (별도 task)

## 🏁 Definition of Done
- [x] `/admin/audit` 페이지 렌더링 + 필터 + cursor 페이지네이션 검증
- [x] Admin RBAC 가드 검증 (일반 user 403)
- [x] CSV export 검증 (UTF-8 + BOM + 한국어 헤더)
- [x] JSONB sanitized 표시 검증 (R4 적용)
- [x] tsc --strict 0 errors
- [x] PR 본문에 REQ-NF-019 + §6.1.3 + §3.5.4 매핑
- [x] FR-Q-019 11 page 정합 검증

## 🚧 Dependencies & Blockers
- **Depends on**: DB-013 (AuditLog + TRIGGER), FR-Q-019 (Admin RBAC), SEC-010 (Auth — admin role)
- **Blocks**: TEST-017 (R4 sanitize 검증 — 본 UI 가 시각 검증 path), 외부 감사 대응
- **Discope 영향**: 해당 없음
