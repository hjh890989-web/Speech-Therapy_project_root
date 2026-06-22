// 구강 운동(oral-motor) 프로브 단위 테스트 — DDK rate·MPT 측정(순수) + 규준 미판정 + 연령/플래그 + 콘텐츠.
// **측정만 — 판정/규준 산출이 없음**을 명시적으로 고정(ORAL_MOTOR_NORM_STATUS='deferred').

import { describe, it, expect, afterEach } from "vitest";
import {
  isOralMotorEnabled,
  isOralMotorAgeEligible,
  computeDdkRate,
  normalizeMptSeconds,
  summarizeOralMotor,
  ORAL_MOTOR_NORM_STATUS,
  ORAL_MOTOR_AGE_MIN_MONTHS,
  ORAL_MOTOR_AGE_MAX_MONTHS,
} from "@/lib/diagnose/oral-motor";
import {
  DDK_TASKS,
  MPT_TASK,
  DDK_DURATION_SEC,
} from "@/lib/diagnose/oral-motor-content";

const BANNED = ["치료", "진단", "장애", "지연", "지체", "정상", "위험"];

describe("oral-motor — 규준 상태", () => {
  it("ORAL_MOTOR_NORM_STATUS = 'active' (S063 원문 대조 후 참고 밴드 연결 — 판정 아님)", () => {
    expect(ORAL_MOTOR_NORM_STATUS).toBe("active");
  });
});

describe("computeDdkRate — DDK 속도(회/초)", () => {
  it("반복/시간 = 회/초 (소수 2자리)", () => {
    expect(computeDdkRate(20, 5)).toBe(4); // 20회/5초
    expect(computeDdkRate(23, 5)).toBe(4.6);
    expect(computeDdkRate(0, 5)).toBe(0);
  });
  it("기본 측정창 = DDK_DURATION_SEC(5초)", () => {
    expect(computeDdkRate(25)).toBe(computeDdkRate(25, DDK_DURATION_SEC));
    expect(computeDdkRate(25)).toBe(5);
  });
  it("비정상 입력 → null (음수·0초·NaN)", () => {
    expect(computeDdkRate(-1, 5)).toBeNull();
    expect(computeDdkRate(10, 0)).toBeNull();
    expect(computeDdkRate(10, -3)).toBeNull();
    expect(computeDdkRate(Number.NaN, 5)).toBeNull();
  });
});

describe("normalizeMptSeconds — MPT 지속(초)", () => {
  it("측정값 그대로(소수 1자리), 판정 없음", () => {
    expect(normalizeMptSeconds(7.34)).toBe(7.3);
    expect(normalizeMptSeconds(0)).toBe(0);
  });
  it("비정상 입력 → null", () => {
    expect(normalizeMptSeconds(-1)).toBeNull();
    expect(normalizeMptSeconds(Number.NaN)).toBeNull();
  });
});

describe("summarizeOralMotor — 값만 요약(판정 없음)", () => {
  it("측정 둘 다 → 값, 미측정(null) → null 보존", () => {
    expect(summarizeOralMotor(20, 7.34, 5)).toEqual({ ddkRatePerSec: 4, mptSeconds: 7.3 });
    expect(summarizeOralMotor(null, 5, 5)).toEqual({ ddkRatePerSec: null, mptSeconds: 5 });
    expect(summarizeOralMotor(20, null, 5)).toEqual({ ddkRatePerSec: 4, mptSeconds: null });
  });
});

describe("콘텐츠 무결성 + 금칙어", () => {
  it("DDK 과제 ≥2, id 유일, 필드 채움; MPT 과제 존재", () => {
    expect(DDK_TASKS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(DDK_TASKS.map((t) => t.id)).size).toBe(DDK_TASKS.length);
    for (const t of DDK_TASKS) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.syllables.length).toBeGreaterThan(0);
      expect(t.hint.length).toBeGreaterThan(0);
    }
    expect(MPT_TASK.label.length).toBeGreaterThan(0);
    expect(DDK_DURATION_SEC).toBeGreaterThan(0);
  });
  it("과제 라벨·안내에 의료/판정 금칙어 0건", () => {
    const corpus = [
      ...DDK_TASKS.flatMap((t) => [t.label, t.hint]),
      MPT_TASK.label,
      MPT_TASK.hint,
    ].join(" ");
    for (const w of BANNED) expect(corpus, `금칙어 "${w}"`).not.toContain(w);
  });
});

describe("연령 게이트 / 플래그", () => {
  it("연령 — 만 3~7세(36~84) 적격, 경계 밖 부적격", () => {
    expect(isOralMotorAgeEligible(ORAL_MOTOR_AGE_MIN_MONTHS)).toBe(true);
    expect(isOralMotorAgeEligible(ORAL_MOTOR_AGE_MAX_MONTHS)).toBe(true);
    expect(isOralMotorAgeEligible(ORAL_MOTOR_AGE_MIN_MONTHS - 1)).toBe(false);
    expect(isOralMotorAgeEligible(ORAL_MOTOR_AGE_MAX_MONTHS + 1)).toBe(false);
    expect(isOralMotorAgeEligible(Number.NaN)).toBe(false);
  });

  const original = process.env.ORAL_MOTOR_PROBE_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.ORAL_MOTOR_PROBE_ENABLED;
    else process.env.ORAL_MOTOR_PROBE_ENABLED = original;
  });

  it("플래그 — 미설정 off, 'true' on", () => {
    delete process.env.ORAL_MOTOR_PROBE_ENABLED;
    expect(isOralMotorEnabled()).toBe(false);
    process.env.ORAL_MOTOR_PROBE_ENABLED = "true";
    expect(isOralMotorEnabled()).toBe(true);
  });
});
