---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-012: 카카오 뱃지 발송 → 클립보드 단일 (Replace 67-D1)"
labels: 'phase:p1, mode:replace, domain:fr-c, epic:f5'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-012
- **Epic / Story**: F5 카카오톡/SNS 공유 / S3
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace (67-D1 — 카카오 알림톡 미연동)
- **Discope 적용**: 67-D1 (카카오 알림톡 → 클립보드 복사)
- **목적**: SRS는 카카오 알림톡으로 성과 뱃지를 발송하지만, 67번 보고서 권고대로 **클립보드 복사 + 일반 웹 공유** 단일로 단순화. 카카오 템플릿 사전 심사(수일 소요) 회피 + B2B 연동 부담 0.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-030 (카카오 알림톡 API → 뱃지 전송, 성공률 ≥ 95%)
  - REQ-FUNC-031 (외부 API 장애 시 클립보드 폴백)
- **Task 강화판**: §3-5 FR-C-012 (Replace)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §1.1 67-D1

## ✅ Task Breakdown
- [ ] **카카오 알림톡 API 연동 미구현** (67-D1 적용)
- [ ] 클라이언트 측 공유 기능 (FR-Q-002 결과 페이지 + FR-Q-004 보상 도감 + FR-Q-005 주간 리포트):
  - shadcn/ui Button "공유하기"
  - Web Share API 우선 (`navigator.share`):
    - title: "발음 발달 리포트"
    - text: "이번 주 우리 아이 점수 76점!"
    - url: 공유 가능 링크 (서버 측 og:image 생성 — Vercel OG SDK)
  - Web Share API 미지원 시 클립보드 복사 폴백:
    - `navigator.clipboard.writeText(shareText)`
    - shadcn/ui Toast "링크가 복사되었어요!"
- [ ] 공유 가능 링크 생성:
  - `/share/[shareToken]` 페이지 (인증 불필요)
  - shareToken으로 evaluation_results 일부 공개 (점수만, 자녀 정보 미포함)
  - 24h 만료
- [ ] og:image 동적 생성 (`/api/og` Route Handler — Vercel @vercel/og):
  - 자녀 별명 + 점수 카드 이미지
- [ ] Vercel Analytics 이벤트:
  - `share_button_clicked`
  - `share_method` (web_share | clipboard)
  - `share_link_visited` (수신자 페이지 방문)

## 🧪 Acceptance Criteria
**Scenario 1: Web Share API 동작 (모바일)**
- **Given**: iOS Safari + 결과 페이지
- **When**: 공유 버튼 클릭
- **Then**: 시스템 공유 시트 노출, 카카오/문자/메일 등 선택 가능

**Scenario 2: 클립보드 폴백 (데스크톱)**
- **Given**: Chrome 데스크톱 (Web Share 미지원)
- **When**: 공유 클릭
- **Then**: 링크 클립보드 복사 + Toast "복사되었어요"

**Scenario 3: 공유 링크 24h 만료**
- **Given**: 25h 전 생성된 shareToken
- **When**: `/share/[token]` 진입
- **Then**: "링크가 만료되었어요" 안내 + 진단 페이지 CTA

**Scenario 4: og:image 생성**
- **Given**: shareToken
- **When**: `/api/og?token=...` 호출
- **Then**: PNG 이미지 반환 (점수 카드)

**Scenario 5: 자녀 식별 정보 미포함 (R4)**
- **Given**: 공유 페이지
- **When**: 페이지 텍스트 검사
- **Then**: 자녀 본명·생년월일·연락처 0건 (별명·점수만)

**Scenario 6: 카카오 미연동 명시 (Replace)**
- **Given**: 코드 검사
- **When**: 카카오 SDK 검색
- **Then**: 의존성 0건 (`@kakao/sdk` 등 미설치)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-030**: 카카오 알림톡 → **본 태스크에선 클립보드/Web Share로 대체** (67-D1)
- **REQ-FUNC-031**: 폴백 → 본 태스크는 폴백을 1차 방식으로 격상
- **횡단 제약**:
  - [ ] R4 — 공유 콘텐츠에 자녀 식별 정보 미포함
  - [ ] CON-04 — 공유 메시지 텍스트 의료 용어 0건
  - [ ] **카카오 의존성 0** — 외부 API 정책 변경 영향 회피 (R5)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] iOS Safari + Android Chrome + Desktop Chrome 3환경 검증
- [ ] og:image 정상 생성 (Vercel @vercel/og)
- [ ] `tsc --strict` 0 errors
- [ ] Vercel Analytics 3종 이벤트 발송 검증
- [ ] 67-D1 적용 사유 README 명시
- [ ] PR 본문에 REQ-FUNC-030/031 + 67-D1 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-002, FR-Q-004, FR-Q-005 (공유 진입점), INFRA-005 (Analytics)
- **Blocks**: TEST-011 (단순 대체 동작 검증)
- **Discope 영향**: 67-D1 — 카카오 알림톡 미연동, Web Share + 클립보드 단일. P2+ B2B 알림에서도 동일 패턴 재사용
