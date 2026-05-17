@AGENTS.md

---

# Claude Code 전용 추가 룰

> AGENTS.md 의 공통 룰을 모두 import 한 위에, Claude Code 세션 특화 룰을 추가한다.

## 1. 스킬 우선순위 (Skills priority)

작업 진입 시 다음 순서로 스킬을 고려:

1. **`.claude/skills/001~003`** (canonical 자체 스킬) — `srs-task-decomposition` / `git-pr-workflow` / `error-fix-protocol`
2. **`.claude/skills/100~120`** (Matt Pocock 외부 통합, MIT) — `grill-me` / `handoff` / `write-a-skill` / `diagnose` / `triage` / `to-issues` / `tdd` / `zoom-out` / `git-guardrails`
3. **`.cursor/skills/300~311`** — 백엔드 도메인 스킬 (Server Actions, Prisma, Supabase, Zod, AI SDK, …) — Claude 도 같은 내용 참조
4. **`.claude/agents/`** — subagent 위임 후보 (react-frontend, java-spring 등 8종, 단 도메인 부적합 에이전트는 위임 자제)

자주 사용:
- 방향 점검: `grill-me`
- sub-session 종료: `handoff`
- 새 이슈 분류: `triage`
- 에러 발생: `diagnose` + 003-error-fix-protocol 비교
- 요구사항 분해: `to-issues` + 001-srs-task-decomposition 비교

## 2. Subagent 사용 가이드라인

현재 `.claude/agents/` 에 등록된 8개 중 본 프로젝트 (Next.js + Supabase) 와 직접 정합한 것은 **react-frontend** 1종. 나머지 (java-spring, gradle, flutter-app 등) 는 도메인 부적합이므로 **호출 자제 + 향후 삭제 또는 교체 후보** ([tasks/05_AI_Harness_재정립_계획서.md](tasks/05_AI_Harness_재정립_계획서.md) Phase 1).

- 코드 탐색 / 룰 검토: **Explore agent**
- 설계 / 계획: **Plan agent**
- 도메인 적합 subagent 부재 시: **general-purpose** 사용

## 3. Push 정책

- **`git push origin main` 직접 실행 차단** (settings.local.json 정책) — 사용자가 PowerShell 에서 수동 실행
- 커밋은 자동 가능 (allow rule 등록됨)
- PR 워크플로 부재 → 솔로 직접 main 작업 패턴 인지

## 4. Permission Rules

- Bash 명령 중 destructive (`rm -rf`, `git reset --hard`, force push 등) 시 사용자 확인
- 외부 secret 노출 의심 시 즉시 작업 중단 + 알림
- `client_secret_*.json`, `.env*` 파일 commit 시도 절대 금지 (.gitignore 검증)

## 5. 메모리 (auto-memory) 활용

- `C:\Users\USER\.claude\projects\...\memory\` 에 누적된 사용자 / 프로젝트 / 피드백 메모리 활용
- 새 학습 시 메모리 업데이트:
  - 사용자 명시 요청 시
  - 반복 가능한 패턴 발견 시
  - 사용자 frustration 발생 후 재발 방지 룰
- 외부 사이트 UI 가이드 캐싱은 reference 메모리에 (자주 바뀜 — 만료일 명시 권장)

## 6. 대화기록 (Prompt/대화기록_YYYY-MM-DD.md)

- 일자별 단일 파일, sub-session 시 §N append
- 사용자 확인 전 commit / push 금지
- 보안 정보 (Client ID/Secret 등) 절대 본문에 노출 금지 (참조만)

## 7. ⚠️ Next.js 16 컨텍스트

AGENTS.md §6 의 Next.js 16 경고는 모든 코드 생성 시 적용. 학습 데이터의 Next.js 13/14/15 패턴을 그대로 적용 금지.

특히 본 프로젝트의 변경점:
- `middleware.ts` → `proxy.ts` (root)
- `export function middleware` → `proxy`
- Server Action 안에서 `revalidatePath` / `revalidateTag` 호출 패턴
- App Router 만 사용 (Pages Router 미사용)
