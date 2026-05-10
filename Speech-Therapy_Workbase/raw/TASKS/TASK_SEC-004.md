---
name: Feature Task
about: SRS V06 기반 Speech-Therapy Platform 개발 태스크 명세
title: "[Security] SEC-004: Gemini Rate Limiter (무료 RPM 15 보호 + 비용 가드)"
labels: 'phase:p0, mode:active, domain:sec, epic:foundation, sprint:2'
assignees: ''
---

## 🎯 Summary
- **Task ID**: SEC-004
- **Epic / Story**: Foundation (횡단 보호 장치)
- **Phase**: 🟢 P0
- **Mode**: 명세대로
- **Discope 적용**: 해당 없음 (검토 보고서 §2.2 [추가 E4]에서 신규 도출 — SRS 본문 확장)
- **목적**: Gemini 무료 티어 RPM 15 보호 + 사용자당 일 한도 + 일 누적 비용 임계 관리. 토큰 버킷 알고리즘으로 호출 빈도 제한 → 비용 가드(REQ-NF-018) 강제.

## 🔗 References
- **SRS**: [`../65_SRS_V06_Nextjs_Fullstack_Final.md`](../65_SRS_V06_Nextjs_Fullstack_Final.md)
  - REQ-NF-018 (AI API 호출 비용 ≤ ₩5,250/유저/월)
- **Task 강화판**: §3-7 SEC-004 (P0 신규 추가)
- **검토 보고서**: §2.2 [추가 E4] Gemini Rate Limiter 필수, §3.4 G5 가드레일

## ✅ Task Breakdown
- [ ] `npm i @upstash/ratelimit @upstash/redis` 설치
- [ ] Upstash Redis Free 인스턴스 생성:
  - 최대 10K 요청/일 무료
  - 환경 변수 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 등록 (INFRA-001 통합)
- [ ] `lib/ratelimit.ts` 작성:
  - `geminiRateLimiter`: 슬라이딩 윈도우 14 RPM (안전 마진 1)
  - `userDailyLimiter`: 사용자당 일 50회 (1,000 MAU 비용 보호)
  - `costGuard`: 일 누적 ≤ $1.00 임계 → 차단
- [ ] API-011 어댑터에 Rate Limiter 주입:
  - `geminiClient.generateJson()` 진입 시 3중 체크 (전역 RPM, 사용자 일 한도, 일 비용)
- [ ] 초과 시 응답:
  - `RATE_LIMITED` 에러 + `retry_after` (초)
  - HTTP 매핑: 429 Too Many Requests + Retry-After 헤더
- [ ] 비용 추적:
  - 호출 후 토큰 사용량 → cost_usd 계산 → Redis INCR
  - 매일 00:00 UTC 자동 리셋 (TTL 24h)
- [ ] Slack 알림 (해당 시):
  - 일 누적 80% 임계 도달 시 1회 webhook (중복 방지 플래그)
  - SLACK_WEBHOOK_URL 환경 변수 (D4 공유)

## 🧪 Acceptance Criteria
**Scenario 1: 정상 호출 (RPM 14 이내)**
- **Given**: 분당 10번 호출
- **When**: `geminiRateLimiter.check()`
- **Then**: success: true, 호출 진행

**Scenario 2: RPM 초과 차단**
- **Given**: 1분 내 15번째 호출
- **When**: 체크
- **Then**: `RATE_LIMITED` 에러, retry_after 초 반환, Gemini 실제 호출 안 됨

**Scenario 3: 사용자당 일 50회 초과**
- **Given**: 동일 userId 51번째 호출 (24시간 내)
- **When**: 호출
- **Then**: `USER_DAILY_LIMIT` 에러, 24시 리셋 안내 메시지

**Scenario 4: 비용 임계 80% Slack 알림**
- **Given**: 일 누적 $0.80 도달
- **When**: 다음 호출 전 체크
- **Then**: Slack 알림 1회 전송 (재호출 시 중복 발송 안 됨)

**Scenario 5: 환경 격리**
- **Given**: Production / Preview / Dev 환경
- **When**: Redis 키 prefix 검사
- **Then**: 환경별 분리 (`prod:gemini:rpm`, `preview:gemini:rpm` 등)

**Scenario 6: 자정 자동 리셋**
- **Given**: 23:59에 일 한도 50/50 도달
- **When**: 00:00 UTC 경과 후 호출
- **Then**: 카운터 리셋, 정상 진행

## ⚙️ Technical & Non-Functional Constraints
- **REQ-NF-018**: 유저당 월 ≤ ₩5,250 ≈ $4 → 일 환산 ≈ $0.13
- **G5 가드레일**: Gemini 무료 RPM 15 보호 (검토 보고서 §3.4)
- **격리**: Production / Preview / Dev 환경별 별도 Redis 키 prefix 강제
- **횡단 제약**:
  - [ ] 모든 Gemini 호출 진입점에 강제 적용 (Bypass 불가)
  - [ ] 비용 모니터링 활성화 (REQ-NF-022 LTV:CAC 가드)

## 🏁 Definition of Done
- [ ] 모든 Acceptance Criteria 충족
- [ ] Upstash Redis 연결 검증
- [ ] API-011 어댑터에 통합 완료
- [ ] `tsc --strict` 0 errors
- [ ] 단위 테스트 (RPM 초과 / 일 한도 / 비용 임계 / 환경 격리)
- [ ] Slack 알림 1회 검증 (중복 방지 동작 확인)
- [ ] README에 Rate Limiter 정책 명시 + 환경 변수 가이드
- [ ] PR 본문에 REQ-NF-018 + G5 매핑

## 🚧 Dependencies & Blockers
- **Depends on**: API-011 (Gemini 어댑터 통합 지점), INFRA-001 (Vercel 환경 변수 슬롯)
- **Blocks**: FR-C-001 (Gemini 호출 시 통과 필수), 모든 P1+ AI 호출 태스크 (FR-C-011, FR-C-017, F15 챗봇)
- **Discope 영향**: 해당 없음 (신규 도출 — 검토 보고서 §2.2 [추가 E4] 권고로 SRS 본문 명세를 강화)
