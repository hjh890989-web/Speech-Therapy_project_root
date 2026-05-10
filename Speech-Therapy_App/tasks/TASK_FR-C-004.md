---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-004: 음성 7일 폐기 정책 — Sprint 1엔 음성 미저장 (D6 적용)"
labels: 'phase:p0, mode:active, domain:fr-c, epic:f1-a, sprint:2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-004
- **Epic / Story**: F1-a / S1 (보안·비용 가드)
- **Phase**: 🟢 P0
- **Mode**: 단순화 (D6 적용 — 음성 미저장 정책)
- **Discope 적용**: D6 (pgvector 영구 보관 미적용 + 음성 미저장)
- **목적**: Sprint 1엔 클라이언트 측 STT만 사용 → Supabase Storage에 음성 파일 미저장. 따라서 7일 폐기 Cron은 No-op로 유지하되, 향후 P2 음성 저장 도입 시 즉시 활성화 가능한 인프라(라우트, 스케줄, 권한)만 사전 구축.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-005 (≤7일 폐기, 벡터 영구 보관)
  - REQ-NF-016 (Storage 보관 ≤ 7일)
  - CON-03 (음성 ≤7일 폐기)
  - R4 (영유아 음성 무단 수집·유출 리스크)
- **Task 강화판**: §3-5 FR-C-004 (단순화 모드)
- **검토 보고서**: §1.2 [추가 D6], §3.2 [비용 함정 1] (Storage 1GB 무료 티어 보호)

## ✅ Task Breakdown
- [ ] **Sprint 1 정책 명문화** — README + 코드 주석에 "음성 파일은 클라이언트 측 STT 후 즉시 폐기, 서버 전송 없음" 명시
- [ ] Supabase Storage 버킷 `audio` 생성 (현재 비어있음, P2 대비)
- [ ] 버킷 RLS 정책 설정:
  - 익명 업로드 차단
  - authenticated 사용자만 자기 파일 업로드 가능
  - admin 역할만 삭제 가능
- [ ] `app/api/cron/audio-cleanup/route.ts` 스켈레톤 작성:
  - GET 핸들러 + Vercel Cron 인증 헤더 검증 (`Authorization: Bearer ${CRON_SECRET}`)
  - 현재 로직: Storage 리스트 조회 → 7일 초과 파일 삭제 (Sprint 1엔 0건 발견 → No-op)
  - 결과 JSON 응답: `{deletedCount: 0, durationMs: ...}`
- [ ] `vercel.json`에 cron 등록: `{"crons": [{"path": "/api/cron/audio-cleanup", "schedule": "0 3 * * 0"}]}` (매주 일요일 03:00 UTC)
- [ ] `CRON_SECRET` 환경 변수 등록 (Vercel Dashboard)
- [ ] TODO 주석: "P2 음성 저장 활성화 시 본 라우트가 자동 활성. 사전 검증 1회 필요"

## 🧪 Acceptance Criteria
**Scenario 1: Sprint 1 정책 — 음성 미저장**
- **Given**: 진단 페이지에서 사용자가 발화
- **When**: Web Speech API → 텍스트 변환 → `analyzeDiagnosis()` Server Action 호출
- **Then**: Supabase Storage `audio` 버킷에 0개 파일 (서버 측 미저장 검증)

**Scenario 2: Cron 스켈레톤 정상 동작**
- **Given**: Vercel Cron 트리거 (또는 수동 GET 호출 + CRON_SECRET)
- **When**: `/api/cron/audio-cleanup` GET
- **Then**: 200 OK, 응답 `{deletedCount: 0}`, 로그 "0 files cleaned"

**Scenario 3: Cron 인증 (보안)**
- **Given**: `CRON_SECRET` 헤더 누락 또는 잘못된 값
- **When**: 외부에서 호출
- **Then**: 401 Unauthorized

**Scenario 4: Storage 버킷 RLS 검증**
- **Given**: 익명 사용자
- **When**: Storage `audio` 버킷에 파일 업로드 시도
- **Then**: 403 Forbidden

## ⚙️ Technical & Non-Functional Constraints
- **CON-03**: 음성 ≤7일 폐기 — Sprint 1엔 미저장이라 자동 충족
- **REQ-NF-016**: Storage 보관 ≤ 7일
- **R4 보호**: 영유아 음성 서버 미저장 → 유출 영향 0
- **R8 보호**: Supabase Free 1GB Storage — 미저장 정책으로 즉시 보호
- **횡단 제약**:
  - [ ] **G6 비용 가드**: 클라이언트 측 STT만 → Storage 비용 $0
  - [ ] **CON-03 7일 폐기**: P2 활성화 시 즉시 동작 가능한 라우트 사전 구축

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Cron 스켈레톤 Vercel Production 배포 + 1회 실행 검증 (수동)
- [ ] CRON_SECRET 환경 변수 등록 + 로그에 마스킹
- [ ] `tsc --strict` 0 errors
- [ ] Supabase Storage 버킷 RLS 정책 검증 (anonymous 차단 확인)
- [ ] P2 활성화 가이드 README 추가
- [ ] PR 본문에 REQ-FUNC-005 + CON-03 + D6 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-004 (session_logs 메타), INFRA-001 (Vercel Cron 슬롯 + CRON_SECRET 환경 변수)
- **Blocks**: P2 음성 저장 활성화 (FR-C-015 Zero-touch와 연결)
- **Discope 영향**: D6 적용 — Sprint 1엔 음성 미저장 = Cron 실질 No-op. 라우트·스케줄·권한만 P2 대비 사전 준비
