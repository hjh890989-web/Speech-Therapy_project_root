---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Route Handler] API-006: /api/hitl/comment (PATCH) — D4 적용 Studio 직접 UPDATE 가이드 + Webhook"
labels: 'phase:p1, mode:replace, domain:api, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-006
- **Epic / Story**: HITL 안전 프로토콜 / S6
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace (D4 적용)
- **Discope 적용**: D4 (Realtime 어드민 페이지 미사용)
- **목적**: SRS의 `/api/hitl/comment` PATCH 엔드포인트는 어드민 페이지에서 호출하는 코멘트 입력 API였으나, D4 적용으로 **(a) Supabase Studio에서 전문가가 직접 UPDATE + (b) 본 엔드포인트는 fallback API로 유지**. 사용자(부모)에게 결과 알림 발송 + hitlReviewed 플래그 동기화.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.5 API Overview — `app/api/hitl/comment` (PATCH, ≤ 48h SLA)
  - REQ-FUNC-032 (전문가 어드민 큐 관리)
  - REQ-FUNC-HITL-003 (48h SLA + 마스터 재활사 강제 이관)
  - REQ-FUNC-HITL-004 (보정 데이터 → 모델 재학습 환류)
- **Task 강화판**: §3-2 API-006 (Replace)
- **검토 보고서**: §1.2 [추가 D4]

## ✅ Task Breakdown
- [ ] `app/api/hitl/comment/route.ts` 생성 (Route Handler)
- [ ] PATCH 핸들러:
  - 입력 Zod: `{queueId, expertComment, groundTruthScore: {articulation, linguistic, acoustic}, expertId}`
  - 인증: Supabase Auth로 expert/admin 역할 검증 (Middleware + RLS)
  - DB UPDATE: hitl_queue.status='completed', expert_comment, ground_truth_score, completedAt=NOW()
  - evaluation_results.hitlReviewed = true, aiCushionText 보정 (선택)
- [ ] **Supabase Studio 직접 UPDATE 가이드 (`docs/hitl-operations.md`)**:
  - SQL 예시: `UPDATE hitl_queue SET ... WHERE id = '...'`
  - PostgreSQL 트리거로 hitlReviewed 자동 동기화
- [ ] 사용자 알림 (D4 변형):
  - 부모에게 이메일 또는 Slack DM 발송: "전문가가 결과를 검토했습니다"
  - Resend / Sendgrid Free 사용
- [ ] 어뷰징 방어 (FR-C-014 연결):
  - 동일 expertId 월 3회 초과 동일 부모 검토 → 자동 admin 알림
- [ ] 응답 스키마: `{success, completedAt, userNotified}`
- [ ] 에러: 400 / 401 / 404 (queueId 없음) / 410 (이미 완료) / 500

## 🧪 Acceptance Criteria
**Scenario 1: 전문가 정상 코멘트 (REQ-FUNC-HITL-003)**
- **Given**: expert 인증 + queueId pending
- **When**: PATCH `/api/hitl/comment`
- **Then**: DB UPDATE 성공, status='completed', evaluation_results.hitlReviewed=true, 사용자 알림 발송

**Scenario 2: 비전문가 차단**
- **Given**: parent 역할
- **When**: PATCH
- **Then**: 401 또는 403 (RLS)

**Scenario 3: Supabase Studio 직접 UPDATE 동작 (D4 핵심)**
- **Given**: admin이 Studio에서 SQL UPDATE 실행
- **When**: 트리거 동작
- **Then**: evaluation_results.hitlReviewed 자동 true, audit_log INSERT

**Scenario 4: 이미 완료된 큐 차단**
- **Given**: status='completed' row
- **When**: PATCH
- **Then**: 410 Gone

**Scenario 5: groundTruthScore 검증**
- **Given**: 점수 -10 입력
- **When**: Zod 검증
- **Then**: ZodError throw (0~100 범위)

**Scenario 6: 48h 초과 시 마스터 재활사 강제 이관 (REQ-FUNC-HITL-003)**
- **Given**: 등록 후 48h 경과 + status='pending'
- **When**: 일반 expert PATCH 시도
- **Then**: 409 Conflict + "마스터 재활사 전용" 메시지 (또는 admin만 통과)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-012**: HITL 피드백 ≤ 48h
- **REQ-NF-029**: 오진 치명 수정률 < 0.5%
- **C-TEC-002**: Route Handler
- **횡단 제약**:
  - [ ] **D4 적용 명시** — 어드민 페이지 미존재, Studio가 1차 도구
  - [ ] R4 — 사용자 알림에 자녀 식별 정보 최소화
  - [ ] CON-04 — expert_comment에 의료 용어 자동 검증 (REQ-FUNC-HITL-002)
  - [ ] RLS — expert 역할 + 본인 또는 미할당 큐만 수정 가능

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Supabase Studio UPDATE 1회 시뮬 + 트리거 동작 검증
- [ ] 이메일/Slack 사용자 알림 1회 검증
- [ ] `tsc --strict` 0 errors
- [ ] `docs/hitl-operations.md` 작성
- [ ] PR 본문에 REQ-FUNC-032/HITL-003/HITL-004 + D4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-009, DB-005 (hitlReviewed 플래그), API-010 (인증), DB-011 (RLS)
- **Blocks**: FR-C-013 (전문가 코멘트 PATCH 호출), FR-C-014 (어뷰징 방어), MON-003 (24h Alert)
- **Discope 영향**: D4 — 어드민 페이지 미존재. Studio + Slack DM/이메일로 운영
