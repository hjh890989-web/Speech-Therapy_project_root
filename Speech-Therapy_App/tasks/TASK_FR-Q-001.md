---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-001: 무로그인 5분 진단 SSR 페이지 + 입력 폼"
labels: 'phase:p0, mode:active, domain:fr-q, epic:f1-b, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-001
- **Epic / Story**: F1-b 무로그인 5분 진단 웹뷰 / S1
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Seg A(불안형 탐색자)가 회원가입 없이 5분 안에 진단 결과를 확인하는 핵심 퍼널의 진입 페이지. 무료 진단 → 유료 전환의 단일 시작점.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-008 (무로그인 SSR 랜딩, 입력 폼 ≤ 3 항목)
  - REQ-FUNC-009 (5분 체류 ≤ 300초)
  - REQ-FUNC-010 (RSC 렌더 p95 ≤ 1,500ms)
  - REQ-NF-003 (PWA Cold Start ≤ 1.5초)
- **Task 강화판**: §3-4 FR-Q-001

## ✅ Task Breakdown
- [ ] `app/(public)/diagnose/page.tsx` SSR 페이지 생성
- [ ] 입력 폼: 자녀 월령(slider 24~84) + 타겟 음소(select 5종) + 부모 연락처(선택, 결과 발송용)
- [ ] shadcn/ui 컴포넌트 설치 (`npx shadcn-ui@latest add button input select slider`)
- [ ] Web Speech API 통합: `useSpeechRecognition` 커스텀 훅 (`lib/hooks/useSpeechRecognition.ts`)
  - `lang: 'ko-KR'`
  - `continuous: false`
  - 결과 transcript state 보관
- [ ] 발화 안내 카피 (예: "/ㅅ/ 발음을 들려주세요. 예: 사과, 시계, 사자")
- [ ] 발화 완료 후 `analyzeDiagnosis()` Server Action 호출 → 결과 페이지로 router push
- [ ] 진입 시점 타임스탬프 저장 + 결과 페이지에서 5분 초과 감지 시 경고
- [ ] Disclaimer 카피 페이지 상단 노출 ("본 서비스는 의료적 판단이 아니며…")

## 🧪 Acceptance Criteria
**Scenario 1: SSR 렌더링 시간**
- **Given**: 신규 사용자 진입
- **When**: `/diagnose` 첫 GET 요청
- **Then**: HTML 첫 페인트 ≤ 1,500ms (Vercel Analytics LCP 기준)

**Scenario 2: 입력 폼 ≤ 3 항목**
- **Given**: 페이지 렌더 완료
- **When**: 폼 항목 수 카운트
- **Then**: 필수 입력 ≤ 3개 (월령, 음소, 동의 체크)

**Scenario 3: Web Speech API 동작**
- **Given**: 마이크 권한 허용
- **When**: 사용자가 "사과" 발화
- **Then**: transcript state에 "사과" 입력됨

**Scenario 4: 5분 체류 측정**
- **Given**: 진입 후 290초 경과
- **When**: 결과 페이지 도달
- **Then**: 체류시간 ≤ 300초 OK

**Scenario 5: 마이크 권한 거부 (REQ-FUNC-006)**
- **Given**: 사용자 권한 거부
- **When**: Web Speech 호출
- **Then**: shadcn/ui Dialog로 "마이크 권한이 필요합니다" 안내 + OS 설정 이동 가이드

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-003**: PWA Cold Start ≤ 1.5초 (Service Worker는 P1 — 본 태스크는 SSR만)
- **REQ-FUNC-010**: RSC p95 ≤ 1,500ms
- **횡단 제약**:
  - [ ] **CON-04 금칙어**: 페이지 카피에 "진단", "장애" 0건 — "발음 발달 확인" 등 비의료 표현 사용
  - [ ] **Disclaimer 100%**: 페이지 상단 + 하단 두 곳 노출 (REQ-FUNC-011은 결과 페이지 책임이지만 진입 페이지에도 사전 고지)
  - [ ] R7 Vercel Timeout: SSR이 데이터 페치 없이 정적 렌더링 → 영향 없음
- **접근성**: 슬라이더 키보드 조작, aria-label 필수
- **모바일 우선**: Tailwind `sm:` 기본, 데스크톱은 `md:` 이상

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Lighthouse 모바일 Performance ≥ 80
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] Web Speech API 호환성: Chrome/Edge/Safari 모바일 검증
- [ ] Vercel Preview 배포 통과
- [ ] 금칙어 정규식 스캔 0건

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001, API-001 (analyzeDiagnosis DTO)
- **Blocks**: FR-C-001 (이 페이지가 호출), FR-Q-002 (결과 페이지 이동), TEST-004 (E2E 검증 대상)
- **Discope 영향**: 해당 없음
