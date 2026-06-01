# Speech-Therapy — AI 에이전트 공통 룰

> 모든 AI 도구 (Claude Code / Cursor / Gemini) 가 자동 로드하는 최상위 룰 파일.
> 본 파일이 임포트한 규칙은 도구 무관하게 모든 코드 생성에 적용된다.
> 상위 참조: `docs/54_PRD_V10_Final.md`, `docs/64_SRS_V05_Merged_Master_Final.md`.

---

## 1. 프로젝트 정체성

- **제품명**: Speech-Therapy — 부모용 발음/발화 진단 + 가이드 서비스 (DTx 아님, 의료 보조 도구)
- **단계**: MVP Phase 0 (스크리닝 + 가이드) → Phase 1 (리텐션, 보상) → Phase 2 (B2B 도입)
- **북극성 KPI**: **W-AUR (Weekly Active User Rate) ≥ 60%** — 주간 미션 완수율 기반
- **타깃 페르소나**: 발음 발달이 걱정인 자녀 (만 2~7세) 의 부모 (Seg A~D, PRD §3)

## 2. 결정적 의사결정 정책 (위반 금지)

### 2.1 의료 disclaimer (CON-04)

- 모든 UI / 카피 / API 응답에서 다음 금칙어 사용 금지: **"치료"**, **"진단"**, **"장애"**
- 대안 표현: "발음 발달 확인", "발음 가이드", "발음 어려움"
- 본 서비스는 의료적 판단 미제공 — 부모 정보 제공용 보조 도구임을 명시

### 2.2 데이터 격리 (REQ-NF-SEC)

- 사용자 데이터는 **anonymous_user_id** (cookie + localStorage) 또는 인증 user id 기준으로 격리
- 다른 사용자 데이터에 절대 cross-read 금지
- 워크스페이스 / 계정 경계는 server-side 에서 강제

### 2.3 보안 (REQ-NF-SEC)

- TLS 1.2+ 필수 (Vercel 기본)
- 민감 정보 (이메일, OAuth secret 등) 은 환경변수 또는 secret store
- **client_secret_*.json**, **.env*** 절대 git commit 금지 (.gitignore 적용 확인)
- secret 노출 시도 시 즉시 알림 + 작업 중단

### 2.4 성능 (REQ-NF-PERF)

- 진단 페이지 로드: ≤ 5초 (p95)
- AI 응답 (Gemini): < 10초 (p95) — 초과 시 graceful fallback
- 무료 SMTP rate limit / Vercel Hobby 제약 인지 후 대안 마련

### 2.5 HITL (Human-in-the-Loop) — Phase 1+

- 전문가 감수 SLA: 48시간 이내 회신
- 자동 분석 + 전문가 보정 이중 구조

## 3. 백엔드 기술 스택 (`package.json` 기준)

| 분야 | 기술 | 버전 |
|---|---|---|
| 런타임 | Node.js (Vercel serverless) | 20.x |
| 프레임워크 | **Next.js** (App Router, Server Actions, Route Handlers) | **16.2.6** |
| 언어 | TypeScript strict | 5.x |
| ORM | **Prisma** | **7.8.0** |
| DB | PostgreSQL (Supabase 호스팅) | — |
| 인증 | **@supabase/ssr** (PKCE + cookies) | 0.10.3 |
| AI | **@ai-sdk/google** (Gemini) | 3.0.73 |
| 검증 | **Zod** | 4.4.3 |
| 테스트 | Vitest + Playwright | — |

**우리 스택에 없는 것** (혼동 금지): Java Spring / JPA / MySQL / Kafka / Redis / Vite / Flutter / FastAPI.

## 4. 룰 우선순위

코드 생성 시 다음 순서로 룰을 적용:

1. **본 AGENTS.md** (이 파일) — 최상위 정책
2. **`.agents/rules/001-003`** — 도구 공통 보편 룰
3. **`.cursor/skills/*` 또는 `.claude/skills/*`** — 도구별 도메인 스킬
4. **`docs/54_PRD_V10_Final.md` + `docs/64_SRS_V05_Merged_Master_Final.md`** — 요구사항 컨텍스트
5. 도구별 자체 가이드 (README-{claude,cursor,gemini}-harness.md)

상위 룰과 충돌 시 상위 우선.

## 5. 운영 정책

### 5.1 Git / Push 정책

- **main 직접 push 차단** (Claude Code 권한 정책) — 사용자 PowerShell 직접 실행 필요
- Conventional Commits 표준 (`type(scope): summary`)
- 커밋 메시지에 한국어 + 영문 혼용 허용 (사용자 선호)

### 5.2 대화기록 저장 프로토콜

- 일자별 `Prompt/대화기록_YYYY-MM-DD.md` 단일 파일
- 사용자 확인 전 공유/푸시 금지 (auto-memory protocol)
- sub-session 발생 시 같은 파일 안에 §N 으로 append

### 5.3 외부 사이트 UI 안내 시 추측 금지

- Google Cloud Console / Supabase Dashboard 등 외부 사이트의 UI 가이드는 **공식 문서 (WebSearch/WebFetch) 또는 사용자 스크린샷 기준**으로만 안내
- 학습 데이터의 옛 UI 기준으로 추측 금지 (2026-05-15 sub-session 학습)

### 5.4 외부 스킬 라이브러리 (Matt Pocock skills)

- 본 프로젝트의 `.agents/skills/` / `.cursor/skills/` / `.claude/skills/` 의 **100~120 번대** 스킬은 [github.com/mattpocock/skills](https://github.com/mattpocock/skills) (MIT) 에서 통합. 출처 헤더 + `LICENSE-mattpocock-skills.md` 보존
- **130-goal-setting** ([github.com/wild-mental/goal-setting-skill](https://github.com/wild-mental/goal-setting-skill), MIT, 2026-06-01 통합) — 장기 실행 `/goal` 프롬프트를 측정·증명·종료 가능하게 설계하는 메타 스킬. 출처 헤더 + `LICENSE-goal-setting-skill.md` 보존. 산출물 실행엔 `/goal`(Claude Code v2.1.139+) 필요
- 본 프로젝트 자체 스킬 번호: 001~003 (canonical) + 300~311 (.cursor/skills 백엔드)
- 외부 라이브러리 원본 (`Speech-Therapy_App/skills/`, 루트 `Harness&Skills/`) 은 `.gitignore` 처리 — 참고용 보존, 통합 후 commit 제외
- 자주 쓰는 스킬: **`grill-me`** (방향 점검), **`handoff`** (sub-session 인계), **`triage`** (이슈 분류), **`diagnose`** (에러 진단), **`to-issues`** (요구사항→issue)

---

<!-- BEGIN:nextjs-agent-rules -->

## 6. ⚠️ Next.js 16 — 학습 데이터와 다름

> 이 섹션은 모든 AI 도구가 코드 생성 직전에 반드시 인지해야 하는 critical warning.

This version (Next.js 16) has **breaking changes** — APIs, conventions, and file structure may all differ from your training data. **Before writing any Next.js code**:

- Read the relevant guide in `node_modules/next/dist/docs/` for the exact API surface
- Heed deprecation notices in the codebase (e.g., `proxy.ts` replaces `middleware.ts`)
- Verify Server Action / Route Handler / Server Component patterns against actual installed version
- Trust the actual installed code over your training data

본 프로젝트의 Next.js 16 변경점 예시:
- `middleware.ts` → **`proxy.ts`** (root)
- `export function middleware` → `proxy`
- Edge runtime 미지원 분기 존재 (Prisma 7 등)

<!-- END:nextjs-agent-rules -->

---

## 7. 참조 파일

- [`CLAUDE.md`](CLAUDE.md) — Claude Code 추가 룰
- [`.agents/rules/`](.agents/rules/) — 공통 보편 룰
- [`.agents/skills/`](.agents/skills/) — 도구 간 공유 스킬 (canonical)
- [`.cursor/skills/`](.cursor/skills/) — Cursor 도메인 스킬
- [`.claude/skills/`](.claude/skills/) — Claude 도메인 스킬 (`.agents/skills/` 복사본)
- [`.claude/agents/`](.claude/agents/) — Claude subagent
- [`docs/54_PRD_V10_Final.md`](docs/54_PRD_V10_Final.md) — 제품 요구사항
- [`docs/64_SRS_V05_Merged_Master_Final.md`](docs/64_SRS_V05_Merged_Master_Final.md) — 시스템 요구사항
- [`tasks/05_AI_Harness_재정립_계획서.md`](tasks/05_AI_Harness_재정립_계획서.md) — harness 재정립 계획
- [`tasks/06_Skills_백엔드_정합성_분석_보고서.md`](tasks/06_Skills_백엔드_정합성_분석_보고서.md) — 스킬 분석 보고서
