---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[FR-Q] FR-Q-007: 센터 제출용 PDF — jsPDF 클라이언트 측 (Replace)"
labels: 'phase:p1, mode:replace, domain:fr-q, epic:f7'
assignees: ''
---

## 🎯 Summary
- **Task ID**: FR-Q-007
- **Epic / Story**: F7 센터 제출용 PDF / S3
- **Phase**: 🟡 P1
- **Mode**: 🔵 Replace (검토 보고서 §2.2 [추가 E3] 권고 적용)
- **Discope 적용**: 추가 권고 — Puppeteer 대신 jsPDF 클라이언트 측 (Vercel Serverless 콜드 스타트 회피)
- **목적**: 부모가 언어재활사 첫 방문 시 제출할 수 있는 A4 PDF 생성. SRS는 react-pdf 또는 Puppeteer를 명시했으나, 본 태스크는 **클라이언트 측 jsPDF**로 단순화하여 서버 부담 0 + 즉시 다운로드.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-FUNC-035 (서버 측 PDF 생성 — react-pdf 또는 Puppeteer)
- **Task 강화판**: §3-4 FR-Q-007 (Replace 모드)
- **검토 보고서**: [`./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md`](./02_SRS_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md) §2.2 [추가 E3]

## ✅ Task Breakdown
- [ ] `npm i jspdf jspdf-autotable` 설치
- [ ] **한글 폰트 임베딩** — `NotoSansKR` 변환 후 base64로 인라인
- [ ] `lib/pdf/generateReport.ts` Client-side 함수:
  - 입력: weekly_reports row + evaluation_results 7건
  - jsPDF 생성:
    - A4 portrait
    - 표지: 자녀 정보(월령, 가명) + 생성일
    - 1면: 3축 점수 차트 (jsPDF에 캔버스 임베드)
    - 2면: 7일치 추이 표 (jspdf-autotable)
    - 3면: AI 쿠션 텍스트 + Disclaimer
- [ ] FR-Q-005 페이지에 "PDF 다운로드" 버튼 추가
- [ ] 클릭 시 `generateReport()` → `pdf.save('report.pdf')` (브라우저 다운로드)
- [ ] PDF 메타데이터: 작성자 "Home Language Coaching Platform", 제목 "주간 발달 리포트"
- [ ] 보안 — 자녀 식별 정보 마스킹: 부모 입력 별명만 사용, 본명 미저장 → PDF에도 노출 안 됨
- [ ] Vercel Analytics 이벤트: `pdf_downloaded`

## 🧪 Acceptance Criteria
**Scenario 1: PDF 다운로드 (REQ-FUNC-035)**
- **Given**: weekly_reports row + 평가 결과
- **When**: "PDF 다운로드" 버튼 클릭
- **Then**: 브라우저 파일 다운로드 트리거, `report.pdf` 저장됨

**Scenario 2: A4 + 한글 폰트**
- **Given**: 다운로드된 PDF
- **When**: PDF 뷰어로 열람
- **Then**: A4 portrait, 한글 정상 표시 (글자 깨짐 0건)

**Scenario 3: Disclaimer 포함**
- **Given**: PDF 생성
- **When**: 마지막 페이지 검사
- **Then**: "본 결과는 의료적 판단이 아닌 발달 참고 자료입니다." 노출

**Scenario 4: 자녀 식별 정보 마스킹 (R4)**
- **Given**: 부모 별명 "준이"
- **When**: PDF 텍스트
- **Then**: 본명 0건, "준이"만 노출

**Scenario 5: 서버 부담 0 (Replace 검증)**
- **Given**: PDF 생성 요청
- **When**: 네트워크 검사
- **Then**: 서버 호출 0건 (전 클라이언트 측)

**Scenario 6: 차트 캔버스 임베드**
- **Given**: 3축 점수 차트
- **When**: PDF 1면 렌더
- **Then**: 차트 이미지 정상 표시

## ⚙️ Technical & Non-Functional Constraints
- **REQ-FUNC-035**: A4 PDF 생성
- **횡단 제약**:
  - [ ] CON-04 — PDF 텍스트 금칙어 0건
  - [ ] Disclaimer 1곳 이상 노출
  - [ ] R4 — 자녀 본명·생년월일 미포함
- **검토 보고서 §2.2**: Puppeteer 회피 (Vercel Serverless 콜드 스타트 5~10초 + 메모리 압박)
- **G6 비용 가드**: 클라이언트 측 → 서버 비용 0

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] 한글 폰트 정상 렌더 (3개 디바이스 검증)
- [ ] `tsc --strict` 0 errors
- [ ] ESLint 0 errors
- [ ] Vercel Analytics `pdf_downloaded` 이벤트 발송
- [ ] PDF 사이즈 ≤ 500KB 목표 (폰트 최적화)
- [ ] PR 본문에 REQ-FUNC-035 + 검토 보고서 §2.2 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: FR-Q-005 (그래프 페이지), DB-007 (weekly_reports), API-003 (조회), INFRA-005 (Analytics)
- **Blocks**: 없음 (사용자 가치 종착점)
- **Discope 영향**: Replace — Puppeteer/react-pdf 서버 측 → jsPDF 클라이언트 측 (검토 보고서 §2.2 [추가 E3] 적용)
