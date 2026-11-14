import { addDays, isValidIsoDate, todayIso } from "@/lib/format";
import { DAY_END, fromMinutes, toMinutes } from "./scheduling";

const DEFAULT_LESSON_MIN = 60;

export function initialLessonSlot(now: Date, date = todayIso(now)) {
  const defaultStart = "10:00";
  const tenToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10);
  if (date !== todayIso(now) || now <= tenToday) return { date, start: defaultStart };
  const start = (now.getHours() + 1) * 60;
  return start + DEFAULT_LESSON_MIN > toMinutes(DAY_END)
    ? { date: addDays(date, 1), start: defaultStart }
    : { date, start: fromMinutes(start) };
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function localIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function oneHourAfter(time: string): string {
  if (!TIME_PATTERN.test(time)) return "";
  const [hours, minutes] = time.split(":").map(Number);
  if (hours >= 23) return "23:59";
  return `${String(hours + 1).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export type LessonFormInput = {
  enrollmentId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export function validateTimeRange(startTime: string, endTime: string): string | null {
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) return "Horário inválido (HH:MM)";
  if (endTime <= startTime) return "O fim deve ser depois do início";
  return null;
}

export function validateDate(date: string): string | null {
  return isValidIsoDate(date) ? null : "Data inválida (AAAA-MM-DD)";
}

export function validateLessonForm(input: LessonFormInput): string | null {
  if (!input.enrollmentId) return "Selecione o aluno";
  return validateDate(input.date) ?? validateTimeRange(input.startTime, input.endTime);
}


export type LessonRecurrence = "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export const RECURRENCE_OPTIONS: { value: LessonRecurrence; label: string }[] = [
  { value: "NONE", label: "Única" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "BIWEEKLY", label: "Quinzenal" },
  { value: "MONTHLY", label: "Mensal" },
];

export const DEFAULT_REPEAT_MONTHS = 3;
export const MAX_REPEAT_MONTHS = 12;

// Clamps to the last day when the target month is shorter, like LocalDate.plusMonths on the server.
export function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(Math.min(day, lastDay))}`;
}

export function validateRepeatUntil(date: string, repeatUntil: string): string | null {
  const invalid = validateDate(repeatUntil);
  if (invalid) return invalid;
  if (repeatUntil < date) return "Escolha uma data depois da primeira aula";
  if (repeatUntil > addMonths(date, MAX_REPEAT_MONTHS)) return "A repetição vai até 12 meses";
  return null;
}
