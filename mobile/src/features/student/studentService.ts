import { api } from "../../lib/http";

export type StudentLesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
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

export type StudentDashboard = {
  xp: number;
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  streakDays: number;
  weeklyPracticeMin: number;
  nextLesson: Partial<StudentLesson> | null;
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
  description?: string | null;
  status: "ACTIVE" | "COMPLETED";
};

export type StudentMaterial = {
  id: string;
  studentId: string;
  teacherName: string;
  title: string;
  description: string | null;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

export const studentService = {
  dashboard: () => api.get<StudentDashboard>("/me/dashboard"),
  lessons: (status: "upcoming" | "past") => api.get<StudentLesson[]>(`/me/lessons?status=${status}`),
  lesson: (id: string) => api.get<StudentLessonDetail>(`/me/lessons/${id}`),
  materials: (search?: string) =>
    api.get<StudentMaterial[]>(`/me/materials${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  downloadMaterial: (id: string) => api.getBytes(`/me/materials/${id}/download`),
  progress: () => api.get<StudentProgress>("/me/progress"),
  practices: () => api.get<StudentPractice[]>("/me/practices"),
  attendance: () => api.get<StudentAttendance[]>("/me/attendance"),
  goals: (status?: "ACTIVE" | "COMPLETED") =>
    api.get<StudentGoal[]>(`/me/goals${status ? `?status=${status}` : ""}`),
  registerPractice: (durationMin: number, notes?: string, date?: string) =>
    api.post<StudentProgress>("/me/practices", { durationMin, notes, date }),
  createGoal: (title: string, type: StudentGoal["type"], target: number, description?: string) =>
    api.post<StudentGoal>("/me/goals", { title, type, target, description }),
  updateGoal: (id: string, progress: number) => api.put<StudentGoal>(`/me/goals/${id}?progress=${progress}`),
};
