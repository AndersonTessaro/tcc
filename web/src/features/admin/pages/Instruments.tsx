import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { InstrumentOption } from "../adminService";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";
import { useAdminAccess } from "../useAdminAccess";

const loadInstruments = async () => {
  const [instruments, teachers] = await Promise.all([adminService.instruments(), adminService.teachers()]);
  return { instruments, teachers };
};

export default function Instruments() {
  const { isAdmin } = useAdminAccess();
  const { data, loading, error, reload } = useAdminList(loadInstruments, { instruments: [], teachers: [] },
    "Erro ao carregar instrumentos");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const deleteInstrument = async (instrument: InstrumentOption) => {
    if (!window.confirm(`Excluir o instrumento ${instrument.name}?`)) return;
    setDeleting(true);
    try {
      await adminService.deleteInstrument(instrument.id);
      toast.success("Instrumento excluído.");
      await reload();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao excluir instrumento"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader title="Instrumentos" count={loading ? undefined : `${data.instruments.length}`}
        description="O que a escola ensina. Depois de adicionar, marque quais professores ensinam cada um." />
      <Card>
        {isAdmin && <form onSubmit={create} className="flex flex-wrap gap-2 border-b border-line p-4">
          <Input aria-label="Nome do instrumento" placeholder="Nome do instrumento" required maxLength={80}
            className="max-w-xs" value={name} onChange={(event) => setName(event.target.value)} />
          <Button type="submit" disabled={saving}>Criar instrumento</Button>
        </form>}
        <ListState loading={loading} error={error} empty={!data.instruments.length}
          emptyMessage="Nenhum instrumento encontrado" />
        {!loading && !error && data.instruments.length > 0 && (
          <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
            {data.instruments.map((instrument) => {
              const count = teachersOf(instrument.id);
              return (
                <li key={instrument.id} className="flex items-center justify-between bg-white px-4 py-3">
                  <span className="font-semibold text-ink">{instrument.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${count ? "text-ink-faint" : "text-warning"}`}>
                      {count === 0 ? "Nenhum professor" : count === 1 ? "1 professor" : `${count} professores`}
                    </span>
                    {isAdmin && <Button variant="danger" size="sm" disabled={deleting}
                      aria-label={`Excluir instrumento ${instrument.name}`} onClick={() => void deleteInstrument(instrument)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
                      </svg>
                    </Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
