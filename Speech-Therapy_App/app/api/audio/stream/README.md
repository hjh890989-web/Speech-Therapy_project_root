# API-009 — `/api/audio/stream` (Edge Runtime) — **Hold (D7)**

본 라우트는 **D7 디스코프 적용으로 미구현**.

## 사유

- Vercel Edge Runtime 은 Node.js 와 다른 제약 (일부 Node API 미지원, Web Streams 직접 처리)
- 1인 개발자가 디버깅하기 매우 어려움
- 클라이언트 측 직접 STT 호출이 더 단순 + 안정적
- R7 (Vercel Timeout) 대응: 클라이언트가 직접 Whisper/Web Speech API 호출

## 대체 흐름

- **Sprint 1**: 브라우저 Web Speech API → Server Action `analyzeDiagnosis()` 호출
  (transcript 텍스트 + 음향 특징만 전송, 오디오 원본은 서버로 보내지 않음)
- **P2 Zero-touch (교실 태블릿)**: PWA 가 Whisper API 클라이언트 직접 호출

## 부활 조건

1. Zero-touch 시나리오 본격 도입 + 클라이언트 측 STT 비용·정확도 한계 발생
2. 또는 운영 부담 증가로 서버 측 프록시가 필요해질 때
3. 부활 시 INFRA-004 (Edge Runtime 활성화)와 함께 진행

## 참조

- SRS §3.5 `app/api/audio/stream` (Edge Runtime)
- REQ-FUNC-051 (Web Worker VAD ≤ 300ms 청크 전송)
- R7 (Vercel Timeout 대응)
- 검토 보고서 §1.2 [추가 D7]
