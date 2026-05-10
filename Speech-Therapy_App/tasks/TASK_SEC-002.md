---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Security] SEC-002: RBAC + RLS + Audit Log 통합 검증 + 침투 테스트"
labels: 'phase:p1, mode:active, domain:sec, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: SEC-002
- **Epic / Story**: Foundation 보안
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: API-010(Middleware RBAC) + DB-011(Supabase RLS) + audit_log를 통합 검증. 역할 우회 시도·SQL 인젝션·세션 탈취 침투 테스트 자동화. R4 영유아 데이터 보호의 최종 방어선.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-NF-019 (RBAC + RLS + Audit Log)
  - R4 (영유아 음성 무단 수집/유출)
- **Task 강화판**: §3-7 SEC-002

## ✅ Task Breakdown
- [ ] **통합 검증 — `__tests__/security/rbac-rls.test.ts`**:
  - 시나리오 1: parent X가 parent Y의 evaluation_results 조회 시도 → 0 rows (RLS 차단)
  - 시나리오 2: parent → /admin 진입 시도 → 403 또는 리다이렉트 (Middleware)
  - 시나리오 3: parent가 직접 Supabase REST API 호출 → RLS 차단 (Middleware 우회 보호)
  - 시나리오 4: expert가 다른 사용자 hitl_queue UPDATE → 권한 없음
  - 시나리오 5: admin은 모든 row 접근 가능
  - 시나리오 6: 익명 사용자가 RLS 우회 시도 → 0 rows
- [ ] **침투 테스트 — `__tests__/security/penetration.test.ts`**:
  - SQL 인젝션 — 모든 입력 필드에 `' OR '1'='1` 시도 → Zod/Prisma 차단
  - XSS — `<script>alert(1)</script>` 입력 → React 자동 escape 검증
  - CSRF — Server Action에 외부 도메인 요청 → SameSite cookie 보호
  - JWT 탈취 — 만료된 토큰 사용 → 401
  - Brute force — Magic Link 무한 요청 → Rate Limiter 차단
- [ ] Audit Log 검증:
  - 모든 UPDATE/DELETE → audit_log 1건 INSERT 자동
  - actor_id 정확성
  - 7일+ 보관 (장기 분석)
- [ ] OWASP Top 10 자동 스캔 (옵션):
  - `npm audit` CI 통합
  - Snyk Free 또는 GitHub Dependabot
- [ ] 침투 테스트 정기 실행:
  - GitHub Actions weekly cron
  - 결과 README + Slack
- [ ] 보안 정책 문서 (`docs/security-policy.md`):
  - 역할 권한 매트릭스
  - 침투 테스트 시나리오 카탈로그
  - 사고 대응 절차

## 🧪 Acceptance Criteria
**Scenario 1: RBAC 통합 검증 (REQ-NF-019)**
- **Given**: parent / teacher / principal / expert / admin 5종 역할
- **When**: 각자 보호 경로 진입
- **Then**: 권한 매트릭스대로 분기 (parent → /dashboard 가능, /admin 차단 등)

**Scenario 2: RLS 우회 차단 (R4)**
- **Given**: parent X 인증
- **When**: SELECT * FROM evaluation_results (다른 사용자 의도)
- **Then**: 0 rows (RLS 자동 적용)

**Scenario 3: SQL 인젝션 차단**
- **Given**: 입력 `' OR '1'='1`
- **When**: Server Action
- **Then**: Zod 검증 실패 (또는 Prisma 매개변수 바인딩으로 안전)

**Scenario 4: XSS 차단**
- **Given**: 입력 `<script>`
- **When**: 렌더
- **Then**: React 자동 escape, 스크립트 실행 0건

**Scenario 5: CSRF 차단**
- **Given**: 외부 도메인의 fetch with credentials
- **When**: Server Action 호출
- **Then**: SameSite cookie로 차단

**Scenario 6: Audit Log 자동 INSERT**
- **Given**: 임의 UPDATE
- **When**: PostgreSQL 트리거
- **Then**: audit_log 1건 INSERT, actor_id 정확

**Scenario 7: OWASP 스캔 0 critical**
- **Given**: `npm audit`
- **When**: CI 실행
- **Then**: critical 0건 (high는 7일 내 패치 의무)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019**: RBAC + RLS + Audit Log
- **R4**: 영유아 데이터 보호 — 침투 테스트로 강제 검증
- **횡단 제약**:
  - [ ] 모든 신규 Server Action·Route Handler는 침투 테스트 시나리오 추가 의무
  - [ ] 격리 — Production 데이터에 침투 테스트 금지 (Preview/Dev만)
- **G2 비용 가드**: Snyk Free 또는 GitHub Dependabot 무료

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] RBAC 6/6 + 침투 5/5 통과
- [ ] Audit Log 자동 동작 검증
- [ ] OWASP CI 통합 + critical 0건
- [ ] 보안 정책 문서 작성
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-NF-019 + R4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-010 (Middleware RBAC), DB-011 (RLS + Audit Log), DB-002~010 (모든 테이블)
- **Blocks**: P1 합격 게이트
- **Discope 영향**: 해당 없음
