# API-010 §2 — Google OAuth 설정 가이드

> 코드 측 구현은 완료 (LoginForm 의 "Google 로 계속하기" 버튼).
> 실제 동작을 위해선 아래 **Google Cloud Console + Supabase Dashboard** 1회 설정 필요.

## 1. Google Cloud Console — OAuth Client ID 발급

### 1.1 프로젝트 생성 (또는 기존 사용)

1. https://console.cloud.google.com/ → 우측 상단 프로젝트 셀렉터 → "새 프로젝트"
2. 프로젝트 이름: `speech-therapy` (또는 임의)
3. "만들기"

### 1.2 OAuth 동의 화면

1. 좌측 메뉴 → **API 및 서비스 → OAuth 동의 화면**
2. **User Type**: 외부 → "만들기"
3. 앱 정보:
   - 앱 이름: `Speech-Therapy`
   - 사용자 지원 이메일: 본인 이메일
   - 앱 로고: (선택)
   - 개발자 연락처: 본인 이메일
4. 범위: 기본만 — `userinfo.email`, `userinfo.profile`, `openid`
5. 테스트 사용자: 본인 이메일 + 가족 이메일 (검수 전엔 추가된 사용자만 로그인 가능)
6. 저장 → 게시 (검수 신청 — 트래픽 작으면 검수 안 받아도 100명까지 가능)

### 1.3 OAuth Client ID 발급

1. 좌측 메뉴 → **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
2. **애플리케이션 유형**: 웹 애플리케이션
3. 이름: `Speech-Therapy Web Client`
4. **승인된 자바스크립트 원본**:
   - `https://<your-vercel-domain>` (예: `https://speech-therapy-project-root.vercel.app`)
   - `http://localhost:4000` (로컬 dev)
5. **승인된 리디렉션 URI**:
   - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   - ⚠️ Supabase 의 callback URL — 본 앱의 `/auth/callback` 이 **아님**. Supabase 가 중간 hop.
6. "만들기" → 클라이언트 ID + 시크릿 발급
7. **메모**: Client ID + Client Secret 둘 다 복사

## 2. Supabase Dashboard — Google Provider 활성화

1. https://supabase.com/dashboard → 프로젝트 → **Authentication → Providers**
2. **Google** 항목 클릭 → "Enable"
3. 필드:
   - **Client ID**: 1.3 에서 복사한 ID
   - **Client Secret**: 1.3 에서 복사한 Secret
4. 저장
5. 같은 화면 상단의 **Callback URL (for OAuth)** 확인:
   - 형식: `https://<project>.supabase.co/auth/v1/callback`
   - 이 값이 1.3 의 "승인된 리디렉션 URI" 와 정확히 일치해야 함

## 3. Supabase Site URL 확인 (Redirect 안전 목록)

1. **Authentication → URL Configuration**
2. **Site URL**: `https://<your-vercel-domain>` (canonical, 끝 슬래시 없이)
3. **Redirect URLs**: `https://<your-vercel-domain>/auth/callback`

이 설정 안 되어 있으면 OAuth 후 Supabase 가 본 앱으로 리디렉트 안 함.

## 4. 동작 확인 (모바일/PC)

1. `/login` 접속
2. "**Google 로 계속하기**" 버튼 → Google 동의 화면 → 본인 계정 선택
3. 자동으로 `/auth/callback?code=...` → `/rewards` 리디렉트
4. 결과: 로그인된 상태 + 익명 시기의 별 누적 마이그레이션 됨

## 5. 흐름 (Magic Link vs Google OAuth)

```
Magic Link:
  /login → email 입력 → signInWithOtp 호출 → Supabase 이메일 발송
       → 사용자가 이메일 링크 클릭 → /auth/callback?code=... → 세션 + 마이그레이션

Google OAuth:
  /login → "Google 로 계속하기" → signInWithOAuth({provider:"google"}) 호출
       → Google 동의 화면 → Supabase 콜백 → /auth/callback?code=... → 동일 처리
```

= **/auth/callback 코드는 두 흐름 모두 동일** 처리 (Supabase 가 abstract).

## 6. 환경별 분리 권장

- **Preview deployment**: 별도 OAuth Client ID + Supabase 프로젝트 또는 redirect URI 추가
- **Production**: 별도 OAuth Client ID + canonical domain 만 사용

## 7. 흔한 문제

| 증상 | 원인 | 해결 |
|---|---|---|
| `redirect_uri_mismatch` | Google Cloud Console 의 "승인된 리디렉션 URI" 가 Supabase callback URL 과 안 맞음 | URL 정확히 복붙 (slash 차이도 안 됨) |
| 본 앱으로 안 돌아옴 (Supabase 화면에서 멈춤) | Supabase **Site URL** 또는 **Redirect URLs** 미설정 | URL Configuration 에 본 앱 URL 추가 |
| `unauthorized_client` | OAuth 동의 화면 게시 안 됨 + 테스트 사용자 미등록 | 본인 계정을 테스트 사용자에 추가 또는 앱 게시 |
| 익명 별 누적 안 옮겨짐 | anonymous_user_id cookie 가 OAuth flow 중 손실 | proxy.ts 가 cookie 재발급 → 마이그레이션 안 됨. 첫 진단 1회 후 재로그인 권장 |

## 8. 비용 / 한도

- **Google Cloud Console**: OAuth 발급 무료. 일일 100,000 회까지 무료 호출.
- **Supabase Auth**: 월 50,000 MAU 까지 무료 (Magic Link 와 동일 풀).
- **장점**: 이메일 SMTP rate limit (시간당 ~4통) 우회 가능.
