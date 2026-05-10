---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-001: 3축 스코어링 Server Action 비즈니스 로직"
labels: 'phase:p0, mode:active, domain:fr-c, epic:f1-a, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-001
- **Epic / Story**: F1-a 3축 AI 음성 분석 / S1
- **Phase**: 🟢 P0
- **Mode**: 단순화 (D7 부분 적용 — STT는 Web Speech API)
- **Discope 적용**: 67-D1 (Web Speech API 사용), D7 (Edge Runtime 미사용)
- **목적**: 클라이언트가 Web Speech API로 변환한 텍스트를 받아 Gemini AI로 3축(조음·언어·음향) 점수 산출, 또래 백분위 계산, evaluation_results INSERT까지 실행하는 핵심 비즈니스 로직.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-001 (3축 스코어링, 실패율 < 2%)
  - REQ-FUNC-002 (또래 백분위 산출)
  - REQ-FUNC-003 (Confidence < 70 → HITL 자동 이관 — Sprint 1엔 Slack 웹훅으로 대체, FR-C-002 책임)
  - REQ-NF-001 (p95 ≤ 800ms)
  - §3.6.1 시퀀스 다이어그램
- **Task 강화판**: §3-5 FR-C-001
- **검토 보고서**: §1.3 Sprint 1 코어 8

## ✅ Task Breakdown
- [ ] `app/actions/diagnosis.ts`에 `analyzeDiagnosis(input)` 구현부 작성 (`'use server'`)
- [ ] 1단계 — 입력 검증: API-001의 Zod `InputSchema.parse(input)` 호출
- [ ] 2단계 — Gemini 호출: API-011의 `geminiClient.generateContent(prompt)` 사용
  - 프롬프트: 발화 텍스트 + 월령 + 타겟 음소 → JSON `{articulation, linguistic, acoustic, confidence}` 반환 요청
  - 시스템 프롬프트에 "의료 진단 표현 금지" 명시
- [ ] 3단계 — 또래 백분위 계산: `prisma.evaluationResult.findMany({where: {childAgeMonths, targetPhoneme}})` 후 z-score → 백분위
  - Sprint 1 초기엔 데이터 부족 → 정규분포 가정 시드 데이터 100건 미리 INSERT
- [ ] 4단계 — AI 쿠션 텍스트 생성: Gemini 별도 호출 ("부모를 안심시키는 1~2문장")
- [ ] 5단계 — 금칙어 검증: 정규식 `/(진단|장애|치료|환자)/`로 쿠션 텍스트 스캔, 발견 시 재생성 1회
- [ ] 6단계 — `prisma.evaluationResult.create()` INSERT
- [ ] 7단계 — `requiresHITL = confidence < 70` 결정 후 반환
- [ ] 8단계 — 출력 스키마 검증 `OutputSchema.parse(result)`
- [ ] 에러 처리: try/catch로 LLM_TIMEOUT(15초), STT_FAILED, INTERNAL_ERROR 반환

## 🧪 Acceptance Criteria (BDD/GWT — REQ-FUNC G/W/T 인용)
**Scenario 1: 정상 발화 분석 (REQ-FUNC-001)**
- **Given**: 유효한 transcript "사과", 월령 36, 음소 'ㅅ'
- **When**: `analyzeDiagnosis(input)` 호출
- **Then**: 3축 점수 0~100 float 3개 반환, evaluation_results 1 row INSERT

**Scenario 2: 또래 백분위 산출 (REQ-FUNC-002)**
- **Given**: 시드 데이터 100건 + 신규 점수
- **When**: 백분위 계산
- **Then**: peerPercentile 0~100 반환, "상위 N%" 포맷팅 가능

**Scenario 3: 낮은 Confidence → HITL 플래그 (REQ-FUNC-003)**
- **Given**: Gemini가 confidence: 65 반환
- **When**: 결과 처리
- **Then**: requiresHITL=true, FR-C-002로 Slack 웹훅 트리거 (별도 태스크)

**Scenario 4: 금칙어 발생 시 재생성 (REQ-FUNC-013)**
- **Given**: 1차 쿠션 텍스트에 "진단" 포함
- **When**: 정규식 검출
- **Then**: Gemini 재호출 1회, 그래도 발견 시 기본 안전 문구로 폴백

**Scenario 5: LLM 타임아웃 (REQ-NF-001 보호)**
- **Given**: Gemini 응답 15초 초과
- **When**: `analyzeDiagnosis()` 실행
- **Then**: `LLM_TIMEOUT` 에러 반환, 사용자에게 재시도 UI

**Scenario 6: 실패율 < 2% (REQ-FUNC-001 AC)**
- **Given**: 100회 정상 입력 부하 테스트
- **When**: 모든 호출 완료
- **Then**: 실패 ≤ 2건

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-001**: p95 ≤ 800ms (Vercel Pro 60s 타임아웃 내, Gemini 호출 ~500ms 가정)
- **REQ-NF-014**: STT 재시도 성공률 ≥ 98% (FR-C-003 책임)
- **횡단 제약**:
  - [ ] **CON-04 금칙어**: 5단계에서 정규식 검증 필수
  - [ ] **Disclaimer**: 출력 페이로드에 `disclaimerRequired: true` 포함 (UI 책임)
  - [ ] **CON-03 7일 폐기**: 음성 원본 미저장 (Sprint 1 정책) → 영향 없음
  - [ ] **G5 Rate Limiter**: SEC-004 Gemini Rate Limiter 미들웨어 통과
- **R8 (Supabase 무료 티어)**: 본 INSERT는 row 단위 작음 — 1,000 MAU 무료 티어 내

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 단위 테스트 (TEST-001 책임) 모든 시나리오 통과
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] Zod 입출력 검증 코드에 포함
- [ ] Vercel Preview에서 실제 호출 1회 성공
- [ ] PR 본문에 REQ-FUNC-001~003 + REQ-NF-001/014 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001, DB-005, API-001 (DTO), API-011 (Gemini 어댑터), SEC-004 (Rate Limiter)
- **Blocks**: FR-Q-001 (페이지가 호출), FR-Q-002 (결과 RSC 표시), FR-C-002 (Confidence 트리거 후속), TEST-001 (테스트 대상)
- **Discope 영향**:
  - **67-D1 적용**: 입력은 audioBlob 대신 STT 텍스트
  - **D7 부분 적용**: Edge Runtime 미사용, 일반 Server Action
