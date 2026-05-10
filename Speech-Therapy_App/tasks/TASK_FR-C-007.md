---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-C] FR-C-007: PWA Service Worker + IndexedDB 소급 보상 — Replace 단순 에러 토스트 (D5)"
labels: 'phase:p1, mode:replace, domain:fr-c, epic:f3-a'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-C-007
- **Epic / Story**: F3-a 미션 / S2 (오프라인 회복)
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace (D5 적용)
- **Discope 적용**: D5 (PWA 오프라인 소급 보상 → 단순 에러 토스트 + 재시도 버튼)
- **목적**: SRS는 Service Worker IndexedDB 캐시 + Background Sync로 오프라인 미션 결과를 자동 동기화하지만, D5 적용으로 P1엔 **단순 에러 토스트 + 수동 재시도 버튼**으로 단순화. iOS Safari Background Sync 미지원 함정 회피 + 1인 디버깅 부담 최소화.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-020 (네트워크 단절 시 Service Worker 캐시 + 소급 보상)
  - §6.3.1 시퀀스 — 보상 소급 플로우
- **Task 강화판**: §3-5 FR-C-007 (Replace)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §1.2 [추가 D5]

## ✅ Task Breakdown
- [ ] **D5 적용 — Service Worker IndexedDB 캐시는 P1에선 미구축**
- [ ] 단순 대체:
  - Server Action 호출 실패 (network error) → shadcn/ui Toast로 즉시 안내
  - "인터넷 연결을 확인하고 다시 시도해주세요" 메시지
  - "재시도" 버튼 (Toast Action 또는 페이지 내)
- [ ] `lib/hooks/useNetworkAware.ts`:
  - `navigator.onLine` 이벤트 구독 (online/offline)
  - 오프라인 상태 시 미션 시작 버튼 비활성 + "오프라인 상태입니다" 표시
- [ ] FR-Q-003 미션 페이지에 통합:
  - Server Action 실패 → 1회 자동 재시도 후 Toast
  - 5회 연속 실패 시 Sentry 또는 Vercel Analytics에 보고
- [ ] **PWA 기본 셸 (Manifest + 홈화면 설치)는 INFRA-003에서 처리** — 본 태스크는 보상 소급만 단순화
- [ ] Vercel Analytics 이벤트:
  - `network_error_during_mission`
  - `manual_retry_clicked`
- [ ] P1 후반 EXP-2 검증 후 본격 도입 검토 README 명시

## 🧪 Acceptance Criteria
**Scenario 1: 네트워크 단절 → 에러 토스트 (D5 핵심)**
- **Given**: 미션 완료 + 서버 호출 실패
- **When**: Server Action throw
- **Then**: shadcn/ui Toast "인터넷 연결을 확인하고 다시 시도해주세요" + 재시도 버튼

**Scenario 2: 오프라인 진입 시 미션 시작 차단**
- **Given**: navigator.onLine: false
- **When**: 미션 페이지 진입
- **Then**: "오프라인 상태입니다" 배너 + 시작 버튼 disabled

**Scenario 3: 재시도 1회 자동**
- **Given**: 첫 호출 실패 (network)
- **When**: 1초 후 재시도
- **Then**: 두 번째 호출 시도, 실패 시 Toast

**Scenario 4: 온라인 복구 자동 감지**
- **Given**: 오프라인 상태에서 온라인 전환
- **When**: navigator.onLine 'online' 이벤트
- **Then**: 미션 시작 버튼 자동 활성화 + "다시 연결되었어요" 알림

**Scenario 5: Sentry/Analytics 보고**
- **Given**: 5회 연속 네트워크 실패
- **When**: 누적 카운터
- **Then**: 1회 보고 (사용자 환경 디버깅용)

**Scenario 6: 소급 보상 미적용 명시 (D5)**
- **Given**: 오프라인 중 미션 완료 시도
- **When**: 사용자 동작
- **Then**: "오프라인에서는 미션을 진행할 수 없어요. 연결 후 다시 시도해주세요" — 자동 큐잉 안 함

## ⚙️ Technical & Non-Functional Constraints
- **D5 적용**: Service Worker IndexedDB 미사용 → 단순 toast + 재시도
- **횡단 제약**:
  - [ ] **iOS Safari Background Sync 미지원 회피**: 자동 큐잉 의도적 미구현
  - [ ] R8 보호 — 오프라인 동안 IndexedDB 누적 안 됨 → 데이터 무결성 단순화
- **사용자 경험**: 명확한 안내 메시지 (이슈 회피, 노력 인지)
- **승격 시점**: M3 리텐션 측정 후 EXP-2 단계에서 본격 도입 검토

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] online/offline 이벤트 동작 검증
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] D5 적용 사유 README 명시
- [ ] Vercel Analytics 2종 이벤트 등록
- [ ] PR 본문에 REQ-FUNC-020 + D5 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-003 (미션 페이지), INFRA-005 (Analytics)
- **Blocks**: TEST-008 (D5 적용으로 본 태스크 테스트도 ❌ 보류)
- **Discope 영향**: D5 — Service Worker IndexedDB + Background Sync 미적용. P1 후반 EXP-2 통과 시 본격 도입 검토
