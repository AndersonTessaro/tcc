import type { AttendanceStatus, LessonStatus, TeacherLesson } from "./teacherService";

export const ATTENDANCE_OPTIONS: { status: AttendanceStatus; label: string }[] = [
  { status: "PRESENT", label: "Presente" },
  { status: "ABSENT", label: "Falta" },
  { status: "EXCUSED", label: "Justificada" },
];

const STATUS_LABEL: Record<LessonStatus, string> = {
  SCHEDULED: "Agendada",
  DONE: "Realizada",
  CANCELED: "Cancelada",
};

export const lessonStatusLabel = (status: LessonStatus) => STATUS_LABEL[status];

export const hhmm = (time: string) => time.slice(0, 5);

export function canRecordAttendance(lesson: Pick<TeacherLesson, "status" | "date">, today: string): boolean {
  return lesson.status !== "CANCELED" && lesson.date <= today;
}
