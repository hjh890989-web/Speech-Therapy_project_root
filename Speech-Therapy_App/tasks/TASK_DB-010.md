---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-010: consent_signatures 테이블 (학부모 전자서명)"
labels: 'phase:p2, mode:active, domain:db, epic:f10'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-010
- **Epic / Story**: F10 학부모 동의서 전자서명 / S4
- **Phase**: 🔴 P2
- **Mode**: 명세대로 (단순화 — 일반 웹 동의 폼으로 시작)
- **Discope 적용**: 검토 보고서 §2.2 [추가 E2] (모두싸인 등 전자서명 솔루션은 B2B 5건 후)
- **목적**: B2B 기관 도입 시 학부모 동의서(데이터 수집·활용 동의)를 전자서명으로 받고 추적. 카카오 알림톡 발송 → 일반 웹 동의 폼 → 서명 완료/만료 상태 관리.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-059 (카카오 전자서명 링크 발송)
  - REQ-FUNC-060 (서명 완료율 ≥ 85%, D+3 리마인더)
  - REQ-FUNC-061 (7일 초과 만료 + 재발송)
  - R4 (영유아 음성 수집 동의)
- **Task 강화판**: §3-1 DB-010
- **검토 보고서**: §2.2 [추가 E2] 모두싸인 별도 솔루션

## ✅ Task Breakdown
- [ ] `ConsentSignature` 모델 정의
- [ ] 필드:
  - `id String @id @default(uuid())`
  - `institutionId String`
  - `parentEmail String`
  - `parentPhone String?`
  - `childAgeMonths Int`
  - `childNickname String` (자녀 본명 미저장 — R4)
  - `consentText String` (동의 내용 본문 스냅샷 — 법적 효력)
  - `status ConsentStatus @default(pending)` — enum: `pending | signed | expired | rescinded`
  - `signatureToken String @unique` (URL 토큰)
  - `signedAt DateTime?`
  - `signedIp String?` (서명자 IP — 법적 추적)
  - `userAgent String?` (서명 시 브라우저 정보)
  - `expiresAt DateTime` (생성 시점 + 7일)
  - `remindersSentCount Int @default(0)`
  - `lastReminderAt DateTime?`
  - `rescindedAt DateTime?` (사용자 철회)
  - `createdAt DateTime @default(now())`
- [ ] FK: institution
- [ ] 인덱스:
  - `@@index([status, expiresAt])` (만료 임박 조회)
  - `@@index([institutionId, status])` (기관별 통계)
- [ ] 마이그레이션 `npx prisma migrate dev --name add_consent_signatures`
- [ ] 헬퍼 `lib/consent.ts`:
  - `createConsentSignature(institutionId, parentEmail, ...)` — token 생성
  - `signConsent(token, ip, userAgent)` — UPSERT signedAt
  - `expireConsents()` — 7일 초과 status='expired' 일괄 갱신

## 🧪 Acceptance Criteria
**Scenario 1: 동의서 생성 + token 발급**
- **Given**: institutionId + parentEmail
- **When**: `createConsentSignature()`
- **Then**: row 생성, status='pending', token UUID, expiresAt = +7d

**Scenario 2: 서명 완료**
- **Given**: pending row + 유효 token
- **When**: `signConsent(token, ip, userAgent)`
- **Then**: status='signed', signedAt 갱신, IP·UserAgent 저장

**Scenario 3: 7일 만료**
- **Given**: 8일 전 pending row
- **When**: `expireConsents()` (Vercel Cron 호출)
- **Then**: status='expired'

**Scenario 4: 자녀 본명 미포함 (R4)**
- **Given**: schema 정적 분석
- **When**: 검사
- **Then**: `childName`, `childBirthdate` 컬럼 0건 (childNickname, childAgeMonths만)

**Scenario 5: 사용자 철회**
- **Given**: signed row + 사용자 철회 요청
- **When**: status='rescinded'
- **Then**: 향후 데이터 수집 차단 (RLS와 통합)

**Scenario 6: 인덱스 활용 — 만료 임박**
- **Given**: 1,000건 누적
- **When**: `findMany({where: {status: 'pending', expiresAt: {lte: in24h}}})`
- **Then**: ≤ 50ms

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-059~061**: 전자서명 라이프사이클
- **R4**: 자녀 식별 정보 비저장 — childNickname, childAgeMonths만
- **횡단 제약**:
  - [ ] **법적 효력**: signedIp, userAgent, consentText 스냅샷 보존
  - [ ] **철회 권리**: rescindedAt 컬럼으로 GDPR/개인정보보호법 준수
- **R8 보호**: row 단위 작음, 1,000건 ≤ 100KB

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 마이그레이션 성공
- [ ] `tsc --strict` 0 errors
- [ ] R4 schema 검증 통과 (자녀 본명 컬럼 0건)
- [ ] PR 본문에 REQ-FUNC-059~061 + R4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001, DB-003 (institutions FK)
- **Blocks**: API-008 (consent sign Route), FR-C-018 (서명 발송 + 리마인더), SEC-003 (전자서명 보안)
- **Discope 영향**: 검토 보고서 §2.2 — 모두싸인 등 별도 솔루션은 B2B 5건 후 도입. Sprint 1엔 일반 웹 동의 폼
