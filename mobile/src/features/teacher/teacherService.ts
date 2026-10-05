import { api } from "../../lib/http";
import { Platform } from "react-native";

export type MaterialFile = { uri: string; name: string; mimeType?: string; file?: Blob };

export type TeacherEnrollment = {
  id: string;
  studentId: string;
  studentName: string;
  instrument: string;
};

export type StudentSummary = { id: string; name: string; username: string };

export type LessonStatus = "SCHEDULED" | "DONE" | "CANCELED";
export type Weekday = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export type TeacherSchedule = {
  id: string;
  enrollmentId: string;
  studentName: string;
  instrument: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type NewSchedule = { enrollmentId: string; weekday: Weekday; startTime: string; endTime: string };
export type NewMakeup = { date: string; startTime: string; endTime: string; reason?: string };
export type MakeupLink = { id: string; originalLesson: TeacherLesson; newLesson: TeacherLesson; reason: string | null };
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

export type TeacherDashboardData = {
  totalStudents: number;
  attendancePercent: number;
  weeklyPracticeMin: number;
  classes: string[];
  selectedClass: string;
  todayLessons: TeacherLesson[];
  upcomingLessons: TeacherLesson[];
};

export type TeacherStudentDetailData = {
  studentId: string;
  progress: { xpTotal: number; level: number; streakDays: number } | null;
  lessonsCount: number;
  attendance: { present: number; absent: number; excused: number; rate: number };
  attendanceHistory: { date: string; status: AttendanceStatus }[];
  goals: { active: number; completed: number };
  nextGoal: string;
  weeklyPracticeMin: number;
  recentPractices: { date: string; durationMin: number; notes: string }[];
  enrollmentDate: string;
};

export type TeacherStudentMaterial = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  createdAt: string;
};

export const teacherService = {
  dashboard: (className?: string) => api.get<TeacherDashboardData>(`/teacher/dashboard${className ? `?className=${encodeURIComponent(className)}` : ""}`),
  students: () => api.get<StudentSummary[]>("/teacher/students"),
  student: (id: string) => api.get<TeacherStudentDetailData>(`/teacher/students/${id}`),
  studentLessons: (id: string) => api.get<TeacherLesson[]>(`/teacher/students/${id}/lessons`),
  studentMaterials: (id: string) => api.get<TeacherStudentMaterial[]>(`/teacher/students/${id}/materials`),
  enrollments: () => api.get<TeacherEnrollment[]>("/teacher/enrollments"),
  newLesson: (b: {
    enrollmentId: string;
    date: string;
    startTime: string;
    endTime: string;
    content?: string;
    homework?: string;
  }) => api.post<TeacherLesson>("/teacher/lessons", b),
  history: (start: string, end: string) =>
    api.get<TeacherLesson[]>(`/teacher/lessons?start=${start}&end=${end}`),
  attendance: (lessonId: string, status: AttendanceStatus, justification?: string) =>
    api.post<any>(`/teacher/lessons/${lessonId}/attendance`, { status, justification }),
  schedule: (date: string) => api.get<TeacherLesson[]>(`/teacher/schedule?date=${date}`),
  changeLessonStatus: (lessonId: string, status: LessonStatus) =>
    api.patch<TeacherLesson>(`/teacher/lessons/${lessonId}/status`, { status }),
  makeup: (lessonId: string, b: NewMakeup) => api.post<MakeupLink>(`/teacher/lessons/${lessonId}/makeup`, b),
  makeupLink: (lessonId: string) => api.get<MakeupLink | undefined>(`/teacher/lessons/${lessonId}/makeup`),
  schedules: () => api.get<TeacherSchedule[]>("/teacher/schedules"),
  createSchedule: (b: NewSchedule) => api.post<TeacherSchedule>("/teacher/schedules", b),
  setScheduleActive: (scheduleId: string, active: boolean) =>
    api.patch<TeacherSchedule>(`/teacher/schedules/${scheduleId}/active`, { active }),
  reports: (studentId: string) => api.get<TeacherStudentDetailData>(`/teacher/reports?studentId=${studentId}`),
  uploadMaterial: (
    studentId: string,
    file: MaterialFile,
    title: string,
    description?: string,
  ) => {
    const form = new FormData();
    // React Native FormData accepts a {uri,name,type} object for files.
    if (Platform.OS === "web") {
      if (!file.file) throw new Error("Escolha novamente o arquivo para enviar.");
      form.append("file", file.file, file.name);
    } else form.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType ?? "application/octet-stream",
    } as unknown as Blob);
    form.append("title", title);
    if (description) form.append("description", description);
    return api.postForm<any>(`/teacher/students/${studentId}/materials`, form);
  },
};
