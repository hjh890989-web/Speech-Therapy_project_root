# Gemini & Antigravity Harness Guide (`Rules`, `Skills`, `Workflows`, `Subagents`)

이 문서는 본 저장소에서 **Google Antigravity(에디터)** 및 **Gemini CLI(터미널)** 환경을 최대한 활용하기 위한 **프로젝트 환경(Harness)** 구성 및 운영 방법을 설명하는 종합 가이드입니다.

최신 공식 가이드라인(Antigravity v1.20.3+, Gemini CLI)을 반영하여, `Rules`, `Skills`, `Workflows`, `Subagents` 등 강력한 4대 제어 장치를 통합적으로 운영합니다.

---

## 1. Gemini & Antigravity Harness란?

Harness는 AI 에이전트가 여러분의 코딩 컨벤션을 따르고, 복잡한 업무를 자동화하며, 전문화된 작업을 수행하도록 돕는 핵심 지식 프레임워크입니다.

| 도구 (Tool) | 역할 | 발동 방식 | 저장 위치 | 대상 플랫폼 |
|:---:|---|---|---|---|
| **Rules** | 항상 지켜야 하거나 특정 파일 편집 시 강제되는 **코딩 표준 및 제약사항** | 자동 (globs 지정 시) | `.agents/rules/*.md`<br>`AGENTS.md` | Antigravity |
| **Skills** | 특정 작업 시 에이전트가 참고하는 **온디맨드 매뉴얼/플레이북** | 자동 (AI 판단) 또는 수동 | `.agents/skills/*/SKILL.md` | Antigravity, Gemini CLI |
| **Workflows** | 특정 순서대로 작업을 수행하도록 돕는 **단계별 매크로/프롬프트** | 수동 (`/워크플로우명`) | `.agents/workflows/*.md` | Antigravity |
| **Subagents** | 특정 작업(보안 감사 등)에 고도로 특화된 **격리된 컨텍스트**의 에이전트 | 자동 (메인 에이전트 위임) | `.gemini/agents/*.md` | Gemini CLI |

> **💡 Cross-Tool 호환성**: `AGENTS.md` 파일과 `.agents/skills/` 경로는 Cursor, Claude Code 등 타 AI 도구와 함께 공유하여 사용할 수 있는 개방형 표준을 따릅니다.

---

## 2. 도구별 활용 및 생성 가이드

Cursor와 달리, Antigravity와 Gemini CLI는 챗 창의 슬래시 명령어(`/create-rule` 등)로 파일을 자동 생성하는 기능을 내장하고 있지 않습니다. 대신 **GUI 환경**이나 **전용 CLI 도구**를 통해 관리합니다.

### 1) Rules (프로젝트 규칙)
- **용도**: 프로젝트 전반의 코딩 스타일, 네이밍 컨벤션, 아키텍처 원칙 등 패시브하게 적용할 규칙.
- **관리 방법**: 
  - Antigravity 에디터 우측 상단 `...` ➡️ `Customizations` ➡️ `Rules` 패널에서 `+ Workspace` 클릭하여 생성.
- **파일 예시** (`.agents/rules/003-development-guidelines.md`):
  ```markdown
  ---
  description: 백엔드 개발 가이드라인
  globs: ["**/*.java"]
  alwaysApply: false
  ---
  # 개발 규칙
  - 모든 API 응답은 일관된 ApiResponse DTO를 사용하세요.
  ```

### 2) Skills (에이전트 스킬)
- **용도**: 에러 해결, 코드 리뷰 등 특정 절차가 필요할 때 에이전트가 꺼내 읽는 전문 지식.
- **관리 방법**: 
  - Antigravity 채팅창에서 `/learn` 명령어로 스킬 마켓플레이스 탐색 및 설치.
  - 또는 터미널에서 `npx skills add <스킬명>` 명령어로 설치.
- **파일 예시** (`.agents/skills/100-error-fixing/SKILL.md`):
  ```markdown
  ---
  name: 100-error-fixing
  description: 에러나 예외 발생 시 진단하고 수정하는 절차 가이드
  ---
  # 에러 해결 절차
  1. 에러 현상과 로그를 분석합니다.
  ...
  ```

### 3) Workflows (워크플로우)
- **용도**: 반복적인 작업(예: PR 생성, 배포 스크립트 실행)을 단계별로 지시하는 매크로. 
- **관리 방법**:
  - Antigravity `Customizations` ➡️ `Workflows` 패널에서 생성 후, 채팅창에서 `/워크플로우명`으로 즉시 실행.
- **파일 예시** (`.agents/workflows/deploy-staging.md`):
  ```markdown
  ---
  description: Staging 환경 배포 프로세스
  ---
  1. 테스트 코드를 실행하세요.
  // turbo
  2. `./gradlew build` 명령어로 빌드하세요.
  ```

### 4) Subagents (서브에이전트 - Gemini CLI 전용)
- **용도**: Gemini CLI 환경에서 특정 툴(Tool) 권한만 부여받은 고도로 격리된 에이전트 생성 (Hub-and-Spoke 아키텍처).
- **관리 방법**: `.gemini/agents/` 디렉토리에 직접 Markdown 파일을 생성하여 정의. `/agents` 명령어로 상태 확인 가능.
- **파일 예시** (`.gemini/agents/security-auditor.md`):
  ```yaml
  ---
  name: security-auditor
  description: 보안 취약점을 검사하는 서브에이전트
  tools:
    - read_file
    - grep_search
  model: inherit
  ---
  # 시스템 프롬프트
  당신은 보안 감사관(Security Auditor)입니다. 코드를 분석하고 취약점을 찾아내세요.
  ```

---

## 3. CLI 환경(Gemini CLI)에서의 컨텍스트 주입

터미널에서 `gemini` 명령어를 사용할 때, 특정 룰이나 스킬, 워크플로우를 주입하여 작업을 지시할 수 있습니다.

**단일 작업 지시 (스킬 주입):**
```bash
gemini ask "현재 수정된 파일을 기반으로 커밋 메시지를 작성해줘" \
    --context .agents/skills/200-git-commit-push-pr/SKILL.md
```

**워크플로우 기반 자동화:**
```bash
gemini ask "다음 가이드라인 절차대로 문서를 처리해줘" \
    --context .agents/workflows/generate-tasks-from-srs.md \
    --file my_srs_document.md
```

---

## 4. 모범 사례 (Best Practices) 요약

1. **적절한 도구의 선택**
   - "항상 지켜야 할 것" ➡️ **Rules** (`alwaysApply: true` 또는 `globs`)
   - "어쩌다 한 번 수행하는 복잡한 절차" ➡️ **Skills** (`SKILL.md`)
   - "사용자가 수동으로 순서대로 시키고 싶은 매크로" ➡️ **Workflows**
   - "격리된 도구 권한으로 백그라운드에서 돌아야 할 특수 요원" ➡️ **Subagents** (`.gemini/agents/`)

2. **`AGENTS.md`의 활용**
   - 프로젝트 최상단에 위치하는 `AGENTS.md`는 Antigravity뿐만 아니라 Cursor, Claude Code 등이 공통으로 읽는 **범용 최상위 규칙**입니다. 모든 AI 도구가 알아야 하는 근본적인 컨텍스트는 이 파일에 작성하세요.

3. **Skills 디렉토리 공유**
   - `.agents/skills/` 폴더는 AI 코딩 생태계의 표준 스킬 저장소입니다. 여기에 작성된 스킬은 설정에 따라 여러 AI 도구에서 함께 사용할 수 있어 유지보수 비용을 크게 줄여줍니다.
