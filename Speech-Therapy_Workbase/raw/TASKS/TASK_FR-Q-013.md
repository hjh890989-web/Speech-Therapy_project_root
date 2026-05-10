---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-013: 센터 오프라인 + 앱 세션 통합 타임라인"
labels: 'phase:p1, mode:active, domain:fr-q, epic:f17'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-013
- **Epic / Story**: F17 케어로그 (CJM-C 센터 대기자 / 병행자)
- **Phase**: 🟡 P1
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음
- **목적**: Seg C(센터 대기자/병행자)가 센터 오프라인 기록과 앱 세션을 한 화면 시간순으로 통합 조회. "앱+센터 함께 쓰는 부모"의 리텐션 유지(주 2회+ 기록 ≥ 40%).

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-042 (앱+센터 기록 시간순 통합)
  - REQ-FUNC-043 (주 2회+ 기록 유지율 ≥ 40%)
- **Task 강화판**: §3-4 FR-Q-013

## ✅ Task Breakdown
- [ ] `CenterRecord` 모델 추가 (DB 작업 별도 마이그레이션 — 본 태스크에 포함):
  - `id`, `userId`, `recordDate`, `centerName`, `therapistName?`, `notes`, `attachmentUri?` (사진/파일)
  - `prisma migrate dev --name add_center_records`
- [ ] `app/(dashboard)/timeline/page.tsx` Server Component:
  - 서버에서 `evaluation_results` + `center_records` 병렬 조회 (Promise.all)
  - 시간순 (createdAt / recordDate) merge sort
- [ ] Client Component `<TimelineList>`:
  - shadcn/ui Card 리스트
  - 아이콘 분기: 앱 세션 (🎤) / 센터 기록 (🏥)
  - 일자별 그룹핑 (오늘 / 어제 / 이번 주 / 지난 주)
- [ ] 센터 기록 추가 폼 (`<CenterRecordForm>`):
  - shadcn/ui Dialog
  - 입력: 날짜, 센터명, 치료사명(선택), 메모, 첨부 파일(선택)
  - Server Action `addCenterRecord` 호출
- [ ] 첨부 파일 업로드 (Supabase Storage `center-attachments` 버킷, RLS 적용)
- [ ] 빈 상태: "첫 기록을 추가해보세요" CTA
- [ ] Vercel Analytics: `center_record_added`, `timeline_viewed`

## 🧪 Acceptance Criteria
**Scenario 1: 통합 타임라인 렌더 (REQ-FUNC-042)**
- **Given**: 앱 세션 5건 + 센터 기록 3건
- **When**: 페이지 진입
- **Then**: 시간순 8개 항목 카드 노출, 아이콘 구분

**Scenario 2: 센터 기록 추가**
- **Given**: 빈 폼
- **When**: 날짜+센터명+메모 입력 + "저장" 클릭
- **Then**: DB INSERT, 타임라인 즉시 갱신

**Scenario 3: 첨부 파일 업로드**
- **Given**: jpg 파일 5MB
- **When**: 폼 attach
- **Then**: Supabase Storage 업로드 성공, attachmentUri 저장

**Scenario 4: 일자별 그룹핑**
- **Given**: 오늘 2건, 어제 1건, 이번 주 4건
- **When**: 렌더
- **Then**: 그룹 헤더 3개 ("오늘", "어제", "이번 주") + 각 그룹 내 시간 역순

**Scenario 5: 본인 데이터만 조회 (RLS)**
- **Given**: parent X
- **When**: SELECT
- **Then**: X의 center_records만 반환

**Scenario 6: 주 2회+ 기록 유지율 (REQ-FUNC-043)**
- **Given**: 코호트 분석 (주 2회 이상 기록 사용자)
- **When**: 4주 측정
- **Then**: 유지율 ≥ 40% (모니터링 — INFRA-005)

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-043**: 유지율 ≥ 40%
- **횡단 제약**:
  - [ ] R4 — 센터 기록의 첨부 파일 RLS (본인만 조회), 파일명 자녀 본명 미포함 권장
  - [ ] CON-04 — 메모 필드에 의료 용어 자동 검사 (추후 추가 가능)
- **R8 보호**: 첨부 파일 ≤ 10MB 제한, 무료 티어 1GB 보호
- **G6 비용 가드**: Supabase Storage 사용 → 월 1GB 모니터링

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] CenterRecord 마이그레이션 성공
- [ ] Supabase Storage 버킷 RLS 검증
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] Vercel Preview 배포 통과
- [ ] PR 본문에 REQ-FUNC-042/043 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: DB-001, DB-002, DB-005, DB-011 (RLS), INFRA-001 (Supabase Storage)
- **Blocks**: EXP-2 부분 검증 (Seg C 코호트)
- **Discope 영향**: 해당 없음
