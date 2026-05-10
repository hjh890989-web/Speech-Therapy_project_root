---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Route Handler] API-008: /api/consent/sign (POST) — 일반 웹 동의 폼 (단순화)"
labels: 'phase:p2, mode:active, domain:api, epic:f10'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-008
- **Epic / Story**: F10 학부모 전자서명 / S4
- **Phase**: 🔴 P2
- **Mode**: 단순화 (검토 보고서 §2.2 [추가 E2] — 모두싸인 미연동, 일반 웹 폼)
- **Discope 적용**: 검토 보고서 §2.2 [추가 E2]
- **목적**: SRS는 카카오 전자서명을 명시했으나, 검토 보고서 권고대로 **일반 웹 동의 폼(체크박스 + IP/UserAgent/타임스탬프 로깅)** 으로 단순화. 법적 효력은 모두싸인 등 솔루션 도입 전까지 충분.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.5 API Overview — `app/api/consent/sign` (POST, 카카오톡 연동)
  - REQ-FUNC-059~061 (서명 라이프사이클)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-2 API-008 (단순화)
- **검토 보고서**: §2.2 [추가 E2]

## ✅ Task Breakdown
- [ ] `app/api/consent/sign/route.ts` (POST + GET)
- [ ] **POST — 동의서 생성**:
  - 입력 Zod: `{institutionId, parentEmail, parentPhone, childNickname, childAgeMonths}`
  - 인증: principal 또는 admin
  - DB-010 INSERT → token 생성
  - 결과: `{signatureToken, signUrl: '/consent/[token]', expiresAt}`
- [ ] **GET — 서명 페이지 데이터** (`/consent/[token]/route.ts` 또는 별도):
  - 인증 불필요 (token 자체가 인증)
  - 입력: token (URL param)
  - DB-010에서 token으로 조회
  - 결과: `{consentText, expiresAt, status, alreadySigned}`
- [ ] **PATCH — 서명 완료** (별도 라우트 `/api/consent/sign/confirm`):
  - 입력: `{token, agreed: boolean, signedName: string}`
  - IP, UserAgent 추출 (`request.headers`)
  - DB-010 UPDATE (signedAt, signedIp, userAgent, status='signed')
  - 카카오 알림톡 미연동 → 부모에게 이메일 확인 발송 (Resend)
- [ ] 보안:
  - token UUID v4 (예측 불가)
  - HTTPS 강제 (Vercel 기본)
  - Rate Limit — 동일 token 1분 내 5회 제한
  - CSRF 보호 (POST/PATCH는 SameSite cookie)
- [ ] 7일 만료 처리 (FR-C-018 Cron 통합)
- [ ] 사용자 철회 흐름:
  - 별도 PATCH `/api/consent/rescind`
  - status='rescinded', rescindedAt 갱신
  - 추후 데이터 수집 차단 (RLS와 통합)

## 🧪 Acceptance Criteria
**Scenario 1: 동의서 생성 (REQ-FUNC-059)**
- **Given**: principal 인증 + 부모 이메일
- **When**: POST `/api/consent/sign`
- **Then**: token 발급 + signUrl 반환

**Scenario 2: 서명 완료**
- **Given**: 유효 token + agreed=true
- **When**: PATCH confirm
- **Then**: status='signed', IP·UserAgent 저장, 부모 이메일 확인 발송

**Scenario 3: 만료된 token 차단**
- **Given**: 8일 전 token
- **When**: GET 또는 PATCH
- **Then**: 410 Gone

**Scenario 4: 카카오 미연동 (검토 보고서 §2.2)**
- **Given**: 코드 검사
- **When**: 카카오 SDK 검색
- **Then**: 의존성 0건

**Scenario 5: Rate Limit**
- **Given**: 동일 token 1분 내 6번째 요청
- **When**: 호출
- **Then**: 429 Too Many Requests

**Scenario 6: 철회 흐름**
- **Given**: signed row
- **When**: 사용자 철회 요청
- **Then**: status='rescinded' 후 데이터 수집 RLS로 차단

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-059**: 카카오 → 본 태스크는 일반 웹 폼으로 대체
- **R4**: 자녀 식별 정보 미포함
- **횡단 제약**:
  - [ ] **법적 효력**: IP, UserAgent, consentText 스냅샷 + 타임스탬프 보존
  - [ ] HTTPS, CSRF, Rate Limit 보호
  - [ ] 철회 권리 — GDPR/개인정보보호법 준수
- **G2 비용 가드**: Resend Free 100/일

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] `tsc --strict` 0 errors
- [ ] 카카오 의존성 0 검증
- [ ] 서명 → 이메일 확인 1회 발송 검증
- [ ] 7일 만료 + 철회 시뮬 통과
- [ ] PR 본문에 REQ-FUNC-059~061 + 검토 §2.2 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-010 (consent_signatures), API-010 (인증), API-012 (Resend 어댑터)
- **Blocks**: FR-C-018 (서명 발송 + 리마인더), SEC-003 (전자서명 보안)
- **Discope 영향**: 검토 §2.2 — 모두싸인 미연동, 일반 웹 폼 단순화. B2B 5건 후 모두싸인 도입 시 swap 가능 인터페이스
