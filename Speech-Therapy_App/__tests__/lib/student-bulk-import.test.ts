// FR-C-016 (#39) — lib/admin/student-bulk-import 단위 테스트.
//
// 시나리오 매핑:
//   parseStudentBuffer:
//     P1 — CSV (한글 header) 정상 파싱
//     P2 — TSV (영문 header) 정상 파싱
//     P3 — 필수 컬럼 누락 → parse_error
//     P4 — 빈 파일 → parse_error
//     P5 — xlsx magic bytes → 미지원 안내
//     P6 — 빈 cell 의 optional 컬럼 (반/부모이메일) 은 undefined 처리
//
//   validateStudentRows:
//     V1 — cross-tenant institutionId → invalid_schema
//     V2 — null name → null_name
//     V3 — 잘못된 birthDate → invalid_birth_date
//     V4 — 입력 내부 중복 → duplicate_student_id
//     V5 — 기존 existingStudentIds 충돌 → duplicate_student_id
//
//   bulkUpsertStudents:
//     U1 — validRows 빈 배열 → createMany 호출 안 함
//     U2 — validRows N건 → 단일 createMany 호출 + 인덱스 보존
//     U3 — createMany 가 count 반환 → 그대로 결과에 반영
//
//   bulkImportStudents (통합):
//     I1 — 부분 성공 (valid + error 혼합) → successCount + errorCount 정확
//     I2 — 100건 모두 valid → 단일 createMany 호출
//
// 금칙어: "치료" / "진단" / "장애" 미사용 검증.

import { describe, it, expect, vi } from "vitest";
import {
  parseStudentBuffer,
  validateStudentRows,
  bulkUpsertStudents,
  bulkImportStudents,
  type StudentImportRow,
  type PrismaCreateManyArgs,
} from "@/lib/admin/student-bulk-import";

const INST = "11111111-1111-4111-8111-111111111111";
const OTHER_INST = "22222222-2222-4222-8222-222222222222";

function bufFromString(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer as ArrayBuffer;
}

function makeValidRow(suffix: string): StudentImportRow {
  return {
    studentId: `STU${suffix.padStart(6, "0")}`,
    name: "별명아",
    birthDate: "2022-03-15",
    institutionId: INST,
  };
}

describe("parseStudentBuffer", () => {
  it("[P1] CSV (한글 header) 정상 파싱 — 2행", () => {
    const csv =
      "학번,이름,생년월일,반,부모이메일\n" +
      "STU000001,김서윤,2022-03-15,햇님반,parent1@example.com\n" +
      "STU000002,이도윤,2021-08-22,달님반,parent2@example.com\n";
    const { rows, parseErrors } = parseStudentBuffer(bufFromString(csv), INST);
    expect(parseErrors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    const first = rows[0] as Record<string, unknown>;
    expect(first.studentId).toBe("STU000001");
    expect(first.name).toBe("김서윤");
    expect(first.birthDate).toBe("2022-03-15");
    expect(first.classroomName).toBe("햇님반");
    expect(first.parentEmail).toBe("parent1@example.com");
    expect(first.institutionId).toBe(INST);
  });

  it("[P2] TSV (영문 header) 정상 파싱 — birthDate slash 자동 정규화", () => {
    const tsv =
      "studentId\tname\tbirthDate\tclassroomName\tparentEmail\n" +
      "STU000003\t박지우\t2020/01/15\t별님반\tparent3@example.com\n";
    const { rows, parseErrors } = parseStudentBuffer(bufFromString(tsv), INST);
    expect(parseErrors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    const r = rows[0] as Record<string, unknown>;
    expect(r.birthDate).toBe("2020-01-15");
  });

  it("[P3] 필수 컬럼 누락 (이름 없음) → parse_error", () => {
    const csv = "학번,생년월일\nSTU000001,2022-03-15\n";
    const { rows, parseErrors } = parseStudentBuffer(bufFromString(csv), INST);
    expect(rows).toHaveLength(0);
    expect(parseErrors).toHaveLength(1);
    expect(parseErrors[0]!.reason).toBe("parse_error");
    expect(parseErrors[0]!.message).toContain("필수 컬럼");
  });

  it("[P4] 빈 파일 → parse_error", () => {
    const { rows, parseErrors } = parseStudentBuffer(bufFromString(""), INST);
    expect(rows).toHaveLength(0);
    expect(parseErrors).toHaveLength(1);
    expect(parseErrors[0]!.reason).toBe("parse_error");
  });

  it("[P5] xlsx magic bytes → 미지원 안내 (graceful)", () => {
    const xlsxLike = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const { rows, parseErrors } = parseStudentBuffer(xlsxLike.buffer as ArrayBuffer, INST);
    expect(rows).toHaveLength(0);
    expect(parseErrors).toHaveLength(1);
    expect(parseErrors[0]!.message).toContain("CSV");
  });

  it("[P6] optional 컬럼 빈 셀 → 결과 객체에서 undefined", () => {
    const csv = "학번,이름,생년월일,반,부모이메일\nSTU000001,김서윤,2022-03-15,,\n";
    const { rows } = parseStudentBuffer(bufFromString(csv), INST);
    const r = rows[0] as Record<string, unknown>;
    expect(r.classroomName).toBeUndefined();
    expect(r.parentEmail).toBeUndefined();
  });

  it("[P-bonus] UTF-8 BOM 자동 제거", () => {
    const csv = "﻿학번,이름,생년월일\nSTU000001,김서윤,2022-03-15\n";
    const { rows, parseErrors } = parseStudentBuffer(bufFromString(csv), INST);
    expect(parseErrors).toHaveLength(0);
    expect(rows).toHaveLength(1);
  });
});

describe("validateStudentRows", () => {
  const ctx = { institutionId: INST, existingStudentIds: new Set<string>() };

  it("[V1] cross-tenant institutionId → invalid_schema", () => {
    const rows: unknown[] = [
      { ...makeValidRow("1"), institutionId: OTHER_INST },
    ];
    const { validRows, errors } = validateStudentRows(rows, ctx);
    expect(validRows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.reason).toBe("invalid_schema");
    expect(errors[0]!.field).toBe("institutionId");
  });

  it("[V2] 이름 누락 → null_name", () => {
    const rows: unknown[] = [{ ...makeValidRow("2"), name: "" }];
    const { errors } = validateStudentRows(rows, ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.reason).toBe("null_name");
    expect(errors[0]!.field).toBe("name");
  });

  it("[V3] birthDate 형식 위반 → invalid_birth_date", () => {
    const rows: unknown[] = [{ ...makeValidRow("3"), birthDate: "2022/03/15" }];
    const { errors } = validateStudentRows(rows, ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.reason).toBe("invalid_birth_date");
  });

  it("[V4] 입력 내부 중복 → 두 번째 행이 duplicate_student_id", () => {
    const r = makeValidRow("4");
    const { validRows, errors } = validateStudentRows([r, { ...r }], ctx);
    expect(validRows).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.reason).toBe("duplicate_student_id");
    expect(errors[0]!.rowIndex).toBe(1);
  });

  it("[V5] existingStudentIds 충돌 → duplicate_student_id", () => {
    const r = makeValidRow("5");
    const { errors } = validateStudentRows([r], {
      institutionId: INST,
      existingStudentIds: new Set([r.studentId]),
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.reason).toBe("duplicate_student_id");
  });

  it("[V-bonus] parentEmail 형식 위반 → invalid_email", () => {
    const rows: unknown[] = [
      { ...makeValidRow("6"), parentEmail: "not-an-email" },
    ];
    const { errors } = validateStudentRows(rows, ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.reason).toBe("invalid_email");
  });

  it("[V-bonus] R4: realName / ssn 추가 키는 schema strip — validRows 결과에서 제거", () => {
    const rawWithExtra = {
      ...makeValidRow("7"),
      realName: "본명아이",
      ssn: "990101-1234567",
    };
    const { validRows, errors } = validateStudentRows([rawWithExtra], ctx);
    expect(errors).toHaveLength(0);
    expect(validRows).toHaveLength(1);
    const r = validRows[0] as Record<string, unknown>;
    expect(r.realName).toBeUndefined();
    expect(r.ssn).toBeUndefined();
  });
});

describe("bulkUpsertStudents", () => {
  it("[U1] validRows 빈 배열 → createMany 호출 안 함, count=0", async () => {
    const createMany = vi.fn();
    const result = await bulkUpsertStudents([], createMany);
    expect(createMany).not.toHaveBeenCalled();
    expect(result.count).toBe(0);
    expect(result.insertedStudentIds).toEqual([]);
  });

  it("[U2] validRows N건 → 단일 createMany 호출, data 길이 = N", async () => {
    const rows: StudentImportRow[] = [
      makeValidRow("1"),
      makeValidRow("2"),
      makeValidRow("3"),
    ];
    const createMany = vi.fn(async (args: PrismaCreateManyArgs) => ({
      count: args.data.length,
    }));
    const result = await bulkUpsertStudents(rows, createMany);
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(3);
    expect(result.insertedStudentIds).toEqual(rows.map((r) => r.studentId));
  });

  it("[U3] createMany 가 부분 INSERT (skipDuplicates) 시 count 반영", async () => {
    const rows: StudentImportRow[] = [makeValidRow("1"), makeValidRow("2")];
    const createMany = vi.fn(async () => ({ count: 1 }));
    const result = await bulkUpsertStudents(rows, createMany);
    expect(result.count).toBe(1);
    // insertedStudentIds 는 valid 전체 목록 — 호출 측이 멱등 set 에 누적해 추후 재검증에 사용.
    expect(result.insertedStudentIds).toHaveLength(2);
  });
});

describe("bulkImportStudents (통합)", () => {
  it("[I1] 부분 성공: 5건 중 valid 3 + error 2", async () => {
    const ctx = { institutionId: INST, existingStudentIds: new Set<string>() };
    const r1 = makeValidRow("1");
    const r2 = makeValidRow("2");
    const r3 = makeValidRow("3");
    const errInvalidName = { ...makeValidRow("4"), name: "" };
    const errBadDate = { ...makeValidRow("5"), birthDate: "잘못된" };
    const rows = [r1, r2, r3, errInvalidName, errBadDate];

    const createMany = vi.fn(async (args: PrismaCreateManyArgs) => ({
      count: args.data.length,
    }));
    const result = await bulkImportStudents(rows, ctx, createMany);
    expect(result.successCount).toBe(3);
    expect(result.errorCount).toBe(2);
    expect(result.insertedStudentIds).toHaveLength(3);
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it("[I2] 100건 valid → 단일 createMany + 인덱스 보존", async () => {
    const ctx = { institutionId: INST, existingStudentIds: new Set<string>() };
    const rows: StudentImportRow[] = Array.from({ length: 100 }, (_, i) =>
      makeValidRow((i + 1).toString()),
    );
    const createMany = vi.fn(async (args: PrismaCreateManyArgs) => ({
      count: args.data.length,
    }));
    const result = await bulkImportStudents(rows, ctx, createMany);
    expect(result.successCount).toBe(100);
    expect(result.errorCount).toBe(0);
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it("[I3] 재시도 흐름 — 1차 95 success, 2차 fixed 5 → 누적 100", async () => {
    const ctx1 = { institutionId: INST, existingStudentIds: new Set<string>() };
    const valid: StudentImportRow[] = Array.from({ length: 95 }, (_, i) =>
      makeValidRow(`A${i}`),
    );
    const errorRows = [
      { ...makeValidRow("B0"), name: "" },
      { ...makeValidRow("B1"), birthDate: "X" },
      { ...valid[0]! }, // 중복
      { ...valid[1]! }, // 중복
      { ...valid[2]! }, // 중복
    ];

    const createMany = vi.fn(async (args: PrismaCreateManyArgs) => ({
      count: args.data.length,
    }));
    const first = await bulkImportStudents([...valid, ...errorRows], ctx1, createMany);
    expect(first.successCount).toBe(95);
    expect(first.errorCount).toBe(5);

    const fixed: StudentImportRow[] = Array.from({ length: 5 }, (_, i) => ({
      ...makeValidRow(`C${i}`),
      studentId: `FIXED${i.toString().padStart(3, "0")}`,
    }));
    const ctx2 = {
      institutionId: INST,
      existingStudentIds: new Set(first.insertedStudentIds),
    };
    const second = await bulkImportStudents(fixed, ctx2, createMany);
    expect(second.successCount).toBe(5);
    expect(second.errorCount).toBe(0);
    expect(createMany).toHaveBeenCalledTimes(2);
  });
});

describe("금칙어 (CON-04)", () => {
  it("lib 모듈 export 의 모든 에러 메시지에 '치료' / '진단' / '장애' 미포함", async () => {
    // 모든 reason 분기를 한 번에 발화시키는 합성 입력.
    const ctx = { institutionId: INST, existingStudentIds: new Set([makeValidRow("9").studentId]) };
    const rows: unknown[] = [
      { ...makeValidRow("1"), name: "" },
      { ...makeValidRow("2"), birthDate: "X" },
      { ...makeValidRow("3"), parentEmail: "broken" },
      { ...makeValidRow("4"), studentId: "X" },
      { ...makeValidRow("5"), institutionId: OTHER_INST },
      makeValidRow("9"),
    ];
    const { errors } = validateStudentRows(rows, ctx);
    for (const e of errors) {
      for (const forbidden of ["치료", "진단", "장애"]) {
        expect(e.message).not.toContain(forbidden);
      }
    }
  });
});
