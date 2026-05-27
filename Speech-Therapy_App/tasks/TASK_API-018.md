---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Server Action + Route Handler] API-018: F11 voice clone (submit_voice_clone + /api/voice-clone/render)"
labels: 'phase:p1, mode:active, domain:api, epic:f11, sprint:p1+'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-018
- **Epic / Story**: F11 부모 음성 클로닝 동화 (V07 신규)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: ElevenLabs TTS 클로닝 API 호출 + 7일 폐기 Cron 등록. 부모 음성 5분 30초 → modelHash 발급 → 동화 콘텐츠 재생.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1 Epic F11
  - REQ-FUNC-036 (TTS 클로닝)
  - ADR-03 + ADR-09 (윤리 차단)

## ✅ Task Breakdown
- [ ] `app/actions/submit-voice-clone.ts` — Server Action:
  - 부모 음성 5분 30초 Blob 입력
  - ElevenLabs API `POST /v1/voices/add` 호출 → modelHash 반환
  - VoiceModel INSERT (DB-017) + expiresAt = now + 7일
  - 동의 검증 (PIPA + ADR-09 윤리)
- [ ] `/api/voice-clone/render/route.ts` Route Handler:
  - 동화 텍스트 + modelHash → ElevenLabs `POST /v1/text-to-speech/{voice_id}` 호출
  - Vercel Edge Cache (`Cache-Control: public, max-age=3600`)
  - 동화 페이지에서 audio 재생
- [ ] `lib/elevenlabs/client.ts` — API 클라이언트 + ElevenLabs API key 환경변수
- [ ] 7일 폐기 Cron `/api/cron/voice-model-cleanup` 등록 (API-017 패턴)

## 🧪 Acceptance Criteria
**Scenario 1: 부모 녹음 → modelHash (REQ-FUNC-036)**
- **Given**: 5분 30초 mp3 Blob
- **When**: submit_voice_clone
- **Then**: ElevenLabs API 호출 → modelHash 발급 → VoiceModel INSERT (expiresAt 7일 후)

**Scenario 2: 동화 TTS 렌더 (Edge Cache)**
- **Given**: storybook 동화 텍스트 + modelHash
- **When**: `/api/voice-clone/render`
- **Then**: audio MP3 반환 + Cache-Control 1h

**Scenario 3: 7일 폐기 (ADR-03)**
- **Given**: VoiceModel.expiresAt < now
- **When**: Cron 실행
- **Then**: ElevenLabs DELETE + VoiceModel.deletedAt UPDATE

**Scenario 4: 동의 미충족 시 차단 (ADR-09)**
- **Given**: 부모 동의 미체크
- **When**: submit_voice_clone
- **Then**: throw ConsentRequiredError

**Scenario 5: ElevenLabs Free 한도 (G2)**
- **Given**: Free 10K characters/月 한도 도달
- **When**: API 호출
- **Then**: 429 응답 → graceful 안내 ("이번 달 한도 도달, 다음 달에 다시...")

## ⚙️ Technical & Non-Functional Constraints
- **ADR-03**: 7일 폐기 의무
- **ADR-09**: 교정 차단 (FR-C-027 화이트리스트)
- **횡단 제약**:
  - [ ] R4 개인정보: 부모 음성 PII — 7일 폐기 + audit 추적
  - [ ] G2 비용: ElevenLabs Free 10K char/月 (Phase 1 검증 충분)
  - [ ] CON-03: 본 API 의 핵심 binding

## 🏁 Definition of Done
- [ ] Server Action + Route Handler 정상 동작
- [ ] 7일 폐기 Cron 등록
- [ ] ElevenLabs Free 한도 graceful 처리
- [ ] `tsc --strict` 0 errors

## 🚧 Dependencies & Blockers
- **Depends on**: DB-017 (voice_models), API-017 (Cron), API-011 (AI SDK 패턴)
- **Blocks**: FR-Q-021 (`/voice-recording`), FR-C-027 (윤리 화이트리스트), TEST-019
- **Discope 영향**: 해당 없음 (Phase 1+ 활성)
