import type { AvailabilityBlock } from "./teacherService";

export const DURATION_OPTIONS = [30, 45, 60, 90] as const;
export const DAY_START = "07:00";
export const DAY_END = "22:00";
const SLOT_STEP_MIN = 30;

export function toMinutes(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(total, 23 * 60 + 59));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

export function addMinutes(time: string, minutes: number): string {
  return fromMinutes(toMinutes(time) + minutes);
}

export function durationBetween(start: string, end: string): number {
  return toMinutes(end) - toMinutes(start);
}

// Same rule as lesson-core TimeRange.overlaps: end is exclusive, so 10:00-11:00 and 11:00-12:00 don't clash.
export function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(startB) < toMinutes(endA);
}

export function freeStarts(busy: AvailabilityBlock[], durationMin: number, from = DAY_START, until = DAY_END): string[] {
  const starts: string[] = [];
  for (let minute = toMinutes(from); minute + durationMin <= toMinutes(until); minute += SLOT_STEP_MIN) {
    const start = fromMinutes(minute);
    const end = fromMinutes(minute + durationMin);
    if (!busy.some((block) => overlaps(start, end, block.startTime, block.endTime))) starts.push(start);
  }
  return starts;
}

export function nextFreeStarts(busy: AvailabilityBlock[], durationMin: number, after: string | null, limit = 6): string[] {
  const all = freeStarts(busy, durationMin);
  const upcoming = after ? all.filter((start) => start >= after) : all;
  return upcoming.slice(0, limit);
}

export function partyLabel(party: AvailabilityBlock["party"]): string {
  if (party === "BOTH") return "Professor e aluno";
  return party === "TEACHER" ? "Sua agenda" : "Agenda do aluno";
}
