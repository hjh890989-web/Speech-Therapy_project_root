---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-010: 원장 명의 헤더/로고 커스텀 (≤ 1초 렌더)"
labels: 'phase:p2, mode:active, domain:fr-q, epic:f9-a'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-010
- **Epic / Story**: F9-a 원장 대시보드 (브랜딩)
- **Phase**: 🔴 P2
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: B2B 기관마다 자기 기관 명의(이름·로고)를 대시보드 헤더에 노출 → 원장의 학부모용 보고서 발송 시 신뢰도·전문성 강화. 도입 결정자(원장) 만족도 향상 KPI.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-047 (헤더/로고 커스텀, 렌더 ≤ 1초)
- **Task 강화판**: §3-4 FR-Q-010

## ✅ Task Breakdown
- [ ] `app/(dashboard)/layout.tsx` 또는 별도 `<InstitutionHeader>` Server Component
- [ ] DB-003 institutions에서 name + logoUri 조회 (Server Component, RSC 캐시 활용)
- [ ] 로고 이미지 표시:
  - Supabase Storage `institution-logos` 버킷 사용
  - Next.js `<Image>` 컴포넌트 (자동 최적화)
  - logoUri null 시 default 로고 (Speech-Therapy 기본 브랜드)
- [ ] 로고 업로드 페이지 (`/(dashboard)/institution/settings/branding/page.tsx`):
  - Server Action `uploadInstitutionLogo(file)` (`'use server'`)
  - 파일 검증: PNG/JPG/SVG, ≤ 1MB
  - Supabase Storage 업로드 + institutions.logoUri UPDATE
  - 권한: principal 또는 admin
- [ ] 헤더 정보 5가지 표시:
  - 기관 로고 (왼쪽)
  - 기관명
  - 원장 이름 (principalName)
  - 현재 시각 (실시간 갱신은 Client Component 분리)
  - 로그아웃 버튼
- [ ] 모바일 반응형: 작은 화면에서 로고만 표시 + hamburger 메뉴

## 🧪 Acceptance Criteria
**Scenario 1: 헤더 렌더 ≤ 1초 (REQ-FUNC-047)**
- **Given**: principal 인증 + institution 데이터
- **When**: 페이지 진입 → 헤더 렌더
- **Then**: 헤더 paint ≤ 1,000ms (RSC 캐시 활용)

**Scenario 2: 로고 업로드**
- **Given**: principal + 500KB PNG
- **When**: branding settings에서 업로드
- **Then**: Supabase Storage 저장 + institutions.logoUri UPDATE

**Scenario 3: 파일 검증**
- **Given**: 5MB PDF 업로드 시도
- **When**: 업로드
- **Then**: ZodError "PNG/JPG/SVG ≤ 1MB" 차단

**Scenario 4: default 로고**
- **Given**: institutions.logoUri null
- **When**: 헤더 렌더
- **Then**: Speech-Therapy 기본 로고 노출

**Scenario 5: 비원장 차단**
- **Given**: parent 역할
- **When**: branding settings 진입
- **Then**: 403

**Scenario 6: Storage RLS**
- **Given**: institution A의 principal
- **When**: institution B의 로고 조회 시도
- **Then**: 403 (Storage RLS)

**Scenario 7: 모바일 반응형**
- **Given**: 모바일 viewport
- **When**: 헤더 렌더
- **Then**: 로고만 표시, 텍스트는 hamburger 메뉴

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-047**: 렌더 ≤ 1초
- **횡단 제약**:
  - [ ] R3 — 원장이 자기 학부모용 보고서로 사용 가능 (브랜딩이 필수)
  - [ ] Storage RLS — 본인 기관 로고만
  - [ ] 보안 — 파일 검증 (확장자 + MIME + 최대 1MB)
- **G6 비용 가드**: 로고 1MB × 5,000개소 = 5GB → Supabase Pro 임박 트리거
- **접근성**: alt 텍스트 (기관명) 자동

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 로고 paint ≤ 1초 측정
- [ ] `tsc --strict` 0 errors
- [ ] Storage RLS 검증
- [ ] 파일 검증 (음수·과대·확장자) 통과
- [ ] PR 본문에 REQ-FUNC-047 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-003 (institutions + logoUri), API-010 (인증), INFRA-001 (Supabase Storage)
- **Blocks**: FR-Q-009 (대시보드 통합)
- **Discope 영향**: 해당 없음
