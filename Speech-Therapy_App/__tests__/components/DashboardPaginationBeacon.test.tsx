// FR-DASH-CURSOR-PER-CLASSROOM — DashboardPaginationBeacon 단위 테스트.
//
// 책임 검증:
//   1) mount 시 cursors 의 각 entry 마다 trackEvent("dashboard_students_paginated") 1회씩 발송
//   2) Strict Mode 더블 마운트 가드 — re-render 시 추가 발송 X
//   3) role / institutionId / classroomId / cursor 가 payload 에 정확히 매핑
//   4) cursors={} → 0회 발송 (호출 측이 보통 본 컴포넌트를 미렌더하나, 방어적 분기 검증)
//   5) cursor 가 빈 문자열인 entry → null 로 정규화 (현 spec 상 page parse 단계에서 이미 제거되나 방어).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

const trackEventMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

import { DashboardPaginationBeacon } from "@/components/admin/DashboardPaginationBeacon";

const INSTITUTION_A = "11111111-1111-4111-8111-111111111111";
const STUDENT_A = "ffffffff-ffff-4fff-8fff-fffffffffff0";
const STUDENT_B = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee0";

beforeEach(() => {
  trackEventMock.mockReset();
  cleanup();
});

describe("DashboardPaginationBeacon (FR-DASH-CURSOR-PER-CLASSROOM)", () => {
  it("[1] mount 시 cursors entry 마다 trackEvent 1회씩 발송 — principal role + institutionId", () => {
    render(
      <DashboardPaginationBeacon
        role="principal"
        institutionId={INSTITUTION_A}
        cursors={{ "class-A": STUDENT_A, "class-B": STUDENT_B }}
      />,
    );

    expect(trackEventMock).toHaveBeenCalledTimes(2);
    // payload 매핑 검증 — 각 호출이 정확한 reactor 와 cursor 를 가짐.
    const calls = trackEventMock.mock.calls.map((c) => c[1] as Record<string, unknown>);
    const byClassroom = new Map(calls.map((p) => [p.classroomId as string, p]));
    expect(byClassroom.get("class-A")).toEqual({
      classroomId: "class-A",
      cursor: STUDENT_A,
      institutionId: INSTITUTION_A,
      role: "principal",
    });
    expect(byClassroom.get("class-B")).toEqual({
      classroomId: "class-B",
      cursor: STUDENT_B,
      institutionId: INSTITUTION_A,
      role: "principal",
    });
    // event name 도 모두 dashboard_students_paginated.
    for (const c of trackEventMock.mock.calls) {
      expect(c[0]).toBe("dashboard_students_paginated");
    }
  });

  it("[2] teacher role + institutionId=null → payload role/institutionId 정합", () => {
    render(
      <DashboardPaginationBeacon
        role="teacher"
        institutionId={null}
        cursors={{ "class-T": STUDENT_A }}
      />,
    );

    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock.mock.calls[0][1]).toEqual({
      classroomId: "class-T",
      cursor: STUDENT_A,
      institutionId: null,
      role: "teacher",
    });
  });

  it("[3] cursors={} → 0회 발송 (방어)", () => {
    render(
      <DashboardPaginationBeacon role="principal" institutionId={INSTITUTION_A} cursors={{}} />,
    );
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("[4] cursor='' (빈 문자열) → cursor:null 로 정규화", () => {
    render(
      <DashboardPaginationBeacon
        role="principal"
        institutionId={INSTITUTION_A}
        cursors={{ "class-A": "" }}
      />,
    );
    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock.mock.calls[0][1]).toMatchObject({
      classroomId: "class-A",
      cursor: null,
    });
  });

  it("[5] Strict Mode 더블 마운트 가드 — re-render 시 추가 발송 X", () => {
    const { rerender } = render(
      <DashboardPaginationBeacon
        role="principal"
        institutionId={INSTITUTION_A}
        cursors={{ "class-A": STUDENT_A }}
      />,
    );
    expect(trackEventMock).toHaveBeenCalledTimes(1);

    // 동일 prop 재렌더 → 발송 X.
    rerender(
      <DashboardPaginationBeacon
        role="principal"
        institutionId={INSTITUTION_A}
        cursors={{ "class-A": STUDENT_A }}
      />,
    );
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });
});
