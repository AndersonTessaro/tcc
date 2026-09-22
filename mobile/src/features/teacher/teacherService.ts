import { api } from "../../lib/http";

export type TeacherEnrollment = {
  id: string;
  studentId: string;
  studentName: string;
  instrument: string;
};

export type StudentSummary = { id: string; name: string; username: string };

export type LessonStatus = "SCHEDULED" | "DONE" | "CANCELED";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";

export type TeacherLesson = {
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
  attendance: AttendanceStatus | null;
};

export const teacherService = {
  dashboard: () => api.get<any>("/teacher/dashboard"),
  students: () => api.get<StudentSummary[]>("/teacher/students"),
  student: (id: string) => api.get<any>(`/teacher/students/${id}`),
  enrollments: () => api.get<TeacherEnrollment[]>("/teacher/enrollments"),
  newLesson: (b: {
    enrollmentId: string;
    date: string;
    startTime: string;
    endTime: string;
    content?: string;
    homework?: string;
  }) => api.post<any>("/teacher/lessons", b),
  history: (start: string, end: string) =>
    api.get<any[]>(`/teacher/lessons?start=${start}&end=${end}`),
  attendance: (lessonId: string, status: AttendanceStatus, justification?: string) =>
    api.post<any>(`/teacher/lessons/${lessonId}/attendance`, { status, justification }),
  schedule: (date: string) => api.get<TeacherLesson[]>(`/teacher/schedule?date=${date}`),
  reports: (studentId: string) => api.get<any>(`/teacher/reports?studentId=${studentId}`),
  uploadMaterial: (
    studentId: string,
    file: { uri: string; name: string; mimeType?: string },
    title: string,
    description?: string,
  ) => {
    const form = new FormData();
    // React Native FormData accepts a {uri,name,type} object for files.
    form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/octet-stream",
    } as unknown as Blob);
    form.append("title", title);
    if (description) form.append("description", description);
    return api.postForm<any>(`/teacher/students/${studentId}/materials`, form);
  },
};
