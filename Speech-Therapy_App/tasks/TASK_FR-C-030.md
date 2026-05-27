---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-030: F17 submit_care_log Server Action (부모 직접 입력)"
labels: 'phase:p1, mode:pending, domain:fr-c, epic:f17, sprint:phase1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-030
- **Epic / Story**: F17 통합 케어로그 (Phase 1)
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 부모가 직접 입력하는 케어로그 (자유놀이 시간 / 외부 센터 세션 메모) Server Action — `DB-004` (V06 SessionLog 또는 CareLog) INSERT. F4 주간 리포트에서 앱 미션 데이터 + 외부 케어 데이터 통합 시각화의 데이터 source.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1 Epic F17 — 통합 케어로그 (2 신규 task / 2 SP)
  - REQ-FUNC-041 / REQ-FUNC-042 / REQ-FUNC-043 (V06 base — 통합 케어로그)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-030

## ✅ Task Breakdown
- [ ] `app/actions/care-log.ts` 의 `submit_care_log(input)` Server Action (`'use server'`)
- [ ] Zod 입력 스키마:
  ```typescript
  {
    type: 'free_play' | 'external_center_session',
    durationMinutes: number,        // 자유놀이 시간 (분)
    externalCenterName?: string,    // 외부 센터명 (옵션)
    sessionMemo?: string,           // 자유 메모 (최대 500자)
    occurredAt: Date,               // 발생 일시
  }
  ```
- [ ] PIPA 가드 (인증 user) — `assertConsentedIfAuthenticated(userId)`
- [ ] `prisma.careLog.create({data: {...input, userId}})` — DB-004 (또는 신규 CareLog 테이블) INSERT
- [ ] `withActor(userId, ...)` audit_log 자동 capture (DB-013)
- [ ] `revalidatePath('/reports/weekly')` — F4 주간 리포트 재생성
- [ ] CON-04 검증 — `sessionMemo` 입력 자체 의료 금칙어 무위반 (proxy.ts 또는 클라이언트 검증)
- [ ] PII 마스킹 미적용 — `sessionMemo` 는 Gemini 미호출 (단순 DB 저장)
- [ ] 외부 센터명 자유 텍스트 — 병원명 / 의료기관 입력 시 정보 안내 (의료기기법 분류 회피)

## 🧪 Acceptance Criteria
**Scenario 1: 자유놀이 시간 입력 (REQ-FUNC-041)**
- **Given**: 동의 user + `{type: 'free_play', durationMinutes: 30, occurredAt: now}`
- **When**: `submit_care_log(input)`
- **Then**: CareLog INSERT 1건 + revalidatePath 실행

**Scenario 2: 외부 센터 세션 메모 (REQ-FUNC-042)**
- **Given**: `{type: 'external_center_session', externalCenterName: '○○복지관', sessionMemo: '발음 연습 30분', durationMinutes: 30}`
- **When**: 호출
- **Then**: CareLog INSERT + audit_log 1건

**Scenario 3: F4 주간 리포트 통합 시각화 (REQ-FUNC-043)**
- **Given**: 1주일 동안 self CareLog 3건 + 앱 미션 5건
- **When**: `/reports/weekly` 페이지 렌더
- **Then**: 앱 미션 + 외부 케어 두 source 모두 차트 노출

**Scenario 4: PIPA 미동의 인증 user — ConsentRequiredError**
- **Given**: User.pipaUnderageConsentAt = NULL
- **When**: `submit_care_log(input)`
- **Then**: `ConsentRequiredError` throw

**Scenario 5: CON-04 sessionMemo 금칙어 검출**
- **Given**: sessionMemo = "치료 받으러 갔어요"
- **When**: Zod refine + proxy.ts 검증
- **Then**: 400 + INSERT 차단 (CON-04 정책)

**Scenario 6: audit_log 자동 capture**
- **Given**: 정상 INSERT
- **When**: DB-013 audit_user_changes / care_log_changes TRIGGER (확장 필요 시)
- **Then**: AuditLog INSERT 1건 (sanitized)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-041~043**: F17 통합 케어로그 — 본 Server Action 이 단일 source
- **횡단 제약**:
  - [x] CON-04: sessionMemo 자유 텍스트 의료 금칙어 검증
  - [x] R4 개인정보: 외부 센터명 자유 텍스트 — audit_log sanitize 대상
  - [x] R7 PIPA 위반: 동의 user 만 — 인증 가드
- **확장성**: CareLog 테이블이 DB-004 와 분리 시 별도 schema 추가 (현재 DB-004 SessionLog 와 통합 가능성 검토)

## 🏁 Definition of Done
- [ ] `submit_care_log` 6 scenario 통과
- [ ] CareLog INSERT + audit_log 검증
- [ ] CON-04 금칙어 자동 검증
- [ ] F4 주간 리포트 (FR-Q-005) 통합 시각화 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-041~043 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-004 (SessionLog / CareLog), DB-013 (audit_log TRIGGER + withActor), DB-015 (User PIPA), `lib/consent/assert.ts` (FR-C-022 정합)
- **Blocks**: TEST-024 (F17 통합 검증 — F4 주간 리포트 통합), FR-Q-005 (V06 weekly report)
- **Discope 영향**: 해당 없음
