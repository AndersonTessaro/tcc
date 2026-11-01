import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button, Card, Drawer, Field, Input, PageHeader, Toolbar } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import { agendaService } from "../agendaService";
import type { LessonDto, LessonStatus } from "../agendaService";
import { addDays, localDate, weekDates, weekStart } from "../agendaDates";
import { formatDate } from "../format";
import { AgendaDay } from "../components/AgendaDay";
import { AttendanceForm } from "../components/AttendanceForm";
import { LessonForm } from "../components/LessonForm";
import { ListState } from "../components/ListState";
import { OptionSelect } from "../components/OptionSelect";
import { useAdminList } from "../hooks/useAdminList";
import { useCreateDrawer } from "../hooks/useCreateDrawer";

const loadOptions = async () => {
  const [teachers, enrollments] = await Promise.all([adminService.teachers(), adminService.enrollments("ACTIVE")]);
  return { teachers, enrollments };
};

export default function Agenda() {
  const options = useAdminList(loadOptions, { teachers: [], enrollments: [] }, "Erro ao carregar professores e matrículas");
  const [pickedTeacherId, setTeacherId] = useState("");
  const teacherId = pickedTeacherId || options.data.teachers[0]?.id || "";
  const [monday, setMonday] = useState(() => weekStart(localDate()));
  const [editing, setEditing] = useState<LessonDto | null>(null);
  const [attendance, setAttendance] = useState<LessonDto | null>(null);
  const [busy, setBusy] = useState(false);
  const creating = useCreateDrawer();
  const load = useCallback(() => teacherId ? agendaService.lessons(teacherId, monday, addDays(monday, 6)) : Promise.resolve([]), [teacherId, monday]);
  const { data, loading, error, reload } = useAdminList(load, [], "Erro ao carregar agenda");
  const enrollments = options.data.enrollments.filter((enrollment) => enrollment.teacher.id === teacherId && enrollment.status === "ACTIVE");
  const ready = !!teacherId && !options.loading && !options.error;
  const saved = async (date?: string) => {
    creating.hide(); setEditing(null); setAttendance(null);
    const savedWeek = date ? weekStart(date) : monday;
    if (savedWeek !== monday) setMonday(savedWeek);
    else await reload();
  };
  const today = localDate();
  const newLessonDate = today >= monday && today <= addDays(monday, 6) ? today : monday;
  const edit = async (lesson: LessonDto) => {
    setBusy(true);
    try {
      const detail = await agendaService.detail(lesson.id);
      setEditing({ ...detail.lesson, attendance: lesson.attendance });
    } catch (cause) { toast.error(apiErrorMessage(cause, "Erro ao carregar aula")); }
    finally { setBusy(false); }
  };
  const changeStatus = async (lesson: LessonDto, status: LessonStatus) => {
    const action = status === "DONE" ? "Concluir" : "Cancelar";
    if (!window.confirm(`${action} a aula de ${lesson.studentName} em ${formatDate(lesson.date)}? Esta mudança não pode ser desfeita.`)) return;
    setBusy(true);
    try {
      await agendaService.setStatus(lesson.id, status);
      toast.success(status === "DONE" ? "Aula concluída" : "Aula cancelada");
      await reload();
    } catch (cause) { toast.error(apiErrorMessage(cause, "Erro ao alterar situação da aula")); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Agenda" description="Aulas dos professores, de segunda a domingo."
        actions={<Button disabled={!ready || loading || busy} onClick={creating.show}>Nova aula</Button>} />
      <Card className="mb-6">
        <Toolbar>
          <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
            <OptionSelect label="Professor" value={teacherId} onChange={(id) => { setTeacherId(id); creating.hide(); }}
              disabled={options.loading || !!options.error} options={options.data.teachers.map((teacher) => ({ id: teacher.id, label: teacher.name }))} />
            <Button variant="secondary" onClick={() => setMonday(addDays(monday, -7))}>Semana anterior</Button>
            <Field label="Semana de"><Input type="date" value={monday} onChange={(event) => {
              if (event.target.value) setMonday(weekStart(event.target.value));
            }} /></Field>
            <Button variant="secondary" onClick={() => setMonday(addDays(monday, 7))}>Próxima semana</Button>
            <Button variant="ghost" disabled={!ready || loading} onClick={() => void reload()}>Atualizar agenda</Button>
          </fieldset>
        </Toolbar>
        <ListState loading={options.loading} error={options.error} empty={!options.data.teachers.length} emptyMessage="Nenhum professor encontrado" />
        {!options.loading && !options.error && options.data.teachers.length > 0 && !teacherId &&
          <p className="p-4 text-sm text-ink-muted">Selecione um professor para consultar a agenda.</p>}
      </Card>
      {ready && <>
        <ListState loading={loading} error={error} empty={false} emptyMessage="" />
        {!loading && !error && <div className="space-y-4">
          {weekDates(monday).map((date, index) => <AgendaDay key={date} date={date} index={index} busy={busy}
            lessons={data.filter((lesson) => lesson.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime))}
            onEdit={(lesson) => void edit(lesson)} onStatus={(lesson, status) => void changeStatus(lesson, status)} onAttendance={setAttendance} />)}
        </div>}
      </>}
      <Drawer open={(creating.open && ready) || editing !== null} title={editing ? "Editar aula" : "Nova aula"}
        onClose={() => { creating.hide(); setEditing(null); }}>
        <LessonForm key={editing?.id ?? `${teacherId}-${monday}`} lesson={editing ?? undefined} enrollments={enrollments} initialDate={newLessonDate} onSaved={saved} />
      </Drawer>
      <Drawer open={attendance !== null} title="Registrar frequência" onClose={() => setAttendance(null)}>
        {attendance && <AttendanceForm key={attendance.id} lesson={attendance} onSaved={() => saved()} />}
      </Drawer>
    </>
  );
}
