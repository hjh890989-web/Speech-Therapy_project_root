---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Security] SEC-003: 전자서명 보안 검증 — 일반 웹 폼 공격 대응 (단순화)"
labels: 'phase:p2, mode:active, domain:sec, epic:f10'
assignees: ''
---

## 🎯 Summary
- **Task ID**: SEC-003
- **Epic / Story**: F10 학부모 전자서명 보안
- **Phase**: 🔴 P2
- **Mode**: 단순화 (검토 §2.2 — 모두싸인 미연동, 일반 웹 폼 보안만)
- **Discope 적용**: 검토 §2.2 [추가 E2]
- **목적**: SRS의 카카오 전자서명을 일반 웹 동의 폼으로 단순화한 만큼, 그에 맞는 보안 검증을 자동화. (1) token 무차별 대입 방어 (2) IP/UA 위조 감지 (3) Replay 공격 방어 (4) 7일 만료 무결성. R4 영유아 데이터 보호의 법적 근거.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-059~061 (전자서명 라이프사이클)
  - REQ-NF-019 (RBAC + 보안)
  - R4 (영유아 음성 무단 수집/유출)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-7 SEC-003 (단순화)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §2.2 [추가 E2]

## ✅ Task Breakdown
- [ ] **token 보안**:
  - UUID v4 (예측 불가, 122-bit entropy)
  - URL 토큰만 노출, DB에는 별도 hash 저장 (선택 — 더 강한 보안)
  - 1회용 — 서명 후 status='signed' 시 동일 token 재사용 차단
- [ ] **무차별 대입 방어**:
  - Rate Limit — IP당 1분 5회, 10분 50회 (Upstash Rate Limit)
  - 5회 연속 실패 시 30분 차단 + Slack 알림
- [ ] **IP/UA 위조 감지** (선택, 의심 단계만):
  - signedIp가 동일 token 발송 시 사용된 IP 대역과 다르면 경고 로그
  - signedIp 국가가 한국 외이면 admin Slack 알림
- [ ] **Replay 공격 방어**:
  - PATCH 요청에 `nonce` 헤더 + DB 별도 저장
  - 동일 nonce 재사용 차단
- [ ] **HTTPS 강제** — Vercel 기본
- [ ] **CSRF** — SameSite cookie + Origin 헤더 검증
- [ ] **7일 만료 무결성**:
  - 서버 시간 기준 (클라이언트 위조 방지)
  - expiresAt < NOW() 시 PATCH 거부
- [ ] **Audit Log** (DB-011 통합):
  - 모든 sign/rescind 행위 → audit_log INSERT
  - signedIp, userAgent, timestamp 기록
- [ ] **자동 보안 스캔** (SEC-002와 통합):
  - 침투 테스트 시나리오 추가:
    - token 추측 (랜덤 UUID 1,000회)
    - 만료된 token 사용 시도
    - SameSite cookie 우회 시도
- [ ] 법적 근거 문서 (`docs/electronic-signature-legal.md`):
  - 서명 효력 근거 (signedIp + UA + timestamp + consentText 스냅샷)
  - 한국 전자서명법·개인정보보호법 부합성 검토
  - GDPR 철회 권리 절차

## 🧪 Acceptance Criteria
**Scenario 1: token 무차별 대입 방어**
- **Given**: IP X에서 5회 잘못된 token 시도
- **When**: 6번째
- **Then**: 30분 차단 + Slack 알림

**Scenario 2: 1회용 token**
- **Given**: 이미 서명된 token
- **When**: 재시도
- **Then**: 410 Gone

**Scenario 3: 만료 무결성**
- **Given**: 8일 전 token + 클라이언트 시간 위조 (1일 전)
- **When**: PATCH
- **Then**: 서버 시간 검증 → 410 Gone

**Scenario 4: Replay 공격**
- **Given**: 동일 nonce 재사용
- **When**: PATCH
- **Then**: 409 Conflict

**Scenario 5: Audit Log INSERT**
- **Given**: 정상 서명
- **When**: PATCH
- **Then**: audit_log 1건 (action='consent_signed', actor_ip, ua)

**Scenario 6: HTTPS 강제**
- **Given**: HTTP 호출
- **When**: 진입
- **Then**: HTTPS 자동 리다이렉트 (Vercel 기본)

**Scenario 7: 침투 테스트 통과**
- **Given**: SEC-002 침투 시나리오
- **When**: token 추측·만료 우회·CSRF 시도
- **Then**: 모두 차단

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-019 / R4**: 보안 + 영유아 데이터 보호
- **검토 §2.2**: 일반 웹 폼 → 자체 보안 강화 필수
- **횡단 제약**:
  - [ ] **법적 효력 보존** — IP, UA, timestamp, consentText 스냅샷
  - [ ] **GDPR/개인정보보호법** — 철회 권리, 보관 기간 명시
  - [ ] Audit Log + 모니터링

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 7가지 침투 시나리오 통과
- [ ] Audit Log 자동 INSERT 검증
- [ ] 법적 근거 문서 작성
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-059~061 + REQ-NF-019 + R4 + 검토 §2.2 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-008 (서명 API), DB-010 (consent_signatures), DB-011 (Audit Log + RLS), SEC-002 (침투 테스트 통합), SEC-004 (Rate Limiter)
- **Blocks**: P2 합격 게이트
- **Discope 영향**: 검토 §2.2 — 모두싸인 미연동. 일반 웹 폼의 보안 자체 강화로 법적 효력 확보
