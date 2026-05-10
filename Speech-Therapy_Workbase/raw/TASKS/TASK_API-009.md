---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Route Handler] API-009: /api/audio/stream Edge Runtime — D7 보류"
labels: 'phase:p2, mode:hold, domain:api, epic:f9-b'
assignees: ''
---

## 🎯 Summary
- **Task ID**: API-009
- **Epic / Story**: F9-b Zero-touch 화자분리 / S5 (오디오 스트림 프록시)
- **Phase**: 🔴 P2
- **Mode**: ❌ 보류 (Hold) — D7 적용
- **Discope 적용**: D7 (Edge Runtime 오디오 프록시 → 클라이언트 직접 STT)
- **목적**: SRS는 Vercel Edge Runtime에서 16kHz 오디오 스트림을 STT 엔진으로 프록시하지만, D7 적용으로 본 라우트 자체를 미생성. P2 Zero-touch 도입 시 부활 검토.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.5 API Overview — `app/api/audio/stream` (Edge Runtime)
  - REQ-FUNC-051 (Web Worker VAD ≤ 300ms 청크 전송)
  - R7 (Vercel Timeout 대응)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-2 API-009 (보류)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §1.2 [추가 D7]

## ✅ Task Breakdown (보류 상태)
- [ ] **본 태스크는 D7 적용으로 P2엔 미구현**
- [ ] D7 적용 사유:
  - Vercel Edge Runtime은 Node.js와 다른 제약 (일부 Node API 미지원, Web Streams 직접 처리)
  - 1인 입문자가 디버깅하기 매우 어려움
  - 클라이언트 측 직접 STT 호출이 더 단순 + 안정적
- [ ] **클라이언트 측 직접 STT 흐름 사용 (D7 대체)**:
  - Web Speech API (Sprint 1) → Whisper API 클라이언트 직접 호출 (P0 1개월차)
  - Zero-touch 시나리오에서도 교실 태블릿 PWA가 직접 Whisper 호출
- [ ] **부활 조건 (P2 Zero-touch 본격 도입 시)**:
  - Zero-touch가 1인 운영 부담 증가하는 경우
  - 또는 클라이언트 측 STT 비용·정확도 한계 발생 시
  - 부활 시 별도 INFRA-004 통합 (Edge Runtime 활성화 함께)

## 🧪 Acceptance Criteria (보류)
**Scenario 1: 보류 상태 명시**
- **Given**: 코드 검사
- **When**: `app/api/audio/stream` 검색
- **Then**: 라우트 미존재 (Hold)

**Scenario 2: 클라이언트 측 STT 동작 (D7 대체 검증)**
- **Given**: FR-C-001 또는 FR-C-015 (Zero-touch P2)
- **When**: 발화 처리
- **Then**: 클라이언트가 Web Speech 또는 Whisper API 직접 호출, Edge Runtime 경유 0회

**Scenario 3: D7 적용 README 명시**
- **Given**: docs 검사
- **When**: 검색
- **Then**: D7 적용 사유 + 부활 조건 명시

## ⚙️ Technical & Non-Functional Constraints
- **D7 적용**: Edge Runtime 미사용
- **R7 대응**: 클라이언트 직접 STT로 Vercel Timeout 회피
- **횡단 제약**: 해당 없음 (보류)
- **부활 시점**: P2 Zero-touch 본격 도입 + 운영 부담 증가 시

## 🏁 Definition of Done (보류)
- [ ] 본 태스크가 Hold 상태임을 README에 명시
- [ ] D7 적용 사유 + 부활 조건 명문화
- [ ] FR-C-015 (Zero-touch)도 Edge Runtime 미의존하도록 검증
- [ ] PR 본문에 R7 + D7 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: 부활 시 — INFRA-004 활성화, FR-C-015 Zero-touch 본격 구현
- **Blocks**: 없음 (보류 상태)
- **Discope 영향**: D7 — Edge Runtime 미생성. P2 Zero-touch 본격 도입 시 부활 검토
