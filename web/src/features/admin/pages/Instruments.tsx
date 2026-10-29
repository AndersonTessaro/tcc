import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";

const loadInstruments = async () => {
  const [instruments, teachers] = await Promise.all([adminService.instruments(), adminService.teachers()]);
  return { instruments, teachers };
};

export default function Instruments() {
  const { data, loading, error, reload } = useAdminList(loadInstruments, { instruments: [], teachers: [] },
    "Erro ao carregar instrumentos");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const teachersOf = (instrumentId: string) =>
    data.teachers.filter((teacher) => teacher.instruments.some((instrument) => instrument.id === instrumentId)).length;
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await adminService.createInstrument(name.trim());
      toast.success(`${name.trim()} adicionado`);
      setName("");
      await reload();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao criar instrumento"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Instrumentos" count={loading ? undefined : `${data.instruments.length}`}
        description="O que a escola ensina. Depois de adicionar, marque quais professores ensinam cada um." />
      <Card>
        <form onSubmit={create} className="flex flex-wrap gap-2 border-b border-line p-4">
          <Input aria-label="Nome do instrumento" placeholder="Nome do instrumento" required maxLength={80}
            className="max-w-xs" value={name} onChange={(event) => setName(event.target.value)} />
          <Button type="submit" disabled={saving}>Criar instrumento</Button>
        </form>
        <ListState loading={loading} error={error} empty={!data.instruments.length}
          emptyMessage="Nenhum instrumento encontrado" />
        {!loading && !error && data.instruments.length > 0 && (
          <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {data.instruments.map((instrument) => {
              const count = teachersOf(instrument.id);
              return (
                <li key={instrument.id} className="flex items-center justify-between bg-white px-4 py-3">
                  <span className="font-semibold text-ink">{instrument.name}</span>
                  <span className={`text-xs font-medium ${count ? "text-ink-faint" : "text-warning"}`}>
                    {count === 0 ? "Nenhum professor" : count === 1 ? "1 professor" : `${count} professores`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
