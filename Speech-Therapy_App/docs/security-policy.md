# Speech-Therapy 보안 정책 (SEC-001 / SEC-002)

REQ-NF-019 (RBAC + RLS + Audit Log) + R4 (영유아 음성·식별정보 보호) 의 코드 레벨 명시.

---

## 1. R4 — 자녀 식별 정보 보호

### 정책

자녀 본명·생년월일·주소·전화번호 등 **개인 식별이 가능한 정보는 어떤 테이블에도 저장하지 않는다.**

허용되는 child 관련 필드:

| 필드 | 의미 | 식별 가능성 |
|---|---|---|
| `childAgeMonths` | 월령 (24~84) | 불가능 |
| `childNickname` | 별명 (1~20자) | 불가능 (자유 표현) |

### 강제 메커니즘

- `__tests__/security/schema-r4.test.ts` — Prisma schema 정적 분석
- CI 가 본 테스트를 매 PR 마다 실행 → 식별 컬럼 추가 시 자동 차단

---

## 2. CON-03 / D6 — 음성 미저장 정책

### Sprint 1 단계

- 음성 원본은 **클라이언트 측 Web Speech API** 에서 텍스트로 변환된 후 즉시 폐기
- 서버에는 **transcript 텍스트** 만 전송, 음성 binary 는 미전송
- `session_logs.audioVectorUri` 는 항상 `null` (DB 스키마는 P2 활성 가능하도록 nullable 컬럼만 보유)
- Supabase Storage `audio` 버킷은 Sprint 1엔 미운영 (생성 자체 선택 사항)

### 7일 폐기 cron (`/api/cron/audio-cleanup`)

FR-C-004 + INFRA-002 — Sprint 1엔 실질 No-op, P2 활성 시 즉시 동작.

1. `session_logs.audioVectorUri` 가 7일 이상 경과한 row → `null` 처리 (DB 컬럼 청소)
2. Supabase Storage `audio` 버킷 객체 중 `created_at < now - 7d` 삭제
3. `SUPABASE_SERVICE_ROLE_KEY` 미설정 시 → `storageStatus: "skipped_no_admin_client"` (graceful)
4. 버킷 미존재 시 → `storageStatus: "skipped_bucket_missing"` (graceful)

### Vercel Cron 등록 상태

- Hobby 플랜 슬롯 1개를 `hitl-monitor` 가 점유 → `audio-cleanup` 은 수동/Preview 호출만
- Pro 업그레이드 시 `vercel.json crons` 에 `{"path": "/api/cron/audio-cleanup", "schedule": "0 3 * * 0"}` (매주 일요일 03:00 UTC) 등록

### P2 활성 시 정책

- Supabase Storage `audio` 버킷에 7일간 보관 후 자동 삭제 (위 cron 그대로 동작)
- AES-256 암호화 (Supabase 기본)
- TLS 1.3 전송 (Vercel + Supabase 기본)
- 버킷 RLS: 익명 차단, authenticated 자기 파일만 업로드, admin/service_role 만 삭제

---

## 3. RBAC 권한 매트릭스

| 역할 | User SELF | Institution own | Class own | SessionLog own | EvaluationResult own | MissionCard | HITL queue | Audit Log |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **parent** | ✅ R/U | ✅ R | ✅ R | ✅ R/I | ✅ R/I | ✅ R | (subject) R | ❌ |
| **teacher** | ✅ R/U | ✅ R | ✅ R/W | — | — | ✅ R | — | ❌ |
| **principal** | ✅ R/U | ✅ R/U | ✅ R/W | — | — | ✅ R | — | ❌ |
| **expert** | ✅ R/U | — | — | — | (assigned only) R | ✅ R | (assigned) R/U | ❌ |
| **admin** | ✅ R/U/W | ✅ R/U/W | ✅ R/U/W | ✅ R/U/W | ✅ R/U/W | ✅ R/U/W | ✅ R/U/W | ✅ R |
| **service_role** (서버) | ✅ 모두 (RLS 우회) — Cron / Auth Trigger / 시드 |||||||| 

- R = SELECT, U = UPDATE, I = INSERT, W = ALL (SELECT/INSERT/UPDATE/DELETE)

### 강제 메커니즘 (Sprint 1 단계)

- DB-011 의 `enable_rls_policies` migration 이 PostgreSQL RLS 정책으로 강제
- `__tests__/security/rls-policies.test.ts` — migration SQL 정적 검증
- 본격 실 호출 검증은 API-010 (Supabase Auth) 구현 후 별도 PR

---

## 4. 침투 테스트 시나리오 카탈로그 (P1+ 작업)

### SQL Injection
- 모든 사용자 입력은 **Zod schema** 검증
- DB 액세스는 **Prisma 매개변수 바인딩** (raw SQL 사용 금지)
- 시나리오: `' OR '1'='1`, `; DROP TABLE`, UNION-based 등 → Zod 또는 Prisma 에서 차단

### XSS
- React 자동 escape (`<script>` 텍스트로 렌더, 실행 X)
- AI 응답은 추가로 lib/text-safety.ts sanitize 통과
- 시나리오: `<script>alert(1)</script>` → 렌더 시 텍스트로 표시

### CSRF
- Supabase Auth 의 SameSite=Lax cookie (API-010 후 적용)
- Server Action 은 동일 origin Only

### JWT 탈취
- Supabase Auth 의 short-lived JWT + refresh token
- 만료된 토큰 → 401 → /login 리다이렉트

### Rate Limit
- `/api/hitl/queue` in-memory rate limit (1분 내 동일 sessionId 차단)
- Magic Link / 회원가입 brute force 는 Supabase Auth 기본 보호

### OWASP Top 10
- `npm audit` CI (별도 PR — GitHub Actions)
- GitHub Dependabot 자동 PR

---

## 5. 사고 대응 절차 (보안 인시던트)

### 음성 누출 의심 시 (P2 음성 저장 활성 후 적용)

1. **즉시 (1시간 내)**:
   - Supabase Storage `audio` 버킷을 **비공개** 로 전환 (RLS All Deny)
   - Vercel 환경변수 `EMERGENCY_LOCKDOWN=true` 설정 → Server Action 이 모든 음성 처리 거부
2. **24시간 내**:
   - 영향 범위 산출 (audit_log + Vercel Logs 분석)
   - 영향 받은 사용자에게 이메일 알림 (Resend, API-012)
3. **72시간 내**:
   - 개인정보보호 위원회 신고 (해당 시)

### RLS 우회 의심 시

1. **즉시**: Supabase 대시보드에서 의심 사용자 anon key revoke
2. **24h 내**: audit_log 분석 + RLS 정책 재검토
3. 침투 테스트 단위 케이스 추가 → 회귀 방지

---

## 6. Discope 매핑

| 디스코프 | 적용 | 영향 |
|---|---|---|
| **D6** (음성 미저장) | Sprint 1 | SEC-001 의 실 음성 폐기 검증은 P2 활성 시 가동 |
| **D4** (HITL Realtime → Slack) | Sprint 1 | Slack 메시지에 자녀 식별 정보 미포함 강제 |
| **D7** (Edge Runtime 미사용) | Sprint 1 | 음성 binary 서버 전송 0건 |
| **67-D1** (카카오 미연동) | Sprint 1 | 외부 API 의존성 보안 0건 |

---

## 7. 강제 메커니즘 요약

| 메커니즘 | 어디 | 무엇을 막나 |
|---|---|---|
| Prisma schema 정적 분석 | `__tests__/security/schema-r4.test.ts` | R4 — 자녀 식별 컬럼 추가 |
| RLS migration 정적 검증 | `__tests__/security/rls-policies.test.ts` | RLS 활성화 누락 |
| Zod schema | `lib/schemas/*.ts` | SQL 인젝션 / 형식 미준수 입력 |
| `lib/text-safety.ts` + `lib/forbidden-words.ts` | 인라인 sanitize | CON-04 의료 단정 표현 |
| `proxy.ts` (P1) | Edge | 응답 본문 금칙어 후처리 |
| Supabase RLS | DB 레벨 | 역할별 row 격리 |
| `lib/cron-auth.ts` | Cron Route Handler | 외부 임의 호출 |
| `INTERNAL_API_SECRET` (API-005) | HITL queue | 내부 호출 인증 |
