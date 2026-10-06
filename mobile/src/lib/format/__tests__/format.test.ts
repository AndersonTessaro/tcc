import { addDays, formatFileSize, formatLessonWhen, formatMinutes, normalizeSearch, relativeDayLabel } from "@/lib/format";

const now = new Date(2026, 9, 5, 10, 0);

describe("format", () => {
  it("labels days relative to today", () => {
    expect(relativeDayLabel("2026-10-05", now)).toBe("Hoje");
    expect(relativeDayLabel("2026-10-06", now)).toBe("Amanhã");
    expect(relativeDayLabel("2026-10-04", now)).toBe("Ontem");
    expect(relativeDayLabel("2026-10-08", now)).toBe("Qui, 08/10");
  });

  it("combines relative day and trimmed time for a lesson", () => {
    expect(formatLessonWhen("2026-10-06", "14:00:00", now)).toBe("Amanhã · 14:00");
    expect(formatLessonWhen("2026-10-06", null, now)).toBe("Amanhã");
  });

  it("formats durations, sizes and searches", () => {
    expect(formatMinutes(45)).toBe("45min");
    expect(formatMinutes(120)).toBe("2h");
    expect(formatMinutes(135)).toBe("2h 15min");
    expect(formatFileSize(1258291)).toBe("1,2 MB");
    expect(formatFileSize(null)).toBe("");
    expect(normalizeSearch("  Música ")).toBe("musica");
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});
