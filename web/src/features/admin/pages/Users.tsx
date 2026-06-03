import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminService } from "../adminService";
import type { RoleDto, UserDto } from "../adminService";
import { Button, Card, PageTitle } from "@/components/ui";

export default function Users() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([adminService.users(), adminService.roles()])
      .then(([u, r]) => {
        setUsers(u);
        setRoles(r);
      })
      .catch(() => toast.error("Erro ao carregar usuários"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleStatus = async (u: UserDto) => {
    try {
      await adminService.setStatus(u.id, !u.active);
      toast.success(`${u.username} ${!u.active ? "ativado" : "desativado"}`);
      load();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const resetPassword = async (u: UserDto) => {
    const next = window.prompt(`Nova senha para ${u.username} (mín. 8):`);
    if (!next) return;
    try {
      await adminService.resetPassword(u.id, next);
      toast.success("Senha redefinida");
    } catch {
      toast.error("Erro ao redefinir senha (mín. 8 caracteres)");
    }
  };

  const toggleRole = async (u: UserDto, roleId: number) => {
    const current = new Set(u.roles.map((r) => r.id));
    if (current.has(roleId)) current.delete(roleId);
    else current.add(roleId);
    try {
      await adminService.setRoles(u.id, [...current]);
      toast.success("Roles atualizadas");
      load();
    } catch {
      toast.error("Erro ao atualizar roles");
    }
  };

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <PageTitle>Usuários</PageTitle>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="p-3">Usuário</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Status</th>
              <th className="p-3">Roles</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 align-top">
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
                          {r.name}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-600">{u.roles.map((r) => r.name).join(", ") || "—"}</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => setEditing(editing === u.id ? null : u.id)}>
                      {editing === u.id ? "Fechar" : "Roles"}
                    </Button>
                    <Button variant="ghost" onClick={() => toggleStatus(u)}>
                      {u.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button variant="ghost" onClick={() => resetPassword(u)}>
                      Senha
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
