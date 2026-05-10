---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[INFRA] INFRA-001: Vercel Pro 배포 + 환경 변수 + Cron 슬롯 확보"
labels: 'phase:p0, mode:active, domain:infra, epic:foundation, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: INFRA-001
- **Epic / Story**: Foundation (배포 인프라)
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Sprint 1 결과를 Vercel Pro에 배포하여 라이브 도메인 확보. 60s timeout(R7 대응) + Cron 8개 슬롯(향후 4종 운용 대비) + 환경 변수 분리 + Git 자동 배포 셋업.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - C-TEC-007 (Vercel 단일화, Git Push 자동 배포)
  - REQ-NF-007 (Uptime ≥ 99.9%)
  - R7 (Vercel Timeout 10~60s 대응)
- **Task 강화판**: §3-7 INFRA-001
- **검토 보고서**: §3.2 [비용 함정 1, 2] (Storage 7일 폐기, Cron 한도)

## ✅ Task Breakdown
- [ ] GitHub 레포 생성 (private 권장 — `.env*` 보호)
- [ ] Vercel 계정 + Pro 플랜 활성화 ($20/월)
  - 근거: 60s Function timeout + Cron 8개 슬롯 (Hobby는 1개 한도)
- [ ] Vercel 프로젝트에 GitHub 레포 연결 (자동 배포 활성화)
- [ ] 환경 변수 등록 (Vercel Dashboard → Settings → Environment Variables):
  - `DATABASE_URL` (Supabase Pooling URL)
  - `DIRECT_URL` (Supabase Direct URL — 마이그레이션용)
  - `GEMINI_API_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (서버 측만)
  - `SLACK_WEBHOOK_URL` (HITL 대체용 — D4)
- [ ] Production / Preview / Development 환경 분리 (각 변수별)
- [ ] `vercel.json`에 함수 timeout 60초 명시 (`{"functions": {"app/actions/**": {"maxDuration": 60}}}`)
- [ ] Git push → main 자동 Production 배포 검증
- [ ] PR → Vercel Preview 자동 생성 검증
- [ ] 커스텀 도메인 연결 (선택, 가용 시)
- [ ] README에 배포 가이드 + 환경 변수 목록 작성

## 🧪 Acceptance Criteria
**Scenario 1: Git push → 자동 배포**
- **Given**: main 브랜치에 코드 푸시
- **When**: GitHub Actions / Vercel Webhook 트리거
- **Then**: Production 배포 성공, 라이브 URL 접근 가능

**Scenario 2: Pull Request → Preview**
- **Given**: PR 생성
- **When**: Vercel 빌드
- **Then**: Preview URL 생성, PR 코멘트 자동 게시

**Scenario 3: 환경 변수 분리**
- **Given**: Production 환경
- **When**: 함수 실행 시 `process.env.GEMINI_API_KEY` 접근
- **Then**: Production 키만 노출, Preview/Dev 키와 격리

**Scenario 4: 60s Timeout 동작**
- **Given**: 50초 소요 함수
- **When**: 호출
- **Then**: 정상 완료 (Hobby 10s에서는 실패할 케이스)

**Scenario 5: Cron 슬롯 가용성**
- **Given**: Pro 플랜
- **When**: `vercel.json`에 cron 4종 등록
- **Then**: 모두 활성화 (Hobby 1개 한도 안 걸림)

## ⚙️ Technical & Non-Functional Constraints
- **C-TEC-007**: Vercel 단일화. 다른 호스팅 사용 금지
- **REQ-NF-007**: Uptime ≥ 99.9% — Vercel SLA에 의존
- **R7 대응**: 60s timeout 확보 → 모든 Server Action 30초 내 완료 권고
- **횡단 제약**:
  - [ ] **보안**: `.env.local` 절대 커밋 금지. Vercel Dashboard에만 등록
  - [ ] **G2 비용 가드레일**: Vercel Pro $20 고정, 추가 함수 호출 비용 모니터링
- **백업**: Vercel은 자동 백업 미제공 → Supabase 자동 백업(REQ-NF-009 RPO < 1h)에 의존

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Production 라이브 URL 접근 OK
- [ ] Preview 자동 생성 1회 이상 검증
- [ ] 환경 변수 7종 등록 완료
- [ ] vercel.json maxDuration 적용
- [ ] README에 배포 흐름 문서화
- [ ] 비용 모니터링 알림 설정 ($30 임계 시 알림)

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001 (코드베이스 존재 전제)
- **Blocks**: 사실상 모든 P0 태스크의 라이브 검증 (Sprint 1 8번째 = 마무리)
- **Discope 영향**: 67-D2 — Capacitor 앱스토어 배포는 P1 후반으로 디퍼. 본 태스크는 Vercel 웹 배포만
