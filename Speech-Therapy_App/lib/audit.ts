// SEC-002 (DB-011 후속) — AuditLog INSERT helper (PostgreSQL TRIGGER 미사용).
//
// 동기:
//   DB-011 migration 의 AuditLog 테이블 + RLS 정책 (audit_select_admin) 이 이미 존재.
//   본 모듈은 _명시적_ INSERT helper — 호출 측이 보안/멱등성 흐름 다음 단계에 호출.
//   PostgreSQL CREATE TRIGGER (자동 INSERT) 는 별도 PR (Prisma migration 위험 → 격리).
//
// 정책 결정:
//   1) service_role 클라이언트 사용 — RLS 우회 (INSERT 는 default deny 정책).
//      lib/supabase/admin.ts 의 getSupabaseAdmin() 패턴 재사용.
//   2) action 은 union literal 로 제한 — 무한 enum drift 방어. 필요 시 명시 확장.
//   3) payload (Json) 에 자녀 식별 정보 (realName / ssn / email 등) 의심 키워드 검출
//      시 console.warn 만 — 호출 측 책임 명시 (R4). 자동 strip 은 false-positive
//      우려로 미수행. 추후 별도 sanitizer 함수 분리 가능.
//   4) 실 INSERT 실패는 graceful — console.error 만, 메인 흐름 차단 X.
//      audit log 손실 < 사용자 흐름 중단 (호출 측의 핵심 비즈니스 트랜잭션 우선).
//   5) service_role 미설정 (dev/preview) → graceful skip + 1회 console.warn.
//
// 호출 책임:
//   - actorId: 인증 user id 또는 anonymous_user_id (cookie). 부재 시 "anonymous" 폴백.
//   - target: { tableName, rowId? } — 감사 대상 row 식별. rowId 부재 가능 (예: 로그인).
//   - payload: 자녀 PII 금지 (R4). 호출 측 사전 sanitize 책임.
//
// Refs: GitHub Issue #72 (SEC-002), TASK_DB-011.md, REQ-NF-019 (RBAC + Audit Log),
//       __tests__/security/rbac-rls.test.ts 시나리오 7 (AuditLog 보호).

import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * 허용 action 종류 — 무한 drift 방어용 union literal.
 *
 * 신규 action 추가 시 본 union 에 명시 + AuditAction 타입 의존 호출 측 자동 update.
 * 명세 (TASK):
 *   - sign_in: Supabase Auth 로그인 (성공/실패 둘 다)
 *   - consent_sign: 동의서 전자서명 (FR-C-018, POST /api/consent/sign)
 *   - hitl_assign: HITL 큐 assignedExpertId 변경 (Supabase Studio)
 *   - reward_grant: RewardLog INSERT (멱등성 키 발급)
 *   - config_change: 환경 설정 / role 변경
 *   - data_export: 사용자 데이터 export (GDPR / 개인정보보호법)
 *   - data_delete: 사용자 데이터 삭제 (계정 탈퇴 / 자녀 정보 폐기)
 */
export type AuditAction =
  | "sign_in"
  | "consent_sign"
  | "hitl_assign"
  | "hitl_comment_added"
  | "reward_grant"
  | "config_change"
  | "data_export"
  | "data_delete";

const VALID_ACTIONS: readonly AuditAction[] = [
  "sign_in",
  "consent_sign",
  "hitl_assign",
  "hitl_comment_added",
  "reward_grant",
  "config_change",
  "data_export",
  "data_delete",
];

/**
 * R4 (자녀 정보 보호) 의심 키워드 — payload key 에 포함 시 console.warn.
 *
 * 자동 strip 은 false-positive (예: "phoneme" 가 "phone" 포함) 우려로 미수행.
 * 호출 측의 사전 sanitize 책임 — 본 모듈은 _경고_ 만 발생.
 *
 * 대소문자 무관 검사 (toLowerCase contains).
 */
const SUSPICIOUS_PAYLOAD_KEYS: readonly string[] = [
  "realname",
  "real_name",
  "ssn",
  "rrn", // 주민등록번호 (Korea Resident Registration Number)
  "email",
  "phone",
  "address",
  "birthdate",
  "birthday",
];

/** AuditLog INSERT 입력. target 은 { tableName, rowId? } 분리. */
export interface RecordAuditInput {
  /** 인증 user id (Supabase auth uid) 또는 anonymous_user_id. null/undefined 시 "anonymous" 폴백. */
  actorId: string | null | undefined;
  action: AuditAction;
  target: {
    /** 감사 대상 테이블명 (예: "ConsentSignature", "RewardLog"). */
    tableName: string;
    /** 감사 대상 row id. INSERT 직후 rowId 미정 케이스 (예: pre-validation 실패) 부재 허용. */
    rowId?: string | null;
  };
  /** 부가 정보 JSON. R4 — 자녀 식별 정보 금지 (호출 측 책임). */
  payload?: Record<string, unknown>;
}

/// "anonymous" 폴백 — actorId 미정 시 사용.
const ANONYMOUS_ACTOR = "anonymous";

/// service_role 미설정 경고 1회만 (dev/preview 노이즈 최소화).
let warnedNoAdmin = false;

/**
 * AuditLog 1건 INSERT — service_role 우회로 RLS 차단 회피.
 *
 * 반환: 항상 Promise<void> — 실패는 console.error 만, throw X.
 *
 * 흐름:
 *   1) action 유효성 검사 (TypeScript + 런타임 둘 다 — defensive).
 *   2) actorId 폴백 ("anonymous").
 *   3) payload 의심 키워드 검출 → console.warn (정보 제공만).
 *   4) supabase admin client 획득. 미설정 → warn 1회 + skip.
 *   5) INSERT — error 시 console.error + 흐름 진행.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  // 1) action 런타임 검증 (호출 측이 TS 우회 / any cast 한 경우 방어).
  if (!VALID_ACTIONS.includes(input.action)) {
    console.error(
      `[audit] invalid action "${String(input.action)}" — skip INSERT (허용: ${VALID_ACTIONS.join(", ")})`,
    );
    return;
  }

  // 2) actorId 폴백.
  const actorId =
    typeof input.actorId === "string" && input.actorId.length > 0
      ? input.actorId
      : ANONYMOUS_ACTOR;

  // 3) payload 자녀 식별 정보 의심 검출 (R4).
  if (input.payload && typeof input.payload === "object") {
    const suspicious = detectSuspiciousKeys(input.payload);
    if (suspicious.length > 0) {
      console.warn(
        `[audit] payload 에 자녀 식별 정보 의심 키 검출 — 호출 측 sanitize 필수 (R4): ${suspicious.join(", ")}`,
      );
    }
  }

  // 4) supabase admin client 획득.
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (!warnedNoAdmin) {
      console.warn(
        "[audit] SUPABASE_SERVICE_ROLE_KEY 미설정 — AuditLog INSERT skip (dev/preview 예상).",
      );
      warnedNoAdmin = true;
    }
    return;
  }

  // 5) INSERT — graceful failure.
  try {
    const { error } = await supabase.from("AuditLog").insert({
      actorId,
      action: input.action,
      tableName: input.target.tableName,
      rowId: input.target.rowId ?? null,
      diff: input.payload ?? null,
    });
    if (error) {
      console.error("[audit] INSERT 실패 (graceful — 메인 흐름 유지):", error);
    }
  } catch (err) {
    console.error("[audit] INSERT 예외 (graceful — 메인 흐름 유지):", err);
  }
}

/// payload key 들 중 SUSPICIOUS_PAYLOAD_KEYS 매칭 (대소문자 무관 contains).
function detectSuspiciousKeys(payload: Record<string, unknown>): string[] {
  const hits: string[] = [];
  for (const key of Object.keys(payload)) {
    const lower = key.toLowerCase();
    for (const suspicious of SUSPICIOUS_PAYLOAD_KEYS) {
      if (lower.includes(suspicious)) {
        hits.push(key);
        break; // 같은 key 가 여러 suspicious 매칭해도 1회만.
      }
    }
  }
  return hits;
}

/**
 * 테스트용 — service_role 미설정 경고 플래그 reset.
 *
 * 단위 테스트가 "warn 1회만" 시나리오를 격리 검증할 수 있게 export.
 * production 호출 금지.
 */
export function __resetAuditWarnFlagForTest(): void {
  warnedNoAdmin = false;
}
