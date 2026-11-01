import { useState } from "react";
import { toast } from "sonner";
import { Button, Field, Input, Select } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { agendaService } from "../agendaService";
import type { AttendanceStatus, LessonDto } from "../agendaService";

export function AttendanceForm({ lesson, onSaved }: { lesson: LessonDto; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<AttendanceStatus>(lesson.attendance ?? "PRESENT");
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lesson.attendance && !window.confirm(`Atualizar a frequência de ${lesson.studentName}?`)) return;
    setSaving(true);
    try {
      await agendaService.attendance(lesson.id, status, status === "EXCUSED" ? justification.trim() || undefined : undefined);
      toast.success("Frequência registrada");
      await onSaved();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao registrar frequência"));
    } finally { setSaving(false); }
  };
  return (
    <form onSubmit={save}>
      <fieldset disabled={saving} className="space-y-4">
        <p className="text-sm text-ink">{lesson.studentName} — {lesson.instrument}</p>
        <Field label="Frequência"><Select value={status} onChange={(event) => setStatus(event.target.value as AttendanceStatus)}>
          <option value="PRESENT">Presente</option><option value="ABSENT">Falta</option><option value="EXCUSED">Justificada</option>
        </Select></Field>
        {status === "EXCUSED" && <Field label="Justificativa"><Input value={justification}
          onChange={(event) => setJustification(event.target.value)} /></Field>}
        <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvando…" : "Salvar frequência"}</Button>
      </fieldset>
    </form>
  );
}
