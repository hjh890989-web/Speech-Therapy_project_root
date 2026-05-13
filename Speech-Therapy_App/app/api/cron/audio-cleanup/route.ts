// INFRA-002 + FR-C-004 — 음성 7일 폐기 Cron (D6 단순화).
// schedule: P2 활성 시 매주 일요일 03:00 UTC — 현재 Hobby 슬롯 hitl-monitor 점유로 수동/Preview 호출만.
//
// D6 적용: Sprint 1 음성 원본 미저장 정책 (클라이언트 측 STT → transcript 만 서버 전송).
// 따라서 본 핸들러는 실질 No-op (deletedRows = 0, deletedObjects = 0) 이며,
// P2 음성 저장 활성 시 즉시 동작하도록 인프라(라우트·인증·Storage 코드 경로) 사전 구축.
//
// 동작:
// 1. session_logs.audioVectorUri 가 7일 이상 경과 → null 처리 (DB 컬럼 청소)
// 2. Supabase Storage `audio` 버킷의 7일 이상 객체 삭제 (버킷 미존재 시 graceful skip)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const RETENTION_DAYS = 7;
const AUDIO_BUCKET = "audio";

export async function GET(request: Request) {
  const auth = verifyCronSecret(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED", reason: auth.reason }, { status: 401 });
  }

  const start = Date.now();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);

  let deletedRows = 0;
  try {
    const result = await prisma.sessionLog.updateMany({
      where: {
        audioVectorUri: { not: null },
        startTime: { lt: cutoff },
      },
      data: { audioVectorUri: null },
    });
    deletedRows = result.count;
  } catch (err) {
    console.error("audio-cleanup: DB 업데이트 실패", err);
    return NextResponse.json({ error: "INTERNAL_ERROR", phase: "db" }, { status: 500 });
  }

  const storage = await purgeStorageBucket(cutoff);

  return NextResponse.json({
    job: "audio-cleanup",
    discope: "D6",
    deletedRows,
    deletedObjects: storage.deletedObjects,
    storageStatus: storage.status,
    durationMs: Date.now() - start,
  });
}

interface StorageResult {
  deletedObjects: number;
  status: "ok" | "skipped_no_admin_client" | "skipped_bucket_missing" | "error";
}

async function purgeStorageBucket(cutoff: Date): Promise<StorageResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { deletedObjects: 0, status: "skipped_no_admin_client" };
  }

  const { data: list, error: listError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .list("", { limit: 1000 });

  if (listError) {
    const message = listError.message?.toLowerCase() ?? "";
    if (message.includes("not found") || message.includes("bucket")) {
      return { deletedObjects: 0, status: "skipped_bucket_missing" };
    }
    console.error("audio-cleanup: Storage list 실패", listError);
    return { deletedObjects: 0, status: "error" };
  }

  const stale = (list ?? [])
    .filter((obj) => {
      const created = obj.created_at ? new Date(obj.created_at) : null;
      return created != null && created < cutoff;
    })
    .map((obj) => obj.name);

  if (stale.length === 0) {
    return { deletedObjects: 0, status: "ok" };
  }

  const { error: deleteError } = await supabase.storage.from(AUDIO_BUCKET).remove(stale);
  if (deleteError) {
    console.error("audio-cleanup: Storage delete 실패", deleteError);
    return { deletedObjects: 0, status: "error" };
  }
  return { deletedObjects: stale.length, status: "ok" };
}
