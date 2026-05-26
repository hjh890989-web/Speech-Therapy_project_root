// FR-Q-013 후속 — OfflineEntry shape + 상수 (CLIENT-SAFE).
//
// 본 모듈은 _순수 데이터 형/상수_ 만 보유 — Prisma 호출 0건. Client Component
// (OfflineEntryForm) 에서 직접 import 안전.
//
// 분리 사유 (Performance 3차):
//   - 이전엔 `lib/offline-entry/repo.ts` 가 Prisma helpers 와 상수/타입을 모두 한 파일에 둠.
//   - Client Component 가 상수만 import 해도 ESM 그래프상 prisma 까지 transitively
//     client bundle 로 끌려와 Turbopack chunking failure 발생.
//   - shape 만 분리하여 client 측은 본 파일만 import → prisma 비의존.
//
// CON-04: note 검증은 호출 측 (Server Action 진입 시) 책임 — 본 모듈은 타입/상수만, sanitize 미수행.

/** OfflineEntry 의 application-side type — Prisma 모델과 동일 shape. */
export interface OfflineEntry {
  id: string;
  userId: string;
  authorId: string;
  kind: string;
  note: string;
  observedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  institutionId: string | null;
}

/** 허용 kind — Server Action Zod 와 정합. */
export const OFFLINE_ENTRY_KINDS = ["practice", "observation", "note"] as const;
export type OfflineEntryKind = (typeof OFFLINE_ENTRY_KINDS)[number];

/** note 본문 최대 길이 — Zod 검증 표면과 동일. */
export const OFFLINE_ENTRY_NOTE_MAX_LENGTH = 500;

/** listOfflineEntriesForUser 의 default limit — UI 표시 한도 (최근 N건). */
export const OFFLINE_ENTRY_DEFAULT_LIMIT = 20;

/** createOfflineEntry 입력. */
export interface CreateOfflineEntryInput {
  /// 자녀(보호자) User.id — partition key.
  userId: string;
  /// 입력 teacher/admin User.id — audit actor 와 동일.
  authorId: string;
  /// 활동 유형.
  kind: OfflineEntryKind;
  /// 짧은 메모 (max 500자, CON-04 통과 가정).
  note: string;
  /// 실 활동 발생 시각 (default now).
  observedAt?: Date;
  /// B2B 다중 테넌트 — author 의 institution scope.
  institutionId?: string | null;
}
