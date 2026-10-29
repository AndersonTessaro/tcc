import { useState } from "react";
import { Badge, Button, Card, Drawer, Input, PageHeader, Table, Toolbar, cell } from "@/components/ui";
import { adminService } from "../adminService";
import type { NewUser } from "../adminService";
import { UserForm } from "../components/UserForm";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";
import { useCreateDrawer } from "../hooks/useCreateDrawer";
import { matches } from "../format";

const COLUMNS = [{ label: "Nome" }, { label: "Usuário" }, { label: "Estuda" }];

const loadStudents = async () => {
  const [students, enrollments] = await Promise.all([adminService.students(), adminService.enrollments("ACTIVE")]);
  return { students, enrollments };
};

export default function Students() {
  const { data, loading, error, reload } = useAdminList(loadStudents, { students: [], enrollments: [] },
    "Erro ao carregar alunos");
  const [search, setSearch] = useState("");
  const creating = useCreateDrawer();
  const filtered = data.students.filter((student) => matches(`${student.name} ${student.username}`, search));
  const studying = (studentId: string) => data.enrollments.filter((enrollment) => enrollment.student.id === studentId)
    .map((enrollment) => enrollment.classLabel);
  const create = async (user: NewUser) => {
    await adminService.createStudent(user);
    await reload();
  };
  const newButton = <Button onClick={creating.show}>Novo aluno</Button>;

  return (
    <>
      <PageHeader title="Alunos" count={loading ? undefined : `${data.students.length}`}
        description="Cadastro de alunos. Para vincular a um professor, crie uma matrícula." actions={newButton} />
      <Card>
        <Toolbar>
          <Input type="search" aria-label="Buscar alunos" placeholder="Buscar por nome ou usuário" autoComplete="off"
            spellCheck={false} className="max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} />
        </Toolbar>
        <ListState loading={loading} error={error} empty={!filtered.length} emptyMessage="Nenhum aluno encontrado"
          emptyAction={!search ? newButton : undefined} />
        {!loading && !error && filtered.length > 0 && (
          <Table columns={COLUMNS}>
            {filtered.map((student) => {
              const classes = studying(student.id);
              return (
                <tr key={student.id} className="hover:bg-canvas/60">
                  <td className={`${cell} font-semibold text-ink`}>{student.name}</td>
                  <td className={`${cell} text-ink-muted`}>{student.username}</td>
                  <td className={cell}>
                    {classes.length
                      ? <div className="flex flex-wrap gap-1">{classes.map((label) => <Badge key={label} tone="brand">{label}</Badge>)}</div>
                      : <a href="/admin/enrollments?novo" className="text-sm font-semibold text-primary hover:underline">Matricular</a>}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <Drawer open={creating.open} title="Novo aluno" description="O aluno entra no app com o usuário e a senha definidos aqui."
        onClose={creating.hide}>
        <UserForm label="Aluno" onSubmit={create} onDone={creating.hide} />
      </Drawer>
    </>
  );
}
