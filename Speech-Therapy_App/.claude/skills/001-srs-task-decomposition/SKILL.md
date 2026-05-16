---
name: 001-srs-task-decomposition
description: SRS / PRD 요구사항을 GitHub Issue 또는 TASK_*.md 로 분해하는 표준 프로세스.
canonical: true
---

# SRS / PRD → Task 분해 (Canonical)

> 이 스킬은 `.agents/skills/` 가 canonical source. 도구별 폴더 (`.cursor/skills/`, `.claude/skills/`) 의 사본은 항상 본 파일에서 복사된다.

## 1. 트리거

사용자가 다음 같은 요청을 할 때:
- "FR-Q-XXX 를 구현해줘"
- "REQ-NF-XXX 요구사항을 태스크로 분해"
- "SRS 의 §N 부분을 작업해줘"
- "PRD §N 의 페르소나 요구사항을 코드로"

## 2. 입력 (필수 확인)

| 항목 | 예시 |
|---|---|
| 요구사항 ID | FR-Q-001, REQ-NF-PERF, CON-04 |
| 출처 문서 | `docs/64_SRS_V05_Merged_Master_Final.md`, `docs/54_PRD_V10_Final.md` |
| Phase | Phase 0 (MVP) / Phase 1 (리텐션) / Phase 2 (B2B) |

## 3. 분해 절차

### Step 1. 해당 §섹션 읽기
- 요구사항 ID 로 SRS / PRD 검색 (Grep)
- 정확한 acceptance criteria 추출

### Step 2. Phase 게이트 검증
- 현재 sprint 가 해당 요구사항을 다룰 단계인지 확인
- Phase 1+ 인데 Phase 0 미완성이면 우선순위 재확인

### Step 3. 도메인 매핑
- 어느 lib / app 폴더가 영향 받는지 식별
- 기존 코드 패턴 검색 (Grep)

### Step 4. 의존성 그래프
- 선행 요구사항 (e.g., FR-Q-003 가 FR-Q-002 의존)
- DB schema 변경 필요 시 migration 계획 명시

### Step 5. 분해 산출물

다음 형식의 TASK_*.md 또는 GitHub Issue 작성:

```markdown
# TASK_<ID> — <한 줄 요약>

## 요구사항 출처
- SRS §<N>: <요구사항 ID>
- PRD §<N>: <관련 페르소나/시나리오>

## Acceptance Criteria
- [ ] <검증 가능한 조건 1>
- [ ] <검증 가능한 조건 2>

## 영향 범위
- 파일: lib/X.ts, app/actions/Y.ts, prisma/schema.prisma (migration)
- 테스트: __tests__/lib/X.test.ts

## 의존성
- 선행: TASK_<선행 ID>
- 후속: TASK_<후속 ID>

## 위험
- (있다면) DB migration 필요 — Supabase Studio 수동 적용
- (있다면) AI 비용 / rate limit 영향

## 검증
- [ ] vitest 통과
- [ ] 수동 검증 (모바일 / 데스크톱)
```

## 4. 안티패턴

- ❌ AC (acceptance criteria) 가 측정 불가능한 표현 ("좋게 만들어 주세요")
- ❌ 단일 태스크에 5+ 파일 변경 (분할 필요)
- ❌ SRS / PRD 직접 인용 없이 추측

## 5. 출력 위치

- TASK_*.md: `Speech-Therapy_App/tasks/TASK_<ID>.md`
- GitHub Issue: 별도 워크플로 (002-git-pr-workflow 참조)

## See also

- [docs/54_PRD_V10_Final.md](../../docs/54_PRD_V10_Final.md)
- [docs/64_SRS_V05_Merged_Master_Final.md](../../docs/64_SRS_V05_Merged_Master_Final.md)
- [.agents/workflows/generate-tasks-from-srs.md](../../workflows/generate-tasks-from-srs.md) — 더 상세한 워크플로
