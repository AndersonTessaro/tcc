import { addMinutes, durationBetween, freeStarts, nextFreeStarts, overlaps } from "@/features/teacher/scheduling";
import type { AvailabilityBlock } from "@/features/teacher/teacherService";

const block = (startTime: string, endTime: string): AvailabilityBlock => ({
  referenceId: `${startTime}-${endTime}`, kind: "LESSON", party: "TEACHER", startTime, endTime, description: "",
});

describe("scheduling", () => {
  it("treats the end of a range as exclusive, like the lesson-core TimeRange", () => {
    expect(overlaps("10:00", "11:00", "11:00", "12:00")).toBe(false);
    expect(overlaps("10:00", "11:00", "10:30:00", "11:30:00")).toBe(true);
  });

  it("does minute arithmetic on HH:MM values", () => {
    expect(addMinutes("09:30", 45)).toBe("10:15");
    expect(addMinutes("23:30", 60)).toBe("23:59");
    expect(durationBetween("09:00", "10:30")).toBe(90);
  });

  it("suggests only starts whose whole duration fits between busy blocks", () => {
    const busy = [block("08:00:00", "09:00:00"), block("10:00:00", "11:00:00")];
    const starts = freeStarts(busy, 60, "07:00", "12:00");
    expect(starts).toEqual(["07:00", "09:00", "11:00"]);
  });

  it("limits suggestions to the ones after a given time", () => {
    expect(nextFreeStarts([], 60, "20:00", 3)).toEqual(["20:00", "20:30", "21:00"]);
  });
});
