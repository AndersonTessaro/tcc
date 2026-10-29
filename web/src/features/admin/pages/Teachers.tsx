import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Card, Drawer, Input, PageHeader, Table, Toolbar, cell } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { InstrumentOption, NewUser, TeacherOption } from "../adminService";
import { InstrumentChecklist } from "../components/InstrumentChecklist";
import { UserForm } from "../components/UserForm";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";
import { useCreateDrawer } from "../hooks/useCreateDrawer";
import { matches } from "../format";

const COLUMNS = [
  { label: "Nome" }, { label: "Usuário" }, { label: "Instrumentos" },
  { label: "Alunos ativos", align: "right" as const }, { label: "Ações", align: "right" as const },
];

const loadTeachers = async () => {
  const [teachers, instruments, enrollments] = await Promise.all([
    adminService.teachers(), adminService.instruments(), adminService.enrollments("ACTIVE"),
  ]);
  return { teachers, instruments, enrollments };
};

export default function Teachers() {
  const { data, loading, error, reload } = useAdminList(loadTeachers,
    { teachers: [], instruments: [], enrollments: [] }, "Erro ao carregar professores e instrumentos");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<TeacherOption | null>(null);
  const creating = useCreateDrawer();
  const filtered = data.teachers.filter((teacher) => matches(`${teacher.name} ${teacher.username}`, search));
  const activeStudents = (teacherId: string) =>
    new Set(data.enrollments.filter((enrollment) => enrollment.teacher.id === teacherId).map((e) => e.student.id)).size;
  const create = async (user: NewUser, instrumentIds: string[]) => {
    await adminService.createTeacher({ ...user, instrumentIds });
    await reload();
  };
  const newButton = <Button onClick={creating.show}>Novo professor</Button>;

  return (
    <>
      <PageHeader title="Professores" count={loading ? undefined : `${data.teachers.length}`}
        description="Só é possível matricular um aluno em um instrumento que o professor ensina." actions={newButton} />
      <Card>
        <Toolbar>
          <Input type="search" aria-label="Buscar professores" placeholder="Buscar por nome ou usuário" autoComplete="off"
            spellCheck={false} className="max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} />
        </Toolbar>
        <ListState loading={loading} error={error} empty={!filtered.length} emptyMessage="Nenhum professor encontrado"
          emptyAction={!search ? newButton : undefined} />
        {!loading && !error && filtered.length > 0 && (
          <Table columns={COLUMNS}>
            {filtered.map((teacher) => (
              <tr key={teacher.id} className="hover:bg-canvas/60">
                <td className={`${cell} font-semibold text-ink`}>{teacher.name}</td>
                <td className={`${cell} text-ink-muted`}>{teacher.username}</td>
                <td className={cell}>
                  {teacher.instruments.length
                    ? <div className="flex flex-wrap gap-1">{teacher.instruments.map((i) => <Badge key={i.id} tone="brand">{i.name}</Badge>)}</div>
                    : <Badge tone="warning">Sem instrumentos</Badge>}
                </td>
                <td className={`${cell} tabular text-right`}>{activeStudents(teacher.id)}</td>
                <td className={`${cell} text-right`}>
                  <Button variant="secondary" size="sm" aria-label={`Editar instrumentos de ${teacher.name}`}
                    onClick={() => setEditing(teacher)}>Instrumentos</Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Drawer open={editing !== null} title={`Instrumentos de ${editing?.name ?? ""}`}
        description="Marque o que este professor ensina." onClose={() => setEditing(null)}>
        {editing && <TeacherInstruments key={editing.id} teacher={editing} instruments={data.instruments}
          onSaved={async () => { setEditing(null); await reload(); }} />}
      </Drawer>

      <Drawer open={creating.open} title="Novo professor" description="O professor entra no app com o usuário e a senha definidos aqui."
        onClose={creating.hide}>
        <UserForm label="Professor" instruments={data.instruments} onSubmit={create} onDone={creating.hide} />
      </Drawer>
    </>
  );
}

function TeacherInstruments({ teacher, instruments, onSaved }: {
  teacher: TeacherOption;
  instruments: InstrumentOption[];
  onSaved: () => Promise<void>;
}) {
  const [selected, setSelected] = useState(() => teacher.instruments.map((instrument) => instrument.id));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await adminService.setTeacherInstruments(teacher.id, selected);
      toast.success("Instrumentos do professor atualizados");
      await onSaved();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao salvar instrumentos"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <fieldset disabled={saving} className="space-y-5">
      <InstrumentChecklist instruments={instruments} selected={selected} onChange={setSelected} />
      <Button className="w-full" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar instrumentos"}</Button>
    </fieldset>
  );
}
