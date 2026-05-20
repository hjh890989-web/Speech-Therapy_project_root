# Post-mortem 템플릿

> MON-004 / REQ-NF-008 (MTTR < 2h) — 인시던트 발생 시 본 템플릿을 복사해 `docs/postmortems/YYYY-MM-DD-{slug}.md` 로 작성.
> 비난 없는 (blameless) 원칙. 사람 책임이 아닌 시스템/프로세스 개선 관점.

---

## 메타데이터

- **인시던트 ID**: INC-YYYY-MM-DD-NN
- **발생 시각 (UTC)**: YYYY-MM-DD HH:MM
- **감지 시각**: YYYY-MM-DD HH:MM
- **복구 시각**: YYYY-MM-DD HH:MM
- **총 다운타임**: NN 분
- **심각도**: SEV-1 (전체 서비스 중단) / SEV-2 (주요 기능 장애) / SEV-3 (일부 기능 저하) / SEV-4 (사용자 영향 최소)
- **영향 받은 사용자 수**: 약 NN 명 (또는 비율 N%)
- **작성자**: @handle
- **검토자**: @handle

---

## 1. 요약 (TL;DR)

**무엇이 발생했는가** — 2~3 문장으로 비기술자도 이해 가능한 수준.

예시: "2026-XX-XX HH:MM 부터 HH:MM 까지 약 NN 분 동안 `/diagnose` 페이지의 발음 분석 결과가 표시되지 않았습니다. 원인은 Gemini API rate limit 초과였고, 자동 fallback 이 활성화되어 사용자에게 임시 안내 메시지가 노출됐습니다."

---

## 2. 영향 (Impact)

- **사용자 경험**: 어떤 페이지/기능이 어떻게 동작하지 않았는지
- **데이터 손실**: 있음/없음. 있다면 범위 (RPO 측정값)
- **외부 의존성**: 영향 받은 외부 서비스 (Gemini / Supabase / Resend 등)
- **비즈니스 영향**: 전환율 / MAU / 매출 영향 추정 (있다면)

---

## 3. 타임라인 (UTC)

| 시각 | 이벤트 |
|---|---|
| HH:MM | 발생 (root cause 시점) |
| HH:MM | 감지 (모니터 알림 / 사용자 보고) |
| HH:MM | 1차 대응 시작 (담당자, 첫 조치) |
| HH:MM | 원인 식별 |
| HH:MM | 임시 조치 (workaround) |
| HH:MM | 영구 수정 배포 |
| HH:MM | 복구 확인 (헬스체크 통과) |

**MTTR**: 감지 ~ 복구 = NN 분 (REQ-NF-008 < 2h 목표)

---

## 4. 근본 원인 (Root Cause)

**5 Whys** 또는 **Fishbone** 으로 표면 원인 → 근본 원인 추적.

예시:
1. 왜 결과가 표시되지 않았나? → Gemini API 가 429 반환
2. 왜 429 가 발생했나? → 요청량이 RPM 제한 초과
3. 왜 RPM 초과가 발생했나? → 동시 진단 사용자 수가 급증 + rate limiter 미적용
4. 왜 rate limiter 가 없었나? → SEC-004 task 가 P0 였으나 미배포
5. 왜 미배포 상태가 운영에 노출됐나? → 출시 체크리스트에 SEC-004 누락

→ **근본 원인**: 출시 체크리스트 결함 (절차) + SEC-004 미구현 (구현)

---

## 5. 해결 조치 (Resolution)

- **즉시 조치 (workaround)**:
  - 예: 결과 페이지에 "분석이 일시 지연되고 있어요" 메시지 노출
- **영구 수정 (fix)**:
  - 예: SEC-004 rate limiter 배포 + fallback 메시지 정식화
- **롤백 여부**: 했음 / 안 함. 했다면 어떤 커밋으로

---

## 6. 재발 방지 (Action Items)

작업 단위로 분리하고 owner + due date 명시. **GitHub Issue 로 생성**.

| # | 액션 | 담당 | due | issue |
|---|---|---|---|---|
| 1 | SEC-004 rate limiter 배포 | @owner | YYYY-MM-DD | #NNN |
| 2 | 출시 체크리스트에 SEC 항목 추가 | @owner | YYYY-MM-DD | #NNN |
| 3 | Gemini 429 graceful fallback UI 정식화 | @owner | YYYY-MM-DD | #NNN |
| 4 | MON-002 (외부 API 에러율 alert) 통합 검증 | @owner | YYYY-MM-DD | #NNN |

---

## 7. 잘된 점 (What went well)

- 자동 fallback 이 동작해 5xx 페이지 노출 차단
- Slack 알림이 5분 내 감지
- 1차 대응자가 30분 내 임시 조치 적용

## 8. 잘 안된 점 (What went poorly)

- 출시 체크리스트에 보안 항목 누락
- rate limit alert 가 사후 인지 (preemptive 알림 부재)
- 사용자 안내 카피가 즉흥적으로 작성됨 (사전 준비 부재)

## 9. 운(luck) 의 역할

- 사용자 급증이 평일 새벽이었다면 사용자 영향이 훨씬 컸을 것
- Gemini API 가 429 만 반환하고 잘못된 데이터를 주지는 않음

---

## 10. 학습 (Lessons learned)

- 외부 API 의존성은 항상 rate limit + fallback 가정으로 설계
- 출시 체크리스트는 P0 보안 task 누락을 자동 차단하도록 CI 통합
- post-mortem 작성 자체가 가치 — 가능한 24h 내 작성, 1주일 내 검토 회의

---

## 11. 참조

- 관련 SRS: REQ-NF-NNN, REQ-FUNC-NNN
- 관련 task / PR: #NNN, commit ABCDEF
- 외부 서비스 status page: https://...
