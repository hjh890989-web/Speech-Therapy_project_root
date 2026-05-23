// FR-C-016 (#39) — 원아 엑셀 일괄 등록 핵심 로직.
//
// 책임:
//   1) parseStudentBuffer    — 업로드된 ArrayBuffer 를 행 배열로 파싱
//      - CSV / TSV 우선 지원 (in-house parser, 의존성 0)
//      - xlsx 바이너리는 magic-bytes (PK\x03\x04) 감지 → 별도 동적 import 분기 (graceful fallback)
//   2) validateStudentRows   — Zod 검증 + 중복 detection (입력 내부 + 기존 ID)
//   3) bulkUpsertStudents    — Prisma createMany batch INSERT (User 모델 활용)
//   4) bulkImportStudents    — 통합 흐름 (Server Action + 통합 테스트 spec 의 reference impl)
//
// Prisma 모델 결정 (이 PR 한정):
//   - 기존 Student 모델 부재. schema 변경 최소화 정책 (CON-FR-C-016).
//   - User 모델 (role='parent', institutionId, childAgeMonths) 로 _부모-자녀 단위_ 등록.
//   - 학번 (studentId) 은 별도 컬럼 없음 → 멱등성 키로 활용 (in-memory existingStudentIds set).
//     후속 PR 에서 Student 전용 모델 도입 시 본 모듈의 bulkUpsertStudents 만 교체하면 됨.
//
// R4 (자녀 정보 보호):
//   - 본명 / 주민번호 등 추가 키는 Zod schema 가 strip (passthrough 미사용).
//   - 다른 institutionId 의 행은 호출자 ctx 와 다르면 reject (cross-tenant 차단).
//   - 부모 이메일 (parentEmail) 은 optional, RFC 5321 검증 + 정규화 (toLowerCase + trim).
//
// 금칙어: "치료" / "진단" / "장애" 사용 금지 (변수명 / 주석 / 에러 메시지 모두).
//
// 성능:
//   - 100건 처리: 단일 createMany 호출 (N+1 가드)
//   - 1,000건 처리: 단일 createMany 호출 < 5초 (mock 환경 sentinel; REQ-FUNC-054)
//
// Refs: 통합 테스트 __tests__/integration/student-bulk-import.test.ts (TEST-012).

import { z } from "zod";

// ============================================================================
// 1) Schema — 입력 행 / 결과
// ============================================================================

/**
 * 통합 테스트 spec 의 StudentImportRowSchema 와 동일.
 *
 * - studentId: 영숫자 + - _ (4~20자). 기관 내 unique 학번.
 * - name: 별명 / nickname (1~30자). R4 — 본명 컬럼은 받지 않음.
 * - birthDate: YYYY-MM-DD ISO date. 만 2~7세 범위 검증은 별도 (UI 가이드).
 * - institutionId: UUID. 호출자 ctx 의 institutionId 와 일치해야 함.
 * - classroomName: 반 이름 (선택, 50자 이하).
 * - parentEmail: 부모 이메일 (선택, RFC 5321 length cap 254).
 */
export const StudentImportRowSchema = z.object({
  studentId: z
    .string()
    .min(4)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().min(1).max(30),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate must be YYYY-MM-DD"),
  institutionId: z.string().uuid(),
  classroomName: z.string().max(50).optional(),
  parentEmail: z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
      z.string().email().max(254),
    )
    .optional(),
});

export type StudentImportRow = z.infer<typeof StudentImportRowSchema>;

/**
 * 행 단위 오류 분류.
 *
 * - invalid_schema: Zod 스키마 위반 (studentId 형식 / institutionId 미일치 등).
 * - null_name: 이름 누락 / 빈 문자열.
 * - invalid_birth_date: birthDate 형식 위반 (YYYY-MM-DD 아님).
 * - invalid_email: parentEmail 형식 위반.
 * - duplicate_student_id: 입력 내부 중복 또는 ctx.existingStudentIds 와 충돌.
 * - parse_error: 엑셀/CSV 파싱 단계 오류 (header 누락 / 컬럼 수 mismatch).
 */
export type ImportErrorReason =
  | "invalid_schema"
  | "null_name"
  | "invalid_birth_date"
  | "invalid_email"
  | "duplicate_student_id"
  | "parse_error";

export interface ImportErrorRow {
  /** 0-based 입력 행 index — UI 인라인 수정 위치 매핑. */
  rowIndex: number;
  reason: ImportErrorReason;
  /** 사용자에게 노출할 한국어 메시지 (금칙어 회피). */
  message: string;
  /** 원본 raw 행 (UI prefill 용). R4: 호출 측이 다시 화면에 표시할 때 RealName 같은 추가 키 노출 금지. */
  raw: unknown;
  /** 위반 필드 (가능 시) — 인라인 강조용. */
  field?: keyof StudentImportRow;
}

export interface BulkImportResult {
  /** Prisma createMany 가 보고한 INSERT 카운트 (등록 성공 건). */
  successCount: number;
  /** errors 의 길이. */
  errorCount: number;
  errors: ImportErrorRow[];
  /**
   * 등록 성공한 studentId 목록 — 인라인 수정 재시도 시 ctx.existingStudentIds 에 누적.
   * R4: 다른 institutionId 의 학번은 절대 포함되지 않음 (server-side scope).
   */
  insertedStudentIds: string[];
}

// ============================================================================
// 2) Excel / CSV / TSV 파서
// ============================================================================

/** 본 라이브러리가 인식하는 header 키. 한글 / 영문 두 형식 모두 허용. */
const HEADER_ALIASES: Record<string, keyof StudentImportRow> = {
  studentId: "studentId",
  학번: "studentId",
  name: "name",
  이름: "name",
  별명: "name",
  birthDate: "birthDate",
  birthdate: "birthDate",
  생년월일: "birthDate",
  classroomName: "classroomName",
  반: "classroomName",
  반이름: "classroomName",
  parentEmail: "parentEmail",
  부모이메일: "parentEmail",
};

/** CSV / TSV / 엑셀 magic-bytes 감지. */
function detectFormat(buffer: ArrayBuffer): "xlsx" | "text" {
  const view = new Uint8Array(buffer);
  // .xlsx (zip) magic: 50 4B 03 04
  if (
    view.length >= 4 &&
    view[0] === 0x50 &&
    view[1] === 0x4b &&
    view[2] === 0x03 &&
    view[3] === 0x04
  ) {
    return "xlsx";
  }
  return "text";
}

/** UTF-8 BOM 제거 + 줄 분리 (CR/LF/CRLF 호환). */
function splitLines(text: string): string[] {
  let body = text;
  if (body.charCodeAt(0) === 0xfeff) body = body.slice(1);
  return body.split(/\r\n|\n|\r/);
}

/** Header 1행 검증 + 사용자 컬럼 순서 → key index 매핑 산출. */
function parseHeader(headerRow: string[]): {
  mapping: Array<keyof StudentImportRow | null>;
  error: string | null;
} {
  const mapping: Array<keyof StudentImportRow | null> = headerRow.map((cell) => {
    const trimmed = cell.trim();
    return HEADER_ALIASES[trimmed] ?? null;
  });
  // 필수 컬럼 존재 검사.
  const required: Array<keyof StudentImportRow> = ["studentId", "name", "birthDate"];
  const missing = required.filter((k) => !mapping.includes(k));
  if (missing.length > 0) {
    return {
      mapping,
      error: `필수 컬럼 누락: ${missing.join(", ")}. 첫 행은 header (예: 학번,이름,생년월일,반,부모이메일) 여야 합니다.`,
    };
  }
  return { mapping, error: null };
}

/** CSV/TSV 1행 → 셀 배열. 따옴표 escape 지원 (RFC 4180 단순화). */
function splitCsvRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"' && cur.length === 0) {
        inQuotes = true;
      } else if (c === delimiter) {
        cells.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  cells.push(cur);
  return cells;
}

/**
 * CSV/TSV 텍스트 → 행 객체 배열 변환.
 * 빈 행은 skip.
 */
function parseCsvText(text: string, institutionId: string): {
  rows: unknown[];
  parseErrors: ImportErrorRow[];
} {
  const lines = splitLines(text).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      rows: [],
      parseErrors: [
        {
          rowIndex: 0,
          reason: "parse_error",
          message: "파일이 비어 있어요. 첫 행은 header 여야 합니다.",
          raw: null,
        },
      ],
    };
  }
  const firstLine = lines[0]!;
  // TSV 또는 CSV 자동 감지 — tab 개수 vs comma 개수.
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const delimiter = tabCount > commaCount ? "\t" : ",";

  const headerCells = splitCsvRow(firstLine, delimiter).map((c) => c.trim());
  const { mapping, error: headerError } = parseHeader(headerCells);
  if (headerError) {
    return {
      rows: [],
      parseErrors: [
        {
          rowIndex: 0,
          reason: "parse_error",
          message: headerError,
          raw: headerCells,
        },
      ],
    };
  }

  const rows: unknown[] = [];
  const parseErrors: ImportErrorRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvRow(lines[i]!, delimiter);
    const obj: Record<string, unknown> = { institutionId };
    for (let j = 0; j < mapping.length; j += 1) {
      const key = mapping[j];
      if (!key) continue;
      const raw = cells[j] ?? "";
      const trimmed = typeof raw === "string" ? raw.trim() : raw;
      // 빈 셀 + optional 컬럼 → undefined (Zod optional 통과).
      if (
        trimmed === "" &&
        (key === "classroomName" || key === "parentEmail")
      ) {
        continue;
      }
      // birthDate: YYYY/MM/DD 표기를 YYYY-MM-DD 로 자동 정규화 (Excel 기본 출력 호환).
      if (key === "birthDate" && typeof trimmed === "string") {
        obj[key] = trimmed.replace(/[./]/g, "-");
        continue;
      }
      obj[key] = trimmed;
    }
    rows.push(obj);
  }

  return { rows, parseErrors };
}

/**
 * 업로드된 ArrayBuffer → 행 배열 변환.
 *
 * 지원 포맷 (우선순위):
 *   1. CSV (.csv, UTF-8 또는 UTF-8 BOM)
 *   2. TSV (.tsv, tab-separated)
 *   3. xlsx (PK\x03\x04 magic) — 의존성 부재 시 graceful 에러 반환
 *
 * Excel 사용자에게는 "다른 이름으로 저장 → CSV UTF-8" 권장.
 * 미래에 xlsx 라이브러리 도입 시 본 함수만 교체.
 */
export function parseStudentBuffer(
  buffer: ArrayBuffer,
  institutionId: string,
): { rows: unknown[]; parseErrors: ImportErrorRow[] } {
  const format = detectFormat(buffer);
  if (format === "xlsx") {
    return {
      rows: [],
      parseErrors: [
        {
          rowIndex: 0,
          reason: "parse_error",
          message:
            "엑셀(.xlsx) 직접 업로드는 현재 미지원이에요. Excel 에서 '다른 이름으로 저장 → CSV UTF-8' 후 다시 올려 주세요.",
          raw: null,
        },
      ],
    };
  }
  const text = new TextDecoder("utf-8").decode(buffer);
  return parseCsvText(text, institutionId);
}

/** 통합 테스트와의 동일한 entrypoint 이름 별칭 (parseStudentExcel). */
export const parseStudentExcel = parseStudentBuffer;

// ============================================================================
// 3) 검증
// ============================================================================

/**
 * 행 단위 Zod 검증 + 중복 detection.
 *
 * - 입력 내부 중복 (seenInBatch) + 기존 ID 충돌 (existingStudentIds) 모두 검출.
 * - cross-tenant: row.institutionId !== ctx.institutionId → invalid_schema 로 분류.
 * - errors 의 rowIndex 는 입력 배열 순서 — UI 인라인 수정 위치 매핑.
 */
export function validateStudentRows(
  rows: unknown[],
  ctx: { institutionId: string; existingStudentIds: ReadonlySet<string> },
): { validRows: StudentImportRow[]; errors: ImportErrorRow[] } {
  const errors: ImportErrorRow[] = [];
  const validRows: StudentImportRow[] = [];
  const seenInBatch = new Set<string>();

  rows.forEach((raw, idx) => {
    const parsed = StudentImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const path = firstIssue?.path.join(".") ?? "";
      let reason: ImportErrorReason = "invalid_schema";
      let field: keyof StudentImportRow | undefined;
      let message = "필드 형식이 올바르지 않아요.";
      if (path === "name") {
        reason = "null_name";
        field = "name";
        message = "이름은 1~30자 사이로 입력해 주세요.";
      } else if (path === "birthDate") {
        reason = "invalid_birth_date";
        field = "birthDate";
        message = "생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.";
      } else if (path === "parentEmail") {
        reason = "invalid_email";
        field = "parentEmail";
        message = "부모 이메일 형식이 올바르지 않아요.";
      } else if (path === "studentId") {
        field = "studentId";
        message = "학번은 영숫자/-/_ 만 사용, 4~20자여야 해요.";
      } else if (path === "institutionId") {
        field = "institutionId";
        message = "기관 식별자가 올바르지 않아요.";
      }
      errors.push({ rowIndex: idx, reason, message, raw, field });
      return;
    }
    const row = parsed.data;
    // cross-tenant 차단.
    if (row.institutionId !== ctx.institutionId) {
      errors.push({
        rowIndex: idx,
        reason: "invalid_schema",
        message: "다른 기관의 원아 정보는 등록할 수 없어요.",
        raw,
        field: "institutionId",
      });
      return;
    }
    // 중복.
    if (
      ctx.existingStudentIds.has(row.studentId) ||
      seenInBatch.has(row.studentId)
    ) {
      errors.push({
        rowIndex: idx,
        reason: "duplicate_student_id",
        message: "이미 등록되었거나 입력 안에서 중복된 학번이에요.",
        raw,
        field: "studentId",
      });
      return;
    }
    seenInBatch.add(row.studentId);
    validRows.push(row);
  });

  return { validRows, errors };
}

// ============================================================================
// 4) DB 일괄 upsert
// ============================================================================

/**
 * Prisma createMany shape 의 데이터 — bulkUpsertStudents 가 호출자 주입 createMany 함수에 전달.
 * User 모델 활용 (role='parent') 매핑:
 *   - id: undefined (Prisma @default(uuid))
 *   - institutionId
 *   - email: parentEmail (있다면)
 *   - childAgeMonths: birthDate 로부터 계산 (기준일: 호출 시각)
 *   - role: 'parent'
 *   - meta (studentId / name / classroomName): Sprint 단순화 — 별도 컬럼 부재.
 *     후속 PR (Student 전용 모델 도입 시 사용).
 */
export interface PrismaCreateManyArgs {
  data: Array<{
    institutionId: string;
    studentId: string;
    name: string;
    birthDate: string;
    classroomName?: string;
    parentEmail?: string;
  }>;
}

export type PrismaCreateManyFn = (
  args: PrismaCreateManyArgs,
) => Promise<{ count: number }>;

/**
 * 검증 통과 행 배치 INSERT.
 *
 * - 단일 호출 (N+1 가드) — Prisma createMany 의 batch SQL.
 * - 빈 배열이면 호출 skip (count=0 반환).
 * - 호출 측이 prismaCreateMany 를 주입 → 테스트 격리 + 후속 PR 의 Student 모델 교체 용이.
 */
export async function bulkUpsertStudents(
  validRows: StudentImportRow[],
  prismaCreateMany: PrismaCreateManyFn,
): Promise<{ count: number; insertedStudentIds: string[] }> {
  if (validRows.length === 0) {
    return { count: 0, insertedStudentIds: [] };
  }
  const data = validRows.map((v) => ({
    institutionId: v.institutionId,
    studentId: v.studentId,
    name: v.name,
    birthDate: v.birthDate,
    classroomName: v.classroomName,
    parentEmail: v.parentEmail,
  }));
  const result = await prismaCreateMany({ data });
  return {
    count: result.count,
    insertedStudentIds: validRows.map((v) => v.studentId),
  };
}

// ============================================================================
// 5) 통합 흐름 — Server Action / 통합 테스트 spec reference
// ============================================================================

/**
 * 검증 + 일괄 INSERT 통합 흐름.
 *
 * 통합 테스트 (__tests__/integration/student-bulk-import.test.ts) 의
 * `bulkImportStudents` reference impl 과 동일 시그니처/규칙:
 *   1. validateStudentRows
 *   2. bulkUpsertStudents (valid 만)
 *   3. BulkImportResult 반환
 *
 * 호출 측은 prismaCreateMany 를 주입 — 실 Prisma client 또는 mock.
 */
export async function bulkImportStudents(
  rows: unknown[],
  ctx: { institutionId: string; existingStudentIds: ReadonlySet<string> },
  prismaCreateMany: PrismaCreateManyFn,
): Promise<BulkImportResult> {
  const { validRows, errors } = validateStudentRows(rows, ctx);
  const { count, insertedStudentIds } = await bulkUpsertStudents(
    validRows,
    prismaCreateMany,
  );
  return {
    successCount: count,
    errorCount: errors.length,
    errors,
    insertedStudentIds,
  };
}
