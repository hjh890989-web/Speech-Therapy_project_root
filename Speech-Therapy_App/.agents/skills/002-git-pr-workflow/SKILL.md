---
name: 002-git-pr-workflow
description: Git commit / push / PR 워크플로 — Conventional Commits + 푸시 정책 + PR 작성.
canonical: true
---

# Git / PR Workflow (Canonical)

> 이 스킬은 `.agents/skills/` 가 canonical source.

## 1. 커밋 메시지 — Conventional Commits

### 1.1 포맷

```
<type>(<scope>): <한 줄 요약, ≤72자>

<본문 — 왜 (why) 중심, 무엇 (what) 은 diff 가 설명>

<footer — 참조 issue / co-author>
```

### 1.2 type

| type | 의미 |
|---|---|
| `feat` | 신규 기능 |
| `fix` | 버그 수정 |
| `hotfix` | 운영 긴급 수정 |
| `docs` | 문서 |
| `chore` | 빌드 / 의존성 / 설정 |
| `refactor` | 리팩토링 (동작 동일) |
| `test` | 테스트만 |
| `perf` | 성능 |
| `style` | 포맷 (기능 X) |

### 1.3 scope (도메인 키)

- `Sprint 3 §N`, `API-010 §N` (스프린트 기준 작업)
- `auth`, `diagnosis`, `rewards`, `ai`, `ratelimit` 등 lib 도메인
- `db`, `prisma` (스키마)
- `infra`, `vercel` (배포)

### 1.4 예시

```
hotfix(API-010 §1): PKCE verifier cookies 저장 강제 — Magic Link 로그인 실패 해결

증상: Magic Link 클릭 후 /login?error=PKCE%20code%20verifier%20not%20found.
원인: createBrowserClient 옵션 미지정 → @supabase/ssr 0.10.3 기본 storage 가
PKCE verifier 를 localStorage 에 저장. server.ts 는 cookies 어댑터로 cookie 만
읽으므로 verifier 미검출.
해결: client.ts 에 명시적 cookies (getAll/setAll) 어댑터 추가.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## 2. 푸시 정책

### 2.1 main 직접 푸시

- **Claude Code 권한 정책으로 차단됨**: `git push origin main` 자동 실행 거부
- **해결**: 사용자가 PowerShell 에서 직접 실행

```powershell
git push origin main
```

→ AI 는 commit 까지만 / push 는 사용자 수동.

### 2.2 push 전 검증

```powershell
npm run lint
npm run test
git status        # untracked / modified 확인
git log --oneline -5  # 직전 커밋 확인
```

## 3. `.gitignore` 점검 (commit 전)

```
client_secret_*.json    # Google OAuth secret JSON
/client_secret_*.json
.env*                   # 모든 환경변수 파일 (Speech-Therapy_App/.gitignore)
```

⚠️ `git add .` 또는 `git add -A` 신중히 — 위 패턴이 누락되면 secret 노출.

## 4. PR 작성 (Phase 1+ 도입 후)

현재는 솔로 + main 직접 작업 패턴이지만, B2B (Phase 2) 진입 시 PR 워크플로 도입.

### 4.1 PR 제목

```
<type>(<scope>): <요약, 70자 이내>
```

### 4.2 PR 본문 템플릿

```markdown
## Summary
<1~3 bullet>

## 변경 파일
- lib/X.ts (추가)
- app/actions/Y.ts (수정)

## Test plan
- [ ] vitest 통과
- [ ] Playwright E2E
- [ ] 모바일 수동 검증

## 위험 / 롤백
<DB migration / breaking change 있으면 명시>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## 5. 커밋 단위 가이드

- 1 commit = 1 논리적 변경 (한 가지 이유로 묶임)
- 100줄+ commit 은 분할 검토
- 핫픽스는 별도 commit (분리 머지 가능)
- 도구 fork (Co-Authored-By) 시 footer 명시

## 6. 안티패턴

- ❌ `git add .` 후 무검증 commit (secret 노출 위험)
- ❌ 의미 없는 message ("update", "fix bug")
- ❌ `--no-verify` 로 hook 우회 (사용자 명시 요청 시만 허용)
- ❌ force push to main 시도

## See also

- [.gitignore](../../.gitignore)
- 대화기록 §12, §13 (2026-05-15) — 핫픽스 커밋 메시지 실제 예시
