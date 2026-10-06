const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_MS = 86_400_000;

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso(now = new Date()): string {
  return toIsoDate(now);
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function shortTime(time?: string | null): string {
  return time ? time.slice(0, 5) : "";
}

export function formatDayMonth(iso: string): string {
  const [, month, day] = iso.split("-");
  return day && month ? `${day}/${month}` : iso;
}

export function formatFullDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return day && month && year ? `${day}/${month}/${year}` : iso;
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}min`;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export function relativeDayLabel(iso: string, now = new Date()): string {
  const diff = Math.round((parseIsoDate(iso).getTime() - parseIsoDate(todayIso(now)).getTime()) / DAY_MS);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  const weekday = WEEKDAYS_SHORT[parseIsoDate(iso).getDay()];
  return `${weekday}, ${formatDayMonth(iso)}`;
}

export function formatLessonWhen(date: string, startTime?: string | null, now = new Date()): string {
  const time = shortTime(startTime);
  const day = relativeDayLabel(date, now);
  return time ? `${day} · ${time}` : day;
}

export function formatMonthYear(date: Date): string {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
