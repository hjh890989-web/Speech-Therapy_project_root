---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-014: 카메라 거울 모드 — 입 모양 가이드 오버레이 (단순화)"
labels: 'phase:p1, mode:active, domain:fr-q, epic:f14'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-014
- **Epic / Story**: F14 거울 모드 / CJM-C
- **Phase**: 🟡 P1
- **Mode**: 단순화 (D7 의존 — Edge Runtime 보류로 단순 카메라 오버레이만)
- **Discope 적용**: D7 부분 (Edge Runtime 미사용 → WebRTC만 클라이언트 측)
- **목적**: 자녀 발음 연습 시 카메라로 자기 입 모양을 보면서 가이드 SVG와 비교. 침묵 감지(REQ-FUNC-019) 시 자동 트리거 + 부모 개입 보조.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-038 (카메라 오버레이 입 모양 가이드 비교)
- **Task 강화판**: §3-4 FR-Q-014

## ✅ Task Breakdown
- [ ] Client Component `<MirrorMode>` 생성
- [ ] WebRTC `getUserMedia({video: true, audio: false})` 카메라 접근
- [ ] `<video>` 태그 미러링 (CSS `transform: scaleX(-1)`)
- [ ] 가이드 SVG 오버레이 (음소별 입 모양):
  - /ㅅ/: 윗니·아랫니 살짝 보이기 + 입꼬리 양쪽
  - /ㅈ/: 입 약간 벌리고 혀 끝 위 잇몸
  - /ㄱ/: 입 약간 벌림 + 혀 뒤쪽 위로
  - /ㄴ/: 혀 끝 윗니 뒤
  - /ㄹ/: 혀 끝 살짝 위 + 떨림
- [ ] SVG 가이드 위치 조정: 화면 우측 상단 (영상은 중앙)
- [ ] Toggle: "내 입 모양 vs 가이드 동시" / "가이드만" / "내 영상만"
- [ ] FR-Q-003 미션 페이지에서 침묵 감지(FR-C-006) 시 자동 표시
- [ ] 카메라 권한 거부 처리:
  - shadcn/ui Dialog "카메라 권한이 필요합니다" + OS 설정 가이드
- [ ] 종료 시 stream 정리 (`track.stop()`)
- [ ] 영상 미저장 (R4 보호) — 라이브 스트림만, 녹화 안 함

## 🧪 Acceptance Criteria
**Scenario 1: 카메라 정상 표시 (REQ-FUNC-038)**
- **Given**: 카메라 권한 허용
- **When**: 거울 모드 활성
- **Then**: `<video>` 영상 + 가이드 SVG 동시 표시, 영상 좌우 반전

**Scenario 2: 음소별 가이드 SVG 분기**
- **Given**: 미션 음소 'ㅅ'
- **When**: 거울 모드 진입
- **Then**: /ㅅ/ 가이드 SVG 노출

**Scenario 3: Toggle 동작**
- **Given**: "가이드만" 선택
- **When**: 토글 클릭
- **Then**: 영상 숨김, 가이드 SVG만 표시

**Scenario 4: 권한 거부**
- **Given**: 사용자가 카메라 거부
- **When**: getUserMedia 실패
- **Then**: Dialog 안내 + OS 설정 이동 가이드

**Scenario 5: 종료 시 stream 정리 (R4)**
- **Given**: 컴포넌트 unmount
- **When**: cleanup
- **Then**: 모든 video track stop, 카메라 LED off

**Scenario 6: 영상 비저장 (R4)**
- **Given**: 거울 모드 5분 사용
- **When**: 네트워크/Storage 검사
- **Then**: 서버 전송 0건, Storage 저장 0건

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-038**: 카메라 오버레이 입 모양 비교
- **D7 의존**: Edge Runtime 오디오 프록시 미사용 → 본 태스크는 WebRTC만 클라이언트 측
- **횡단 제약**:
  - [ ] **R4 핵심**: 영상 미저장, 라이브 스트림만
  - [ ] 카메라 권한 명시 동의
  - [ ] 종료 시 cleanup 강제 (메모리 누수 방지)
- **접근성**: 음성 버전 가이드 옵션 (시각 장애 대응 — 스크린 리더로 입 모양 텍스트 설명)
- **모바일 대응**: 전면 카메라 우선 (`facingMode: 'user'`)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 5종 음소 가이드 SVG 작성 + 검수
- [ ] `tsc --strict` 0 errors
- [ ] iOS Safari + Android Chrome 양쪽 카메라 동작
- [ ] 영상 미저장 검증 (네트워크 모니터링)
- [ ] PR 본문에 REQ-FUNC-038 + R4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-003 (미션 페이지에서 트리거), FR-C-006 (침묵 감지)
- **Blocks**: 없음
- **Discope 영향**: D7 부분 — Edge Runtime 미사용. WebRTC만 클라이언트 측 활용
