import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Field, Input } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { agendaService } from "../agendaService";
import type { AvailabilityDto, LessonDto, LessonFields } from "../agendaService";
import type { EnrollmentDto } from "../adminService";
import { localDate } from "../agendaDates";
import { OptionSelect } from "./OptionSelect";

const oneHourLater = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours >= 23 ? "23:59" : `${String(hours + 1).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export function LessonForm({ lesson, enrollments, initialDate, onSaved }: {
  lesson?: LessonDto; enrollments: EnrollmentDto[]; initialDate: string; onSaved: (date: string) => Promise<void>;
}) {
  const [enrollmentId, setEnrollmentId] = useState(lesson?.enrollmentId ?? "");
  const [fields, setFields] = useState<LessonFields>({
    date: lesson?.date ?? initialDate, startTime: lesson?.startTime ?? "", endTime: lesson?.endTime ?? "",
    content: lesson?.content ?? "", homework: lesson?.homework ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityDto | null>(null);
  const request = useRef(0);
  const canReschedule = !lesson || (lesson.status === "SCHEDULED" && !lesson.attendance);
  const setField = (key: keyof LessonFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value,
      ...(key === "startTime" && value && !current.endTime ? { endTime: oneHourLater(value) } : {}) }));
    if (["date", "startTime", "endTime"].includes(key)) {
      request.current++;
      setChecking(false);
      setAvailability(null);
    }
  };
  const validSlot = () => {
    if (!enrollmentId || !fields.date || !fields.startTime || !fields.endTime) {
      toast.error("Informe matrícula, data, início e fim");
      return false;
    }
    if (fields.endTime <= fields.startTime) { toast.error("O fim deve ser depois do início"); return false; }
    return true;
  };
  const check = async () => {
    if (!validSlot()) return;
    const id = ++request.current;
    setChecking(true);
    setAvailability(null);
    try {
      const result = await agendaService.availability({ enrollmentId, date: fields.date, startTime: fields.startTime,
        endTime: fields.endTime, ...(lesson ? { lessonId: lesson.id } : {}) });
      if (request.current === id) setAvailability(result);
    } catch (cause) {
      if (request.current === id) toast.error(apiErrorMessage(cause, "Erro ao verificar disponibilidade"));
    } finally { if (request.current === id) setChecking(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validSlot()) return;
    setSaving(true);
    try {
      if (lesson) await agendaService.update(lesson.id, fields);
      else await agendaService.create({ enrollmentId, ...fields });
      toast.success(lesson ? "Aula atualizada" : "Aula criada");
      await onSaved(fields.date);
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao salvar aula"));
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={save}>
      <fieldset disabled={saving || lesson?.status === "CANCELED"} className="space-y-4">
        {!lesson && <OptionSelect label="Matrícula" value={enrollmentId} options={enrollments.map((enrollment) => ({
          id: enrollment.id, label: `${enrollment.student.name} — ${enrollment.instrument.name}`,
        }))} onChange={(id) => { setEnrollmentId(id); request.current++; setChecking(false); setAvailability(null); }} />}
        {!lesson && !enrollments.length && <p className="text-sm text-ink-muted">Este professor não tem matrículas ativas. Crie uma matrícula para agendar uma aula.</p>}
        {lesson && <p className="text-sm font-semibold text-ink">{lesson.studentName} — {lesson.instrument}</p>}
        {!canReschedule && <p className="text-sm text-ink-muted">Data e horário só podem mudar em aulas agendadas sem frequência registrada.</p>}
        <Field label="Data"><Input type="date" required disabled={!canReschedule} min={lesson && canReschedule ? localDate() : undefined}
          value={fields.date} onChange={(event) => setField("date", event.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início"><Input type="time" required disabled={!canReschedule} value={fields.startTime}
            onChange={(event) => setField("startTime", event.target.value)} /></Field>
          <Field label="Fim"><Input type="time" required disabled={!canReschedule} value={fields.endTime}
            onChange={(event) => setField("endTime", event.target.value)} /></Field>
        </div>
        {canReschedule && <div className="space-y-2">
          <Button variant="secondary" disabled={checking || !enrollmentId} onClick={() => void check()}>
            {checking ? "Verificando…" : "Verificar disponibilidade"}
          </Button>
          {availability && <p role="status" className={`text-sm ${availability.available ? "text-success" : "text-danger"}`}>
            {availability.available ? "Horário disponível" : "Conflito de horário com outra aula ou horário fixo"}
          </p>}
          {!!availability?.conflicts.length && <ul className="space-y-1 text-sm text-ink-muted">
            {availability.conflicts.map((block) => <li key={`${block.kind}-${block.referenceId}`}>
              {block.startTime.slice(0, 5)}–{block.endTime.slice(0, 5)} · {block.kind === "LESSON" ? "Aula" : "Horário fixo"}
              {" · "}{block.party === "TEACHER" ? "Professor" : block.party === "STUDENT" ? "Aluno" : "Professor e aluno"}
            </li>)}
          </ul>}
        </div>}
        <Field label="Conteúdo"><textarea className="w-full rounded-lg border border-line p-3 text-sm text-ink focus:outline-primary"
          rows={4} maxLength={1000} value={fields.content} onChange={(event) => setField("content", event.target.value)} /></Field>
        <Field label="Tarefa"><textarea className="w-full rounded-lg border border-line p-3 text-sm text-ink focus:outline-primary"
          rows={3} maxLength={1000} value={fields.homework} onChange={(event) => setField("homework", event.target.value)} /></Field>
        <Button type="submit" className="w-full" disabled={saving || (!lesson && !enrollments.length)}>
          {saving ? "Salvando…" : lesson ? "Salvar aula" : "Criar aula"}
        </Button>
      </fieldset>
    </form>
  );
}
