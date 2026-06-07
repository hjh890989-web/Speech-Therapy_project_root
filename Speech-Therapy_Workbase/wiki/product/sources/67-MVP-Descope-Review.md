---
type: source
pillar: product
title: MVP 개발 목표 적절성 종합 검토 (난이도·구현 가능성·비용 효율성)
source_path: ../../../raw/67_MVP-개발목표-적절성-종합-검토(난이도_가능성_효율성)-보고서.md
source_type: review
authors: []
year: 2026
ingested: 2026-05-09
tags: [MVP, Descope, 바이브코딩, 비용효율, 난이도, 1주차Action, 클러스터55-67]
---

# MVP 검토 — 바이브 코딩 관점 Descope 권고

> **한 줄 요약.** SRS V05/V06이 훌륭하지만 **"IT 3개월 차 + 100% 바이브 코딩(AI 의존)" 개발자 프로필**에 대비, 실시간 오디오·앱 배포·Zero-touch 등을 **1주차에서 의도적으로 제외**해야 1개월 내 MVP 가능. 월 운영비 $30~35 (Vercel Pro + Supabase Free + Gemini Free + Google STT).

## 검토 컨텍스트
- 검토 대상: [[product/sources/65-SRS-V06-Final]] (SRS V05 Next.js Full-stack)
- **타겟 개발자 프로필**: IT 직무 3개월 차 입문자, 100% 바이브 코딩(AI 의존) 기반

## 1. 개발 속도 (Time-to-Market)

### 🟢 긍정: Next.js + Supabase 조합
- AI 코딩 어시스턴트(Cursor 등)가 **가장 방대한 학습 데이터**를 가진 스택
- 로그인·CRUD·대시보드 UI = 프롬프트만으로 하루 이틀

### 🔴 Descope 제안 3건

#### 제안 1: 실시간 오디오 처리 우회 (1주차)
> 처음부터 Web Audio API에 매달리면 진도 안 나감.
> **MVP 1주차 = "녹음된 음성 파일(mp3) 업로드"** 또는 **"원장/교사 텍스트 평가 입력"** 으로 시스템 코어(진단-미션-보상 사이클) 먼저 관통. **마이크 연동은 마지막에**.

#### 제안 2: 네이티브 앱 배포 보류
> Capacitor iOS/Android 스토어 심사·배포는 **인증서·빌드 에러**로 AI가 해결 못함. **PWA 브라우저 테스트만**.

#### 제안 3: Phase 2 Zero-touch 전면 보류
> Web Worker 백그라운드 VAD는 **브라우저 탭 백그라운드 Throttling** 등 변수 너무 많음. **입문자 + AI만으로 1개월 내 달성 불가**.

## 2. 외부 연동 — 복잡성 최소화

### AI / LLM (Gemini + Vercel AI SDK)
> **적절성 최상**. 별도 Python 서버(LangChain) 없이 프론트에서 직접 LLM 호출. Managed API (Gemini) = 비용·속도 완벽.

### STT 엔진 — 무조건 API 호출
> Whisper 직접 호스팅 = 배포 복잡 + GPU 인프라 비용 (월 수십만 원). **무조건 Google Cloud Speech-to-Text API 또는 OpenAI Whisper API**.

### 카카오톡·키즈노트 API 우회
> 카카오 알림톡 = 템플릿 사전 심사 며칠. 키즈노트 API = B2B 공식 제휴 없으면 API Key 발급 막힘.
> **MVP 단계 우회**:
> - 카카오 알림톡 → **일반 Web Link (클립보드 복사)**
> - 키즈노트 → **알림장 텍스트 클립보드 자동 복사 UI**

## 3. 운영 비용 — Scale-to-Zero

### 💰 예상 월 비용 (MAU 1,000명)

| 서비스 | 티어 | 비용 | 비고 |
|---|---|---:|---|
| **Vercel** | **Pro $20** | **$20** | ⚠️ Hobby(무료)는 함수 10s 제한 → 오디오 분석 Timeout 확정. **Pro 60s 업그레이드 필수** |
| **Supabase** | Free | $0 | 500MB DB, 1GB Storage. 오디오 원본 쌓이면 1GB 금방 |
| **Gemini API** | Free / PAYG | $0~$5 | 1.5 Flash 무료 티어 RPM 15로 MVP 커버 |
| **Google STT** | PAYG | ~$10 | 매월 60분 무료 + 분당 $0.024. 1,000명 × 5분 진단 ≈ $10 |
| **합계** | | **$30~35** | AWS EC2 보다 저렴 |

### 🚨 비용 방어 핵심
> **REQ-FUNC-005 오디오 7일 자동 폐기** = **비용 방어를 위한 최우선 필수 구현 기능**. Supabase Storage 1GB 초과 막기 위함.

## 4. 종합 결론

> **"SRS는 훌륭하나, 바이브 코더의 현실적 생존을 위해 개발 순서를 재편해야 한다."**

### 난이도 분류
- **하**: 프론트엔드/DB 연동 (FE + Supabase + Prisma)
- **중**: 외부 B2B API 연동 (카카오·키즈노트)
- **상**: 실시간 오디오 제어 (Web Audio API + VAD + Zero-touch)

### 구현 가능성
> 앱 배포 + Zero-touch 백그라운드를 **MVP에서 덜어내면 90%+ 성공 보장**.

### 비용 효율성
> 월 $30 — **궁극의 극한 효율 아키텍처** (단, Vercel Pro + 7일 폐기 Cron 선행 필수).

### 🚀 MVP 1주차 Action Item ⭐
> **"마이크 스트리밍, 카카오톡, 앱 배포는 일단 머릿속에서 지우십시오. 텍스트 입력으로 3축 결과가 나오고, Supabase에 저장되어 주간 그래프가 그려지는 웹페이지를 하루 만에 Vercel에 띄우는 것부터 시작하세요."**

## 인용 가능 위치

| 주제 | 원본 |
|---|---|
| 3 Descope 제안 | L13~L24 |
| AI/STT/카카오/키즈노트 우회 | L31~L41 |
| 비용 표 | L52~L58 |
| 7일 폐기 비용 방어 | L61 |
| 1주차 Action Item | L73~L74 |

## Clinical cross-link

- **MVP 1주차 텍스트 모드** = 음성 STT 우회 → **임상적 정합성 일시 후퇴**. 진단 정확도가 [[clinical/entities/U-TAP]] (조음음운) 표준에 못 미치는 상태로 출시되므로 **KSF #2 효과 검증 시 이 단계를 명시적으로 제외**해야 함.
- **Zero-touch 보류** = [[clinical/concepts/한국-언어치료-트랙비교]] § 트랙 2 의 일상 환경 평가 기능 후순위 → MVP 후 보강.
- **Capacitor 보류** → 농촌·저사양 환경 ([[product/entities/persona-강지방]], Extreme-2) 전면 미지원 단계 — Phase 2 이후 재개.

## 관련 product 페이지
- [[product/concepts/MVP-descope-plan]] — 본 source의 정본 페이지 (1주차 Action Item + Descope 우선순위)
- [[product/sources/65-SRS-V06-Final]] — 검토 대상
- [[product/concepts/tech-architecture]] — Vercel + Supabase + Gemini 비용 구조 정본
- [[product/concepts/MVP-feature-spec]] — 21 Epic (Descope 적용 전 정본)

## 보강 필요
- 1주차 Action Item 이후의 Phase 0~Phase 2 단계별 Descope 일정 — 본 source는 1주차만 명시.
- 실제 1주차 텍스트 모드의 EXP-1 (전환 톤 A/B) 적용 가능성 — 음성 진단 없이 어떻게 또래 비교를 보여줄지.
- Vercel Pro $20의 실제 트래픽 한계 (어느 MAU 부터 Enterprise로 갈아야 하는가) — 추정 미명시.
