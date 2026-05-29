# TASK_FR-Q-CL-06 — ABA 6변수 적응형 난이도 보강

## 요구사항 출처
- SRS §4.1 임상 정밀도: **REQ-FUNC-CL-06** (ABA 6변수 + 정확도 80%/50% 임계)
- wiki `product/concepts/MVP-clinical-foundation` §3.1 (Tye-Murray Ch4)
- 정합: REQ-FUNC-021(3연속 실패 하향) / REQ-FUNC-022(5연속 성공 상향)

## 범위 (게이트)
- ✅ 적응형 **미션 추천** 엔진 (행동 신호) — 진단 채점 로직 무관 → 임상 자문 게이트 없음.
- ❌ 진단 채점(CL-01~04) 과 무관.

## 설계
1. **ABA 6변수 프로파일** — 6단계 위계(CL-05) 각 레벨을 6변수로 기술:
   자극 형태(폐쇄형↔개방형) / 단위(음소↔대화) / 유사성 / 맥락 / 과제(구조화↔자연) / SNR.
   `getAbaProfile(level)` — 임상 모델 인코딩(추천/HITL/임상 검토용 메타).
2. **정확도 임계 분류** — `classifyAccuracy(pct)`: ≥80% advance / <50% reduce / 그 외 maintain.
3. **비파괴 통합** — `decideRecommendation` 에 optional `accuracyPct`:
   streak 기반 결과가 **continue 일 때만** 정확도 밴드로 gentle nudge (advance→level_up / reduce→level_down).
   accuracy 미제공 시 기존 동작 100% 불변 (REQ-FUNC-021/022 streak 우선).
4. missions/page.tsx 가 최근 평가의 평균 articulationScore 를 accuracyPct 로 전달 (live, continue 한정).

## Acceptance Criteria
- [ ] `getAbaProfile(level)` 가 1~6 레벨에 대해 6변수 모두 채운 프로파일 반환 (단조 진행)
- [ ] `classifyAccuracy`: 80→advance / 79~50→maintain / 49→reduce 경계 정확
- [ ] `decideRecommendation` accuracy 미제공 시 기존 테스트 100% 유지 (회귀 0)
- [ ] continue + accuracy≥80 → level_up, continue + accuracy<50 → level_down (난이도 cap/floor 준수)
- [ ] streak 결정(phoneme_switch/level_down/level_up)은 accuracy 보다 우선 (nudge 는 continue 한정)
- [ ] CON-04 무관 (내부 로직)

## 영향 범위
- 파일: `lib/curriculum-aba.ts`(신규), `lib/curriculum.ts`(optional param), `app/(public)/missions/page.tsx`(accuracy 전달)
- 테스트: `__tests__/lib/curriculum-aba.test.ts`(신규), `__tests__/lib/curriculum.test.ts`(nudge 경로 추가)

## 의존성
- 선행: REQ-FUNC-CL-05 (6단계 위계). ✅ 완료
- 후속: 실 사용자 데이터 누적 후 임계/가중 튜닝 (SP3_2D 유사 단계화).

## 위험
- 정확도 nudge 는 continue 한정이라 영향 작으나, 실데이터 전 튜닝은 잠정 — 임계 변경 시 재검토.

## 검증
- [ ] vitest 통과 (회귀 0)
- [ ] tsc 0 errors (기존 baseline 제외)
- [ ] next build 통과
