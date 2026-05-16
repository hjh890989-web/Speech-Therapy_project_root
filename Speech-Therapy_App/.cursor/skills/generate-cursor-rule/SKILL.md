---
name: generate-cursor-rule
description: Cursor 환경에서 사용할 Rules(.mdc) 및 Skills(SKILL.md) 템플릿과 생성 가이드를 제공하는 명령어입니다.
disable-model-invocation: true
---
# Cursor Rules & Skills 생성 가이드

## 📋 개요
이 문서는 Cursor AI 환경에서 사용할 **프로젝트 규칙(Rules)** 및 **에이전트 스킬(Skills)**을 생성하기 위한 표준 가이드입니다.
최적화된 컨텍스트 관리를 위해, 항상 지켜야 할 핵심 원칙은 **Rules**로, 필요할 때 꺼내 쓰는 절차 및 기술 지침은 **Skills**로 분리하여 작성합니다.

---

## 🎯 파일 명명 및 분류 체계

번호(NNN) 대역에 따라 저장 위치와 형태가 다릅니다.

| 번호 범위 | 카테고리 | 저장 위치 | 형태 | 설명 |
|:---:|:---:|:---:|:---:|---|
| **001–099** | Core/Project-wide | `.cursor/rules/` | `.mdc` | 프로젝트 전반에 항상 적용되는 핵심 아키텍처/비전 규칙 |
| **100–199** | Workflow & Integration | `.cursor/skills/` | `SKILL.md` | 워크플로우, CI/CD, 에러 해결 절차 |
| **200–299** | Pattern & Style | `.cursor/skills/` | `SKILL.md` | 코드 패턴, 커밋 규칙, 주석 정책 |
| **300–399** | Technology-specific | `.cursor/skills/` | `SKILL.md` | 특정 프레임워크, 라이브러리, 언어 관련 지침 |

---

## 📝 1. Cursor Rule 생성 가이드 (`001-099`)

**목적**: 항상 에이전트의 컨텍스트에 포함되어야 하는 핵심 원칙을 정의합니다.

### 생성 프로세스
1. `.cursor/rules/` 디렉토리에 `NNN-kebab-case-name.mdc` 파일을 생성합니다.
2. 파일 생성 후 Cursor GUI의 "Project Rules" 설정에서 **Glob Pattern** 및 **Rule Type**(`Always` 또는 `Auto`)을 지정합니다.

### .mdc 파일 템플릿
```yaml
---
description: [이 룰이 적용되는 상황에 대한 간략한 설명]
globs: [적용될 파일 패턴, 예: **/*.ts]
alwaysApply: [true|false]
---
# [룰 이름]

## Context
- [어떤 상황에서 이 룰을 따라야 하는지 설명]

## Rules
- [핵심 규칙 1]
- [핵심 규칙 2]
```

---

## 🛠️ 2. Agent Skill 생성 가이드 (`100-399`)

**목적**: 에이전트가 코딩 중 특정 작업이 필요할 때만 온디맨드(On-demand)로 불러와서 참고하는 전문 지식/절차입니다.

### 생성 프로세스
1. `.cursor/skills/` 디렉토리 아래에 룰 이름과 동일한 폴더를 생성합니다: `.cursor/skills/NNN-kebab-case-name/`
2. 해당 폴더 내에 `SKILL.md` 파일을 생성합니다.

### SKILL.md 파일 템플릿
```yaml
---
name: [폴더명과 동일한 스킬 이름, 예: 300-java-spring-cursor-rules]
description: [에이전트가 스킬을 검색하고 꺼내 쓸 수 있도록 명확한 용도 설명]
---
# [스킬 이름]

## 지침 (Instructions)
- [단계별 절차나 기술적 제약사항 작성]
- [이 스킬이 적용될 때 지켜야 할 상세 코드 패턴 등]

## Examples
<example>
[올바른 예시 코드 또는 상황 설명]
</example>

<bad-example>
[피해야 할 패턴 또는 잘못된 예시]
</bad-example>
```

## 💡 작성 원칙
- **단일 책임 원칙 (SRP)**: 각 룰/스킬은 하나의 논리적 목적만 가져야 합니다.
- **컨텍스트 최적화**: 에이전트가 무관한 작업 시 엉뚱한 룰을 읽어 토큰을 낭비하지 않도록, `alwaysApply: true`는 정말 필요한 Core 규칙(001-099)에만 제한적으로 사용하세요.