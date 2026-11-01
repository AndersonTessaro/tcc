import { Badge, Button, Card } from "@/components/ui";
import type { LessonDto, LessonStatus } from "../agendaService";
import { canRecordAttendance } from "../agendaDates";
import { formatDate } from "../format";

const DAY_NAMES = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
const STATUS_LABELS = { SCHEDULED: "Agendada", DONE: "Concluída", CANCELED: "Cancelada" };
const ATTENDANCE_LABELS = { PRESENT: "Presente", ABSENT: "Falta", EXCUSED: "Justificada" };

export function AgendaDay({ date, index, lessons, busy, onEdit, onStatus, onAttendance }: {
  date: string; index: number; lessons: LessonDto[]; busy: boolean; onEdit: (lesson: LessonDto) => void;
  onStatus: (lesson: LessonDto, status: LessonStatus) => void; onAttendance: (lesson: LessonDto) => void;
}) {
  const title = `${DAY_NAMES[index]}, ${formatDate(date)}`;
  return (
    <section aria-label={title}>
      <Card>
        <h2 className="border-b border-line px-4 py-3 text-sm font-bold text-ink">{title}</h2>
        {!lessons.length ? <p className="p-4 text-sm text-ink-faint">Nenhuma aula neste dia</p> : <ul className="divide-y divide-line">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
              <div className="min-w-0 space-y-1">
                <p className="tabular text-sm font-semibold text-ink">{lesson.startTime.slice(0, 5)}–{lesson.endTime.slice(0, 5)}</p>
                <p className="font-semibold text-ink">{lesson.studentName} <span className="font-normal text-ink-muted">· {lesson.instrument}</span></p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={lesson.status === "DONE" ? "success" : lesson.status === "CANCELED" ? "danger" : "brand"}>{STATUS_LABELS[lesson.status]}</Badge>
                  {lesson.attendance && <Badge>{ATTENDANCE_LABELS[lesson.attendance]}</Badge>}
                </div>
                {lesson.content && <p className="whitespace-pre-wrap break-words text-sm text-ink-muted">{lesson.content}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" disabled={busy || lesson.status === "CANCELED"}
                  aria-label={`Editar aula de ${lesson.studentName} em ${formatDate(date)}`} onClick={() => onEdit(lesson)}>Editar</Button>
                {lesson.status === "SCHEDULED" && <>
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => onStatus(lesson, "DONE")}>Concluir</Button>
                  <Button variant="danger" size="sm" disabled={busy} onClick={() => onStatus(lesson, "CANCELED")}>Cancelar</Button>
                </>}
                <Button variant="secondary" size="sm" disabled={busy || !canRecordAttendance(lesson)}
                  aria-label={`Registrar frequência de ${lesson.studentName} em ${formatDate(date)}`} onClick={() => onAttendance(lesson)}>Frequência</Button>
              </div>
            </li>
          ))}
        </ul>}
      </Card>
    </section>
  );
}
