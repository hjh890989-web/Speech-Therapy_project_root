---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-025: Gemini transcript PII 마스킹 (lib/ai/pii-mask.ts 7 패턴)"
labels: 'phase:p0, mode:active, domain:fr-c, epic:compliance, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-025
- **Epic / Story**: Compliance / PII 마스킹 (V07 신규)
- **Phase**: 🟢 P0 → ✅ Done
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Gemini 호출 (국외 이전) 직전 transcript 의 한국 PIPA 민감정보 7 패턴을 정규식 마스킹. 자녀 발화 우발적 PII (부모 전화번호 / 이메일 등) 가 국외 AI 서비스로 송출되는 사고 방지. `analyzeDiagnosis` + `generateCushion` 두 Server Action 의 Gemini 호출 직전 호출.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.6 transcript 의 PIPA 민감정보 분류 (자문 대기)
  - REQ-NF-027 (Gemini transcript PII 마스킹)
  - PIPA §23 (민감정보) / §24 (고유식별정보)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-025
- **Commit**: `6f2e287` (Gemini PII 마스킹)

## ✅ Task Breakdown
- [x] `lib/ai/pii-mask.ts` — `maskPII(text: string): string` 함수 작성
- [x] 7 패턴 정규식 (한국 PIPA 표준):
  1. **RRN (주민등록번호)**: `/\b\d{6}[-\s]?\d{7}\b/g` → `[RRN_REDACTED]`
  2. **신용카드**: `/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g` → `[CARD_REDACTED]`
  3. **이메일**: `/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g` → `[EMAIL_REDACTED]`
  4. **전화번호**: `/\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g` (휴대폰) + `/\b0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}\b/g` (유선) → `[PHONE_REDACTED]`
  5. **URL**: `/https?:\/\/[^\s]+/g` → `[URL_REDACTED]`
  6. **IPv4**: `/\b(?:\d{1,3}\.){3}\d{1,3}\b/g` → `[IP_REDACTED]`
  7. **한국식 주소**: `/(?:[가-힣]+(?:시|도|구|군|동|읍|면|로|길)\s*)+\d+[-\s]?\d*\b/g` → `[ADDRESS_REDACTED]`
- [x] 단위 테스트 — 각 패턴 positive + negative case 14 개
- [x] `analyzeDiagnosis` 의 Gemini prompt 빌드 직전 `maskPII(transcript)` 호출
- [x] `generateCushion` 의 동의 user 분기 — Gemini 호출 직전 동일 호출
- [x] 마스킹 후 텍스트는 DB 저장 _전_ 원본 — 저장 대상은 원본 transcript (자녀 발화 분석용)

## 🧪 Acceptance Criteria
**Scenario 1: 휴대폰 마스킹 (REQ-NF-027)**
- **Given**: transcript = "엄마 전화 010-1234-5678"
- **When**: `maskPII(transcript)` 호출
- **Then**: 반환값 = "엄마 전화 [PHONE_REDACTED]"

**Scenario 2: 이메일 마스킹**
- **Given**: transcript = "test@example.com"
- **When**: `maskPII(transcript)`
- **Then**: "[EMAIL_REDACTED]"

**Scenario 3: RRN 마스킹 (PIPA §24 고유식별정보)**
- **Given**: transcript = "990101-1234567"
- **When**: `maskPII(transcript)`
- **Then**: "[RRN_REDACTED]"

**Scenario 4: 신용카드 마스킹**
- **Given**: transcript = "1234-5678-9012-3456"
- **When**: `maskPII(transcript)`
- **Then**: "[CARD_REDACTED]"

**Scenario 5: URL + IPv4 마스킹**
- **Given**: transcript = "https://example.com 192.168.1.1"
- **When**: `maskPII(transcript)`
- **Then**: "[URL_REDACTED] [IP_REDACTED]"

**Scenario 6: 한국식 주소 마스킹**
- **Given**: transcript = "서울시 강남구 테헤란로 123-45"
- **When**: `maskPII(transcript)`
- **Then**: "[ADDRESS_REDACTED]"

**Scenario 7: 정상 발화 — 변경 없음**
- **Given**: transcript = "사과 먹어요"
- **When**: `maskPII(transcript)`
- **Then**: "사과 먹어요" (그대로)

**Scenario 8: 7 패턴 동시 — 모두 마스킹**
- **Given**: 모든 패턴 포함 transcript
- **When**: `maskPII(transcript)`
- **Then**: 7개 marker 로 모두 치환 + 일반 텍스트 보존

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-027**: Gemini transcript PII 마스킹 — 본 함수가 단일 source
- **PIPA §17 정합**: 국외 이전 시 PII 사전 제거 — 컴플라이언스 강화
- **횡단 제약**:
  - [x] R7 PIPA 위반: 우발적 PII 의 국외 이전 차단
  - [x] R4 개인정보: 자녀 발화 PII 마스킹 → 분석 정확도 영향 ≤ 0.5% (정규식 false positive 통제)
  - [ ] CON-04: 본 함수는 의료 카피 미보유
- **자문 대기**: SRS V07 §12.6 — 7 패턴 외 추가 패턴 (예: 카카오톡 ID / 학교명 / 병원명) 필요 여부는 변호사 자문 후

## 🏁 Definition of Done
- [x] `maskPII` 8 scenario 통과 (단위 테스트)
- [x] 7 패턴 정규식 false positive 검증 — "사과", "엄마" 등 일반 발화 무영향
- [x] `tsc --strict` 0 errors
- [x] `analyzeDiagnosis` + `generateCushion` 호출부 검증
- [x] `6f2e287` commit 본문에 REQ-NF-027 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-011 (Gemini 어댑터)
- **Blocks**: FR-C-022 (analyzeDiagnosis Gemini 호출 직전), FR-C-024 (generateCushion Gemini 호출 직전), SEC-007 (Gemini transcript PII 마스킹)
- **Discope 영향**: 해당 없음
