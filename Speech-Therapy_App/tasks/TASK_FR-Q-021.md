---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-021: /voice-recording 페이지 (F11 부모 음성 클로닝 동화) — 권한 + Disclaimer + 5분 30초 녹음"
labels: 'phase:p1, mode:active, domain:fr-q, epic:f11-voice-clone, sprint:p1+'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-021
- **Epic / Story**: F11 부모 음성 클로닝 동화 (Phase 1+ 신규)
- **Phase**: 🟡 P1+ (Phase 1 이후 활성)
- **Mode**: 명세대로 (ADR-09 윤리 화이트리스트 + ADR-03 7일 폐기 강제)
- **Discope 적용**: 해당 없음 (활성화는 Phase 1+ 게이트 통과 후)
- **목적**: F11 의 진입점 페이지 — 마이크 권한 안내 + Disclaimer (윤리 + 7일 폐기 + 동화 전용) + 30초~5분 녹음 가이드 UI. 녹음 완료 시 FR-C-NEW-F11-1 (`submitVoiceClone`) Server Action 호출 → ElevenLabs TTS 클로닝 → `voice_models` INSERT + 7일 폐기 Cron.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1+ Epic F11 — 부모 음성 클로닝 동화
  - REQ-FUNC-036 (권한 동의 후 30초~5분 녹음 → modelHash 발급)
  - REQ-FUNC-037 (교정 훈련에는 부모 음성 적용 금지 — ADR-09)
  - ADR-09 (F11 부모 음성 윤리 화이트리스트)
  - ADR-03 (7일 폐기)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-A FR-Q-021 (FR-Q-NEW-F11-1)

## ✅ Task Breakdown
- [ ] `app/(public)/voice-recording/page.tsx` — F11 진입 페이지
- [ ] 1단계 — 권한 안내: 마이크 사용 + 7일 자동 폐기 + 동화 전용 명시 (Disclaimer)
- [ ] 2단계 — **이중 동의 체크박스**:
  - `[필수] 부모 음성 녹음 동의 (PIPA §22-6 자녀 음성 보호자 동의)`
  - `[필수] 동화 콘텐츠 전용 — 교정 훈련 적용 금지 인지` (REQ-FUNC-037)
- [ ] 3단계 — 녹음 가이드 UI: 30초~5분 카운터 + 권장 스크립트 (5문장 예시)
- [ ] 4단계 — `MediaRecorder` API 로 녹음 (audio/webm) — 클라이언트 보관, 서버 전송 시 즉시 ElevenLabs 전송 + DB 미저장 정책
- [ ] 5단계 — 녹음 완료 시 `submitVoiceClone(audioBlob)` Server Action 호출 (FR-C-NEW-F11-1) → modelHash 반환
- [ ] 6단계 — 성공 시 "동화 페이지에서 부모 목소리로 재생됩니다 (7일 후 자동 폐기)" 안내
- [ ] `MedicalDisclaimerFooter` + ADR-04 금칙어 무위반 — 페이지 카피 검증
- [ ] `ConsentRedirectGate` 적용 (인증 user 만 — PIPA 동의 확보 후 진입)

## 🧪 Acceptance Criteria
**Scenario 1: 정상 녹음 흐름 (REQ-FUNC-036)**
- **Given**: PIPA 동의 + Premium 구독 인증 user
- **When**: `/voice-recording` 진입 → 두 ✅ → 마이크 권한 grant → 60초 녹음 → 제출
- **Then**: `submitVoiceClone` 호출 + `voice_models` INSERT (`expiresAt = now+7d`) + modelHash 반환

**Scenario 2: 마이크 권한 거부 시 안내**
- **Given**: 마이크 권한 denied
- **When**: 녹음 버튼 클릭
- **Then**: "브라우저 설정에서 마이크 권한 허용 필요" 안내 + 외부 가이드 링크

**Scenario 3: 동의 체크박스 미완 시 disabled (REQ-FUNC-037)**
- **Given**: 1개 체크박스만 ✅
- **When**: 녹음 버튼
- **Then**: disabled + "두 동의 모두 필요" 안내

**Scenario 4: 30초 미만 녹음 시 거부**
- **Given**: 20초 녹음 후 제출
- **When**: 클라이언트 검증
- **Then**: "최소 30초 이상" 에러 + 재녹음 유도

**Scenario 5: 5분 초과 시 자동 정지**
- **Given**: 녹음 중 5분 도달
- **When**: MediaRecorder timer
- **Then**: 자동 정지 + "5분 도달 — 제출하시겠습니까?" prompt

**Scenario 6: ADR-04 금칙어 무위반**
- **Given**: 페이지 카피 + Disclaimer
- **When**: pre-commit + ESLint 금칙어 스캔
- **Then**: "치료" / "진단" / "장애" 0건

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-036**: 30초~5분 녹음 + modelHash 발급
- **REQ-FUNC-037 + ADR-09**: 교정 적용 차단 — UI 카피 + DB `appliedContentTypes` 화이트리스트 (storybook / lullaby) 만 허용
- **ADR-03**: 7일 자동 폐기 (Cron) — UI 에 명시 의무
- **횡단 제약**:
  - [x] CON-04 금칙어: 페이지 카피 + Disclaimer 무위반
  - [x] Disclaimer: 7일 폐기 + 동화 전용 + 비의료기기 footer 명시
  - [x] R4 개인정보: audioBlob DB 미저장 (ElevenLabs 직송) + 7일 폐기
  - [x] G5 Rate Limiter: ElevenLabs Free 10K chars/月 — 부모 1인당 1 voice 만 허용
- **성능**: 페이지 로드 ≤ 2s, 녹음 → modelHash 발급 ≤ 30s (ElevenLabs 응답 의존)

## 🏁 Definition of Done
- [ ] 6 step UI 모두 정상 동작
- [ ] 두 ✅ 검증 + 마이크 권한 fallback + 30초~5분 범위 검증
- [ ] `submitVoiceClone` Server Action 호출 + modelHash 반환 확인
- [ ] ADR-04 금칙어 무위반 (pre-commit + ESLint + TEST-NEW-F11-1)
- [ ] `tsc --strict` 0 errors
- [ ] Premium 구독 가드 (`requireSubscription('premium')`)
- [ ] PR 본문에 REQ-FUNC-036/037 + ADR-09 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-018 (FR-C-NEW-F11-1 `submitVoiceClone` Server Action), DB-NEW-F11-1 (`voice_models` 테이블), INFRA-NEW-F11 (ElevenLabs API key), ADR-09 (윤리 화이트리스트 정책 확정)
- **Blocks**: FR-Q-NEW-F11-2 (`/storybook/[id]` 가 modelHash 로 TTS 재생), TEST-NEW-F11-1 (윤리 차단 자동 검증)
- **Discope 영향**: Phase 1+ 게이트 (ElevenLabs Free 10K/月 검증 + 윤리 모니터링 + 7일 폐기 Cron 안정성)
