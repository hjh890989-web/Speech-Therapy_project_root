---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Server Action] API-001: analyzeDiagnosis() DTO + Zod 스키마 정의"
labels: 'phase:p0, mode:active, domain:api, epic:f1-a, sprint:1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-001
- **Epic / Story**: F1-a 3축 AI 음성 분석 / S1
- **Phase**: 🟢 P0
- **Mode**: 명세대로 (단, 입력 형식은 D7 적용으로 audioBlob 대신 STT 결과 텍스트 + 음향 특징)
- **Discope 적용**: 67-D1 부분 적용 — 클라이언트 측 STT 결과를 입력으로 받음
- **목적**: 부모가 5분 진단 페이지에서 발화한 결과를 3축 점수·또래 백분위·Confidence로 변환하는 Server Action의 **계약(Contract)**을 Zod 스키마로 고정. 이후 FR-C-001(구현), MOCK-001(가짜 응답)의 SSOT.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.5 API Overview — `analyzeDiagnosis()` 행
  - §3.6.1 시퀀스 다이어그램 (Step 5~7)
  - REQ-FUNC-001~003 (3축 스코어링, 백분위, Confidence)
  - REQ-NF-001 (p95 ≤ 800ms)
- **Task 강화판**: §3-2 API-001
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §1.2 [추가 D7]

## ✅ Task Breakdown
- [ ] `npm i zod` 설치
- [ ] `lib/schemas/diagnosis.ts`에 Zod 입력 스키마 정의:
  - `transcript: z.string().min(1).max(2000)` (Web Speech API 결과)
  - `acousticFeatures: z.object({...})` (선택 — 음향 특징 — Sprint 1엔 nullable)
  - `childAgeMonths: z.number().int().min(24).max(84)` (만 2~7세)
  - `targetPhoneme: z.enum(['ㅅ','ㅈ','ㄱ','ㄴ','ㄹ'])` (시드 5종)
  - `userId: z.string().uuid().optional()` (무로그인 진단 허용)
- [ ] 출력 스키마 정의:
  - `articulationScore: z.number().min(0).max(100)`
  - `linguisticScore: z.number().min(0).max(100)`
  - `acousticScore: z.number().min(0).max(100)`
  - `peerPercentile: z.number().min(0).max(100)`
  - `confidence: z.number().min(0).max(100)`
  - `aiCushionText: z.string()` — 금칙어 0건 보장
  - `requiresHITL: z.boolean()` — confidence < 70 자동 true
- [ ] `app/actions/diagnosis.ts` 파일에 `'use server'` 선언 + `analyzeDiagnosis(input)` 함수 시그니처만 정의 (구현은 FR-C-001 책임)
- [ ] 에러 코드 enum: `INVALID_INPUT | STT_FAILED | LLM_TIMEOUT | INTERNAL_ERROR`
- [ ] TypeScript 타입 export (`export type DiagnosisInput = z.infer<typeof InputSchema>`)

## 🧪 Acceptance Criteria
**Scenario 1: 정상 입력 검증 통과**
- **Given**: 유효 transcript 50자, childAgeMonths=36, targetPhoneme='ㅅ'
- **When**: `InputSchema.parse(input)`
- **Then**: 검증 통과, `DiagnosisInput` 타입 보장

**Scenario 2: 빈 transcript 차단**
- **Given**: `transcript: ''`
- **When**: `InputSchema.parse(input)`
- **Then**: ZodError throw — Server Action에서 `INVALID_INPUT` 반환

**Scenario 3: 월령 범위 외 차단**
- **Given**: `childAgeMonths: 100` (만 8세 이상)
- **When**: `InputSchema.parse(input)`
- **Then**: ZodError throw

**Scenario 4: 출력 스키마 강제**
- **Given**: 임의 점수 객체
- **When**: `OutputSchema.parse(result)` 호출
- **Then**: 0~100 범위 외 또는 필드 누락 시 throw

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-001**: p95 ≤ 800ms (구현 단계 책임 — 본 태스크는 계약만)
- **C-TEC-002**: Server Action으로 구현 (`'use server'`). 별도 BE 서버 금지
- **횡단 제약**:
  - [ ] CON-04 금칙어 — `aiCushionText` 출력 검증 (Server Action 마지막 단계에서 정규식)
  - [ ] Disclaimer 노출 — UI(FR-Q-002) 책임이지만 본 응답 페이로드에 `disclaimerRequired: true` 플래그 포함 권장
- **보안**: 입력 페이로드 로깅 시 `transcript` 필드는 **마스킹** (개인 발화 보호)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Zod 스키마 단위 테스트 (입출력 양방향)
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] 타입 export 검증 (`DiagnosisInput`, `DiagnosisOutput`)
- [ ] MOCK-001에서 본 스키마 재사용 가능 확인
- [ ] PR 본문에 REQ-FUNC-001~003 매핑 명시

## 🚧 Dependencies & Blockers
- **Depends on**: DB-005 (출력 필드와 1:1 매핑)
- **Blocks**: FR-C-001 (구현), MOCK-001 (모킹), FR-Q-001 (페이지가 본 액션 호출), TEST-001 (테스트 대상)
- **Discope 영향**: 67-D1 — 입력 형식이 SRS 명세의 audioBlob에서 STT 결과 텍스트로 변경됨. SRS §3.5 본문은 무손상 보존, 본 태스크 명세에서만 형식 변경 명시
