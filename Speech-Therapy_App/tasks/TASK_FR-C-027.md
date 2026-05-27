---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-027: F11 submit_voice_clone + applyParentVoice 화이트리스트 (윤리 게이트)"
labels: 'phase:p1, mode:pending, domain:fr-c, epic:f11, sprint:phase1plus'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-027
- **Epic / Story**: F11 부모 음성 클로닝 동화 (Phase 1+)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음 (Phase 1+ 진입 시 활성)
- **목적**: 부모 음성 클로닝 동화 (F11) 의 핵심 Server Action + 윤리 게이트 — `submit_voice_clone` 으로 ElevenLabs TTS 모델 생성 + 7일 폐기 Cron 등록 + `applyParentVoice(contentType)` 화이트리스트 (storybook / lullaby 만 허용, 교정 페이지 0건 자동 검증). ADR-09 (치료자 ≠ 가족 역할 분리) 정합.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1 Epic F11 — 부모 음성 클로닝 동화 (5 신규 task)
  - REQ-FUNC-036 (부모 음성 → ElevenLabs TTS 모델 생성)
  - REQ-FUNC-037 (⚠️ 교정 훈련 적용 금지 — 화이트리스트)
  - ADR-03 (음성 7일 폐기)
  - ADR-09 (치료자 ≠ 가족 역할 분리)
- **Wiki**: `wiki/clinical/concepts/실어증` § MIT 임상 원리
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-B FR-C-027

## ✅ Task Breakdown
- [ ] `app/actions/voice-clone.ts` 의 `submit_voice_clone(input)` Server Action:
  - Zod: `{ audioBlob: Buffer, recordingDurationSec: number }` (30초~5분 30초)
  - 권한 동의 확인 + ElevenLabs API 호출 → `modelHash` 발급
  - `voice_models` DB INSERT — `userId / modelHash / createdAt / expiresAt (now + 7일) / appliedContentTypes: []`
- [ ] `lib/voice/apply-parent-voice.ts` 의 `applyParentVoice(contentType: string)` 화이트리스트:
  ```typescript
  const ALLOWED_CONTENT_TYPES = ['storybook', 'lullaby'] as const;
  export function applyParentVoice(contentType: string): boolean {
    if (!ALLOWED_CONTENT_TYPES.includes(contentType as never)) {
      throw new Error(`ADR-09 violation: parent voice not allowed for ${contentType}`);
    }
    return true;
  }
  ```
- [ ] 교정 페이지 (`/diagnose`, `/missions/correction`) — 본 함수 호출 0건 자동 검증 (eslint rule + grep)
- [ ] `/api/cron/voice-clone-cleanup` Vercel Cron (또는 GitHub Actions) — 일 1회 `voice_models.expiresAt < now()` 자동 삭제 + ElevenLabs 모델도 삭제
- [ ] `submit_voice_clone` 호출 후 동의 마커 — `User.voiceCloneConsentAt` (DB-017 + DB-015 후속 컬럼) 저장
- [ ] CON-04 의료 금칙어 무위반 검증 — 본 Server Action 의 메시지 카피 자체 무위반
- [ ] 7일 폐기 검증 — 8일차 재호출 시 `applyParentVoice` 401 반환

## 🧪 Acceptance Criteria
**Scenario 1: 부모 음성 녹음 → ElevenLabs 모델 생성 (REQ-FUNC-036)**
- **Given**: 사용자 권한 동의 + 30초~5분 30초 녹음
- **When**: `submit_voice_clone({audioBlob, recordingDurationSec: 300})`
- **Then**: ElevenLabs API 호출 → modelHash 발급 + voice_models INSERT 1건

**Scenario 2: storybook 콘텐츠 — 부모 음성 적용 허용 (REQ-FUNC-037)**
- **Given**: voice_model 존재 + contentType = "storybook"
- **When**: `applyParentVoice("storybook")`
- **Then**: true 반환 → 동화 페이지에서 부모 목소리 재생

**Scenario 3: 교정 페이지 — 부모 음성 적용 차단 (ADR-09 윤리 게이트) ⚠️**
- **Given**: contentType = "correction" (교정 페이지)
- **When**: `applyParentVoice("correction")`
- **Then**: Error throw (`ADR-09 violation`) — 교정 훈련에 부모 음성 적용 0건

**Scenario 4: 7일 후 자동 폐기 (ADR-03)**
- **Given**: voice_model 의 expiresAt < now()
- **When**: Cron 실행
- **Then**: voice_models row DELETE + ElevenLabs API delete 호출

**Scenario 5: 화이트리스트 외 contentType — 자동 차단**
- **Given**: contentType = "ad" 또는 임의 문자열
- **When**: `applyParentVoice("ad")`
- **Then**: Error throw — 화이트리스트 외 모두 차단 (allowlist 정책)

**Scenario 6: 권한 미동의 user — submit 차단**
- **Given**: User.voiceCloneConsentAt = NULL
- **When**: `submit_voice_clone(input)`
- **Then**: `ConsentRequiredError` throw

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-036/037**: F11 핵심 + 윤리 게이트 동시 충족
- **ADR-03**: 음성 7일 폐기 — Cron 자동
- **ADR-09**: 치료자 ≠ 가족 역할 분리 — 화이트리스트로 강제
- **횡단 제약**:
  - [x] CON-04: 본 Server Action 의 메시지 + 화이트리스트 reason 자체 의료 금칙어 무위반
  - [x] R4 개인정보: 음성 7일 폐기 자동
  - [x] R7 PIPA 위반: 권한 동의 user 만 — 미동의 차단
- **비용**: ElevenLabs Free 10K characters/月 (≈ 동화 5권/月) — Phase 1 검증용 충분

## 🏁 Definition of Done
- [ ] `submit_voice_clone` + `applyParentVoice` 6 scenario 통과
- [ ] 화이트리스트 (`['storybook', 'lullaby']`) 외 모두 차단 자동 검증
- [ ] 교정 페이지 0건 자동 검증 (eslint + grep)
- [ ] 7일 폐기 Cron 동작 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-036/037 + ADR-03 + ADR-09 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-017 (voice_models), API-018 (submit_voice_clone + render), API-011 (Gemini 어댑터 — disclaimer 정합), FR-Q-021 (`/voice-recording` 페이지)
- **Blocks**: TEST-019 (F11 윤리 차단 자동 검증), MON-006 (expert HHI/Gini — 본 task 직접 무관, F11 활성 후 운영)
- **Discope 영향**: D5 PWA 부활 의존성 없음 (F11 은 PWA 무관)
