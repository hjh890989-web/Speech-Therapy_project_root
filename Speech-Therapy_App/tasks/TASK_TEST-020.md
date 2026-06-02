---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-020: F15 의료 용어 0건 자동 (Middleware) + 7일 폐기 + 단일턴 컨텍스트"
labels: 'phase:p1, mode:active, domain:test, epic:f15-chat-safety, sprint:p1-plus'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-020
- **Epic / Story**: F15 자연 발화 chat 안전망 (V07 신규)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로 + ADR-14 임상 안전 게이트 의존
- **Discope 적용**: 해당 없음 (F15 활성은 ADR-14 게이트 통과 후)
- **목적**: F15 chat 의 의료 용어 0건 자동 검증 (Route Handler stream transform) + 7일 폐기 Cron + 단일턴 컨텍스트 (pgvector 미사용) 단위 + 통합 테스트. ADR-14 임상 안전 게이트 통과 evidence 의 핵심 자동 검증. Gemini 응답에 금칙어 1건 발생 시 **즉시 차단(swap) + 결정적 안전 폴백 멘트 1회 노출 후 stream 종료** (재생성 retry 없음 — **2026-06-02 swap-terminal 정본 확정, 기존 명세 "재생성 1회"와 코드 충돌 해소**: 자녀 대화엔 2차 Gemini 호출보다 즉시 결정적 폴백이 안전·저비용·저지연, 3-layer 가드와 일관).

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 F15 (chat 자연 발화)
  - REQ-FUNC-038 (자연 발화 무자각 수집)
  - REQ-FUNC-039 (7일 폐기 + 의료 용어 배제 + 단일턴)
  - ADR-04 (의료 용어 배제) + ADR-07 (Vercel AI SDK Edge) + ADR-14 (임상 안전 게이트)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §3 TEST-020
- **선행 구현**: FR-C-028 (chat 안전망), API-019 (chat stream + 7일 폐기 Cron)

## ✅ Task Breakdown
- [x] `__tests__/lib/ai/profanity-filter.test.ts` 단위 테스트 — 실제 검열 = **Route Handler stream transform `filterStream` + INSERT 전 `submitChatUtterance` + system prompt** 3중 방어. (proxy.ts 는 stream 본문 스캔 불가 → 명세의 "proxy.ts 검열"은 부정확, 정정.)
  - test 1 — 응답 stream chunk scan(문장 경계 buffer), 금칙어 1건 발견 시 차단
  - test 2 — 금칙어 10종 ("치료/진단/장애/환자/병/증상/처방/병원/아프다/문제아") 매트릭스 검증
  - test 3 — 금칙어 미포함 응답 정상 통과
  - test 4 — **금칙어 감지 시 swap 마커 + 안전 폴백 후 stream 즉시 종료 (swap-terminal — 재생성 없음)**
  - test 5 — **금칙어 후 후속 clean 청크 미방출 + 폴백 정확히 1회 (재생성 retry 부재 가드) + 경계 횡단(치.료/치\n료) carry 탐지**
- [ ] `__tests__/integration/f15-chat-lifecycle.test.ts`:
  - test 1 — `submit_chat_utterance` Server Action → chat_utterances INSERT, expiresAt = createdAt + 7d
  - test 2 — 7일 경과 후 Cron 실행 → 만료 row 삭제 검증
  - test 3 — 단일턴 컨텍스트 검증 — N+1 chat 요청 시 N 의 발화 미참조 (pgvector 미사용, Conversation history 미저장)
  - test 4 — Vercel AI SDK Edge Runtime 응답 stream 정합
- [ ] e2e — `/chat` 페이지 → 발화 → 응답에 금칙어 1건 시뮬 → UI 에 안전 폴백 표시 검증
- [ ] Cron 단위 테스트 — chat-cleanup 만료 row 0건 잔여 검증

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: 금칙어 응답 차단 (REQ-FUNC-039 + ADR-04)**
- **Given**: Gemini 응답 "이건 진단 결과입니다"
- **When**: Route Handler stream transform(`filterStream`) 문장 경계 scan
- **Then**: stream 차단 + swap 마커 + 안전 폴백 멘트 enqueue 후 close (재생성 trigger 없음 — swap-terminal)

**Scenario 2: 정상 응답 통과**
- **Given**: Gemini 응답 "발음 가이드를 제공합니다"
- **When**: scan
- **Then**: stream 통과, 사용자에 정상 표시

**Scenario 3: swap-terminal 결정성 (2026-06-02 정본 — 재생성 없음)**
- **Given**: 금칙어 문장 뒤에 clean 문장이 이어지는 응답
- **When**: 금칙어 문장에서 swap
- **Then**: 안전 폴백 멘트("우리 같이 천천히 한 번 더 이야기해 볼까요? 😊") 정확히 1회 노출 + 후속 clean 청크 미방출(stream 종료). 2차 Gemini 호출/재생성 retry 없음.

**Scenario 4: 7일 폐기 (REQ-FUNC-039 + ADR-03)**
- **Given**: chat_utterances row, createdAt = 8일 전
- **When**: Cron `/api/cron/chat-cleanup` 실행
- **Then**: row DELETE + audit_log 추적

**Scenario 5: 단일턴 컨텍스트 (pgvector 미사용)**
- **Given**: user 가 2회 연속 chat 발화 (N=2)
- **When**: 2번째 요청 처리
- **Then**: 1번째 발화 미참조 (Conversation history 미저장), pgvector 호출 0건

**Scenario 6: 금칙어 10종 매트릭스 (단위 테스트)**
- **Given**: 10 금칙어 각각 단일 응답 시뮬
- **When**: filter 호출
- **Then**: 10건 모두 차단

**Scenario 7: Edge Runtime 응답 stream 정합 (ADR-07)**
- **Given**: Vercel AI SDK `useChat()` 호출
- **When**: chunks 스트림
- **Then**: chunk 별 filter 적용, 차단 시점부터 stream close

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-038/039**: F15 자연 발화 + 7일 폐기 + 의료 용어 배제 + 단일턴
- **ADR-04**: 의료 용어 배제
- **ADR-07**: Vercel AI SDK Edge Runtime (응답 stream 처리)
- **ADR-14**: 임상 안전 게이트 (F15 활성 전 KOPLAC 13 항목 + 4주 자문 + 82만 통과 의무)
- **횡단 제약**:
  - [ ] **R4**: chat_utterances 의 자녀 식별 정보 sanitize (audit_sanitize_jsonb 재사용)
  - [ ] **CON-04**: 본 task 의 핵심 검증
  - [ ] **Disclaimer**: `/chat` 페이지에 disclaimer 노출 (FR-Q-022 책임)
  - [ ] **CON-03 7일 폐기**: 본 task 의 핵심 검증
- **F15 활성 게이트**: ADR-14 통과 후만 prod 활성

## 🏁 Definition of Done
- [ ] 7 시나리오 단위 + 통합 + e2e 테스트 PASS
- [ ] 금칙어 10종 매트릭스 검증
- [ ] 7일 폐기 Cron chat-cleanup 동작 검증
- [ ] 단일턴 컨텍스트 (pgvector 미사용) 검증
- [ ] Edge Runtime stream filter 정합
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-038/039 + ADR-04/07/14 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-028 (chat 안전망), API-019 (chat stream + Cron), `proxy.ts` (Next.js 16 Middleware), DB-013 (AuditLog)
- **Blocks**: F15 정식 출시 게이트 (ADR-14 evidence 의 일부)
- **Discope 영향**: 해당 없음 (ADR-14 게이트 통과 후 활성)
