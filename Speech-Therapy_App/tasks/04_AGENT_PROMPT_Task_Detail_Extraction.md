# Agent Prompt — Task 상세 명세 추출 (Speech-Therapy Platform / SRS V06)

> **목적:** 다른 에이전트(Cursor / Claude Code / GPT 등)에게 동일한 품질로 Task 상세 명세를 추출하도록 지시할 때 사용하는 self-contained 풀 프롬프트.
> **사용법:** 아래 `# Role` 섹션부터 끝까지 그대로 복사해 새 에이전트 세션에 붙여넣을 것. 파일·경로·예시는 본 레포 실제 상태와 일치한다.
> **마지막 검증:** 2026-05-08 (11/88 완료 시점)

---

# Role

당신은 **시니어 Full-Stack Engineer**다. 전문 영역:
- Next.js 15 App Router (Server Actions, Route Handlers, RSC)
- Supabase (PostgreSQL, Auth, Storage, Realtime, RLS)
- Prisma ORM + pgvector
- Vercel AI SDK + Google Gemini
- Tailwind CSS + shadcn/ui
- PWA + Capacitor
- Vitest + Playwright + Zod 검증
- Vercel 배포 + Cron Jobs

영유아 언어발달 B2C/B2B 플랫폼 **Home Language Coaching Platform**의 SRS V06 기반 개발 명세를 GitHub Issue 형식으로 작성한다.

# Project Context

| 항목 | 값 |
|:---|:---|
| 프로젝트 | Home Language Coaching Platform (영유아 만 2~7세 언어발달 AI 스크리닝 + 홈케어 미션 + HITL 전문가 감수) |
| Tech Stack | Next.js 15 풀스택 모놀리스 · Supabase BaaS · Vercel · Vercel AI SDK + Gemini · PWA + Capacitor (P1+) |
| 핵심 제약 | C-TEC-001~007 (별도 BE 서버/Python 서버/RN 앱 금지). CON-01~04 (Zero-touch · HITL · 7일 폐기 · 의료 용어 배제) |
| 개발자 프로필 | 1인 / IT 3개월차 / 100% 바이브 코딩 (AI 페어 의존) |
| MVP 운영비 목표 | 월 $50 미만 (1,000 MAU) |
| 총 태스크 수 | 88개 (P0 Active 21 / P1 Defer 50 / P2 Defer 17) |

# Mission

`From PRD to SRS/TASKS/` 폴더에서 **빈(0-byte) `TASK_{TASK-ID}.md` 파일**을 찾아 5~10개의 적절한 단위로 묶고, 각 파일에 아래 GitHub Issue Template을 엄격히 준수한 상세 명세를 작성한다.

# Inputs (SSOT — 작업 시작 전 반드시 Read)

1. **SRS V06 본문 (요구사항 SSOT, 절대 수정 금지)**
   - `From PRD to SRS/65_SRS_V06_Nextjs_Fullstack_Final.md`
   - 99개 REQ (REQ-FUNC-001~065 + REQ-FUNC-HITL-001~004 + REQ-NF-001~030)
   - §6.1 ERD, §3.5 API Overview, §3.6 시퀀스 다이어그램, §6.4 Tech Stack
2. **Task 강화판 (88개 Phase·Mode 분류)**
   - `From PRD to SRS/TASKS/03_Tasks_Breakdown_SRS_reinforce.md`
   - §3-1~7 도메인별 표 (Task ID, Phase, Mode, 변경 사유)
   - §1 Sprint 1 코어 8 + §2 8대 디스코프 매트릭스
3. **검토 보고서 (디스코프 권고 + 비용 가드레일)**
   - `From PRD to SRS/TASKS/02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`
   - §1.2 D4~D8 신규 디스코프, §3 비용 함정 1~3, §3.4 G1~G6 비용 가드레일
4. **Gold-standard 완료 예시 (스타일 가이드)**
   - `TASK_DB-001.md`, `TASK_DB-002.md`, `TASK_DB-005.md`, `TASK_DB-006.md`, `TASK_DB-008.md`
   - `TASK_API-001.md`, `TASK_FR-Q-001.md`, `TASK_FR-Q-002.md`, `TASK_FR-C-001.md`, `TASK_FR-C-009.md`
   - `TASK_INFRA-001.md`
   - 위 11개를 **반드시 1개 이상 정독**해 Tone·Depth·구조를 동일하게 유지할 것

# Workflow

1. **Read SSOT** — 위 4개 입력을 모두 Read 또는 핵심 섹션 grep
2. **현재 상태 파악**:
   - `From PRD to SRS/TASKS/TASK_*.md` 88개 파일 목록 확인
   - 각 파일이 (a) 0-byte 빈 파일 = 사용 가능 (b) `## 🎯 Summary` 헤더 포함 = 완료됨
   - **빈 파일 중 5~10개를 골라 작업** (다른 에이전트와의 충돌 방지를 위해 한 번에 너무 많이 잡지 말 것)
3. **그룹핑 전략** — 작업 단위는 다음 중 하나의 일관된 묶음으로:
   - 같은 Epic(F1-a, F2 등) 내 묶음
   - 같은 도메인(DB, API, FR-Q 등) 내 묶음
   - 같은 Phase(P0 / P1 / P2) + Sprint 단위
   - 의존성 사슬(Depends on이 막 풀린 다음 단계)
4. **각 빈 파일 채우기**:
   - **Read 먼저** (Write 도구 요구사항 — 빈 파일도 Read 등록 필요)
   - 아래 Template을 엄격히 준수해 한국어로 작성
   - SRS REQ-FUNC ID와 1:1 매핑 보장
   - Gold-standard 예시의 깊이·톤 유지
5. **자체 검증 체크리스트** (각 파일 작성 후):
   - [ ] 9개 섹션 모두 존재 (Summary / References / Breakdown / AC / Constraints / DoD / Dependencies)
   - [ ] 4개 신규 필드 모두 채움 (Phase / Mode / Discope / Epic)
   - [ ] SRS REQ-FUNC ID 최소 1개 이상 인용
   - [ ] BDD/GWT 시나리오 최소 2개 (정상 + 예외)
   - [ ] DoD 체크박스 최소 5개
   - [ ] Dependencies "Depends on" / "Blocks" 둘 다 명시
   - [ ] 횡단 제약 체크 (해당 시): CON-04 금칙어 / Disclaimer / CON-03 7일 폐기 / Rate Limiter

# GitHub Issue Template (Strict Format)

```markdown
---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[{TYPE}] {TASK-ID}: {기능 요약}"
labels: 'phase:{p0|p1|p2}, mode:{active|replace|defer|hold}, domain:{db|api|fr-q|fr-c|test|infra|sec|mon|ops|perf}, epic:{f1-a|f1-b|f2|...|foundation}'
assignees: ''
---

## 🎯 Summary
- **Task ID**: {TASK-ID}                  ← 강화판 §3 표에서 그대로
- **Epic / Story**: {Epic 명 / Story ID}    ← 예: F1-a 3축 AI 음성 분석 / S1
- **Phase**: 🟢 P0 / 🟡 P1 / 🔴 P2          ← 강화판 상태 표기
- **Mode**: 명세대로 / 단순화 / 🔵 Replace / ❌ 보류
- **Discope 적용**: {67-D1~D3, D4~D8 중 적용 ID} (없으면 "해당 없음")
- **목적**: (1~2문장 — "왜 이 태스크가 필요한가")

## 🔗 References (Spec & Context)
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - § (관련 섹션 번호) — 한 줄 설명
  - REQ-FUNC-XXX, REQ-FUNC-YYY (관련 기능 요구사항)
  - REQ-NF-NNN (관련 비기능 요구사항)
- **ERD** (해당 시): SRS §6.1 — 관련 엔터티 `{table_name}`
- **시퀀스 다이어그램** (해당 시): SRS §3.6.X 또는 §6.3.X
- **API 명세** (해당 시): SRS §3.5 — 함수/경로 `{name}`
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-X (변경 사유)
- **검토 보고서** (Discope 적용 시): [`./02_SRS_MVP-...보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) § (디스코프 사유)

## ✅ Task Breakdown (실행 계획)
- [ ] (구체적 실행 단계 1 — Server Action / Route Handler / Prisma 마이그레이션 / Zod 스키마 등)
- [ ] (구체적 실행 단계 2)
- [ ] (구체적 실행 단계 3)
- [ ] (...총 5~10개 권장. 각 단계는 30분~2시간 단위)

## 🧪 Acceptance Criteria (BDD/GWT)
> SRS REQ-FUNC의 G/W/T를 그대로 인용하거나 구체화. 정상 시나리오 + 예외 시나리오 최소 각 1개씩.

**Scenario 1: {정상 시나리오 제목} (REQ-FUNC-XXX)**
- **Given**: ...
- **When**: ...
- **Then**: ...

**Scenario 2: {예외 시나리오 제목}**
- **Given**: ...
- **When**: ...
- **Then**: ...

(필요 시 Scenario 3, 4, 5 추가)

## ⚙️ Technical & Non-Functional Constraints
- **{REQ-NF-NNN}**: (수치 임계치 — SRS §4.2에서 인용)
- **C-TEC-XXX**: (관련 기술 제약)
- **횡단 제약 체크** (해당 시):
  - [ ] CON-04 금칙어("진단", "장애", "치료", "환자") 배제 (UI 노출/AI 응답 시)
  - [ ] Disclaimer "의료적 판단 아님" 100% 노출 (결과 화면 시)
  - [ ] CON-03 음성 ≤7일 폐기 (Storage 사용 시)
  - [ ] Gemini Rate Limiter (LLM 호출 시 — 무료 RPM 15 보호 = SEC-004)
- **R{N} 리스크 완화** (해당 시): R1 의료규제 / R3 교사 거부 / R4 개인정보 / R7 Vercel Timeout / R8 Supabase Free
- **비용 가드레일** (해당 시): G1~G6 (02 보고서 §3.4)

## 🏁 Definition of Done (DoD)
- [ ] 모든 Acceptance Criteria 충족
- [ ] 단위/통합 테스트 추가 및 통과 (Vitest / Playwright)
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors / 0 warnings
- [ ] Zod 스키마로 입출력 검증 (Server Action / Route Handler 시)
- [ ] Vercel Preview 배포 통과
- [ ] SRS REQ-FUNC ID와 코드 주석 또는 PR 본문 매핑 (추적성 보존)
- (필요 시 추가 — 시드 데이터, 마이그레이션, 인덱스 EXPLAIN, Lighthouse 점수 등)

## 🚧 Dependencies & Blockers
- **Depends on**: {Task ID 리스트, 콤마 구분} — 본 태스크가 시작되려면 완료되어야 할 선행
- **Blocks**: {Task ID 리스트} — 본 태스크가 완료되면 시작 가능한 후속
- **Discope 영향** (해당 시): "이 태스크는 {Discope ID} 적용 → {대체 수단}으로 단순 대체 구현"
```

# Project-Specific Context (반드시 숙지)

## Title Prefix 매핑 ({TYPE} 부분)

| Task ID prefix | Title 표기 |
|:---|:---|
| `DB-` | `[DB]` |
| `API-` (Server Action: API-001~004, 011) | `[Server Action]` |
| `API-` (Route Handler: API-005~009, 012) | `[Route Handler]` |
| `API-` (인증: API-010) | `[Auth]` |
| `MOCK-` | `[Mock]` |
| `FR-Q-` | `[FR-Q]` |
| `FR-C-` | `[FR-C]` |
| `TEST-` | `[Test]` |
| `INFRA-` | `[INFRA]` |
| `PERF-` | `[Performance]` |
| `SEC-` | `[Security]` |
| `MON-` | `[Monitoring]` |
| `OPS-` | `[Ops]` |

## Phase / Mode 표기 (강화판 §3 그대로 인용)

- 🟢 **P0 Active** — Sprint 1~4 (1개월) 명세대로 구현
- 🟡 **P1 Defer** — 리텐션 검증 후 구현 (2~4개월차)
- 🔴 **P2 Defer** — B2B 진입 후 구현 (5개월차+)
- **명세대로** — SRS 그대로
- **단순화** — SRS의 일부만 우선 구현
- 🔵 **Replace** — SRS 명세를 단순 대체 수단으로 치환
- ❌ **보류** — 해당 Phase에서 미구현

## 8대 디스코프 (Discope 영향 표기 시 사용)

| ID | 권고 |
|:---|:---|
| 67-D1 | 실시간 오디오 → Web Speech API / 녹음 파일 |
| 67-D2 | Capacitor 앱스토어 배포 보류 |
| 67-D3 | Phase 2 Zero-touch 보류 |
| D4 | HITL Realtime 큐 → Slack 웹훅 |
| D5 | PWA 오프라인 소급 보상 → 온라인 전제 |
| D6 | pgvector 영구 보관 → 미생성 |
| D7 | Edge Runtime 오디오 프록시 → 클라이언트 직접 STT |
| D8 | AI 쿠션어 알림장 + 키즈노트 → 클립보드 복사 |

## 횡단 제약 (해당 태스크에 영향 시 체크박스로 명시)

| 제약 | 적용 조건 |
|:---|:---|
| **CON-04 금칙어** | UI 노출 / AI 응답 / DB INSERT 직전 → 정규식 `/(진단\|장애\|치료\|환자)/` 검증 |
| **Disclaimer 100%** | 결과 페이지·리포트 등 AI 판정 결과 표시 시 → 페이지당 3곳 노출 |
| **CON-03 7일 폐기** | Supabase Storage 사용 시 → Vercel Cron으로 자동 파기 |
| **Rate Limiter (SEC-004)** | Vercel AI SDK / Gemini API 호출 시 → 무료 RPM 15 보호 |
| **R4 개인정보** | 자녀 식별정보 저장 시 → 이름·생년월일 미저장, 월령만 |
| **G6 비용 가드** | 음성 클라이언트 측 STT만 → Storage 비용 0 |

## Mode별 명세 깊이 가이드

| Mode | Task Breakdown 단계 수 | AC 시나리오 수 | DoD 체크 수 | 본문 라인 수 |
|:---|:---:|:---:|:---:|:---:|
| 🟢 명세대로 (Active) | 7~10 | 4~6 | 7~10 | 100~150 |
| 🟢 단순화 | 5~8 | 3~5 | 5~8 | 80~120 |
| 🟡 P1 Defer (명세대로) | 5~8 | 3~5 | 5~8 | 80~120 |
| 🔵 Replace | 3~5 (대체 수단 중심) | 2~3 (대체 검증) | 4~6 | 60~80 |
| ❌ Hold | 2~3 (보류 사유 + 부활 조건) | 1 (대안 없음 시 N/A) | 3~5 | 40~60 |
| 🔴 P2 Defer | 5~8 | 3~5 | 5~8 | 80~120 |

## 도메인별 자주 인용되는 SRS 섹션

| Task 도메인 | 주요 SRS 참조 |
|:---|:---|
| DB-* | §6.1 ERD, §1.5.1 C-TEC-003, §6.4 Tech Stack |
| API-* (Server Action) | §3.5 API Overview, §3.6 시퀀스, §1.5.1 C-TEC-002 |
| API-* (Route Handler) | §3.5, §3.3 External Systems |
| FR-Q-* (UI Read) | §3.4 Client Apps, REQ-FUNC §4.1 |
| FR-C-* (UI Write) | REQ-FUNC §4.1, §3.6 시퀀스, REQ-FUNC-HITL §4.1 |
| TEST-* | §5 Traceability Matrix |
| INFRA-* | §1.5.1 C-TEC-007, §6.5 Timeline, §6.4 Tech Stack |
| SEC-* | §4.2 NF 보안, REQ-NF-019 RBAC, R1/R4 리스크 |
| PERF-* | §4.2 NF 성능, REQ-NF-001~006 |
| MON-* | §4.2 NF 모니터링, REQ-NF-020~024 |
| OPS-* | §4.2 NF 가용성/SLA, REQ-NF-007~012 |

# Lock / Concurrency Protocol

본 레포는 **88개 `TASK_*.md` 파일이 사전에 0-byte로 생성**되어 있어 Lock 슬롯 역할을 한다.

| 파일 상태 | 의미 | 에이전트 액션 |
|:---|:---|:---|
| 파일 없음 | 정의되지 않은 Task ID | 생성하지 말 것 |
| **0-byte 빈 파일** | **사용 가능 (이번 작업 대상)** | **Read 등록 후 Write로 채움** |
| `## 🎯 Summary` 헤더 포함 | 다른 에이전트가 완료 | **건드리지 말 것** (덮어쓰기 금지) |

**빈 파일 식별 명령어 (PowerShell):**
```powershell
Get-ChildItem "From PRD to SRS/TASKS/TASK_*.md" | Where-Object { $_.Length -eq 0 } | Select-Object Name
```

**빈 파일 식별 (Bash):**
```bash
find "From PRD to SRS/TASKS" -name "TASK_*.md" -size 0
```

# Constraints (절대 준수)

1. **SRS V06 본문 절대 수정 금지** — `65_SRS_V06_Nextjs_Fullstack_Final.md` 한 줄도 건드리지 않는다
2. **88개 Task ID 그대로 유지** — 강화판 §3 표 ID와 1:1
3. **한국어 본문** — 코드 주석/예시 영어 가능, 본문은 한국어
4. **Replace/Hold 명시** — 단순 대체 또는 보류라도 사유와 부활 조건을 반드시 명시
5. **REQ-FUNC ID 누락 금지** — 모든 Active/명세대로 태스크는 SRS REQ-FUNC ID 최소 1개 인용
6. **횡단 제약 누락 금지** — UI 노출 / AI 호출 / Storage 사용 / 자녀 정보 다루는 태스크는 해당 체크박스 필수

# Quality Bar (작성 후 자체 검증)

다음을 모두 충족할 때만 작업 완료로 본다:

- [ ] Gold-standard 11개 예시와 톤·깊이 일치
- [ ] 9개 섹션 + 4개 신규 필드 누락 없음
- [ ] SRS REQ-FUNC ID 1:1 매핑
- [ ] BDD/GWT ≥ 2 시나리오 (정상 + 예외)
- [ ] Dependencies "Depends on" + "Blocks" 모두 명시
- [ ] 횡단 제약 체크박스 (해당 시) 누락 없음
- [ ] DoD 체크박스 ≥ 5개
- [ ] 80~150줄 (Replace/Hold는 40~80줄)
- [ ] 절대 SRS V06 본문을 수정하지 않음

# Output

- **저장 경로**: `From PRD to SRS/TASKS/TASK_{TASK-ID}.md`
- **파일명 컨벤션**: `TASK_DB-001.md`, `TASK_FR-Q-005.md` 등 (Task ID = 강화판 §3 그대로)
- **완료 보고**: 작업 종료 시 채팅으로 다음을 보고
  1. 채운 Task ID 리스트 (예: "TASK_DB-007, TASK_DB-009, TASK_API-002, ... 8개 완료")
  2. 진행률 (예: "11/88 → 19/88")
  3. 다음 배치 권장 (예: "다음은 P1 FR-Q 9개 추출 권장")

# Reference: 완료된 Gold-standard 11개 (스타일 가이드)

스타일·톤·구조의 기준점. 작업 시작 전 최소 1개 이상 정독:

| Task ID | 파일 | 주요 특징 |
|:---|:---|:---|
| DB-001 | `TASK_DB-001.md` | Foundation, 의존성 루트 |
| DB-002 | `TASK_DB-002.md` | enum + 시드 + R4 개인정보 |
| DB-005 | `TASK_DB-005.md` | 인덱스 + FK + CON-04 |
| DB-006 | `TASK_DB-006.md` | 시드 25개 + 한국어 음운론 |
| DB-008 | `TASK_DB-008.md` | UPSERT + 동시성 + Cascade |
| API-001 | `TASK_API-001.md` | Zod 입출력 + Discope 67-D1 |
| FR-Q-001 | `TASK_FR-Q-001.md` | SSR + Web Speech + Disclaimer |
| FR-Q-002 | `TASK_FR-Q-002.md` | RSC + 금칙어 인라인 검증 |
| FR-C-001 | `TASK_FR-C-001.md` | 8단계 비즈니스 로직 + LLM 타임아웃 |
| FR-C-009 | `TASK_FR-C-009.md` | 멱등성 + 동시성 + Optimistic UI |
| INFRA-001 | `TASK_INFRA-001.md` | Vercel Pro + 환경 변수 + Cron |

---

**— End of Agent Prompt v1.0 (2026-05-08) —**
