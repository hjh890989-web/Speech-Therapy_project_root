---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Test] TEST-019: F11 윤리 차단 자동 — applyParentVoice() 화이트리스트 + 7일 만료 자동 삭제"
labels: 'phase:p1, mode:active, domain:test, epic:f11-voice-ethics, sprint:p1-plus'
assignees: ''
---

## 🎯 Summary
- **Task ID**: TEST-019
- **Epic / Story**: F11 부모 음성 클로닝 윤리 차단 (V07 신규)
- **Phase**: 🟡 P1+
- **Mode**: 명세대로 + 윤리 hard guard
- **Discope 적용**: 해당 없음 (F11 윤리 hard binding — 코드 외 표현 0건 의무)
- **목적**: F11 부모 음성 클로닝의 윤리 차단 자동 검증 — `applyParentVoice(contentType)` 화이트리스트 (`storybook` / `lullaby` OK / **교정 페이지 0건**) + 7일 만료 후 voice_models 자동 삭제 Cron 검증. ADR-09 (음성 클로닝 윤리) 의 임상 안전 안정성 evidence. MIT 임상 원리 (wiki/clinical/concepts/실어증 § MIT) 정합 — 치료자 ≠ 가족 역할 분리.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §4.1 F11 (부모 음성 클로닝)
  - REQ-FUNC-036 (음성 클로닝 + 7일 폐기)
  - REQ-FUNC-037 (교정 훈련에는 부모 음성 클로닝 적용 금지 ⚠️)
  - ADR-03 (raw audio 7일 폐기) + ADR-09 (음성 클로닝 윤리)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §3 TEST-019
- **선행 구현**: FR-C-027 (applyParentVoice + 7일 폐기), DB-017 (voice_models), API-018 (ElevenLabs render)

## ✅ Task Breakdown
- [ ] `__tests__/unit/apply-parent-voice.test.ts` 단위 테스트:
  - test 1 — `applyParentVoice('storybook')` → true (허용)
  - test 2 — `applyParentVoice('lullaby')` → true
  - test 3 — `applyParentVoice('correction')` → false + 윤리 차단 사유 throw
  - test 4 — `applyParentVoice('diagnosis')` → false (교정 페이지 아니지만 진단 페이지 - 음성 클로닝 적용 0건)
  - test 5 — undefined / unknown contentType → false (default deny)
- [ ] `__tests__/integration/f11-voice-lifecycle.test.ts` 통합 테스트:
  - test 1 — voice_models INSERT 시 expiresAt = createdAt + 7d 자동 설정
  - test 2 — 7일 경과 후 Cron `/api/cron/audio-cleanup` 실행 → 만료 row 삭제 검증
  - test 3 — 만료 row 의 Supabase Storage 음성 파일 DELETE 검증
  - test 4 — appliedContentTypes 컬럼 화이트리스트 검증 (storybook/lullaby 만 저장)
  - test 5 — 교정 페이지 audio 적용 시도 → 차단 + AuditLog (R4 sanitize)
- [ ] e2e — `/voice-recording` → 동화 콘텐츠 적용 (허용) + 교정 콘텐츠 적용 (차단) 시나리오
- [ ] Cron 단위 테스트 — audio-cleanup 함수 단독 호출 → 만료 row 0건 잔여 검증

## 🧪 Acceptance Criteria (BDD/GWT)
**Scenario 1: storybook 허용 (REQ-FUNC-036)**
- **Given**: voice_models row, contentType='storybook'
- **When**: applyParentVoice('storybook')
- **Then**: true 반환, ElevenLabs TTS render API 정상 호출

**Scenario 2: 교정 페이지 차단 (REQ-FUNC-037 ⚠️)**
- **Given**: 교정 훈련 페이지에서 부모 음성 적용 시도
- **When**: applyParentVoice('correction')
- **Then**: false 반환 + Error throw "교정 페이지에는 부모 음성 클로닝 적용 금지 (REQ-FUNC-037, ADR-09)"

**Scenario 3: default deny — unknown contentType**
- **Given**: contentType='unknown' 또는 undefined
- **When**: applyParentVoice
- **Then**: false (화이트리스트 외 모두 차단)

**Scenario 4: 7일 만료 자동 삭제 (ADR-03)**
- **Given**: voice_models row, createdAt = 8일 전, expiresAt = 1일 전
- **When**: Cron `/api/cron/audio-cleanup` 실행
- **Then**: voice_models row DELETE + Supabase Storage 음성 파일 DELETE

**Scenario 5: 만료 전 row 유지**
- **Given**: voice_models row, createdAt = 3일 전
- **When**: Cron 실행
- **Then**: row 유지 (삭제 0건)

**Scenario 6: appliedContentTypes 화이트리스트 영속 검증**
- **Given**: voice_models INSERT
- **When**: appliedContentTypes 컬럼 조회
- **Then**: `['storybook', 'lullaby']` subset 만 저장, 'correction' 포함 불가

**Scenario 7: 차단 시도 audit 추적 (R4 sanitize)**
- **Given**: 교정 페이지에서 음성 적용 시도
- **When**: 차단 발생
- **Then**: AuditLog row INSERT (action='BLOCKED', sanitized JSONB) — DB-013 연동

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-036**: 음성 클로닝 + 7일 폐기
- **REQ-FUNC-037**: 교정 훈련 음성 클로닝 금지 (윤리 hard binding ⚠️)
- **ADR-03**: raw audio 7일 폐기
- **ADR-09**: 음성 클로닝 윤리 (치료자 ≠ 가족 역할 분리, MIT 임상 원리)
- **횡단 제약**:
  - [ ] **R4**: 음성 데이터 자체가 영유아 식별 — 7일 폐기 의무
  - [ ] **CON-04**: 의료 금칙어 0건 (UI/카피)
  - [ ] **Disclaimer**: `/voice-recording` 페이지 disclaimer 노출 (FR-Q-021 책임)
  - [ ] **CON-03 7일 폐기**: 본 task 의 핵심 검증
- **임상 안전**: F15 와 동일 — ADR-14 임상 안전 게이트 (KOPLAC 13 항목) 통과 후 활성

## 🏁 Definition of Done
- [ ] 7 시나리오 단위 + 통합 테스트 PASS
- [ ] applyParentVoice 화이트리스트 default deny 검증
- [ ] 7일 만료 Cron audio-cleanup 동작 검증
- [ ] 교정 페이지 적용 0건 e2e 회귀 보호
- [ ] AuditLog 차단 시도 추적 검증
- [ ] `tsc --strict` 0 errors
- [ ] PR 본문에 REQ-FUNC-036/037 + ADR-03/09 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-C-027 (applyParentVoice + 7일 폐기), DB-017 (voice_models), API-018 (ElevenLabs render), API-017 (audio-cleanup Cron), DB-013 (AuditLog 추적)
- **Blocks**: F11 정식 출시 게이트 (윤리 검증 evidence)
- **Discope 영향**: 해당 없음
