---
name: 003-error-fix-protocol
description: 에러 / 버그 진단 + 수정 7단계 표준 프로세스.
canonical: true
---

# Error Fix Protocol (Canonical)

> 이 스킬은 `.agents/skills/` 가 canonical source. 100-error-fixing-process 의 보편 절차를 Speech-Therapy 컨텍스트로 확장.

## 1. 트리거

- 사용자가 에러 메시지 / 스택 트레이스 / "안 됨" / "왜 이러지" 보고
- 테스트 실패
- 운영 incident 발생

## 2. 7단계 프로토콜

### Step 1. 현상 정의 (Phenomenon)
- 사용자가 본 정확한 메시지 / URL / 시점 기록
- 재현 절차 명시 ("A 누르면 B 화면에서 C 에러")
- 환경 (브라우저, OS, mic 유무 등)

### Step 2. 컨텍스트 탐색 (Scope)
- 관련 파일 / 데이터 흐름 / 함수 매핑
- Grep / Read 로 영향 범위 식별
- 최근 변경사항 (`git log --oneline -10`) 검토

### Step 3. 핵심 원인 (Root Cause)
- 근거 (로그 / 코드 / DevTools 캡처) 기반 좁히기
- 추측 → 검증 가능한 가설로 전환
- 가능 시 단일 변수 격리 (예: env 플래그 toggle)

### Step 4. 중급 개발자 수준 요약
- 전문 용어 줄이고 명확한 문장으로
- 사용자에게 보고용 (한국어, 1~2 문단)

### Step 5. 수정 지점 명시
- 어느 파일 어느 라인을 왜 바꾸는지
- side-effect 가능성 (다른 호출자 영향?)

### Step 6. 코드 수정 (작게)
- 1 commit = 1 핫픽스 원칙
- 변경 최소화 (over-engineer 금지)
- 검증: tsc / lint / vitest 통과

### Step 7. 후속 제안
- 회귀 방지 테스트 (vitest 케이스 추가)
- 로깅 보강 (재발 시 진단 용이)
- 메모리 / 가이드 / 대화기록 업데이트

## 3. Speech-Therapy 컨텍스트 예시

### 3.1 알려진 핫픽스 패턴

| 증상 | 원인 | 해결 패턴 |
|---|---|---|
| STT "듣는 중..." 행 상태 | Web Audio + SpeechRecognition mic 동시 점유 | env 플래그 `NEXT_PUBLIC_ENABLE_AUDIO_ANALYZER=false` |
| Magic Link `/login?error=PKCE...` | `@supabase/ssr` 기본 storage localStorage fallback | client.ts 에 명시적 cookies 어댑터 |
| Google OAuth 401 invalid_client | Supabase 입력 Client ID 잘림 | JSON 파일 기준 재입력 |
| Prisma JSON 컬럼 null 대입 | Prisma 제약 | `?? undefined` 패턴 |
| iOS Safari 별 누적 손실 | ITP cookie 7일 한도 | localStorage 권위 패턴 |

### 3.2 Server Action 실패 매핑

| 에러 | 사용자 카피 |
|---|---|
| `VALIDATION_ERROR` | "입력 정보 다시 확인해 주세요." |
| `RATE_LIMITED` | "잠시 후 다시 시도해 주세요." |
| `LLM_TIMEOUT` | "분석에 시간이 오래 걸려요." |
| `INTERNAL_ERROR` | "일시적인 오류가 발생했어요." |

## 4. 외부 사이트 UI 이슈 (특별 룰)

Google Cloud Console / Supabase Dashboard / Vercel 등 외부 UI 가 안 되는 경우:

- ❌ 학습 데이터 옛 UI 기준으로 추측 안내 금지
- ✅ 사용자 스크린샷 요청 → 현재 화면 기준 답변
- ✅ WebSearch / WebFetch 로 현재 공식 문서 확인
- ✅ 막히는 정확한 단계 + 메시지 받아 한 클릭씩 안내

(2026-05-15 sub-session 학습 — Google Cloud Console 신 UI "Google 인증 플랫폼" 케이스)

## 5. 안티패턴

- ❌ Step 1 (현상 정의) 건너뛰고 추측으로 수정
- ❌ "혹시 모르니까" 다른 부분도 같이 수정 (블레임 어려워짐)
- ❌ 핫픽스 후 회귀 테스트 없이 종료
- ❌ 대화기록 / 메모리 갱신 누락

## See also

- `.cursor/skills/100-error-fixing-process/SKILL.md` — 보편 7단계 원형
- 대화기록 §12, §13, §17~§19 (2026-05-15) — 실제 핫픽스 사례
