# Cross-Tool Common Harness Guide (`AGENTS.md` & `.agents/skills`)

본 문서는 Cursor, Google Antigravity & Gemini CLI, Claude Code 등 여러 AI 어시스턴트 도구를 동시에 사용하거나 팀원마다 다른 도구를 사용할 때, **중복 설정을 최소화하고 공통의 컨텍스트를 유지(Cross-Tool Compatibility)**하기 위한 공통 하네스(Common Harness) 구성 방법을 설명합니다.

---

## 1. 공통 적용이 가능한 영역 (Common Areas)

최신 AI 코딩 도구들은 특정 벤더에 종속되지 않는 개방형 표준을 점점 지원하는 추세입니다. 이를 통해 핵심 프로젝트 지식을 여러 도구가 공유할 수 있습니다.

### 1) 범용 프로젝트 규칙: `AGENTS.md`
- **개념**: 프로젝트 루트에 위치하는 `AGENTS.md`는 여러 AI 도구(Antigravity v1.20.3+, Cursor, Claude Code 등)가 공통으로 읽어들이는 **최상위 글로벌 규칙(Global Rules)** 파일입니다.
- **적용 대상**: 특정 파일이나 프레임워크에 국한되지 않고, AI 에이전트가 항상 인지해야 하는 프로젝트의 핵심 철학, 전역 네이밍 컨벤션, 공통 아키텍처 원칙.
- **장점**: 도구별 설정 파일(`.cursor/rules/*.mdc`, `.agents/rules/*.md`, `CLAUDE.md`)에 동일한 내용을 중복해서 쓸 필요가 없습니다.

### 2) 에이전트 스킬 표준: `.agents/skills/`
- **개념**: 특정 작업을 수행하는 절차나 온디맨드 매뉴얼을 담은 스킬(Skills)은 `Agent Skills` 오픈 표준 포맷(`폴더명/SKILL.md`)을 따릅니다.
- **적용 방법**: 프로젝트 최상단에 `.agents/skills/` 디렉토리를 만들고 스킬들을 정의한 뒤, 각 도구의 디렉토리에 **심볼릭 링크(Symlink)**를 걸어 공유합니다.
  ```bash
  # 스킬 공유를 위한 Symlink 설정 예시
  ln -s ../.agents/skills .cursor/skills
  ln -s ../.agents/skills .claude/skills
  ```
- **장점**: PR 작성 가이드, 에러 해결 절차, 배포 스크립트 등 복잡한 워크플로우를 한 곳에서 관리하여 모든 AI 도구가 동일한 품질의 결과물을 내도록 보장합니다.

---

## 2. 공통 적용의 한계점 (Limitations)

AI 도구들이 스킬과 글로벌 규칙의 표준은 맞추어가고 있지만, 에이전트를 제어하는 세부 엔진(디테일한 룰 트리거, 서브에이전트 권한 등)은 여전히 도구별 독자적인 스펙을 가지고 있습니다.

### 1) Subagents (서브에이전트) 메타데이터의 파편화
- **한계점**: 메인 에이전트와 분리된 컨텍스트를 가지는 서브에이전트의 정의 방식이 도구마다 다릅니다.
- **차이점**:
  - **Cursor** (`.cursor/agents/*.md`): 도구 제어 및 페르소나 설정 위주.
  - **Gemini CLI** (`.gemini/agents/*.md`): `tools` 제한 및 Hub-and-Spoke 아키텍처의 `model: inherit` 명시 필수.
  - **Claude Code** (`.claude/agents/*.md`): `skills` 주입(Preload), `context: fork` 등 Claude에 특화된 프론트매터 사용.
- **대응**: 서브에이전트는 각 도구의 특징을 극대화하는 기능이므로, 공통화하기보다는 팀에서 주력으로 사용하는 도구의 스펙에 맞춰 개별 작성하는 것이 좋습니다.

### 2) Rules (상황별 자동 규칙)의 트리거 방식 차이
- **한계점**: 특정 파일을 열었을 때 자동으로 룰을 주입하는 방식이 상이합니다.
- **차이점**:
  - **Cursor** (`.cursor/rules/*.mdc`): YAML 프론트매터에 `globs: "*.ts"` 방식을 사용하여 매우 정밀하게 타겟팅.
  - **Antigravity** (`.agents/rules/*.md`): `globs`를 지원하지만, Workspace Rules라는 별도의 UI/UX 체계를 가짐.
  - **Claude Code** (`CLAUDE.md`): 글로벌 단일 파일을 기본으로 하며, 디렉토리별 `CLAUDE.md`를 배치하는 방식으로 스코프를 제한.
- **대응**: `AGENTS.md`에 공통 룰을 넣되, 언어/프레임워크별 미세한 제어(예: "React 컴포넌트 수정 시에만 발동")는 각 도구의 룰 시스템을 병행 사용해야 완벽한 토큰 최적화가 가능합니다.

### 3) 라이프사이클 Hooks의 비호환성
- **한계점**: 파일을 수정하거나 터미널 명령을 내리기 전/후에 검증을 가로채는 훅(Hooks) 메커니즘이 다릅니다.
- **차이점**: Cursor는 `.cursor/hooks.json`으로 스크립트를 관리하고, Claude Code는 `settings.local.json`의 `permissions` 항목과 플러그인 훅으로 제어합니다. 공통 호환이 불가능합니다.

---

## 3. 요약 및 권장 전략

1. **지식의 중앙화**: 프로젝트 아키텍처, 코드 스타일, PR 컨벤션 등 "내용(Content)"은 `AGENTS.md`와 `.agents/skills/`에 작성하여 중앙 관리하세요.
2. **제어의 분산화**: 특정 파일 패턴 매칭(`globs`), 특수 권한 에이전트(Subagents), 쉘 제어(Hooks) 등 "행동(Behavior)"은 `README-cursor-harness.md`, `README-gemini-harness.md`, `README-claude-harness.md`를 참고하여 각 도구의 전용 폴더에 맞춤 설정하세요.
3. **Symlink 적극 활용**: 스킬 폴더는 Symlink로 묶어 중복 유지보수를 피하세요.