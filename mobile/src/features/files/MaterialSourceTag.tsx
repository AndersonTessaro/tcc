import type { MaterialSource } from "@/features/student/studentService";
import { formatFullDate } from "@/lib/format";
import { StatusChip } from "@/ui/StatusChip";

export function MaterialSourceTag({ item }: { item: MaterialSource }) {
  return item.source === "LESSON" ? <StatusChip label={`Aula ${formatFullDate(item.lessonDate).slice(0, 5)}`} tone="info" /> : null;
}
