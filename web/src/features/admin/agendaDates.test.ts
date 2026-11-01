import { describe, expect, it } from "vitest";
import { addDays, localDate, weekDates, weekStart, canRecordAttendance } from "./agendaDates";

describe("agenda calendar", () => {
  it("uses local calendar dates and a Monday to Sunday week across years", () => {
    expect(localDate(new Date(2030, 0, 1, 23, 30))).toBe("2030-01-01");
    expect(weekStart("2027-01-03")).toBe("2026-12-28");
    expect(weekDates("2026-12-28")).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("allows attendance only once the lesson starts and never when canceled", () => {
    const now = new Date(2030, 3, 1, 9, 0);
    expect(canRecordAttendance({ date: "2030-04-01", startTime: "09:00:00", status: "SCHEDULED" }, now)).toBe(true);
    expect(canRecordAttendance({ date: "2030-04-01", startTime: "09:01:00", status: "SCHEDULED" }, now)).toBe(false);
    expect(canRecordAttendance({ date: "2030-03-31", startTime: "09:00:00", status: "CANCELED" }, now)).toBe(false);
  });
});
