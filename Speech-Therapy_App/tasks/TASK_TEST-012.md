---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-012: 원아 100명 엑셀 일괄 등록 + 인라인 수정 통합 테스트"
labels: 'phase:p2, mode:active, domain:test, epic:f9-c'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-012
- **Epic / Story**: F9-c 원아 일괄등록 / S4
- **Phase**: 🔴 P2
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: FR-C-016(엑셀 일괄 등록) + FR-C-018(동의서 발송)의 통합 테스트. 100명 부하 + 오류 행 인라인 수정 + 동의서 자동 발행 검증.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-054 (100명 등록 p95 ≤ 3,000ms)
  - REQ-FUNC-055 (오류 행 하이라이트)
  - REQ-NF-006 (Server Action p95 ≤ 3,000ms)
  - §5 Traceability — TC-S4-004/005
- **Task 강화판**: §3-6 TEST-012

## ✅ Task Breakdown
- [ ] `__tests__/integration/bulk-import.test.ts`
- [ ] Mock 설정:
  - SQLite in-memory
  - Resend 이메일 spy
  - Vitest + Testing Library (DataTable 인라인 수정 시뮬)
- [ ] 시나리오:
  - 1: 100행 유효 엑셀 파싱 → User INSERT 100 row, ≤ 3초
  - 2: 5행 오류 (childAgeMonths NaN) → 빨간색 하이라이트 + 95행 등록 가능
  - 3: 인라인 수정 → 재검증 통과 → 100행 등록
  - 4: 동의서 자동 발행 → DB-010 INSERT 100건
  - 5: Resend 이메일 spy 100회 호출 검증
  - 6: 자녀 본명 컬럼 (혹시 입력) → 무시 또는 차단 (R4)
  - 7: 5MB 초과 파일 → ZodError
  - 8: 트랜잭션 롤백 — 중간 실패 시 일부 롤백 또는 격리 (정책에 따라)
- [ ] Playwright E2E (선택):
  - 실제 페이지 + 드래그앤드롭 + DataTable 인라인 수정 시뮬
- [ ] 부하 테스트 — 100명 처리 시간 측정

## 🧪 Acceptance Criteria
**Scenario 1: 8개 시나리오 통과**
- **Given**: FR-C-016 + FR-C-018 구현
- **When**: 테스트 실행
- **Then**: 8/8 PASS

**Scenario 2: 100명 ≤ 3초 (REQ-FUNC-054 / REQ-NF-006)**
- **Given**: 100행 시뮬
- **When**: bulkImportStudents
- **Then**: durationMs < 3,000

**Scenario 3: 오류 하이라이트 (REQ-FUNC-055)**
- **Given**: 5행 잘못된 입력
- **When**: 검증 후 DataTable 렌더
- **Then**: 5행 빨간색 + 에러 메시지 표시

**Scenario 4: 동의서 자동 발행**
- **Given**: 100명 등록 완료
- **When**: DB-010 검사
- **Then**: 100건 status='pending' INSERT

**Scenario 5: Resend 이메일 100회 spy**
- **Given**: 100명 등록
- **When**: Resend spy
- **Then**: sendEmail 100회 호출

**Scenario 6: R4 — 자녀 본명 미저장**
- **Given**: 엑셀에 자녀 본명 컬럼
- **When**: 등록 후 DB 검사
- **Then**: User.childNickname만 저장, 본명 0건

**Scenario 7: 5MB 초과 차단**
- **Given**: 6MB 파일
- **When**: 업로드
- **Then**: ZodError

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-054/055**: 일괄 등록 + 인라인 수정
- **REQ-NF-006**: p95 ≤ 3,000ms
- **격리**: 실 Resend 호출 0건, in-memory DB
- **횡단 제약**:
  - [ ] R4 검증 — 본명 0건 자동화

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 8/8 시나리오 통과
- [ ] 100명 부하 ≤ 3초
- [ ] R4 schema 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-054/055 + REQ-NF-006 + R4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-016, FR-C-018, DB-002/003/010, API-012 (Resend mock)
- **Blocks**: P2 합격 게이트
- **Discope 영향**: 해당 없음
