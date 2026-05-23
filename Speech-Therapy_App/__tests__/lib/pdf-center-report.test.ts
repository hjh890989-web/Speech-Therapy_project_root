// FR-Q-007 (#48) — lib/pdf/center-report.ts 단위 테스트.
//
// 검증 시나리오 (≥ 8):
//   1. 정상 데이터 → PDF Blob 생성 (mode=ko, bytes > 0)
//   2. 빈 stats (모든 평균 null, 음소 0건) → graceful placeholder (Blob 반환, throw X)
//   3. CON-04 금칙어 — childName 입력에 "치료" 포함 → fallback 라벨로 대체 + 본문 금칙어 0건
//   4. CON-04 — disclaimer 텍스트가 의료 disclaimer 키워드 ("발달 보조 자료") 포함
//   5. CON-04 — preview 텍스트 (모든 본문 라인) 에 PRIMARY_BANNED 금칙어 0건
//   6. englishFallback=true → mode=en + 영문 disclaimer
//   7. jsPDF 모듈 throw mock → en fallback 재시도 → 최종 placeholder Blob
//   8. childName / institutionName 미제공 → 기본 라벨 ("원아", "기관 미설정")
//   9. 한글 음소 + 영문 alias 병기 ("ㅅ (s)", "ㄹ (r/l)") 확인 (mode=ko)
//   10. R4 — preview 본문에 userId 등 임의 식별 정보 노출 0건

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  generateCenterReportPdf,
  previewCenterReportText,
  CENTER_REPORT_DISCLAIMER_KO,
  CENTER_REPORT_DISCLAIMER_EN,
  type CenterReportInput,
} from "@/lib/pdf/center-report";
import { hasBannedTerm, PRIMARY_BANNED } from "@/lib/forbidden-words";

function makeInput(overrides: Partial<CenterReportInput> = {}): CenterReportInput {
  return {
    childName: overrides.childName,
    childAgeMonths: overrides.childAgeMonths ?? 48,
    institutionName: overrides.institutionName,
    stats: overrides.stats ?? {
      totalDiagnoseCount: 12,
      articulationAvg: 75.4,
      linguisticAvg: 68.1,
      acousticAvg: 71.2,
      missionCount: 8,
      recentTargetPhonemes: ["ㅅ", "ㄹ", "ㅈ"],
    },
    generatedAt: overrides.generatedAt ?? new Date("2026-05-23T11:30:00Z"),
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateCenterReportPdf — FR-Q-007 PDF 생성", () => {
  it("[1] 정상 데이터 → PDF Blob 생성 (mode=ko, bytes > 0)", async () => {
    const result = await generateCenterReportPdf(makeInput());
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.mode).toBe("ko");
    expect(result.disclaimer).toBe(CENTER_REPORT_DISCLAIMER_KO);
  });

  it("[2] 빈 stats — 평균 null + 음소 0건 → graceful Blob 반환", async () => {
    const result = await generateCenterReportPdf(
      makeInput({
        stats: {
          totalDiagnoseCount: 0,
          articulationAvg: null,
          linguisticAvg: null,
          acousticAvg: null,
          missionCount: 0,
          recentTargetPhonemes: [],
        },
      }),
    );
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.mode).toBe("ko");
  });

  it("[3] CON-04 금칙어 — childName='치료팀' → 대체 라벨로 fallback, 본문 금칙어 0건", async () => {
    const lines = previewCenterReportText(makeInput({ childName: "치료팀" }));
    const joined = lines.join("\n");
    expect(joined).not.toContain("치료팀");
    // childName 라벨에 fallback ("원아") 사용.
    expect(joined).toContain("원아");
    // 본문 어디에도 PRIMARY_BANNED 매칭 없음.
    expect(PRIMARY_BANNED.test(joined)).toBe(false);
  });

  it("[4] disclaimer 텍스트가 의료 보조 자료 키워드 포함 + 금칙어 0건", () => {
    expect(CENTER_REPORT_DISCLAIMER_KO).toContain("발달 보조 자료");
    expect(CENTER_REPORT_DISCLAIMER_KO).toContain("전문 기관 상담");
    expect(hasBannedTerm(CENTER_REPORT_DISCLAIMER_KO)).toBe(false);
    expect(hasBannedTerm(CENTER_REPORT_DISCLAIMER_EN)).toBe(false);
  });

  it("[5] CON-04 — preview 모든 본문 라인에 금칙어 0건 (정상 + 빈 데이터)", () => {
    for (const input of [
      makeInput({ childName: "민준", institutionName: "햇님어린이집" }),
      makeInput({
        stats: {
          totalDiagnoseCount: 0,
          articulationAvg: null,
          linguisticAvg: null,
          acousticAvg: null,
          missionCount: 0,
          recentTargetPhonemes: [],
        },
      }),
    ]) {
      const lines = previewCenterReportText(input);
      for (const line of lines) {
        expect(hasBannedTerm(line)).toBe(false);
      }
    }
  });

  it("[6] englishFallback=true → mode=en + 영문 disclaimer", async () => {
    const result = await generateCenterReportPdf(makeInput(), {
      englishFallback: true,
    });
    expect(result.mode).toBe("en");
    expect(result.disclaimer).toBe(CENTER_REPORT_DISCLAIMER_EN);
  });

  it("[7] jsPDF throw → en fallback → 최종 placeholder Blob (throw X)", async () => {
    // 한국어 모드도 영문 모드도 모두 throw 하도록 mock.
    vi.doMock("jspdf", () => ({
      jsPDF: class {
        constructor() {
          throw new Error("jspdf failure");
        }
      },
    }));
    // 모듈 재import — vi.resetModules 로 ESM 캐시 무효화.
    vi.resetModules();
    const { generateCenterReportPdf: generateAgain } = await import(
      "@/lib/pdf/center-report"
    );
    const result = await generateAgain(makeInput());
    expect(result.blob).toBeInstanceOf(Blob);
    // placeholder Blob 도 size > 0 (disclaimer 텍스트가 들어감).
    expect(result.bytes).toBeGreaterThan(0);
    expect(result.mode).toBe("en");
    // doMock 정리.
    vi.doUnmock("jspdf");
    vi.resetModules();
  });

  it("[8] childName / institutionName 미제공 → 기본 라벨로 대체", () => {
    const lines = previewCenterReportText(makeInput());
    const joined = lines.join("\n");
    expect(joined).toContain("원아: 원아");
    expect(joined).toContain("기관: 기관 미설정");
  });

  it("[9] 한글 음소 + 영문 alias 병기 (mode=ko)", () => {
    const lines = previewCenterReportText(
      makeInput({
        stats: {
          totalDiagnoseCount: 1,
          articulationAvg: 70,
          linguisticAvg: 70,
          acousticAvg: 70,
          missionCount: 0,
          recentTargetPhonemes: ["ㅅ", "ㄹ"],
        },
      }),
    );
    const joined = lines.join("\n");
    expect(joined).toContain("ㅅ (s)");
    expect(joined).toContain("ㄹ (r/l)");
  });

  it("[10] R4 — preview 본문에 임의 식별 정보 (이메일/UUID) 노출 0건", () => {
    const lines = previewCenterReportText(makeInput());
    const joined = lines.join("\n");
    // 이메일 패턴 없음.
    expect(joined).not.toMatch(/@/);
    // UUID-like 패턴 없음.
    expect(joined).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  it("[11] englishFallback 모드 — 영문 라벨 + alias-only 음소 표기", () => {
    const lines = previewCenterReportText(
      makeInput({
        stats: {
          totalDiagnoseCount: 5,
          articulationAvg: 80,
          linguisticAvg: 75,
          acousticAvg: 70,
          missionCount: 3,
          recentTargetPhonemes: ["ㅅ", "ㄹ"],
        },
      }),
      { englishFallback: true },
    );
    const joined = lines.join("\n");
    expect(joined).toContain("Speech Development Summary Report");
    expect(joined).toContain("Articulation: 80.0");
    expect(joined).toContain("s, r/l");
  });
});
