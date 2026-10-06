import { canRecordAttendance, hhmm, lessonActions, lessonStatusLabel, lessonStatusTone, weekDates } from "../agenda";

describe("agenda", () => {
  it("blocks attendance for canceled lessons", () => {
    expect(canRecordAttendance({ status: "CANCELED", date: "2026-09-22" }, "2026-09-22")).toBe(false);
  });

  it("blocks attendance before the lesson date", () => {
    expect(canRecordAttendance({ status: "SCHEDULED", date: "2026-09-23" }, "2026-09-22")).toBe(false);
  });

  it("allows attendance on or after the lesson date", () => {
    expect(canRecordAttendance({ status: "SCHEDULED", date: "2026-09-22" }, "2026-09-22")).toBe(true);
    expect(canRecordAttendance({ status: "DONE", date: "2026-09-01" }, "2026-09-22")).toBe(true);
  });

  it("offers complete/cancel for scheduled lessons and makeup for finished ones", () => {
    expect(lessonActions({ status: "SCHEDULED", date: "2026-09-22" }, "2026-09-22")).toEqual({
      canComplete: true,
      canCancel: true,
      canReplace: false,
    });
    expect(lessonActions({ status: "SCHEDULED", date: "2026-09-30" }, "2026-09-22").canComplete).toBe(false);
    expect(lessonActions({ status: "CANCELED", date: "2026-09-22" }, "2026-09-22")).toEqual({
      canComplete: false,
      canCancel: false,
      canReplace: true,
    });
  });

  it("formats time and status for display", () => {
    expect(hhmm("09:30:00")).toBe("09:30");
    expect(lessonStatusLabel("DONE")).toBe("Realizada");
  });
});

describe("weekDates", () => {
  it("returns the Monday-to-Sunday week containing the date", () => {
    expect(weekDates("2026-10-07")).toEqual([
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11",
    ]);
    expect(weekDates("2026-10-11")[0]).toBe("2026-10-05");
    expect(weekDates("2026-10-05")[6]).toBe("2026-10-11");
  });

  it("maps lesson status to a chip tone", () => {
    expect(lessonStatusTone("DONE")).toBe("success");
    expect(lessonStatusTone("CANCELED")).toBe("neutral");
  });
});
