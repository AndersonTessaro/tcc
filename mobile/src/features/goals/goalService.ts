import { api } from "@/lib/http";

export type GoalType = "PRACTICE_TIME" | "PRACTICE_DAYS" | "ATTENDANCE";
export type GoalPeriod = "DAILY" | "WEEKLY" | "MONTHLY";
export type GoalFilter = "ACTIVE" | "ENDED";
export type Goal = {
  id: string;
  title: string;
  description: string | null;
  type: GoalType | "STREAK" | "LESSONS" | "OTHER";
  period: GoalPeriod | null;
  target: number;
  currentProgress: number;
  status: GoalFilter | "COMPLETED";
  legacy: boolean;
  createdByTeacher: string | null;
  canEnd: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  achieved: boolean;
  completed: boolean;
  streak: number;
};
export type NewGoal = { title: string; description?: string; type: GoalType; period: GoalPeriod; target: number };

export function goalService(path: string) {
  return {
    goals: (status?: GoalFilter) => api.get<Goal[]>(path + (status ? "?status=" + status : "")),
    createGoal: (body: NewGoal) => api.post<Goal>(path, body),
    endGoal: (id: string) => api.patch<Goal>(path + "/" + id + "/end"),
  };
}
