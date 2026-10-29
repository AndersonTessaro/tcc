import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { UserDto } from "../adminService";
import { accessProfileLabel } from "../accessProfile";
import { Button, Card, Input, PageTitle } from "@/components/ui";
import { ListState } from "../components/ListState";
import { OptionSelect } from "../components/OptionSelect";
import { useAdminList } from "../hooks/useAdminList";

const loadUsers = async () => {
  const [users, roles] = await Promise.all([adminService.users(), adminService.roles()]);
  return { users, roles };
};

export default function Users() {
  const { data: { users, roles }, loading, error, reload: load } = useAdminList(loadUsers,
    { users: [], roles: [] }, "Erro ao carregar usuários");
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const filtered = users.filter((user) => (!roleId || user.roles.some((role) => role.id.toString() === roleId))
    && `${user.displayName ?? ""} ${user.username} ${user.email}`.toLocaleLowerCase("pt-BR")
      .includes(search.trim().toLocaleLowerCase("pt-BR")));

  const toggleStatus = async (u: UserDto) => {
    try {
      await adminService.setStatus(u.id, !u.active);
      toast.success(`${u.username} ${!u.active ? "ativado" : "desativado"}`);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao alterar status"));
    }
  };

  const openPasswordForm = (u: UserDto) => {
    setNewPassword("");
    setPasswordFor(passwordFor === u.id ? null : u.id);
  };

  const resetPassword = async (event: FormEvent, u: UserDto) => {
    event.preventDefault();
    setBusyId(u.id);
    try {
      await adminService.resetPassword(u.id, newPassword);
      toast.success(`Senha de ${u.username} redefinida`);
      setPasswordFor(null);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao redefinir senha"));
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (u: UserDto) => {
    const confirmed = window.confirm(`Excluir ${u.username} definitivamente? Matrículas, aulas, práticas, metas e `
      + "materiais ligados a este usuário também serão apagados. Esta ação não pode ser desfeita.");
    if (!confirmed) return;
    setBusyId(u.id);
    try {
      await adminService.deleteUser(u.id);
      toast.success(`${u.username} excluído`);
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao excluir usuário"));
    } finally {
      setBusyId(null);
    }
  };

  const toggleRole = async (u: UserDto, roleId: number) => {
    const current = new Set(u.roles.map((r) => r.id));
    if (current.has(roleId)) current.delete(roleId);
    else current.add(roleId);
    try {
      await adminService.setRoles(u.id, [...current]);
      toast.success("Perfis de acesso atualizados");
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao atualizar perfis de acesso"));
    }
  };

  return (
    <div>
      <PageTitle>Usuários</PageTitle>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-gray-700">Buscar usuários
          <Input className="mt-1" type="search" autoComplete="off" spellCheck={false} value={search}
            onChange={(event) => setSearch(event.target.value)} />
        </label>
        <OptionSelect label="Filtrar por perfil" value={roleId} placeholder="Todos"
          options={roles.map((role) => ({ id: role.id.toString(), label: accessProfileLabel(role.name) }))} onChange={setRoleId} />
      </div>
      <ListState loading={loading} error={error} empty={!filtered.length} emptyMessage="Nenhum usuário encontrado" />
      {!loading && !error && filtered.length > 0 && (
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Usuário</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Status</th>
              <th className="p-3">Perfis de acesso</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 align-top">
                <td className="p-3">{u.displayName || "—"}</td>
                <td className="p-3 font-medium">{u.username}</td>
                <td className="p-3 text-gray-600">{u.email}</td>
                <td className="p-3">
                  <span className={u.active ? "text-accent" : "text-red-500"}>
                    {u.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="p-3">
                  {editing === u.id ? (
                    <div className="space-y-1">
                      {roles.map((r) => (
                        <label key={r.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={u.roles.some((x) => x.id === r.id)}
                            onChange={() => toggleRole(u, r.id)}
                          />
                          {accessProfileLabel(r.name)}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-600">
                      {u.roles.map((r) => accessProfileLabel(r.name)).join(", ") || "—"}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" disabled={busyId === u.id}
                      aria-label={`${editing === u.id ? "Fechar perfis de" : "Perfis de"} ${u.username}`}
                      onClick={() => setEditing(editing === u.id ? null : u.id)}>
                      {editing === u.id ? "Fechar" : "Perfis"}
                    </Button>
                    <Button variant="ghost" disabled={busyId === u.id}
                      aria-label={`${u.active ? "Desativar" : "Ativar"} ${u.username}`} onClick={() => toggleStatus(u)}>
                      {u.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button variant="ghost" disabled={busyId === u.id} aria-expanded={passwordFor === u.id}
                      aria-label={`Redefinir senha de ${u.username}`} onClick={() => openPasswordForm(u)}>
                      Senha
                    </Button>
                    <Button variant="danger" disabled={busyId === u.id}
                      aria-label={`Excluir ${u.username}`} onClick={() => deleteUser(u)}>
                      {busyId === u.id ? "Aguarde…" : "Excluir"}
                    </Button>
                  </div>
                  {passwordFor === u.id && (
                    <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(event) => resetPassword(event, u)}>
                      <label className="block text-xs text-gray-600">Nova senha para {u.username}
                        <Input className="mt-1" type="password" autoComplete="new-password" minLength={8} required
                          autoFocus value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                      </label>
                      <Button type="submit" disabled={busyId === u.id}>Salvar senha</Button>
                      <Button type="button" variant="ghost" onClick={() => setPasswordFor(null)}>Cancelar</Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      )}
    </div>
  );
}
