---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-017: AI 쿠션어 알림장 스트리밍 + 클립보드 복사 (Replace D8)"
labels: 'phase:p2, mode:replace, domain:fr-c, epic:f9-d'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-017
- **Epic / Story**: F9-d AI 쿠션어 알림장 / S5
- **Phase**: 🔴 P2
- **Mode**: 🔵 Replace (D8 적용)
- **Discope 적용**: D8 (키즈노트 발송 → 클립보드 복사)
- **목적**: 자녀 발음 발달 결과를 부모에게 부드럽게 전달하는 쿠션어 알림장을 Vercel AI SDK + Gemini로 스트리밍 생성. **SRS의 키즈노트 자동 발송 대신 클립보드 복사 + 교사 수동 붙여넣기**로 단순화.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-056 (Vercel AI SDK → Gemini 쿠션어 스트리밍)
  - REQ-FUNC-057 (교사 무수정 발송 승인율 ≥ 90%)
  - REQ-FUNC-058 (키즈노트 API 발송 — D8로 대체)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-5 FR-C-017 (Replace)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §1.2 [추가 D8]

## ✅ Task Breakdown
- [ ] `app/(dashboard)/institution/[id]/notifications/page.tsx`:
  - 자녀별 평가 결과 → 알림장 초안 생성 워크플로
- [ ] Server Action `generateNotificationDraft({studentId, evaluationResultId})`:
  - API-011 어댑터 사용 — `streamText()` 호출
  - 시스템 프롬프트: "부모에게 부드럽게 전달하는 쿠션어로 자녀 발음 발달 결과를 1~2문단으로 작성. 의료 진단 표현 절대 금지."
  - 사용자 프롬프트: 평가 결과 + 자녀 닉네임 + 월령
- [ ] Vercel AI SDK `useChat` 또는 `useCompletion` 훅으로 스트리밍 표시:
  - 실시간 텍스트 페인트 (한 글자씩)
  - 사용자 경험 — "AI가 작성 중…"
- [ ] 교사 검토 UI:
  - 생성된 초안 표시 + 수정 가능 textarea
  - "승인" 버튼 → API-007 PATCH 호출
  - "재생성" 버튼 → 다른 톤·길이 옵션
- [ ] **D8 — 클립보드 복사**:
  - "클립보드에 복사" 버튼
  - `navigator.clipboard.writeText(approvedText)`
  - shadcn/ui Toast "복사되었어요. 키즈노트에 붙여넣어 주세요"
- [ ] notification_drafts 테이블 (별도 마이그레이션 — DB-005 보강 또는 신설):
  - 초안 저장 + 수정 이력
- [ ] 무수정 승인율 측정:
  - `wasEdited` 필드로 통계
  - REQ-FUNC-057 KPI ≥ 90%
- [ ] CON-04 검증:
  - 생성 후 정규식 스캔 → "진단/장애" 발견 시 재생성 1회

## 🧪 Acceptance Criteria
**Scenario 1: 스트리밍 생성 (REQ-FUNC-056)**
- **Given**: 자녀 평가 결과
- **When**: "초안 생성" 클릭
- **Then**: AI SDK 스트리밍 시작, 텍스트 한 글자씩 표시, ≤ 5초 완료

**Scenario 2: 무수정 승인율 ≥ 90% (REQ-FUNC-057)**
- **Given**: 100건 초안 생성 + 교사 승인
- **When**: 통계
- **Then**: 무수정 ≥ 90건

**Scenario 3: D8 — 클립보드 복사**
- **Given**: 승인된 초안
- **When**: "복사" 클릭
- **Then**: clipboard.writeText 호출, Toast 노출, 키즈노트 미연동

**Scenario 4: 재생성 기능**
- **Given**: 첫 초안 마음에 안 듦
- **When**: "재생성" 클릭
- **Then**: 다른 텍스트 생성 (Gemini temperature 변경 또는 다른 prompt)

**Scenario 5: CON-04 — 금칙어 재생성**
- **Given**: 첫 초안에 "진단" 포함
- **When**: 정규식 검출
- **Then**: Gemini 재호출 1회

**Scenario 6: 자녀 본명 미포함 (R4)**
- **Given**: 생성된 초안
- **When**: 정규식
- **Then**: 자녀 본명 0건 (childNickname만)

**Scenario 7: Rate Limiter 통과 (G5)**
- **Given**: 100건 동시 생성 시도
- **When**: SEC-004
- **Then**: RPM 14 초과 시 차단, 큐잉 처리

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-056**: AI SDK 스트리밍
- **REQ-FUNC-057**: 무수정율 ≥ 90%
- **D8 적용**: 키즈노트 미연동
- **G5 Rate Limiter**: SEC-004 통과
- **횡단 제약**:
  - [ ] CON-04 — 금칙어 재생성
  - [ ] R4 — 자녀 본명 미포함
  - [ ] R3 — 교사 추가 업무 최소화 (1클릭 복사)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 스트리밍 페인트 ≤ 5초
- [ ] 무수정율 측정 통계 활성
- [ ] CON-04 재생성 동작
- [ ] R4 정규식 통과
- [ ] `tsc --strict` 0 errors
- [ ] D8 적용 사유 README 명시
- [ ] PR 본문에 REQ-FUNC-056~058 + D8 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-007 (승인 라우트), API-011 (Gemini 어댑터), API-012 (Resend), DB-005 (평가 결과), DB-003 (institutions), SEC-004 (Rate Limiter), FR-C-005 (금칙어)
- **Blocks**: 없음 (B2B 가치 종착점)
- **Discope 영향**: D8 — 키즈노트 미연동, 클립보드 복사. B2B 5건 + 키즈노트 공식 제휴 시 점진 도입
