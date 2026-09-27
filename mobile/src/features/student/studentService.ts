import { api } from "../../lib/http";

export type StudentLesson = {
  id: string;
  date: string;
  startTime: string;
  instrument: string;
  teacherName: string;
  status: "SCHEDULED" | "DONE" | "CANCELED";
  content: string | null;
  homework: string | null;
};

export type LessonAttachment = {
  id: string;
  fileName: string;
  sizeBytes: number | null;
};

export type StudentLessonDetail = {
  lesson: StudentLesson;
  attachments: LessonAttachment[];
};

export type StudentProgress = {
  xpTotal: number;
  level: number;
  streakDays: number;
  totalPracticeMin: number;
};

export const studentService = {
  dashboard: () => api.get<any>("/me/dashboard"),
  lessons: (status: "upcoming" | "past") => api.get<StudentLesson[]>(`/me/lessons?status=${status}`),
  lesson: (id: string) => api.get<StudentLessonDetail>(`/me/lessons/${id}`),
  materials: (search?: string) =>
    api.get<any[]>(`/me/materials${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  progress: () => api.get<StudentProgress>("/me/progress"),
  goals: (status?: "ACTIVE" | "COMPLETED") =>
    api.get<any[]>(`/me/goals${status ? `?status=${status}` : ""}`),
  registerPractice: (durationMin: number, notes?: string) =>
    api.post<any>("/me/practices", { durationMin, notes }),
  createGoal: (title: string, type: string, target: number, description?: string) =>
    api.post<any>("/me/goals", { title, type, target, description }),
};
