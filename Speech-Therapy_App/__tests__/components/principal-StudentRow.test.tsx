// FR-Q-009 (#50) 후속 — StudentRow + ClassroomGrid 학생 navigation 단위 테스트.
//
// 검증 시나리오 (≥ 6):
//   [1] StudentRow 정상 — 라벨 + 타임라인 + PDF 두 링크 모두 노출
//   [2] truncateStudentId — UUID 4자리 truncate ("aaaaaaaa-..." → "aaaa...")
//   [3] 타임라인 링크 href — /admin/timeline/${studentId} 정확
//   [4] PDF 링크 href — /admin/centers/pdf/${studentId} 정확
//   [5] R4 — 표시 텍스트(textContent)에 UUID 풀길이 미노출 (tooltip 만 가능)
//   [6] CON-04 — 금칙어 ("치료" / "진단" / "장애") 0건
//   [7] ClassroomGrid — students 가 있는 반에 disclosure + StudentRow N개 렌더
//   [8] ClassroomGrid — students 빈 반은 disclosure 미렌더

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// next/link mock — 단순 <a>
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { StudentRow, truncateStudentId } from "@/components/admin/principal/StudentRow";
import { ClassroomGrid } from "@/components/admin/principal/ClassroomGrid";
import type { ClassroomSummary } from "@/lib/admin/principal-aggregator";

const STUDENT_A = "aaaaaaaa-1111-4111-8111-111111111111";
const STUDENT_B = "bbbbbbbb-2222-4222-8222-222222222222";
const STUDENT_C = "cccccccc-3333-4333-8333-333333333333";

const FORBIDDEN_MEDICAL_WORDS = ["치료", "진단", "장애"];

function assertNoMedicalTerms(text: string) {
  for (const word of FORBIDDEN_MEDICAL_WORDS) {
    expect(text).not.toContain(word);
  }
}

describe("StudentRow — FR-Q-009 후속 자녀 navigation", () => {
  it("[1] 두 액션 링크 (타임라인 + PDF) 모두 노출 + 라벨 표시", () => {
    const { container } = render(<StudentRow student={{ id: STUDENT_A }} />);

    const row = container.querySelector(`[data-testid='principal-student-row-${STUDENT_A}']`);
    expect(row).not.toBeNull();

    const label = container.querySelector("[data-testid='principal-student-label']");
    expect(label).not.toBeNull();
    expect(label?.textContent).toContain("원아");
    expect(label?.textContent).toContain("aaaa");

    const timeline = container.querySelector(
      `[data-testid='principal-student-timeline-${STUDENT_A}']`,
    );
    const pdf = container.querySelector(
      `[data-testid='principal-student-pdf-${STUDENT_A}']`,
    );
    expect(timeline).not.toBeNull();
    expect(pdf).not.toBeNull();
  });

  it("[2] truncateStudentId — UUID 앞 4자리 + '...' 노출", () => {
    expect(truncateStudentId(STUDENT_A)).toBe("aaaa...");
    expect(truncateStudentId(STUDENT_B)).toBe("bbbb...");
    expect(truncateStudentId(STUDENT_C)).toBe("cccc...");
  });

  it("[3] 타임라인 링크 href = /admin/timeline/${studentId} 정확", () => {
    const { container } = render(<StudentRow student={{ id: STUDENT_A }} />);
    const link = container.querySelector(
      `[data-testid='principal-student-timeline-${STUDENT_A}']`,
    );
    expect(link?.getAttribute("href")).toBe(`/admin/timeline/${STUDENT_A}`);
  });

  it("[4] PDF 링크 href = /admin/centers/pdf/${studentId} 정확", () => {
    const { container } = render(<StudentRow student={{ id: STUDENT_A }} />);
    const link = container.querySelector(
      `[data-testid='principal-student-pdf-${STUDENT_A}']`,
    );
    expect(link?.getAttribute("href")).toBe(`/admin/centers/pdf/${STUDENT_A}`);
  });

  it("[5] R4 — textContent 에 UUID 풀길이 노출 0 (truncate 만 노출)", () => {
    const { container } = render(<StudentRow student={{ id: STUDENT_A }} />);

    const text = container.textContent ?? "";
    expect(text).not.toContain(STUDENT_A);
    // truncate prefix 는 노출 OK.
    expect(text).toContain("aaaa...");
  });

  it("[5b] R4 — title tooltip 에는 풀길이 가능 (운영자 접근 시 풀길이 hover)", () => {
    const { container } = render(<StudentRow student={{ id: STUDENT_A }} />);

    const label = container.querySelector("[data-testid='principal-student-label']");
    expect(label?.getAttribute("title")).toBe(STUDENT_A);
  });

  it("[6] CON-04 — 금칙어 ('치료' / '진단' / '장애') 0건", () => {
    const { container } = render(<StudentRow student={{ id: STUDENT_A }} />);
    assertNoMedicalTerms(container.textContent ?? "");
  });
});

describe("ClassroomGrid — students 통합 disclosure 렌더", () => {
  function classroomWithStudents(
    classId: string,
    name: string,
    studentIds: string[],
  ): ClassroomSummary {
    return {
      id: classId,
      name,
      studentCount: studentIds.length,
      diagnoseCount: 5,
      avgScore: 70,
      students: studentIds.map((id) => ({ id })),
    };
  }

  it("[7] students 가 있는 반 — disclosure + N개 StudentRow 렌더", () => {
    const classrooms: ClassroomSummary[] = [
      classroomWithStudents("class-1", "햇님반", [STUDENT_A, STUDENT_B, STUDENT_C]),
    ];
    const { container } = render(<ClassroomGrid classrooms={classrooms} />);

    const disclosure = container.querySelector(
      "[data-testid='classroom-students-disclosure-class-1']",
    );
    expect(disclosure).not.toBeNull();
    expect(disclosure?.tagName).toBe("DETAILS");

    const list = container.querySelector(
      "[data-testid='classroom-students-list-class-1']",
    );
    expect(list).not.toBeNull();

    // 3명 모두 StudentRow 노출.
    for (const id of [STUDENT_A, STUDENT_B, STUDENT_C]) {
      expect(
        container.querySelector(`[data-testid='principal-student-row-${id}']`),
      ).not.toBeNull();
      expect(
        container.querySelector(`[data-testid='principal-student-timeline-${id}']`),
      ).not.toBeNull();
      expect(
        container.querySelector(`[data-testid='principal-student-pdf-${id}']`),
      ).not.toBeNull();
    }
  });

  it("[8] students 빈 반 — disclosure 자체 미렌더 + 기존 카드/카운트는 그대로", () => {
    const classrooms: ClassroomSummary[] = [
      {
        id: "class-empty",
        name: "신설반",
        studentCount: 0,
        diagnoseCount: 0,
        avgScore: null,
        students: [],
      },
    ];
    const { container } = render(<ClassroomGrid classrooms={classrooms} />);

    expect(container.querySelector("[data-testid='classroom-card-class-empty']")).not.toBeNull();
    expect(
      container.querySelector("[data-testid='classroom-students-disclosure-class-empty']"),
    ).toBeNull();
    expect(
      container.querySelector("[data-testid='classroom-students-list-class-empty']"),
    ).toBeNull();
  });

  it("[9] R4 — grid textContent 에 UUID 풀길이 미노출 (truncate 만)", () => {
    const classrooms: ClassroomSummary[] = [
      classroomWithStudents("class-1", "햇님반", [STUDENT_A, STUDENT_B]),
    ];
    const { container } = render(<ClassroomGrid classrooms={classrooms} />);

    const text = container.textContent ?? "";
    expect(text).not.toContain(STUDENT_A);
    expect(text).not.toContain(STUDENT_B);
    expect(text).toContain("aaaa...");
    expect(text).toContain("bbbb...");
  });

  it("[10] CON-04 — grid 텍스트 + disclosure 본문 모두 금칙어 0건", () => {
    const classrooms: ClassroomSummary[] = [
      classroomWithStudents("class-1", "햇님반", [STUDENT_A, STUDENT_B, STUDENT_C]),
    ];
    const { container } = render(<ClassroomGrid classrooms={classrooms} />);
    assertNoMedicalTerms(container.textContent ?? "");
  });
});
