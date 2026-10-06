import type { StatusTone } from "@/ui/StatusChip";
import { addDays, parseIsoDate } from "@/lib/format";
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

const STATUS_TONE: Record<LessonStatus, StatusTone> = {
  SCHEDULED: "info",
  DONE: "success",
  CANCELED: "neutral",
};

export const lessonStatusTone = (status: LessonStatus) => STATUS_TONE[status];

export function weekDates(anchor: string): string[] {
  const offsetFromMonday = (parseIsoDate(anchor).getDay() + 6) % 7;
  const monday = addDays(anchor, -offsetFromMonday);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

// `at` makes re-opening the agenda on the same date a new navigation, so the tab re-applies it.
export const scheduleHref = (date: string) => ({ pathname: "/(teacher)/schedule" as const, params: { date, at: String(Date.now()) } });
