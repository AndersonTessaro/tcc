import { fallbackLevelBounds, levelProgress, remainingXpLabel } from "../level";
import { lessonBadge, formatLessonDateLong } from "../lessonStatus";
import { practiceReward } from "../reward";
import { currentWeek } from "../PracticeOverview";

describe("level", () => {
  it("mirrors the backend quadratic curve when the server bounds are unknown", () => {
    expect(fallbackLevelBounds(1)).toEqual({ levelStartXp: 0, nextLevelXp: 100 });
    expect(fallbackLevelBounds(3)).toEqual({ levelStartXp: 400, nextLevelXp: 900 });
  });

  it("prefers server bounds and reports the remaining XP", () => {
    const progress = levelProgress(150, 2, { levelStartXp: 100, nextLevelXp: 400 });
    expect(progress).toEqual({ earned: 50, span: 300, remaining: 250, nextLevel: 3 });
    expect(remainingXpLabel(progress)).toBe("Faltam 250 XP para o nível 3");
  });
});

describe("lessonBadge", () => {
  const today = "2026-10-05";
  it.each([
    [{ status: "DONE" as const, date: "2026-10-01" }, "Concluída", "success"],
    [{ status: "CANCELED" as const, date: "2026-10-10" }, "Cancelada", "neutral"],
    [{ status: "SCHEDULED" as const, date: "2026-10-01" }, "Sem registro", "warning"],
    [{ status: "SCHEDULED" as const, date: today }, "Agendada", "info"],
  ])("labels %o", (lesson, label, tone) => {
    expect(lessonBadge(lesson, today)).toEqual({ label, tone });
  });

  it("formats the long date with the weekday", () => {
    expect(formatLessonDateLong("2026-10-05")).toBe("Segunda-feira, 05/10/2026");
  });
});

describe("practiceReward", () => {
  it("computes XP gained and level up against the previous progress", () => {
    const reward = practiceReward({ xpTotal: 90, level: 1, streakDays: 1, totalPracticeMin: 0 }, { xpTotal: 120, level: 2, streakDays: 2, totalPracticeMin: 30 });
    expect(reward).toEqual({ xpGained: 30, level: 2, leveledUp: true, streakDays: 2, xpTotal: 120 });
  });

  it("omits the delta when the previous progress is unknown", () => {
    expect(practiceReward(null, { xpTotal: 50, level: 1, streakDays: 1, totalPracticeMin: 50 })).toMatchObject({ xpGained: null, leveledUp: false });
  });
});

describe("currentWeek", () => {
  it("sums minutes per day from Monday and flags today", () => {
    const week = currentWeek([
      { id: "a", date: "2026-10-05", durationMin: 20, notes: null },
      { id: "b", date: "2026-10-05", durationMin: 10, notes: null },
      { id: "c", date: "2026-10-04", durationMin: 99, notes: null },
    ], "2026-10-07");
    expect(week.map((day) => day.label)).toEqual(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]);
    expect(week[0]).toMatchObject({ date: "2026-10-05", minutes: 30, isToday: false });
    expect(week[2]).toMatchObject({ date: "2026-10-07", minutes: 0, isToday: true });
  });
});
