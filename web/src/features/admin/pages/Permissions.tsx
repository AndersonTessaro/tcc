import { useState } from "react";
import { adminService } from "../adminService";
import { Card, Input, PageHeader } from "@/components/ui";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";
import { groupPermissions } from "../permissionGroups";
import { matches } from "../format";

export default function Permissions() {
  const { data: perms, loading, error } = useAdminList(adminService.permissions, [], "Erro ao carregar permissões");
  const [search, setSearch] = useState("");
  const visible = perms.filter((p) => matches(`${p.name} ${p.description}`, search));

  return (
    <>
      <PageHeader title="Permissões" count={loading ? undefined : `${perms.length}`}
        description="O que cada ação do sistema exige. Para dar uma permissão a alguém, inclua-a em um perfil de acesso." />
      <Input type="search" aria-label="Buscar permissões" placeholder="Buscar permissão" autoComplete="off"
        spellCheck={false} className="mb-4 max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} />
      <ListState loading={loading} error={error} empty={!visible.length} emptyMessage="Nenhuma permissão encontrada" />
      {!loading && !error && visible.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {groupPermissions(visible).map((group) => (
            <Card key={group.domain} className="p-5">
              <h2 className="mb-3 font-bold text-ink">{group.label}</h2>
              <ul className="space-y-2">
                {group.items.map((p) => (
                  <li key={p.id}>
                    <p className="text-sm text-ink">{p.description}</p>
                    <code className="text-xs text-ink-faint">{p.name}</code>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
