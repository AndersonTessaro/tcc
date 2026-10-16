import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input, PageTitle } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { EnrollmentDto, EnrollmentStatus, PersonOption, TeacherOption } from "../adminService";
import { ListState } from "../components/ListState";
import { OptionSelect } from "../components/OptionSelect";
import { useAdminList } from "../hooks/useAdminList";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const statuses: { id: EnrollmentStatus; label: string }[] = [
  { id: "ACTIVE", label: "Ativa" }, { id: "SUSPENDED", label: "Suspensa" }, { id: "CLOSED", label: "Encerrada" },
];
const personOption = (person: PersonOption) => ({ id: person.id, label: `${person.name} (${person.username})` });
const loadOptions = async () => {
  const [students, teachers] = await Promise.all([adminService.students(), adminService.teachers()]);
  return { students, teachers };
};
const emptyEnrollment = { studentId: "", teacherId: "", instrumentId: "" };

export default function Enrollments() {
  const [status, setStatus] = useState<EnrollmentStatus | "">("ACTIVE");
  const [search, setSearch] = useState("");
  const load = useCallback(() => adminService.enrollments(status || undefined), [status]);
  const { data, loading, error, reload } = useAdminList(load, [], "Erro ao carregar matrículas");
  const filtered = data.filter((enrollment) => [enrollment.student.name, enrollment.student.username,
    enrollment.teacher.name, enrollment.teacher.username, enrollment.classLabel].join(" ")
    .toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));

  return (
    <div className="space-y-4">
      <PageTitle>Matrículas</PageTitle>
      <Card className="overflow-x-auto">
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <label className="block text-sm text-gray-700">Buscar matrículas
            <Input className="mt-1" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <OptionSelect label="Filtrar por status" value={status} options={statuses} placeholder="Todas"
            onChange={(value) => setStatus(value as EnrollmentStatus | "")} />
        </div>
        <ListState loading={loading} error={error} empty={!filtered.length} emptyMessage="Nenhuma matrícula encontrada" />
        {!loading && !error && filtered.length > 0 && <table className="w-full text-left text-sm">
          <thead><tr>{["Aluno", "Professor", "Turma / instrumento", "Status", "Mensalidade"].map((title) => (
            <th key={title} className="p-3">{title}</th>
          ))}</tr></thead>
          <tbody>{filtered.map((enrollment) => <EnrollmentRow key={enrollment.id} enrollment={enrollment} onSaved={reload} />)}</tbody>
        </table>}
      </Card>
      <EnrollmentForm onSaved={reload} />
    </div>
  );
}

function EnrollmentRow({ enrollment, onSaved }: { enrollment: EnrollmentDto; onSaved: () => Promise<void> }) {
  const [fee, setFee] = useState(enrollment.monthlyFee?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const changeStatus = async (next: EnrollmentStatus) => {
    if (next === enrollment.status) return;
    if (next === "CLOSED" && !window.confirm(`Encerrar a matrícula de ${enrollment.student.name}?`)) return;
    setSaving(true);
    try {
      await adminService.setEnrollmentStatus(enrollment.id, next);
      toast.success("Status da matrícula atualizado");
      await onSaved();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao alterar status da matrícula"));
    } finally {
      setSaving(false);
    }
  };
  const saveFee = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = parseFee(fee);
    if (value === undefined) return;
    setSaving(true);
    try {
      await adminService.setEnrollmentFee(enrollment.id, value);
      toast.success("Mensalidade atualizada");
      await onSaved();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao alterar mensalidade"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="p-3">{enrollment.student.name}</td>
      <td className="p-3">{enrollment.teacher.name}</td>
      <td className="p-3">{enrollment.classLabel}</td>
      <td className="p-3">
        <OptionSelect label={`Status de ${enrollment.student.name}`} value={enrollment.status}
          options={statuses} disabled={saving} onChange={(value) => { if (value) void changeStatus(value as EnrollmentStatus); }} />
      </td>
      <td className="space-y-2 p-3">
        <p>{enrollment.monthlyFee === null ? "Não definida" : brl.format(enrollment.monthlyFee)}</p>
        <form onSubmit={saveFee} className="space-y-2">
          <label className="block text-sm text-gray-700">Mensalidade de {enrollment.student.name}
            <Input className="mt-1 min-w-36" type="number" min="0" max="99999999.99" step="0.01" value={fee}
              disabled={saving} onChange={(event) => setFee(event.target.value)} />
          </label>
          <Button type="submit" variant="ghost" disabled={saving} aria-label={`Salvar mensalidade de ${enrollment.student.name}`}>
            Salvar mensalidade
          </Button>
        </form>
      </td>
    </tr>
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
  const create = async () => {
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

  return (
    <Card>
      <p className="mb-3 font-medium">Nova matrícula</p>
      <ListState loading={loading} error={error} empty={false} emptyMessage="" />
      {!loading && !error && <form onSubmit={(event) => { event.preventDefault(); void create(); }}>
        <fieldset disabled={saving} className="space-y-3">
        <OptionSelect label="Aluno" value={enrollment.studentId} options={data.students.map(personOption)}
          onChange={(studentId) => setEnrollment({ ...enrollment, studentId })} />
        <OptionSelect label="Professor" value={enrollment.teacherId} options={data.teachers.map(personOption)} onChange={pickTeacher} />
        <OptionSelect label="Instrumento" value={enrollment.instrumentId}
          options={(teacher?.instruments ?? []).map((item) => ({ id: item.id, label: item.name }))}
          onChange={(instrumentId) => setEnrollment({ ...enrollment, instrumentId })}
          placeholder={!teacher ? "Selecione o professor primeiro" : !teacher.instruments.length ? "Professor sem instrumentos" : "Selecione…"} />
        <label className="block text-sm text-gray-700">Mensalidade (opcional)
          <Input className="mt-1" type="number" min="0" max="99999999.99" step="0.01" value={fee}
            onChange={(event) => setFee(event.target.value)} />
        </label>
        <Button type="submit" disabled={saving}>Criar matrícula</Button>
        </fieldset>
      </form>}
    </Card>
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
