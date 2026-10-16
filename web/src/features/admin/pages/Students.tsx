import { useState } from "react";
import { Card, Input, PageTitle } from "@/components/ui";
import { adminService } from "../adminService";
import type { NewUser } from "../adminService";
import { UserForm } from "../components/UserForm";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";

export default function Students() {
  const { data: students, loading, error, reload } = useAdminList(adminService.students, [], "Erro ao carregar alunos");
  const [search, setSearch] = useState("");
  const filtered = students.filter((student) => `${student.name} ${student.username}`.toLocaleLowerCase("pt-BR")
    .includes(search.trim().toLocaleLowerCase("pt-BR")));
  const create = async (user: NewUser) => {
    await adminService.createStudent(user);
    await reload();
  };

  return (
    <div className="space-y-4">
      <PageTitle>Alunos</PageTitle>
      <Card>
        <label className="block text-sm text-gray-700">Buscar alunos
          <Input className="mt-1" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <ListState loading={loading} error={error} empty={!filtered.length} emptyMessage="Nenhum aluno encontrado" />
        {!loading && !error && filtered.length > 0 && (
          <table className="mt-4 w-full text-left text-sm">
            <thead><tr><th className="p-3">Nome</th><th className="p-3">Usuário</th></tr></thead>
            <tbody>{filtered.map((student) => <tr key={student.id} className="border-t border-gray-100">
              <td className="p-3">{student.name}</td><td className="p-3">{student.username}</td>
            </tr>)}</tbody>
          </table>
        )}
      </Card>
      <UserForm label="Aluno" onSubmit={create} />
    </div>
  );
}
