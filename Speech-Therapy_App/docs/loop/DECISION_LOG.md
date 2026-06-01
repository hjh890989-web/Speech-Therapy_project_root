# DECISION LOG — 테스트 백필 /goal 루프

> 대상: TEST-017 / TEST-024 / API-015 무게이트 슬라이스 백필
> 시작: 2026-06-01, main HEAD (clean)
> baseline vitest: **2967 passed (274 files), exit 0** (확인 완료, 목표 회귀 0 유지)

## Counters (grep 가능)
CORE: 1
MINOR: 3

## Decisions

### Card 1 — TEST-017 (R4 AuditLog sanitize)
- **[CORE-1]** sanitize 재귀 깊이 = **full recursion** (migration.sql L107 `audit_sanitize_jsonb(v_value)` 자기 호출, TS mock 일치). 소스의 "1단계 재귀" 주석은 before/after wrapper intent 표현일 뿐 구현은 무한 깊이. → 신규 테스트는 실제 full-recursion 동작을 가드·문서화. (스코핑 1차 제안 "2단계+ 미sanitize"는 오류로 폐기 — 적대 검증으로 정정.)
- **[MINOR-1]** 신규 케이스를 기존 `__tests__/integration/audit-log-triggers-r4-sanitize.test.ts` 에 Scenario 7로 append (새 파일 X, in-file `auditSanitizeJsonb` helper 재사용 → mock divergence 0).
- 게이트 경계: 실 SQL TRIGGER 발화(Prisma mutation→trigger→AuditLog row) 통합 테스트는 shadow branch DB 인프라 선행 → 범위 밖 유지.

### Card 3 — API-015 (submitConsentSignature + signOut) — 큐 순서 1→3→2 진행
- **[MINOR-2]** 큐 순서를 1→3→2 로 진행: Card 1 풀 스위트(162s) 대기 중 가장 깨끗한 갭인 Card 3(전용 테스트 0건)를 선작성. 각 카드 독립이라 회귀/원자성 영향 0.
- **[MINOR-3]** 신규 파일 2개 — `__tests__/actions/consent-sign.test.ts`(10건) + `__tests__/actions/sign-out.test.ts`(4건). house style 템플릿 = `resend-consent-reminder.test.ts`(Prisma/Supabase/next mock 패턴 차용). `next/cache` 는 setup.ts 전역 mock 재사용.
- 적대 검증 finding(현행 동작 박제): `signOut` 은 graceful catch 없음 → auth.signOut / revalidatePath throw 시 그대로 전파(redirect 미도달). 테스트 [3][4]가 이 현행 동작을 회귀 가드(동작 변경 아님, 문서화).
- 게이트 경계: bulk-import / offline-entry Server Action 은 B2B Phase2 게이트 → 범위 밖(확인됨, 별도 role-gated 함수).
