import { count, formatDayMonth, formatMinutes } from "@/lib/format";
import type { ChipOption } from "@/ui/Chip";
import type { Goal, GoalPeriod, GoalType } from "./goalService";

export const GOAL_TYPES: ChipOption<GoalType>[] = [
  { value: "PRACTICE_TIME", label: "Tempo de prática" },
  { value: "PRACTICE_DAYS", label: "Dias de prática" },
  { value: "ATTENDANCE", label: "Presença nas aulas" },
];
export const GOAL_PERIODS: ChipOption<GoalPeriod>[] = [
  { value: "DAILY", label: "Diária" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "MONTHLY", label: "Mensal" },
];
export const DURATION_SHORTCUTS: Record<GoalPeriod, number[]> = {
  DAILY: [15, 30, 60], WEEKLY: [60, 120, 180, 300], MONTHLY: [300, 600, 1200],
};
export const MAX_GOAL_TARGET = 2147483647;
export const MAX_PRACTICE_DAYS: Record<GoalPeriod, number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 31 };

export function goalDuration(minutes: number): string {
  return formatMinutes(minutes).replace(/h/g, " h").replace(/min/g, " min");
}

export function suggestedGoalTitle(type: GoalType, period: GoalPeriod, target: number): string {
  const frequency = { DAILY: "dia", WEEKLY: "semana", MONTHLY: "mês" }[period];
  const amount = type === "PRACTICE_TIME" ? goalDuration(target) + " de prática"
    : type === "PRACTICE_DAYS" ? target + (target === 1 ? " dia" : " dias") + " de prática"
      : target + (target === 1 ? " presença" : " presenças");
  return amount + " por " + frequency;
}

export function goalProgressText(goal: Goal): string {
  if (goal.type === "PRACTICE_TIME") return goalDuration(goal.currentProgress) + " de " + goalDuration(goal.target);
  const [one, many] = goal.type === "PRACTICE_DAYS" || goal.type === "STREAK" ? ["dia", "dias"]
    : goal.type === "ATTENDANCE" ? ["presença", "presenças"] : goal.type === "LESSONS" ? ["aula", "aulas"] : ["unidade", "unidades"];
  return goal.currentProgress + " de " + count(goal.target, one, many);
}

export function goalPeriodText(goal: Goal): string | null {
  if (!goal.period || !goal.periodStart || !goal.periodEnd) return null;
  const label = goal.status !== "ACTIVE" ? "Encerrada"
    : { DAILY: "Hoje", WEEKLY: "Esta semana", MONTHLY: "Este mês" }[goal.period];
  const start = formatDayMonth(goal.periodStart);
  const end = formatDayMonth(goal.periodEnd);
  const dates = goal.periodStart === goal.periodEnd ? start
    : goal.periodStart.slice(0, 7) === goal.periodEnd.slice(0, 7) ? start.slice(0, 2) + "–" + end : start + "–" + end;
  return label + " · " + dates;
}

export function goalStreakText(period: GoalPeriod, streak: number): string {
  const unit = period === "DAILY" ? (streak === 1 ? "dia seguido" : "dias seguidos")
    : period === "WEEKLY" ? (streak === 1 ? "semana seguida" : "semanas seguidas")
      : streak === 1 ? "mês seguido" : "meses seguidos";
  return streak + " " + unit;
}
