---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Route Handler] API-007: /api/b2b/approval (PATCH) — D8 클립보드 복사 대체"
labels: 'phase:p2, mode:replace, domain:api, epic:f9-d'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-007
- **Epic / Story**: F9-d AI 쿠션어 알림장 / S5
- **Phase**: 🔴 P2
- **Mode**: 🔵 Replace (D8 적용)
- **Discope 적용**: D8 (키즈노트 미연동 → 클립보드 복사)
- **목적**: SRS의 PATCH 엔드포인트는 키즈노트 API 발송을 명시했으나, D8 적용으로 **AI가 작성한 알림장 텍스트를 클립보드 복사 가능 형식으로 반환**하는 단순 역할로 변경. 교사가 키즈노트에 수동 붙여넣기.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.5 API Overview — `app/api/b2b/approval` (PATCH)
  - REQ-FUNC-057 (교사 무수정 발송 승인율 ≥ 90%)
  - REQ-FUNC-058 (키즈노트 API 발송 — D8로 대체)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-2 API-007 (Replace)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §1.2 [추가 D8]

## ✅ Task Breakdown
- [ ] `app/api/b2b/approval/route.ts` Route Handler (PATCH)
- [ ] 입력 Zod:
  - `notificationDraftId: z.string().uuid()` (FR-C-017이 생성한 알림장 초안)
  - `approved: z.boolean()`
  - `editedText: z.string().optional()` (교사가 수정한 경우)
  - `teacherId: z.string().uuid()`
- [ ] 출력 Zod:
  - `success: boolean`
  - `clipboardText: string` (키즈노트 붙여넣기용 — D8 핵심)
  - `wasEdited: boolean` (REQ-FUNC-057 측정 — 무수정율)
  - `approvedAt: ISO`
- [ ] 인증: teacher 또는 principal 역할만 (Middleware + RLS)
- [ ] 비즈니스 로직:
  - 알림장 초안을 `notification_drafts` 테이블에 저장 (별도 마이그레이션 필요 또는 evaluation_results 보강)
  - status='approved' 갱신
  - `clipboardText` 생성 (Markdown 또는 Plain Text 선택)
  - 무수정 카운트 통계 누적 (`b2b_approval_stats`)
- [ ] 텔레메트리:
  - `b2b_notification_approved`
  - `b2b_notification_edited`
  - 무수정율 일별 측정 → REQ-FUNC-057 KPI

## 🧪 Acceptance Criteria
**Scenario 1: 정상 승인 + 클립보드 텍스트 (D8 핵심)**
- **Given**: 알림장 초안 + 교사 인증
- **When**: PATCH `/api/b2b/approval`
- **Then**: 200 + `{success: true, clipboardText: "...", wasEdited: false}`

**Scenario 2: 수정 후 승인**
- **Given**: editedText 제공
- **When**: PATCH
- **Then**: clipboardText에 editedText 반영, wasEdited: true

**Scenario 3: 무수정 승인율 측정 (REQ-FUNC-057)**
- **Given**: 100건 승인 (90건 무수정)
- **When**: 통계
- **Then**: 무수정율 90% (목표 ≥ 90%)

**Scenario 4: 비교사 차단**
- **Given**: parent 역할
- **When**: PATCH
- **Then**: 401 또는 403

**Scenario 5: 키즈노트 미연동 (D8)**
- **Given**: 코드 검사
- **When**: 키즈노트 SDK 검색
- **Then**: 의존성 0건

**Scenario 6: 클립보드 텍스트 형식**
- **Given**: 정상 응답
- **When**: clipboardText 검증
- **Then**: Plain Text 또는 Markdown, 자녀 본명 0건

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-057**: 무수정 승인율 ≥ 90%
- **D8 적용**: 키즈노트 미연동 → 클립보드 복사
- **C-TEC-002**: Route Handler
- **횡단 제약**:
  - [ ] R3 — 교사 추가 업무 최소화 (D8 정신)
  - [ ] R4 — 알림장에 자녀 본명 미포함 (childNickname만)
  - [ ] CON-04 — clipboardText 금칙어 검증

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] `tsc --strict` 0 errors
- [ ] 인증 가드 검증
- [ ] 키즈노트 의존성 0 검증
- [ ] D8 적용 사유 README 명시
- [ ] PR 본문에 REQ-FUNC-057/058 + D8 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-003 (institutions), API-010 (인증), FR-C-017 (알림장 초안 생성)
- **Blocks**: TEST-012 (관련 부분), MOCK-003에서 본 응답 mock
- **Discope 영향**: D8 — 키즈노트 발송 미사용. 클립보드 복사로 단순화 (B2B 5건 + 키즈노트 공식 제휴 시 본격 도입)
