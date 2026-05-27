---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Server Action] API-015: B2B 4종 (submitConsentSignature + submitBulkImport + submitOfflineEntry + signOut)"
labels: 'phase:p1, mode:active, domain:api, epic:b2b, sprint:p1-p2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-015
- **Epic / Story**: B2B Server Actions + Auth (V07 신규)
- **Phase**: 🟡 P1 → 🔴 P2
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음 (B2B 진입 시 활성)
- **목적**: B2B 4종 Server Action — 전자서명 동의서 / 원아 일괄 등록 / 오프라인 활동 기록 / 로그아웃.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §3.5.1 Server Actions — submitConsentSignature / submitBulkImport / submitOfflineEntry / signOut
  - REQ-FUNC-054~055 (원아 일괄 등록), REQ-FUNC-059~061 (전자서명), REQ-FUNC-042 (오프라인 케어로그)
- **V06 base**: FR-C-018 (전자서명), FR-C-016 (엑셀 일괄)

## ✅ Task Breakdown
- [ ] `app/actions/submit-consent-signature.ts`:
  - 부모 이메일 + 자녀 닉네임 + consentType (T1~T4) + IP + UserAgent capture
  - ConsentSignature INSERT (DB-010 후속)
- [ ] `app/actions/submit-bulk-import.ts`:
  - 엑셀 100명 파싱 (Zod array) → User INSERT batch (P2002 catch — 중복 skip)
  - 오류 행 정보 반환
- [ ] `app/actions/submit-offline-entry.ts`:
  - teacher RBAC 검증 → 자녀 외부 활동 메모 OfflineEntry INSERT
- [ ] `app/actions/sign-out.ts`:
  - Supabase `signOut()` 호출 + cookie 제거 + redirect `/login`

## 🧪 Acceptance Criteria
**Scenario 1: 전자서명 (REQ-FUNC-059)**
- **Given**: 부모 동의서 클릭 + consentText snapshot
- **When**: submitConsentSignature
- **Then**: ConsentSignature INSERT — 법적 효력 binding (IP + UA + 동의 시각)

**Scenario 2: 100명 일괄 등록 (REQ-FUNC-054)**
- **Given**: 엑셀 100행 (5행 중복 oldUser)
- **When**: submitBulkImport
- **Then**: 95 INSERT + 5 skip + 오류 행 정보 반환 (p95 ≤ 3,000ms)

**Scenario 3: 교사 RBAC (REQ-NF-019)**
- **Given**: 다른 반 teacher 가 학생 메모 시도
- **When**: submitOfflineEntry
- **Then**: RBACError throw — RLS 가 cross-class 차단

**Scenario 4: 로그아웃**
- **Given**: 인증 user
- **When**: signOut
- **Then**: cookie 제거 + `/login` redirect

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-054**: 100명 일괄 p95 ≤ 3,000ms
- **REQ-NF-019**: RBAC 강제 (teacher / principal)
- **횡단 제약**:
  - [ ] R4 개인정보: ConsentSignature 의 부모 이메일은 PII — audit_log 추적
  - [ ] CON-04: 메모 내 금칙어 검증

## 🏁 Definition of Done
- [ ] 4 Server Action Zod 검증 + try/catch
- [ ] RBAC 통과 자동 테스트
- [ ] 엑셀 파싱 100행 부하 테스트
- [ ] `tsc --strict` 0 errors

## 🚧 Dependencies & Blockers
- **Depends on**: DB-010 (ConsentSignature), DB-012 (Class), DB-013 (OfflineEntry / audit), API-016 (Auth)
- **Blocks**: FR-Q-019 (`/admin/teacher/*` + `/admin/students/import`)
- **Discope 영향**: B2B 진입 (Phase 2) 후 활성
