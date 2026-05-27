# Speech-Therapy 변호사 자문 의뢰 자료

> **목적**: PIPA / 의료기기법 / 약관규제법 등 관련 법령 적합성에 대한 단발 자문 의뢰용.
> **작성일**: 2026-05-27 (Grill #3A 컴플라이언스 sub-session 완료 직후)
> **자문 의뢰 후 갱신**: 자문 결과 반영하여 본 doc 의 §6 (Action Items) 후 정식 코드/약관 교체.
> **예상 자문 비용**: 30~50만 원 (단발 의견서) — 사용자 별도 확보.
> **예상 자문 기간**: 2~4주.

---

## §1. 서비스 정체성

### 1.1 제품 개요

- **제품명**: Speech-Therapy
- **포지셔닝**: 만 2~7세 자녀의 발음 발달을 부모님께서 직접 확인 / 안내할 수 있는 **발달 가이드용 보조 도구** (Non-Medical Device)
- **명시 정책**: **의료기기 아님** — 의료적 진단 / 치료 / 처방 제공하지 않음.
- **사업 모델**: B2C (무료 5분 진단 + 유료 미션 / 보상 / 주간 리뷰) + B2B (어린이집 / 유치원 도입)

### 1.2 사용자 유형

| 유형 | 권한 | PIPA 관점 |
|---|---|---|
| 익명 (무로그인) | 5분 진단 + 결과 확인 + 1회성 보상 | 자녀 음성 → 텍스트 + 발달 점수 처리 |
| 인증 (회원) parent | 진단 + 미션 + 주간 리뷰 + 보상 적립 | 위 + 본인 식별자 (email) + 영속 누적 데이터 |
| 인증 teacher | B2B 자녀 일괄 등록 + 부모 알림 발송 | 자녀 정보 입력 + 부모 동의 (별도 ConsentSignature 흐름) |
| 인증 principal | B2B 원장 — 반 / 원아 대시보드 | 기관 단위 통계 (자녀 식별 정보 미노출) |
| 인증 expert | HITL (Human-in-the-Loop) 전문가 검토 | Confidence < 70 시 발화 텍스트 검토 |

### 1.3 데이터 흐름 요약

```
[자녀 발화 (음성)]
  ↓ 사용자 브라우저 (마이크)
  ↓ Web Speech API → Chrome → Google Cloud Speech (미국, 음성 → 텍스트)
[transcript (텍스트)]
  ↓ 본 서비스 Vercel 서버 (한국 / 미국 region)
  ↓ Prisma + Supabase PostgreSQL (DB, 미국 region)
  ↓ Google AI Studio Gemini (미국 / 글로벌, 부모용 안내 문구 생성)
[발달 점수 + 안내 문구]
  ↓ 사용자 브라우저 (결과 표시)
```

**중요 사항**:
- 음성 원본 (raw audio) 은 **본 서버 미저장** (Sprint 1 D6 정책 — 클라이언트 측 STT 후 텍스트만 전송)
- transcript 는 Gemini 호출 전 PII 마스킹 (lib/ai/pii-mask.ts, 한국 PIPA 7 패턴: 주민등록번호 / 신용카드 / 이메일 / 전화번호 / URL / IP / 한국식 상세 주소)
- 자녀 식별 정보 (이름 / 생년월일 / 주소) 미저장 — 월령 (만 2~7세 = 24~84개월) 만 저장

---

## §2. 적용 법령 (자문 범위)

### 2.1 개인정보 보호법 (PIPA)

| 조항 | 적용 사항 |
|---|---|
| §17 (개인정보 국외 이전) | Google Cloud Speech (미국) + Google AI Studio Gemini (미국 / 글로벌) + Supabase (미국) + Vercel (미국) + Resend (미국) 위탁 / 이전 |
| §22-6 (만 14세 미만 법정대리인 동의) | 자녀 발화 / 발달 점수 처리 시 부모 대리 동의 |
| §30 (개인정보 처리방침) | 9 섹션 골격 (`/privacy` placeholder 작성, §6.5 참조) |
| §32 (개인정보 처리 위탁) | Supabase / Vercel / Resend / Google AI 처리위탁 명시 |

### 2.2 의료기기법

| 조항 | 자문 필요 사항 |
|---|---|
| 의료기기 정의 (§2) | 본 서비스의 "비의료기기 (Non-Medical Device)" 분류 적정성 |
| 의료기기 제외 (가이드라인) | 식약처 "평가 이력 건강관리용 소프트웨어 가이드라인" (2022 이후) 의 본 서비스 적용 여부 |
| 신고 의무 | 비의료기기 명시에도 시정 명령 / 신고 위험 |

### 2.3 약관규제법 / 정보통신망법

| 조항 | 적용 사항 |
|---|---|
| 약관규제법 §3 (명시) | `/terms` 의 회원 의무 / 책임 제한 / 약관 변경 절차 |
| 정보통신망법 §22 (수집·이용) | 회원가입 시 동의 절차 (현재 onboarding Step2 + /settings/privacy-consent) |
| 정보통신망법 §50 (영리 목적 광고) | weekly_report / consent_reminder 등 자동 이메일 발송 (Resend) |

---

## §3. 현재 구현 상태 (2026-05-27 sub-session 19 commits 완료)

### 3.1 동의 흐름 (PIPA §22-6 + §17 통합)

**인증 user**:
- 회원가입 후 onboarding wizard Step2 — 자녀 정보 입력과 함께 두 동의 체크박스 (PIPA §22-6 부모 대리 동의 + §17 국외 이전 동의)
- 동의 일시 DB 영속: `User.pipaUnderageConsentAt` + `User.overseasTransferConsentAt`
- 별도 관리 페이지: `/settings/privacy-consent` (동의 상태 확인 + 재동의)
- 미동의 가드 (UI redirect + Server Action throw 5중) — 진단 / 미션 / 리포트 / 자녀 정보 수정 / Gemini 호출 모두 차단

**익명 user**:
- 진단 페이지 (`/diagnose`) inline 체크박스 2개 (필수)
- localStorage 마커 (`pipa_consented_at` + `overseas_consented_at`) — 재방문 자동 prefill
- 동의 일시 DB 영속 (같은 User 컬럼 재사용, anonymous_user_id = User.id)
- Server Action hard 가드 — 두 boolean 미체크 시 ConsentRequiredError throw

### 3.2 의료기기법 disclaimer

- 전역 footer (`MedicalDisclaimerFooter`): "본 서비스는 의료기기가 아닙니다 ... 의학적 평가가 아닌 발달 안내" + `/privacy` + `/terms` 링크
- 진단 결과 페이지 disclaimer 3중 (상단 + 결과 카드 + 하단)
- 모든 카피에서 의료 단정 금칙어 사용 금지 (코드 자동 검사): "치료" / "진단" / "장애" / "환자" / "병" / "증상" / "처방" / "병원" / "아프" / "문제아"

### 3.3 처리방침 / 약관 페이지 (placeholder)

- `/privacy` — PIPA §30 9 섹션 골격 (수집/목적/14세 미만/보유 기간/처리위탁/국외 이전/권리/책임자/이력)
- `/terms` — 8 조 골격 (목적/비의료기기 정의/만 14세 미만 부모 동의/국외 이전/회원 의무/중단/책임 한계/약관 변경)
- **변호사 자문 후 정식 교체 예정** (본 의뢰의 산출물)

### 3.4 PII 마스킹 (Gemini 호출 전)

- `lib/ai/pii-mask.ts` — 한국 PIPA 7 패턴 정규식 마스킹: 주민등록번호 / 신용카드 / 이메일 / 전화번호 (국내 + 국제) / URL / IPv4 / 한국식 상세 주소
- 위양성 회피: 한국 인명 / 학교 / 시설 이름 등은 마스킹 안 함 (일반 명사 충돌 risk)

### 3.5 보안 감사 (REQ-NF-019)

- PostgreSQL TRIGGER 자동 capture (audit_log_triggers migration) — User / HITLQueue / RewardLog 변경 시 actor_id GUC 캡처 → AuditLog 적재
- application-level 명시 INSERT (lib/audit.ts) 와 보완 관계

---

## §4. 자문 요청 항목

### 4.1 PIPA §22-6 부모 대리 동의 — 표현 적정성

**현재 표현**:
> [필수] 만 14세 미만 자녀의 개인정보 처리에 동의합니다 (PIPA §22조 6항)
> 자녀 (만 2~7세) 의 발화 텍스트 (transcript), 월령, 발달 점수 등 개인정보를
> Speech-Therapy 가 발달 가이드 목적으로 처리하는 데 법정대리인 (부모) 의
> 동의가 필요해요.

**자문 사항**:
- "법정대리인 (부모)" 표현이 충분한가? 부 / 모 모두 가능한가, 또는 한쪽만 가능한가?
- 무로그인 진단의 경우 부모 본인 확인 절차 없이 체크박스만으로 PIPA §22-6 동의 효력 발생 여부?
- "발화 텍스트" / "발달 점수" 외에 명시해야 할 수집 항목 있는지?
- 동의 철회 절차 (현재 `/settings/privacy-consent` 또는 계정 삭제 통한 철회) 명시 충분 여부?

### 4.2 PIPA §17 국외 이전 동의 — 항목 충분성

**현재 표현**:
> [필수] 개인정보 국외 이전에 동의합니다 (PIPA §17조)
> 발화 텍스트와 발달 점수가 외부 AI 서비스로 이전돼요:
> - Google Cloud Speech (미국) — 음성 → 텍스트 변환 (Web Speech API 경유, 브라우저에서 직접 전송)
> - Google AI Studio Gemini (미국 / 글로벌) — 부모용 안내 문구 생성
> 보존 기간: 각 서비스 정책에 따름 (Google 30일 임시 캐시 / Speech-Therapy transcript 보존).
> 동의 철회는 본 페이지 또는 계정 삭제로 가능.

**자문 사항**:
- PIPA §17 6항 (이전 받는 자, 국가, 일시, 항목, 목적, 보유 기간, 거부 방법) 모두 명시되었는지?
- Google Cloud Speech (브라우저 → 직접 이전, 본 서버 미경유) 의 경우에도 본 서비스가 동의 책임이 있는지?
- Supabase (미국 region DB) / Vercel (미국 region 호스팅) / Resend (미국, 이메일) 도 별도 동의 항목으로 명시해야 하는지?
- "Google 30일 임시 캐시" 표현이 Google AI 서비스 약관에 맞는지?

### 4.3 의료기기법 분류 — 식약처 사전 검토 신청 필요 여부

**현재 표현 (footer)**:
> ⚠️ 본 서비스는 의료기기가 아닙니다.
> Speech-Therapy 는 만 2~7세 자녀의 발음 발달을 부모님께서 직접 확인하실 수 있도록
> 돕는 발달 가이드용 보조 도구예요. 의학적 평가가 아닌 발달 안내를 제공해요.

**자문 사항**:
- 식약처 "건강관리용 소프트웨어 가이드라인" (2022 이후) 의 본 서비스 적용 여부?
- 본 서비스가 의료기기로 신고해야 하는지, 아니면 "건강관리용 소프트웨어" 로 무신고 가능한지?
- 식약처 사전 검토 신청 (무료) 필요 여부?
- "발달 가이드용 보조 도구" / "발음 발달 확인" / "또래 비교" 표현이 의료기기법 위반 / 시정 명령 risk 있는지?
- 향후 HITL 전문가 (언어재활사 자격증 보유) 검토 결과 표시 시 의료기기 분류 영향 있는지?

### 4.4 처리방침 (`/privacy`) — 정식 버전 작성

**현재 placeholder (PIPA §30 9 섹션 골격)**:
1. 수집·이용하는 개인정보 항목
2. 수집·이용 목적
3. 만 14세 미만 자녀의 개인정보 처리 (§22-6)
4. 보유·이용 기간
5. 개인정보 처리위탁 (Supabase / Vercel / Resend)
6. 개인정보 국외 이전 (§17)
7. 정보주체의 권리
8. 개인정보 보호 책임자
9. 개정 이력

**자문 사항**:
- 9 섹션 골격 외 PIPA / 정보통신망법 / GDPR (유럽 사용자 대비) 의 필수 조항 추가 있는지?
- "개인정보 보호 책임자" 의 이름 / 이메일 / 연락처 명시 필수 시 사용자 본인이 맡는 형식 가능한지?
- "감독기관" (개인정보보호위원회 / 한국인터넷진흥원) 신고 절차 명시 필수 여부?

### 4.5 이용약관 (`/terms`) — 정식 버전 작성

**현재 placeholder (8 조 골격)**:
1. 목적
2. 서비스의 정의 (의료기기 아님)
3. 회원가입 및 만 14세 미만 자녀의 부모 동의
4. 국외 이전 동의
5. 회원의 의무
6. 서비스 제공의 중단
7. 책임의 한계
8. 약관의 변경

**자문 사항**:
- 약관규제법 §3 (명시) 의 필수 조항 누락 있는지?
- "책임의 한계" 표현이 면책 범위 적정한지? (의료적 의사결정에 본 서비스 결과 만을 근거로 한 결정에 대한 책임 면제)
- B2B (어린이집 / 유치원) 가입 시 별도 약관 필요한지, 본 약관 으로 cover 가능한지?
- 미성년자 (만 14세 이상 본인) 가입 정책 명시 필요 여부?

### 4.6 transcript 의 PIPA 민감정보 분류 여부

**상황**: 자녀 발화 transcript (Web Speech API 결과 텍스트) — 본 서버에 저장 (`SessionLog` + `EvaluationResult.transcript`).

**자문 사항**:
- 자녀 발화 텍스트가 PIPA §23 민감정보 (사상·신념·노조·정치적 견해·건강·성생활 정보) 또는 §24 고유식별정보 (주민등록번호 등) 에 해당할 가능성 있는지?
- 발화 안에 우발적으로 포함된 PII (자녀가 자기 이름을 발화 등) 의 책임 분배?
- PII 마스킹 (lib/ai/pii-mask.ts) 의 7 패턴 외 추가 패턴 필요 여부 (예: 학교 이름 / 병원 이름)?

### 4.7 B2B 동의서 (ConsentSignature) 흐름

**현재 구현**: 원장 / 교사가 부모에게 동의서 발송 (이메일) → 부모가 본인 자녀 정보 처리 동의 → 원장이 자녀 일괄 등록 가능.

**자문 사항**:
- 원장 / 교사가 자녀 음성 / 발화 데이터 처리 시 부모 동의 외 추가 동의 (예: 교육법 / 영유아보육법) 필요 여부?
- "교사" 가 "법정대리인" 으로 동의 가능한지, 또는 항상 부모만 가능한지?
- 위탁 흐름 (어린이집 → Speech-Therapy → Google AI) 의 동의서 양식 적정성?

---

## §5. 요구 산출물 (변호사)

| 산출물 | 형태 |
|---|---|
| 1. **자문 의견서** | §4.1~§4.7 각 항목별 법적 위험 + 권고 조치 (서면) |
| 2. **개인정보 처리방침 정식안** | 본 doc §3.3 placeholder 의 변호사 정식 교체본 |
| 3. **이용약관 정식안** | §3.3 placeholder 의 변호사 정식 교체본 |
| 4. **PIPA 동의 표현 검토** | §4.1 + §4.2 의 체크박스 / 안내 문구 표현 권고 |
| 5. **식약처 사전 검토 신청 권고** | §4.3 의 신청 필요 여부 + 신청 시 자료 가이드 |
| 6. **출시 직전 체크리스트** | 변호사 관점에서 출시 전 필수 확인 항목 list |

---

## §6. Action Items (자문 의뢰 → 결과 반영 후)

자문 결과 받은 후 본 doc 의 §6 에 결과 요약 + 다음 코드 / 정책 교체 작업 list 작성.

### 자문 의뢰 전 사용자 측 준비

- [ ] 변호사 선정 (개인정보 + 의료기기법 전문, IT 서비스 경험 있는 분 권장)
- [ ] 자문료 30~50만원 예산 확보
- [ ] 본 doc 변호사 전달 (PDF 또는 markdown viewer)
- [ ] 미팅 일정 (1~2시간) — 추가 질의 응답 가능

### 자문 결과 받은 후 코드 / 정책 작업

- [ ] §3.3 의 `/privacy` placeholder → 정식 처리방침 교체
- [ ] §3.3 의 `/terms` placeholder → 정식 이용약관 교체
- [ ] PIPA 동의 체크박스 / 안내 문구 권고 반영 (필요 시)
- [ ] 식약처 사전 검토 신청 (권고 시)
- [ ] 출시 직전 체크리스트 통과 검증

---

## §7. 참고 자료 (코드 위치)

| 항목 | 파일 |
|---|---|
| 동의 페이지 (인증 user) | [`app/(public)/settings/privacy-consent/page.tsx`](../app/(public)/settings/privacy-consent/page.tsx) |
| 동의 폼 (인증 user) | [`components/settings/PrivacyConsentForm.tsx`](../components/settings/PrivacyConsentForm.tsx) |
| 동의 폼 (익명 user) | [`app/(public)/diagnose/DiagnosisForm.tsx`](../app/(public)/diagnose/DiagnosisForm.tsx) (inline 체크박스) |
| 동의 hook (익명) | [`lib/hooks/useAnonymousConsent.ts`](../lib/hooks/useAnonymousConsent.ts) |
| Server Action 가드 | [`lib/policy/consent-guard.ts`](../lib/policy/consent-guard.ts) |
| UI 가드 (인증 user) | [`components/consent/ConsentRedirectGate.tsx`](../components/consent/ConsentRedirectGate.tsx) |
| PII 마스킹 | [`lib/ai/pii-mask.ts`](../lib/ai/pii-mask.ts) |
| 의료 disclaimer footer | [`components/MedicalDisclaimerFooter.tsx`](../components/MedicalDisclaimerFooter.tsx) |
| 처리방침 placeholder | [`app/(public)/privacy/page.tsx`](../app/(public)/privacy/page.tsx) |
| 이용약관 placeholder | [`app/(public)/terms/page.tsx`](../app/(public)/terms/page.tsx) |
| Prisma 동의 컬럼 | [`prisma/schema.prisma`](../prisma/schema.prisma) (User 모델의 pipaUnderageConsentAt + overseasTransferConsentAt) |
| 의료 금칙어 정책 | [`AGENTS.md`](../AGENTS.md) §2.1 (CON-04) |

---

**— End of Consultation Brief, 2026-05-27 —**
