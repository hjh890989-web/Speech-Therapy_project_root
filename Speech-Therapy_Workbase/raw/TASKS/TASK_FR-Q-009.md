---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-009: 원장 Route Group 대시보드 — 반/원아 단위 스크리닝"
labels: 'phase:p2, mode:active, domain:fr-q, epic:f9-a'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-009
- **Epic / Story**: F9-a 원장 대시보드 / S4
- **Phase**: 🔴 P2
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: 어린이집/유치원 원장이 자신의 기관 내 반·원아 단위로 발음 발달 현황을 한눈에 조회. B2B 핵심 도구 + 학부모 민원 방어 무기. Seg D-1(원장)의 결제 의사 결정 트리거.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-046 (Route Group `/(dashboard)` 반/원아 단위)
  - REQ-NF-004 (RSC p95 ≤ 3,000ms)
- **Task 강화판**: [`./03_Tasks_Breakdown_SRS_reinforce.md`](./03_Tasks_Breakdown_SRS_reinforce.md) §3-4 FR-Q-009

## ✅ Task Breakdown
- [ ] `app/(dashboard)/institution/[institutionId]/page.tsx` Route Group 페이지
- [ ] 인증 가드 (Middleware): principal 또는 admin 역할만, 본인 institutionId만 허용
- [ ] 서버에서 병렬 조회 (Promise.all):
  - `prisma.class.findMany({where: {institutionId}, include: {users: true}})`
  - 각 반의 자녀들 evaluation_results 최근 1주
- [ ] 대시보드 구성:
  - 1. 통계 카드 (4개): 총 원아 수 / 활성 사용자 / 평균 백분위 / 발달 우려 원아 수
  - 2. 반별 그리드 (shadcn/ui Card):
    - 반 이름 + 원아 수
    - 반 평균 백분위 게이지
    - 클릭 시 반 상세 페이지로 이동
  - 3. 발달 우려 원아 리스트 (peerPercentile < 30 + 최근 1주):
    - 자녀 닉네임 (본명 미표시 — R4)
    - 월령
    - 백분위 + 추세 화살표
    - 학부모에게 안내 메시지 자동 생성 (D8 클립보드)
- [ ] 반 상세 페이지 (`/institution/[id]/class/[classId]`):
  - 원아 리스트 + 개별 백분위
  - 주간 추이 그래프 (반 평균)
- [ ] 데이터 부족 분기 (FR-Q-006 재사용):
  - "이번 주 데이터가 충분하지 않아요"
- [ ] Disclaimer 3곳 노출 (CON-04):
  - "본 결과는 의료적 판단이 아닌 발달 참고 자료입니다."
- [ ] 권장: 학부모 동의서 미체결 원아는 "동의 필요" 표시 (FR-C-018 연결)

## 🧪 Acceptance Criteria
**Scenario 1: 원장 본인 기관 조회 (REQ-FUNC-046)**
- **Given**: principal X (institutionId: A)
- **When**: GET `/(dashboard)/institution/A`
- **Then**: 기관 A의 반·원아 표시, RSC LCP ≤ 3,000ms

**Scenario 2: 다른 기관 차단 (RLS + Middleware)**
- **Given**: principal X (institutionId: A)
- **When**: GET `/(dashboard)/institution/B`
- **Then**: 403 또는 `/dashboard/institution/A` 리다이렉트

**Scenario 3: parent 차단**
- **Given**: parent 역할
- **When**: 진입 시도
- **Then**: 403

**Scenario 4: 발달 우려 원아 리스트**
- **Given**: 30명 중 5명 백분위 < 30
- **When**: 페이지 렌더
- **Then**: 5명 리스트 노출 (닉네임 + 월령 + 백분위)

**Scenario 5: 자녀 본명 미표시 (R4)**
- **Given**: 페이지 텍스트 검사
- **When**: 정규식 (이름 패턴)
- **Then**: 본명 0건 (닉네임만)

**Scenario 6: Disclaimer 3중 노출**
- **Given**: 페이지 렌더
- **When**: DOM 검색
- **Then**: `[data-testid="disclaimer"]` ≥ 3개

**Scenario 7: 동의 미체결 표시**
- **Given**: consent_signatures status='pending' 자녀
- **When**: 리스트 렌더
- **Then**: 해당 자녀에 "동의 필요" 배지

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-046**: Route Group + 반/원아 그룹화
- **REQ-NF-004**: RSC LCP ≤ 3,000ms
- **횡단 제약**:
  - [ ] **R4 핵심**: 자녀 본명 미표시 (childNickname만)
  - [ ] **R3**: 원장이 원하는 정보를 1화면에 (교사 추가 업무 0)
  - [ ] CON-04 — Disclaimer 3중 노출
  - [ ] RLS — 본인 기관만 조회

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Lighthouse 데스크톱 Performance ≥ 80 (원장은 PC 사용 가정)
- [ ] `tsc --strict` 0 errors
- [ ] R4 검증 — 본명 노출 0건
- [ ] PR 본문에 REQ-FUNC-046 + REQ-NF-004 + R4 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-003 (institutions + classes), DB-005 (evaluation_results), DB-007 (weekly_reports), API-010 (인증), DB-011 (RLS)
- **Blocks**: FR-Q-010 (헤더 커스텀), FR-Q-011 (ROI), FR-C-016 (원아 등록)
- **Discope 영향**: 해당 없음
