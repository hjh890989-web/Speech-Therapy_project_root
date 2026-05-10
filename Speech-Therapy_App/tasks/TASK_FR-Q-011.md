---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-011: ROI 시뮬레이터 — 원장 결제 의사 결정 도구"
labels: 'phase:p2, mode:active, domain:fr-q, epic:f9-a'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-011
- **Epic / Story**: F9-a 원장 대시보드 (영업/판매 도구)
- **Phase**: 🔴 P2
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 원장이 도입 결정 시 "투자 대비 효과"를 시뮬레이션할 수 있는 Client Component. (a) 학부모 만족도 향상 (b) 민원 방어 (c) 차별화된 마케팅 요소를 정량화. Seg D-1 결제 전환율 견인.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-048 (ROI 시뮬레이터 Client Component)
- **Task 강화판**: §3-4 FR-Q-011

## ✅ Task Breakdown
- [ ] `app/(dashboard)/institution/roi/page.tsx` 또는 trial 페이지로 노출
- [ ] Client Component `<ROISimulator>`:
  - 입력 슬라이더 4종:
    - 원아 수 (10~100명)
    - 월 학부모 민원 건수 (0~10건)
    - 월 학부모 회의 시간 (시간 단위)
    - 차별화 마케팅 효과 (1~5 등급)
  - 출력 4종:
    - **민원 방어**: 객관적 데이터로 답변 가능 → 회의 시간 절감 추정 (시간 × 시급)
    - **신규 학부모 유치**: 차별화로 +N명 가정 → 보육료 추가 수익
    - **연간 비용 절감**: 위 2개 합산
    - **순 이익 (ROI)**: 절감 - 본 서비스 연간 비용 (₩5,000,000 가정)
  - 결과 시각화: shadcn/ui Card 4개 + Bar Chart
- [ ] 상수 입력값 수정 가능 (원장이 자기 시간 시급·보육료 단가 입력):
  - localStorage 저장 → 다음 진입 시 복원
- [ ] 결과 PDF 다운로드 (jsPDF — FR-Q-007 재사용):
  - "도입 검토 보고서 — {기관명}" 제목
  - 시뮬 결과 + 4종 차트
- [ ] 영업 보조 기능:
  - "도입 문의" 버튼 → support@ 자동 메일 (Resend)
  - "다른 기관 도입 사례" 링크
- [ ] CON-04 카피 검증: 의료 용어 0건, "차별화·만족도" 등 비즈니스 표현
- [ ] Vercel Analytics 이벤트:
  - `roi_simulator_viewed`
  - `roi_input_changed` (어떤 슬라이더)
  - `roi_pdf_downloaded`
  - `roi_inquiry_clicked` (CTA 클릭률)

## 🧪 Acceptance Criteria
**Scenario 1: 정상 시뮬레이션 (REQ-FUNC-048)**
- **Given**: 원아 50명, 민원 5건, 회의 10시간
- **When**: 슬라이더 조작
- **Then**: 4개 카드 실시간 업데이트

**Scenario 2: ROI 산식 정확성**
- **Given**: 입력값 설정
- **When**: 계산
- **Then**: 절감 - 비용 = 순이익 (수식 검증)

**Scenario 3: localStorage 복원**
- **Given**: 첫 입력 후 페이지 재방문
- **When**: 진입
- **Then**: 직전 입력값 복원

**Scenario 4: PDF 다운로드 (FR-Q-007 재사용)**
- **Given**: 시뮬 결과
- **When**: "PDF 저장" 클릭
- **Then**: 한글 PDF 다운로드

**Scenario 5: 도입 문의 CTA**
- **Given**: "도입 문의" 클릭
- **When**: Resend 이메일
- **Then**: support@ 메일 1건 발송 + Slack 알림

**Scenario 6: CON-04 카피**
- **Given**: 페이지 텍스트
- **When**: 정규식
- **Then**: "치료/진단/장애" 0건

**Scenario 7: Analytics 트래킹**
- **Given**: 4종 동작
- **When**: Vercel Analytics
- **Then**: 4종 이벤트 모두 발송

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-048**: ROI 시뮬레이터
- **횡단 제약**:
  - [ ] CON-04 — 비즈니스 표현 강제, 의료 용어 0건
  - [ ] R3 — 원장이 결제 결정 시 사용 (1인 운영 시 영업 자동화)
- **접근성**: 슬라이더 키보드 조작, 결과 텍스트 요약 (시각 장애)
- **G2 비용 가드**: 정적 페이지 + 클라이언트 측 계산 → 서버 비용 0

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] ROI 산식 단위 테스트
- [ ] PDF 한글 정상 출력
- [ ] `tsc --strict` 0 errors
- [ ] Vercel Analytics 4종 이벤트
- [ ] CON-04 정규식 검증 0건
- [ ] PR 본문에 REQ-FUNC-048 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-007 (PDF 재사용), FR-Q-009 (대시보드 통합), API-012 (Resend 이메일), INFRA-005 (Analytics)
- **Blocks**: 없음 (사용자 가치 종착점)
- **Discope 영향**: 해당 없음
