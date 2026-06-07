---
type: concept
pillar: product
category: synthesis
aliases: [Phase 1 미추출 task, F11 F15 F16 task 분해, 88 Task 보강, Phase 1 후속]
tags: [Phase1, F11, F15, F16, F17, F18, 88Task, 보강, FR-Q, FR-C, API, DB, TEST, 클러스터통합]
---

# Phase 1 미추출 task 분해 제안 — F11 / F15 / F16 / F17 / F18

[[product/concepts/requirements-traceability-matrix]] § Phase 1 보강 영역에서 식별한 5 Epic의 88 Task 미추출 항목 분해 제안. **F11 부모 음성 + F15 LLM 챗봇 + F16 푸시 = 88 Task 0건 / F17 케어로그 + F18 예측 = 부분 매핑**.

> 본 페이지는 **분석 + 제안**. 실제 task 신규 등록은 사용자 확정 + Phase 1 진입 시 (현 Sprint 1 = Phase 0 진행 중).

## 현 매핑 상태 (RTM 기준)

| Epic | REQ-FUNC | 현 매핑 | 미매핑 |
|---|---|---|---|
| **F11** 부모 음성 클로닝 | 036~037 | (없음) | FR-Q + FR-C + API + DB + TEST |
| **F15** LLM 챗봇 | 039~040 | (없음) | FR-Q + FR-C + API + TEST |
| **F16** 오프라인 푸시 | 041 | (없음) | FR-C + API + DB |
| **F17** 통합 케어로그 | 043 (추정) | FR-Q-013 + DB-004 | FR-C + TEST |
| **F18** 예측 시뮬레이션 | 044~045 | FR-Q-012 + FR-C-011 + API-011 + DB-007 | TEST |

→ **분해 가치 우선순위**: F11 (윤리 차단 강제) > F15 (개인정보 7일 폐기) > F16 (PWA 의존) > F17 (보강) > F18 (보강).

## ⭐ F11 부모 음성 클로닝 동화 — 가장 윤리 민감

### REQ-FUNC 매핑

| REQ ID | 명세 |
|---|---|
| **REQ-FUNC-036** | 부모 음성 녹음 → TTS 클로닝 모델 생성 / 동화 콘텐츠에서 부모 목소리 재생 |
| **REQ-FUNC-037** ⚠️ | **교정 훈련에는 부모 음성 클로닝 적용 금지** (① UX 원칙 — [[clinical/concepts/실어증]] § MIT 임상 원리: 치료자 ≠ 가족 역할 분리) |

### 신규 task 분해 (5종 제안)

| 신규 ID 후보 | 종류 | 명세 | SP |
|---|---|---|---|
| **FR-Q-NEW-F11-1** `voice_recording_page` | Read | 부모 음성 녹음 페이지 (`/voice-recording`) — 권한 안내 + Disclaimer + 5분 30초 녹음 가이드 | 2 |
| **FR-C-NEW-F11-1** `submit_voice_clone` | Write | Server Action — 음성 업로드 + ElevenLabs API 호출 + voice_models DB INSERT + 7일 폐기 Cron | 2 |
| **API-NEW-F11-1** `/api/voice-clone/render` | API | TTS 렌더링 외부 API → Vercel Edge Cache → 동화 페이지 사용 | 1.5 |
| **DB-NEW-F11-1** `voice_models` 테이블 | DB | userId + modelHash + createdAt + expiresAt (7일) + appliedContentTypes (배열, 동화만 허용) | 0.5 |
| **TEST-NEW-F11-1** 윤리 차단 자동 검증 | TEST | 동화 페이지 음성 = OK / **교정 페이지 음성 = 0건 자동** + 7일 만료 검증 | 1.5 |
| **합계** | — | **F11 = 7.5 SP** | 7.5 |

### 윤리 차단 메커니즘 (REQ-FUNC-037)

```typescript
// applyParentVoice(contentType): 콘텐츠 타입 화이트리스트
const ALLOWED_CONTENT_TYPES = ['storybook', 'lullaby']
// 차단 대상: ['articulation_correction', 'phoneme_drill', 'mission_mirror']

if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
  throw new Error('REQ-FUNC-037: 교정 훈련에 부모 음성 클로닝 적용 차단')
}
```

→ TEST-NEW-F11-1에서 자동 회귀 검증.

### 비용·리스크

| 항목 | 값 |
|---|---|
| ElevenLabs Free | 10K characters/月 (≈ 동화 5권/月). Phase 1 검증용 충분 |
| 유료 전환 | $5/月 30K chars (Premium 구독자만 활성화) |
| ⚠️ 윤리 리스크 | 부모 음성 ≤7일 폐기 (ADR-03 정합) + 교정 차단 (REQ-037) — 둘 다 시스템 강제 |

## ⭐ F15 LLM 대화형 발화 유도 챗봇

### REQ-FUNC 매핑

| REQ ID | 명세 |
|---|---|
| **REQ-FUNC-039** | Vercel AI SDK `useChat()` 스트리밍 + Gemini 호출 |
| **REQ-FUNC-040** | 자연 발화 데이터 무자각 수집 + 7일 폐기 + 의료 용어 배제 |

### 신규 task 분해 (4종 제안)

| 신규 ID 후보 | 종류 | 명세 | SP |
|---|---|---|---|
| **FR-Q-NEW-F15-1** `chat_page` | Read | useChat 스트리밍 UI (shadcn/ui Card + Framer Motion 타이핑 효과) + ADR-04 금칙어 자동 검열 (Middleware) | 2 |
| **FR-C-NEW-F15-1** `submit_chat_utterance` | Write | 발화 → STT (Web Speech API D1) → 메시지 INSERT + 7일 폐기 Cron 등록 | 1.5 |
| **API-NEW-F15-1** `/api/chat/stream` | API | Vercel AI SDK Edge → Gemini Pro 1.5 (D6 pgvector 미사용 = 단일턴 컨텍스트) | 1.5 |
| **TEST-NEW-F15-1** 화용 + ADR-04 + 7일 폐기 | TEST | 의도 ↔ 발화 매핑 검증 + 의료 용어 0건 자동 + 7일 후 자동 삭제 | 1.5 |
| **합계** | — | **F15 = 6.5 SP** | 6.5 |

### KOPLAC 영감 매핑

[[clinical/entities/KOPLAC]] § 화용 영역 평가 = F15의 임상 영감:
- 의사소통 의도 (요청/거절/공유) 시나리오 자동 유도
- 담화 관리 (차례 지키기) 챗봇 구현
- 상황 맥락 (이미지 + 텍스트 멀티모달)

→ 단, ASD 진단 회피 ([[clinical/concepts/자폐-화용중재]] 정합 — 의료 영역 회피).

## ⭐ F16 오프라인 일반화 푸시 알림

### REQ-FUNC 매핑

| REQ ID | 명세 |
|---|---|
| **REQ-FUNC-041** | Web Push API → 일상 발화 유도 시점 알림 ("저녁 먹을 때 '맛있어요' 한번 말해보세요") |

### 신규 task 분해 (3종 제안)

| 신규 ID 후보 | 종류 | 명세 | SP |
|---|---|---|---|
| **FR-C-NEW-F16-1** `subscribe_push` | Write | Service Worker push subscription 등록 (PWA 의존, **D5 Descope 부활 트리거**) | 1.5 |
| **API-NEW-F16-1** `/api/push/dispatch` | API | Vercel Cron (일 1회 18:00) → 활성 구독 조회 → Web Push 발송 | 1.5 |
| **DB-NEW-F16-1** `push_subscriptions` 테이블 | DB | userId + endpoint + p256dh + auth + lastSentAt + dismissCount | 0.5 |
| **합계** | — | **F16 = 3.5 SP** | 3.5 |

### D5 PWA 부활 의존성

F16 = PWA Service Worker 필수 → **D5 Descope 부활 시점에 동시 활성**:
- D5 부활 조건: [[product/entities/persona-강지방]] (농촌 사용자 비율 N%+) + iOS Safari + EXP-2 통과
- F16 부활 조건: D5 + 일 활성 사용자 1,000명+ (Vercel 무료 한도 검증 필요)

## F17 통합 케어로그 — 부분 보강

### 현 매핑

| 차원 | 매핑 |
|---|---|
| REQ-FUNC | 043 (추정) |
| FR-Q | FR-Q-013 ✅ |
| DB | DB-004 ✅ |

### 보강 (2종)

| 신규 ID 후보 | 종류 | 명세 | SP |
|---|---|---|---|
| **FR-C-NEW-F17-1** `submit_care_log` | Write | 부모 직접 입력 (자유놀이 시간·외부 센터 세션 메모) — DB-004 INSERT | 1 |
| **TEST-NEW-F17-1** F4 통합 검증 | TEST | F4 주간 리포트에서 외부 케어로그 + 앱 미션 데이터 통합 시각화 | 1 |
| **합계** | — | **F17 = 2 SP** | 2 |

## F18 발달 예측 시뮬레이션 — 부분 보강

### 현 매핑

| 차원 | 매핑 |
|---|---|
| REQ-FUNC | 044~045 |
| FR-Q | FR-Q-012 ✅ |
| FR-C | FR-C-011 ✅ |
| API | API-011 ✅ |
| DB | DB-007 ✅ |

### 보강 (1종)

| 신규 ID 후보 | 종류 | 명세 | SP |
|---|---|---|---|
| **TEST-NEW-F18-1** EXP-2 익월 +20%p 검증 | TEST | Amplitude 코호트 분석 자동화 — 시뮬레이션 클릭 vs 비클릭 익월 결제 유지율 차이 ≥20%p (REQ-FUNC-029의 직접 검증) | 1.5 |
| **합계** | — | **F18 = 1.5 SP** | 1.5 |

→ TEST-NEW-F18-1 = EXP-2 (리포트 락인) 핵심 게이트.

## 통합 — 13 신규 task 합산

| Epic | 신규 task 수 | SP |
|---|---|---|
| **F11** 부모 음성 | 5 | 7.5 |
| **F15** LLM 챗봇 | 4 | 6.5 |
| **F16** 오프라인 푸시 | 3 | 3.5 |
| **F17** 케어로그 (보강) | 2 | 2.0 |
| **F18** 예측 (보강) | 1 | 1.5 |
| **합계 (Phase 1)** | **15** | **21 SP** |

→ F9.4 (5 task 7 SP) + Phase 1 (15 task 21 SP) = **20 신규 task / 28 SP** 보강 후보. **88 → 108 Task**.

## RTM 보강 후 매핑 완성도

| 차원 | 현 (88) | 보강 (108) | 완성도 |
|---|---|---|---|
| REQ-FUNC | 61 + HITL 4 = 65 매핑 | 동일 | 100% ✅ |
| 21 Epic | 21 매핑 | 21 매핑 (sub-feature 분해) | 100% ✅ |
| 88 Task | 88 매핑 | **108 Task** (F9.4 5 + Phase 1 15) | 100% ✅ |

→ 위키 RTM 추적성 = 100% **유지** + Phase 1 진입 시 직접 실행 task 명세 확보.

## 우선순위 (실행 권장)

### P1 (Phase 1 진입 즉시)

1. **F18 EXP-2 검증 task** (1.5 SP) — 가장 작고, EXP-2 게이트의 직접 의존
2. **F17 보강** (2 SP) — F4 주간 리포트와 직접 통합

### P2 (Phase 1 중반)

3. **F15 LLM 챗봇** (6.5 SP) — Vercel AI SDK 인프라 활용
4. **F11 부모 음성** (7.5 SP) — Premium 구독자 차별화 가치

### P3 (Phase 1 후반 + D5 부활 연동)

5. **F16 오프라인 푸시** (3.5 SP) — D5 + 활성 사용자 1,000명+ 후

## 윤리·안전 게이트 (Phase 1 진입 게이트)

| 게이트 | 적용 | 검증 |
|---|---|---|
| **REQ-FUNC-037 윤리 차단** | F11 | TEST-NEW-F11-1 (교정 콘텐츠 음성 0건 자동) |
| **ADR-03 7일 폐기** | F11 + F15 | Vercel Cron 자동 폐기 + audit_log INSERT |
| **ADR-04 의료 용어 배제** | F15 | Middleware 금칙어 정규식 |
| **HITL groundTruthScore 환류** | F15 (자연 발화 데이터) | 추후 model_retraining_data 테이블 통합 |

## ADR 후보

- **ADR-XX F11 윤리 화이트리스트** (`ALLOWED_CONTENT_TYPES`) 시스템 강제 — 교정 ≠ 가족 역할 분리의 명문화. (현 7 ADR + F9.4 1 + F11 1 = **9 ADR** 가능성)
- **ADR-XX F16 D5 의존성** — F16 활성화는 D5 PWA 부활을 강제로 의존. 단독 활성화 금지.

## 외부 의존성

| 도구 | 영역 | 한도·비용 |
|---|---|---|
| **ElevenLabs** | F11 TTS 클로닝 | Free 10K chars/月 (Phase 1 검증) → Premium $5/月 |
| **Gemini Pro 1.5** | F15 챗봇 | Vercel AI SDK 통합. Free 한도 (15 RPM) Phase 1 충분 |
| **Web Push API** | F16 | 무료 (Service Worker + Vercel Edge) |
| **Vercel Cron** | F16 + F11 7일 폐기 | Free 1 cron / Pro 100+ cron (Phase 1 = Free 충분) |

## 출처

- [[product/concepts/requirements-traceability-matrix]] § "F11/F15/F16 = REQ-FUNC 정의되어 있으나 88 Task 미추출"
- [[product/sources/65-SRS-V06-Final]] § REQ-FUNC-036~045
- [[product/concepts/MVP-feature-spec]] § Phase 1 Should
- [[product/concepts/F9.4-ROI-simulator]] § 신규 task 분해 패턴 (참조)

## 관련 product 페이지

- [[product/concepts/MVP-feature-spec]] — F11/F15/F16/F17/F18 Epic 정본
- [[product/concepts/architecture-decisions]] — ADR-03 (7일 폐기) + ADR-04 (의료 배제)
- [[product/concepts/HITL-system-flow]] § groundTruthScore = F15 자연 발화 환류 후보
- [[product/concepts/MVP-descope-plan]] § D5 PWA 부활 = F16 활성 의존성
- [[product/entities/persona-강지방]] § D5 부활 트리거 페르소나

## Clinical 정합

- **F11 윤리 차단** = [[clinical/concepts/실어증]] § MIT (치료자 ≠ 가족 역할 분리). 시스템 강제로 임상 윤리 보장.
- **F15 화용 영감** = [[clinical/entities/KOPLAC]] § 의사소통 의도·담화·맥락. ASD 진단은 회피 ([[clinical/concepts/자폐-화용중재]] 정합).
- **F16 일상 발화 유도** = [[clinical/concepts/아동언어치료-핵심기법]] § 평행 발화·확장 부모 코칭 4기법의 일상 일반화.
- **F17 통합 케어로그** = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙 1 의료기관 + 트랙 2 사설 + 자가 학습의 데이터 통합 단절 해소.
- **F18 예측** = REVT/U-TAP 등가 연령 예측의 디지털 변형 — 단, ADR-04 (의료 용어 배제) 정합으로 "예상 점수"로 표현.

## 보강 필요

- 사용자 확정 후 신규 15 task 등록 (88 → 103 + F9.4 5 = 108).
- F11 윤리 화이트리스트 ADR-XX 정식 등록.
- F16 D5 PWA 부활 의존성 Descope plan 명시.
- ✅ F15 KOPLAC 영감 임상 자문 가이드라인 — [[product/concepts/F15-clinical-consultation-checklist]] (13 자문 체크리스트 + ASD 회피 경계 + 연령 적응 + KOPLAC 저작권 + 자문 일정 4주 + 비용 ~82만/1회).
- ElevenLabs Free → 유료 전환 시점 결정 (Premium 구독자 N명 이상).
- TEST-NEW-F18-1 EXP-2 검증 자동화 — Amplitude 통합 별도 OPS task 검토.
