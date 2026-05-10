---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-001: 3축 스코어링 + 실패율 < 2% 단위 테스트 (Vitest)"
labels: 'phase:p0, mode:active, domain:test, epic:f1-a, sprint:2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-001
- **Epic / Story**: F1-a 3축 AI 음성 분석 / S1
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: FR-C-001(3축 스코어링)의 6개 BDD/GWT 시나리오를 자동화된 Vitest 단위 테스트로 변환. 실패율 < 2% 회귀 검증 + 커버리지 ≥ 80%.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §5 Traceability Matrix — TC-S1-001/002
  - REQ-FUNC-001~003 (3축 + 백분위 + Confidence)
  - REQ-NF-001 (p95 ≤ 800ms)
  - REQ-NF-014 (성공률 ≥ 98%)
- **Task 강화판**: §3-6 TEST-001
- **테스트 대상**: [`./TASK_FR-C-001.md`](./TASK_FR-C-001.md) 6개 Scenario

## ✅ Task Breakdown
- [ ] `npm i -D vitest @vitest/ui happy-dom @testing-library/react` 설치
- [ ] `vitest.config.ts` 작성:
  - `environment: 'happy-dom'`
  - `coverage: { provider: 'v8', threshold: 80 }`
  - alias `'@/'`
- [ ] `__tests__/actions/diagnosis.test.ts` 생성
- [ ] Mock 설정:
  - `lib/ai/gemini.ts` 모킹 — `vi.mock('@/lib/ai/gemini')`
  - `prisma.evaluationResult.create` 모킹 — `vi.mocked(prisma)`
  - MOCK-001의 3종 픽스처 import
- [ ] FR-C-001의 6개 Scenario를 `describe('analyzeDiagnosis')` 블록 내 `it()`로 변환:
  - 1: `it('정상 발화 시 3축 점수 0~100 float 반환')`
  - 2: `it('또래 백분위 0~100 float 산출 + 시드 100건 활용')`
  - 3: `it('Confidence < 70 시 requiresHITL=true 반환')`
  - 4: `it('금칙어 감지 시 Gemini 재호출 1회')`
  - 5: `it('LLM 응답 15s 초과 시 LLM_TIMEOUT 에러 throw')`
  - 6: `it('100회 정상 호출 시 실패율 < 2%')` — `runConcurrent` 헬퍼
- [ ] 부하 테스트 헬퍼: `helpers/runConcurrent.ts` — `Promise.allSettled([...100])`
- [ ] `package.json`에 스크립트 추가: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`
- [ ] CI 통합 (Vercel): build 시 `npm run test` 자동 실행

## 🧪 Acceptance Criteria
**Scenario 1: 모든 6개 시나리오 통과**
- **Given**: FR-C-001 구현 완료
- **When**: `npm run test`
- **Then**: 6/6 PASS, exit code 0

**Scenario 2: 실패율 < 2% (REQ-FUNC-001 / REQ-NF-014)**
- **Given**: 100회 정상 입력 시뮬레이션 (Mock에 일부 실패 주입)
- **When**: `runConcurrent(100, () => analyzeDiagnosis(input))`
- **Then**: PASS ≥ 98건, FAIL ≤ 2건

**Scenario 3: 커버리지 80%**
- **Given**: 테스트 실행
- **When**: `npm run test:coverage`
- **Then**: `app/actions/diagnosis.ts` 라인·브랜치 커버리지 ≥ 80%

**Scenario 4: 격리 보장 (Mock 강제)**
- **Given**: 테스트 실행 환경
- **When**: 실제 Gemini API 호출 시도
- **Then**: 호출 0회 (모킹으로 차단)

## ⚙️ Technical & Non-Functional Constraints
- **TDD 원칙**: AC를 테스트로 변환 — 통과할 때까지 비즈니스 로직 수정
- **격리**: Gemini API + Supabase 실제 호출 금지 (Mock 강제)
- **CI 통합**: Vercel Preview에서 자동 실행 (`package.json` `test` script + `vercel.json` build hook)
- **횡단 제약 검증**: CON-04 금칙어 차단 로직이 테스트로 검증되는지 확인 (Scenario 4)

## 🏁 Definition of Done
- [ ] 모든 6개 Scenario 테스트 추가 + 통과
- [ ] 커버리지 ≥ 80%
- [ ] `tsc --strict` 0 errors
- [ ] CI(Vercel) 통과
- [ ] PR 본문에 REQ-FUNC-001~003 + REQ-NF-001/014 + TC-S1-001/002 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-001 (구현), API-001 (스키마), API-011 (Gemini 어댑터 — Mock 대상), MOCK-001 (픽스처)
- **Blocks**: Sprint 1 합격 게이트 (Vercel 라이브 + 테스트 통과 필수)
- **Discope 영향**: 해당 없음
