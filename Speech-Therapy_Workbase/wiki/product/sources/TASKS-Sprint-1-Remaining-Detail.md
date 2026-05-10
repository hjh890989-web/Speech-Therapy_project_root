---
type: source
pillar: product
title: Sprint 1 의존 잔여 4 Task — API-005 + MOCK-001/002/003
source_path: ../../../raw/TASKS/TASK_API-005.md
source_path_b: ../../../raw/TASKS/TASK_MOCK-001.md
source_path_c: ../../../raw/TASKS/TASK_MOCK-002.md
source_path_d: ../../../raw/TASKS/TASK_MOCK-003.md
source_type: task_detail
authors: []
year: 2026
ingested: 2026-05-09
tags: [Sprint1, RouteHandler, Mock, GracefulDegradation, D4, D8, 클러스터TASKS]
---

# Sprint 1 의존 잔여 4 Task — API-005 + MOCK 3종

[[product/sources/TASKS-Sprint-1-Core-Detail]] (코어 8) + [[product/sources/TASKS-Sprint-1-Dependent-Detail]] (의존 7) 의 **누락 고리**를 채우는 4 task 정독.

## 의존성 매핑

| 코어/의존 | 의존하는 task | 본 ingest |
|---|---|---|
| FR-C-002 (P1) | API-005 | ⭐ HITL 자동 이관 흐름 완전화 |
| FR-Q-001/002 + TEST-001/004 | MOCK-001 | ⭐ Sprint 1 P0 핵심 픽스처 |
| FR-C-009 + TEST-009 | MOCK-002 (grantReward 부분) | P0 (curriculum 부분은 P1) |
| FR-Q-008 + FR-C-013/014/017/018 + TEST-014 | MOCK-003 | P1 전체 (Sprint 1 미사용) |

## 1. API-005 · /api/hitl/queue (POST) — D4 Replace (P1)

**Phase**: 🟡 P1 / **Mode**: 🔵 Replace (D4 적용 — Realtime → Slack + Supabase Studio)

### 핵심 Files
- `app/api/hitl/queue/route.ts` (Route Handler)

### POST 핸들러 흐름
1. **Zod 검증**: `{sessionId, userId, confidenceScore}`
2. **DB-009 INSERT**: hitl_queue에 row + `slaDueAt = now + 48h`
3. **Slack 웹훅 발송** (D4 핵심):
   - SLACK_WEBHOOK_URL 환경변수
   - 메시지: `:warning: HITL 검토 필요 — sessionId: {id}, confidence: {score}, SLA: {dueAt}`
   - **Supabase Studio 링크** 첨부 (수동 운영 도구)

### 응답 스키마
```typescript
{
  success: boolean,
  queueId: string,
  slaDueAt: ISO string,
  slackNotified: boolean  // 웹훅 성공 여부
}
```

### 인증
**`Authorization: Bearer ${INTERNAL_API_SECRET}`** — 내부 호출만 (FR-C-002에서 직접 호출, Server Action 우회 패턴)

### Rate Limit
**동일 sessionId 1분 내 재시도 차단** (429 Too Many Requests)

### G/W/T (6 시나리오)
1. 정상 등록 + Slack → DB row + Slack 1건, `slackNotified: true`
2. 인증 실패 → 401
3. 입력 검증 실패 → 400 + ZodError
4. 중복 sessionId → 409 + 기존 queueId
5. **Slack 실패 graceful**: DB INSERT 성공, `slackNotified: false`, 200 OK
6. 1분 내 재시도 → 429

### Constraints
- REQ-FUNC-HITL-001: 즉시 이관 (Slack 웹훅 ≤ 2초)
- REQ-NF-012: 48h SLA
- C-TEC-002 Route Handler (Server Action 아닌 이유: **내부 API 호출 인증 분리**)
- **D4 명시**: Realtime 미사용
- R4: Slack 메시지에 자녀 식별 정보 미포함 (sessionId만)

### **Depends on**: DB-009, INFRA-001 (SLACK_WEBHOOK_URL + INTERNAL_API_SECRET)
### **Blocks**: FR-C-002, MOCK-003

> ⚠️ **API-005가 Sprint 1 코어 8 의존성의 누락 고리**: FR-C-002 (P1)의 `enqueueForReview` → API-005 → Slack. Sprint 1 합격은 FR-C-002 미구현 가능 (P1)이지만, FR-C-001의 `requiresHITL=true` 응답까지는 Sprint 1 검증 필요.

---

## 2. MOCK-001 · analyzeDiagnosis 3종 Mock (P0) ⭐ Sprint 1 핵심 픽스처

**Phase**: 🟢 P0 / **Mode**: 명세대로 / **Discope**: 해당 없음

### 핵심 Files
- `lib/mocks/diagnosis.ts`

### 3종 Mock 응답

| Mock | 시나리오 | 핵심 값 |
|---|---|---|
| **mockSuccessHigh** | 정상 (상위) | 모든 점수 ≥ 80, peerPercentile 92, confidence 95, **requiresHITL: false**, aiCushionText "또래의 상위 8% 안에 들어요" |
| **mockSuccessLow** | HITL 이관 트리거 | 점수 30~50, peerPercentile 25, confidence 65, **requiresHITL: true**, aiCushionText "조금 더 연습하면 좋아요" |
| **mockFailureSTT** | 실패 시뮬 | `throw new Error('STT_FAILED')` |

### 환경변수 분기
- **`USE_MOCK_DIAGNOSIS=true`** 시 실제 Gemini 호출 대신 Mock 반환
- ⭐ **Production 환경에서 강제 false** (보안)

### Query Param 시나리오 강제
`?mock=success-high|success-low|failure`

### 헬퍼: `getMockBySearchParam(searchParams)`

### G/W/T (5 시나리오)
1. 정상 Mock 반환 (USE_MOCK_DIAGNOSIS=true) — 실제 Gemini 0회 호출
2. HITL 이관 (`?mock=success-low`) — requiresHITL=true
3. 실패 (`?mock=failure`) — STT_FAILED throw
4. **스키마 100% 일치**: 3종 모두 OutputSchema.parse() 통과 (API-001 호환)
5. **Production 보호**: USE_MOCK_DIAGNOSIS 설정 무관 → 실제 Gemini

### Constraints
- API-001 Zod OutputSchema **100% 일치** (스키마 변경 시 동기화 필수)
- 격리: Production 강제 비활성화
- 보안: Mock 응답에도 `disclaimerRequired: true` 유지

### **Depends on**: API-001 (Zod 스키마)
### **Blocks**: FR-Q-001/FR-Q-002 (FE 선개발), TEST-001 (테스트 픽스처), TEST-004 (E2E Mock)

---

## 3. MOCK-002 · getCurriculum + grantReward 픽스처 (P1, but grantReward는 P0)

**Phase**: 🟡 P1 (단, **grantReward 부분은 P0** TEST-009 픽스처) / **Mode**: 명세대로

### 핵심 Files
- `lib/mocks/curriculum.ts`
- `lib/mocks/reward.ts`

### Curriculum Mock 4종 (P1)

| Mock | 트리거 | reason |
|---|---|---|
| `mockContinue` | 5세션 4 성공 | 'continue' (난이도 유지) |
| `mockLevelDown` | 3연속 실패 | 'level_down' (-1) |
| `mockLevelUp` | 5연속 성공 | 'level_up' (+1) |
| `mockPhonemeSwitch` | 음소 마스터 | 'phoneme_switch' (suggestedNextPhoneme) |

### Reward Mock 3종 (P0 — TEST-009)

| Mock | 시나리오 |
|---|---|
| `mockFirstReward` | 첫 보상 INSERT (cumulativeStars: 1) |
| `mockAccumulated` | 기존 +5 → cumulativeStars: 15 |
| `mockSkipped` | idempotency 충돌 (wasSkipped: true) |

### 데일리 미션 시드 (FE 선개발 정적 픽스처)
**4종 미션 (음소 ㅅ ㅈ ㄱ ㄴ × 난이도 1~3 = 12개) JSON** — DB-006 시드와 별도

### 환경변수
- `USE_MOCK_CURRICULUM=true`
- `USE_MOCK_REWARD=true`

### Query Param
`?mock-curriculum=continue|level-down|level-up|phoneme-switch`

### G/W/T (5 시나리오)
1. 정상 mock 반환 (curriculum)
2. **보상 멱등성 시뮬**: 동일 idempotencyKey 2회 → mockSkipped (wasSkipped: true)
3. **스키마 일치**: 4 curriculum + 3 reward = 7종 모두 OutputSchema 통과
4. Production 보호
5. **TEST-006/009 픽스처 활용** (Vitest import)

### Constraints
- API-002/004 Zod OutputSchema 100% 일치
- 격리: Production 강제 비활성화
- **콘텐츠 검수**: 미션 시드 instructionText 금칙어 0건

### **Depends on**: API-002, API-004
### **Blocks**: FR-Q-003 (P1), FR-C-008 (P1), TEST-006 (P1), TEST-007 (P1), **TEST-009 (P0)**

> ⚠️ **MOCK-002 grantReward 부분 = Sprint 1 P0**: TEST-009의 멱등성·동시성 검증을 실제 DB 호출 없이 픽스처로 시뮬. mockSkipped가 핵심.

---

## 4. MOCK-003 · HITL + B2B + Consent Mock (P1, D4+D8 단순화)

**Phase**: 🟡 P1 / **Mode**: 단순화 (D4 + D8 + D7 적용) / ⚠️ **Sprint 1 미사용**

### 9종 Mock (3 카테고리)

#### HITL Mock 4종 (D4)
- `mockQueueRegistered`: `{queueId, slaDueAt, slackNotified: true}`
- `mockQueueDuplicate`: 409 Conflict 시뮬
- `mockSlackFailed`: slackNotified: false (graceful degradation)
- `mockExpertCommentSuccess`: PATCH 응답 `{completedAt, userNotified: true}`

#### B2B Mock 2종 (D8 — 키즈노트 미연동)
- `mockApprovalSuccess`: 알림장 승인 + **클립보드 텍스트** 반환
- `mockApprovalRejected`: 거부 시나리오

#### Consent Mock 3종 (D7 — 카카오 미연동)
- `mockConsentSent`: **일반 웹 동의 폼 링크** 생성
- `mockConsentSigned`: 서명 완료 페이로드
- `mockConsentExpired`: 7일 초과 시뮬

### 환경변수 3종
- `USE_MOCK_HITL=true`
- `USE_MOCK_B2B=true`
- `USE_MOCK_CONSENT=true`

### G/W/T (6 시나리오)
1. HITL 큐 등록 mock — 실제 DB INSERT 0건, Slack 발송 0건
2. **HITL Slack 실패 시뮬 (graceful)**: slackNotified: false, 200 OK
3. B2B 승인 → 클립보드 텍스트 (D8)
4. 동의서 만료 시뮬 → "서명 기간 만료"
5. Production 보호
6. 스키마 일치 (API-005/006/007/008)

### Constraints
- D4·D8·D7 명시: Realtime/카카오/키즈노트 모두 Mock 시뮬
- R5 대비: 외부 API 정책 변경 영향 없음 (Mock이므로)
- 격리: Production 강제 비활성

### **Depends on**: API-005, API-006, API-007, API-008
### **Blocks**: FR-Q-008 (HITL 어드민 UI), FR-C-002 (HITL 트리거), FR-C-013/014, FR-C-017/018, TEST-014

> ⚠️ **MOCK-003은 Sprint 1 미사용**: 모든 트리거가 P1+. 단, Sprint 1엔 **API-005 + MOCK-001 + MOCK-002 grantReward 부분**까지 픽스처 완비됨.

---

## ⭐ Sprint 1 픽스처·Mock 환경변수 6종 (Mock 토글)

| Env Var | 토글 대상 | Sprint 1 활성? |
|---|---|---|
| **USE_MOCK_DIAGNOSIS** | analyzeDiagnosis (MOCK-001) | ✅ FE 선개발 |
| USE_MOCK_CURRICULUM | getCurriculum (MOCK-002) | (P1) |
| **USE_MOCK_REWARD** | grantReward (MOCK-002) | ✅ TEST-009 |
| USE_MOCK_HITL | API-005 (MOCK-003) | (P1) |
| USE_MOCK_B2B | API-007 (MOCK-003) | (P2) |
| USE_MOCK_CONSENT | API-008 (MOCK-003) | (P2) |

⭐ **모두 Production에서 강제 비활성** = 보안 + Mock 누출 방지.

## ⭐ HITL 자동 이관 전체 흐름 (정본 완전화)

```
[FR-C-001 분석 완료]
    confidence < 70 감지
        ↓
[FR-C-002 enqueueForReview]
    fetch('/api/hitl/queue', {
        Authorization: Bearer ${INTERNAL_API_SECRET},
        body: {sessionId, userId, confidenceScore}
    })
        ↓
[API-005 POST /api/hitl/queue]
    1. Zod 검증
    2. hitl_queue INSERT (slaDueAt = now+48h)
    3. Slack 웹훅 발송
    4. 응답: {queueId, slaDueAt, slackNotified}
        ↓
[graceful degradation]
    Slack 실패 → DB INSERT는 성공, slackNotified=false, 200 OK
    DB 실패 → 500 (사용자 응답에는 evaluation_results는 별도 저장됨)
        ↓
[사용자 UI]
    "전문가가 검토 중입니다 (≤48시간)" 박스
```

→ FR-C-002 + API-005 = **HITL 자동 이관 시스템 완성**.

## ⭐ 8 Descope ↔ Mock 시뮬 정합

| Descope | Mock 시뮬 | 검증 |
|---|---|---|
| **D4** (HITL Realtime → Slack) | MOCK-003 `mockQueueRegistered`, `mockSlackFailed` | API-005 graceful degradation |
| **D5** (PWA 오프라인 → 온라인) | MOCK-002 `mockSkipped` | TEST-009 멱등성 |
| **D7** (Edge → 클라이언트 STT) | MOCK-001 `mockFailureSTT` | TEST-001 STT 재시도 |
| **D8** (키즈노트 → 클립보드) | MOCK-003 `mockApprovalSuccess` (클립보드) | TEST-012 (P2) |

→ Mock 9 패턴이 8 Descope 의 **시뮬 검증 인프라**를 모두 커버.

## 인용 가능 위치

| Task | 원본 | 줄 수 |
|---|---|---|
| API-005 | TASK_API-005.md | 99줄 |
| MOCK-001 | TASK_MOCK-001.md | 79줄 |
| MOCK-002 | TASK_MOCK-002.md | 86줄 |
| MOCK-003 | TASK_MOCK-003.md | 92줄 |

## Clinical cross-link

- **API-005 Slack 메시지 자녀 식별 정보 미포함** (R4) = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 평가 동의 절차의 디지털 변형. **운영자 알림 채널에서도 영유아 정보 보호** 강제.
- **MOCK-001의 mockSuccessLow** (confidence 65, requiresHITL=true) = [[clinical/concepts/언어발달지연]] 의 **경계선 사례** 시뮬. 임상 표준 절단점과의 정합 검증 후속.
- **MOCK-002 데일리 미션 시드 음소 4종 (ㅅ ㅈ ㄱ ㄴ)** = [[clinical/entities/U-TAP]] 의 한국어 음운론 위계 (마찰음·파찰음·파열음·비음) 의 일부 표현.
- **MOCK-003 D8 키즈노트 미연동** = [[product/entities/persona-오한솔]] (유치원 원장) 의 학부모 동의서 자동화 시뮬. 임상 권고 → 클립보드 우회.

## 관련 product 페이지

- [[product/sources/TASKS-Sprint-1-Core-Detail]] (코어 8)
- [[product/sources/TASKS-Sprint-1-Dependent-Detail]] (의존 7)
- [[product/concepts/task-breakdown-overview]] (Sprint 1 합격 게이트)
- [[product/concepts/MVP-descope-plan]] § D4·D5·D7·D8 (Mock 시뮬 정합)
- [[product/concepts/architecture-decisions]] § ADR-02 HITL (API-005가 직접 구현)

## 보강 필요
- **API-002** (`getCurriculum()` DTO) — MOCK-002 의 직접 의존이지만 본 ingest 미포함.
- **API-006/007/008** — MOCK-003 직접 의존 (HITL Comment, B2B Approval, Consent Sign).
- API-005 의 **재시도 큐 운영 가이드** — Slack 실패 시 백그라운드 재시도 메커니즘 명세 미포함.
- MOCK-001/002/003 의 **시드 데이터 검수 가이드** — 콘텐츠 검수 (금칙어 0건) 자동화 도구 미명시.
