import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input, PageTitle } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { InstrumentOption, NewUser, TeacherOption } from "../adminService";
import { InstrumentChecklist } from "../components/InstrumentChecklist";
import { UserForm } from "../components/UserForm";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";

const loadTeachers = async () => {
  const [teachers, instruments] = await Promise.all([adminService.teachers(), adminService.instruments()]);
  return { teachers, instruments };
};

export default function Teachers() {
  const { data, loading, error, reload } = useAdminList(loadTeachers,
    { teachers: [], instruments: [] }, "Erro ao carregar professores e instrumentos");
  const [search, setSearch] = useState("");
  const filtered = data.teachers.filter((teacher) => `${teacher.name} ${teacher.username}`.toLocaleLowerCase("pt-BR")
    .includes(search.trim().toLocaleLowerCase("pt-BR")));
  const create = async (user: NewUser, instrumentIds: string[]) => {
    await adminService.createTeacher({ ...user, instrumentIds });
    await reload();
  };

  return (
    <div className="space-y-4">
      <PageTitle>Professores</PageTitle>
      <Card className="overflow-x-auto">
        <label className="block text-sm text-gray-700">Buscar professores
          <Input className="mt-1" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <ListState loading={loading} error={error} empty={!filtered.length} emptyMessage="Nenhum professor encontrado" />
        {!loading && !error && filtered.length > 0 && (
          <table className="mt-4 w-full text-left text-sm">
            <thead><tr><th className="p-3">Nome</th><th className="p-3">Usuário</th><th className="p-3">Instrumentos</th></tr></thead>
            <tbody>{filtered.map((teacher) => <TeacherRow key={teacher.id} teacher={teacher}
              instruments={data.instruments} onSaved={reload} />)}</tbody>
          </table>
        )}
      </Card>
      {!loading && !error && <UserForm label="Professor" instruments={data.instruments} onSubmit={create} />}
    </div>
  );
}

function TeacherRow({ teacher, instruments, onSaved }: {
  teacher: TeacherOption;
  instruments: InstrumentOption[];
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await adminService.setTeacherInstruments(teacher.id, selected);
      toast.success("Instrumentos do professor atualizados");
      setEditing(false);
      await onSaved();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao salvar instrumentos"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="p-3">{teacher.name}</td><td className="p-3">{teacher.username}</td>
      <td className="space-y-2 p-3">
        {editing ? <fieldset disabled={saving}>
          <InstrumentChecklist instruments={instruments} selected={selected} onChange={setSelected} />
          <div className="mt-2 flex gap-2">
            <Button onClick={save} disabled={saving}>Salvar instrumentos</Button>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
          </div>
        </fieldset> : <>
          <p>{teacher.instruments.map((instrument) => instrument.name).join(", ") || "Sem instrumentos"}</p>
          <Button variant="ghost" onClick={() => {
            setSelected(teacher.instruments.map((instrument) => instrument.id));
            setEditing(true);
          }}>Editar instrumentos</Button>
        </>}
      </td>
    </tr>
  );
}
