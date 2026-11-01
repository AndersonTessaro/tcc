import type { LessonDto } from "./agendaService";

export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const parseDate = (date: string) => new Date(`${date}T12:00:00`);

export function addDays(date: string, days: number) {
  const value = parseDate(date);
  value.setDate(value.getDate() + days);
  return localDate(value);
}

export function weekStart(date: string) {
  return addDays(date, -((parseDate(date).getDay() + 6) % 7));
}

export const weekDates = (monday: string) => Array.from({ length: 7 }, (_, index) => addDays(monday, index));

export function canRecordAttendance(lesson: Pick<LessonDto, "date" | "startTime" | "status">, now = new Date()) {
  return lesson.status !== "CANCELED" && new Date(`${lesson.date}T${lesson.startTime}`) <= now;
}
