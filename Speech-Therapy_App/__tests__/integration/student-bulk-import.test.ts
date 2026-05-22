// TEST-012 — 원아 엑셀 100명 일괄 등록 + 오류 행 인라인 수정 통합 시뮬.
//
// 목적:
//   FR-C-016 (엑셀 일괄 등록) 의 서버 측 가져오기 로직을 합성 데이터로 검증.
//   현재 FR-C-016 구현체 (app/actions/bulk-import-students 등) 가 부재하므로 본 테스트는
//   **명세 (spec) 겸 sentinel** 역할:
//     - 합성 입력 / Zod schema / 중복 검출 / institution 격리 / 인라인 수정 재시도 의
//       기대 동작을 코드로 고정해, 미래 구현 시 회귀 가드로 즉시 활성화.
//
// 격리:
//   - 실 Prisma / Resend / xlsx / fetch 호출 0건.
//   - 본 테스트는 행 단위 객체 배열 (`StudentImportRow[]`) 을 직접 입력으로 가정.
//     엑셀 파서 (xlsx) 는 spec 범위 외 — FR-C-016 구현 시 별도 단위 테스트로 분리.
//
// 결정적 PRNG:
//   - mulberry32 seed 고정 (TEST-006 mission-retention 패턴 재사용).
//   - CI 재현 보장 — Math.random 사용 금지.
//
// 7 시나리오:
//   sc1: 100 합성 원아 → batch INSERT mock → 100건 success (REQ-FUNC-054 성능 게이트)
//   sc2: 5건 오류 (중복 학번 / null 이름 / 잘못된 생년월일) → 95 success + 5 error 행
//   sc3: 오류 행 인라인 수정 후 재시도 → 100건 success (REQ-FUNC-055 인라인 수정)
//   sc4: 1,000건 시뮬 (성능) — 처리 시간 < 5초 (mock 환경; 실 부하 p95 는 PERF-001)
//   sc5: institutionId 격리 — 타 institution 의 중복 학번은 무시 (REQ-NF-SEC)
//   sc6: 필수 필드 검증 — Zod schema 자동 거부 (R4: 본명 컬럼은 무시)
//   sc7: 격리 — 본 테스트는 외부 호출 0건 (prisma / fetch / resend 미사용)
//
// 참고:
//   - issue #86 본문은 8개 시나리오 (cron Resend spy 등) 를 언급하나 본 sub-session 범위는
//     server-side bulk import 로직 spec 7개로 한정. FR-C-018 (동의서 cron) 은 별도 task.

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// ---------- 결정적 PRNG (mulberry32) — TEST-006 재사용 ----------
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uuid(seed: number): string {
  const r = mulberry32(seed);
  const hex = (n: number) =>
    Math.floor(r() * 16 ** n)
      .toString(16)
      .padStart(n, "0");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
}

// ---------- FR-C-016 spec: 입력 행 스키마 ----------
// 미래 구현 시 lib/schemas/student.ts 로 이동 예정. 본 테스트가 spec 역할.
// 필드:
//   - studentId: 기관 내 unique 학번 (영숫자 4~20자).
//   - name: 원아 이름 (1~30자). R4 제약 — DB 저장 시 nickname 으로 매핑되어야 하나
//     본 테스트 spec 단계에서는 입력 검증만 수행.
//   - birthDate: YYYY-MM-DD ISO date 문자열 (만 2~7세 범위).
//   - institutionId: UUID, 호출자 (teacher/principal) 의 institution 으로 강제.
const StudentImportRowSchema = z.object({
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
});
type StudentImportRow = z.infer<typeof StudentImportRowSchema>;

interface ImportErrorRow {
  rowIndex: number;
  reason:
    | "duplicate_student_id"
    | "invalid_schema"
    | "null_name"
    | "invalid_birth_date";
  raw: unknown;
}

interface BulkImportResult {
  successCount: number;
  errorCount: number;
  errors: ImportErrorRow[];
  /// 멱등성: 동일 institutionId+studentId 재시도 시 중복으로 차단.
  insertedIds: string[];
}

// ---------- spec: 가져오기 로직 (FR-C-016 미구현 시 본 함수가 reference) ----------
// 실 구현 (예정 위치 — app/actions/students.ts) 와 동일 시그니처/규칙:
//   1. 각 행 Zod schema 통과 검사.
//   2. 동일 institutionId 내 studentId 중복 검출 (입력 내부 + DB 기존).
//   3. 실패 행은 별도 errors 배열로 반환 — 부분 성공 허용 (사용자 인라인 수정 후 재시도).
//   4. 성공 행만 prisma.user.createMany (mock) 호출.
async function bulkImportStudents(
  rows: unknown[],
  ctx: { institutionId: string; existingStudentIds: Set<string> },
  prismaCreateManyMock: (args: {
    data: Array<{
      institutionId: string;
      studentId: string;
      name: string;
      birthDate: string;
    }>;
  }) => Promise<{ count: number }>,
): Promise<BulkImportResult> {
  const errors: ImportErrorRow[] = [];
  const valid: StudentImportRow[] = [];
  const seenInBatch = new Set<string>();

  rows.forEach((raw, idx) => {
    const parsed = StudentImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      // null name 또는 birthDate format 위반 등 ZodError 의 첫 issue 로 분기.
      const firstIssue = parsed.error.issues[0];
      let reason: ImportErrorRow["reason"] = "invalid_schema";
      if (firstIssue?.path.join(".") === "name") reason = "null_name";
      else if (firstIssue?.path.join(".") === "birthDate")
        reason = "invalid_birth_date";
      errors.push({ rowIndex: idx, reason, raw });
      return;
    }
    const row = parsed.data;
    // institution 격리: 입력의 institutionId 가 ctx 와 다르면 reject (cross-tenant 차단).
    if (row.institutionId !== ctx.institutionId) {
      errors.push({ rowIndex: idx, reason: "invalid_schema", raw });
      return;
    }
    // 중복 검출 — 동일 institution 내에서만. (sc5: 타 institution 중복은 통과)
    if (
      ctx.existingStudentIds.has(row.studentId) ||
      seenInBatch.has(row.studentId)
    ) {
      errors.push({ rowIndex: idx, reason: "duplicate_student_id", raw });
      return;
    }
    seenInBatch.add(row.studentId);
    valid.push(row);
  });

  let inserted: { count: number } = { count: 0 };
  if (valid.length > 0) {
    inserted = await prismaCreateManyMock({
      data: valid.map((v) => ({
        institutionId: v.institutionId,
        studentId: v.studentId,
        name: v.name,
        birthDate: v.birthDate,
      })),
    });
  }

  return {
    successCount: inserted.count,
    errorCount: errors.length,
    errors,
    insertedIds: valid.map((v) => v.studentId),
  };
}

// ---------- 픽스처 생성기 ----------
const FIXED_INSTITUTION = uuid(0xb2b_0001);

function makeValidRow(rand: () => number, idx: number): StudentImportRow {
  // 학번: STU + 8자리 결정적 hex.
  const studentId = `STU${Math.floor(rand() * 0xff_ffff)
    .toString(16)
    .padStart(6, "0")}${idx.toString().padStart(3, "0")}`;
  // 한글 이름 합성: 김/이/박/최/정 + 2글자.
  const surnames = ["김", "이", "박", "최", "정"];
  const firsts = ["서윤", "도윤", "지우", "하준", "예준", "지호", "수아", "민서"];
  const surname = surnames[Math.floor(rand() * surnames.length)] ?? "김";
  const first = firsts[Math.floor(rand() * firsts.length)] ?? "서윤";
  const name = `${surname}${first}`;
  // 만 2~7세 → 2019~2024 년생 (today=2026-05).
  const year = 2019 + Math.floor(rand() * 6);
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  const birthDate = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;

  return {
    studentId,
    name,
    birthDate,
    institutionId: FIXED_INSTITUTION,
  };
}

describe("TEST-012 — 원아 100명 엑셀 일괄 등록 + 인라인 수정 통합 (FR-C-016 spec)", () => {
  // ===== sc1: 100 합성 원아 → batch INSERT mock → 100건 success =====
  it("sc1 — 100 합성 원아 → 100건 모두 success + createMany 1회 호출", async () => {
    const rand = mulberry32(0xc0ffee);
    const rows: StudentImportRow[] = Array.from({ length: 100 }, (_, i) =>
      makeValidRow(rand, i),
    );
    // 학번 unique 보장 (sanity).
    const uniqueIds = new Set(rows.map((r) => r.studentId));
    expect(uniqueIds.size).toBe(100);

    const createManyMock = vi.fn(async (args: { data: unknown[] }) => ({
      count: args.data.length,
    }));

    const t0 = performance.now();
    const result = await bulkImportStudents(
      rows,
      {
        institutionId: FIXED_INSTITUTION,
        existingStudentIds: new Set(),
      },
      createManyMock,
    );
    const durationMs = performance.now() - t0;

    expect(result.successCount).toBe(100);
    expect(result.errorCount).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(result.insertedIds).toHaveLength(100);
    expect(createManyMock).toHaveBeenCalledTimes(1);
    // batch 호출: 100건 한꺼번에 (N+1 쿼리 가드).
    expect((createManyMock.mock.calls[0]?.[0] as { data: unknown[] }).data).toHaveLength(
      100,
    );
    // mock 환경 sanity — 100건 < 1초.
    expect(durationMs).toBeLessThan(1_000);
  });

  // ===== sc2: 5건 오류 → 95 success + 5 error 행 =====
  it("sc2 — 5건 오류 (중복/null name/잘못된 birthDate) → 95 success + 5 error 행 반환", async () => {
    const rand = mulberry32(0xbadc0de);
    const validRows: StudentImportRow[] = Array.from({ length: 95 }, (_, i) =>
      makeValidRow(rand, i),
    );
    // 5건 오류 픽스처: 2 중복 + 1 null name + 1 잘못된 birthDate + 1 schema 위반.
    const duplicate1 = { ...validRows[0]! }; // 중복 학번
    const duplicate2 = { ...validRows[1]! }; // 중복 학번
    const nullName = { ...makeValidRow(rand, 9001), name: "" }; // min(1) 위반
    const badDate = { ...makeValidRow(rand, 9002), birthDate: "2020/01/01" }; // regex 위반
    const schemaViolation = {
      studentId: "X", // min(4) 위반
      name: "테스트",
      birthDate: "2022-01-01",
      institutionId: FIXED_INSTITUTION,
    };

    const rows: unknown[] = [
      ...validRows,
      duplicate1,
      duplicate2,
      nullName,
      badDate,
      schemaViolation,
    ];

    const createManyMock = vi.fn(async (args: { data: unknown[] }) => ({
      count: args.data.length,
    }));

    const result = await bulkImportStudents(
      rows,
      {
        institutionId: FIXED_INSTITUTION,
        existingStudentIds: new Set(),
      },
      createManyMock,
    );

    expect(result.successCount).toBe(95);
    expect(result.errorCount).toBe(5);
    expect(result.errors).toHaveLength(5);

    // 분류 검증 — 각 reason 카운트.
    const reasons = result.errors.map((e) => e.reason);
    expect(reasons.filter((r) => r === "duplicate_student_id").length).toBe(2);
    expect(reasons.filter((r) => r === "null_name").length).toBe(1);
    expect(reasons.filter((r) => r === "invalid_birth_date").length).toBe(1);
    expect(reasons.filter((r) => r === "invalid_schema").length).toBe(1);

    // 오류 행의 rowIndex 는 입력 배열 순서 — UI 인라인 수정 위치 매핑용.
    for (const err of result.errors) {
      expect(err.rowIndex).toBeGreaterThanOrEqual(0);
      expect(err.rowIndex).toBeLessThan(rows.length);
    }
  });

  // ===== sc3: 오류 행 인라인 수정 후 재시도 → 100건 success (REQ-FUNC-055) =====
  it("sc3 — 오류 행 인라인 수정 후 재시도 → 100건 success (인라인 편집 플로우)", async () => {
    const rand = mulberry32(0x5eed_002);
    const validRows = Array.from({ length: 95 }, (_, i) => makeValidRow(rand, i));
    const errorRows = [
      { ...makeValidRow(rand, 9101), name: "" }, // null name
      { ...makeValidRow(rand, 9102), birthDate: "잘못된날짜" }, // invalid date
      { ...validRows[0]! }, // 중복
      { ...validRows[1]! }, // 중복
      { ...validRows[2]! }, // 중복
    ];
    const rows1: unknown[] = [...validRows, ...errorRows];

    const createManyMock = vi.fn(async (args: { data: unknown[] }) => ({
      count: args.data.length,
    }));

    // 1차 시도: 5건 실패.
    const first = await bulkImportStudents(
      rows1,
      {
        institutionId: FIXED_INSTITUTION,
        existingStudentIds: new Set(),
      },
      createManyMock,
    );
    expect(first.successCount).toBe(95);
    expect(first.errorCount).toBe(5);

    // 사용자 인라인 수정 시뮬: 5건 모두 정상 행으로 교체 + 학번 unique 보장.
    const fixed: StudentImportRow[] = errorRows.map((_, i) => ({
      ...makeValidRow(rand, 9_500 + i),
      // 학번 강제 unique (mulberry32 seed 와 무관하게 충돌 회피).
      studentId: `FIXED${i.toString().padStart(3, "0")}`,
    }));

    // 2차 시도: 1차에서 성공한 95건은 existingStudentIds 에 누적 → 중복 차단됨.
    // 따라서 2차 입력은 fixed 5건만.
    const second = await bulkImportStudents(
      fixed,
      {
        institutionId: FIXED_INSTITUTION,
        existingStudentIds: new Set(first.insertedIds),
      },
      createManyMock,
    );
    expect(second.successCount).toBe(5);
    expect(second.errorCount).toBe(0);

    const totalSuccess = first.successCount + second.successCount;
    expect(totalSuccess).toBe(100);
    // createMany 는 2회 호출 (1차 batch + 2차 batch).
    expect(createManyMock).toHaveBeenCalledTimes(2);
  });

  // ===== sc4: 1,000건 시뮬 (성능 sentinel) =====
  it("sc4 — 1,000건 처리 시간 < 5초 (mock 환경 성능 sentinel; REQ-FUNC-054)", async () => {
    const rand = mulberry32(0xfafafafa);
    const rows = Array.from({ length: 1_000 }, (_, i) => makeValidRow(rand, i));
    // 학번 unique sanity — 1,000건 충돌 없음 보장 (idx suffix 로 결정적 unique).
    expect(new Set(rows.map((r) => r.studentId)).size).toBe(1_000);

    const createManyMock = vi.fn(async (args: { data: unknown[] }) => ({
      count: args.data.length,
    }));

    const t0 = performance.now();
    const result = await bulkImportStudents(
      rows,
      {
        institutionId: FIXED_INSTITUTION,
        existingStudentIds: new Set(),
      },
      createManyMock,
    );
    const durationMs = performance.now() - t0;

    expect(result.successCount).toBe(1_000);
    expect(result.errorCount).toBe(0);
    expect(durationMs).toBeLessThan(5_000); // REQ-FUNC-054 sentinel (mock 환경).
    expect(createManyMock).toHaveBeenCalledTimes(1);
  });

  // ===== sc5: institutionId 격리 — 타 institution 학번 중복 무시 (REQ-NF-SEC) =====
  it("sc5 — institutionId 격리: 타 institution 의 중복 학번은 통과 (REQ-NF-SEC)", async () => {
    const myInstitution = FIXED_INSTITUTION;
    const otherInstitution = uuid(0xb2b_9999);

    // 동일 학번이 타 institution 에 존재한다고 가정 → 본 institution 의 등록은 통과해야 함.
    const myRows: StudentImportRow[] = [
      {
        studentId: "STU000001",
        name: "김서윤",
        birthDate: "2022-03-15",
        institutionId: myInstitution,
      },
      {
        studentId: "STU000002",
        name: "이도윤",
        birthDate: "2021-08-22",
        institutionId: myInstitution,
      },
    ];

    // ctx.existingStudentIds 는 호출자 institution 의 기존 학번만 포함해야 함 (server-side 격리).
    // 타 institution 학번은 절대 포함 금지 → spec: 본 set 은 항상 myInstitution scope.
    const existingInMyInstitution = new Set<string>(); // 본 institution 에는 아직 없음.

    const createManyMock = vi.fn(async (args: { data: unknown[] }) => ({
      count: args.data.length,
    }));

    const result = await bulkImportStudents(
      myRows,
      {
        institutionId: myInstitution,
        existingStudentIds: existingInMyInstitution,
      },
      createManyMock,
    );
    // 타 institution 의 동일 학번 존재 여부와 무관 → 2건 모두 success.
    expect(result.successCount).toBe(2);
    expect(result.errorCount).toBe(0);

    // 음성 검증: 잘못 만든 입력 — myRows 중 1건이 타 institution 으로 시도 → 차단됨.
    const crossTenantRow: StudentImportRow = {
      studentId: "STU000003",
      name: "박지우",
      birthDate: "2022-01-01",
      institutionId: otherInstitution, // 호출자 ctx 와 다름 → reject
    };
    const result2 = await bulkImportStudents(
      [crossTenantRow],
      {
        institutionId: myInstitution,
        existingStudentIds: new Set(),
      },
      createManyMock,
    );
    expect(result2.successCount).toBe(0);
    expect(result2.errorCount).toBe(1);
    expect(result2.errors[0]?.reason).toBe("invalid_schema");
  });

  // ===== sc6: 필수 필드 검증 — Zod schema 자동 거부 (R4) =====
  it("sc6 — Zod schema: 필수 필드 누락 / 본명 컬럼 (R4) 자동 거부", async () => {
    // R4 (자녀 본명 미저장): 본 spec 의 StudentImportRowSchema 는 name 만 허용.
    // 입력에 본명 컬럼이 별도 키 (e.g. "realName") 으로 와도 schema 가 strip — 저장되지 않음.
    // (Zod 기본 동작: object schema 는 추가 키를 무시. strict 모드 미사용으로 통과 + drop.)
    const rowWithExtraKey: Record<string, unknown> = {
      studentId: "STU999999",
      name: "별명아이", // 닉네임만 저장
      birthDate: "2022-05-05",
      institutionId: FIXED_INSTITUTION,
      realName: "본명아이", // R4 위반 시도 — 무시되어야 함
      ssn: "990101-1234567", // 민감 정보 시도 — 무시되어야 함
    };

    const parsed = StudentImportRowSchema.safeParse(rowWithExtraKey);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const data = parsed.data as Record<string, unknown>;
      // R4: realName / ssn 은 schema 통과 후 결과에 없음.
      expect(data.realName).toBeUndefined();
      expect(data.ssn).toBeUndefined();
      expect(data.name).toBe("별명아이");
    }

    // 필수 필드 누락 검증.
    const missingName = StudentImportRowSchema.safeParse({
      studentId: "STU000001",
      birthDate: "2022-01-01",
      institutionId: FIXED_INSTITUTION,
    });
    expect(missingName.success).toBe(false);

    const missingBirth = StudentImportRowSchema.safeParse({
      studentId: "STU000001",
      name: "김서윤",
      institutionId: FIXED_INSTITUTION,
    });
    expect(missingBirth.success).toBe(false);

    const missingInstitution = StudentImportRowSchema.safeParse({
      studentId: "STU000001",
      name: "김서윤",
      birthDate: "2022-01-01",
    });
    expect(missingInstitution.success).toBe(false);

    // 필드 길이/형식 위반.
    const tooLongName = StudentImportRowSchema.safeParse({
      studentId: "STU000001",
      name: "가".repeat(31), // max(30) 위반
      birthDate: "2022-01-01",
      institutionId: FIXED_INSTITUTION,
    });
    expect(tooLongName.success).toBe(false);
  });

  // ===== sc7: 격리 — 실 외부 호출 0건 =====
  it("sc7 — 격리: 본 테스트는 prisma / fetch / resend 실 호출 0건 (mock 만 사용)", async () => {
    // 본 테스트 파일에서 vi.mock 으로 모듈을 mock 한 적이 없음 — bulkImportStudents 는
    // 순수 함수 + 호출자 주입 mock 만 사용. spy 객체 호출 카운트로 검증.
    const rand = mulberry32(7);
    const rows = Array.from({ length: 10 }, (_, i) => makeValidRow(rand, i));
    const createManyMock = vi.fn(async (args: { data: unknown[] }) => ({
      count: args.data.length,
    }));

    const result = await bulkImportStudents(
      rows,
      {
        institutionId: FIXED_INSTITUTION,
        existingStudentIds: new Set(),
      },
      createManyMock,
    );
    expect(result.successCount).toBe(10);
    // createManyMock 만 호출 — 다른 외부 의존 0건.
    expect(createManyMock).toHaveBeenCalledTimes(1);

    // 결정적 PRNG 검증 — 동일 seed 두 번 호출 시 동일 시퀀스 (CI 재현 가드).
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    for (let i = 0; i < 5; i += 1) {
      expect(r1()).toBe(r2());
    }
  });
});
