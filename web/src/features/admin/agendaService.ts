import { api } from "@/lib/http";

export type LessonStatus = "SCHEDULED" | "DONE" | "CANCELED";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";
export type LessonDto = {
  id: string;
  enrollmentId: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  instrument: string;
  date: string;
  startTime: string;
  endTime: string;
  status: LessonStatus;
  content: string | null;
  homework: string | null;
  notes: string | null;
  attendance: AttendanceStatus | null;
  fromSchedule: boolean;
};
export type LessonFields = { date: string; startTime: string; endTime: string; content: string; homework: string };
export type NewLesson = LessonFields & { enrollmentId: string };
export type AttendanceDto = {
  id: string; lessonId: string; status: AttendanceStatus; justification: string | null; registeredAt: string;
};
export type AvailabilityBlock = {
  referenceId: string; kind: "LESSON" | "RECURRING"; party: "TEACHER" | "STUDENT" | "BOTH";
  startTime: string; endTime: string; description: string;
};
export type AvailabilityDto = {
  initialStatus: LessonStatus; available: boolean; busy: AvailabilityBlock[]; conflicts: AvailabilityBlock[];
  fulfilledSchedule: AvailabilityBlock | null;
};
type AvailabilityQuery = { enrollmentId: string; date: string; startTime: string; endTime: string; lessonId?: string };

export const agendaService = {
  lessons: (teacherId: string, from: string, to: string) =>
    api.get<LessonDto[]>(`/admin/lessons?${new URLSearchParams({ teacherId, from, to })}`),
  detail: (id: string) => api.get<{ lesson: LessonDto; attachments: unknown[] }>(`/teacher/lessons/${id}`),
  create: (body: NewLesson) => api.post<LessonDto>("/teacher/lessons", body),
  update: (id: string, body: LessonFields) => api.put<LessonDto>(`/teacher/lessons/${id}`, body),
  setStatus: (id: string, status: LessonStatus) => api.patch<LessonDto>(`/teacher/lessons/${id}/status`, { status }),
  attendance: (id: string, status: AttendanceStatus, justification?: string) =>
    api.post<AttendanceDto>(`/teacher/lessons/${id}/attendance`, { status, justification }),
  availability: (query: AvailabilityQuery) => api.get<AvailabilityDto>(`/teacher/lessons/availability?${new URLSearchParams(query)}`),
};
