import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Card, Drawer, Field, Input, PageHeader, Segmented, Select, Table, Toolbar, cell } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { EnrollmentDto, EnrollmentStatus, PersonOption, TeacherOption } from "../adminService";
import { ListState } from "../components/ListState";
import { OptionSelect } from "../components/OptionSelect";
import { useAdminList } from "../hooks/useAdminList";
import { useCreateDrawer } from "../hooks/useCreateDrawer";
import { brl } from "../format";

type StatusFilter = EnrollmentStatus | "";

const STATUS: Record<EnrollmentStatus, { label: string; tone: "success" | "warning" | "neutral" }> = {
  ACTIVE: { label: "Ativa", tone: "success" },
  SUSPENDED: { label: "Suspensa", tone: "warning" },
  CLOSED: { label: "Encerrada", tone: "neutral" },
};
const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "ACTIVE", label: "Ativas" }, { id: "SUSPENDED", label: "Suspensas" },
  { id: "CLOSED", label: "Encerradas" }, { id: "", label: "Todas" },
];
const COLUMNS = [
  { label: "Aluno" }, { label: "Professor" }, { label: "Turma / instrumento" }, { label: "Status" },
  { label: "Mensalidade", align: "right" as const }, { label: "Ações", align: "right" as const },
];
const personOption = (person: PersonOption) => ({ id: person.id, label: `${person.name} (${person.username})` });
const loadOptions = async () => {
  const [students, teachers] = await Promise.all([adminService.students(), adminService.teachers()]);
  return { students, teachers };
};
const emptyEnrollment = { studentId: "", teacherId: "", instrumentId: "" };

export default function Enrollments() {
  const [status, setStatus] = useState<StatusFilter>("ACTIVE");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EnrollmentDto | null>(null);
  const creating = useCreateDrawer();
  const load = useCallback(() => adminService.enrollments(status || undefined), [status]);
  const { data, loading, error, reload } = useAdminList(load, [], "Erro ao carregar matrículas");
  const filtered = data.filter((enrollment) => [enrollment.student.name, enrollment.student.username,
    enrollment.teacher.name, enrollment.teacher.username, enrollment.classLabel].join(" ")
    .toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));
  const newButton = <Button onClick={creating.show}>Nova matrícula</Button>;

  return (
    <>
      <PageHeader title="Matrículas" count={loading ? undefined : `${data.length}`}
        description="Quem estuda o quê, com quem, e quanto paga por mês." actions={newButton} />
      <Card>
        <Toolbar>
          <Input type="search" aria-label="Buscar matrículas" placeholder="Buscar por aluno, professor ou turma"
            autoComplete="off" spellCheck={false} className="max-w-sm" value={search}
            onChange={(event) => setSearch(event.target.value)} />
          <Segmented label="Filtrar por status" value={status} options={FILTERS} onChange={setStatus} />
        </Toolbar>
        <ListState loading={loading} error={error} empty={!filtered.length} emptyMessage="Nenhuma matrícula encontrada"
          emptyAction={!search && status === "ACTIVE" ? newButton : undefined} />
        {!loading && !error && filtered.length > 0 && (
          <Table columns={COLUMNS}>
            {filtered.map((enrollment) => (
              <tr key={enrollment.id} className="hover:bg-canvas/60">
                <td className={cell}>
                  <p className="font-semibold text-ink">{enrollment.student.name}</p>
                  <p className="text-xs text-ink-faint">{enrollment.student.username}</p>
                </td>
                <td className={cell}>{enrollment.teacher.name}</td>
                <td className={cell}>{enrollment.classLabel}</td>
                <td className={cell}><Badge tone={STATUS[enrollment.status].tone}>{STATUS[enrollment.status].label}</Badge></td>
                <td className={`${cell} tabular text-right`}>
                  {enrollment.monthlyFee === null
                    ? <Button variant="ghost" size="sm" aria-label={`Definir mensalidade de ${enrollment.student.name}`}
                        onClick={() => setEditing(enrollment)}>Definir</Button>
                    : brl.format(enrollment.monthlyFee)}
                </td>
                <td className={`${cell} text-right`}>
                  <Button variant="secondary" size="sm" aria-label={`Editar matrícula de ${enrollment.student.name}`}
                    onClick={() => setEditing(enrollment)}>Editar</Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Drawer open={editing !== null} title={`Matrícula de ${editing?.student.name ?? ""}`}
        description={editing ? `${editing.classLabel}, com ${editing.teacher.name}` : undefined}
        onClose={() => setEditing(null)}>
        {editing && <EnrollmentEditor key={editing.id} enrollment={editing}
          onSaved={async () => { setEditing(null); await reload(); }} />}
      </Drawer>

      <Drawer open={creating.open} title="Nova matrícula" description="Vincule um aluno a um professor e instrumento."
        onClose={creating.hide}>
        <EnrollmentForm onSaved={async () => { creating.hide(); await reload(); }} />
      </Drawer>
    </>
  );
}

function EnrollmentEditor({ enrollment, onSaved }: { enrollment: EnrollmentDto; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<EnrollmentStatus>(enrollment.status);
  const [fee, setFee] = useState(enrollment.monthlyFee?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const monthlyFee = parseFee(fee);
    if (monthlyFee === undefined) return;
    const statusChanged = status !== enrollment.status;
    const feeChanged = monthlyFee !== enrollment.monthlyFee;
    if (!statusChanged && !feeChanged) {
      await onSaved();
      return;
    }
    if (statusChanged && status === "CLOSED" && !window.confirm(`Encerrar a matrícula de ${enrollment.student.name}?`)) return;
    setSaving(true);
    try {
      if (statusChanged) await adminService.setEnrollmentStatus(enrollment.id, status);
      if (feeChanged) await adminService.setEnrollmentFee(enrollment.id, monthlyFee);
      toast.success("Matrícula atualizada");
      await onSaved();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao atualizar matrícula"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save}>
      <fieldset disabled={saving} className="space-y-4">
        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as EnrollmentStatus)}>
            {(Object.keys(STATUS) as EnrollmentStatus[]).map((id) => <option key={id} value={id}>{STATUS[id].label}</option>)}
          </Select>
        </Field>
        <Field label="Mensalidade (R$)" hint="Deixe em branco para a matrícula ficar sem mensalidade.">
          <Input type="number" inputMode="decimal" min="0" max="99999999.99" step="0.01" className="tabular"
            value={fee} onChange={(event) => setFee(event.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Button>
      </fieldset>
    </form>
  );
}

function EnrollmentForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const { data, loading, error } = useAdminList(loadOptions,
    { students: [] as PersonOption[], teachers: [] as TeacherOption[] }, "Erro ao carregar alunos e professores");
  const [enrollment, setEnrollment] = useState(emptyEnrollment);
  const [fee, setFee] = useState("");
  const [saving, setSaving] = useState(false);
  const teacher = data.teachers.find((item) => item.id === enrollment.teacherId);
  const pickTeacher = (teacherId: string) => {
    const instruments = data.teachers.find((item) => item.id === teacherId)?.instruments ?? [];
    setEnrollment({ ...enrollment, teacherId,
      instrumentId: instruments.some((item) => item.id === enrollment.instrumentId) ? enrollment.instrumentId : "" });
  };
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!enrollment.studentId || !enrollment.teacherId || !enrollment.instrumentId) {
      toast.error("Selecione aluno, professor e instrumento");
      return;
    }
    const monthlyFee = parseFee(fee);
    if (monthlyFee === undefined) return;
    setSaving(true);
    try {
      await adminService.createEnrollment({ ...enrollment, monthlyFee });
      toast.success("Matrícula criada");
      setEnrollment(emptyEnrollment);
      setFee("");
      await onSaved();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao criar matrícula"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || error) return <ListState loading={loading} error={error} empty={false} emptyMessage="" />;
  return (
    <form onSubmit={create}>
      <fieldset disabled={saving} className="space-y-4">
        <OptionSelect label="Aluno" value={enrollment.studentId} options={data.students.map(personOption)}
          onChange={(studentId) => setEnrollment({ ...enrollment, studentId })} />
        <OptionSelect label="Professor" value={enrollment.teacherId} options={data.teachers.map(personOption)} onChange={pickTeacher} />
        <OptionSelect label="Instrumento" value={enrollment.instrumentId}
          options={(teacher?.instruments ?? []).map((item) => ({ id: item.id, label: item.name }))}
          onChange={(instrumentId) => setEnrollment({ ...enrollment, instrumentId })}
          placeholder={!teacher ? "Selecione o professor primeiro" : !teacher.instruments.length ? "Professor sem instrumentos" : "Selecione…"} />
        <Field label="Mensalidade (opcional)" hint="Em reais. Pode ser definida depois.">
          <Input type="number" inputMode="decimal" min="0" max="99999999.99" step="0.01" className="tabular"
            value={fee} onChange={(event) => setFee(event.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvando…" : "Criar matrícula"}</Button>
      </fieldset>
    </form>
  );
}

function parseFee(input: string): number | null | undefined {
  if (!input.trim()) return null;
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0 || value > 99999999.99 || !/^\d+(\.\d{1,2})?$/.test(input)) {
    toast.error("Informe uma mensalidade válida com até duas casas decimais");
    return undefined;
  }
  return value;
}
