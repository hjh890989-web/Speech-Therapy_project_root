---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-008: HITL 어드민 큐 — D4 적용 Slack + Supabase Studio 가이드"
labels: 'phase:p1, mode:replace, domain:fr-q, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-008
- **Epic / Story**: F6 HITL 전문가 코멘트 대시보드 / S6
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace (D4 적용)
- **Discope 적용**: D4 (HITL Realtime 어드민 페이지 → Slack + Supabase Studio)
- **목적**: SRS의 Realtime 어드민 페이지(Next.js Route Group + Supabase Realtime 구독)를 P1에서 미구축. 대신 **(a) Slack 채널에서 알림 수신 (b) Supabase Studio에서 직접 검토** 운영 가이드를 README + 영상 매뉴얼로 제공. P1 후반에 본격 어드민 페이지 도입 검토.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-032 (Next.js 어드민 페이지 + Realtime 구독)
- **Task 강화판**: §3-4 FR-Q-008 (Replace)
- **검토 보고서**: §1.2 [추가 D4]

## ✅ Task Breakdown
- [ ] **본 태스크의 산출물은 코드가 아닌 운영 가이드 문서** (어드민 페이지 미구축)
- [ ] `docs/hitl-operations.md` 작성:
  - 1. Slack 알림 수신 패턴 (API-005 발송 메시지 형식)
  - 2. Supabase Studio 진입 → hitl_queue 테이블 조회
  - 3. 검토 워크플로 — pending row 선택 → evaluation_results join 조회 → 코멘트 작성
  - 4. SQL UPDATE 예시 (status, expert_comment, ground_truth_score, completed_at)
  - 5. PostgreSQL 트리거가 evaluation_results.hitlReviewed 자동 동기화
  - 6. 부모 알림 발송 (API-006 호출 또는 수동 이메일)
  - 7. 영상 매뉴얼 링크 (Loom 또는 YouTube unlisted)
- [ ] `app/(admin)/hitl/page.tsx` **간이 placeholder 페이지** 작성:
  - "현재 HITL 운영은 Supabase Studio에서 진행됩니다"
  - 운영 가이드 문서 링크
  - 큐 통계만 간단히 표시 (총 pending, 24h 임박, completed)
  - admin 역할만 접근 (Middleware 가드)
- [ ] 큐 통계 RSC 컴포넌트:
  - `prisma.hitlQueue.groupBy({by: ['status']})`
  - shadcn/ui Card 4개 (pending / in_review / completed / escalated)
- [ ] `app/api/admin/hitl-stats/route.ts` GET — 큐 카운트 조회 (admin 인증)
- [ ] P1 후반 본격 어드민 페이지 도입을 위한 TODO 리스트 README 추가

## 🧪 Acceptance Criteria
**Scenario 1: Slack 알림 수신 → Studio 진입 (D4 핵심)**
- **Given**: Confidence < 70 발생 → API-005 발송
- **When**: 전문가가 Slack 메시지 클릭 → Supabase Studio 링크
- **Then**: hitl_queue 해당 row 즉시 조회 가능

**Scenario 2: 큐 통계 placeholder 페이지**
- **Given**: admin 인증
- **When**: GET `/admin/hitl`
- **Then**: 4개 status 카운트 카드 표시 + 운영 가이드 링크

**Scenario 3: parent 차단**
- **Given**: parent 역할
- **When**: GET `/admin/hitl`
- **Then**: 403 또는 `/` 리다이렉트

**Scenario 4: SQL UPDATE 가이드 동작 검증**
- **Given**: 가이드 SQL 실행 (`UPDATE hitl_queue SET ...`)
- **When**: 전문가가 Studio에서 실행
- **Then**: PostgreSQL 트리거가 evaluation_results.hitlReviewed=true 자동 갱신

**Scenario 5: 영상 매뉴얼 접근성**
- **Given**: 신규 전문가 온보딩
- **When**: README 링크 클릭
- **Then**: Loom/YouTube 매뉴얼 정상 재생 (3분 이내)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-012**: HITL 피드백 ≤ 48h
- **D4 적용 명시**: 본 태스크는 어드민 페이지 미구축 대신 운영 가이드 + 통계 placeholder
- **횡단 제약**:
  - [ ] R4 — Studio 접근 권한 admin/expert만 (RLS + Middleware 이중 가드)
  - [ ] CON-04 — 가이드 문서 자체에 의료 용어 0건
- **R3 — 1인 운영 부담**: D4 적용으로 어드민 디버깅 부담 0

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] `docs/hitl-operations.md` 작성 완료 (단계별 스크린샷 또는 영상)
- [ ] placeholder 페이지 + 통계 카드 동작
- [ ] `tsc --strict` 0 errors
- [ ] admin 인증 가드 검증
- [ ] D4 적용 사유 README 명시
- [ ] PR 본문에 REQ-FUNC-032 + D4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-009 (hitl_queue), API-010 (admin 인증), API-005/006 (Slack 웹훅 + 코멘트 API)
- **Blocks**: P1 후반 본격 어드민 페이지 도입
- **Discope 영향**: D4 — Realtime 어드민 페이지 미구축. P1 후반 검토. 본 태스크는 운영 가이드 + placeholder만
