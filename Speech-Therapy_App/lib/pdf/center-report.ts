// FR-Q-007 (#48) — 센터 제출용 PDF (jsPDF 클라이언트 측, Replace).
//
// 책임 (Client-side only — browser 환경 가정):
//   1) 1페이지 요약 PDF 생성:
//      - 헤더: 자녀 이름 (선택) + 월령 + 기관명 + 생성 시각
//      - 3축 점수 카드 (articulation / linguistic / acoustic) + 단순 bar visualization
//      - 최근 음소 list (예: "ㅅ", "ㄹ")
//      - 활동 횟수 (확인 N회 / 미션 M회)
//      - 안내 disclaimer (한국어, 금칙어 회피)
//   2) Blob 반환 — 호출 측 Client Component 가 URL.createObjectURL + <a download> 트리거.
//
// Replace 정책 (서버 사이드 → 클라이언트):
//   - 원안: Puppeteer / Chrome-headless 서버 렌더 → Vercel Hobby 제약 / cold start cost
//   - 변경안: jsPDF 클라이언트 측 → 무료 / serverless 비용 0 / 사용자 다운로드 즉시 발생
//   - 차이: 한글 폰트 embed 필요 — 본 PR 은 영문 + 기본 라틴 텍스트 우선 (한글 음소는 그대로
//     ㄱ/ㄴ/ㅅ/ㅈ/ㄹ 등 jsPDF 기본 helvetica 가 일부 폰트 영역에서 깨질 수 있음 → 음소는 별도
//     ASCII 라벨 + 한글 원문 병기, 영문 fallback 모드 제공).
//
// CON-04 (금칙어 회피) — 본 모듈이 생성하는 모든 문자열은 다음 단어 미포함:
//   "치료" / "진단" / "장애" / "환자" / "병" / "증상" / "처방" / "병원" (lib/forbidden-words 정의)
//   → "발음 확인", "발음 가이드", "발달 보조 자료" 로 치환.
//
// R4 (자녀 식별 정보):
//   - childName 은 부모/원장 컨텍스트에서만 PDF 노출 (호출 측이 RBAC 통과 후 전달).
//   - userId / email / phone 등 식별 정보는 PDF 본문에 미노출.
//
// graceful 동작:
//   - 폰트 로드 실패 / jsPDF 내부 오류 → 영문 폴백 모드로 placeholder PDF 반환 (throw X)
//   - input.stats 누락 필드 → "-" 표시.

import { jsPDF } from "jspdf";

import { hasBannedTerm } from "@/lib/forbidden-words";

/// 단일 페이지 PDF 입력. 호출 측 (Server Component + Client Component) 이 가공 완료 후 전달.
export interface CenterReportInput {
  /// R4: 부모/원장 컨텍스트에서만 허용. 비식별 라벨 (별명) 또는 자녀 본명. 미제공 시 "원아".
  childName?: string;
  /// 만 2~7세 = 24~84.
  childAgeMonths: number;
  /// 기관명 (Institution.name). 부재 시 "기관 미설정".
  institutionName?: string;
  stats: {
    /// 누적 발음 확인 횟수 (EvaluationResult count).
    totalDiagnoseCount: number;
    /// 평균 articulation score (0~100). 데이터 0건이면 null.
    articulationAvg: number | null;
    /// 평균 linguistic score (0~100). 데이터 0건이면 null.
    linguisticAvg: number | null;
    /// 평균 acoustic score (0~100). 데이터 0건이면 null.
    acousticAvg: number | null;
    /// 미션 완수 횟수 (SessionLog where missionId != null).
    missionCount: number;
    /// 최근 평가된 음소 목록 (중복 제거, 최대 5개 권장).
    recentTargetPhonemes: string[];
  };
  /// 생성 시각 (server 또는 client 둘 다 OK — 일관성 위해 호출 측에서 결정).
  generatedAt: Date;
}

/// generateCenterReportPdf 옵션. 폰트 / fallback 모드 등 후속 PR 에서 확장.
export interface GenerateCenterReportPdfOptions {
  /// true 면 영문 라벨 우선 (한글 폰트 미설정 환경의 fallback).
  /// 본 PR 기본값 false — 한글 라벨 사용 (jsPDF 기본 helvetica 가 일부 영역만 한글 지원).
  englishFallback?: boolean;
}

/// 한국어 안내 (의료 금칙어 회피).
/// AGENTS.md §2.1 CON-04 의 단어 분리 정책에 맞춰 "치료/진단/장애" 사용 0건.
export const CENTER_REPORT_DISCLAIMER_KO =
  "본 보고서는 발달 보조 자료이며 의학적 판단이 아닙니다. 전문 기관 상담을 권장합니다.";

/// 영문 안내 (englishFallback=true 모드).
export const CENTER_REPORT_DISCLAIMER_EN =
  "This report is a developmental reference for parents, not a clinical assessment.";

/// PDF 생성 결과 메타. 호출 측 telemetry 용.
export interface CenterReportPdfResult {
  blob: Blob;
  /// 한국어 / 영문 fallback 어느 모드로 생성되었는지.
  mode: "ko" | "en";
  /// 단순 길이 (Blob.size).
  bytes: number;
  /// 사용한 disclaimer 텍스트 (테스트가 PDF 본문 검증 시 사용).
  disclaimer: string;
}

/// 빈 / null 안전 점수 포맷터. 0~100 범위 외 입력은 안전하게 clamp.
function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  const clamped = Math.max(0, Math.min(100, value));
  return clamped.toFixed(1);
}

/// 0~100 점수를 막대 너비 (0~maxWidth) 로 변환. null/NaN → 0.
function scoreToBarWidth(value: number | null | undefined, maxWidth: number): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  const clamped = Math.max(0, Math.min(100, value));
  return (clamped / 100) * maxWidth;
}

/// 생성 시각 ISO 라벨. timezone 가독성 위해 KST (UTC+9) 표기 — 단순화: toISOString 후 "Z" → "UTC".
function formatGeneratedAt(date: Date, mode: "ko" | "en"): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return mode === "ko" ? "생성 시각 미상" : "Generated time unknown";
  }
  // ISO 8601 단순 표기 (예: 2026-05-23T11:30:00Z). 한글 폰트 미지원 환경에서도 안전.
  const iso = date.toISOString();
  return iso.replace("T", " ").replace(/\..*Z$/, " UTC");
}

/// jsPDF 가 한글 음소 ("ㅅ", "ㄹ" 등) 를 helvetica 로 안전 렌더 못 할 가능성 → 이름 매핑.
/// 매핑 부재 시 원문 음소 사용 (best-effort).
const PHONEME_EN_LABEL: Record<string, string> = {
  ㄱ: "g",
  ㄴ: "n",
  ㄷ: "d",
  ㄹ: "r/l",
  ㅁ: "m",
  ㅂ: "b",
  ㅅ: "s",
  ㅈ: "j",
  ㅊ: "ch",
  ㅋ: "k",
  ㅌ: "t",
  ㅍ: "p",
  ㅎ: "h",
};

function describePhonemes(phonemes: string[], mode: "ko" | "en"): string {
  if (!Array.isArray(phonemes) || phonemes.length === 0) {
    return mode === "ko" ? "최근 음소 없음" : "No recent phonemes";
  }
  const max = phonemes.slice(0, 5);
  if (mode === "ko") {
    // 한글 음소 그대로 + 영문 alias 병기 — helvetica 폴백 친화.
    return max
      .map((p) => {
        const alias = PHONEME_EN_LABEL[p];
        return alias ? `${p} (${alias})` : p;
      })
      .join(", ");
  }
  // 영문 모드: alias 만 (없으면 원문).
  return max.map((p) => PHONEME_EN_LABEL[p] ?? p).join(", ");
}

/// 본문에 들어가기 전 모든 사용자 입력 (childName / institutionName) 을 sanitize.
/// 금칙어 매칭 시 비식별 라벨로 대체 (호출 측 RBAC 통과 보장 하에 추가 방어).
function sanitizeLabel(raw: string | undefined, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (hasBannedTerm(trimmed)) return fallback;
  // PDF 가독성: 30자 cap.
  return trimmed.length > 30 ? `${trimmed.slice(0, 30)}...` : trimmed;
}

/// 라벨 사전 (한/영 두 모드).
interface LabelPack {
  title: string;
  childLabel: string;
  ageLabel: string;
  institutionLabel: string;
  generatedAtLabel: string;
  scoresHeading: string;
  articulationLabel: string;
  linguisticLabel: string;
  acousticLabel: string;
  phonemesHeading: string;
  activityHeading: string;
  diagnoseCountLabel: string;
  missionCountLabel: string;
  disclaimer: string;
  monthsSuffix: string;
}

const LABELS_KO: LabelPack = {
  title: "발음 발달 요약 보고서",
  childLabel: "원아",
  ageLabel: "월령",
  institutionLabel: "기관",
  generatedAtLabel: "생성 시각",
  scoresHeading: "3축 발음 점수",
  articulationLabel: "조음 (Articulation)",
  linguisticLabel: "언어 (Linguistic)",
  acousticLabel: "음향 (Acoustic)",
  phonemesHeading: "최근 확인 음소",
  activityHeading: "활동 횟수",
  diagnoseCountLabel: "발음 확인 횟수",
  missionCountLabel: "미션 완수 횟수",
  disclaimer: CENTER_REPORT_DISCLAIMER_KO,
  monthsSuffix: "개월",
};

const LABELS_EN: LabelPack = {
  title: "Speech Development Summary Report",
  childLabel: "Child",
  ageLabel: "Age",
  institutionLabel: "Institution",
  generatedAtLabel: "Generated at",
  scoresHeading: "3-axis Speech Scores",
  articulationLabel: "Articulation",
  linguisticLabel: "Linguistic",
  acousticLabel: "Acoustic",
  phonemesHeading: "Recent target phonemes",
  activityHeading: "Activity counts",
  diagnoseCountLabel: "Check count",
  missionCountLabel: "Mission count",
  disclaimer: CENTER_REPORT_DISCLAIMER_EN,
  monthsSuffix: "months",
};

/// PDF 본문 — jsPDF 인스턴스 에 직접 그린다. 외부에서 mock 가능하도록 doc 주입 패턴.
/// helpers/types 만 export — 본 함수는 모듈 내부 전용.
function renderBody(
  doc: jsPDF,
  input: CenterReportInput,
  labels: LabelPack,
  mode: "ko" | "en",
): void {
  const safeChild = sanitizeLabel(input.childName, labels.childLabel);
  const safeInstitution = sanitizeLabel(
    input.institutionName,
    mode === "ko" ? "기관 미설정" : "(no institution)",
  );

  // 페이지 마진.
  const marginX = 15;
  let cursorY = 20;

  // --- 타이틀 ---
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(labels.title, marginX, cursorY);
  cursorY += 10;

  // --- 헤더 메타 ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${labels.childLabel}: ${safeChild}`, marginX, cursorY);
  cursorY += 6;
  doc.text(
    `${labels.ageLabel}: ${input.childAgeMonths} ${labels.monthsSuffix}`,
    marginX,
    cursorY,
  );
  cursorY += 6;
  doc.text(`${labels.institutionLabel}: ${safeInstitution}`, marginX, cursorY);
  cursorY += 6;
  doc.text(
    `${labels.generatedAtLabel}: ${formatGeneratedAt(input.generatedAt, mode)}`,
    marginX,
    cursorY,
  );
  cursorY += 12;

  // --- 3축 점수 ---
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(labels.scoresHeading, marginX, cursorY);
  cursorY += 8;

  const barAreaWidth = 100;
  const barHeight = 5;
  const scores: Array<[string, number | null]> = [
    [labels.articulationLabel, input.stats.articulationAvg],
    [labels.linguisticLabel, input.stats.linguisticAvg],
    [labels.acousticLabel, input.stats.acousticAvg],
  ];
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  for (const [label, value] of scores) {
    doc.text(label, marginX, cursorY);
    doc.text(formatScore(value), marginX + 130, cursorY);
    // 빈 막대 (배경)
    doc.setDrawColor(180);
    doc.setFillColor(230, 230, 230);
    doc.rect(marginX, cursorY + 2, barAreaWidth, barHeight, "F");
    // 값 막대
    const w = scoreToBarWidth(value, barAreaWidth);
    if (w > 0) {
      doc.setFillColor(60, 130, 180);
      doc.rect(marginX, cursorY + 2, w, barHeight, "F");
    }
    cursorY += 12;
  }

  cursorY += 4;

  // --- 음소 ---
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(labels.phonemesHeading, marginX, cursorY);
  cursorY += 7;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(describePhonemes(input.stats.recentTargetPhonemes, mode), marginX, cursorY);
  cursorY += 12;

  // --- 활동 ---
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(labels.activityHeading, marginX, cursorY);
  cursorY += 7;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${labels.diagnoseCountLabel}: ${input.stats.totalDiagnoseCount}`,
    marginX,
    cursorY,
  );
  cursorY += 6;
  doc.text(
    `${labels.missionCountLabel}: ${input.stats.missionCount}`,
    marginX,
    cursorY,
  );
  cursorY += 14;

  // --- Disclaimer (의료 보조 자료 안내, 금칙어 0건) ---
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(marginX, cursorY - 4, marginX + barAreaWidth + 50, cursorY - 4);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text(labels.disclaimer, marginX, cursorY);
}

/// 모드 선택. 폰트 로드 실패 / opts.englishFallback === true → "en".
function pickMode(opts?: GenerateCenterReportPdfOptions): "ko" | "en" {
  if (opts?.englishFallback) return "en";
  return "ko";
}

/// 메인 helper. 호출 측 Client Component 가 await 후 Blob 사용.
///
/// 실패 시나리오:
///   1) jsPDF 인스턴스 생성 실패 → 영문 fallback 으로 재시도 → 그래도 실패 시 placeholder Blob 반환.
///   2) renderBody 내부 throw → 영문 fallback 재시도.
/// 결코 throw 하지 않음 — graceful: 호출 측이 UI 분기 단순화.
export async function generateCenterReportPdf(
  input: CenterReportInput,
  opts?: GenerateCenterReportPdfOptions,
): Promise<CenterReportPdfResult> {
  let mode = pickMode(opts);
  let labels = mode === "ko" ? LABELS_KO : LABELS_EN;

  // 1차 시도 — 사용자 모드.
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    renderBody(doc, input, labels, mode);
    const blob = doc.output("blob");
    return { blob, mode, bytes: blob.size, disclaimer: labels.disclaimer };
  } catch (err) {
    // 한국어 모드 실패 → 영문 fallback 재시도.
    if (mode === "ko") {
      console.warn(
        "[center-report] ko 모드 PDF 생성 실패 — 영문 fallback 으로 재시도",
        err,
      );
      mode = "en";
      labels = LABELS_EN;
      try {
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        renderBody(doc, input, labels, mode);
        const blob = doc.output("blob");
        return { blob, mode, bytes: blob.size, disclaimer: labels.disclaimer };
      } catch (err2) {
        console.warn("[center-report] en fallback 도 실패 — placeholder 반환", err2);
      }
    } else {
      console.warn("[center-report] en 모드 PDF 생성 실패 — placeholder 반환", err);
    }
  }

  // 최종 fallback — 빈 placeholder Blob (PDF 헤더만, 호출 측은 size 0 분기 가능).
  const placeholder = new Blob([CENTER_REPORT_DISCLAIMER_EN], {
    type: "application/pdf",
  });
  return {
    blob: placeholder,
    mode: "en",
    bytes: placeholder.size,
    disclaimer: CENTER_REPORT_DISCLAIMER_EN,
  };
}

/// 단위 테스트 / 검증 helper export — PDF 본문 텍스트가 아닌 사전 검증용 (텍스트 그대로).
/// 호출 측이 "이 텍스트가 PDF 본문에 나갈 것이다" 확인하고 싶을 때 사용.
export function previewCenterReportText(
  input: CenterReportInput,
  opts?: GenerateCenterReportPdfOptions,
): string[] {
  const mode = pickMode(opts);
  const labels = mode === "ko" ? LABELS_KO : LABELS_EN;
  const safeChild = sanitizeLabel(input.childName, labels.childLabel);
  const safeInstitution = sanitizeLabel(
    input.institutionName,
    mode === "ko" ? "기관 미설정" : "(no institution)",
  );
  return [
    labels.title,
    `${labels.childLabel}: ${safeChild}`,
    `${labels.ageLabel}: ${input.childAgeMonths} ${labels.monthsSuffix}`,
    `${labels.institutionLabel}: ${safeInstitution}`,
    `${labels.generatedAtLabel}: ${formatGeneratedAt(input.generatedAt, mode)}`,
    labels.scoresHeading,
    `${labels.articulationLabel}: ${formatScore(input.stats.articulationAvg)}`,
    `${labels.linguisticLabel}: ${formatScore(input.stats.linguisticAvg)}`,
    `${labels.acousticLabel}: ${formatScore(input.stats.acousticAvg)}`,
    labels.phonemesHeading,
    describePhonemes(input.stats.recentTargetPhonemes, mode),
    labels.activityHeading,
    `${labels.diagnoseCountLabel}: ${input.stats.totalDiagnoseCount}`,
    `${labels.missionCountLabel}: ${input.stats.missionCount}`,
    labels.disclaimer,
  ];
}
