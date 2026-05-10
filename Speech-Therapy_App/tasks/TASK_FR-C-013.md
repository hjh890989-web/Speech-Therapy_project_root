---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-013: 전문가 코멘트 PATCH + 보정 점수 (D4 — Studio 직접 UPDATE)"
labels: 'phase:p1, mode:replace, domain:fr-c, epic:hitl'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-013
- **Epic / Story**: F6 HITL 전문가 코멘트 / S6
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace (D4 적용)
- **Discope 적용**: D4 (어드민 페이지 미사용 → Supabase Studio 직접 UPDATE + Webhook 사용자 알림)
- **목적**: 전문가가 hitl_queue 항목을 검토 완료 → expert_comment·groundTruthScore 입력 → evaluation_results.hitlReviewed 동기화 + 사용자(부모)에게 알림 발송. SRS는 어드민 페이지 PATCH를 명시했으나 D4 적용으로 Studio 직접 UPDATE를 1차 도구로.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-032 (Realtime 구독 어드민 — 본 태스크는 D4 적용 단순화)
  - REQ-FUNC-HITL-003 (48h SLA + 마스터 재활사 강제 이관)
  - REQ-FUNC-HITL-004 (보정 데이터 → 모델 재학습 환류)
- **Task 강화판**: §3-5 FR-C-013 (Replace)
- **검토 보고서**: §1.2 [추가 D4]

## ✅ Task Breakdown
- [ ] **운영 흐름 1차 — Supabase Studio**:
  - 전문가가 Slack 알림 → Studio 진입 → hitl_queue 조회
  - SQL UPDATE 실행 (가이드는 FR-Q-008 책임)
  - PostgreSQL 트리거가 자동으로:
    - evaluation_results.hitlReviewed = true
    - expert_comment 동기화 (옵션)
    - audit_log INSERT
- [ ] **운영 흐름 2차 — API-006 PATCH (보조)**:
  - 향후 어드민 페이지 도입 시 사용
  - 본 태스크에선 PostgreSQL 트리거 위주로 구현
- [ ] PostgreSQL 트리거 작성 (`prisma migrate dev` 또는 Supabase 직접):
  ```sql
  CREATE OR REPLACE FUNCTION sync_hitl_review() RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.status = 'completed' AND NEW.completed_at IS NOT NULL THEN
      UPDATE evaluation_results
        SET hitl_reviewed = true,
            ai_cushion_text = COALESCE(NEW.expert_comment, ai_cushion_text)
        WHERE session_id = NEW.session_id;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER hitl_completion_trigger
    AFTER UPDATE ON hitl_queue
    FOR EACH ROW EXECUTE FUNCTION sync_hitl_review();
  ```
- [ ] 사용자 알림 발송:
  - 트리거 후 또는 별도 Vercel Cron 폴링 (1분 주기)이 hitlReviewed=true + notified=false인 row 추출
  - Resend 또는 Sendgrid Free로 부모 이메일 발송 ("전문가가 결과를 검토했습니다")
- [ ] groundTruthScore 누적:
  - 별도 `model_retraining_data` 테이블 또는 evaluation_results에 컬럼 추가
  - REQ-FUNC-HITL-004 재학습 트리거 (P2)
- [ ] 어뷰징 방어 (FR-C-014 연결):
  - 동일 expertId 1일 검토 50건 초과 시 admin 알림

## 🧪 Acceptance Criteria
**Scenario 1: Studio 직접 UPDATE → 트리거 동작**
- **Given**: 전문가가 Studio에서 `UPDATE hitl_queue SET status='completed', completed_at=NOW(), expert_comment='...' WHERE id='...'`
- **When**: PostgreSQL 트리거 실행
- **Then**: evaluation_results.hitlReviewed=true, ai_cushion_text 갱신

**Scenario 2: 사용자 이메일 알림**
- **Given**: 트리거 후 hitlReviewed=true row 발견
- **When**: Vercel Cron 폴링
- **Then**: Resend 이메일 1건 발송, notified=true 마킹

**Scenario 3: 48h SLA 준수 (REQ-FUNC-HITL-003)**
- **Given**: 등록 후 48h 내 status='completed'
- **When**: 측정
- **Then**: completed_at - created_at < 48h

**Scenario 4: 48h 초과 시 마스터 재활사 강제 이관**
- **Given**: 48h 경과 + status='pending'
- **When**: Cron 모니터링 (FR-C-014 책임)
- **Then**: status='escalated' + 마스터 재활사 Slack 알림

**Scenario 5: groundTruthScore JSON 저장**
- **Given**: 전문가가 보정 점수 입력 (articulation: 75, linguistic: 80, acoustic: 70)
- **When**: UPDATE
- **Then**: ground_truth_score JSONB에 저장, model_retraining_data 누적

**Scenario 6: 어뷰징 방어**
- **Given**: 동일 expertId 1일 51건 검토
- **When**: 51번째 UPDATE
- **Then**: admin Slack 알림 1회 (FR-C-014 트리거)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-012**: 48h SLA
- **REQ-NF-029**: 오진 치명 수정률 < 0.5%
- **D4 적용**: Studio 1차, API PATCH 2차
- **횡단 제약**:
  - [ ] R4 — expert_comment에 자녀 식별 정보 미포함
  - [ ] CON-04 — 코멘트 의료 용어 자동 검증 (FR-C-005 미들웨어 통과)
  - [ ] RLS — expert/admin만 hitl_queue UPDATE 가능

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] PostgreSQL 트리거 동작 검증
- [ ] Resend 이메일 발송 1회 검증
- [ ] `tsc --strict` 0 errors
- [ ] Studio 직접 UPDATE 가이드 (FR-Q-008과 통합)
- [ ] D4 적용 사유 README 명시
- [ ] PR 본문에 REQ-FUNC-032/HITL-003/HITL-004 + D4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-009 (hitl_queue), DB-005 (evaluation_results 동기화), API-006 (PATCH 라우트), DB-011 (RLS), FR-Q-008 (운영 가이드)
- **Blocks**: TEST-014, FR-C-014 (어뷰징 방어 트리거)
- **Discope 영향**: D4 — Realtime 어드민 페이지 미사용. PostgreSQL 트리거 + Studio + Webhook 알림으로 운영
