const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
  if (!DATE_PATTERN.test(date)) return "Data inválida (AAAA-MM-DD)";
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day
    ? null
    : "Data inválida (AAAA-MM-DD)";
}

export function validateLessonForm(input: LessonFormInput): string | null {
  if (!input.enrollmentId) return "Selecione o aluno";
  return validateDate(input.date) ?? validateTimeRange(input.startTime, input.endTime);
}

