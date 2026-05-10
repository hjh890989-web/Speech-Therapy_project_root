---
type: concept
pillar: product
category: synthesis
aliases: [Open Issues, 잔여 항목 대시보드, 미해결 결정 사항, 워크아웃 대시보드]
tags: [OpenIssues, 잔여, 보강, ADR후보, 사용자확정, 임상자문, 법무, 기술결정, 클러스터통합]
---

# Open Issues — 통합 대시보드

39+ 차 ingest로 누적된 **잔여 결정 사항·보강 영역·ADR 후보**를 카테고리별로 통합한 단일 진입점. 각 이슈는 (1) 발견 ingest (2) 우선순위 (3) 처리 시점 (4) 영향 페이지 (5) 해결 방안.

> 본 페이지는 **메타 정본** — 위키 자체의 잔여 추적 시스템. log.md의 각 ingest § 잔여 항목을 카테고리화 + 시간순 추적.

## 통계 요약 (2026-05-09 39차 기준)

| 카테고리 | 미해결 | 처리 중 | 총합 |
|---|---|---|---|
| 사용자 확정 필요 (Task 신규 등록) | 1 | 0 | 1 (28 task / 38.5 SP) |
| Phase 1 진입 전 결정 | 4 | 0 | 4 |
| Phase 1+ 운영 결정 | 5 | 0 | 5 |
| 임상·법적 결정 | 4 | 0 | 4 |
| 기술 결정 (구현 단계) | 3 | 0 | 3 |
| 모니터링·운영 보강 | 3 | 0 | 3 |
| 정독 잔여 | 0 | 0 | 0 (G-1 ✅ 41차 / G-2 ✅ 44차 모두 해소) |
| ADR 신규 후보 | 2 | 0 | 2 (3 정식 등록 ✅ 43차 + 1 흡수) |
| **총합** | **18** | **0** | **18 미해결** (10 ✅ 해소: G-1 + G-2 + ADR-13/14/15 + ADR-18 흡수 + C-1 + C-2 + C-3 + C-4) |

## A. 사용자 확정 필요 — Task 신규 등록 (1 이슈)

### A-1 [28 신규 task 등록 — 88 → 116] ⭐ HIGHEST

| 속성 | 값 |
|---|---|
| **발견 ingest** | 28~36차 (F9.4 + Phase 1 + HITL 재학습 + F10 + Plan B + system_config) |
| **우선순위** | 🔴 HIGHEST (실제 개발 시작 시 직접 의존) |
| **처리 시점** | 사용자 결정 후 즉시 |
| **영향 페이지** | task-breakdown-overview / RTM / SRS V07 후속 |
| **해결 방안** | RTM 5축 갱신 + 88 → 116 Task 정식 등록 + Sprint 배분 |

**누적 신규 task 분포**:
- F9.4 ROI 시뮬레이터: 5 task / 7 SP ([[product/concepts/F9.4-ROI-simulator]])
- Phase 1 미추출 (F11/F15/F16/F17/F18): 15 task / 21 SP ([[product/concepts/Phase-1-future-tasks-decomposition]])
- HITL 재학습 (DB-NEW-MR-1 + API + MON): 3 task / 5.5 SP ([[product/concepts/HITL-retraining-pipeline]])
- F10 임상 연구 동의 (T4 보강): 3 task / 3 SP ([[product/concepts/F10-research-consent]])
- R6 Plan B (조건부): 1 task / 1 SP ([[product/concepts/R6-Seg-B-Plan-B]])
- system_config 테이블: 1 task / 1 SP ([[product/concepts/HITL-operations-policy]])
- **합계: 28 task / 38.5 SP**

## B. Phase 1 진입 전 결정 (4 이슈)

### B-1 [F15 KOPLAC 임상 자문 실행]

| 속성 | 값 |
|---|---|
| **발견 ingest** | 38차 |
| **우선순위** | 🟡 HIGH |
| **처리 시점** | Phase 1 진입 4주 전부터 |
| **영향 페이지** | F15-clinical-consultation-checklist + Phase-1-future-tasks-decomposition |
| **해결 방안** | 1급 재활사 + ASD 전문가 + 법무 자문 + CTO 4인 자문 (~56만원, 2회) → 9 항목 검토 → CR Tier 분류 |

### B-2 [KOPLAC 저작권 출처 정확화]

| 속성 | 값 |
|---|---|
| **발견 ingest** | 38차 |
| **우선순위** | 🟡 HIGH |
| **처리 시점** | 자문 전 |
| **영향 페이지** | KOPLAC entity / F15-clinical-consultation-checklist |
| **해결 방안** | 출판사·저자·게재 연도 정확화 (한국언어재활사협회 또는 별도 출판사 검색) |

### B-3 [F11 ALLOWED_CONTENT_TYPES 화이트리스트 정확화]

| 속성 | 값 |
|---|---|
| **발견 ingest** | 32차 (ADR-09 등록 시) |
| **우선순위** | 🟡 HIGH |
| **처리 시점** | F11 명세 시 |
| **영향 페이지** | Phase-1-future-tasks-decomposition § F11 / architecture-decisions § ADR-09 |
| **해결 방안** | 콘텐츠 타입 정확 enum 정의 (`'storybook' \| 'lullaby' \| 'rhyme' \| 'mission_mirror'(차단) \| ...`). TEST-NEW-F11-1 자동 회귀 검증 가이드. |

### B-4 [F15 시드 고정 알고리즘 결정]

| 속성 | 값 |
|---|---|
| **발견 ingest** | 38차 |
| **우선순위** | 🟢 MEDIUM |
| **처리 시점** | F15 task 분해 시 |
| **영향 페이지** | F15-clinical-consultation-checklist § 4 자연 발화 vs 인위 / Phase-1-future-tasks-decomposition § F15 |
| **해결 방안** | Vercel AI SDK `generateText({ seed })` 옵션 검증 + Gemini Pro 1.5 시드 지원 여부 확인 |

## C. Phase 1+ 운영 결정 (5 이슈)

### C-1 [system_config 보안 정책] ✅ 50차 RBAC 정책 결정 완료

| 속성 | 값 |
|---|---|
| **발견 ingest** | 39차 |
| **우선순위** | 🟡 HIGH |
| **처리 시점** | ✅ 50차 (2026-05-09) RBAC 정책 결정 / **실 적용**: system_config 테이블 도입 시 (DB-NEW-OPS-1) |
| **영향 페이지** | HITL-operations-policy § system_config RBAC 정책 세분화 (50차 신규) / ADR-13 / change-management-process |
| **해결 방안** | ✅ **권한 매트릭스 결정**: CEO + CTO (변경) / ML Ops (CTO 승인 후 일부 임계값) / 그 외 읽기 전용. Supabase RLS 5 정책 + 보안 메커니즘 5종 (RLS / CTO 승인 / 사유 ≥10 chars / audit_log / 7일 rollback) + Slack #ops-alerts 자동 발송 4 규칙 + 권한 침해 4 대응 + 정기 검토 4주기 (주/월/분기/Tier 3). |

### C-2 [Phase 변경 시 진행 Sprint 처리 정책] ✅ 49차 정책 결정 완료

| 속성 | 값 |
|---|---|
| **발견 ingest** | 39차 |
| **우선순위** | 🟢 MEDIUM |
| **처리 시점** | ✅ 49차 (2026-05-09) 정책 결정 / **실 적용**: Phase 0 → 1 또는 1 → 2 시점 |
| **영향 페이지** | HITL-operations-policy § Phase 변경 시 Sprint 처리 정책 (49차 신규) / change-management-process / ADR-13 |
| **해결 방안** | ✅ **하이브리드 옵션 C 권장**: 신규 가입 = 즉시 적용 (Phase 2) / 기존 가입 = 다음 Sprint 종료까지 = 이전 Phase 유지 → Sprint 완료 후 일괄 전환. system_config (ADR-13) phase_transition_started_at + phase_transition_completed_at 컬럼 보강 + user_current_phase() 함수. CR Tier 3 처리 (CTO+CEO 책임) + 4단계 전환 흐름 (T0 결정 → T1 시작 → T2 Sprint 완료 → T3 전환 완료) + 4 위험 요소 완화 매트릭스. |

### C-3 [IRB 외부 기관 사전 확보] ✅ 51차 LOI 계획 결정 완료

| 속성 | 값 |
|---|---|
| **발견 ingest** | 39차 |
| **우선순위** | 🟡 HIGH (Phase 2 진입 직전) |
| **처리 시점** | ✅ 51차 (2026-05-09) LOI 계획 결정 / **실 체결**: Phase 2 진입 6개월 전부터 |
| **영향 페이지** | HITL-operations-policy § IRB 외부 기관 사전 확보 (51차 신규) / F10-research-consent / expert-diversity-monitoring / ADR-15 |
| **해결 방안** | ✅ **타깃 4 카테고리 (A 대학 / B 학회 / C 자문가 / D 의료 브릿지)** + LOI 표준 템플릿 (7개 섹션) + Phase 2 진입 6개월 전부터 단계별 타임라인 (T-6/T-4/T-2/T-1/T0/T+3/T+6) + 위험 5종 완화 + Phase 2 진입 LOI 검증 게이트 5 체크 + 비용 모델 (Phase 2 첫 1년 약 800-1,000만, 매출 대비 0.02%). |

### C-4 [Expert 풀 정규직 vs 프리랜서 비율 결정] ✅ 52차 정량 분석 완료

| 속성 | 값 |
|---|---|
| **발견 ingest** | 39차 |
| **우선순위** | 🟢 MEDIUM (Phase 2 진입 시) |
| **처리 시점** | ✅ 52차 (2026-05-09) 정량 분석 완료 / **실 적용**: Phase 2 진입 시점 |
| **영향 페이지** | HITL-operations-policy § 1 (52차 정량 분석 신규) / expert-diversity-monitoring / architecture-decisions |
| **해결 방안** | ✅ **3 고용 형태 비교** (정규직 +30% / 파트타임 +15% / 프리랜서 0%) + Phase 2 시작 권장 비율 (정규직 1 + 파트타임 4 + 프리랜서 5-10 = 10-15명) + Phase 2 후반 (정규직 2 + 파트타임 7 + 프리랜서 6-16 = 15-25명, ~1,500만/月) + 채용 RACI (정규직 = CEO Tier 3 / 파트타임·프리랜서 = CTO Tier 2) + 위험 4종 완화 (위장도급 + 부당해고 등) + 트래픽 시나리오별 결정 3종. |

### C-5 [B2B 외부 IRB 비용 정확화]

| 속성 | 값 |
|---|---|
| **발견 ingest** | 39차 |
| **우선순위** | 🟢 MEDIUM |
| **처리 시점** | Phase 2 IRB 트리거 시 |
| **영향 페이지** | HITL-operations-policy § 3 |
| **해결 방안** | 대학별 IRB 비용 조사 (서울대·연세대·고려대 IRB 평균 50만원 가정 — 검증 필요) |

## D. 임상·법적 결정 (4 이슈)

### D-1 [청소년 (만 13세+) 본인 동의 추가 검토]

| 속성 | 값 |
|---|---|
| **발견 ingest** | 36차 |
| **우선순위** | 🟢 MEDIUM (영유아 만 2-7세 외 대상 영역) |
| **처리 시점** | Phase 1+ (확장 시) |
| **영향 페이지** | F10-research-consent § 보강 필요 |
| **해결 방안** | 영유아 외 청소년 대상 확장 시 본인 동의 + 법정대리인 동의 이중 검토. **현 MVP 영유아 = 부모 단독 동의 충분** |

### D-2 [데이터 라이선스 폐기 영향 검증 — V06 → V07]

| 속성 | 값 |
|---|---|
| **발견 ingest** | 37차 |
| **우선순위** | 🟢 LOW (이미 V07-V09에서 폐기 결정) |
| **처리 시점** | 이력 보존 |
| **영향 페이지** | 24-30-VPS-V01-V06-Detail / VPS-evolution |
| **해결 방안** | 임상 연구 활용 = R&D 환류로 분리 (F10 § T4-a/b/c). **결정 완료** ✅ |

### D-3 [임상 자문 분기 회의 비용·운영]

| 속성 | 값 |
|---|---|
| **발견 ingest** | 38차 |
| **우선순위** | 🟢 MEDIUM (Phase 1 활성 시) |
| **처리 시점** | Phase 1 활성 후 |
| **영향 페이지** | F15-clinical-consultation-checklist / HITL-operations-policy § IRB 자문위원회 |
| **해결 방안** | 분기 자문 회의 = ~30만/회 × 4 = 연 120만 + 자문가 다양성 (1급 + 외부 임상가 + 법무) |

### D-4 [F11 부모 음성 임상 윤리 자문]

| 속성 | 값 |
|---|---|
| **발견 ingest** | 32차 (ADR-09 등록 시) |
| **우선순위** | 🟡 HIGH |
| **처리 시점** | F11 출시 전 |
| **영향 페이지** | Phase-1-future-tasks-decomposition § F11 / architecture-decisions § ADR-09 |
| **해결 방안** | F15 자문과 동시 진행 (1급 재활사 + ASD 전문가) — MIT 임상 원리 정합성 검증 |

## E. 기술 결정 (3 이슈)

### E-1 [expertId × 평가 도구 (U-TAP/REVT/PRES) 교차 모니터링] ◐ 45차 알고리즘 설계 완료

| 속성 | 값 |
|---|---|
| **발견 ingest** | 35차 (expert-diversity-monitoring) |
| **우선순위** | 🟢 LOW (Phase 2+ 보강 후보) |
| **처리 시점** | ✅ 45차 알고리즘 설계 완료 / **실 등록**: Phase 2 후반 (실데이터 검증 후 ADR-16 정식 등록) |
| **영향 페이지** | expert-diversity-monitoring § Phase 2+ 보강 (45차 신규) / HITL-retraining-pipeline / DB-NEW-MR-1 |
| **해결 방안** | ✅ **Cross-tab Gini 알고리즘 설계 완료**: expertId × evaluation_tool 매트릭스 → 행 Gini (expert 편식) + 열 Gini (도구 의존) + combined_score = expert_gini × tool_gini. 임계 (Warning >0.5 / Critical >0.7) + 위반 대응 3 시나리오 + MON-NEW-EXP-2 (1.5 SP) 신규 후보. ADR-16 정식 등록은 Phase 2 후반 |

### E-2 [F16 D5 PWA 부활 트리거 임계 정확화]

| 속성 | 값 |
|---|---|
| **발견 ingest** | 32차 (ADR-10 등록 시) |
| **우선순위** | 🟢 MEDIUM (Phase 1 후반) |
| **처리 시점** | F16 활성화 결정 시 |
| **영향 페이지** | architecture-decisions § ADR-10 / Phase-1-future-tasks-decomposition § F16 / persona-강지방 |
| **해결 방안** | "농촌 사용자 비율 N%+" 정확한 N 결정 (10%? 20%? 강지방 페르소나 기준선 검증 필요) |

### E-3 [HITL 큐 알림 채널 권한 관리]

| 속성 | 값 |
|---|---|
| **발견 ingest** | 29차 (HITL-retraining-pipeline) |
| **우선순위** | 🟢 MEDIUM |
| **처리 시점** | Phase 1 활성 시 |
| **영향 페이지** | HITL-system-flow / HITL-retraining-pipeline |
| **해결 방안** | Slack `#hitl-alerts` (전문가) vs `#ml-alerts` (CTO) vs `#ops-alerts` (운영자) 3 채널 분리 |

## F. 모니터링·운영 보강 (3 이슈)

### F-1 [HHI/Gini 임계 실데이터 검증] ◐ 47차 검증 계획 수립 완료

| 속성 | 값 |
|---|---|
| **발견 ingest** | 35차 |
| **우선순위** | 🟢 LOW (Phase 2 활성 시) |
| **처리 시점** | ✅ 47차 검증 계획 수립 완료 / **실 측정**: Phase 2 진입 후 Day 30+ |
| **영향 페이지** | expert-diversity-monitoring § HHI/Gini 임계 검증 (47차 신규) / HITL-operations-policy / ADR-15 |
| **해결 방안** | ✅ **검증 계획 수립**: Phase 2 Day 1-30 일일 측정 → Day 30 시나리오 A(정상 1500-2500) / B(자연 집중 3000+, 임계 완화) / C(과다 분산 <1000, 풀 축소) 분류 → CR Tier 2 처리. **3 지표 통합 알림** (HHI + Gini + Top-3, multi-alert 시 Critical) + Grafana 시계열 + Phase 1 → 2 자동 전환 (system_config monitoring_algorithm = 'phase2_combined') + Phase 별 체크포인트 5종 (Day 30/60/90/180/분기). |

### F-2 [재학습 0.5%/500건/0.3% 임계 실데이터 검증] ◐ 46차 검증 계획 수립 완료

| 속성 | 값 |
|---|---|
| **발견 ingest** | 29차 |
| **우선순위** | 🟢 LOW (Phase 1 후반) |
| **처리 시점** | ✅ 46차 검증 계획 수립 완료 / **실 측정**: Phase 1 진입 후 Day 30+ |
| **영향 페이지** | HITL-retraining-pipeline § 임계 실데이터 검증 계획 (46차 신규) / HITL-operations-policy / ADR-11 |
| **해결 방안** | ✅ **검증 계획 수립**: Day 1-30 일일 분포 측정 → Day 30 시나리오 A(정상 0.2-0.4%) / B(모델 부정확 1%+, 임계 완화) / C(모델 우수 <0.1%, 임계 강화) 분류 → CR Tier 2 처리. 표본 부족 처리 (Day 1-15 < 100 보류 / Day 30+ 200+ 검증 가능) + Vercel Cron 주간 자동 모니터링 (월요일 04:00). Phase 별 체크포인트 5종 (Day 30/60/90/Phase 2 진입/분기별). |

### F-3 [F4-Plus EXP-2 자동 평가 메커니즘 (Plan B 트리거)] ◐ 48차 자동 평가 메커니즘 설계 완료

| 속성 | 값 |
|---|---|
| **발견 ingest** | 34차 (R6-Seg-B-Plan-B) |
| **우선순위** | 🟢 MEDIUM |
| **처리 시점** | ✅ 48차 자동 평가 메커니즘 설계 완료 / **실 트리거**: Phase 1 진입 후 Day 56 |
| **영향 페이지** | R6-Seg-B-Plan-B § EXP-2 자동 평가 (48차 신규) / change-management-process / HITL-operations-policy / TEST-NEW-F18-1 |
| **해결 방안** | ✅ **자동 평가 메커니즘 설계**: Vercel Cron 주간 (Day 28+ 활성, 월요일 05:00) + 4 시나리오 자동 분류 (A 성공 ≥40% / B 경계 30-40% / C 실패 <30% Plan B 자동 트리거 / D 표본 부족 <200 연장) + CR Tier 2 자동 트리거 (CR-YYYY-NNN-R6-PlanB 자동 생성) + 8 영향 페이지 자동 갱신 매트릭스 + Plan C 이중 안전망 (Day 84) + 표본 부족 처리 (Day 120+ 영업 결정). |

## G. 정독 잔여 (2 이슈)

### G-1 [V09 raw 39 §2-§9 본문 정밀 정독] ✅ 41차 해소

| 속성 | 값 |
|---|---|
| **발견 ingest** | 30차 |
| **우선순위** | 🟢 LOW |
| **처리 시점** | ✅ 41차 (2026-05-09) |
| **영향 페이지** | 39-VPS-V09-Final / VPS-evolution |
| **해결 방안** | ✅ §4-2 분리/병합 (F1/F3/F9 → 9 Sub-Epic) + §4-3 4 모순 원칙 (ADR-01·04·09 임상 토대) + §4-5 14 경쟁사 18 시사점 → 21 Epic 빠짐없이 매핑 + §4-6 21 Epic 카운트 (BE 10 + FE 11) + §9 페르소나 커버리지 V2 (신규 7 Epic 2차 Pain Point 매핑) 모두 정독 완료. V09 정독 완성도 65%. |

### G-2 [V05 Marketing 섹션 + JobMVP ⑧ Triage] ✅ 44차 해소

| 속성 | 값 |
|---|---|
| **발견 ingest** | 23차 |
| **우선순위** | 🟢 LOW |
| **처리 시점** | ✅ 44차 (2026-05-09) |
| **영향 페이지** | 24-30-VPS-V01-V06-Detail / VPS-evolution / MVP-feature-spec |
| **해결 방안** | ✅ **V05 Marketing** = §4 GTM & UX/UI Copy 표 (Seg A·C·B·D 4 헤드라인+서브카피) = V09 §10과 동일 (30차 정독으로 적용 완료). **F8 다자녀 Triage** 추적: V02 ⑧ (Phase 2 Low) → V04 ⑧ → V05 F8 (Phase 2 이후) → V07 F8 → V08 F8 → **V09 제거** (§4-6 21 Epic 명단 미포함, §11-F Land & Expand "둘째/셋째 자녀 추가 = Triage" 로 흡수). F1-a 재활용 = 별도 Epic 불필요. |

## H. ADR 신규 후보 6종 (12 → 18 가능성)

| ADR ID 후보 | 이슈 | 처리 시점 |
|---|---|---|
| **~~ADR-13 system_config 테이블~~** ✅ 정식 등록 (43차) | env + DB 하이브리드 + 운영 정책 일원화 | ✅ 등록됨 |
| **~~ADR-14 F15 임상 안전 게이트~~** ✅ 정식 등록 (43차) | F15 자문 후 Critical 발견 시 (만 4세+ 활성 등) | ✅ 등록됨 |
| **~~ADR-15 IRB 자문위원회 운영~~** ✅ 정식 등록 (43차) | 분기 회의 + 외부 협력 검토 | ✅ 등록됨 |
| **ADR-16 expertId × 평가 도구 교차 모니터링** | 도구 간 편향 방어 (cross-tab Gini) | Phase 2 후반 |
| **ADR-17 청소년 본인 동의 (만 13세+)** | 영유아 외 확장 시 | Phase 1+ 확장 시 |
| **ADR-18 system_config Cache TTL 60초** | (ADR-13에 흡수 — 캐싱은 시스템 영향 영역) | ADR-13에 통합됨 |

→ **현 15 ADR + 후보 2 = 17 ADR 가능성** (ADR-18은 ADR-13 흡수로 무효화).

## 처리 시점 매트릭스

| 시점 | 이슈 |
|---|---|
| **즉시 (사용자 결정)** | A-1 (28 task 등록) |
| **Phase 1 진입 4주 전** | B-1 (F15 자문) + B-2 (KOPLAC 저작권) + B-3 (F11 ALLOWED) + B-4 (F15 시드) + D-4 (F11 임상 자문) |
| **Phase 1 진입 시** | C-1 (system_config 보안) + C-2 (Sprint 처리) + E-3 (Slack 채널) |
| **Phase 1 활성 후** | D-3 (분기 자문 회의) + F-3 (EXP-2 자동 평가) + E-2 (D5 트리거) |
| **Phase 1 후반** | F-2 (재학습 임계 검증) + C-4 (정규직 비율) |
| **Phase 2 진입 1개월 전** | C-3 (IRB 외부 기관 LOI) |
| **Phase 2 활성 시** | E-1 (교차 모니터링) + F-1 (HHI/Gini 검증) + C-5 (IRB 비용) |
| **Phase 1+ 확장 시** | D-1 (청소년 동의) |
| **선택적 (한가할 때)** | G-1 (V09 §2-§9) + G-2 (V05 Marketing) + D-2 (이력 보존) |

## 영향 페이지 매트릭스 (역추적)

| 페이지 | 영향 받는 이슈 |
|---|---|
| F9.4-ROI-simulator | A-1 |
| Phase-1-future-tasks-decomposition | A-1, B-3, B-4, D-4, E-2 |
| HITL-retraining-pipeline | A-1, E-3, F-2 |
| F10-research-consent | A-1, D-1 |
| R6-Seg-B-Plan-B | A-1, F-3 |
| HITL-operations-policy | A-1, C-1, C-2, C-3, C-4, C-5 |
| F15-clinical-consultation-checklist | B-1, B-2, B-4, D-3 |
| expert-diversity-monitoring | E-1, F-1 |
| architecture-decisions | B-3, D-4, E-2, ADR-13~18 |
| 39-VPS-V09-Final | G-1 |
| 24-30-VPS-V01-V06-Detail | G-2, D-2 |

## 사용 가이드

### Phase 1 진입 결정 직전 체크리스트

다음 모든 이슈 처리 후 Phase 1 진입 권장:
- [ ] A-1 (사용자 확정 — 28 task 등록)
- [ ] B-1 ~ B-4 (Phase 1 진입 전 결정 4종)
- [ ] D-4 (F11 임상 자문)

### Phase 2 진입 결정 직전 체크리스트

- [ ] C-3 (IRB 외부 기관 LOI)
- [ ] C-4 (정규직 vs 프리랜서 비율)

### 정기 검토 (분기별)

- D-3 임상 자문 회의
- F-1 HHI/Gini 임계 검증
- F-2 재학습 임계 검증

## 출처

- [[wiki/log.md]] § 23~39차 ingest § 잔여 항목 누적
- 39+ 차 위키 합성 결과의 메타 추적

## 관련 product 페이지

- [[product/concepts/change-management-process]] — CR Tier 분류 시 본 대시보드 참조
- [[product/concepts/requirements-traceability-matrix]] — RTM 갱신의 트리거
- [[product/concepts/architecture-decisions]] — ADR 후보 6종 정식 등록 대상
- [[product/concepts/glossary]] — 신규 합류자가 이슈 이해 진입점

## 보강 필요

- 본 페이지 자체의 Append-only 갱신 정책 (이슈 해결 시 ✅ 표시 유지 vs 제거 결정).
- 분기별 잔여 통계 비교 (이슈 누적 vs 해결 추세 추적).
- Slack `#open-issues-weekly` 자동 알림 통합 가능성.

---

✅ 위키 운영의 메타 추적 시스템 정착. 모든 잔여 결정 사항 단일 페이지 진입 가능.
