---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Monitoring] MON-005: PIPA 위반 monitoring — ConsentRequiredError → Slack 알림"
labels: 'phase:p1, mode:active, domain:mon, epic:pipa-alert, sprint:phase-1'
assignees: ''
---

## 🎯 Summary
- **Task ID**: MON-005
- **Epic / Story**: PIPA 위반 실시간 모니터링 (V07 신규)
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: SEC-009 의 5중 가드 2층 (`analyzeDiagnosis` 의 `ConsentRequiredError` throw) 가 발생할 경우 — 즉 1층 UI redirect 가 우회된 비정상 호출 — 즉시 Slack 알림. 5중 가드 효과 운영 추적 + 잠재 공격 시도 조기 식별. INFRA-005 (Slack webhook 인프라) 위에 누적.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.4 PIPA 5중 가드 (특히 §12.4.2 2층)
  - REQ-NF-029 (5중 가드 통합)
  - REQ-NF-007 (Uptime ≥ 99.9% — 모니터링 연동)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-C MON-005
- **연관**: SEC-009 (5중 가드 통합), INFRA-005 (Slack webhook), FR-C-022 (`analyzeDiagnosis` 2층)

## ✅ Task Breakdown
- [ ] `lib/monitoring/slack-alert.ts` 확장 — `notifyPipaViolation(detail)` helper 추가
- [ ] `analyzeDiagnosis` catch block — `ConsentRequiredError` 발생 시 Slack POST (fire-and-forget)
- [ ] 알림 payload: timestamp + userId (해시) + endpoint + 가드 layer (2층/5층) + IP (선택)
- [ ] Slack channel `#pipa-alerts` 분리 + on-call rotation 설정
- [ ] Rate limit — 동일 userId 의 반복 알림 5분에 1회 (스팸 방지)
- [ ] `MON-007` 의 audit_log 페이지에서 `ConsentRequiredError` filter 가능하도록 mapping
- [ ] 단위 테스트 — 5층 boolean 차단 + 2층 throw 양쪽 알림 검증

## 🧪 Acceptance Criteria
**Scenario 1: 2층 throw 시 Slack 알림 (REQ-NF-029)**
- **Given**: 인증 user 미동의 + `analyzeDiagnosis` 직접 호출 (1층 우회)
- **When**: `ConsentRequiredError` throw
- **Then**: Slack `#pipa-alerts` 에 즉시 메시지 (userId 해시 + endpoint + timestamp)

**Scenario 2: 5층 boolean 차단 알림 (`f9cf258`)**
- **Given**: 익명 user + `input.pipaConsented = false`
- **When**: `analyzeDiagnosis` 호출
- **Then**: Slack 알림 (layer="5", anonymous=true)

**Scenario 3: Rate limit — 동일 userId 5분 1회**
- **Given**: 같은 userId 가 1분 내 10회 시도
- **When**: 10회 ConsentRequiredError 발생
- **Then**: Slack 메시지는 1건만 (나머지 9건은 audit_log 만 기록)

**Scenario 4: fire-and-forget — 진단 응답 지연 없음**
- **Given**: Slack endpoint 5초 지연 발생
- **When**: `ConsentRequiredError` throw
- **Then**: 본 응답은 즉시 500 + Slack 호출은 백그라운드 (await 안 함)

**Scenario 5: payload 형식 검증**
- **Given**: 알림 payload
- **When**: Slack 수신
- **Then**: timestamp + userId 해시 (raw 노출 X) + endpoint + layer + 적절한 emoji

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-029**: PIPA 5중 가드 효과 운영 모니터링
- **REQ-NF-007**: Uptime ≥ 99.9% — 알림 자체 실패는 본 진단 응답에 영향 없음 (fire-and-forget)
- **횡단 제약**:
  - [x] R4 개인정보: userId 해시 후 알림 — raw PII 미노출
  - [x] CON-05 5중 가드: 본 MON-005 = 운영 가시성 (5중 가드 사후 확인)
- **Rate limit**: 스팸 방지 (동일 userId 5분 1회) — `lib/monitoring/rate-limit.ts` 의존
- **운영**: on-call rotation 설정 + escalation policy (24h 미응답 시 백업)

## 🏁 Definition of Done
- [ ] `notifyPipaViolation` helper 단위 테스트 통과
- [ ] `analyzeDiagnosis` catch block 통합
- [ ] Slack `#pipa-alerts` channel 생성 + webhook URL Vercel env 등록
- [ ] Rate limit 검증 (10회 시도 → 1회 메시지)
- [ ] fire-and-forget 검증 (응답 지연 0)
- [ ] payload 형식 + userId 해시 검증 (raw PII 미노출)
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-NF-029 + §12.4.2 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: SEC-009 (5중 가드 통합 — 본 알림의 trigger), INFRA-005 (Slack webhook 인프라), FR-C-022 (`analyzeDiagnosis` 2층), DB-013 (audit_log)
- **Blocks**: 없음 (운영 가시성 강화)
- **Discope 영향**: 해당 없음
