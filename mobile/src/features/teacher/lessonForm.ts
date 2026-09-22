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

export function validateLessonForm(input: LessonFormInput): string | null {
  if (!input.enrollmentId) return "Selecione o aluno";
  if (!DATE_PATTERN.test(input.date)) return "Data inválida (AAAA-MM-DD)";
  if (!TIME_PATTERN.test(input.startTime) || !TIME_PATTERN.test(input.endTime))
    return "Horário inválido (HH:MM)";
  if (input.endTime <= input.startTime) return "O fim deve ser depois do início";
  return null;
}

