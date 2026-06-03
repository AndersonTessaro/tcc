import { api } from "../../lib/http";

export const studentService = {
  dashboard: () => api.get<any>("/me/dashboard"),
  lessons: (status: "upcoming" | "past") => api.get<any[]>(`/me/lessons?status=${status}`),
  lesson: (id: string) => api.get<any>(`/me/lessons/${id}`),
  materials: (search?: string) =>
    api.get<any[]>(`/me/materials${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  progress: () => api.get<any>("/me/progress"),
  goals: (status?: "ACTIVE" | "COMPLETED") =>
    api.get<any[]>(`/me/goals${status ? `?status=${status}` : ""}`),
  registerPractice: (durationMin: number, notes?: string) =>
    api.post<any>("/me/practices", { durationMin, notes }),
  createGoal: (title: string, type: string, target: number, description?: string) =>
    api.post<any>("/me/goals", { title, type, target, description }),
};
