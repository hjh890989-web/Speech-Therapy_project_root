---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-006: 데이터 부족 시 긍정 메시지 분기 렌더"
labels: 'phase:p1, mode:active, domain:fr-q, epic:f4'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-006
- **Epic / Story**: F4 주간 발달 추이 리포트 / S3
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 주간 데이터가 부족할 때(0~1건 세션) 그래프 대신 긍정적 안내 + 미션 독려 + 이전 성과 표시. 부정적 인상 회피 + 사용자 이탈 방지.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-029 (데이터 부족 시 하락 그래프 대신 긍정 메시지)
- **Task 강화판**: §3-4 FR-Q-006

## ✅ Task Breakdown
- [ ] `components/reports/EmptyState.tsx` Client Component 생성
- [ ] FR-Q-005에서 dataSufficiency: 'insufficient' 시 본 컴포넌트 분기 렌더
- [ ] 메시지 설계 (3종 분기):
  - 신규 사용자 (총 세션 0건): "첫 발화를 들려주세요!" + 미션 시작 CTA
  - 이번 주 부족 (이전 주 데이터 있음): "이번 주는 잠시 쉬어가는 중이네요" + 이전 주 성과 카드 표시
  - 장기 미접속 (3주+ 미접속): "오랜만이에요!" + 환영 메시지 + 미션 추천
- [ ] 이전 주 성과 미니 카드:
  - shadcn/ui Card
  - 직전 주 평균 점수 + 백분위 + "잘했어요!" 카피
- [ ] 일러스트 (밝은 톤): undraw 또는 Lottie 애니메이션
- [ ] 미션 시작 CTA 버튼 (`/missions` 이동)
- [ ] Vercel Analytics 이벤트: `empty_state_viewed`, `empty_state_cta_clicked`

## 🧪 Acceptance Criteria
**Scenario 1: 신규 사용자 분기**
- **Given**: 총 세션 0건 + 이번 주 데이터 부족
- **When**: `/reports/{year}/{week}` 진입
- **Then**: "첫 발화를 들려주세요!" 메시지 + 미션 시작 CTA

**Scenario 2: 이번 주 부족 + 이전 주 데이터**
- **Given**: 직전 주 평균 70, 이번 주 0건
- **When**: 진입
- **Then**: "이번 주는 잠시 쉬어가는 중이네요" + 직전 주 성과 카드 (평균 70)

**Scenario 3: 장기 미접속**
- **Given**: 마지막 세션 30일 전
- **When**: 진입
- **Then**: "오랜만이에요!" 환영 메시지

**Scenario 4: CTA 클릭 → 미션 페이지**
- **Given**: 빈 상태 화면
- **When**: "지금 시작하기" 클릭
- **Then**: `/missions` 리다이렉트, `empty_state_cta_clicked` 이벤트 발송

**Scenario 5: 부정 카피 0건**
- **Given**: 어떤 분기든
- **When**: 페이지 텍스트 검사
- **Then**: "안 했어요", "부족해요", "실패" 등 부정 표현 0건

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-029**: 데이터 부족 시 긍정 메시지 + 미션 독려
- **횡단 제약**:
  - [ ] CON-04 — 의료 용어 0건
  - [ ] **부정 카피 회피** — 불안 자극 표현 금지 (CJM-B 이탈점 대응)
  - [ ] R1 — "정상/비정상" 표현 금지
- **접근성**: aria-label, 키보드 조작
- **성능**: 일러스트 lazy load

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 3종 분기 모두 시각 검증
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] Vercel Analytics 이벤트 2종 등록 + 발송 검증
- [ ] 부정 카피 정규식 스캔 0건
- [ ] PR 본문에 REQ-FUNC-029 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-005 (분기 호출자), API-003 (dataSufficiency 키 활용), INFRA-005 (Analytics)
- **Blocks**: 없음 (말단 컴포넌트)
- **Discope 영향**: 해당 없음
