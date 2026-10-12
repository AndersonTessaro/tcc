import { attendanceByDate } from "../AttendanceCalendar";
import type { AttendanceStatus } from "../teacherService";

it.each<AttendanceStatus[]>([
  ["PRESENT", "EXCUSED", "ABSENT"],
  ["ABSENT", "EXCUSED", "PRESENT"],
  ["EXCUSED", "PRESENT"],
  ["PRESENT", "EXCUSED"],
])("keeps the worst attendance status regardless of order: %s", (...statuses) => {
  const result = attendanceByDate(statuses.map((status) => ({ date: "2026-10-01", status })));
  expect(result.get("2026-10-01")).toBe(statuses.includes("ABSENT") ? "ABSENT" : "EXCUSED");
});
