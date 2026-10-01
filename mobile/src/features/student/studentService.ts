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

export type StudentPractice = {
  id: string;
  date: string;
  durationMin: number;
  notes: string | null;
};

export type StudentAttendance = {
  date: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED";
};

export type StudentGoal = {
  id: string;
  title: string;
  type: "STREAK" | "PRACTICE_TIME" | "LESSONS" | "ATTENDANCE" | "OTHER";
  target: number;
  currentProgress: number;
  status: "ACTIVE" | "COMPLETED";
};

export const studentService = {
  dashboard: () => api.get<any>("/me/dashboard"),
  lessons: (status: "upcoming" | "past") => api.get<StudentLesson[]>(`/me/lessons?status=${status}`),
  lesson: (id: string) => api.get<StudentLessonDetail>(`/me/lessons/${id}`),
  materials: (search?: string) =>
    api.get<any[]>(`/me/materials${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  progress: () => api.get<StudentProgress>("/me/progress"),
  practices: () => api.get<StudentPractice[]>("/me/practices"),
  attendance: () => api.get<StudentAttendance[]>("/me/attendance"),
  goals: (status?: "ACTIVE" | "COMPLETED") =>
    api.get<StudentGoal[]>(`/me/goals${status ? `?status=${status}` : ""}`),
  registerPractice: (durationMin: number, notes?: string, date?: string) =>
    api.post<StudentProgress>("/me/practices", { durationMin, notes, date }),
  createGoal: (title: string, type: string, target: number, description?: string) =>
    api.post<any>("/me/goals", { title, type, target, description }),
};
