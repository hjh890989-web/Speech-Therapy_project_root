---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Ops] OPS-004: /privacy + /terms placeholder → 정식 처리방침 + 이용약관 교체"
labels: 'phase:p1, mode:external, domain:ops, epic:legal-content, sprint:user-pending'
assignees: ''
---

## 🎯 Summary
- **Task ID**: OPS-004
- **Epic / Story**: `/privacy` + `/terms` 정식 교체 (V07 OPS, OPS-002 변호사 결과 반영)
- **Phase**: 🟡 **변호사 자문 후 활성** (OPS-002 의 결과 반영)
- **Mode**: 명세대로 (변호사 자문 결과 적용)
- **Discope 적용**: 해당 없음
- **목적**: SEC-008 의 footer 가 가리키는 `/privacy` (PIPA §30 9 섹션) + `/terms` (약관규제법 §3 8 조) placeholder 를 변호사 자문 결과 (OPS-002) 의 정식 안으로 교체. 정식 출시 직전의 최종 컴플라이언스 작업. §12.11 출시 체크리스트의 마지막 코드 항목.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.5 `/privacy` + `/terms` 정식 안
  - §12.11 출시 체크리스트
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §4-D OPS-004
- **선행 task**: OPS-002 (변호사 자문 결과 — 정식 안 작성)
- **코드 산출물 현황**:
  - `app/(public)/privacy/page.tsx` (placeholder, `f976388`)
  - `app/(public)/terms/page.tsx` (placeholder, `f976388`)
- **PIPA §30 9 섹션 기준**:
  - 처리 목적 / 처리 항목 / 처리 기간 / 제3자 제공 / 위탁 / 국외 이전 / 권리 / 안전성 조치 / 문의처

## ✅ Task Breakdown
- [ ] (선행 게이트) OPS-002 변호사 자문 결과 수령 + 정식 안 (5 항목 (a)~(e)) 확보
- [ ] `app/(public)/privacy/page.tsx` 정식 콘텐츠 교체 — PIPA §30 9 섹션 완전 채움
- [ ] `app/(public)/terms/page.tsx` 정식 콘텐츠 교체 — 약관규제법 §3 8 조 완전 채움
- [ ] 정식 콘텐츠는 MDX 또는 RSC 형식 — 유지보수 용이성
- [ ] 버전 관리 — `effectiveDate` + `version` 메타데이터 표시
- [ ] 변경 시 user notification (이메일 옵트인) — Resend 발송 helper
- [ ] `/settings/privacy-consent` 의 PIPA 동의 카피도 정식 안 반영 (SEC-005/006 의 카피 정정)
- [ ] CON-04 금칙어 자동 검증 (TEST-016 의 정규식 무위반)
- [ ] §12.11 출시 체크리스트 의 "정식 약관 + 처리방침 게시" 항목 충족 확정

## 🧪 Acceptance Criteria
**Scenario 1: 선행 게이트 (OPS-002 결과 기반)**
- **Given**: OPS-002 변호사 자문 결과서
- **When**: 정식 안 (a~e 5 항목) 검토
- **Then**: `/privacy` + `/terms` 정식 콘텐츠 확정 + 본 task 활성

**Scenario 2: PIPA §30 9 섹션 완전성**
- **Given**: `/privacy` 정식 페이지 렌더링
- **When**: 자동 검사 (9 섹션 헤더 정규식)
- **Then**: 9 섹션 (처리 목적 ~ 문의처) 모두 존재

**Scenario 3: 약관 §3 8 조 완전성**
- **Given**: `/terms` 정식 페이지 렌더링
- **When**: 자동 검사
- **Then**: 8 조 (목적 ~ 분쟁 해결) 모두 존재

**Scenario 4: 변경 시 user notification**
- **Given**: 약관 / 처리방침 v1 → v2 변경
- **When**: 코드 배포 + `notifyPolicyChange()` helper 호출
- **Then**: 옵트인 user 에게 Resend 이메일 발송 + audit_log INSERT

**Scenario 5: CON-04 금칙어 무위반 (TEST-016)**
- **Given**: 정식 콘텐츠 배포
- **When**: e2e 정규식 검사 (`/(치료|진단|장애)/`)
- **Then**: 매치 0건

**Scenario 6: 버전 관리 표시**
- **Given**: `/privacy` 또는 `/terms` 페이지 진입
- **When**: 상단 메타데이터 영역 확인
- **Then**: `시행일: YYYY-MM-DD` + `version: vN` 표시 + 변경 이력 링크 (옵션)

## ⚙️ Technical & Non-Functional Constraints
- **§12.11 출시 체크리스트**: "정식 약관 + 처리방침 게시" — 본 task 의 핵심
- **법적 risk**: placeholder 로 정식 출시 = 약관규제법 + PIPA 위반 risk
- **횡단 제약**:
  - [ ] CON-04 금칙어: 정식 콘텐츠도 `치료/진단/장애` 무사용 (TEST-016)
  - [ ] R4 개인정보: 처리방침의 처리 항목에 영유아 음성 명시 (PIPA §30)
  - [ ] CON-05 5중 가드: 처리방침이 5중 가드 정신과 정합
- **버전 관리**: `version` + `effectiveDate` 메타데이터 — 향후 v2/v3 변경 추적
- **부활 조건**: OPS-002 변호사 결과 수령 시점 = 본 task list 활성

## 🏁 Definition of Done
- [ ] OPS-002 변호사 정식 안 (5 항목) 수령
- [ ] `app/(public)/privacy/page.tsx` 정식 콘텐츠 교체 + 9 섹션 검증
- [ ] `app/(public)/terms/page.tsx` 정식 콘텐츠 교체 + 8 조 검증
- [ ] `version` + `effectiveDate` 메타데이터 표시
- [ ] CON-04 금칙어 0건 (TEST-016)
- [ ] `notifyPolicyChange` helper + 옵트인 user 이메일 검증
- [ ] §12.11 출시 체크리스트 "정식 약관 + 처리방침" 항목 충족
- [ ] PR 본문에 OPS-002 자문 결과 + §12.5 + §12.11 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: OPS-002 (변호사 자문 결과 = 정식 안 입력), FR-Q-018 (`/privacy` + `/terms` placeholder), SEC-005~009 (5중 가드 카피 정합), TEST-016 (CON-04 검증)
- **Blocks**: 정식 출시, §12.11 출시 체크리스트 100% 충족
- **Discope 영향**: 해당 없음 (변호사 자문 결과 의존)
