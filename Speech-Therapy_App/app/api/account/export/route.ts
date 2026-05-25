// FR-C-ACCOUNT — GET /api/account/export Route Handler (본인 데이터 binary download).
//
// 책임:
//   - Server Action (exportUserData) 결과를 application/json 으로 Content-Disposition: attachment
//     헤더와 함께 반환 — 브라우저가 파일 다운로드 처리.
//
// RBAC (R4):
//   - exportUserData Server Action 내부에서 Supabase auth 검증 — 본인 데이터만 추출.
//   - 외부 query param 입력 받지 않음 (auth uid 만 신뢰).
//
// graceful:
//   - exportUserData 가 success: false 반환 → 401 (unauthorized) 또는 500 (db_failed)
//   - 정상 → 200 + JSON body + Content-Disposition: attachment.
//
// 메모리 사용량:
//   - JSON.stringify 결과를 한번에 ArrayBuffer 로 반환 — 본 PR 의 limit 1000 row × 7 source 기준
//     실 사용자 데이터는 수 MB 이하로 stream 불필요.
//   - 추후 사용자별 데이터가 수십 MB 넘어가면 stream 응답으로 분리 (별도 PR).
//
// CON-04: 본 파일의 모든 메시지 / 주석에 "치료/진단/장애" 금칙어 0건.

import { NextResponse } from "next/server";
import { exportUserData } from "@/app/actions/export-user-data";

// auth 결과는 매 요청 fresh — 정적 캐시 차단.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const result = await exportUserData();
  if (!result.success) {
    if (result.reason === "unauthorized") {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: result.message },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "EXPORT_FAILED", message: result.message },
      { status: 500 },
    );
  }

  // attachment 헤더 — 브라우저 파일 다운로드. filename 은 영숫자/하이픈만 (인젝션 방어).
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="${result.filename}"`,
    // 캐시 차단 — 개인정보 응답.
    "Cache-Control": "no-store, max-age=0",
    // 응답 크기 — Content-Length 가 명시되면 progress bar 정확도 ↑.
    "Content-Length": String(Buffer.byteLength(result.json, "utf8")),
  });

  return new Response(result.json, {
    status: 200,
    headers,
  });
}
