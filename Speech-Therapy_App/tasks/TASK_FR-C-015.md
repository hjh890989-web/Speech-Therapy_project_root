---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-015: Zero-touch 교실 태블릿 PWA + Web Worker VAD — 67-D3 보류"
labels: 'phase:p2, mode:hold, domain:fr-c, epic:f9-b'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-015
- **Epic / Story**: F9-b Zero-touch 화자분리 수집 / S5
- **Phase**: 🔴 P2
- **Mode**: ❌ 보류 (Hold) — 67-D3 적용
- **Discope 적용**: 67-D3 (Phase 2 Zero-touch 전면 보류)
- **목적**: SRS의 핵심 차별화 기능 중 하나(교실 태블릿 PWA + Web Worker VAD + Edge Runtime 청크 전송)이지만 67번 보고서 권고대로 **B2B PoC 5건 이후로 디퍼**. 1인 입문자가 1개월 내 디버깅 가능한 범위 초과.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-049 (교실 태블릿 PWA + Web Worker VAD, 조작 0회)
  - REQ-FUNC-050 (화자분리 정확도 ≥ 85%)
  - REQ-FUNC-051 (Web Worker VAD 청크 ≤ 300ms)
  - REQ-FUNC-052 (마이크 고장 감지)
  - REQ-FUNC-053 (7일 폐기 Cron 실패 → 재시도 3회)
  - §6.3.2 시퀀스 다이어그램 (Zero-touch + Edge Runtime)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-5 FR-C-015 (보류)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §1.1 67-D3

## ✅ Task Breakdown (보류 상태)
- [ ] **본 태스크는 67-D3 적용으로 P2엔 미구현**
- [ ] 67-D3 적용 사유:
  - Web Worker 백그라운드 VAD는 브라우저 탭 throttling 등 변수가 너무 많음
  - 1인 입문자가 AI 도움만으로 디버깅 1개월 내 불가능
  - 화자 분리 정확도 ≥ 85% 달성은 별도 음성 처리 전문성 필요
  - Edge Runtime 의존 (D7 보류와 연동)
- [ ] **부활 조건 (B2B PoC 5건 이후)**:
  - B2B 5건 이상 LOI 확보 + 실제 운영 데이터 누적
  - 또는 클라이언트 측 단순 녹음 후 일괄 STT 처리로 단순화 가능 시
  - 부활 시 별도 INFRA-004 (Edge Runtime), API-009 (오디오 스트림) 함께 활성
- [ ] **B2B 진입 시 Zero-touch 대체 방식**:
  - 교사가 "수업 시작" 버튼 1회 클릭 → 5분 자동 녹음 (D8 정신 부분 적용)
  - 종료 후 일괄 STT (Whisper API) → 화자분리는 후처리
  - 이는 "교사 능동 조작 평균 0회"를 위반하나 PoC 단계엔 허용

## 🧪 Acceptance Criteria (보류)
**Scenario 1: 보류 상태 명시**
- **Given**: 코드 검사
- **When**: Web Worker VAD 검색
- **Then**: 의존성 0건 (Hold)

**Scenario 2: 67-D3 적용 README 명시**
- **Given**: docs 검사
- **When**: 검색
- **Then**: 67-D3 적용 사유 + B2B 5건 부활 조건 명시

**Scenario 3: 대체 방식 명세 (수동 1클릭)**
- **Given**: B2B 도입 기관
- **When**: 운영 매뉴얼 검사
- **Then**: 교사 1클릭 녹음 → 일괄 STT 흐름 명시

## ⚙️ Technical & Non-Functional Constraints
- **67-D3 적용**: Phase 2 Zero-touch 보류
- **횡단 제약**: 해당 없음 (보류)
- **부활 시점**: B2B PoC 5건 + 운영 부담 검증 후

## 🏁 Definition of Done (보류)
- [ ] 본 태스크가 Hold 상태임을 README에 명시
- [ ] 67-D3 적용 사유 + 부활 조건 명문화
- [ ] B2B 진입 시 대체 방식 (1클릭 녹음) 운영 매뉴얼 작성
- [ ] PR 본문에 REQ-FUNC-049~053 + 67-D3 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: 부활 시 — INFRA-004 (Edge Runtime), API-009 (audio stream), DB-004 (audio_vector_uri 활용)
- **Blocks**: TEST-013 (관련 통합 테스트도 보류)
- **Discope 영향**: 67-D3 — Zero-touch 전면 보류. B2B PoC 5건 후 부활 또는 단순 대체 방식 채택
