# Claude Code Harness Guide (`CLAUDE.md`, `Skills`, `Agents`, `Plugins`)

이 문서는 본 저장소에서 Anthropic의 **Claude Code(CLI)** 및 연관 도구들을 최대한 활용하기 위한 **프로젝트 환경(Harness)** 구성 및 운영 방법을 설명하는 종합 가이드입니다.

최신 공식 가이드라인을 반영하여 `CLAUDE.md`, `Skills`, `Agents(Subagents)`, `Plugins` 등 강력한 제어 장치를 통합적으로 운영합니다.

---

## 1. Claude Code Harness란?

Harness는 AI 에이전트가 여러분의 코딩 컨벤션을 따르고, 복잡한 업무를 자동화하며, 특수한 환경 권한을 안전하게 위임받도록 돕는 핵심 지식 프레임워크입니다.

| 도구 (Tool) | 역할 | 발동 방식 | 위치 |
|:---:|---|---|---|
| **CLAUDE.md** | 모든 대화마다 반드시 로드되는 **코딩 표준 및 프로젝트 컨텍스트** | 자동 (매 세션) | 프로젝트 루트 (`CLAUDE.md`) |
| **Skills** | 재사용 가능한 지식, 레퍼런스, 또는 수동으로 실행할 **명령어/워크플로우** | 자동 (AI 판단) 또는 수동 (`/스킬명`) | `.claude/skills/*/SKILL.md` |
| **Agents** | 특정 작업(예: 인프라 구성, 복잡한 리팩토링)에 특화된 **격리된 컨텍스트**의 서브에이전트 | 자동 (문맥 기반) 또는 수동 | `.claude/agents/*.md` |
| **Plugins** | Skills, Agents, MCP 서버 등을 패키징하여 **배포 및 재사용**하는 단위 | 수동 (명령어 설치) | `claude plugin install` |

> **💡 Cross-Tool 호환성**: Claude Code는 개방형 표준인 `SKILL.md` 스킬 포맷을 완벽하게 지원합니다. 따라서 `.agents/skills/`나 `.cursor/skills/`에 작성된 스킬 폴더를 심볼릭 링크(Symlink)로 연결하여 도구 간에 재사용할 수 있습니다.

---

## 2. 디렉토리 구조 및 세부 설정 가이드

현재 본 저장소의 Claude 환경은 아래와 같은 디렉토리 구조로 운영됩니다.

```text
.claude/
├── settings.local.json   # 로컬 환경 권한·설정 (Git 제외 권장)
├── agents/               # 서브에이전트 정의 폴더
└── skills/               # 스킬 (구 commands 폴더 대체)
```

### 1) CLAUDE.md (항상 적용되는 컨텍스트)
- **용도**: "항상 npm 대신 pnpm을 써라", "테스트 코드를 반드시 작성해라" 와 같이 프로젝트 전반에 절대적으로 적용되어야 하는 룰.
- **특징**: Claude Code가 시작될 때 항상 읽어들이는 시스템 프롬프트의 일부가 됩니다.

### 2) Skills (에이전트 스킬 및 커맨드)
- **용도**: 에러 해결, 배포 절차 등 특정 상황에 꺼내 쓰는 **온디맨드 매뉴얼** 및 `/명령어`.
- **작성법**: `.claude/skills/<스킬명>/SKILL.md` 형태로 작성.
  - 최신 Claude Code는 과거의 `.claude/commands/` 폴더 방식을 `Skills`로 완전히 통합했습니다.
  - 프론트매터에 `context: fork`를 넣으면 해당 스킬이 실행될 때 완전히 분리된(Fork) 서브에이전트 컨텍스트에서 안전하게 실행됩니다.

**예시 (`.claude/skills/deploy/SKILL.md`):**
```yaml
---
name: deploy
description: 프로젝트를 프로덕션 환경에 배포하는 절차
context: fork              # 이 스킬을 실행할 때 메인 대화를 오염시키지 않고 분기(fork)함
---
# 배포 절차
1. `npm run build` 실행
2. ...
```

### 3) Agents (서브에이전트)
- **용도**: 특정 폴더의 파일 구조나 특정 프레임워크 작업에 특화되어, 복잡한 업무를 끝내고 결과만 메인 세션으로 요약해 주는 **전문 에이전트**.
- **작성법**: `.claude/agents/*.md` 에 YAML 프론트매터와 함께 작성.

**예시 (`.claude/agents/java-spring.md`):**
```yaml
---
name: java-spring
description: Java/Spring 코드 작성 전반 (REST 컨트롤러, 서비스, DTO 등)
tools: [Read, Edit, Write, Grep, Glob, Bash]
model: claude-3-7-sonnet-20250219
skills:
  - 300-java-spring-cursor-rules   # 시작 시 특정 스킬을 미리 주입
---
당신은 Spring Boot 3.x 전문가입니다. 항상 일관된 DTO 패턴을 적용하세요.
```

### 4) 로컬 권한 설정 (`settings.local.json`)
Claude Code는 보안을 위해 로컬 파일 시스템 변경이나 터미널 스크립트 실행 권한을 엄격히 관리합니다. `settings.local.json`에 명시적으로 승인한 작업만 에이전트가 수행할 수 있습니다.

```json
{
  "permissions": {
    "allow": [
      "Bash(npm install:*)",
      "Bash(git status)"
    ]
  }
}
```

---

## 3. 실전 사용 패턴 및 명령어

- **플러그인 및 스킬 마켓플레이스 활용**:
  Claude Code는 마켓플레이스 기능을 지원합니다. 커뮤니티 스킬을 가져오려면 다음을 입력하세요:
  ```bash
  /plugin marketplace add sickn33/antigravity-awesome-skills
  ```

- **수동 스킬/명령어 호출**:
  프롬프트 입력창에서 `/`를 누르면 현재 로드된 스킬 목록이 나타납니다.
  ```bash
  /fix-error NullPointerException at UserService.java:42
  ```

- **서브에이전트 수동 호출**:
  복잡한 작업을 메인 컨텍스트 낭비 없이 처리하고 싶을 때 사용합니다.
  ```bash
  > use the java-spring subagent to refactor the payment module
  ```

---

## 4. 모범 사례 (Best Practices) 요약

1. **컨텍스트 오염 방지 (CLAUDE.md vs Skills)**
   - 모든 대화에 주입되는 `CLAUDE.md`는 최대한 간결하게 핵심만 유지하세요.
   - 특정 상황에만 필요한 룰이나 절차는 모두 **Skills**로 빼서 Claude가 스스로 판단하여 꺼내 읽도록 구성하세요.

2. **서브에이전트(Subagents) 적극 활용**
   - 수십 개의 파일을 고쳐야 하는 대규모 리팩토링이나 마이그레이션 작업은 메인 챗에서 시키지 마세요. 서브에이전트에게 위임하면, 그 안에서 자체적으로 루프를 돌며 작업을 끝낸 후 결과만 깔끔하게 보고하여 **메인 대화의 토큰 한도를 아낄 수 있습니다.**

3. **명령어 통합**
   - 과거의 단순 텍스트 기반 슬래시 커맨드(`.claude/commands/`)는 이제 공식적으로 `Skills`에 통합되었습니다. 모든 명령어는 `SKILL.md` 포맷으로 작성하여 관리의 일관성을 유지하세요.