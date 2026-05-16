# 05. AI Harness 재정립 — 종합 계획서 (보고서)

> **문서 정보**
> - **작성일**: 2026-05-16
> - **작성자**: Claude (Opus 4.7, 1M context) + 사용자 (`hjh890989@gmail.com`)
> - **버전**: v1.0
> - **위치**: `Speech-Therapy_App/tasks/05_AI_Harness_재정립_계획서.md`
> - **상태**: 사용자 승인 대기 (Phase 0 진입 게이트)
> - **상위 참조 문서**: `docs/54_PRD_V10_Final.md`, `docs/64_SRS_V05_Merged_Master_Final.md`, `README-{claude,common,cursor,gemini}-harness.md`

---

## 0. Executive Summary

본 보고서는 Speech-Therapy 프로젝트의 AI 개발 harness (Claude Code + Cursor + Gemini + 공통 에이전트 룰) 를 처음부터 재정립하기 위한 계획서다.

- **문제**: 4개 도구의 harness 폴더가 모두 존재하지만 콘텐츠가 템플릿 수준이거나 비어있어 일관된 프로젝트 컨텍스트 제공 불가
- **해결**: PRD V10 + SRS V05 의 제품 요구사항을 반영해 24개 산출물을 3단계 (Phase 0/1/2) 로 작성
- **일정**: 2.5~4시간 (Claude 작업 시간, 사용자 검토 별도)
- **선결조건**: 5개 결정사항 사용자 확정 (본 문서 §4)

---

## 1. 배경 및 목적

### 1.1 배경

본 작업이 시작된 직접 계기는 **2026-05-15 ~ 2026-05-16 sub-session 진행 중 노출된 harness 결함**이다:

1. **`AGENTS.md` 콘텐츠 부족** — 327 bytes, Next.js 경고문만 있고 Speech-Therapy 프로젝트 컨텍스트 미반영 → AI 가 제품 목표/제약/페르소나 모르는 상태로 코드 생성
2. **`CLAUDE.md` 미작성** — `@AGENTS.md` 1줄 (11 bytes) 로 import 만, 추가 Claude Code 전용 룰 없음
3. **`.claude/skills/` 폴더 부재** — Claude 표준 SKILL.md 패턴 미활용 (`.claude/commands/` 레거시 구조만 존재)
4. **도구별 격차** — Cursor 는 `.cursor/skills/` 23개로 충실, Gemini 는 `.gemini/agents/` 1개만, `.agents/skills/` (공통) 은 폴더만 비어있음
5. **가이드 노후화 발생** — `tasks/API-010-section-2-google-oauth-setup.md` 가 구 Google Cloud UI 기준이라 현재 사용자 환경 (Google 인증 플랫폼 신 UI) 과 충돌 → 사용자 시간 낭비 발생

### 1.2 목적

PRD V10 + SRS V05 의 제품 요구사항이 AI 개발 harness 에 **100% 반영**되어, 다음을 보장한다:

| # | 목표 |
|---|---|
| O1 | 어느 AI 도구 / 세션에 진입해도 일관된 Speech-Therapy 컨텍스트 자동 로드 |
| O2 | 핵심 제약 (의료 disclaimer, 데이터 격리, HITL 48h SLA, W-AUR ≥60%) 이 모든 코드 생성에 반영 |
| O3 | 도구별 강점 활용 (Claude subagent, Cursor rules globs, Gemini workflow) |
| O4 | 가이드 노후화 방지 (정기 검증 룰 포함) |

---

## 2. 현황 분석

### 2.1 PRD/SRS 에서 도출한 harness 필수 반영 제약

| ID | 제약 | 반영 위치 |
|---|---|---|
| **G1** | MVP Phase 0 → 리텐션 Phase 1 → B2B Phase 2 단계별 진행 | `AGENTS.md`, `.agents/rules/001-project-overview` |
| **G2** | REQ-NF-PERF (스크리닝 ≤5분, 문서생성 <10s p95) | `.agents/rules/003-development-guidelines` |
| **G3** | REQ-NF-SEC (TLS 1.2+, AES-256 민감정보 암호화, 워크스페이스 데이터 격리) | `.agents/rules/003` + `.claude/settings.local.json` 권한 |
| **G4** | CON-04 의료 disclaimer + 금칙어 ("치료/진단/장애" 금지) | `AGENTS.md` 핵심 영역 (top-level 룰) |
| **G5** | HITL 전문가 감수 48h SLA | `.agents/skills/` + `.agents/workflows/hitl-feedback-loop` |
| **G6** | W-AUR (Weekly Active User Rate) ≥60% 북극성 KPI | `AGENTS.md` |
| **G7** | Zero-touch 음성 수집 + 원장 명의 리포트 (B2B 도입 조건) | `.agents/rules/001` 페르소나 + 도메인 컨텍스트 |

### 2.2 현재 파일 트리 상태

#### 2.2.1 공통 영역

| 경로 | 크기 / 상태 | 평가 |
|---|---|---|
| `AGENTS.md` | 327 bytes | ⚠️ Next.js 경고문만 (G1~G7 미반영) |
| `CLAUDE.md` | 11 bytes (`@AGENTS.md`) | ⚠️ import 만, 추가 룰 없음 |
| `.agents/rules/001-project-overview.md` | 템플릿 | ⚠️ Speech-Therapy 미반영 |
| `.agents/rules/002-tech-stack.md` | 축약본 | ⚠️ 실제 스택 (Next.js 16, Supabase, Prisma, Gemini) 미명시 |
| `.agents/rules/003-development-guidelines.md` | 기본 틀 | ⚠️ 의료 disclaimer / 데이터 격리 / HITL 미명시 |
| `.agents/skills/` | 비어있음 | ❌ 핵심 공유 스킬 0개 |
| `.agents/workflows/generate-agent-rule.md` | 메타 가이드 | ✅ 유지 |
| `.agents/workflows/generate-tasks-from-srs.md` | 메타 가이드 | ✅ 유지 |

#### 2.2.2 Claude Code

| 경로 | 상태 | 평가 |
|---|---|---|
| `.claude/agents/` | 8개 파일 | ✅ 충실 (react-frontend, java-spring, gradle, flutter-app 등) — 단 Speech-Therapy 도메인 에이전트 부재 |
| `.claude/commands/` | 3개 (fix-error, gitflow-commit, setup-env) | ⚠️ 레거시 구조 — Skills 마이그레이션 필요 |
| `.claude/skills/` | 부재 | ❌ 디렉터리 없음 |
| `.claude/settings.local.json` | 부분 (commit 일부 룰) | ⚠️ 정리 + 보강 필요 |

#### 2.2.3 Cursor

| 경로 | 상태 | 평가 |
|---|---|---|
| `.cursor/rules/001-003.mdc` | 3개 템플릿 | ⚠️ 콘텐츠 작성 필요 |
| `.cursor/skills/` | 23개 SKILL.md | ✅ 가장 충실 — 유지 + 1~2개 도메인 추가 |
| `.cursor/agents/document-updater.md` | 1개 | ⚠️ 도메인 에이전트 부족 |
| `.cursor/hooks.json` | 부재 | ❌ 없음 (P2 후순위) |

#### 2.2.4 Gemini

| 경로 | 상태 | 평가 |
|---|---|---|
| `.gemini/agents/readme-architect.md` | 1개 | ⚠️ 도메인 에이전트 부족 |
| `.gemini/rules/`, `skills/`, `workflows/` | 부재 | ❌ 공통 영역 (`.agents/`) 명시적 참조 필요 |

---

## 3. 갭 분석 — 도구별 종합 표

| 영역 | 가이드 요구 | 현재 | 갭 | 우선순위 |
|---|---|---|---|---|
| **AGENTS.md** | Speech-Therapy 비전 + G1~G7 모두 반영 | Next.js 경고문만 | 전면 재작성 (Next.js 노트는 별도 섹션 보존) | **P0** |
| **CLAUDE.md** | Claude Code 추가 룰 (skill 우선순위, push 정책 등) | `@AGENTS.md` 1줄 | 확장 | **P0** |
| **`.agents/skills/` 공통 스킬** | 도구 간 공유 핵심 스킬 | 0개 | 3개 신규 (srs-task-decomposition / git-pr-workflow / error-fix-protocol) | **P0** |
| **`.agents/rules/001-003`** | Speech-Therapy 콘텐츠 | 템플릿 | 콘텐츠 작성 | **P1** |
| **`.agents/workflows/`** | 운영 워크플로 | 메타 2개 | mvp-deploy / hitl-loop 2개 추가 | **P2** |
| **`.claude/skills/`** | 온디맨드 스킬 디렉터리 | 부재 | 신규 디렉터리 + `.agents/skills/` 연결 | **P0** |
| **`.claude/agents/`** | subagent | 8개 (도메인 부족) | speech-analysis, hitl-reviewer 2개 추가 | **P1** |
| **`.claude/settings.local.json`** | 권한 화이트리스트 | 부분 | 정리 + push 정책 명시 | **P1** |
| **`.claude/commands/`** | Skills 마이그레이션 | 3개 commands | 마이그레이션 (mechanical) | **P2** |
| **`.cursor/rules/*.mdc`** | YAML + globs + 콘텐츠 | 3개 템플릿 | 콘텐츠 작성 | **P1** |
| **`.cursor/agents/`** | subagent | 1개 | speech-model-trainer 추가 | **P1** |
| **`.cursor/hooks.json`** | 라이프사이클 훅 | 부재 | beforeEdit/afterBuild 훅 | **P2** |
| **`.gemini/agents/`** | subagent | 1개 | security-auditor, srs-analyzer, deployment-validator 3개 | **P1** |
| **`.gemini/` 공통 연계** | `.agents/` 참조 명시 | 미연계 | rules/skills/workflows 참조 추가 | **P1** |

---

## 4. 결정사항 및 추천

Phase 0 진입 전 사용자 확정이 필요한 5건. 각 항목에 대해 Claude 의 추천 + 사유를 명시한다.

### 4.1 공유 스킬 동기화 방식

| 옵션 | 설명 | 평가 |
|---|---|---|
| A | Windows 심볼릭 링크 | ❌ 관리자 권한 또는 developer mode + `git config core.symlinks=true` 필요. Windows + Git 환경에서 fragile |
| **B** | **단순 복사 + canonical 룰** | ✅ **추천**. `.agents/skills/` 가 canonical, 변경 시 항상 거기 먼저 수정 후 다른 도구 폴더에 복사. Syntax 차이 (Cursor `.mdc` vs Claude SKILL.md) 가 있을 때 복사 시점에 어댑테이션 자연스러움 |
| C | 도구별 독립 작성 | ❌ 3개 도구 사용 시 3배 유지보수 + 룰 drift 위험 |

**추천: B (단순 복사, canonical-in-`.agents/`)**

### 4.2 AGENTS.md 의 Next.js 안내 처리

| 옵션 | 설명 | 평가 |
|---|---|---|
| A | `docs/NEXTJS_NOTES.md` 로 분리 | ❌ explicit read 안 하면 못 봄. 코드 생성 안전성에 직접 영향 |
| **B** | **AGENTS.md 안에 보존 (별도 섹션)** | ✅ **추천**. AGENTS.md 는 모든 AI 도구가 자동 로드 → Next.js 16 경고 (training data 와 다름) 가 prominent 하게 항상 보임. `## ⚠️ Next.js 16 — 학습 데이터와 다름` 섹션으로 |

**추천: B (AGENTS.md 안에 prominent 섹션으로 보존)**

### 4.3 harness 적용 범위

| 옵션 | 설명 | 평가 |
|---|---|---|
| **A** | **`Speech-Therapy_App/` 한정** | ✅ **추천**. 현재 모든 harness 파일이 거기에 있음 |
| B | `Speech-Therapy_Workbase/` 포함 | ❌ 워크베이스는 raw assets (영상/PDF/zip) 보관용 (gitignore 참조) — 개발 컨텍스트 아님. 2배 유지보수 |

**추천: A (Speech-Therapy_App 한정)**

### 4.4 `.claude/commands/` → `.claude/skills/` 마이그레이션 시점

| 옵션 | 설명 | 평가 |
|---|---|---|
| **A** | **Phase 2 (후순위)** | ✅ **추천**. 현재 commands 3개 동작 중이라 시급성 낮음. Phase 0 는 정합성 정리에 집중. 마이그레이션은 mechanical → 자동화 작업과 묶어 Phase 2 |
| B | Phase 0 에서 같이 정리 | ❌ Phase 0 항목 9개로 늘어나 risk + Phase 0 핵심 (콘텐츠) 흐려짐 |

**추천: A (Phase 2 마이그레이션)**

### 4.5 권한 정책 — `git push origin main` 직접 허용?

| 옵션 | 설명 | 평가 |
|---|---|---|
| A | 명시 허용 (자동 push) | ❌ 솔로 + 직접 main 작업 환경에서 자동 push 는 위험 대비 이득 작음 |
| **B** | **차단 유지 (사용자 수동 push)** | ✅ **추천**. 2026-05-15 본 sub-session 차단 정책 도입 이후 안전망 역할 수행 (사고 0건). PowerShell 1줄 추가가 friction 이지만 "이 commit 푸시되어도 되나" 의 마지막 게이트로 작동 |

**추천: B (차단 유지)**

### 4.6 권장 결정 요약

```
1=B, 2=B, 3=A, 4=A, 5=B
```

---

## 5. 단계별 실행 계획

### 5.1 Phase 0 — 정합성 정리 (P0, 즉시)

**목적**: 어느 AI 도구 / 세션에 진입해도 일관된 Speech-Therapy 컨텍스트 자동 로드.

| # | 작업 | 산출물 | 추정 |
|---|---|---|---|
| 1 | `AGENTS.md` 재작성 — G1~G7 모두 반영 + Next.js 16 섹션 보존 | 1 파일 | 10분 |
| 2 | `CLAUDE.md` 확장 — AGENTS.md 참조 + Claude Code 전용 룰 (skill 우선, push 정책 참조) | 1 파일 | 5분 |
| 3 | `.agents/skills/001-srs-task-decomposition/SKILL.md` 신규 | 1 SKILL.md | 10분 |
| 4 | `.agents/skills/002-git-pr-workflow/SKILL.md` 신규 | 1 SKILL.md | 10분 |
| 5 | `.agents/skills/003-error-fix-protocol/SKILL.md` 신규 | 1 SKILL.md | 10분 |
| 6 | `.claude/skills/` 디렉터리 신규 + `.agents/skills/` 3개 복사 (canonical 룰 적용) | 디렉터리 + 3 파일 | 5분 |
| **합계** | — | **6 항목 / 약 8 파일** | **약 50분** |

**검증 게이트**:
- 신규 Claude Code 세션 진입 → AGENTS.md / CLAUDE.md 자동 로드 확인
- 사용자 1차 리뷰 (콘텐츠 정확성, 표현 톤)

### 5.2 Phase 1 — 콘텐츠 보강 (P1, 1주 내)

**목적**: 가이드 요구사항 100% 충족 + 도구별 격차 해소.

| # | 작업 | 산출물 | 추정 |
|---|---|---|---|
| 1 | `.agents/rules/001-project-overview.md` 콘텐츠 보강 (페르소나 Seg A-D, TAM/SAM, 4대 극한) | 1 | 15분 |
| 2 | `.agents/rules/002-tech-stack.md` 실제 스택 명시 (Next.js 16, Supabase, Prisma 7, Gemini API) | 1 | 10분 |
| 3 | `.agents/rules/003-development-guidelines.md` 의료 disclaimer + 데이터 격리 + HITL 48h | 1 | 15분 |
| 4 | `.cursor/rules/001-003.mdc` 동일 콘텐츠 (`.mdc` + globs) | 3 | 15분 |
| 5 | `.claude/agents/speech-analysis.md` 신규 | 1 | 10분 |
| 6 | `.claude/agents/hitl-reviewer.md` 신규 | 1 | 10분 |
| 7 | `.cursor/agents/speech-model-trainer.md` 신규 | 1 | 10분 |
| 8 | `.gemini/agents/security-auditor.md` 신규 | 1 | 10분 |
| 9 | `.gemini/agents/srs-analyzer.md` 신규 | 1 | 10분 |
| 10 | `.gemini/agents/deployment-validator.md` 신규 | 1 | 10분 |
| 11 | `.claude/settings.local.json` 정리 + push 정책 명시 | 1 (수정) | 10분 |
| 12 | `.gemini/` 의 `.agents/` 공통 영역 참조 명시 (`.gemini/README.md` 등) | 1 | 5분 |
| **합계** | — | **12 항목 / 약 14 파일** | **약 130분** |

**검증 게이트**:
- 도구별 1회 실 사용 (Cursor 룰 globs 매칭, Claude skill 호출, Gemini agent 실행)
- 사용자 2차 리뷰

### 5.3 Phase 2 — 자동화 + 마이그레이션 (P2, 후순위)

| # | 작업 | 산출물 | 추정 |
|---|---|---|---|
| 1 | `.cursor/hooks.json` 신규 (beforeShellExecution lint, afterFileEdit prettier) | 1 | 10분 |
| 2 | `.claude/commands/fix-error.md` → `.claude/skills/004-fix-error/SKILL.md` 마이그레이션 | 1 | 5분 |
| 3 | `.claude/commands/gitflow-commit.md` → `.claude/skills/005-gitflow-commit/SKILL.md` 마이그레이션 | 1 | 5분 |
| 4 | `.claude/commands/setup-env.md` → `.claude/skills/006-setup-env/SKILL.md` 마이그레이션 | 1 | 5분 |
| 5 | `.agents/workflows/010-phase0-mvp-deploy.md` 신규 | 1 | 15분 |
| 6 | `.agents/workflows/020-hitl-feedback-loop.md` 신규 | 1 | 15분 |
| **합계** | — | **6 항목 / 6 파일** | **약 55분** |

**검증 게이트**:
- 훅 동작 확인 (prettier 자동 실행 등)
- 마이그레이션 후 기존 commands 제거 또는 deprecation 주석
- 사용자 최종 리뷰 + 본 계획서 archive

---

## 6. 위험 요소 및 완화

| ID | 위험 | 영향 | 완화 |
|---|---|---|---|
| **R1** | Windows 환경에서 공유 스킬 동기화 drift | M | §4.1 의 B 옵션 (canonical-in-`.agents/`) 룰 명문화 + 다른 도구 폴더에 복사 시 헤더에 "Sync from `.agents/skills/...`" 주석 |
| **R2** | Next.js 16 경고 누락 → 잘못된 코드 생성 | H | §4.2 의 B 옵션 (AGENTS.md 안 prominent 섹션) + 검증 게이트에서 Next.js 안내 로드 여부 명시적 확인 |
| **R3** | 본 sub-session 의 미해결 작업 (OAuth 401, Magic Link 검증) 과 컨텍스트 분산 | M | harness 정비 우선 / Sprint 검증 잠시 보류 결정 권장 — 또는 harness Phase 0 만 끝낸 후 OAuth 복귀 |
| **R4** | 가이드 문서 (README-*-harness.md) 가 또 다시 노후화 | M | `.agents/workflows/000-harness-maintenance.md` 신규 (정기 검증 룰) — Phase 2 에 추가 검토 |
| **R5** | 사용자 검토 시간 누적 (3 phase × 검토 = 3회 게이트) | L | Phase 0 만으로 최소 동작 가능 (Phase 1/2 는 점진 적용 가능) → 사용자 단계별 결정 |

---

## 7. 일정 및 리소스 추정

### 7.1 소요 시간

| Phase | 항목 수 | Claude 작업 | 사용자 검토 (추정) | 합계 |
|---|---|---|---|---|
| 0 | 6 | 50분 | 30분 | 1시간 20분 |
| 1 | 12 | 130분 | 60분 | 3시간 10분 |
| 2 | 6 | 55분 | 30분 | 1시간 25분 |
| **총** | **24** | **약 235분** | **약 120분** | **약 6시간** |

### 7.2 산출물 요약

| 영역 | 신규 파일 | 수정 파일 | 디렉터리 |
|---|---|---|---|
| 공통 (`AGENTS.md`, `CLAUDE.md`, `.agents/`) | 8 | 4 | 0 |
| Claude (`.claude/`) | 5 (skills) + 2 (agents) | 1 (settings) | 1 (skills/) |
| Cursor (`.cursor/`) | 1 (agents) + 1 (hooks) | 3 (rules) | 0 |
| Gemini (`.gemini/`) | 3 (agents) + 1 (README) | 0 | 0 |
| **총** | **21** | **8** | **1** |

---

## 8. 승인 게이트

| 단계 | 게이트 | 통과 조건 |
|---|---|---|
| **G0** | 본 계획서 검토 | 항목 추가/삭제 요청 0건 또는 반영 완료 |
| **G1** | 5개 결정사항 확정 | §4.6 의 권장값 또는 사용자 변경값 확정 |
| **G2** | Phase 0 완료 | 6 산출물 작성 + 신규 Claude 세션에서 AGENTS.md 로드 확인 |
| **G3** | Phase 1 완료 | 12 산출물 작성 + 도구별 1회 실 사용 검증 |
| **G4** | Phase 2 완료 | 6 산출물 작성 + 최종 사용자 리뷰 |
| **G5** | 본 계획서 archive | `tasks/05_AI_Harness_재정립_계획서.md` 에 "완료" 상태 + 후속 운영 가이드 링크 |

---

## 9. 후속 작업 (Phase 2 종료 후)

1. **본 sub-session 미완 작업 재개**: OAuth 401 invalid_client 재진단 + Magic Link PKCE 푸시 후 검증 (대화기록 §19 참조)
2. **Sprint 3 §2 A 재설계**: 핫픽스로 차단된 Web Audio capture 의 재설계 (옵션 A/B/C 중 선택)
3. **메모리 갱신**: Auto-memory 시스템에 본 harness 운영 룰 등록 (예: "외부 사이트 UI 안내 시 추측 금지")
4. **운영 가이드**: `tasks/06_AI_Harness_운영_가이드.md` 신규 — 신규 스킬 추가 / 룰 변경 / 도구 추가 시 절차

---

## 부록 A. 검증 사항 (Explore agent 보정)

본 계획서는 Explore subagent 의 갭 분석 리포트 기반으로 작성됐으나, 다음 한 가지를 메인 에이전트가 보정했다:

| Explore 주장 | 메인 보정 | 영향 |
|---|---|---|
| "AGENTS.md 는 `@AGENTS.md` 1줄 (순환 참조)" | AGENTS.md 는 327 bytes 의 Next.js 경고문, `@AGENTS.md` 1줄 (11 bytes) 은 CLAUDE.md | Phase 0 작업 1번 (AGENTS.md 재작성) 의 "기존 콘텐츠 보존" 결정에 영향 — Next.js 경고는 보존 대상 |

기타 Explore 보고 (도구별 파일 개수, 상태 평가) 는 본 메인 에이전트가 직접 검증한 결과와 일치.

---

## 부록 B. 참조 문서

### B.1 상위 문서
- `Speech-Therapy_App/docs/54_PRD_V10_Final.md` — 제품 요구사항
- `Speech-Therapy_App/docs/64_SRS_V05_Merged_Master_Final.md` — 시스템 요구사항

### B.2 도구별 가이드
- `Speech-Therapy_App/README-claude-harness.md`
- `Speech-Therapy_App/README-common-harness.md`
- `Speech-Therapy_App/README-cursor-harness.md`
- `Speech-Therapy_App/README-gemini-harness.md`

### B.3 본 sub-session 의 관련 대화기록
- `Prompt/대화기록_2026-05-15.md` (특히 §17~§20 — Google OAuth 트랙 진행 + 가이드 노후화 발견 경위)

### B.4 본 문서 위치
- `Speech-Therapy_App/tasks/05_AI_Harness_재정립_계획서.md`

---

## 부록 C. 진행 보고 양식

본 보고서 검토 후 사용자는 다음 중 하나로 응답:

| 응답 | 액션 |
|---|---|
| "추천 그대로 진행" 또는 "1=B, 2=B, 3=A, 4=A, 5=B 확정" | Phase 0 즉시 진입 |
| "N번만 X 로" (예: "1번만 C 로") | 해당 결정 반영 후 Phase 0 진입 |
| "Phase X 항목 추가/삭제: ..." | 본 계획서 v1.1 로 수정 후 재제출 |
| "OAuth 검증 먼저, harness 는 다음 세션" | 본 sub-session 종료, 본 보고서만 archive |
| "공유 스킬 방식만 미정 — 추가 설명" | §4.1 옵션 상세 평가 제공 후 결정 대기 |

---

**작성 완료**: 2026-05-16
**다음 액션**: 사용자 §4 결정사항 확정 → Phase 0 진입 게이트 G1 통과 → Phase 0 작업 시작
