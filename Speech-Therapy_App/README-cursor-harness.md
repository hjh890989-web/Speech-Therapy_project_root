# Cursor Harness Guide (`Rules`, `Skills`, `Agents`, `Hooks`)

이 문서는 본 저장소의 **Cursor 프로젝트 환경(Harness)** 이 어떻게 구성되어 있고, 어떤 역할을 하며, 어떻게 확장하는지 설명하는 종합 가이드 문서입니다. 
최신 Cursor 업데이트를 반영하여 `Rules`, `Skills`, `Agents(Subagents)`, `Hooks` 4가지의 강력한 도구를 통합적으로 활용합니다.

---

## 1. Cursor Harness란?

Cursor Harness는 AI 에이전트가 여러분의 프로젝트를 완벽하게 이해하고, 안전하며, 일관되게 코드를 작성하도록 돕는 4가지 핵심 제어 장치의 모음입니다.

| 도구 (Tool) | 역할 | 발동 방식 | 위치 |
|:---:|---|---|---|
| **Rules** | 항상 켜져 있거나(Always-On) 특정 파일 편집 시 반드시 지켜야 하는 **코딩 표준 및 제약사항** | 자동 (globs, 문맥 기반) | `.cursor/rules/*.mdc` |
| **Skills** | 특정 작업(에러 해결, PR 작성 등)을 수행할 때 에이전트가 참고하는 **온디맨드 매뉴얼** | 자동 (에이전트 판단) 또는 수동 (`/스킬명`) | `.cursor/skills/*/SKILL.md` |
| **Agents** | 특정 작업(보안 감사, 리팩토링 등)에 고도로 특화된 **독립된 컨텍스트**를 가진 서브에이전트 | 자동 (문맥 기반) 또는 수동 (`/에이전트명`) | `.cursor/agents/*.md` |
| **Hooks** | 에이전트가 쉘 명령어나 툴을 실행하기 전후에 검증/포매팅을 강제하는 **프로그래매틱 제어 장치** | 자동 (이벤트 라이프사이클) | `.cursor/hooks.json` |

---

## 2. 내장 생성 명령어 (Slash Commands) 4종 활용법

최신 Cursor에서는 파일과 디렉토리를 수동으로 생성할 필요 없이, Agent 채팅창(Chat)에서 제공되는 내장 슬래시 명령어(Slash Commands)를 통해 Rule, Skill, Subagent, Hook을 손쉽게 생성하고 관리할 수 있습니다.

### 1) `/create-rule` (프로젝트 규칙 생성)
- **용도**: 프로젝트 전반의 코딩 스타일, 네이밍 컨벤션, 아키텍처 원칙 등 패시브하게 적용할 규칙 생성
- **사용법**: 채팅창에 `/create-rule` 입력 후 원하는 룰 설명 작성 
  - *예: "React 컴포넌트 작성 시 항상 함수형과 Tailwind를 사용하도록 룰을 만들어줘"*
- **결과**: `.cursor/rules/` 경로에 YAML 프론트매터가 포함된 `.mdc` 파일이 자동 구성됩니다.

### 2) `/create-skill` (에이전트 스킬 생성)
- **용도**: 에러 해결, 빌드, 배포 등 특정 절차가 필요할 때 에이전트가 꺼내 읽을 전문 지식/매뉴얼 생성
- **사용법**: 채팅창에 `/create-skill` 입력 후 기능 설명 작성 
  - *예: "데이터베이스 마이그레이션 스크립트를 안전하게 실행하는 스킬을 만들어줘"*
- **결과**: `.cursor/skills/` 하위에 스킬 폴더 및 `SKILL.md`가 생성됩니다. (사용자가 명시적으로 호출할 때만 작동하게 하려면 파일 최상단 프론트매터에 `disable-model-invocation: true`를 추가하세요.)

### 3) `/create-subagent` (서브에이전트 생성)
- **용도**: 메인 에이전트와 별개로, 격리된 컨텍스트와 제한된 툴 접근 권한을 가지고 동작할 특화 에이전트 생성
- **사용법**: 채팅창에 `/create-subagent` 입력 후 서브에이전트의 페르소나 및 사용할 도구(Tools) 지정
- **결과**: `.cursor/agents/` 경로에 서브에이전트 Markdown 파일이 생성됩니다.

### 4) `/create-hook` (라이프사이클 훅 생성)
- **용도**: 에이전트가 `bash` 스크립트를 실행하거나 파일을 수정하기 직전/직후에 자동으로 린터(Linter)나 보안 검사 스크립트를 실행하도록 설정
- **사용법**: 채팅창에 `/create-hook` 입력 후 트리거 조건 설명
- **결과**: 프로젝트 루트에 `.cursor/hooks.json` 및 연관된 쉘 스크립트가 생성됩니다.

---

## 3. 세부 작성 가이드

명령어를 통해 자동 생성한 이후에도, 필요에 따라 파일을 세밀하게 튜닝할 수 있습니다.

### 3.1 Rules (`.cursor/rules/*.mdc`)
**파일 구조**: YAML 프론트매터 + Markdown 본문
```yaml
---
description: 이 룰이 적용될 상황 요약 (에이전트가 검색할 때 사용)
globs: "*.ts, src/components/**/*.tsx"  # 특정 패턴의 파일에만 룰 강제 적용
alwaysApply: false                      # true 지정 시 globs와 무관하게 모든 대화에 강제 주입
---
# Rules
- 항상 함수형 컴포넌트를 사용하세요.
```
> **팁**: 모든 작업에 강제 주입되는 `alwaysApply: true`는 토큰 소모가 크므로, `001-project-overview` 같은 최상위 아키텍처 원칙에만 제한적으로 사용하세요.

### 3.2 Skills (`.cursor/skills/<skill-name>/SKILL.md`)
**파일 구조**: `.cursor/skills/my-skill/SKILL.md` 형태로 반드시 폴더 내에 위치해야 합니다.
```yaml
---
name: my-skill                           # 폴더명과 동일해야 함
description: 이 스킬이 수행하는 작업에 대한 상세 설명
disable-model-invocation: true           # true일 경우, 채팅창에서 `/my-skill`로 수동 호출해야만 작동 (과거 Command 대체 역할)
---
# Step-by-Step Instructions
1. ...
2. ...
```

### 3.3 Hooks (`.cursor/hooks.json`)
**파일 구조**: 특정 이벤트 발생 시 실행할 스크립트 경로 지정
```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      {
        "command": ".cursor/hooks/validate-shell.sh"
      }
    ],
    "afterFileEdit": [
      {
        "command": ".cursor/hooks/run-prettier.sh"
      }
    ]
  }
}
```

---

## 4. 모범 사례 (Best Practices) 요약

1. **상태 분리 (Separation of Concerns)**
   - "항상 지켜야 할 것" ➡️ **Rules** (`alwaysApply: true`)
   - "특정 파일 작업 시 지켜야 할 것" ➡️ **Rules** (`globs` 지정)
   - "어쩌다 한 번 수행하는 복잡한 절차" ➡️ **Skills** (`SKILL.md`)
   - "에이전트의 위험한 행동 자동 차단" ➡️ **Hooks** (`hooks.json`)

2. **토큰 최적화 및 영어 작성**
   - 불필요한 규칙이 매번 읽히지 않도록 `alwaysApply` 사용을 최소화하고, 가급적 **Skills** 위주로 온디맨드(On-demand) 환경을 구성하세요.
   - 규칙과 매뉴얼을 **영어**로 작성하면 LLM의 토큰 소모량을 줄이고 처리 속도와 정확도를 극대화할 수 있습니다.

3. **마이그레이션 (과거 설정 통합)**
   - 구형 동적 룰(`.mdc`)이나 슬래시 커맨드(`.cursor/commands/`)가 남아있다면, 에이전트 채팅창에 **`/migrate-to-skills`**를 입력하여 최신 Skills 구조로 한 번에 통합하세요.