---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-016: 원아 엑셀 100명 일괄 등록 + 오류 행 인라인 수정"
labels: 'phase:p2, mode:active, domain:fr-c, epic:f9-c'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-016
- **Epic / Story**: F9-c 원아 일괄등록 / S4
- **Phase**: 🔴 P2
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 원장이 신규 학기 시작 시 원아 100명을 엑셀로 일괄 등록 + 오류 행을 인라인 수정. shadcn/ui DataTable 기반 검증 우수 UX. Vercel Pro 60s 한도 내 처리.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-054 (원아 100명 엑셀 일괄 등록, p95 ≤ 3,000ms)
  - REQ-FUNC-055 (오류 행 하이라이트 + 인라인 수정)
  - REQ-NF-006 (Server Action p95 ≤ 3,000ms)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-5 FR-C-016

## ✅ Task Breakdown
- [ ] `npm i xlsx` 또는 `papaparse` 설치 (Excel 파싱)
- [ ] `app/(dashboard)/institution/[id]/students/import/page.tsx` Client Component
- [ ] 파일 업로드:
  - 드래그앤드롭 또는 파일 선택
  - 파일 검증: .xlsx, .csv, ≤ 5MB
- [ ] 클라이언트 측 사전 파싱:
  - xlsx 라이브러리로 sheet → JSON 배열 변환
  - 미리보기 — shadcn/ui DataTable 100행 표시
- [ ] 검증 단계:
  - Zod 스키마: `{className, childNickname, childAgeMonths, parentEmail, parentPhone?}`
  - 오류 행 빨간색 하이라이트 + 에러 메시지 표시
  - 인라인 셀 수정 가능
  - "재검증" 버튼 → 다시 Zod 통과
- [ ] 일괄 등록 Server Action `bulkImportStudents(institutionId, rows)` (`'use server'`):
  - 트랜잭션 내 처리 — 1행 실패 → 전체 롤백 또는 분리 (옵션)
  - 권장: 검증 통과 행만 INSERT, 실패 행은 결과로 반환
  - User INSERT (role: parent, institutionId, classId)
  - 자녀 child_age_months + childNickname만 저장 (R4)
  - 학부모 동의서 자동 발행 (DB-010 INSERT)
- [ ] 결과 화면:
  - 성공 N명 / 실패 M명
  - 실패 사유 다운로드 (CSV)
- [ ] 진행률 — Optimistic UI + Server Action 호출 후 결과
- [ ] Vercel Pro 60s 한도 내 처리 (100명 ≤ 3초 목표)

## 🧪 Acceptance Criteria
**Scenario 1: 정상 100명 일괄 등록 (REQ-FUNC-054)**
- **Given**: 100행 유효 엑셀
- **When**: 업로드 + "등록" 클릭
- **Then**: 100 row INSERT, p95 ≤ 3,000ms

**Scenario 2: 오류 행 인라인 수정 (REQ-FUNC-055)**
- **Given**: childAgeMonths = "abc" (잘못된 값) 5행
- **When**: 검증
- **Then**: 5개 행 빨간색 하이라이트 + "숫자가 아닙니다" 메시지

**Scenario 3: 인라인 수정 후 재검증**
- **Given**: 오류 5행 수정 완료
- **When**: "재검증" 클릭
- **Then**: 0건 오류, 등록 가능

**Scenario 4: 동의서 자동 발행**
- **Given**: 100명 등록 완료
- **When**: DB-010 검사
- **Then**: 100건 consent_signatures INSERT (status='pending')

**Scenario 5: 자녀 본명 미저장 (R4)**
- **Given**: 엑셀에 자녀 본명 컬럼 (혹시 입력)
- **When**: 등록
- **Then**: childNickname으로만 저장, 본명 무시 (또는 입력 단계에서 차단)

**Scenario 6: 비원장 차단**
- **Given**: parent 역할
- **When**: 페이지 진입
- **Then**: 403

**Scenario 7: 5MB 초과 파일 차단**
- **Given**: 6MB 엑셀
- **When**: 업로드
- **Then**: ZodError "5MB 이하만 가능"

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-054/055**: 일괄 등록 + 인라인 수정
- **REQ-NF-006**: p95 ≤ 3,000ms
- **횡단 제약**:
  - [ ] R4 — 자녀 본명 미저장 (childNickname만)
  - [ ] R3 — 원장의 1회 작업으로 100명 처리 (교사 부담 0)
  - [ ] G2 비용 — Vercel Pro 60s 한도 내

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 100명 부하 테스트 통과 (≤ 3초)
- [ ] R4 schema 검증 (본명 0건)
- [ ] 동의서 자동 발행 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-054/055 + REQ-NF-006 + R4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-002 (User), DB-003 (institutions + classes), DB-010 (consent_signatures), API-010 (인증), FR-C-018 (동의서 발송 트리거)
- **Blocks**: TEST-012, FR-Q-009 (대시보드에 등록된 원아 표시)
- **Discope 영향**: 해당 없음
