import { formatFullDate, parseIsoDate, shortTime, todayIso } from "@/lib/format";
import type { StatusTone } from "@/ui/StatusChip";
import type { StudentLesson } from "./studentService";

const WEEKDAYS_LONG = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export type LessonBadge = { label: string; tone: StatusTone };

export function lessonBadge(lesson: Pick<StudentLesson, "status" | "date">, today = todayIso()): LessonBadge {
  if (lesson.status === "DONE") return { label: "Concluída", tone: "success" };
  if (lesson.status === "CANCELED") return { label: "Cancelada", tone: "neutral" };
  if (lesson.date < today) return { label: "Sem registro", tone: "warning" };
  return { label: "Agendada", tone: "info" };
}

export function formatLessonDateLong(date: string): string {
  return `${WEEKDAYS_LONG[parseIsoDate(date).getDay()]}, ${formatFullDate(date)}`;
}

export function formatTimeRange(startTime: string, endTime?: string | null): string {
  const end = shortTime(endTime);
  return end ? `${shortTime(startTime)} – ${end}` : shortTime(startTime);
}

export function byDateTime(a: StudentLesson, b: StudentLesson): number {
  return `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`);
}
