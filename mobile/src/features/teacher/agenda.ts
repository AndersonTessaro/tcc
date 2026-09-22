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

export type LessonActions = { canComplete: boolean; canCancel: boolean; canReplace: boolean };

export function lessonActions(lesson: Pick<TeacherLesson, "status" | "date">, today: string): LessonActions {
  const scheduled = lesson.status === "SCHEDULED";
  return {
    canComplete: scheduled && lesson.date <= today,
    canCancel: scheduled,
    canReplace: !scheduled,
  };
}

export function canRecordAttendance(lesson: Pick<TeacherLesson, "status" | "date">, today: string): boolean {
  return lesson.status !== "CANCELED" && lesson.date <= today;
}
