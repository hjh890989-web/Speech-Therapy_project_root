---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Security] SEC-001: 음성 7일 폐기 + 암호화 검증 (D6 단순화)"
labels: 'phase:p1, mode:active, domain:sec, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: SEC-001
- **Epic / Story**: Foundation 보안
- **Phase**: 🟡 P1
- **Mode**: 단순화 (D6 적용 — Sprint 1엔 음성 미저장)
- **Discope 적용**: D6 (음성 미저장 정책)
- **목적**: SRS의 음성 7일 폐기 정책 + AES-256 암호화 + TLS 1.3 검증을 자동화. Sprint 1엔 음성 미저장이므로 본 태스크는 (a) 인프라 준비 + (b) P2 활성화 시 즉시 동작 가능한 검증 자동화 위주.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-NF-016 (음성 ≤ 7일 폐기)
  - REQ-NF-017 (TLS 1.3 + AES-256)
  - CON-03, R4
- **Task 강화판**: §3-7 SEC-001 (단순화)
- **검토 보고서**: §3.2 [비용 함정 1, G6 비용 가드]

## ✅ Task Breakdown
- [ ] **Sprint 1 정책 명문화** (FR-C-004 통합):
  - "음성 파일은 클라이언트 측 STT 후 즉시 폐기, 서버 전송 없음"
  - README + 코드 주석에 명시
- [ ] Supabase Storage `audio` 버킷 RLS 정책 검증:
  - 익명 업로드 차단
  - authenticated 사용자만 자기 파일 업로드
  - admin만 삭제 가능
- [ ] AES-256 검증 (Supabase 기본 — 검증 자동화):
  - Supabase 문서 기반 자동 적용 확인
  - 외부 보안 감사 시 증빙 자료 README
- [ ] TLS 1.3 검증:
  - SSL Labs 자동 스캔 (월 1회 GitHub Actions Cron)
  - Vercel + Supabase 모두 A+ 등급 확인
- [ ] 7일 폐기 검증 자동화 (P2 활성 시 동작):
  - `__tests__/security/audio-cleanup.test.ts` 통합 테스트
  - 7일+1일 경과 row 삭제 검증
  - audit_log 1건 INSERT 검증
- [ ] R4 보호 자동 검증:
  - DB 모든 테이블 schema 정적 분석 — 자녀 본명·생년월일 컬럼 0건
  - 발견 시 PR 차단
- [ ] 보안 사고 대응 가이드 (`docs/security-incident.md`):
  - 음성 누출 의심 시 1시간 내 모든 Storage 비공개화 절차
  - 사용자 알림 템플릿

## 🧪 Acceptance Criteria
**Scenario 1: Sprint 1 — 음성 미저장 (CON-03 자동 충족)**
- **Given**: 진단 페이지 발화
- **When**: Supabase Storage 검사
- **Then**: 0개 파일

**Scenario 2: Storage RLS 정책 — 익명 업로드 차단**
- **Given**: anonymous 사용자
- **When**: 업로드 시도
- **Then**: 403 Forbidden

**Scenario 3: TLS 1.3 SSL Labs A+ 등급**
- **Given**: 도메인 스캔
- **When**: 자동 GitHub Actions Cron
- **Then**: A+ 등급, 미만 시 Slack Alert

**Scenario 4: 7일 폐기 P2 시뮬 (REQ-NF-016)**
- **Given**: 8일 전 row + audio-cleanup Cron 실행
- **When**: Cron
- **Then**: row 삭제, audit_log INSERT

**Scenario 5: R4 — schema 자녀 본명 컬럼 0건**
- **Given**: prisma schema
- **When**: 정적 분석
- **Then**: `name`, `birthdate`, `address` 등 0건 (월령만 허용)

**Scenario 6: 사고 대응 가이드**
- **Given**: 보안 사고 시뮬
- **When**: 가이드 따라 1시간 내 대응
- **Then**: 모든 Storage 비공개 + 사용자 알림 발송

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-016/017**: 7일 폐기 + 암호화
- **CON-03, R4**: 음성·자녀 정보 보호
- **D6 적용**: Sprint 1엔 음성 미저장 → 자동 충족
- **횡단 제약**:
  - [ ] **R4 핵심**: schema 정적 분석으로 자녀 식별 컬럼 차단
  - [ ] G6 비용 가드: 클라이언트 측 STT → Storage 비용 0

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Storage RLS 정책 검증 통과
- [ ] SSL Labs 월 1회 자동 스캔
- [ ] 7일 폐기 통합 테스트 통과
- [ ] schema 정적 분석 CI 통합
- [ ] 보안 사고 대응 가이드 문서화
- [ ] PR 본문에 REQ-NF-016/017 + CON-03 + R4 + D6 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-004 (Cron 스켈레톤), DB-011 (RLS), INFRA-002 (Cron 인프라)
- **Blocks**: P2 음성 저장 활성화 시 즉시 동작
- **Discope 영향**: D6 — Sprint 1엔 음성 미저장. P2 활성화 시 본 태스크의 자동화 즉시 가동
