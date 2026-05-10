---
type: source
pillar: product
title: TEST 11종 (Phase 0-2 완성) — TEST-002/003/005/006/007/008/010/011/012/013/014
source_path: ../../../raw/TASKS/TASK_TEST-002.md
source_path_b: ../../../raw/TASKS/TASK_TEST-003.md
source_path_c: ../../../raw/TASKS/TASK_TEST-005.md
source_path_d: ../../../raw/TASKS/TASK_TEST-006.md
source_path_e: ../../../raw/TASKS/TASK_TEST-007.md
source_path_f: ../../../raw/TASKS/TASK_TEST-008.md
source_path_g: ../../../raw/TASKS/TASK_TEST-010.md
source_path_h: ../../../raw/TASKS/TASK_TEST-011.md
source_path_i: ../../../raw/TASKS/TASK_TEST-012.md
source_path_j: ../../../raw/TASKS/TASK_TEST-013.md
source_path_k: ../../../raw/TASKS/TASK_TEST-014.md
source_type: task_detail
authors: []
year: 2026
ingested: 2026-05-09
tags: [TEST, Phase0, Phase1, Phase2, Hold, Replace, ChildSafety, R4, 클러스터TASKS]
---

# TEST 11종 통합 — Phase 0-2 완성

[[product/sources/TASKS-Sprint-1-Core-Detail]] (TEST-001/004/009 코어 3) + 본 ingest 11 TEST = **TEST 14종 정독 완성**. P0(Sprint 1) + P1(Retention) + P2(B2B) 합격 게이트 정본.

## 14 TEST 합격 게이트 매트릭스

| Phase | 합격 TEST | 시나리오 합계 |
|---|---|---:|
| **P0 (Sprint 1)** | TEST-001 (단위 6+부하) + TEST-004 (E2E 6) + TEST-009 (멱등성·동시성 5) | **17** |
| **P1 (Retention)** | TEST-002 (HITL 7) + TEST-003 (예외 7) + TEST-005 (금칙어 6) + TEST-006 (미션 6) + TEST-007 (적응형 7) + TEST-010 (Cron 8) + TEST-011 (공유 8) + TEST-014 (HITL 통합 9) | **58** |
| **P2 (B2B)** | TEST-012 (엑셀 8) | **8** |
| **보류 (Hold)** | TEST-008 (D5 PWA 오프라인) + TEST-013 (67-D3 Zero-touch) | (2 task) |

→ **Active 12 TEST = 83 시나리오**. 보류 2 TEST는 부활 조건 명문화.

---

## 1. TEST-002 · Confidence<70 → HITL 통합 (P1, D4 Replace)

**Phase**: 🟡 P1 / **Mode**: 🔵 Replace (D4 — Slack 웹훅 호출 검증)

### Mock
- `lib/ai/gemini.ts` confidence: 65 강제
- `prisma.hitlQueue.create` spy
- Slack 웹훅 fetch mock (`vi.mock('node-fetch')` 또는 MSW)

### 7 시나리오
1. confidence 65 → DB INSERT 1건
2. **Slack 웹훅 fetch 1회** (URL + 페이로드 검증)
3. requiresHITL: true 응답
4. confidence 75 → INSERT 0 + Slack 0
5. 중복 sessionId → UPSERT (멱등성)
6. **Slack 실패 graceful**: DB 성공, slackNotified: false
7. 즉시 이관 ≤ 2초

### Constraints
- 격리: **실제 Slack 호출 0건** (100회 반복도 0)
- R4: Slack 페이로드 자녀 식별 정보 미포함

### **Depends on**: FR-C-002, API-005, DB-009, MOCK-003

---

## 2. TEST-003 · 마이크 권한·60dB 소음·STT 재시도 (P1)

**Phase**: 🟡 P1 / **Mode**: 명세대로

### Mock
- `window.SpeechRecognition` Mock (happy-dom)
- `AnalyserNode.getByteFrequencyData` mock (60dB 시뮬)

### 7 시나리오
1. `onerror "not-allowed"` → REQ-FUNC-006 Dialog 트리거
2. 60dB 초과 → REQ-FUNC-007 Toast
3. `onerror` 첫 호출 → 재시도 1회 자동
4. 재시도 성공 → transcript + `stt_retry_success` 이벤트
5. 재시도 실패 → 수동 재시도 버튼 + `stt_retry_failed`
6. **100회 부하 (10% 실패) → 성공률 ≥ 98%** (REQ-FUNC-004)
7. **무한 재시도 방지**: 5회 onerror도 재시도 1회만

### Vercel Analytics 이벤트 spy 3종
`stt_first_attempt_success` / `stt_retry_success` / `stt_retry_failed`

### **Depends on**: FR-Q-001, FR-C-003

---

## 3. TEST-005 · Middleware 금칙어 정규식 + 화이트리스트 (P1)

**Phase**: 🟡 P1 / **Mode**: 명세대로

### 정규식 2단
- **1차**: `/(진단|장애|치료|환자|병|증상)/g`
- **2차**: `/(아프|장애아|문제아|이상)/g`

### 화이트리스트 (lookahead)
- "치료사", "치료실" → 통과 (직업명·장소명 허용)

### 6 시나리오
1. "이는 진단이 아닙니다" → "진단" 매칭 차단
2. **화이트리스트**: "치료사 선생님" → 통과
3. **사용자 발화 로깅만**: transcript "아파요" → forbidden_word_log INSERT, **차단 없음**
4. **1일 5건 초과 Slack Alert**: 6번째 INSERT 시 1회 알림 (7번째는 중복 방지)
5. **성능 ≤ 50ms** (50KB 본문)
6. AI 재생성 트리거: aiCushionText "진단" → FR-C-001 5단계 Gemini 재호출

### 정규식 커버리지
**15+ 테스트 케이스**

### **Depends on**: FR-C-005 (Middleware), DB-011 (forbidden_word_log)

---

## 4. TEST-006 · 미션 1~3분 + Drop-off + 첫 주 70% (P1)

**Phase**: 🟡 P1 / **Mode**: 명세대로

### 시뮬레이션 부하
- **100세션 시뮬** → Drop-off ≤ 10건
- **100명 신규 가입자 7일 시뮬** → 완료율 ≥ 70명

### 6 시나리오
1. 정상 1~3분 세션 (Drop-off 0)
2. **60초+ 침묵** → 거울 모드/툴팁 트리거 (FR-C-006)
3. 100세션 → Drop-off ≤ 10
4. 첫 주 코호트 → 완료 ≥ 70%
5. 적응형 난이도 (3연속 실패 → -1)
6. 미션 완료 → grantReward 호출 + 별 +1

### Vercel Analytics 이벤트 3종
`mission_started` / `mission_completed` / `mission_dropped_off`

### **Depends on**: FR-Q-003, FR-C-006/008/009, MOCK-002

> **TEST-008 흡수**: D5 보류로 FR-C-007 단순 대체된 사항(네트워크 에러 Toast)이 본 TEST-006 추가 케이스로 처리.

---

## 5. TEST-007 · 적응형 난이도 + X표시 0회 (P1) ⭐ 자녀 정서 보호

**Phase**: 🟡 P1 / **Mode**: 명세대로

### 7 시나리오
1. 3연속 실패 → reason: 'level_down', -1
2. 5연속 성공 → reason: 'level_up', +1
3. 음소 마스터 → 'phoneme_switch' + suggestedNextPhoneme
4. 일반 → 'continue'
5. NO_MISSIONS_AVAILABLE 처리
6. 응답 시간 < 500ms
7. **멱등성**: 동일 입력 → 동일 출력 (시드 결정적)

### ⭐ UI 검증 (자녀 정서 보호)
- **100회 실패 케이스 → DOM에 'X' 또는 '실패' 0건**
- **격려 카피 노출**: "괜찮아요" / "다시 해볼까요?"
- **전환 < 500ms** (미션 종료 → 다음 미션 표시)

### **Depends on**: FR-C-008, API-002, MOCK-002, FR-Q-003 (UI)

---

## 6. ❌ TEST-008 · PWA 오프라인 (P1, **HOLD**)

**Phase**: 🟡 P1 / **Mode**: ❌ Hold (D5 적용)

### 보류 사유
**D5 적용**으로 FR-C-007이 단순 대체 (에러 Toast + 재시도 버튼) → 본 통합 테스트 미작성

### 단순 대체 흡수
TEST-006 추가 케이스: 네트워크 에러 시 Toast 노출 검증

### 부활 조건 (P1 후반)
- **EXP-2** (M3 ≥ 40%) 검증 후 SW 본격 도입 결정
- **iOS Safari Background Sync** 지원 확인 (또는 워크어라운드 마련)

### 부활 시 재작성 시나리오 (참고)
1. 네트워크 단절 → IndexedDB 캐시 INSERT
2. 온라인 복구 → Background Sync + 서버 INSERT
3. 멱등성 (동일 미션 결과 중복 차단)
4. 캐시 정리 (동기화 후 IndexedDB 삭제)
5. 충돌 해소 (오프라인 +5와 온라인 +3 합산)
6. 사용자 알림 ("놓친 별들을 가져왔어요!")

---

## 7. TEST-010 · 주간 Cron + RSC p95 + PDF (P1)

**Phase**: 🟡 P1 / **Mode**: 명세대로

### 부하 시뮬
**1,000명 7일치 evaluation_results → Cron 실행 → weekly_reports 1,000 row INSERT ≤ 60초**

### 8 시나리오
1. 100명 + 7일치 → Cron → 100 row INSERT
2. 멱등성: 동일 주차 재실행 → 중복 0
3. 데이터 부족 사용자 → row 미생성
4. 1명 실패 → 99명 성공 + Slack Alert
5. **1,000명 ≤ 60초**
6. **RSC LCP p95 ≤ 3,000ms** (REQ-NF-004, Playwright)
7. 데이터 부족 → FR-Q-006 EmptyState
8. PDF 다운로드 (jsPDF) — 한글 정상

### Auth
**CRON_SECRET 검증**

### **Depends on**: FR-C-010, FR-Q-005/006/007, DB-007, API-003

---

## 8. TEST-011 · 카카오 → 클립보드/Web Share (P1, 67-D1 Replace)

**Phase**: 🟡 P1 / **Mode**: 🔵 Replace (67-D1 — 카카오 알림톡 미연동)

### Mock
- `navigator.share` mock (Web Share API)
- `navigator.clipboard.writeText` spy
- Vercel `@vercel/og` 응답 mock

### 8 시나리오
1. Web Share API 지원 환경 → `navigator.share` 호출
2. 미지원 환경 → **클립보드 복사 폴백** + Toast
3. 공유 링크 → /share/[token]
4. **24h 만료** → 25h 후 진입 시 만료 안내
5. **og:image PNG**: GET /api/og?token=... → Content-Type: image/png
6. **자녀 식별 정보 미포함** (R4 — 본명·생년월일 패턴 0건)
7. **카카오 SDK 의존성 0건** (`@kakao/*` 검증)
8. Vercel Analytics 이벤트 3종 (share_clicked, method, link_visited)

### Constraints
- R5: 카카오 정책 변경 영향 0 (의존성 0)

### **Depends on**: FR-C-012, MOCK-003 (선택)

---

## 9. TEST-012 · 100명 엑셀 일괄 등록 + 인라인 수정 (P2)

**Phase**: 🔴 P2 / **Mode**: 명세대로

### 8 시나리오
1. 100행 유효 → User INSERT 100, ≤ 3초
2. 5행 오류 (childAgeMonths NaN) → **빨간 하이라이트** + 95행 등록
3. 인라인 수정 → 재검증 → 100행 등록
4. **동의서 자동 발행** → DB-010 INSERT 100건
5. **Resend 이메일 spy 100회**
6. **자녀 본명 컬럼 무시/차단** (R4 — childNickname만)
7. 5MB 초과 → ZodError
8. 트랜잭션 롤백/격리

### 부하 측정
**100명 처리 ≤ 3초** (REQ-FUNC-054 / REQ-NF-006)

### **Depends on**: FR-C-016, FR-C-018, DB-002/003/010, API-012

---

## 10. ❌ TEST-013 · Zero-touch (P2, **HOLD**)

**Phase**: 🔴 P2 / **Mode**: ❌ Hold (67-D3 적용)

### 보류 사유
**67-D3 적용**으로 FR-C-015 보류 → 본 통합 테스트도 보류

### 부활 조건
- B2B PoC 5건 후
- FR-C-015 본격 구현
- INFRA-004 Edge Runtime 활성화
- API-009 audio stream 라우트 활성화

### 부활 시 재작성 시나리오 (참고)
1. 교실 태블릿 PWA + Web Worker VAD
2. **화자분리 정확도 ≥ 85%** (60dB 환경)
3. VAD 청크 전송 ≤ 300ms
4. 마이크 고장 PWA 알림 (REQ-FUNC-052)
5. 7일 폐기 Cron 실패 → 재시도 3회
6. **교사 능동 조작 평균 0회** (REQ-NF-028)
7. 대체 흐름 (1클릭 녹음) 검증 (B2B PoC 단계)

---

## 11. TEST-014 · HITL 48h SLA + 루프백 + 어뷰징 (P1, D4 Replace) ⭐

**Phase**: 🟡 P1 / **Mode**: 🔵 Replace (D4 — Realtime → Slack + Studio + Cron)

### 9 시나리오
1. confidence < 70 → DB INSERT + Slack 1건 + slaDueAt = +48h
2. **24h 임박** → FR-C-014 Cron → 마스터 재활사 Slack DM 1건 + escalatedAt
3. **48h 초과** → status='escalated' + admin Critical Alert
4. ⭐ **PostgreSQL 트리거 검증**: Studio UPDATE → evaluation_results.hitlReviewed=true 자동 sync
5. **사용자 알림** (Resend 이메일 spy 1회)
6. **어뷰징 방어** (REQ-FUNC-034): 동일 userId 월 4번째 dismissed → 자동 dismissed + CS 알림
7. **루프백 데이터 누적** (REQ-FUNC-HITL-004): groundTruthScore JSON → model_retraining_data
8. 멱등성: escalatedAt 마킹 row 중복 알림 0
9. 동일 expertId 1일 51건 검토 → admin Slack 1회

### 격리
**실제 Slack 채널/이메일 0건** (100회 반복도)

### **Depends on**: FR-C-002/013/014, API-005/006, DB-009, MOCK-003

---

## ⭐ 자녀 정서·정보 보호 6중 검증 (TEST 누적)

| TEST | 검증 |
|---|---|
| TEST-007 | **DOM에 'X' 또는 '실패' 0건** + 격려 카피 ("괜찮아요") |
| TEST-005 | R4 — 자녀 식별 정보 미포함 (Slack 페이로드) |
| TEST-011 | 자녀 본명·생년월일 패턴 0건 (공유 페이지) |
| TEST-012 | R4 — 본명 0건 (DB), childNickname만 |
| TEST-014 | R4 — Slack 페이로드 자녀 식별 정보 0건 |
| TEST-002 | R4 — Slack 페이로드 자녀 식별 정보 미포함 |

→ TEST 14종이 **R4 (영유아 음성 정보 보호)** 의 시스템적 회귀 보장 인프라.

## ⭐ Descope ↔ TEST 매핑 정합

| Descope | TEST | 검증 핵심 |
|---|---|---|
| **D4** (HITL Realtime → Slack + Studio) | TEST-002 + TEST-014 | Slack 웹훅 호출 + PostgreSQL 트리거 별도 검증 |
| **D5** (PWA 오프라인 → 온라인) | TEST-008 ❌ Hold | 부활 조건: EXP-2 통과 + iOS Safari |
| **67-D1** (카카오 → 클립보드/Web Share) | TEST-011 | 카카오 SDK 의존성 0 검증 |
| **67-D3** (Zero-touch 보류) | TEST-013 ❌ Hold | 부활: B2B PoC 5건 후 |
| **D8** (키즈노트 → 클립보드) | TEST-012 | Resend spy + R4 본명 0건 |

→ 8 Descope 중 **5건이 TEST에서 시스템적 회귀 보장**. D6·D7·67-D2는 의존 task 보류로 TEST도 자연 디퍼.

## ⭐ Phase별 합격 게이트 + Vercel CI 통합

```
[P0 Sprint 1 합격] = TEST-001 + TEST-004 + TEST-009
    ↓ Vercel CI 자동 실행 + Preview 배포 통과
[P1 Retention 합격] = TEST-002/003/005/006/007/010/011/014
    ↓
[P2 B2B 합격] = TEST-012
    ↓
[Hold (P1·P2)] = TEST-008/013 — 부활 조건 명문화
```

### 모든 TEST 공통 격리 원칙
- **실제 외부 호출 0건** (Slack·이메일·STT·Gemini 모두 mock)
- **SQLite in-memory** 또는 Prisma Mock
- 100회 반복 안정성 (race condition 0건)

## 텔레메트리 (Vercel Analytics) 이벤트 누적

| Domain | 이벤트 | TEST |
|---|---|---|
| STT | stt_first_attempt_success / stt_retry_success / stt_retry_failed | TEST-003 |
| Mission | mission_started / mission_completed / mission_dropped_off | TEST-006 |
| Share | share_clicked / share_method / share_link_visited | TEST-011 |
| HITL | hitl_auto_enqueued (FR-C-002에서) | TEST-002 |

→ Vercel Analytics 이벤트 명명 컨벤션 확립.

## 인용 가능 위치

| Task | 원본 | 줄 수 |
|---|---|---|
| TEST-002 | TASK_TEST-002.md | 96줄 |
| TEST-003 | TASK_TEST-003.md | 88줄 |
| TEST-005 | TASK_TEST-005.md | 93줄 |
| TEST-006 | TASK_TEST-006.md | 88줄 |
| TEST-007 | TASK_TEST-007.md | 91줄 |
| TEST-008 | TASK_TEST-008.md | 60줄 (Hold) |
| TEST-010 | TASK_TEST-010.md | 97줄 |
| TEST-011 | TASK_TEST-011.md | 95줄 |
| TEST-012 | TASK_TEST-012.md | 98줄 |
| TEST-013 | TASK_TEST-013.md | 71줄 (Hold) |
| TEST-014 | TASK_TEST-014.md | 100줄 ⭐ 가장 상세 |

## Clinical cross-link

- **TEST-007 X표시 0회 + 격려 카피** = [[clinical/concepts/조음장애]] § 놀이 기반 활동의 임상 원리. 자녀 정서 보호의 시스템적 강제.
- **TEST-005 사용자 발화 로깅만 (차단 없음)** = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙2 평가 윤리 — 부모/아이 발화는 평가 자료, 차단 대상 아님.
- **TEST-014 PostgreSQL 트리거 + Studio 1차 도구** = ADR-02 HITL 의 운영 인프라. 1급/2급 자격자가 Studio에서 직접 운영.
- **TEST-014 어뷰징 방어 (월 4번째 자동 dismissed)** = 임상 객관성 침해 방지 (동일 부모 반복 검토).
- **TEST-012 R4 자녀 본명 0건** = 임상 평가 보고서의 식별 정보 최소화 원칙 디지털 강제.
- **TEST-011 자녀 식별 패턴 0건** = SNS 공유 시 영유아 보호 윤리.

## 관련 product 페이지

- [[product/sources/TASKS-Sprint-1-Core-Detail]] (TEST-001/004/009 코어 3)
- [[product/sources/TASKS-Sprint-1-Dependent-Detail]] (TEST 환경 도구 — Vitest, Playwright)
- [[product/sources/TASKS-Sprint-1-Remaining-Detail]] (MOCK 픽스처)
- [[product/sources/TASKS-API-Routes-MOCK-Dependencies]] (TEST 의존 API)
- [[product/concepts/task-breakdown-overview]] (Phase 합격 게이트)
- [[product/concepts/MVP-descope-plan]] (5 Descope ↔ TEST 매핑)

## 보강 필요
- **TEST-008 부활 시점** EXP-2 통과 후 → iOS Safari Background Sync 지원 검증.
- **TEST-013 부활 시점** B2B PoC 5건 후 → Web Worker Throttling 검증.
- **PostgreSQL 트리거** (TEST-014 §3 시나리오) 별도 SQL 테스트 또는 Prisma 트랜잭션으로 검증 — 본 task 명세에 구체 도구 미명시.
- **`forbidden_word_log` 테이블** (TEST-005) — DB-XXX 별도 task 또는 DB-011 RLS 보강 옵션.
- **`model_retraining_data` 테이블** (TEST-014) — 동일.
- **TEST-008 단순 대체 동작 흡수 검증** (TEST-006 추가 케이스) — TEST-006 명세에 명시되어 있는지 별도 확인.
