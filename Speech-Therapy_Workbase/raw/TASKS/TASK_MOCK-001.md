---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Mock] MOCK-001: analyzeDiagnosis 성공/실패/HITL 이관 3종 Mock"
labels: 'phase:p0, mode:active, domain:api, epic:f1-a, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: MOCK-001
- **Epic / Story**: F1-a 3축 AI 음성 분석 / S1
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: FR-Q-001/FR-Q-002의 FE 선개발(Gemini 호출 비활성화 상태)을 위한 Mock 응답 3종(정상/HITL 이관/실패). API-001 Zod 스키마와 1:1 호환되어 TEST-001 픽스처로도 재사용.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-001~003 시나리오 분기 (정상 + Confidence < 70 + STT 실패)
- **Task 강화판**: §3-3 MOCK-001
- **API 계약**: [`./TASK_API-001.md`](./TASK_API-001.md)

## ✅ Task Breakdown
- [ ] `lib/mocks/diagnosis.ts` 작성
- [ ] 3종 Mock 응답 정의:
  - `mockSuccessHigh`: 모든 점수 ≥ 80, peerPercentile 92, confidence 95, requiresHITL: false, aiCushionText "또래의 상위 8% 안에 들어요"
  - `mockSuccessLow`: 점수 30~50, peerPercentile 25, confidence 65, requiresHITL: true, aiCushionText "조금 더 연습하면 좋아요"
  - `mockFailureSTT`: throw `Error('STT_FAILED')`
- [ ] 환경 변수 분기:
  - `USE_MOCK_DIAGNOSIS=true` 시 실제 Gemini 호출 대신 Mock 반환
  - Production 환경에서 강제 false (보안)
- [ ] FE 개발자가 query param `?mock=success-high|success-low|failure`로 시나리오 강제 가능
- [ ] Vitest 픽스처에서도 import 가능하도록 export
- [ ] 시나리오 자동 선택 헬퍼: `getMockBySearchParam(searchParams)`

## 🧪 Acceptance Criteria
**Scenario 1: 정상 Mock 반환 (USE_MOCK_DIAGNOSIS=true)**
- **Given**: 환경 변수 활성
- **When**: `analyzeDiagnosis(input)` 호출
- **Then**: `mockSuccessHigh` 객체 반환, 실제 Gemini 호출 0회

**Scenario 2: HITL 이관 시나리오**
- **Given**: query `?mock=success-low`
- **When**: 페이지 진입 후 호출
- **Then**: requiresHITL: true 응답

**Scenario 3: 실패 시나리오**
- **Given**: query `?mock=failure`
- **When**: 호출
- **Then**: `STT_FAILED` 에러 throw, 사용자 UI에 재시도 안내

**Scenario 4: 스키마 100% 일치**
- **Given**: 3종 Mock 모두
- **When**: `OutputSchema.parse(mock)`
- **Then**: 모두 통과 (API-001과 호환성 보장)

**Scenario 5: Production 보호**
- **Given**: Vercel Production 환경
- **When**: USE_MOCK_DIAGNOSIS 설정 무관
- **Then**: Mock 비활성, 실제 Gemini 호출

## ⚙️ Technical & Non-Functional Constraints
- **API-001 호환**: Zod OutputSchema 100% 일치 (스키마 변경 시 동기화 필수)
- **격리**: Production 환경에서 강제 비활성화
- **횡단 제약**: 해당 없음 (테스트 더미)
- **보안**: Mock 응답에도 Disclaimer 플래그(`disclaimerRequired: true`) 유지

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Vercel Production에서 Mock 비활성 검증
- [ ] `tsc --strict` 0 errors
- [ ] 3종 Mock 모두 OutputSchema 검증 통과
- [ ] FE 개발 시 정상 동작 확인 (query param 분기)
- [ ] TEST-001에서 픽스처로 import 검증

## 🚧 Dependencies & Blockers
- **Depends on**: API-001 (Zod 스키마)
- **Blocks**: FR-Q-001/FR-Q-002 (FE 선개발), TEST-001 (테스트 픽스처), TEST-004 (E2E Mock 응답)
- **Discope 영향**: 해당 없음
