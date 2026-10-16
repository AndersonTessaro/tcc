import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { RoleDto } from "../adminService";
import { accessProfileLabel } from "../accessProfile";
import { Button, Card, Input, PageTitle } from "@/components/ui";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";

const loadRoles = async () => {
  const [roles, perms] = await Promise.all([adminService.roles(), adminService.permissions()]);
  return { roles, perms };
};

export default function Roles() {
  const { data: { roles, perms }, loading, error, reload: load } = useAdminList(loadRoles,
    { roles: [], perms: [] }, "Erro ao carregar perfis de acesso");
  const [open, setOpen] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !description.trim()) return;
    setSaving(true);
    try {
      await adminService.createRole(name.trim(), description.trim());
      toast.success("Perfil de acesso criado");
      setName("");
      setDescription("");
      await load();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao criar perfil de acesso"));
    } finally {
      setSaving(false);
    }
  };

  const togglePerm = async (role: RoleDto, permId: number) => {
    const current = new Set(role.permissions.map((p) => p.id));
    if (current.has(permId)) current.delete(permId);
    else current.add(permId);
    try {
      await adminService.setPermissions(role.id, [...current]);
      toast.success("Permissões atualizadas");
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao atualizar permissões"));
    }
  };

  return (
    <div>
      <PageTitle>Perfis de acesso</PageTitle>
      <Card className="mb-4">
        <p className="mb-3 font-medium">Novo perfil</p>
        <form onSubmit={create} className="space-y-3">
          <label className="block text-sm text-gray-700">Nome do perfil
            <Input className="mt-1" required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block text-sm text-gray-700">Descrição
            <Input className="mt-1" required maxLength={255} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <Button type="submit" disabled={saving}>Criar perfil</Button>
        </form>
      </Card>
      <ListState loading={loading} error={error} empty={!roles.length} emptyMessage="Nenhum perfil encontrado" />
      {!loading && !error && (
      <div className="space-y-3">
        {roles.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{accessProfileLabel(r.name)}</p>
                <p className="text-sm text-gray-500">{r.description}</p>
              </div>
              <Button variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>
                {open === r.id ? "Fechar" : `Permissões (${r.permissions.length})`}
              </Button>
            </div>
            {open === r.id && (
              <div className="mt-4 grid grid-cols-1 gap-1 border-t border-gray-100 pt-4 md:grid-cols-2">
                {!perms.length && <p className="text-sm text-gray-500">Nenhuma permissão encontrada</p>}
                {perms.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={r.permissions.some((x) => x.id === p.id)}
                      onChange={() => togglePerm(r, p.id)}
                    />
                    <span className="font-mono">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}
