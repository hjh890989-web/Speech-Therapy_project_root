-- ============================================================================
-- SEC-002 + DB-011 후속 — AuditLog PostgreSQL TRIGGER 자동 capture
-- Refs: REQ-NF-019 RBAC + Audit Log, R4 자녀 식별 정보 보호.
-- ============================================================================
--
-- 배경:
-- - lib/audit.ts (commit 84076bf) 가 _application-level_ 명시적 INSERT helper.
--   호출 측이 securty/idempotency 흐름 다음 단계에 manual 호출 — 누락 위험.
-- - 본 migration 은 _DB-level_ TRIGGER 추가 — application 호출 누락에도
--   raw row change (UPDATE/DELETE/INSERT) 가 자동으로 AuditLog 에 적재.
-- - 두 path 는 _중복_ 이 아닌 _보완_:
--     lib/audit.ts → action 의미값 ("reward_grant" 등 의도)
--     TRIGGER     → action raw 값 ("RewardLog_insert" 등 동작)
--   분석 시 함께 봐야 무결성 확인 가능.
--
-- 적용 대상 (위험도 높은 것만, 모든 테이블 X — 성능/저장공간 trade-off):
--   "User"      — UPDATE (role 변경 추적), DELETE (사용자 폐기)
--   "HITLQueue" — UPDATE (status / expertComment / correctedScore / escalatedAt), DELETE
--   "RewardLog" — INSERT (보상 지급 raw 적재 — lib/audit.ts 보완)
--   (다른 테이블은 application-level lib/audit.ts 호출에 의존 — 본 PR 범위 외)
--
-- R4 (영유아 데이터 보호) 자동 sanitize:
--   to_jsonb(OLD/NEW) 결과에서 의심 키 (realname/ssn/rrn/email/phone/address/birthdate
--   등) 의 값을 '[REDACTED]' 로 치환. lib/audit.ts 의 SUSPICIOUS_PAYLOAD_KEYS 와 정합.
--   lib helper 는 _warn_ 만 하지만 TRIGGER 는 _강제 strip_ — DB-level 보호 우선.
--
-- actor_id 주입 (set_config / current_setting 패턴):
--   본 PR 은 fallback 'system' 만 — lib/db.ts (Prisma client) 측에서 트랜잭션 시작 시
--   SELECT set_config('audit.actor_id', '<userId>', true) 호출은 _후속 PR_ 분리.
--   미설정 시 TRIGGER 는 'system' 으로 actorId 기록 — graceful fallback.
--
-- 운영 적용 (사용자 수동, deploy 본 PR 미실행):
--   1. cd Speech-Therapy_App
--   2. npx prisma migrate status      # drift 점검 — 본 migration pending 확인
--   3. npx prisma migrate deploy      # DIRECT_URL 사용
--   4. Supabase Studio SQL Editor 검증:
--        SELECT tgname, tgrelid::regclass AS tbl
--        FROM pg_trigger
--        WHERE tgname LIKE 'audit_%' AND NOT tgisinternal
--        ORDER BY tbl, tgname;
--      → 3개 트리거 (audit_user_changes / audit_hitl_changes / audit_reward_log_inserts) 노출.
--        SELECT proname FROM pg_proc WHERE proname IN ('audit_trigger_fn','audit_sanitize_jsonb');
--      → 2개 함수 노출.
--
-- 비고:
-- - AuditLog 테이블 / 인덱스 / audit_select_admin 정책은 enable_rls_policies (2026-05-12)
--   에 이미 정의되어 있음 — 본 migration 은 _TRIGGER + 함수만_ 추가, 정책 변경 없음.
-- - SECURITY DEFINER 함수 — RLS 우회 INSERT 가능 (AuditLog INSERT default deny 회피).
--   소유자는 default postgres role — Supabase 관리 권한 안.
-- ============================================================================

-- ============================================================================
-- 1) audit_sanitize_jsonb — R4 자녀 식별 정보 의심 키 [REDACTED] 치환
-- ============================================================================
--
-- 동작:
-- - 입력 JSONB 가 NULL 또는 object 가 아니면 그대로 반환.
-- - object 의 모든 top-level key 를 순회하면서 lower(key) 가 의심 패턴에 매칭되면
--   값을 '[REDACTED]' 텍스트로 치환.
-- - 중첩 object (before/after, deleted, created wrapper) 도 1단계 재귀 처리.
-- - 의심 키워드 목록은 lib/audit.ts 의 SUSPICIOUS_PAYLOAD_KEYS 와 동기.

CREATE OR REPLACE FUNCTION audit_sanitize_jsonb(input JSONB)
RETURNS JSONB AS $$
DECLARE
  v_key   TEXT;
  v_lower TEXT;
  v_value JSONB;
  v_out   JSONB;
  -- 의심 키 패턴 (lower-case substring 매칭).
  v_patterns TEXT[] := ARRAY[
    'realname',
    'real_name',
    'ssn',
    'rrn',
    'email',
    'phone',
    'address',
    'birthdate',
    'birthday'
  ];
  v_pat   TEXT;
  v_hit   BOOLEAN;
BEGIN
  IF input IS NULL OR jsonb_typeof(input) <> 'object' THEN
    RETURN input;
  END IF;

  v_out := '{}'::jsonb;

  FOR v_key, v_value IN SELECT * FROM jsonb_each(input) LOOP
    v_lower := lower(v_key);
    v_hit := false;

    FOREACH v_pat IN ARRAY v_patterns LOOP
      IF position(v_pat IN v_lower) > 0 THEN
        v_hit := true;
        EXIT;
      END IF;
    END LOOP;

    IF v_hit THEN
      -- 의심 키 — 값 [REDACTED] 로 치환.
      v_out := v_out || jsonb_build_object(v_key, '[REDACTED]'::text);
    ELSIF jsonb_typeof(v_value) = 'object' THEN
      -- 중첩 object — 1단계 재귀 sanitize.
      v_out := v_out || jsonb_build_object(v_key, audit_sanitize_jsonb(v_value));
    ELSE
      v_out := v_out || jsonb_build_object(v_key, v_value);
    END IF;
  END LOOP;

  RETURN v_out;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 2) audit_trigger_fn — 재사용 가능 TRIGGER 함수
-- ============================================================================
--
-- 동작:
-- - TG_OP 별 action 문자열 빌드 (예: "RewardLog_insert").
-- - rowId = NEW.id (INSERT/UPDATE) 또는 OLD.id (DELETE).
-- - diff JSONB 구성:
--     INSERT → { "created": NEW }
--     UPDATE → { "before": OLD, "after": NEW }
--     DELETE → { "deleted": OLD }
--   모두 audit_sanitize_jsonb 통과 — R4 강제 strip.
-- - actorId = current_setting('audit.actor_id', true) — 미설정 시 'system' fallback.
--   (lib/db.ts 후속 PR 에서 SET LOCAL audit.actor_id 주입 예정.)
-- - SECURITY DEFINER — RLS INSERT default deny 우회 (AuditLog 정책상 service_role 만 INSERT).

CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_row_id TEXT;
  v_diff   JSONB;
  v_actor  TEXT;
BEGIN
  -- 1) action 명: TG_TABLE_NAME || '_' || lower(TG_OP) (예: "RewardLog_insert").
  v_action := TG_TABLE_NAME || '_' || lower(TG_OP);

  -- 2) rowId 추출 (NEW.id 우선, DELETE 면 OLD.id).
  IF TG_OP = 'DELETE' THEN
    v_row_id := OLD.id::text;
  ELSE
    v_row_id := NEW.id::text;
  END IF;

  -- 3) diff JSONB 구성 + R4 sanitize 강제 통과.
  IF TG_OP = 'UPDATE' THEN
    v_diff := jsonb_build_object(
      'before', audit_sanitize_jsonb(to_jsonb(OLD)),
      'after',  audit_sanitize_jsonb(to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_diff := jsonb_build_object(
      'deleted', audit_sanitize_jsonb(to_jsonb(OLD))
    );
  ELSE
    -- INSERT
    v_diff := jsonb_build_object(
      'created', audit_sanitize_jsonb(to_jsonb(NEW))
    );
  END IF;

  -- 4) actorId — GUC current_setting 우선, fallback 'system'.
  v_actor := COALESCE(NULLIF(current_setting('audit.actor_id', true), ''), 'system');

  -- 5) AuditLog INSERT (SECURITY DEFINER 권한으로 RLS 우회).
  INSERT INTO "AuditLog" (id, "actorId", action, "tableName", "rowId", diff, "createdAt")
  VALUES (
    gen_random_uuid(),
    v_actor,
    v_action,
    TG_TABLE_NAME,
    v_row_id,
    v_diff,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3) TRIGGER 등록 — 3개 핵심 테이블
-- ============================================================================
--
-- DROP IF EXISTS 패턴 — 재실행 idempotent (migration replay 안전).

-- 3-1) User: UPDATE (role 변경 등) + DELETE (사용자 폐기) 자동 audit.
DROP TRIGGER IF EXISTS audit_user_changes ON "User";
CREATE TRIGGER audit_user_changes
  AFTER UPDATE OR DELETE ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_fn();

-- 3-2) HITLQueue: UPDATE (assign / completed / escalated) + DELETE (비상 cleanup).
DROP TRIGGER IF EXISTS audit_hitl_changes ON "HITLQueue";
CREATE TRIGGER audit_hitl_changes
  AFTER UPDATE OR DELETE ON "HITLQueue"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_fn();

-- 3-3) RewardLog: INSERT (보상 적재) 자동 audit — lib/audit.ts 의 reward_grant 와 보완.
--   같은 보상 1건이 2 row (action=reward_grant + action=RewardLog_insert) 로 적재됨.
--   분석 시 action prefix 로 구분 가능. PR 보고서에 명시.
DROP TRIGGER IF EXISTS audit_reward_log_inserts ON "RewardLog";
CREATE TRIGGER audit_reward_log_inserts
  AFTER INSERT ON "RewardLog"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_fn();

-- ============================================================================
-- 회귀 sentinel:
-- - audit_select_admin (admin only SELECT) 정책은 변경 없음 — 본 migration 영향 없음.
-- - actor_id 주입 후속 작업 (lib/db.ts SET LOCAL audit.actor_id) 는 별도 PR.
-- - 신규 테이블 (예: ConsentSignature) 추가 시 본 패턴 복제 — 위험도 평가 후 결정.
-- ============================================================================
