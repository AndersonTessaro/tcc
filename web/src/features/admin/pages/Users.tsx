import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { RoleDto, UserDto } from "../adminService";
import { accessProfileLabel } from "../accessProfile";
import { Badge, Button, Card, Drawer, Field, Input, PageHeader, Table, Toolbar, cell } from "@/components/ui";
import { ListState } from "../components/ListState";
import { OptionSelect } from "../components/OptionSelect";
import { useAdminList } from "../hooks/useAdminList";
import { matches } from "../format";

const COLUMNS = [
  { label: "Nome" }, { label: "Usuário" }, { label: "Perfis" }, { label: "Situação" }, { label: "Ações", align: "right" as const },
];

const loadUsers = async () => {
  const [users, roles] = await Promise.all([adminService.users(), adminService.roles()]);
  return { users, roles };
};

export default function Users() {
  const { data: { users, roles }, loading, error, reload } = useAdminList(loadUsers,
    { users: [], roles: [] }, "Erro ao carregar usuários");
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState("");
  const [managingId, setManagingId] = useState<string | null>(null);
  const managing = users.find((user) => user.id === managingId) ?? null;
  const filtered = users.filter((user) => (!roleId || user.roles.some((role) => role.id.toString() === roleId))
    && matches(`${user.displayName ?? ""} ${user.username} ${user.email}`, search));

  return (
    <>
      <PageHeader title="Usuários" count={loading ? undefined : `${users.length}`}
        description="Todas as contas que entram no app ou neste painel. Alunos e professores são cadastrados nas páginas próprias." />
      <Card>
        <Toolbar>
          <Input type="search" aria-label="Buscar usuários" placeholder="Buscar por nome, usuário ou e-mail"
            autoComplete="off" spellCheck={false} className="max-w-sm" value={search}
            onChange={(event) => setSearch(event.target.value)} />
          <div className="w-48">
            <OptionSelect label="Filtrar por perfil" value={roleId} placeholder="Todos"
              options={roles.map((role) => ({ id: role.id.toString(), label: accessProfileLabel(role.name) }))} onChange={setRoleId} />
          </div>
        </Toolbar>
        <ListState loading={loading} error={error} empty={!filtered.length} emptyMessage="Nenhum usuário encontrado" />
        {!loading && !error && filtered.length > 0 && (
          <Table columns={COLUMNS}>
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-canvas/60">
                <td className={cell}>
                  <p className="font-semibold text-ink">{u.displayName || "Sem nome"}</p>
                  <p className="text-xs text-ink-faint">{u.email}</p>
                </td>
                <td className={`${cell} text-ink-muted`}>{u.username}</td>
                <td className={cell}>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length
                      ? u.roles.map((r) => <Badge key={r.id} tone="brand">{accessProfileLabel(r.name)}</Badge>)
                      : <Badge tone="warning">Sem perfil</Badge>}
                  </div>
                </td>
                <td className={cell}><Badge tone={u.active ? "success" : "danger"}>{u.active ? "Ativo" : "Inativo"}</Badge></td>
                <td className={`${cell} text-right`}>
                  <Button variant="secondary" size="sm" aria-label={`Gerenciar ${u.username}`}
                    onClick={() => setManagingId(u.id)}>Gerenciar</Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Drawer open={managing !== null} title={managing?.displayName || managing?.username || ""}
        description={managing ? `${managing.username}, ${managing.email}` : undefined} onClose={() => setManagingId(null)}>
        {managing && <UserManager key={managing.id} user={managing} roles={roles} onChanged={reload}
          onDeleted={async () => { setManagingId(null); await reload(); }} />}
      </Drawer>
    </>
  );
}

function UserManager({ user, roles, onChanged, onDeleted }: {
  user: UserDto;
  roles: RoleDto[];
  onChanged: () => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const run = async (action: () => Promise<unknown>, success: string, failure: string, after = onChanged) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await after();
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error, failure));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = (roleId: number) => {
    const current = new Set(user.roles.map((r) => r.id));
    if (current.has(roleId)) current.delete(roleId);
    else current.add(roleId);
    void run(() => adminService.setRoles(user.id, [...current]), "Perfis de acesso atualizados", "Erro ao atualizar perfis de acesso");
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    const saved = await run(() => adminService.resetPassword(user.id, newPassword),
      `Senha de ${user.username} redefinida`, "Erro ao redefinir senha", async () => {});
    if (saved) setNewPassword("");
  };

  const deleteUser = () => {
    const confirmed = window.confirm(`Excluir ${user.username} definitivamente? Matrículas, aulas, práticas, metas e `
      + "materiais ligados a este usuário também serão apagados. Esta ação não pode ser desfeita.");
    if (confirmed) void run(() => adminService.deleteUser(user.id), `${user.username} excluído`, "Erro ao excluir usuário", onDeleted);
  };

  return (
    <fieldset disabled={busy} className="space-y-8">
      <section>
        <h3 className="mb-2 text-sm font-bold text-ink">Perfis de acesso</h3>
        <div className="space-y-1">
          {roles.map((r) => (
            <label key={r.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-canvas">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={user.roles.some((x) => x.id === r.id)}
                onChange={() => toggleRole(r.id)} />
              <span>
                <span className="block text-sm font-semibold text-ink">{accessProfileLabel(r.name)}</span>
                <span className="block text-xs text-ink-muted">{r.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-bold text-ink">Situação</h3>
        <p className="mb-3 text-sm text-ink-muted">
          {user.active ? "A conta está ativa e pode entrar." : "A conta está desativada e não consegue entrar."}
        </p>
        <Button variant="secondary" aria-label={`${user.active ? "Desativar" : "Ativar"} ${user.username}`}
          onClick={() => void run(() => adminService.setStatus(user.id, !user.active),
            `${user.username} ${user.active ? "desativado" : "ativado"}`, "Erro ao alterar status")}>
          {user.active ? "Desativar conta" : "Ativar conta"}
        </Button>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold text-ink">Redefinir senha</h3>
        <form onSubmit={resetPassword} className="space-y-3">
          <Field label={`Nova senha para ${user.username}`} hint="Pelo menos 8 caracteres. As sessões abertas da conta são encerradas.">
            <Input type="password" autoComplete="new-password" minLength={8} required value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)} />
          </Field>
          <Button type="submit" variant="secondary">Salvar senha</Button>
        </form>
      </section>

      <section className="rounded-xl border border-danger/30 p-4">
        <h3 className="mb-1 text-sm font-bold text-danger">Excluir usuário</h3>
        <p className="mb-3 text-sm text-ink-muted">Apaga a conta e tudo ligado a ela. Não dá para desfazer.</p>
        <Button variant="danger" aria-label={`Excluir ${user.username}`} onClick={deleteUser}>Excluir definitivamente</Button>
      </section>
    </fieldset>
  );
}
