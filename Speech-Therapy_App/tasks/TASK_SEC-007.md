---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Security] SEC-007: Gemini transcript PII 마스킹 — lib/ai/pii-mask.ts 한국 PIPA 7 패턴"
labels: 'phase:p0, mode:active, domain:sec, epic:pii, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: SEC-007
- **Epic / Story**: Gemini 호출 전 PII 마스킹 (V07 핵심 신규)
- **Phase**: 🟢 P0 → ✅ Done (`6f2e287`)
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Gemini API (US/global) 로 transcript 전송 전, 한국 PIPA 가 정의하는 7 종 PII 패턴 (주민번호 / 신용카드 / 이메일 / 전화번호 / URL / IPv4 / 한국식 주소) 을 정규식으로 마스킹. SEC-006 의 국외 이전 동의로도 cover 안 되는 사고적 PII 누출 방어. `lib/ai/pii-mask.ts` 단일 helper.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.6 Gemini 호출 전 PII 마스킹 의무
  - REQ-NF-027 (PII 마스킹 100% 적용)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-B SEC-007
- **Commit**: `6f2e287` (Gemini PII 마스킹 helper + 호출부 적용)
- **코드**: `lib/ai/pii-mask.ts`

## ✅ Task Breakdown
- [x] `lib/ai/pii-mask.ts` 작성 — 7 정규식 패턴:
  - RRN (주민번호) `\d{6}-\d{7}` → `[REDACTED:RRN]`
  - 신용카드 `\d{4}-\d{4}-\d{4}-\d{4}` → `[REDACTED:CARD]`
  - 이메일 `[\w.+-]+@[\w-]+\.[\w.-]+` → `[REDACTED:EMAIL]`
  - 전화 `01[016789]-\d{3,4}-\d{4}` → `[REDACTED:PHONE]`
  - URL `https?://\S+` → `[REDACTED:URL]`
  - IPv4 `\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}` → `[REDACTED:IPV4]`
  - 한국식 주소 `(서울|부산|...)\s\S+동\s\d+` → `[REDACTED:ADDR]`
- [x] `app/actions/diagnosis.ts` 에서 Gemini 호출 직전 `maskPII(transcript)` 적용
- [x] `app/actions/cushion.ts` 의 `generateCushion` 도 동일 마스킹
- [x] 단위 테스트 — 7 패턴 모두 매치 + 미매치 (오탐) 케이스
- [x] 마스킹 결과는 audit_log 에 sanitized 형태로만 저장 (R4 sanitize 와 짝)
- [x] 정규식 false positive 모니터링 (오탐 시 패턴 보수)

## 🧪 Acceptance Criteria
**Scenario 1: RRN 마스킹 (REQ-NF-027)**
- **Given**: transcript = "우리 아이 주민번호는 123456-1234567 이에요"
- **When**: `maskPII(transcript)`
- **Then**: 반환값 = "우리 아이 주민번호는 [REDACTED:RRN] 이에요"

**Scenario 2: 이메일 + 전화 복합**
- **Given**: transcript = "abc@test.com 으로 010-1234-5678"
- **When**: `maskPII`
- **Then**: "[REDACTED:EMAIL] 으로 [REDACTED:PHONE]"

**Scenario 3: 미매치 (정상 발화)**
- **Given**: transcript = "사과 좋아해요"
- **When**: `maskPII`
- **Then**: 원본 그대로 반환 (변경 없음)

**Scenario 4: Gemini 호출부 적용 검증**
- **Given**: `analyzeDiagnosis(input)` 호출 + transcript 에 PII 포함
- **When**: Gemini API 요청 패킷 검사
- **Then**: payload.transcript 에 `[REDACTED:*]` 만 포함 (원본 PII 0건)

**Scenario 5: 7 패턴 단위 테스트 (TEST suite)**
- **Given**: 각 패턴 positive + negative case
- **When**: vitest 실행
- **Then**: 14+ assertion 모두 PASS

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-027**: Gemini 호출 100% PII 마스킹 적용 (예외 없음)
- **횡단 제약**:
  - [x] R4 개인정보: PII 누출 방어 = R4 의 핵심 메커니즘
  - [x] CON-04: 마스킹 후 텍스트도 의료 금칙어 검사 (FR-C-005)
  - [x] CON-05 5중 가드: 본 SEC-007 = 3축 (정보 누출 방어)
- **성능**: 정규식 7회 = O(n) 문자열 길이 — transcript 1000자 가정 0.1ms 미만

## 🏁 Definition of Done
- [x] `lib/ai/pii-mask.ts` 7 패턴 모두 구현 + 단위 테스트 통과
- [x] `analyzeDiagnosis` + `generateCushion` 호출부 적용 검증
- [x] Gemini API 페이로드 검사 — PII 0건 확정
- [x] 단위 테스트 14+ assertion PASS
- [x] `tsc --strict` 0 errors
- [x] PR `6f2e287` 본문에 REQ-NF-027 + §12.6 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-011 (Gemini 어댑터), FR-C-001 (`analyzeDiagnosis`)
- **Blocks**: SEC-009 (5중 가드 통합), TEST-015 (E2E flow 의존), FR-C-025 (PII 마스킹 통합 task)
- **Discope 영향**: 해당 없음
