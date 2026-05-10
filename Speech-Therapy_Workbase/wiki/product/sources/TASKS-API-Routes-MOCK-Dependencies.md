---
type: source
pillar: product
title: MOCK-002/003 의존 API 4종 — API-002 + API-006/007/008
source_path: ../../../raw/TASKS/TASK_API-002.md
source_path_b: ../../../raw/TASKS/TASK_API-006.md
source_path_c: ../../../raw/TASKS/TASK_API-007.md
source_path_d: ../../../raw/TASKS/TASK_API-008.md
source_type: task_detail
authors: []
year: 2026
ingested: 2026-05-09
tags: [API, RouteHandler, ServerAction, D4, D8, SupabaseStudio, Resend, 클러스터TASKS]
---

# MOCK-002/003 의존 API 4종 통합

[[product/sources/TASKS-Sprint-1-Remaining-Detail]] 의 MOCK-002/003 직접 의존 API 4종. **D4·D8·검토 §2.2 [추가 E2]** Descope 매핑 완성.

## 의존성 매핑

| API | Phase | Mode | 의존 Mock | 직접 Block |
|---|---|---|---|---|
| API-002 (`getCurriculum()` SA) | P1 | 명세대로 | MOCK-002 curriculum 4종 | FR-C-008, FR-Q-003 |
| API-006 (`/api/hitl/comment` PATCH) | P1 | 🔵 D4 Replace | MOCK-003 expertCommentSuccess | FR-C-013, FR-C-014, MON-003 |
| API-007 (`/api/b2b/approval` PATCH) | P2 | 🔵 D8 Replace | MOCK-003 approvalSuccess/Rejected | TEST-012, FR-C-017 |
| API-008 (`/api/consent/sign` POST/GET/PATCH) | P2 | 단순화 (검토 §2.2 [추가 E2]) | MOCK-003 consentSent/Signed/Expired | FR-C-018, SEC-003 |

---

## 1. API-002 · `getCurriculum()` Server Action (P1)

**Phase**: 🟡 P1 / **Mode**: 명세대로 / **Discope**: 해당 없음

### 핵심 Files
- `lib/schemas/curriculum.ts` (Zod)
- `app/actions/curriculum.ts` (`'use server'`)

### Zod Input Schema
```typescript
{
  userId: z.string().uuid(),
  recentSessions: z.array(z.object({
    sessionId, missionId, success: z.boolean(), timestamp
  })).max(10),  // 최근 10세션
  targetPhoneme: z.enum(['ㅅ','ㅈ','ㄱ','ㄴ','ㄹ']).optional(),  // 우선 추천
  childAgeMonths: z.number().int().min(24).max(84)
}
```

### Zod Output Schema
```typescript
{
  recommendedMissionId: z.string().uuid(),
  recommendedDifficulty: z.number().int().min(1).max(5),
  reason: z.enum(['continue', 'level_down', 'level_up', 'phoneme_switch']),
  suggestedNextPhoneme: z.string().optional(),  // 음소 마스터 시
  streakInfo: z.object({
    successCount: z.number(),
    failureCount: z.number()
  })
}
```

### Error Codes
`INVALID_INPUT | NO_MISSIONS_AVAILABLE | INTERNAL_ERROR`

### G/W/T (5 시나리오)
1. 정상 입력 검증 (5세션 3 성공/2 실패)
2. **3연속 실패 → reason: 'level_down'**, recommendedDifficulty -1 (FR-C-008 책임)
3. 5연속 성공 → 'level_up' 또는 'phoneme_switch'
4. recentSessions 11개 → ZodError (max 10)
5. 모든 음소 마스터 → `NO_MISSIONS_AVAILABLE` + suggestedNextPhoneme

### Constraints
- REQ-FUNC-021: 3연속 실패 → 하향, 전환 지연 < 0.5초
- REQ-FUNC-023: 하향 후 이탈률 < 5% (UX 책임)
- C-TEC-002 Server Action
- **멱등성**: 동일 입력 → 동일 출력 보장 (seeded random)
- 비의료 표현: 추천 사유에 "치료/진단" 금지

### **Depends on**: DB-006
### **Blocks**: FR-C-008, MOCK-002, FR-Q-003

---

## 2. API-006 · `/api/hitl/comment` PATCH (P1, D4 Replace) ⭐

**Phase**: 🟡 P1 / **Mode**: 🔵 Replace (D4 적용)

### 핵심 ⭐ 2-Trick 구조 (D4 적용 결과)

| 구성 | 역할 |
|---|---|
| **(a) Supabase Studio 직접 UPDATE** | **1차 도구** — 전문가가 SQL UPDATE 실행 |
| **(b) 본 PATCH 엔드포인트** | **Fallback API** — 어드민 페이지 도입 시 활용 |

### 핵심 Files
- `app/api/hitl/comment/route.ts`
- **`docs/hitl-operations.md`** ⭐ — Studio SQL 가이드 (D4 운영 핵심)

### PATCH 핸들러 흐름
1. **Zod 입력**: `{queueId, expertComment, groundTruthScore: {articulation, linguistic, acoustic}, expertId}`
2. **Supabase Auth 인증**: expert/admin 역할만 (Middleware + RLS)
3. **DB UPDATE**:
   - `hitl_queue.status='completed'`
   - `expert_comment, ground_truth_score, completedAt=NOW()`
   - `evaluation_results.hitlReviewed = true`
4. **사용자 알림 (D4 변형)**:
   - 부모에게 **Resend or Sendgrid Free** 사용 이메일
   - "전문가가 결과를 검토했습니다"
5. **어뷰징 방어 (FR-C-014 연결)**:
   - 동일 expertId 월 3회+ 동일 부모 검토 → 자동 admin 알림

### ⭐ PostgreSQL 트리거 (Studio 직접 UPDATE 시)
```sql
-- hitl_queue.status='completed' 시 evaluation_results.hitlReviewed 자동 sync
CREATE TRIGGER sync_hitl_reviewed
AFTER UPDATE OF status ON hitl_queue
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION update_evaluation_hitl_reviewed();
```

### 응답 스키마
`{success, completedAt, userNotified}`

### G/W/T (6 시나리오)
1. 전문가 정상 코멘트 → DB UPDATE + 사용자 알림
2. 비전문가 (parent) → 401/403 (RLS)
3. ⭐ **Studio 직접 UPDATE → 트리거로 evaluation_results 자동 sync + audit_log INSERT**
4. 이미 완료된 큐 (status='completed') → 410 Gone
5. groundTruthScore 음수 → ZodError (0~100)
6. **48h 초과 + status='pending' + 일반 expert → 409 Conflict** (마스터 재활사 전용)

### Constraints
- REQ-NF-012: HITL 피드백 ≤ 48h
- REQ-NF-029: 오진 치명 수정률 < 0.5%
- C-TEC-002 Route Handler
- **D4 명시**: 어드민 페이지 미존재, **Studio 1차 도구**
- R4: 사용자 알림 자녀 식별 정보 최소화
- CON-04 expert_comment 의료 용어 자동 검증 (REQ-FUNC-HITL-002)
- RLS: expert 역할 + 본인/미할당 큐만 수정

### **Depends on**: DB-009, DB-005, API-010 (인증), DB-011 (RLS)
### **Blocks**: FR-C-013, FR-C-014, MON-003

---

## 3. API-007 · `/api/b2b/approval` PATCH (P2, D8 Replace)

**Phase**: 🔴 P2 / **Mode**: 🔵 Replace (D8 적용 — 키즈노트 미연동 → 클립보드)

### 핵심 Files
- `app/api/b2b/approval/route.ts`
- `notification_drafts` 테이블 (별도 마이그레이션 또는 evaluation_results 보강)
- `b2b_approval_stats` (텔레메트리)

### Zod Input
```typescript
{
  notificationDraftId: z.string().uuid(),  // FR-C-017이 생성한 알림장 초안
  approved: z.boolean(),
  editedText: z.string().optional(),  // 교사 수정 시
  teacherId: z.string().uuid()
}
```

### Zod Output
```typescript
{
  success: boolean,
  clipboardText: string,  // ⭐ 키즈노트 붙여넣기용 (D8 핵심)
  wasEdited: boolean,  // REQ-FUNC-057 무수정율 측정
  approvedAt: ISO
}
```

### 인증
Supabase Auth + RLS — **teacher 또는 principal 역할만**

### 비즈니스 로직
1. 알림장 초안 → `notification_drafts` 저장
2. status='approved' 갱신
3. **clipboardText 생성** (Markdown 또는 Plain Text)
4. **무수정 카운트 통계 누적** (`b2b_approval_stats`) → REQ-FUNC-057 KPI

### 텔레메트리 일일 KPI
- `b2b_notification_approved`
- `b2b_notification_edited`
- 무수정율 일별 측정 → **REQ-FUNC-057 ≥ 90%**

### G/W/T (6 시나리오)
1. 정상 승인 + clipboardText 반환
2. 수정 후 승인 → editedText 반영, wasEdited: true
3. **무수정 승인율 측정** → 100건 중 90건 무수정 = 90% (목표 ≥90%)
4. 비교사 (parent) → 401/403
5. ⭐ **키즈노트 SDK 의존성 0건** (D8 검증)
6. clipboardText 형식: Plain Text 또는 Markdown, 자녀 본명 0건

### Constraints
- REQ-FUNC-057: 무수정 승인율 ≥ 90%
- D8 키즈노트 미연동
- R3: 교사 추가 업무 최소화
- R4: 알림장 자녀 본명 미포함 (childNickname만)
- CON-04: clipboardText 금칙어 검증

### **Depends on**: DB-003, API-010, FR-C-017 (알림장 초안)
### **Blocks**: TEST-012, MOCK-003

---

## 4. API-008 · `/api/consent/sign` POST/GET/PATCH (P2, 단순화 ⭐ 신규)

**Phase**: 🔴 P2 / **Mode**: 단순화 / **Discope**: **검토 보고서 §2.2 [추가 E2]** — 모두싸인/카카오 미연동, **일반 웹 폼**

### 3개 엔드포인트

#### POST `/api/consent/sign` — 동의서 생성
- **인증**: principal 또는 admin
- **입력**: `{institutionId, parentEmail, parentPhone, childNickname, childAgeMonths}`
- **DB-010 INSERT** + **token UUID v4** 생성
- **응답**: `{signatureToken, signUrl: '/consent/[token]', expiresAt}`

#### GET `/consent/[token]` — 서명 페이지 데이터
- **인증 불필요** (token 자체가 인증)
- **DB-010 조회**
- **응답**: `{consentText, expiresAt, status, alreadySigned}`

#### PATCH `/api/consent/sign/confirm` — 서명 완료
- **입력**: `{token, agreed: boolean, signedName: string}`
- ⭐ **IP + UserAgent 추출** (`request.headers`)
- **DB-010 UPDATE**: `signedAt, signedIp, userAgent, status='signed'`
- **부모 이메일 확인 발송** (Resend, 카카오 미연동)

### ⭐ 보안 4중 (검토 §2.2 [추가 E2])
- token **UUID v4** (예측 불가)
- **HTTPS** 강제 (Vercel 기본)
- **Rate Limit** — 동일 token 1분 내 5회
- **CSRF 보호** — POST/PATCH SameSite cookie

### 7일 만료 + 철회 흐름
- **PATCH `/api/consent/rescind`**: status='rescinded', rescindedAt 갱신
- 추후 데이터 수집 RLS 차단 (GDPR/개인정보보호법 준수)
- FR-C-018 Cron 7일 만료 처리

### G/W/T (6 시나리오)
1. 동의서 생성 → token + signUrl
2. 서명 완료 → IP·UserAgent 저장 + 이메일 확인
3. 만료 token (8일+) → 410 Gone
4. ⭐ **카카오 SDK 의존성 0건** 검증
5. **Rate Limit**: 1분 6번째 → 429
6. **철회**: status='rescinded' + 데이터 수집 차단

### Constraints
- REQ-FUNC-059: 카카오 → **일반 웹 폼 대체**
- R4: 자녀 식별 정보 미포함
- ⭐ **법적 효력 보존**: IP, UserAgent, **consentText 스냅샷** + 타임스탬프
- HTTPS + CSRF + Rate Limit
- 철회 권리 — GDPR/개인정보보호법
- G2 비용: **Resend Free 100/일**

### **Depends on**: DB-010, API-010, API-012 (Resend 어댑터)
### **Blocks**: FR-C-018, SEC-003

---

## ⭐ 4 API 인증 패턴 통합

| API | 인증 방식 | 주체 |
|---|---|---|
| API-005 (이전 ingest) | **Bearer ${INTERNAL_API_SECRET}** | 내부 Server Action 호출 (FR-C-002) |
| **API-006** | **Supabase Auth + RLS** | expert/admin 역할 |
| **API-007** | **Supabase Auth + RLS** | teacher/principal 역할 |
| **API-008 GET** | **Token 자체 인증** (UUID v4) | 부모 (인증 불필요) |
| **API-008 POST** | Supabase Auth | principal/admin |
| **API-008 PATCH** | Token 검증 | 부모 |

→ 본 4종이 **API 인증 패턴 4종 (Bearer / Auth+RLS / Token / Token+CSRF)** 의 정본 표본.

## ⭐ 4 API의 Descope 적용 정합

| Descope | API 적용 | 핵심 단순화 |
|---|---|---|
| **D4** (HITL Realtime → Slack + Studio) | **API-006** | Studio가 1차 도구, API는 fallback. PostgreSQL 트리거로 자동 sync. Resend 사용자 알림 |
| **D8** (키즈노트 → 클립보드) | **API-007** | 키즈노트 SDK 의존성 0. clipboardText 응답. 무수정율 ≥90% KPI |
| **검토 §2.2 [추가 E2]** (카카오 → 일반 웹 폼) | **API-008** | UUID token + IP/UA/timestamp 법적 효력. Resend 이메일 확인. 7일 만료 + 철회 |
| (없음) | API-002 | 명세대로 (멱등성 강화) |

→ 4 API 중 **3개가 Replace 모드**. 본 ingest로 **8 Descope 중 D4·D8·검토 §2.2** 의 시스템 차원 구현 정본 완성.

## ⭐ 새 도구 도입 (4 API)

| 도구 | 도입 API | 용도 |
|---|---|---|
| **Resend** (Free 100/일) | API-006 + API-008 | 부모 알림 / 동의 확인 이메일 |
| Sendgrid Free (옵션) | API-006 | Resend Fallback |
| **PostgreSQL 트리거** | API-006 | Studio UPDATE → evaluation_results 자동 sync |
| `notification_drafts` 테이블 | API-007 | 알림장 초안 저장 (별도 마이그레이션) |
| `b2b_approval_stats` 테이블 | API-007 | 무수정율 KPI 측정 |

## 환경변수 추가 1종

- `RESEND_API_KEY` (또는 `SENDGRID_API_KEY` Fallback)

→ Sprint 1 환경변수 9-11종 + **API 의존 보강 1종 = 10-12종**.

## 인용 가능 위치

| Task | 원본 | 줄 수 |
|---|---|---|
| API-002 | TASK_API-002.md | 87줄 |
| API-006 | TASK_API-006.md | 96줄 |
| API-007 | TASK_API-007.md | 99줄 |
| API-008 | TASK_API-008.md | 103줄 |

## Clinical cross-link

- **API-006의 expertId 검증 + 어뷰징 방어** = [[clinical/concepts/한국-언어치료-트랙비교]] § 1급/2급 자격제도 의 **디지털 운영 윤리**. 동일 전문가가 동일 부모 반복 검토 → 임상 객관성 침해 방지.
- **API-007 자녀 본명 0건** (childNickname만) = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 평가 기록 윤리의 디지털 강제. 임상 평가 보고서에서도 식별 정보 최소화 원칙.
- **API-008의 consentText 스냅샷 + IP/UA/timestamp** = 임상 평가 동의서의 디지털 변형. [[clinical/concepts/언어발달지연]] § 평가 동의 절차의 e-Consent 형태. **GDPR + 개인정보보호법** 준수.
- **API-002 멱등성 (동일 입력 → 동일 출력)** = 적응형 난이도 추천의 **재현성** 보장. 임상 표준 검사 ([[clinical/entities/U-TAP]]) 의 reliability 원칙과 동등.

## 관련 product 페이지

- [[product/sources/TASKS-Sprint-1-Remaining-Detail]] (MOCK-002/003 정본 — 본 4 API의 픽스처)
- [[product/sources/TASKS-Sprint-1-Dependent-Detail]] (API-005 외 의존 7)
- [[product/sources/TASKS-Sprint-1-Core-Detail]] (코어 8)
- [[product/concepts/task-breakdown-overview]] (Sprint 1 게이트)
- [[product/concepts/MVP-descope-plan]] § D4·D8·검토 §2.2 [추가 E2]
- [[product/concepts/architecture-decisions]] § ADR-02 (HITL) + ADR-04 (의료 용어 배제)

## 보강 필요
- **API-005 + API-006 통합** = HITL 자동 이관 + 코멘트 입력 = HITL 시스템 완전화. [[product/sources/TASKS-Sprint-1-Remaining-Detail]] 와 본 source 결합 후 별도 **HITL 시스템 흐름** concept 페이지 후보.
- **`docs/hitl-operations.md`** (API-006의 Supabase Studio 가이드) — 별도 정독 가치.
- API-002의 **seeded random 알고리즘** 미명시 — 멱등성 보장 메커니즘 디테일.
- **`notification_drafts` 테이블 스키마** (API-007 의존) — DB-XXX 별도 task 추가 필요? 기존 evaluation_results 보강 옵션?
- **모두싸인 도입 시 swap 가능 인터페이스** (API-008) — 향후 P3+ 마이그레이션 가이드.
