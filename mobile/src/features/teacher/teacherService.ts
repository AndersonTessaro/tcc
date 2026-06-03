import { api } from "../../lib/http";

export const teacherService = {
  dashboard: () => api.get<any>("/teacher/dashboard"),
  students: () => api.get<any[]>("/teacher/students"),
  student: (id: string) => api.get<any>(`/teacher/students/${id}`),
  newLesson: (b: {
    enrollmentId: string;
    date: string;
    startTime: string;
    endTime?: string;
    content?: string;
    homework?: string;
  }) => api.post<any>("/teacher/lessons", b),
  history: (start: string, end: string) =>
    api.get<any[]>(`/teacher/lessons?start=${start}&end=${end}`),
  attendance: (lessonId: string, status: string, justification?: string) =>
    api.post<any>(`/teacher/lessons/${lessonId}/attendance`, { status, justification }),
  schedule: (date: string) => api.get<any[]>(`/teacher/schedule?date=${date}`),
  reports: (studentId: string) => api.get<any>(`/teacher/reports?studentId=${studentId}`),
};
