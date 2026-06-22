# ADR — 북극성 2트랙(발음 W-AUR + 문해 W-LER)

> 상태: **Accepted (옵션 C 지향 · 옵션 A 1차 착지)** · 2026-06-22
> 근거 청사진: [`00_2track_realignment_blueprint.md`](00_2track_realignment_blueprint.md) §3(트랙정의)·§4(북극성)·§6(문서스펙)·§7(근거맵)·§8(게이트)
> source of truth(코드): `lib/reports/waur-trend.ts`, `lib/reports/weekly-aggregator.ts`(`W_AUR_MIN_MISSIONS`), `lib/reports/literacy-weekly.ts`(`aggregateLiteracyWeekly`)
> 불변 선언: **트랙A(발음)는 또래 비교로 "확인", 트랙B(문해)는 점수·밴드·판정 없이 "놀이·연습" — "측정 vs 측정"이 아니다.** 문해에 "확인(probe)/측정/평가/완수율" 동사 금지.

---

## 1. 맥락 (Context)

현 북극성 KPI는 **W-AUR(주간 발음 미션 완수율)** 단일 지표다(`lib/reports/waur-trend.ts`).

- **분자**(`achievedUsers`) = 그 주 미션 완료 ≥ `W_AUR_MIN_MISSIONS`(=4)인 distinct 사용자. 미션 완료 = `SessionLog(missionId != null AND durationSec > 0)`.
- **분모**(`activeUsers`) = 그 주 활성 distinct 사용자 = 발달 확인(`EvaluationResult`) ∪ 미션완료(`SessionLog`).
- target = `W_AUR_TARGET_RATE`(=0.6, PRD §1).

이 산식은 **발음 트랙(만2~7) 전용 활동만** 분자·분모로 본다. 2026-06-22 라이브 런치된 문해 트랙(만2~12, 14게임, `LiteracyResult` 영속)은 `SessionLog`/`EvaluationResult` 어디에도 기록되지 않으므로:

- **문해-only 가정**(예: 만8~12 학령기, 발음 미션·발달 확인 0건)은 분모(`activeUsers`)에서 구조적으로 **배제** → 북극성이 인지하지 못하는 활성 사용자 집단이 존재한다.
- 그 집단의 활동(문해 놀이)은 분자에도 잡히지 않는다.
- 결과적으로 북극성은 **제품 과업의 절반(트랙B)을 측정하지 못한다.** #109가 부모 표면(주간뷰 문해-only 카드)에는 이 갭을 반영했으나, **owner KPI 레벨엔 여전히 미반영**이다.

동시에 문해 트랙은 임상 비대칭 불변 제약 하에 있다: `lib/literacy/stages.ts`의 S0~S4 **전 단계 `bandShippable=false`**(Phase 2 규준검증 결과 출시 가능 모집단 밴드 0건 확정). 따라서 문해 집계(`aggregateLiteracyWeekly`)는 **engagement(총 횟수·활동일·단계별/놀이별 분포)만** 산출하고 `referenceBand=null`이다. **문해에는 발음의 "완수율/미션/또래비교/점수" 프레임을 절대 전이시킬 수 없다.**

→ 문제 정의: **북극성을 트랙B로 확장하되, 발음 산식을 회귀 없이 보존하고, 문해 비대칭(연습-only)을 지표 구조에서 깨뜨리지 않아야 한다.**

---

## 2. 결정 (Decision)

**옵션 C(이원 북극성)를 지향하되, 옵션 A(발음 W-AUR 불변 + 문해 보조 W-LER 신설)를 단계적 1차 착지점으로 채택한다.**

진행 경로:

1. **즉시(A 1차)** — 발음 W-AUR 산식·상수·시계열을 **불변(회귀 0)**으로 두고, 문해 **W-LER(주간 문해 활동률, engagement 기반)**을 **보조지표**로 신설한다. owner 표면(`/admin/waur` 인접)에 W-AUR과 나란히 노출하되, 동격 헤드라인이 아닌 보조 위치.
2. **baseline 축적** — W-LER을 수 주간 측정해 연습-only 자연 활동 빈도의 baseline을 확보한다.
3. **C 승격** — baseline 확보 후 W-LER을 W-AUR과 **동격 북극성 한 쌍(이원 북극성)**으로 승격한다. 트랙별로 각자의 모집단·임계·target을 가지며, 종합 판단 규칙을 별도 정의한다.

**옵션 B(통합 단일 rate)는 거부한다**(§5 참조).

---

## 3. W-LER 정의 (보조지표 → 이원 동격)

**W-LER = 주간 문해 활동률 (engagement 기반, 완수율 아님)**

| 구성 | 정의 |
|---|---|
| **분자** | 그 주 문해 활동이 **기준 이상**인 문해대상 distinct 사용자. 기준 = `W_LER_MIN_DAYS`(활동일) **또는** `W_LER_MIN_SESSIONS`(활동 횟수) 중 lib 단일 상수로 확정(§3.1). 활동 = `LiteracyResult` 행(활성 플래그 게임 한정, `enabledLiteracyGames()` 정합). |
| **분모** | 그 주 **문해대상 활동 가능 distinct 사용자**. 즉 문해 연령 도메인(만2~12 = `childAgeMonths` 24~144) 안에서 그 주 문해 활동을 1건이라도 한 사용자(= 그 주 활성 문해 모집단). |
| **rate** | 분자 / 분모 (분모 0 → 0). 분자 ⊆ 분모 이므로 rate ≤ 1. |

설계 근거(W-AUR 대칭 보존 + 비대칭 준수):

- **분모 = "그 주 문해 활동 ≥1건 한 만2~12 사용자"** — W-AUR 분모가 "그 주 활성(발달 확인∪미션) distinct 사용자"인 것과 같은 **그-주-활성** 의미를 문해 도메인에서 재현한다. 발음 분모(발달 확인∪미션완료)와 문해 분모(문해 활동)는 **연령 도메인이 분리**(발음 ≤84개월 / 문해 24~144개월)되어 서로 오염되지 않는다.
- **engagement만** — 분자 기준은 "정답수/정확도/완료율"이 아니라 **활동 빈도(활동일 또는 활동 횟수)**다. `aggregateLiteracyWeekly`가 이미 `totalSessions`/`activeDays`만 집계하고 점수 합산을 명시적으로 거부하는 것과 정합. `referenceBand=null`·`bandShippable=false` 불변.
- **distinct user only** — `userId`만 사용(R4), 자녀 식별 정보 0건. W-AUR과 동일 프라이버시 가드.

### 3.1 임계 상수 (lib 단일 출처)

W-LER 임계는 **lib 상수 1곳에 박고** owner 페이지·테스트가 그 상수만 참조한다(정의 표류 차단 — W-AUR의 `W_AUR_MIN_MISSIONS`/`W_AUR_TARGET_RATE` 가드 패턴 답습).

```ts
// lib/reports/literacy-weekly.ts (또는 weekly-aggregator 인접 단일 출처)
/// W-LER 충족 최소 문해 활동(주). engagement 기준 — "완수"가 아님.
/// 변경 시 owner 페이지 + 단위 테스트가 본 상수로 동기 = source of truth.
export const W_LER_MIN_DAYS = 2;       // (제안) 그 주 서로 다른 활동일 ≥2
// 또는 활동일 신호가 약하면(짧은 세션 다수) 횟수 기준 택일:
// export const W_LER_MIN_SESSIONS = 3;
```

- **택일 권고**: 활동일(`W_LER_MIN_DAYS`)을 우선 — "매주 꾸준히"라는 트랙B 가치제안(습관·리텐션)과 직결되고, 한 번에 몰아치는 세션 수보다 지속성을 더 정직하게 반영한다. `activeDays`는 이미 `aggregateLiteracyWeekly`가 산출.
- **두 상수를 동시 도입하지 않는다** — 분자 기준 정의가 하나여야 표류·해석 충돌이 없다. baseline 데이터 확인 후 신호가 약하면 한쪽으로 교체(단일 출처라 1곳만 수정).
- 제안값 `2`는 **placeholder**다 — baseline 전이므로 §4의 무근거 차용 금지 가드를 받는다.

---

## 4. 연습-only 가드 (트랙B 불변)

W-LER 신설이 트랙B 비대칭을 깨지 않도록 다음을 강제한다.

- **engagement만** — 분자·분모·표면 카피 어디에도 점수·밴드·또래백분위·정상/위험 판정·심각도 0건. 산출은 활동 빈도(횟수·활동일)뿐. `referenceBand=null`.
- **"완수율" 프레임 금지** — 지표명·owner 라벨·문서 서술 모두 **"활동률/engagement"**로만. "완수율"·"미션"·"달성"·"성취" 어휘 금지(발음 W-AUR 전용). W-AUR이 "completion(완수)"인 것과 달리 W-LER은 "참여(engagement)"다 — 이름이 프레임을 결정하므로 명칭부터 분리.
- **"확인(probe)/측정/평가" 동사 금지** — 문해 동사 = 놀이/연습/함께/단계에 맞춰. 또래 비교 "확인"은 발음(트랙A) 전용.
- **target ≥60% 무근거 차용 금지** — 발음 `W_AUR_TARGET_RATE=0.6`은 발음 미션 완수의 근거값이다. 연습-only 활동의 자연 빈도는 미션 완수와 분포가 다르므로 **0.6을 차용하면 연습-only 자연 빈도를 오도**한다. **W-LER target은 A 1차에서 baseline 측정 후 산정**한다 — baseline 전에는 target 없이 rate 추세만 노출(target 라인 미표기).
- **stage 라벨 미노출(clin-2)** — owner 집계는 단계(stage) 분포를 내부 계산에 쓰되, 부모 표면엔 학년/단계 라벨 대신 놀이명만(기존 불변).
- **연령 도메인 분리** — W-LER 분모는 `childAgeMonths` 24~144만. 발음 ≤84개월과 교차 오염 금지.

---

## 5. 거부 옵션 — B (통합 단일 WAE) 사유

옵션 B = 단일 rate, 분자 = 발음 미션 ≥4 **OR** 문해 놀이 ≥기준, 분모 = 발음·문해 합산 활성 모집단.

거부 사유:

1. **비대칭 평탄화 → CON 충돌(치명)** — 발음(완수·또래비교 "확인")과 문해(engagement·연습-only)를 하나의 rate로 합치면, 단일 헤드라인이 불가피하게 "완수/미션/달성" 프레임을 띤다. 이 프레임이 문해 측에 전이되는 순간 **CON-04 + 연습-only + `bandShippable=false`** 불변을 동시에 위반한다. 문해에 "완수율"을 금지한 핵심 제약과 정면 충돌.
2. **발음 시계열 단절** — 분모/분자 정의가 바뀌므로 기존 W-AUR 시계열이 끊긴다. owner의 ≥60% target 해석이 왜곡되고 rate 인플레(문해 활동 유입으로 분자 팽창) 위험.
3. **모집단 일치라는 장점이 비대칭을 가린다** — 단일 rate는 "어느 트랙이 약한지" 분해 불가. 트랙별 개입 의사결정 불능.

→ B의 유일한 장점(단일 헤드라인·모집단 일치)은 이원 지표 종합 판단 규칙(C)으로 충분히 대체 가능하며, 그 대가로 불변 제약을 깨므로 **비권장**.

---

## 6. 구현 메모 (회귀 0)

- **발음 산식 불변** — `lib/reports/waur-trend.ts`(`computeWaurForWeek`/`getRecentWaurTrend`)와 `W_AUR_MIN_MISSIONS`/`W_AUR_TARGET_RATE`는 **한 줄도 수정하지 않는다**. 발음 회귀 0 = 본 ADR의 수용 조건.
- **W-LER 집계 신설** — `lib/reports/literacy-weekly.ts`에 **`computeWlerForWeek(year, week)`** 신규 함수 추가(`computeWaurForWeek`와 대칭 시그니처). 반환 = `{ year, week, eligibleUsers(분모), activeUsers(분자), rate }`. 기존 순수 함수 `aggregateLiteracyWeekly`(per-user)는 보존하고, W-LER은 **집단(distinct user)** 집계를 별도로 수행.
  - 분모/분자 모두 `LiteracyResult`를 `weekBounds(year, week)` 구간 + `enabledLiteracyGames()` slug 필터 + `childAgeMonths` 24~144 가드로 조회. `groupBy(["userId"])` + having(활동일/횟수 ≥ 상수)로 분자 distinct 산출(W-AUR `achievedGroups` 패턴 답습).
  - graceful — 실패 시 0 채움(`computeWaurForWeek`와 동일 정책). `userId`만 사용(R4).
  - `aggregateLiteracyWeekly`가 활동일을 `createdAt.toISOString().slice(0,10)`(UTC 근사)로 세는 TZ 한계가 있으므로, 활동일 기준(`W_LER_MIN_DAYS`)이면 동일 KST 보정 정책을 적용해 `weekBounds`(KST)와 정합시킨다.
- **추세 함수** — `getRecentWlerTrend(now, weeks)`를 `getRecentWaurTrend` 대칭으로 신설(현재 주 제외, 직전 주부터).
- **owner 표면** — `/admin/waur`에 W-LER 보조 패널 추가(또는 인접 라우트). A 1차에선 target 라인 없이 rate 추세만. 동격 헤드라인 승격은 C 단계에서.
- **상수 단일 출처** — §3.1 상수를 lib 1곳에 export하고 owner 페이지·테스트가 그 상수만 import.

---

## 7. Stage B 후속 (실행 순서 의존)

본 ADR(북극성 옵션 확정)은 청사진 §9 실행 순서의 **1번 — 모든 KPI 서술의 선행 의존**이다. 후속:

- **AGENTS.md §1·§2.1** — 북극성 KPI 서술을 본 결정(W-AUR 불변 + W-LER 보조 신설 → 이원 동격)으로 동기화. (이미 §1에 2트랙 KPI 반영됨 — 본 ADR이 정본 근거.)
- **PRD V11 §1.3** — 트랙별 북극성 표(발음 W-AUR / 문해 W-LER) 신설, KPI = 발음 W-AUR + 트랙B 보조 engagement.
- **SRS V08** — W-LER을 REQ-LIT 측정 REQ가 **아닌** engagement 지표로 firewall(연습-only).
- **코드(청사진 §9-7)** — `computeWlerForWeek` + 상수 + owner 표면 구현(옵션 A 1차) → baseline 데이터 축적.
- **C 승격 게이트** — baseline 수 주 확보 → W-LER target 산정 → 이원 동격 승격 + 종합 판단 규칙 정의(별도 ADR 또는 본 ADR 개정).

---

## 8. 결과 (Consequences)

- (+) 북극성이 트랙B(과업 절반)를 인지 — 문해-only 가정의 owner KPI 갭 해소.
- (+) 발음 회귀 0, 비대칭(연습-only) 지표 구조에 보존, CON-04 위반 0.
- (+) 두 집계가 코드에 이미 분리 존재 → 함수 추가만으로 즉시 실측.
- (−) baseline 확보 전까지 W-LER target 부재(추세만) — 단일 절대 기준 없는 임시 상태.
- (−) 이원 지표(C) 승격 시 종합 판단 규칙 필요 — 후속 결정 항목으로 이월.
