import type { Weekday } from "./teacherService";

export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: "MONDAY", label: "Seg" },
  { value: "TUESDAY", label: "Ter" },
  { value: "WEDNESDAY", label: "Qua" },
  { value: "THURSDAY", label: "Qui" },
  { value: "FRIDAY", label: "Sex" },
  { value: "SATURDAY", label: "Sáb" },
  { value: "SUNDAY", label: "Dom" },
];

export const weekdayLabel = (weekday: Weekday) => WEEKDAYS.find((d) => d.value === weekday)?.label ?? weekday;
