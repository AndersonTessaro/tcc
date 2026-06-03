import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminService } from "../adminService";
import type { Permission } from "../adminService";
import { Card, PageTitle } from "@/components/ui";

export default function Permissions() {
  const [perms, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .permissions()
      .then(setPerms)
      .catch(() => toast.error("Erro ao carregar permissões"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  const groups = perms.reduce<Record<string, Permission[]>>((acc, p) => {
    const domain = p.name.split(".")[0];
    (acc[domain] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <PageTitle>Permissões</PageTitle>
      <p className="mb-6 text-sm text-gray-500">Catálogo somente leitura, agrupado por domínio.</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Object.entries(groups).map(([domain, list]) => (
          <Card key={domain}>
            <p className="mb-3 font-semibold capitalize">{domain}</p>
            <ul className="space-y-1">
              {list.map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span className="font-mono text-gray-700">{p.name}</span>
                  <span className="text-gray-400">{p.description}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
