// FR-Q-TEACHER + FR-C-017+ — 반 단위 쿠션어 알림장 일괄(fan-out) 발송 핵심 로직.
//
// 책임 (lib 단, side-effect 격리):
//   1. loadClassroomForBatch — 권한 검증 + Class + students (User role=parent) fetch
//   2. processStudentForBatch — 학생 1명 단위 본문 generate + 이메일 발송 (graceful)
//   3. enforceClassroomRateLimit — 반 단위 in-memory rate-limit (1시간 1회)
//
// 본 모듈은 Server Action (`app/actions/classroom-cushion.ts`) 에서만 호출.
// 단일 책임 — 인증 (`supabase.auth.getUser`) 는 호출 측이 선행, 본 모듈은 viewer context 만 받음.
//
// RBAC:
//   - teacher: 본인 담당 반 만 (Class.teacherId === viewer.userId)
//   - principal: 본인 institutionId 의 Class
//   - admin: 모든 Class
//   - expert/parent: 호출 측에서 차단 (본 모듈은 viewer.role 만 검증, 정의 외 role 는 forbidden)
//
// R4 보호:
//   - parentEmail 은 본인 (수신자=부모) 만 사용
//   - 분석/로그에는 classId + 카운트만 — email/이름/userId 직접 노출 금지 (호출 측 책임)
//
// 운영 제약:
//   - 반당 학생 최대 100명 (운영 limit, BATCH_MAX_STUDENTS)
//   - 반당 1시간 1회 발송 (RATE_LIMIT_WINDOW_MS)
//
// graceful 분기 매트릭스 (개별 학생 실패가 다른 학생을 막지 않음):
//   - parentEmail 부재 / 빈값                 → skipped
//   - 최신 EvaluationResult 부재               → skipped (graceful template 생성 불가 — base 데이터 부재)
//   - generateCushionNote 가 template 폴백      → 정상 진행 (CON-04 통과 보장 본문)
//   - sendCushionNoteEmail skipped              → skipped 카운트 누적
//   - sendCushionNoteEmail ok=false             → errors 카운트 누적
//
// CON-04 (의료 금칙어):
//   - 본문 생성은 generateCushionNote → 금칙어 검출 시 자동 template swap
//   - sendEmail 단에서 한 번 더 banned_term 차단 → ok=false 로 errors 카운트
//   - 본 모듈은 추가 sanitize 미수행 (이중 검증 신뢰).

import { prisma } from "@/lib/db";
import {
  generateCushionNote,
  type TargetPhoneme,
} from "@/lib/cushion/generate";
import {
  sendCushionNoteEmail,
  type CushionEmailResult,
} from "@/lib/cushion/email";

/// 반당 처리 가능한 학생 최대 수 (운영 limit, fan-out spam 회피).
export const BATCH_MAX_STUDENTS = 100;

/// 반당 fan-out 발송 rate-limit 윈도우 (1시간).
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/// viewer context — 호출 측 (Server Action) 이 Supabase auth 통과 후 전달.
export interface ClassroomBatchViewer {
  /// User.id (UUID) — Supabase auth.getUser().id.
  userId: string;
  /// teacher / principal / admin 중 하나.
  role: "teacher" | "principal" | "admin";
  /// principal 권한 범위 — 본인 institutionId 의 Class 만.
  institutionId: string | null;
}

/// 학생 1명 단위 입력 (본문 생성 + 발송).
export interface BatchStudentInput {
  /// User.id (UUID).
  userId: string;
  /// User.email — 부재 / 빈값이면 skipped 처리.
  parentEmail: string | null;
  /// (선택) 학생 이름. Supabase User 스키마엔 별도 column 부재 — 호출 측이 fallback.
  childName?: string;
}

/// loadClassroomForBatch 결과 — Server Action 이 fan-out 흐름에 사용.
export interface ClassroomBatchContext {
  /// Class.id.
  classId: string;
  /// Class.name.
  className: string;
  /// 발신 기관명 (Institution.name, 서명 line 용).
  institutionName: string | null;
  /// 본 반의 parent 학생 목록 (최대 BATCH_MAX_STUDENTS).
  students: BatchStudentInput[];
}

/// loadClassroomForBatch 에러 종류 — 호출 측이 HTTP status 매핑.
export type ClassroomBatchAuthError = "not_found" | "forbidden";

export class ClassroomBatchError extends Error {
  constructor(public readonly code: ClassroomBatchAuthError) {
    super(code);
    this.name = "ClassroomBatchError";
  }
}

/// processStudentForBatch 결과 분기 라벨.
export type StudentBatchOutcome =
  | { kind: "sent"; userId: string }
  | { kind: "skipped"; userId: string; reason: string }
  | { kind: "errored"; userId: string; reason: string };

// ============================================================================
// 권한 + Class fetch
// ============================================================================

/**
 * 권한 검증 + Class + 본 반의 parent 학생 목록 fetch.
 *
 * RBAC 흐름:
 *   1. Class fetch (id + institutionId + teacherId + Institution.name)
 *   2. role 별 권한:
 *      - admin: 무조건 통과
 *      - principal: Class.institutionId === viewer.institutionId
 *      - teacher: Class.teacherId === viewer.userId
 *   3. 불통 → ClassroomBatchError("forbidden")
 *
 * @throws ClassroomBatchError (not_found / forbidden)
 */
export async function loadClassroomForBatch(
  classId: string,
  viewer: ClassroomBatchViewer,
): Promise<ClassroomBatchContext> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      teacherId: true,
      institutionId: true,
      institution: { select: { name: true } },
      users: {
        where: { role: "parent" },
        // BATCH_MAX_STUDENTS + 1 까지 가져와서 limit 초과 분기 가능 — 현재는 take 만 사용
        // (Server Action 에서 attempted 카운트로 입력 제한).
        take: BATCH_MAX_STUDENTS,
        orderBy: { id: "asc" },
        select: { id: true, email: true },
      },
    },
  });

  if (!cls) {
    throw new ClassroomBatchError("not_found");
  }

  // RBAC L2 — role 별 권한.
  let authorized = false;
  if (viewer.role === "admin") {
    authorized = true;
  } else if (viewer.role === "principal") {
    authorized =
      !!viewer.institutionId &&
      !!cls.institutionId &&
      viewer.institutionId === cls.institutionId;
  } else if (viewer.role === "teacher") {
    authorized = !!cls.teacherId && cls.teacherId === viewer.userId;
  }

  if (!authorized) {
    throw new ClassroomBatchError("forbidden");
  }

  const students: BatchStudentInput[] = cls.users.map((u) => ({
    userId: u.id,
    parentEmail: u.email,
  }));

  return {
    classId: cls.id,
    className: cls.name,
    institutionName: cls.institution?.name ?? null,
    students,
  };
}

// ============================================================================
// 학생 1명 단위 처리 (graceful)
// ============================================================================

const PHONEME_FALLBACK: TargetPhoneme = "ㅅ";

/** EvaluationResult.targetPhoneme 가 5종 음소 enum 외 일 때 안전 폴백. */
function normalizePhoneme(value: string | null | undefined): TargetPhoneme {
  if (
    value === "ㄱ" ||
    value === "ㄴ" ||
    value === "ㅅ" ||
    value === "ㅈ" ||
    value === "ㄹ"
  ) {
    return value;
  }
  return PHONEME_FALLBACK;
}

/// EvaluationResult 의 최신 1건 — processStudentForBatch 의 본문 generate 입력.
export interface LatestEvaluationSnapshot {
  id: string;
  targetPhoneme: string;
  articulationScore: number;
  linguisticScore: number;
  acousticScore: number;
}

/**
 * 학생 1명 단위 본문 generate + 이메일 발송 (graceful).
 *
 * 분기:
 *   1. parentEmail 부재          → skipped: 'no_parent_email'
 *   2. latestEvaluation 부재     → skipped: 'no_evaluation'
 *   3. 본문 generate (template fallback 가능 — CON-04 통과 보장)
 *   4. sendCushionNoteEmail 호출
 *      - skipped (test env / api key / Resend skip) → skipped
 *      - ok=false (banned_term / SDK 실패 / timeout) → errored
 *      - ok=true                                     → sent
 *
 * 본 함수는 절대 throw 하지 않음 (예외는 catch → errored 분기).
 */
export async function processStudentForBatch(
  student: BatchStudentInput,
  latestEvaluation: LatestEvaluationSnapshot | null,
  context: {
    institutionName: string | null;
    senderName?: string;
  },
): Promise<StudentBatchOutcome> {
  const parentEmail = (student.parentEmail ?? "").trim();
  if (parentEmail.length === 0) {
    return { kind: "skipped", userId: student.userId, reason: "no_parent_email" };
  }

  if (!latestEvaluation) {
    return { kind: "skipped", userId: student.userId, reason: "no_evaluation" };
  }

  // 본문 생성 — 절대 throw 하지 않음 (graceful template fallback).
  let noteText: string;
  try {
    const generated = await generateCushionNote({
      evaluationResultId: latestEvaluation.id,
      studentName: student.childName,
      targetPhoneme: normalizePhoneme(latestEvaluation.targetPhoneme),
      articulationScore: latestEvaluation.articulationScore,
      linguisticScore: latestEvaluation.linguisticScore,
      acousticScore: latestEvaluation.acousticScore,
    });
    noteText = generated.text;
  } catch (err) {
    // generateCushionNote 는 throw 하지 않지만 방어적 처리.
    return {
      kind: "errored",
      userId: student.userId,
      reason: `generate_failed:${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  let emailResult: CushionEmailResult;
  try {
    emailResult = await sendCushionNoteEmail({
      evaluationResultId: latestEvaluation.id,
      parentEmail,
      childName: student.childName?.trim() || "자녀",
      noteText,
      senderName: context.senderName?.trim() || undefined,
      institutionName: context.institutionName ?? undefined,
    });
  } catch (err) {
    return {
      kind: "errored",
      userId: student.userId,
      reason: `send_failed:${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  if (emailResult.sent) {
    return { kind: "sent", userId: student.userId };
  }
  if (emailResult.skipped) {
    return {
      kind: "skipped",
      userId: student.userId,
      reason: emailResult.error ?? "resend_skipped",
    };
  }
  return {
    kind: "errored",
    userId: student.userId,
    reason: emailResult.error ?? "resend_error",
  };
}

// ============================================================================
// In-memory rate-limit (반당 1시간 1회)
// ============================================================================

/// classId → 직전 발송 시각 (epoch ms).
/// Vercel cold start 마다 초기화 — 보수적 (in-memory 단일 인스턴스 가정).
/// 다중 인스턴스 환경에서는 동일 반에 동시 발송이 통과될 수 있음 — Upstash 도입은 별도 PR.
const lastBatchAtMs = new Map<string, number>();

/// enforceClassroomRateLimit 결과.
export interface ClassroomRateLimitResult {
  allowed: boolean;
  /// 차단된 경우 다음 시도 가능까지 남은 초.
  retryAfterSec?: number;
}

/**
 * 반당 fan-out 발송 rate-limit 검사 (1시간 1회).
 *
 * - allowed=true 반환 시 호출 측이 발송 진행 직후 markClassroomBatchSent(classId) 호출.
 * - allowed=false 반환 시 호출 측은 429 응답 (Server Action 은 rate_limited 라벨).
 *
 * 두 함수가 분리된 이유:
 *   - 검사 단계에서 실패하면 카운터 증가 X (rate-limit 회피 어뷰징 방지)
 *   - 검사 통과 + 실 발송 후에만 markClassroomBatchSent → "발송이 실제로 일어났다" 보장
 */
export function enforceClassroomRateLimit(
  classId: string,
  now: number = Date.now(),
): ClassroomRateLimitResult {
  const last = lastBatchAtMs.get(classId);
  if (last !== undefined && now - last < RATE_LIMIT_WINDOW_MS) {
    const retryAfterMs = last + RATE_LIMIT_WINDOW_MS - now;
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }
  return { allowed: true };
}

/// 발송 완료 시각 기록 — 다음 1시간 동안 동일 classId 차단.
export function markClassroomBatchSent(
  classId: string,
  now: number = Date.now(),
): void {
  lastBatchAtMs.set(classId, now);
}

/** 테스트용 — in-memory rate-limit 상태 초기화. */
export function __resetClassroomBatchRateLimitForTest(): void {
  lastBatchAtMs.clear();
}
