---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C-HITL] FR-C-HITL-006: 재학습 3 게이트 Daily Cron — 0.5% / 500건 / HHI ≤ 0.3"
labels: 'phase:p1, mode:active, domain:fr-c-hitl, epic:hitl-retraining, sprint:p1-plus'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-HITL-006
- **Epic / Story**: HITL 재학습 3 게이트 (V07 신규)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음 (Phase 1+ 본격 활성, GitHub Actions cron 또는 Vercel Hobby 2 cron 중 하나 활용)
- **목적**: `/api/cron/retraining-gate` Daily Cron — `model_retraining_data` 의 30일 누적 row 에 대해 3 게이트 평가: (1) `AVG(diffPct) ≥ 0.5%` + (2) `COUNT ≥ 500` + (3) expert HHI `≤ 0.3` (= 3000/10000 환산 시 ≤ 3000). 3 게이트 모두 통과 시 → 외부 ML 엔지니어 위탁 Slack 알림 (admin 승인 후 모델 배포). ADR-11 RACI 의 2단계 system Cron R 책임. 약 분기 1~2회 발화 예상.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §5.3.3 재학습 3 게이트 (REQ-FUNC-HITL-006)
  - §5.3.4 RACI 2단계 — system Cron R, admin A
  - REQ-FUNC-HITL-006 (재학습 게이트 — 0.5% / 500건 / 0.3%)
  - ADR-11 (HITL 재학습 파이프라인)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-C FR-C-HITL-006
- **선행 Cron 패턴**: [`TASK_API-017.md`](TASK_API-017.md) (Bearer + curl -L)

## ✅ Task Breakdown
- [ ] `app/api/cron/retraining-gate/route.ts` — Bearer `CRON_SECRET` 검증 + GET handler
- [ ] `lib/hitl/three-gate.ts` — 게이트 평가 순수 함수:
  ```typescript
  export async function evaluateThreeGates(): Promise<{
    gate1: { passed: boolean; avgDiffPct: number };  // ≥ 0.5%
    gate2: { passed: boolean; cumulative: number };  // ≥ 500
    gate3: { passed: boolean; hhi: number };         // ≤ 0.3 (= ≤ 3000 환산)
    allPassed: boolean;
  }>
  ```
- [ ] SQL — `model_retraining_data` 30일 윈도우 집계:
  - 게이트 1: `SELECT AVG(diffPct) FROM model_retraining_data WHERE createdAt > NOW() - INTERVAL '30 days'`
  - 게이트 2: `SELECT COUNT(*) ...`
  - 게이트 3: HHI 계산 — `SELECT SUM(POWER(reviews::float / total, 2)) FROM (SELECT expertId, COUNT(*) AS reviews FROM ... GROUP BY expertId) AS t, (SELECT COUNT(*) AS total FROM ...) tot`
- [ ] 3 게이트 모두 통과 시:
  - Slack 알림 발송 (외부 ML 엔지니어 채널) — "재학습 트리거 준비: diffPct=X%, n=Y, HHI=Z"
  - `system_config` UPDATE — `retraining_triggered_at=NOW()` (멱등성 + 1회만 발화)
  - admin 페이지 `/admin/retraining` 알림 (MON-006 후속)
- [ ] Cron 등록:
  - GitHub Actions `external-crons.yml` 에 `0 4 * * *` (매일 04:00 KST = 19:00 UTC) 추가
  - 또는 Vercel Hobby cron 2개 슬롯 미사용 시 vercel.json 에 추가
- [ ] 멱등성 가드 — `system_config.retraining_triggered_at` 이 7일 이내면 skip (중복 알림 방지)
- [ ] 단위 테스트 — 3 게이트 통과/실패 8가지 조합 (2^3) 시뮬레이션

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: 3 게이트 모두 통과 → 재학습 트리거 (REQ-FUNC-HITL-006)**
- **Given**: 30일 누적 model_retraining_data 600건, AVG(diffPct)=0.7%, HHI=0.25
- **When**: Daily Cron 실행
- **Then**: Slack 알림 1회 발송, system_config.retraining_triggered_at=NOW(), HTTP 200 + `{triggered: true}` JSON

**Scenario 2: 게이트 1 실패 (diffPct < 0.5%) → no-op**
- **Given**: AVG(diffPct)=0.3%, n=600, HHI=0.25
- **When**: Cron 실행
- **Then**: 알림 0건, retraining_triggered_at 미갱신, `{triggered: false, gate1Failed: true}` 응답

**Scenario 3: 게이트 2 실패 (n < 500) → no-op**
- **Given**: AVG(diffPct)=0.7%, n=200, HHI=0.25
- **When**: Cron 실행
- **Then**: 알림 0건, `{triggered: false, gate2Failed: true}` 응답

**Scenario 4: 게이트 3 실패 (HHI > 0.3) → no-op + admin 경고**
- **Given**: AVG(diffPct)=0.7%, n=600, HHI=0.45 (expert 편향)
- **When**: Cron 실행
- **Then**: 재학습 트리거 차단 + admin Slack 경고 ("expert 다양성 부족, FR-C-HITL-007 점검 필요")

**Scenario 5: Bearer 검증 (REQ-NF-019)**
- **Given**: 외부 호출자 Bearer 없이 cron URL POST
- **When**: handler 진입
- **Then**: 401 Unauthorized

**Scenario 6: 멱등성 — 7일 이내 재발화 차단**
- **Given**: retraining_triggered_at = 3일 전, 게이트 모두 통과
- **When**: Cron 재실행
- **Then**: Slack 알림 0건, `{triggered: false, idempotencySkip: true}` 응답

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-HITL-006**: 3 게이트 (0.5% / 500건 / 0.3 HHI)
- **ADR-11**: 재학습 RACI 2단계 — system R, admin A
- **횡단 제약**:
  - [ ] **R4**: cron payload 에 expert 개인정보 노출 0건 (집계값만)
  - [ ] **CON-04**: Slack 메시지에 의료 금칙어 0건
  - [ ] **G2 비용**: Vercel Hobby 0$ 유지 (GitHub Actions cron 우선 이관)
  - [ ] **REQ-NF-007**: cron 실패 시 Slack alert (MON-005 연동)
- **성능**: Cron 처리 시간 ≤ 5초 (30일 윈도우 집계, 인덱스 활용)

## 🏁 Definition of Done
- [ ] `/api/cron/retraining-gate` route handler 구현 + Bearer 검증
- [ ] `lib/hitl/three-gate.ts` 단위 테스트 8 조합 PASS
- [ ] GitHub Actions `external-crons.yml` 또는 Vercel cron 등록 + 수동 트리거 검증
- [ ] 통과 시 Slack 알림 + system_config 갱신 확인
- [ ] 멱등성 가드 (7일 이내 재발화 차단) 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-HITL-006 + ADR-11 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-016 (model_retraining_data), FR-C-HITL-005 (TRIGGER → 데이터 적재 선행), API-017 (Cron Bearer 패턴), MON-005 (Slack 어댑터)
- **Blocks**: TEST-022 (3 게이트 단위 테스트 검증), 외부 ML 엔지니어 위탁 워크플로 (수동, OPS 영역)
- **Discope 영향**: 해당 없음 (Phase 1+ 본격 활성)
