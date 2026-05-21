# 운영 런북 (OPS-001)

> CS 4시간 응답 SLA + HITL 48시간 SLA + 어드민 운영 워크플로 표준.
> **D4 적용**: Realtime 어드민 페이지 미구현 → Supabase Studio + Slack + Vercel Cron 조합.
> 본 문서는 1인 운영자가 실수 없이 따라할 수 있는 절차서이며, 모든 카피는 **CON-04** (의료 어휘 금칙) 를 준수한다.

상위 참조:
- SRS REQ-NF-011 (CS 최초 응답 ≤ 4시간), REQ-NF-012 (HITL 피드백 ≤ 48시간)
- 인시던트 매트릭스: [`postmortem-template.md`](postmortem-template.md)
- CS 카피 템플릿: [`cs-templates.md`](cs-templates.md)
- 보안 정책: [`security-policy.md`](security-policy.md)

---

## 1. CS 4시간 응답 SLA (REQ-NF-011)

### 1.1 채널

| 채널 | 용도 | 응답 SLA | 상태 |
|---|---|---|---|
| `support@<도메인>` (Resend Inbound 또는 메일 전달) | 1차 사용자 문의 | 4h 이내 첫 응답 | 운영 중 |
| Slack `#cs-inbox` (Webhook → 채널 또는 Inbound 어댑터) | 내부 트리아지 | 즉시 (배지) | 운영 중 |
| GitHub Issue (`label: cs-bug`) | 재현 가능한 버그 | 트리아지 후 P0/P1/P2 라벨 | 운영 중 |
| 카카오/디스코드 (옵션) | 비공식 베타 | best-effort | P2 검토 |

> 모든 채널은 최종적으로 `support@` 메일함을 SoT (Source of Truth) 로 한다. Slack DM 으로 들어온 문의는 운영자가 `support@` 로 self-forward.

### 1.2 분류 라벨

| 라벨 | 정의 | 1차 처리 시간 (목표) |
|---|---|---|
| `cs-bug` | 재현 가능한 동작 결함 (UI/API/데이터) | 4h 첫 응답 + 24h 내 재현 시도 |
| `cs-feature` | 신규 기능 요청 / 개선 제안 | 4h 첫 응답 + 1주 내 우선순위 회신 |
| `cs-billing` | 결제/구독/환불 (P2 도입 후 활성) | 4h 첫 응답 + 24h 내 처리 |
| `cs-other` | 일반 질문 / 사용 가이드 | 4h 내 답변 완결 |

### 1.3 처리 흐름

```
[사용자 메일] → [Slack #cs-inbox 알림]
   ↓
[운영자 4h 내 첫 응답] (cs-templates.md §1)
   ↓
[분류 라벨 부여 + 필요 시 GitHub Issue 변환]
   ↓
[조치 / 회신]
   ↓
[SLA 로그 기록 — Notion 또는 Sheets 1행]
```

### 1.4 SLA 추적 (수동 + 자동 혼합)

- **수동 입력**: 각 문의 처리 시 Sheets 1행 추가 — `receivedAt`, `firstReplyAt`, `closedAt`, `category`
- **자동 회신**: Resend / Sendgrid Inbound 시 즉시 자동 회신 1건 발송 (cs-templates.md §1 첫 응답 템플릿)
- **주간 집계**: 일요일 23:59 KST 에 운영자가 평균 응답 시간 + 위반 건수를 Slack `#cs-inbox` 에 수동 게시 (자동화는 P2 후보)

### 1.5 1인 운영 백업 (휴가/부재)

- 자동 회신 메일에 부재 일자 + 복귀 일자 명시 (cs-templates.md §6)
- 마스터 재활사 (계약 협력자) 1명에게 RBAC `admin` 임시 부여 (Supabase Studio 에서 `User.role = 'admin'` UPDATE)
- 비상 연락처: `README.md` 의 운영자 이메일 + Slack DM

---

## 2. HITL 48시간 SLA (REQ-NF-012)

### 2.1 전체 흐름

```
[사용자 발음 가이드 완료] (FR-Q-001)
   ↓
[EvaluationResult 생성, confidence 계산]
   ↓
[confidence < 70?] ──아니오──> [부모에게 결과 즉시 노출]
   │ 예
   ↓
[lib/hitl.enqueueForReview]
  - HITLQueue UPSERT
  - status = "pending"
  - slaDueAt = createdAt + 48h
   ↓
[lib/notifications/slack.notifyHITLBySlack]
  - sessionId, queueId, confidence, slaDueAt
  - R4: 자녀 식별 정보 절대 미포함 (sessionId 만 키)
   ↓
[전문가 Slack 수신 → Supabase Studio 진입]
   ↓
[보정 입력 + UPDATE]
  - groundTruthScore (3축 + percentile)
  - expertComment
  - status = "reviewed"
  - completedAt = NOW()
   ↓
[EvaluationResult.hitlReviewed = true UPDATE]
   ↓
[사용자 이메일 자동 발송 (P2 후보, 현재는 수동)]
```

### 2.2 Cron 보조 (자동)

`vercel.json` 의 `/api/cron/hitl-monitor` (현재 일 1회 0 UTC, Pro 전환 시 매시간):

- **24h+ pending**: `status = "escalated"`, `escalatedAt = NOW()` + Slack `:rotating_light:` 알림
- **24h 이내 SLA 만료 임박 3건+**: Slack `:warning:` 알림
- **48h 초과 (critical)**: postmortem-template SEV-2 기준으로 인시던트 분류 (§4)

### 2.3 단계별 책임자 / 도구 / SQL

| 단계 | Owner | 도구 | 액션 |
|---|---|---|---|
| 큐 등록 | 시스템 (자동) | `lib/hitl.ts` `enqueueForReview` | UPSERT (sessionId @unique) |
| 알림 | 시스템 (자동) | `lib/notifications/slack.ts` `notifyHITLBySlack` | Webhook POST |
| 검토 | 전문가 | Supabase Studio | SQL UPDATE (§2.4) |
| 완료 통지 | 운영자 (수동, P2 자동화) | 메일 (cs-templates.md §4) | 사용자 메일 발송 |
| 에스컬레이션 | Cron (자동) | `/api/cron/hitl-monitor` | status=escalated + Slack |

### 2.4 SQL 예시 (Supabase Studio → SQL Editor)

**오늘의 pending 큐 조회:**
```sql
SELECT id, "sessionId", "confidenceScore", "slaDueAt", "createdAt"
FROM "HITLQueue"
WHERE status = 'pending'
ORDER BY "slaDueAt" ASC
LIMIT 50;
```

**전문가 보정 결과 입력 (트랜잭션 + 1행 보호):**
```sql
BEGIN;

UPDATE "HITLQueue"
SET
  status = 'reviewed',
  "expertComment" = '발음 a, e 명확. 추가 가이드 1주 후 재확인 권장.',
  "groundTruthScore" = '{"articulation": 82, "linguistic": 78, "acoustic": 75, "peerPercentile": 60}'::jsonb,
  "assignedExpertId" = '<expert-user-id>',
  "completedAt" = NOW()
WHERE id = '<queue-id>'
  AND status = 'pending';   -- 가드: 이미 처리된 행 보호

-- 영향 행 수 확인 (1 이어야 정상)
-- 0 이면 ROLLBACK, 1+ 이면 COMMIT
COMMIT;
```

**EvaluationResult 동기화 (UPDATE 1행):**
```sql
BEGIN;

UPDATE "EvaluationResult"
SET "hitlReviewed" = true
WHERE "sessionId" = '<session-id>'
  AND "hitlReviewed" = false;

-- 1행 영향 확인 후
COMMIT;
```

**24h+ pending 강제 escalate (Cron 미동작 시 fallback):**
```sql
UPDATE "HITLQueue"
SET status = 'escalated', "escalatedAt" = NOW()
WHERE status = 'pending'
  AND "createdAt" < NOW() - INTERVAL '24 hours';
```

### 2.5 SLA 측정

- 정의: `completedAt - createdAt`
- 목표: 평균 < 48h, 위반 건수 < 5% (Scenario 2)
- 측정 쿼리 (지난 7일):
```sql
SELECT
  COUNT(*) AS total,
  AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt"))/3600) AS avg_hours,
  SUM(CASE WHEN "completedAt" > "slaDueAt" THEN 1 ELSE 0 END) AS sla_breach
FROM "HITLQueue"
WHERE "completedAt" IS NOT NULL
  AND "createdAt" > NOW() - INTERVAL '7 days';
```

---

## 3. 어드민 운영 워크플로 (Supabase Studio 중심)

### 3.1 진입

1. Supabase Dashboard 로그인 → 프로젝트 선택
2. 좌측 **Table Editor** (`HITLQueue`, `EvaluationResult` 등) 또는 **SQL Editor**
3. 위험한 작업은 반드시 SQL Editor + `BEGIN; ... COMMIT;` 트랜잭션

### 3.2 자주 쓰는 쿼리

**오늘의 HITL pending:**
```sql
SELECT * FROM "HITLQueue"
WHERE status = 'pending'
  AND "createdAt" >= CURRENT_DATE
ORDER BY "confidenceScore" ASC;
```

**이번 주 escalated 건:**
```sql
SELECT * FROM "HITLQueue"
WHERE status = 'escalated'
  AND "escalatedAt" >= DATE_TRUNC('week', NOW())
ORDER BY "escalatedAt" DESC;
```

**사용자별 세션 횟수 (최근 30일):**
```sql
SELECT u.id, u.role, COUNT(e.id) AS sessions
FROM "User" u
LEFT JOIN "EvaluationResult" e
  ON e."userId" = u.id
  AND e."createdAt" > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.role
ORDER BY sessions DESC
LIMIT 50;
```

**금주 신규 가입 + 활동:**
```sql
SELECT COUNT(*) FROM "User"
WHERE "createdAt" >= DATE_TRUNC('week', NOW());
```

### 3.3 위험 작업 가드 (필수 규칙)

| 작업 | 가드 |
|---|---|
| `DELETE` | 반드시 `BEGIN; ... COMMIT;` + `WHERE` 절 + 영향 행 수 사전 확인 (`SELECT COUNT` 먼저) |
| `UPDATE` 다행 | 반드시 트랜잭션 + `LIMIT` 시뮬레이션 또는 1차 SELECT 검증 |
| `TRUNCATE` | **금지** — 마이그레이션 외에는 절대 사용 금지 |
| `DROP` | **금지** — 마이그레이션은 Prisma migrate 로만 수행 |
| `User.role` 변경 | 트랜잭션 + 영향 사용자 1명 명시 + Slack 공지 |
| RLS 정책 비활성 | **금지** — 정책은 마이그레이션 `enable_rls_policies` 만 권위 |

**가드 템플릿 (모든 위험 작업에 적용):**
```sql
BEGIN;

-- 1) 영향 행 사전 확인
SELECT COUNT(*) FROM "<table>" WHERE <where_clause>;

-- 2) 실제 작업
UPDATE "<table>" SET ... WHERE <where_clause>;

-- 3) 결과 확인
SELECT * FROM "<table>" WHERE <where_clause> LIMIT 5;

-- 4) 만족하면 COMMIT, 의심되면 ROLLBACK
COMMIT;
-- ROLLBACK;
```

### 3.4 백업 / 복구

- Supabase 자동 백업: Free 7일 PITR (Point-in-time Recovery)
- 수동 dump: 월 1회 `pg_dump` 실행 → 운영자 PC 로컬 저장 (.env 제외)
- 복구 시: Supabase Support 티켓 + RPO/RTO 측정 → postmortem 작성

---

## 4. 인시던트 분류 + 에스컬레이션

### 4.1 심각도 매트릭스 (postmortem-template §메타데이터 재참조)

| 심각도 | 정의 | 운영 응답 시간 (감지~1차 조치) | Slack 채널 |
|---|---|---|---|
| **SEV-1** | 전체 서비스 중단 (모든 `/diagnose`, 메인 페이지 다운) | 15분 | `#cs-inbox` + `:rotating_light:` + 운영자 휴대전화 |
| **SEV-2** | 주요 기능 결함 (HITL 48h 초과 다건, AI 응답 실패 다건) | 1시간 | `#cs-inbox` + `:warning:` |
| **SEV-3** | 일부 기능 저하 (특정 음소 misjudge, 리포트 EmptyState 오노출) | 4시간 | `#cs-inbox` |
| **SEV-4** | 사용자 영향 최소 (lint 경고, 비핵심 페이지 404) | 1영업일 | GitHub Issue (label: bug) |

### 4.2 에스컬레이션 절차

1. **감지** — `/api/health` 모니터링 알림 또는 사용자 보고 또는 Cron Slack 알림
2. **분류** — 위 매트릭스로 SEV 결정 (의심 시 한 단계 위로 올림 — fail-safe)
3. **1차 조치** — 임시 workaround (rollback, feature flag off, fallback UI)
4. **공지** — `support@` 자동 응답 메시지 갱신 (SEV-1/2 시)
5. **영구 수정 + 검증**
6. **postmortem** — 24h 내 `docs/postmortems/YYYY-MM-DD-{slug}.md` 작성
7. **재발 방지 액션 아이템** → GitHub Issue 로 생성

### 4.3 Oncall 라인업 (현재)

- **L1 (1차 응답)**: 운영자 1명 (솔로 개발자)
- **L2 (전문가 검토)**: 마스터 재활사 1명 (계약 협력)
- **L3 (인프라)**: Vercel / Supabase 공식 Support (Free / Pro 플랜)

> **확장 후보 (P2~P3)**: L1 운영자 2명 교대제, Loom 영상 매뉴얼 신규 직원 온보딩, PagerDuty 도입 시점은 MAU 1,000 돌파 후.

---

## 5. D4 단순화 명시

### 5.1 Realtime 어드민 미구현 사유

- **사용자 규모**: P1 단계에서 HITL 큐는 일 평균 10건 미만 예상 → Realtime UI 비용/복잡도 대비 가치 낮음
- **R3 (1인 운영 부담 최소화)**: Studio + Slack 조합으로 동일한 검토 흐름 + 신규 학습 비용 0
- **Supabase Studio 제공 기능**: SQL Editor / Table Editor / Auth Manager / Storage Browser 가 어드민 페이지 1차 대체 가능
- **Slack 알림 즉시성**: 평균 1초 내 전문가 디바이스 도달 (Realtime UI vs 차이 무시 가능)

### 5.2 Slack + Studio 조합이 충분한 이유

| 요구 | Realtime UI | Studio + Slack |
|---|---|---|
| 신규 큐 감지 | 페이지 새로고침 / 웹소켓 | Slack push (즉시) |
| 큐 조회 | 어드민 테이블 컴포넌트 | Table Editor + SQL |
| 상태 변경 | UI 폼 | SQL UPDATE (트랜잭션 가드) |
| 권한 분리 | RBAC 미들웨어 | Supabase Auth + RLS |
| 감사 로그 | 어드민 액션 로그 모델 | Postgres `pg_stat_activity` + Studio Audit |

### 5.3 P2 자동화 후보

- **Inbound 메일 자동 분류** — Resend Inbound + Gemini 분류기 (cs-bug/cs-feature 자동 라벨)
- **HITL 완료 시 사용자 메일 자동 발송** — Cron 또는 DB trigger (현재 수동)
- **주간 SLA 보고서 Cron** — 매주 월 0 KST `/api/cron/weekly-sla-report` → Slack 자동 게시
- **어드민 페이지** — EXP-2 통과 (월 5만+ 이벤트 도달) 후 도입 검토
- **PagerDuty / Opsgenie** — SEV-1 자동 전화 (운영자 2명 이상 확장 후)
- **상태 페이지** — status.<도메인> (Statuspage 또는 Better Stack Free)

---

## 6. 체크리스트 (운영자 일일 / 주간)

### 6.1 일일 (5분, 매일 09:00 KST)

- [ ] Slack `#cs-inbox` 미응답 확인
- [ ] `support@` 메일함 미응답 확인 (4h SLA 임박 표시)
- [ ] Supabase Studio HITL pending 조회 (§3.2)
- [ ] Vercel Cron `/api/cron/hitl-monitor` 마지막 실행 상태 확인 (Vercel Dashboard → Cron)

### 6.2 주간 (30분, 매주 월 10:00 KST)

- [ ] SLA 측정 쿼리 (§2.5) 실행 → Slack 게시
- [ ] CS 주간 회고 1줄 (개선점 + Issue 생성)
- [ ] postmortem 신규 작성 건 검토 회의 (있다면)
- [ ] Vercel / Supabase 비용 대시보드 확인 (G2 가드)
- [ ] 보안 알림 확인 (Vercel / Supabase / GitHub Dependabot)

---

## 7. 변경 이력

| 일자 | 변경 | 작성자 |
|---|---|---|
| 2026-05-21 | OPS-001 초안 (D4) | 운영자 |
