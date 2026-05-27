---
name: Feature Task
about: SRS V07 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-018: 정책 페이지 placeholder (/privacy PIPA §30 9 섹션 + /terms 약관규제법 §3 8 조)"
labels: 'phase:p0, mode:active, domain:fr-q, epic:legal, sprint:done'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-018
- **Epic / Story**: Legal placeholder (V07 신규 — 변호사 자문 의뢰 전 골격)
- **Phase**: 🟢 P0 → ✅ Done (placeholder, `f976388`)
- **Mode**: 명세대로 (placeholder — 정식 교체는 OPS-004)
- **Discope 적용**: 해당 없음
- **목적**: PIPA §30 (개인정보 처리방침 공개) + 약관규제법 §3 (이용약관 명시) 의 법적 의무 1차 충족용 placeholder. `MedicalDisclaimerFooter` (전역) 의 `/privacy` + `/terms` 링크 destination. 변호사 자문 (Grill #3A C1, 30~50만/2~4주) 후 OPS-004 에서 정식 교체 예정.

## 🔗 References
- **SRS V07**: [`../docs/65_SRS_V07_Merged_Master_Final.md`](../docs/65_SRS_V07_Merged_Master_Final.md)
  - §12.5 처리방침 + 이용약관 (placeholder)
  - §12.7 의료기기법 disclaimer 분류
  - REQ-NF-028 (의료기기법 disclaimer 전역 footer)
  - PIPA §30 (9 섹션) / 약관규제법 §3 (8 조)
- **Task 강화판**: [`./10_Task_Breakdown_SRS_V07.md`](10_Task_Breakdown_SRS_V07.md) §2-A FR-Q-018

## ✅ Task Breakdown
- [x] `app/(public)/privacy/page.tsx` — **PIPA §30 9 섹션 골격**:
  1. 수집 항목 (email / childAgeMonths / transcript)
  2. 처리 목적 (발음 발달 확인)
  3. 만 14세 미만 부모 대리 동의 (PIPA §22-6)
  4. 보유 기간 (transcript 7일, audit_log 1년+)
  5. 처리위탁 (Supabase / Vercel)
  6. 국외 이전 (STT Google US / Gemini US — PIPA §17)
  7. 정보주체 권리 (조회 / 정정 / 삭제 / 처리정지)
  8. 개인정보 책임자 (연락처 TBD)
  9. 변경 이력
- [x] `app/(public)/terms/page.tsx` — **약관규제법 §3 8 조 골격**:
  1. 목적
  2. **비의료기기 정의** (REQ-NF-028 + ADR-04)
  3. 14세 미만 동의
  4. 국외 이전
  5. 회원 의무
  6. 서비스 중단
  7. 책임 한계
  8. 약관 변경
- [x] 두 페이지 모두 `ConsentRedirectGate` 제외 (공공 정책 문서)
- [x] `MedicalDisclaimerFooter` 가 두 페이지 링크 — 모든 페이지에서 접근 가능
- [x] 본문 상단 "본 페이지는 변호사 자문 전 placeholder 입니다" 명시 (변호사 자문 후 OPS-004 정식 교체)

## 🧪 Acceptance Criteria
**Scenario 1: `/privacy` 9 섹션 모두 렌더 (PIPA §30)**
- **Given**: 익명 또는 인증 user
- **When**: `/privacy` 진입
- **Then**: 9 섹션 헤딩 모두 표시 + 본문 골격 + placeholder 안내

**Scenario 2: `/terms` 8 조 모두 렌더 (약관규제법 §3)**
- **Given**: 익명 또는 인증 user
- **When**: `/terms` 진입
- **Then**: 8 조 헤딩 모두 표시 + 비의료기기 정의 명시

**Scenario 3: MedicalDisclaimerFooter 링크 동작 (REQ-NF-028)**
- **Given**: 임의 페이지 진입
- **When**: footer 의 `/privacy` 또는 `/terms` 링크 클릭
- **Then**: 정상 redirect + ConsentRedirectGate 우회

**Scenario 4: CON-04 금칙어 무위반**
- **Given**: 두 페이지 본문
- **When**: pre-commit + ESLint 금칙어 스캔
- **Then**: "치료" / "진단" / "장애" / "환자" / "병" / "증상" / "처방" / "병원" 0건

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-028**: `/privacy` + `/terms` 가 `MedicalDisclaimerFooter` 의 destination — 전역 접근성 보장
- **PIPA §30**: 처리방침 공개 의무 — 9 섹션 골격 1차 충족
- **약관규제법 §3**: 이용약관 명시 의무 — 8 조 골격 1차 충족
- **횡단 제약**:
  - [x] CON-04 금칙어: 두 페이지 본문 무위반
  - [x] R4 개인정보: 본문에 실제 user PII 노출 없음 (정책 텍스트만)
  - [x] R7 PIPA 위반: placeholder 명시 + OPS-004 정식 교체 ticket 연결

## 🏁 Definition of Done
- [x] `/privacy` 9 섹션 + `/terms` 8 조 모두 렌더
- [x] CON-04 무위반 (pre-commit + ESLint + TEST-016)
- [x] `MedicalDisclaimerFooter` 링크 동작
- [x] `tsc --strict` 0 errors
- [x] `f976388` commit 매핑 + OPS-004 정식 교체 ticket 연결
- [x] 본문 상단 "변호사 자문 전 placeholder" 명시

## 🚧 Dependencies & Blockers
- **Depends on**: SEC-008 (`MedicalDisclaimerFooter` 전역 footer)
- **Blocks**: OPS-004 (변호사 자문 후 정식 교체), SEC-008 (footer 의 링크 destination 필요)
- **Discope 영향**: 해당 없음 (placeholder — 외부 의존 = 변호사 자문 4주 + 30~50만)
