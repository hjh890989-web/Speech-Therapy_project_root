---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[INFRA] INFRA-003: PWA 매니페스트 + 홈화면 설치 (D5/67-D2 단순화)"
labels: 'phase:p1, mode:active, domain:infra, epic:foundation'
assignees: ''
---

## 🎯 Summary
- **Task ID**: INFRA-003
- **Epic / Story**: Foundation 모바일 인프라
- **Phase**: 🟡 P1
- **Mode**: 단순화 (D5 + 67-D2 적용)
- **Discope 적용**: D5 (Service Worker 오프라인 캐시 미구축), 67-D2 (Capacitor 앱스토어 P1 후반으로 디퍼)
- **목적**: P1 단계엔 **PWA Manifest + 홈화면 설치 유도 + 기본 Service Worker(precache만)**까지만 구축. 오프라인 IndexedDB·Background Sync는 D5로 보류, Capacitor 네이티브 래핑은 67-D2로 P1 후반에 검토.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - §3.4 Client Apps (PWA Service Worker + Manifest, Capacitor)
  - REQ-FUNC-020 (오프라인 소급 보상 — D5 보류)
  - REQ-NF-003 (PWA Cold Start ≤ 1.5초)
- **Task 강화판**: §3-7 INFRA-003 (단순화)
- **검토 보고서**: §1.1 67-D2, §1.2 [추가 D5]

## ✅ Task Breakdown
- [ ] `public/manifest.json` 작성:
  - `name`, `short_name`, `description`
  - `icons`: 192x192, 512x512 (maskable 옵션)
  - `theme_color`, `background_color`
  - `display: 'standalone'`
  - `start_url: '/'`
- [ ] `app/layout.tsx`에 manifest 링크: `<link rel="manifest" href="/manifest.json" />`
- [ ] 메타 태그: viewport, apple-touch-icon, theme-color
- [ ] **단순 Service Worker** (`public/sw.js`):
  - precache: 정적 자산만 (`/`, manifest, icons)
  - 오프라인 캐시 전략: 네트워크 우선, 실패 시 cached fallback (정적 자산만)
  - **IndexedDB / Background Sync 미구현 (D5)**
- [ ] `app/providers/sw-register.tsx` Client Component:
  - `navigator.serviceWorker.register('/sw.js')` 등록
  - 업데이트 감지 시 사용자에게 새로고침 안내 Toast
- [ ] 홈화면 설치 유도:
  - `beforeinstallprompt` 이벤트 캡처
  - "설치하기" 버튼 노출 (사용자가 미설치 시)
  - 설치 거부 시 24h 동안 안 보이게 localStorage flag
- [ ] **Capacitor는 본 태스크에서 미구축 (67-D2)**:
  - P1 후반 EXP-2 통과 시 도입 검토
  - 도입 시 별도 INFRA 태스크 신설 필요
- [ ] Lighthouse PWA 점수 ≥ 90 목표

## 🧪 Acceptance Criteria
**Scenario 1: Manifest 인식**
- **Given**: 페이지 진입
- **When**: Chrome DevTools Application 탭
- **Then**: Manifest 정상 인식, 설치 가능 표시

**Scenario 2: Service Worker 활성**
- **Given**: 첫 방문
- **When**: 페이지 로드
- **Then**: SW 등록 성공, console에 "SW activated" 로그

**Scenario 3: 정적 자산 오프라인 캐시**
- **Given**: SW 활성 후 오프라인 전환
- **When**: 페이지 새로고침
- **Then**: 정적 자산은 캐시에서 로드, 동적 데이터는 에러 표시 (D5)

**Scenario 4: 홈화면 설치 유도**
- **Given**: Android Chrome 첫 방문
- **When**: 5분 체류 후
- **Then**: "설치하기" 배너 노출

**Scenario 5: D5 — IndexedDB 미사용 명시**
- **Given**: 코드 검사
- **When**: IndexedDB API 검색
- **Then**: 사용 0건 (Sprint 1 정책)

**Scenario 6: Lighthouse PWA**
- **Given**: Vercel Production 배포
- **When**: Lighthouse 모바일 측정
- **Then**: PWA 카테고리 ≥ 90

**Scenario 7: 67-D2 — Capacitor 미구축**
- **Given**: package.json
- **When**: `@capacitor/*` 검색
- **Then**: 의존성 0건

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-003**: PWA Cold Start ≤ 1.5초 (Service Worker precache로 보장)
- **D5 적용**: IndexedDB + Background Sync 미사용
- **67-D2 적용**: Capacitor 앱스토어 미배포
- **횡단 제약**:
  - [ ] iOS Safari 호환성 — Manifest는 동작, beforeinstallprompt는 미지원 (안내만 가능)
  - [ ] 보안 — manifest.json 정적, 사용자 정보 미포함

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Lighthouse PWA ≥ 90
- [ ] iOS Safari + Android Chrome 양쪽 설치 검증
- [ ] `tsc --strict` 0 errors
- [ ] D5 + 67-D2 적용 사유 README 명시
- [ ] PR 본문에 §3.4 + REQ-NF-003 + D5 + 67-D2 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: INFRA-001 (Vercel 배포)
- **Blocks**: PERF-002 (Cold Start 측정)
- **Discope 영향**: D5 (IndexedDB·Background Sync 미사용), 67-D2 (Capacitor P1 후반)
