---
type: concept
pillar: product
category: product_decision
aliases: [MVP Descope, 1주차 Action Item, 바이브 코딩 실행 계획, Phase -1]
tags: [Descope, MVP, 바이브코딩, 1주차, 실행계획, 클러스터55-67]
---

# MVP Descope Plan — 바이브 코딩 1주차 실행 계획

[[product/sources/67-MVP-Descope-Review]] 기반 정본. **SRS 21 Epic은 그대로 유지하되 개발 순서 재편**으로 1인/3개월차 + AI 의존 개발자 프로필에서 1개월 내 MVP 가능하도록.

## 핵심 원칙

> **"마이크 스트리밍, 카카오톡, 앱 배포는 일단 머릿속에서 지우십시오. 텍스트 입력으로 3축 결과가 나오고, Supabase에 저장되어 주간 그래프가 그려지는 웹페이지를 하루 만에 Vercel에 띄우는 것부터 시작하세요."**

## 난이도 분류

| 난이도 | 영역 | 예시 |
|---|---|---|
| **하** | 프론트엔드/DB 연동 | Next.js + Prisma + Supabase, 로그인, CRUD |
| **중** | 외부 B2B API 연동 | 카카오톡, 키즈노트 (심사·제휴 필요) |
| **상** | 실시간 오디오 제어 | Web Audio API, VAD, Zero-touch, 백그라운드 처리 |

→ **하 → 중 → 상** 순서로 진행.

## ⭐ Phase -1: 1주차 (시스템 코어 관통)

> SRS 21 Epic 중 **F1-a, F1-b, F2, F3-a, F12** 의 *텍스트 모드 단순화* 만.

| 일차 | 목표 |
|---|---|
| Day 1 | Next.js + Vercel + Supabase + Prisma 셋업. 헬로월드 배포 |
| Day 2 | 진단 입력 폼 (월령 + 타겟 음소 + **텍스트 평가 입력**). DB 저장 |
| Day 3 | 3축 점수 mock 산출 → 또래 비교 리포트 페이지 (RSC) |
| Day 4 | 미션 카드 UI (shadcn/ui) + 즉각 보상 (Framer Motion 파티클) |
| Day 5 | 주간 발달 그래프 (recharts 등) + Vercel Cron 주간 배치 |
| Day 6-7 | 끝까지 관통: 진단 → 미션 → 보상 → 주간 그래프 사이클 검증 |

**완료 조건**:
- 텍스트 입력 → 3축 mock 결과 → DB 저장 → 주간 그래프 = 1개 사이클 완성
- Vercel + Supabase + Prisma 통신 검증
- shadcn/ui + Tailwind 일관성

## Phase 0 본격 (2-4주차) — Core SRS Phase 0

1주차 코어 관통 후 SRS Phase 0 6 Epic의 실제 구현 시작:

| 주차 | 목표 |
|---|---|
| 2주차 | **Gemini API 연동** (Vercel AI SDK). `analyzeDiagnosis()` Server Action 실제 |
| 3주차 | **음성 파일 업로드** (Web Audio API 우회 — mp3 업로드만). STT API 호출 |
| 4주차 | F3-b 적응형 난이도 + F12 누적 보상 도감 + 페이월 |

**Descope 유지**:
- ❌ Web Audio API 실시간 스트리밍 (Phase 1로 이동)
- ❌ Capacitor 앱 빌드 (Phase 1로 이동)
- ❌ Zero-touch (Phase 2 → Phase 3로 강등 또는 Plan B)

## Phase 1 (1-3개월) — 리텐션 + 음성

| 영역 | 작업 |
|---|---|
| F4 주간 리포트 | 1주차 그래프를 Gemini 예측 시뮬레이션 + 음소 핀셋으로 고도화 |
| F5 공유 | **카카오톡 우회: Web Link 클립보드 복사** |
| F6 HITL | Supabase Realtime + 어드민 페이지 |
| F7 PDF | 클라이언트 측 react-pdf |
| **F1-a 본격** | 음성 파일 업로드 → 실시간 마이크 (Web Audio API) 추가 |
| F11 부모 음성 | 외부 TTS API |
| F14 거울 모드 | WebRTC + 카메라 오버레이 |
| F15 LLM 챗봇 | Vercel AI SDK `useChat()` |

**Descope 유지**:
- ❌ Capacitor 앱스토어 (Phase 2로)
- ❌ Zero-touch (Phase 3로)

## Phase 2 (3-6개월) — B2B + 앱

| 영역 | 작업 |
|---|---|
| F9-a 원장 대시보드 | Route Group |
| F9-c 일괄등록 | Server Action 엑셀 파싱 |
| F9-d 알림장 | **키즈노트 우회: 텍스트 클립보드 자동 복사 UI** |
| F10 전자서명 | **카카오톡 우회: Web Link** |
| **Capacitor** | iOS/Android 앱스토어 (지금부터) |

**Descope 유지**:
- ❌ **Zero-touch (F9-b) 전면 보류** — Phase 3 또는 별도 R&D 트랙

## Phase 3+ (6개월~) — 고난도 영역

| 영역 | 작업 |
|---|---|
| **F9-b Zero-touch** | Web Worker VAD + 백그라운드 처리. 단독 R&D 트랙 |
| 카카오톡 정식 알림톡 | 템플릿 사전 심사 |
| 키즈노트 정식 API | B2B 공식 제휴 |
| 추가 LLM 모델 (OpenAI Fallback) | D4 의존성 분산 |

## 외부 의존성 우회 매핑

| 정식 (SRS) | 1주차~Phase 1 우회 | Phase 2 정식 전환 시점 |
|---|---|---|
| Web Audio API 실시간 | **mp3 업로드만** | Phase 1 후반 |
| Capacitor 앱 | **PWA 브라우저만** | Phase 2 |
| 카카오톡 알림톡 | **Web Link 클립보드** | Phase 3 (심사 통과 후) |
| 키즈노트 API | **클립보드 자동 복사** | B2B 제휴 후 |
| Zero-touch VAD | **수동 녹음 시작** | Phase 3 별도 트랙 |

## 비용 통제

| 항목 | 우회 | 비용 절감 |
|---|---|---|
| Whisper 자체 호스팅 | **Google STT API or OpenAI Whisper API** | GPU 인프라 월 수십만 원 절감 |
| AWS EC2 등 항상 서버 | **Vercel Scale-to-Zero** | 월 ~$20 |
| Storage 무한 적재 | **REQ-FUNC-005 7일 폐기 Cron** | Supabase 1GB 무료 유지 |
| Vercel Hobby 무료 | ⚠️ **Pro $20 필수** (10s timeout 회피) | 함수 timeout 회피 |

→ 월 $30~35 (MAU 1,000 기준).

## 1주차 후 EXP 적용 가능성

| EXP | 1주차 텍스트 모드 적용 가능? |
|---|---|
| EXP-1 전환 톤 (코칭 톡 vs 경고) | ✅ 텍스트 평가 결과로 또래 비교 톤 A/B 가능 |
| EXP-4 가격 앵커링 | ✅ 페이월에서 센터 비용 노출 A/B 가능 |
| EXP-2 리포트 락인 (M3) | ⚠️ 음성 진단 없이는 효과 미입증 → Phase 1 음성 도입 후 |
| EXP-3 Zero-touch | ❌ Phase 3 |

## 리스크 vs Descope 매핑

| Risk (PRD V10) | Descope 영향 |
|---|---|
| R1 의료법 | Disclaimer는 1주차부터 강제 (Middleware 금칙어) |
| R2 STT 실패율 | 음성 도입 Phase 1까지 미적용 |
| R3 교사 거부 | F9-b Zero-touch 보류 = R3 회피 / Phase 2 우회 (클립보드) |
| R4 음성 정보 유출 | 7일 폐기 1주차부터 |
| **R5 외부 API 장애** | **카카오·키즈노트 우회 = R5 자체 회피** ⭐ |
| R6 Seg B 가설 | EXP-2 Phase 1로 |
| **R7 Vercel Timeout** | **Pro $20 + Client-side STT** |
| **R8 Supabase 무료** | **7일 폐기 Cron** |

→ Descope 자체가 R3, R5의 회피 메커니즘. R7, R8은 비용 투자로 해결.

## 임상 정합성 trade-off

| Descope | 임상 영향 | 보강 |
|---|---|---|
| **1주차 텍스트 모드** | 음성 STT 없이 [[clinical/entities/U-TAP]] 표준 미충족 | KSF #2 효과 검증을 Phase 1 이후로 |
| **Zero-touch 보류** | [[clinical/concepts/한국-언어치료-트랙비교]] 트랙 2 일상 평가 미지원 | Phase 3 보강 |
| **Capacitor 보류** | [[product/entities/persona-강지방]] (농촌·구형폰) 미지원 | Phase 2 정식 |

## 출처
- [[product/sources/67-MVP-Descope-Review]] (1차 정본)
- [[product/sources/65-SRS-V06-Final]] § R7, R8 + REQ-FUNC-005 7일 폐기

## 관련 product 페이지

- [[product/concepts/MVP-feature-spec]] — 21 Epic (Descope 적용 전 정본)
- [[product/concepts/tech-architecture]] — Vercel + Supabase 비용 구조
- [[product/concepts/SRS-evolution]] — V06이 본 Descope 권고를 받은 흐름
- [[product/concepts/jtbd-insights]] § MVP 5대 우선순위 (1주차 텍스트 모드도 발견 #1 "방법론" 검증 가능)
- [[product/concepts/Key-Success-Factors]] § KSF #1 (진단-교육 브릿지 = 1주차 텍스트 모드도 검증 가능)

## 보강 필요
- 1주차 텍스트 모드의 EXP-1 (전환 톤) 구체 설계 — 음성 없이 어떻게 또래 비교 점수 mock 산출.
- Phase 0~3 단계별 KPI 임계 - SRS는 정식 KPI만 명시. Descope 단계별 임계 별도 정의 필요.
- 100가정 파일럿 시점 — 1주차 mock인지, Phase 0 음성 도입 후인지 결정 필요.
- 본 페이지의 Phase 정의가 SRS Phase 0/1/2 와 약간 다름 (Phase -1, Phase 0/1/2/3+ 7단계로 확장) — 정합 검증 필요.
