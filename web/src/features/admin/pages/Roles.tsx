import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminService } from "../adminService";
import type { Permission, RoleDto } from "../adminService";
import { Button, Card, Input, PageTitle } from "@/components/ui";

export default function Roles() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([adminService.roles(), adminService.permissions()])
      .then(([r, p]) => {
        setRoles(r);
        setPerms(p);
      })
      .catch(() => toast.error("Erro ao carregar roles"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async () => {
    if (!newName.trim() || !newDesc.trim()) return;
    try {
      await adminService.createRole(newName.trim(), newDesc.trim());
      toast.success("Role criada");
      setNewName("");
      setNewDesc("");
      load();
    } catch {
      toast.error("Erro ao criar role");
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
    } catch {
      toast.error("Erro ao atualizar permissões");
    }
  };

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <PageTitle>Roles</PageTitle>

      <Card className="mb-6">
        <p className="mb-3 font-medium">Nova role</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-[180px]" placeholder="NOME" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input className="max-w-xs" placeholder="Descrição" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <Button onClick={create}>Criar</Button>
        </div>
      </Card>

      <div className="space-y-3">
        {roles.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-gray-500">{r.description}</p>
              </div>
              <Button variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>
                {open === r.id ? "Fechar" : `Permissões (${r.permissions.length})`}
              </Button>
            </div>
            {open === r.id && (
              <div className="mt-4 grid grid-cols-1 gap-1 border-t border-gray-100 pt-4 md:grid-cols-2">
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
    </div>
  );
}
