---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-011: Gemini 회귀 모델 기반 다음 주 예상 점수 + 시뮬 클릭 트래킹"
labels: 'phase:p1, mode:active, domain:fr-c, epic:f18'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-011
- **Epic / Story**: F18 예측 시뮬레이션 / S3
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 사용자 직전 4주 scoreTrend를 Gemini에 입력하여 다음 주 예상 평균 점수 + 신뢰구간 산출. EXP-2(M3 리텐션 ≥ 40%) 검증 가설의 핵심 백엔드 로직. 시뮬레이션 클릭은 Vercel Analytics로 트래킹.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-028 (Gemini "다음 주 예상 점수" 시뮬레이션, 클릭 유저 익월 유지율 +20%p)
  - REQ-FUNC-044 (회귀 모델 기반 예상 점수 + 신뢰구간)
  - REQ-FUNC-045 (시뮬레이션 클릭 Vercel Analytics 트래킹)
- **Task 강화판**: §3-5 FR-C-011

## ✅ Task Breakdown
- [ ] `app/actions/prediction.ts`에 `predictNextScore(userId, options?)` Server Action (`'use server'`)
- [ ] 1단계 — 입력 데이터 수집:
  - 직전 4주 weekly_reports의 articulationAvg + linguisticAvg + acousticAvg + peerPercentileAvg
  - 평균 미션 빈도 (주 N회)
- [ ] 2단계 — Gemini 호출 (API-011 사용):
  - 시스템 프롬프트: "다음 주 예상 점수를 회귀 추정하라. JSON으로 {predicted, confidence, lower_bound, upper_bound} 반환"
  - 사용자 프롬프트: 4주 시계열 데이터 + 컨텍스트
  - Zod schema: `{predicted: z.number().min(0).max(100), confidence: z.number().min(0).max(1), lower_bound, upper_bound}`
- [ ] 3단계 — 결과 캐싱:
  - 동일 입력 데이터 → 24h Redis 캐시 (Upstash, SEC-004 인스턴스 재사용)
  - 캐시 키: `prediction:${userId}:${currentWeek}`
- [ ] 4단계 — 결과 반환:
  - `{predictedNextScore, predictionConfidence, lowerBound, upperBound, basedOnWeeks: 4}`
- [ ] 시뮬레이션 변형 옵션:
  - `options.missionFrequency: 'low' | 'normal' | 'high'` (Gemini에 시뮬 변수 전달)
  - 슬라이더로 변경 시 새 호출 → 캐시 별도
- [ ] FR-Q-012 페이지에서 호출 + 결과 시각화
- [ ] FR-C-010 Cron에서도 호출하여 weekly_reports.predictedNextScore 저장
- [ ] Vercel Analytics 이벤트 통합:
  - `prediction_calculated`
  - `prediction_simulation_changed` (슬라이더 변경)
- [ ] 데이터 부족 처리: 4주 미만 시 null 반환

## 🧪 Acceptance Criteria
**Scenario 1: 정상 예측 (REQ-FUNC-044)**
- **Given**: 직전 4주 데이터 + 사용자 X
- **When**: `predictNextScore(X)`
- **Then**: `{predictedNextScore: 76, predictionConfidence: 0.85, lowerBound: 71, upperBound: 81}` 반환

**Scenario 2: 캐시 동작**
- **Given**: 동일 사용자 + 동일 주차 두 번째 호출
- **When**: 호출
- **Then**: Gemini 호출 0회 (Redis 캐시 hit), 응답 ≤ 50ms

**Scenario 3: 데이터 부족**
- **Given**: 직전 2주 데이터만 존재
- **When**: 호출
- **Then**: null 반환 (FR-Q-006 EmptyState 분기)

**Scenario 4: 시뮬레이션 변형**
- **Given**: missionFrequency 'high'로 변경
- **When**: 호출
- **Then**: 별도 캐시 키 + 새 예측 + `prediction_simulation_changed` 이벤트

**Scenario 5: Rate Limiter (G5)**
- **Given**: Gemini RPM 14 초과
- **When**: 호출
- **Then**: SEC-004로 차단 + 캐시된 직전 결과 반환 (graceful)

**Scenario 6: 신뢰구간 검증**
- **Given**: 정상 응답
- **When**: OutputSchema 검증
- **Then**: lower_bound ≤ predicted ≤ upper_bound 관계 유지

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-044**: 회귀 모델 기반 예상 점수 + 신뢰구간
- **REQ-NF-018**: AI 비용 ≤ ₩5,250/유저/월 — 캐시로 중복 호출 절감
- **C-TEC-005**: Vercel AI SDK 사용
- **횡단 제약**:
  - [ ] CON-04 — 시스템 프롬프트에 "치료/진단 표현 금지" 명시
  - [ ] G5 Rate Limiter — SEC-004 통과
  - [ ] **R1 의료 규제** — 응답에 "보장이 아닙니다" 메시지 포함 (UI 책임이지만 페이로드 메타에 disclaimer flag)
- **G2 비용 가드**: 캐시로 일 호출 횟수 ≤ 사용자 수 / 7

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Zod 스키마 단위 테스트
- [ ] Redis 캐시 동작 검증
- [ ] `tsc --strict` 0 errors
- [ ] FR-Q-012에서 호출 검증
- [ ] FR-C-010 Cron 통합 검증
- [ ] Vercel Analytics 2종 이벤트 발송 검증
- [ ] PR 본문에 REQ-FUNC-028/044/045 + EXP-2 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-011 (Gemini 어댑터), DB-007 (weekly_reports 데이터), SEC-004 (Rate Limiter + Redis)
- **Blocks**: FR-Q-012 (예측 페이지), FR-C-010 (주간 Cron 통합), MOCK 픽스처(없으면 차단 X)
- **Discope 영향**: 해당 없음
