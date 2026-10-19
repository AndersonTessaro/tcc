import { api, MEDIA_TIMEOUT_MS } from "../../lib/http";

import { appendFile, type PickedFile } from "../../lib/http/formFile";
import { goalService } from "../goals/goalService";
import type { Goal } from "../goals/goalService";
import { recordingMimeType } from "./recording";

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
  contentType: string | null;
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

export type PracticeRegistration = StudentProgress & { practiceId: string };

export type StudentPractice = {
  id: string;
  date: string;
  durationMin: number;
  notes: string | null;
  difficulty: string | null;
  rating: number | null;
  recording: { fileName: string; contentType: string; sizeBytes: number; uploadedAt: string } | null;
};

export type TeacherNote = { teacherName: string; notes: string; updatedAt: string };

export type StudentAttendance = {
  date: string;
  status: "PRESENT" | "ABSENT" | "EXCUSED";
};

export type StudentGoal = Goal;

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
  ...goalService("/me/goals"),
  teacherNotes: () => api.get<TeacherNote[]>("/me/teacher-notes"),
  dashboard: () => api.get<StudentDashboard>("/me/dashboard"),
  lessons: (status: "upcoming" | "past") => api.get<StudentLesson[]>(`/me/lessons?status=${status}`),
  lesson: (id: string) => api.get<StudentLessonDetail>(`/me/lessons/${id}`),
  downloadLessonAttachment: (lessonId: string, attachmentId: string) =>
    api.getBytes(`/me/lessons/${lessonId}/attachments/${attachmentId}`, { timeoutMs: MEDIA_TIMEOUT_MS }),
  materials: (search?: string) =>
    api.get<StudentMaterial[]>(`/me/materials${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  downloadMaterial: (id: string) => api.getBytes(`/me/materials/${id}/download`),
  progress: () => api.get<StudentProgress>("/me/progress"),
  practices: () => api.get<StudentPractice[]>("/me/practices"),
  attendance: () => api.get<StudentAttendance[]>("/me/attendance"),
  registerPractice: (body: { durationMin: number; date: string; notes?: string; difficulty?: string; rating?: number }) =>
    api.post<PracticeRegistration>("/me/practices", body),
  uploadPracticeRecording: (practiceId: string, file: PickedFile) => {
    const form = new FormData();
    appendFile(form, "file", { ...file, mimeType: recordingMimeType(file.name, file.mimeType) ?? undefined });
    return api.postForm<StudentPractice>(`/me/practices/${practiceId}/recording`, form, { timeoutMs: MEDIA_TIMEOUT_MS });
  },
  downloadPracticeRecording: (id: string) => api.getBytes(`/me/practices/${id}/recording`, { timeoutMs: MEDIA_TIMEOUT_MS }),
};
