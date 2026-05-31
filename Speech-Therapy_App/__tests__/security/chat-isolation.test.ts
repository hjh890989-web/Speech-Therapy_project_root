// SEC-F15-ISOLATION — F15 ChatMessage ↔ 재학습/HITL 파이프라인 격리 정적 분석.
//
// no-regret #3 (docs/f15-t4c-irb-analysis §4-③): 자녀 자유발화(ChatMessage.content)가
// model 재학습 / HITL 큐 / 외부 export 로 *환류*되는 경로가 코드·스키마 수준에서 0 임을 CI 로 동결.
// 적대 감사(workflow, 2026-05-31) 결과 overallIsolated=true 확정 — 본 테스트는 그 불변식을
// 영속 회귀 게이트화한다. 향후 PR 이 read-back·relation·trigger·enqueue 를 끼워넣으면 빌드 차단.
//
// 방식: schema-r4.test.ts(SEC-001)와 동일한 readFileSync 정적 분석 — DB·런타임 의존 0.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** app/ · lib/ 하위 .ts/.tsx 전체 경로 수집 (node_modules/generated/.next 제외). */
function walk(dir: string, acc: string[] = []): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "generated" || e.name === ".next") continue;
      walk(full, acc);
    } else if (/\.tsx?$/.test(e.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const SRC_FILES = ["app", "lib"].flatMap((d) => walk(join(ROOT, d)));

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf-8");
}

describe("SEC-F15-ISOLATION — ChatMessage ↔ 재학습/HITL 격리", () => {
  it("[1] prisma.chatMessage 연산은 create/deleteMany 만 — read-back(환류) 0", () => {
    // content 를 파이프라인으로 끌어내는 read 연산(findMany/findUnique/aggregate 등) 금지.
    const ALLOWED = new Set(["create", "deleteMany"]);
    const re = /\bchatMessage\.(\w+)/g;
    const violations: string[] = [];
    for (const file of SRC_FILES) {
      const src = readFileSync(file, "utf-8");
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        if (!ALLOWED.has(m[1])) violations.push(`${file.replace(ROOT, "")} → chatMessage.${m[1]}`);
      }
    }
    expect(
      violations,
      `격리 위반 — ChatMessage read-back/환류 연산 발견(F15 활성 게이트 재검토 필요): ${violations.join(", ")}`,
    ).toEqual([]);
  });

  it("[2] 재학습 집계 모듈(lib/hitl/retraining.ts)에 chatMessage 참조 0", () => {
    expect(read("lib/hitl/retraining.ts")).not.toMatch(/chatmessage/i);
  });

  it("[3] export-user-data.ts 에 chatMessage 참조 0 (휘발 격리 — 외부 반출 0)", () => {
    expect(read("app/actions/export-user-data.ts")).not.toMatch(/chatmessage/i);
  });

  it("[4] sync_retraining_data TRIGGER migration 이 ChatMessage 미참조", () => {
    const mig = read(
      "prisma/migrations/20260527180000_add_model_retraining_data/migration.sql",
    );
    expect(mig).not.toMatch(/ChatMessage|chat_message/i);
  });

  it("[5] chat 경로(submit/stream)가 HITLQueue enqueue·재학습 write 미수행", () => {
    for (const rel of [
      "app/actions/submit-chat-utterance.ts",
      "app/api/chat/stream/route.ts",
    ]) {
      const src = read(rel);
      expect(src, `${rel} → HITL enqueue 발견`).not.toMatch(/enqueueForReview|hITLQueue/);
      expect(src, `${rel} → 재학습 write 발견`).not.toMatch(/modelRetrainingData/);
    }
  });

  it("[6] application 코드에 modelRetrainingData.create/createMany/upsert 0 (적재는 DB TRIGGER 전용)", () => {
    const re = /\bmodelRetrainingData\.(create|createMany|upsert)\b/g;
    const violations: string[] = [];
    for (const file of SRC_FILES) {
      const src = readFileSync(file, "utf-8");
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        violations.push(`${file.replace(ROOT, "")} → modelRetrainingData.${m[1]}`);
      }
    }
    expect(
      violations,
      `재학습 적재는 sync_retraining_data TRIGGER 전용이어야 함: ${violations.join(", ")}`,
    ).toEqual([]);
  });

  it("[7] schema ChatMessage 모델에 재학습 그래프 join 키(sessionId)·relation 부재", () => {
    const schema = read("prisma/schema.prisma");
    const m = schema.match(/model ChatMessage \{([\s\S]*?)\n\}/);
    expect(m, "ChatMessage 모델 블록 미발견").not.toBeNull();
    const block = m![1];
    // sessionId 는 재학습 그래프(EvaluationResult/HITLQueue/ModelRetrainingData)의 @unique join 키.
    expect(block, "ChatMessage 에 sessionId 추가됨 — 재학습 그래프 join 가능").not.toMatch(/sessionId/);
    for (const table of ["EvaluationResult", "HITLQueue", "ModelRetrainingData"]) {
      expect(block, `ChatMessage 가 재학습 그래프(${table})와 relation 연결됨`).not.toContain(table);
    }
  });
});
