---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[DB] DB-017: voice_models 테이블 (F11 부모 음성 클로닝 + 7일 폐기)"
labels: 'phase:p1, mode:active, domain:db, epic:f11, sprint:p1+'
assignees: ''
---

## 🎯 Summary
- **Task ID**: DB-017
- **Epic / Story**: F11 부모 음성 클로닝 동화 (V07 신규)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음 (Phase 1+ 활성)
- **목적**: ElevenLabs TTS 클로닝 모델 메타데이터 저장. 부모 음성 → modelHash 발급 → 동화 콘텐츠에서 부모 목소리 재생. ADR-03 (7일 폐기) + ADR-09 (윤리 — 교정 차단) 정합.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 Phase 1 Epic F11 — 부모 음성 클로닝 동화
  - REQ-FUNC-036 (TTS 클로닝 API)
  - REQ-FUNC-037 (교정 훈련 차단 — ADR-09 윤리)
  - ADR-03 (원본 음성 ≤ 7일 폐기) + ADR-09 (치료자 ≠ 가족 역할 분리)
- **Wiki**: `Phase-1-future-tasks-decomposition` §F11

## ✅ Task Breakdown
- [ ] `prisma/schema.prisma` 에 `VoiceModel` model 추가:
  - `userId String` (FK)
  - `modelHash String @unique` (ElevenLabs 모델 ID)
  - `createdAt DateTime @default(now())`
  - `expiresAt DateTime` (createdAt + 7일)
  - `appliedContentTypes String[]` (`["storybook", "lullaby"]` 화이트리스트, "exercise" 금지)
  - `deletedAt DateTime?` (Cron 폐기 후 marker)
- [ ] `@@index([expiresAt])` + `@@index([userId, deletedAt])`
- [ ] migration `20260615000000_add_voice_models`
- [ ] 7일 폐기 Cron Route Handler `/api/cron/voice-model-cleanup` (INFRA-007 의 audio-cleanup 패턴 재사용)
  - 매일 03:00 — `expiresAt < now AND deletedAt IS NULL` 조회 → ElevenLabs API DELETE 호출 + `deletedAt = now` UPDATE

## 🧪 Acceptance Criteria
**Scenario 1: 부모 녹음 → modelHash 발급 (REQ-FUNC-036)**
- **Given**: 부모 5분 음성 + 동의 (`/voice-recording` 페이지)
- **When**: `submit_voice_clone` Server Action → ElevenLabs API
- **Then**: VoiceModel INSERT (modelHash, expiresAt = now + 7일)

**Scenario 2: 7일 폐기 (ADR-03)**
- **Given**: VoiceModel.expiresAt < now AND deletedAt IS NULL
- **When**: Cron 실행
- **Then**: ElevenLabs DELETE + `deletedAt = now` UPDATE

**Scenario 3: 교정 훈련 차단 (REQ-FUNC-037, ADR-09)**
- **Given**: 코드가 `applyParentVoice(contentType: "exercise")` 호출 시도
- **When**: `appliedContentTypes` 화이트리스트 검증
- **Then**: throw `EthicsViolationError` ("교정 페이지 음성 적용 금지")

**Scenario 4: 동화/자장가 만 허용**
- **Given**: `applyParentVoice(contentType: "storybook")`
- **When**: 화이트리스트 검증
- **Then**: 정상 진행, modelHash 로 TTS 호출

## ⚙️ Technical & Non-Functional Constraints
- **ADR-03**: 원본 음성 ≤ 7일 폐기 — Cron 강제
- **ADR-09**: 윤리 (치료자 ≠ 가족) — 교정 훈련 차단 자동 검증
- **REQ-FUNC-037**: 교정 페이지 적용 0건 자동 (TEST-019)
- **횡단 제약**:
  - [ ] R4 개인정보: 부모 음성 ≤ 7일, audit_log 자동 capture
  - [ ] CON-03: 본 테이블 의 핵심 binding
  - [ ] G2 비용: ElevenLabs Free 10K characters/月 (Premium 구독 시 $5/月)

## 🏁 Definition of Done
- [ ] Prisma migration 성공
- [ ] 7일 폐기 Cron 정상 동작 (수동 트리거 검증)
- [ ] `applyParentVoice("exercise")` throw 자동 테스트
- [ ] `tsc --strict` 0 errors
- [ ] ElevenLabs API key 환경변수 분리

## 🚧 Dependencies & Blockers
- **Depends on**: DB-002 (User), API-018 (submit_voice_clone)
- **Blocks**: API-018 (Server Action), FR-Q-021 (`/voice-recording`), FR-C-027 (윤리 화이트리스트), TEST-019
- **Discope 영향**: 해당 없음
