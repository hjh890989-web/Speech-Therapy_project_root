---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[INFRA] INFRA-004: Edge Runtime 오디오 스트림 라우트 — D7 보류"
labels: 'phase:p2, mode:hold, domain:infra, epic:f9-b'
assignees: ''
---

## 🎯 Summary
- **Task ID**: INFRA-004
- **Epic / Story**: F9-b Zero-touch 인프라 / S5
- **Phase**: 🔴 P2
- **Mode**: ❌ 보류 (Hold) — D7 적용
- **Discope 적용**: D7 (Edge Runtime 오디오 프록시 → 클라이언트 직접 STT)
- **목적**: SRS의 Vercel Edge Runtime 16kHz 오디오 스트림 프록시 인프라이지만, D7 적용으로 미구축. 클라이언트 측 직접 STT 호출로 대체. P2 Zero-touch 부활 시 함께 활성화 검토.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.2 Component Diagram — Edge Runtime (Audio Stream Proxy)
  - REQ-FUNC-051 (VAD 청크 ≤ 300ms)
  - R7 (Vercel Timeout 대응)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-7 INFRA-004 (보류)
- **검토 보고서**: §1.2 [추가 D7]

## ✅ Task Breakdown (보류 상태)
- [ ] **본 태스크는 D7 적용으로 P2엔 미구축**
- [ ] D7 적용 사유:
  - Vercel Edge Runtime은 Node.js와 다른 제약
  - Web Streams 직접 처리 + 일부 Node API 미지원 → 입문자 디버깅 매우 어려움
  - 클라이언트 측 직접 STT 호출이 더 단순 + 안정적
- [ ] **클라이언트 측 직접 STT 흐름 (D7 대체)**:
  - Web Speech API (Sprint 1)
  - Whisper API 클라이언트 직접 호출 (P0 1개월차)
  - Zero-touch 시나리오에서도 교실 태블릿 PWA가 직접 Whisper 호출
- [ ] **부활 조건**:
  - P2 Zero-touch 본격 도입 (FR-C-015) 시
  - 클라이언트 측 STT 비용·정확도 한계 발생 시
  - 부활 시 다음 작업:
    1. `app/api/audio/stream/route.ts` 생성 + `runtime: 'edge'` 명시
    2. Web Streams 처리 (chunk 16kHz)
    3. STT 엔진(Whisper API) 프록시
    4. 인증 (CRON_SECRET 또는 사용자 토큰)
    5. 처리 시간 ≤ 300ms (REQ-FUNC-051)
- [ ] **운영 매뉴얼 (부활 시 사용)**:
  - Vercel Edge Runtime 디버깅 절차
  - Web Streams 일반 패턴
  - 부하 테스트 (PERF-001과 통합)

## 🧪 Acceptance Criteria (보류)
**Scenario 1: 보류 상태 명시**
- **Given**: 코드 검사
- **When**: `app/api/audio/stream` 또는 Edge Runtime 검색
- **Then**: 미존재 (Hold)

**Scenario 2: 클라이언트 측 STT 동작 (D7 대체)**
- **Given**: FR-C-001 또는 FR-C-015 (Zero-touch P2)
- **When**: 발화 처리
- **Then**: Edge Runtime 경유 0회

**Scenario 3: 부활 조건 README 명시**
- **Given**: docs 검사
- **When**: 검색
- **Then**: D7 적용 사유 + 부활 절차 명시

## ⚙️ Technical & Non-Functional Constraints
- **D7 적용**: Edge Runtime 미구축
- **R7 대응**: 클라이언트 직접 STT로 Vercel Timeout 회피
- **횡단 제약**: 해당 없음 (보류)
- **부활 시점**: P2 Zero-touch 본격 도입 시

## 🏁 Definition of Done (보류)
- [ ] 본 태스크가 Hold 상태임을 README에 명시
- [ ] D7 적용 사유 + 부활 조건 명문화
- [ ] 부활 시 작업 5단계 가이드 작성
- [ ] PR 본문에 REQ-FUNC-051 + R7 + D7 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: 부활 시 — FR-C-015 (Zero-touch), API-009 (audio stream 라우트)
- **Blocks**: 없음 (보류)
- **Discope 영향**: D7 — Edge Runtime 미사용. P2 Zero-touch 부활 시 함께 활성화
