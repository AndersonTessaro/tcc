import type { StudentProgress } from "./studentService";

export type PracticeReward = {
  xpGained: number | null;
  level: number;
  leveledUp: boolean;
  streakDays: number;
  xpTotal: number;
};

export function practiceReward(before: StudentProgress | null, after: StudentProgress): PracticeReward {
  return {
    xpGained: before ? Math.max(0, after.xpTotal - before.xpTotal) : null,
    level: after.level,
    leveledUp: !!before && after.level > before.level,
    streakDays: after.streakDays,
    xpTotal: after.xpTotal,
  };
}

export function dayCount(days: number): string {
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}
