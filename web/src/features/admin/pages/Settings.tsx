import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminService } from "../adminService";
import type { SettingDto } from "../adminService";
import { Button, Card, Input, PageTitle } from "@/components/ui";

export default function Settings() {
  const [items, setItems] = useState<SettingDto[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminService
      .settings()
      .then((s) => {
        setItems(s);
        setDrafts(Object.fromEntries(s.map((x) => [x.key, x.value])));
      })
      .catch(() => toast.error("Erro ao carregar configurações"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async (key: string, description?: string | null) => {
    try {
      await adminService.upsertSetting(key, drafts[key] ?? "", description ?? undefined);
      toast.success("Configuração salva");
      load();
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const create = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    try {
      await adminService.upsertSetting(newKey.trim(), newValue.trim(), newDesc.trim() || undefined);
      toast.success("Configuração criada");
      setNewKey("");
      setNewValue("");
      setNewDesc("");
      load();
    } catch {
      toast.error("Erro ao criar");
    }
  };

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <PageTitle>Configurações</PageTitle>

      <Card className="mb-6">
        <p className="mb-3 font-medium">Nova configuração</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-[200px]" placeholder="chave (ex: school.name)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
          <Input className="max-w-[200px]" placeholder="valor" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          <Input className="max-w-xs" placeholder="descrição (opcional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          <Button onClick={create}>Criar</Button>
        </div>
      </Card>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma configuração ainda.</p>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[180px]">
                  <p className="font-mono text-sm font-semibold">{s.key}</p>
                  {s.description ? <p className="text-xs text-gray-500">{s.description}</p> : null}
                </div>
                <Input
                  className="max-w-xs"
                  value={drafts[s.key] ?? ""}
                  onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
                />
                <Button variant="ghost" onClick={() => save(s.key, s.description)}>
                  Salvar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
