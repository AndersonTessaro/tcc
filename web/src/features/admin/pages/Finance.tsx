import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { TransactionType } from "../adminService";
import { Badge, Button, Card, Drawer, Field, Input, PageHeader, Segmented, Select, Table, Toolbar, cell } from "@/components/ui";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";
import { useCreateDrawer } from "../hooks/useCreateDrawer";
import { brl, formatDate } from "../format";

type TypeFilter = TransactionType | "";

const FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "", label: "Todos" }, { id: "INCOME", label: "Receitas" }, { id: "EXPENSE", label: "Despesas" },
];
const COLUMNS = [{ label: "Data" }, { label: "Descrição" }, { label: "Tipo" }, { label: "Valor", align: "right" as const }];
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const loadFinance = async () => {
  const [items, balance] = await Promise.all([adminService.transactions(), adminService.balance()]);
  return { items, balance: balance.balance };
};

export default function Finance() {
  const { data: { items, balance }, loading, error, reload } = useAdminList(loadFinance,
    { items: [], balance: 0 }, "Erro ao carregar financeiro");
  const [filter, setFilter] = useState<TypeFilter>("");
  const creating = useCreateDrawer();
  const total = (type: TransactionType) => items.filter((t) => t.type === type).reduce((sum, t) => sum + Number(t.amount), 0);
  const visible = items.filter((t) => !filter || t.type === filter);
  const newButton = <Button onClick={creating.show}>Novo lançamento</Button>;

  return (
    <>
      <PageHeader title="Financeiro" description="Receitas e despesas da escola, lançadas manualmente." actions={newButton} />
      {!loading && !error && (
        <dl className="mb-6 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          <Summary label="Saldo" value={balance} tone={balance >= 0 ? "text-ink" : "text-danger"} emphasis />
          <Summary label="Receitas" value={total("INCOME")} tone="text-success" />
          <Summary label="Despesas" value={total("EXPENSE")} tone="text-danger" />
        </dl>
      )}
      <Card>
        <Toolbar>
          <Segmented label="Filtrar por tipo" value={filter} options={FILTERS} onChange={setFilter} />
        </Toolbar>
        <ListState loading={loading} error={error} empty={!visible.length} emptyMessage="Nenhum lançamento encontrado"
          emptyAction={!filter ? newButton : undefined} />
        {!loading && !error && visible.length > 0 && (
          <Table columns={COLUMNS}>
            {visible.map((t) => (
              <tr key={t.id} className="hover:bg-canvas/60">
                <td className={`${cell} tabular whitespace-nowrap text-ink-muted`}>{formatDate(t.date)}</td>
                <td className={cell}>
                  <p className="text-ink">{t.description ?? "Sem descrição"}</p>
                  {t.category && <p className="text-xs text-ink-faint">{t.category}</p>}
                </td>
                <td className={cell}>
                  <Badge tone={t.type === "INCOME" ? "success" : "danger"}>{t.type === "INCOME" ? "Receita" : "Despesa"}</Badge>
                </td>
                <td className={`${cell} tabular whitespace-nowrap text-right font-semibold ${t.type === "INCOME" ? "text-success" : "text-danger"}`}>
                  {t.type === "INCOME" ? "+" : "−"} {brl.format(Number(t.amount))}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Drawer open={creating.open} title="Novo lançamento" onClose={creating.hide}>
        <TransactionForm onSaved={async () => { creating.hide(); await reload(); }} />
      </Drawer>
    </>
  );
}

function Summary({ label, value, tone, emphasis = false }: { label: string; value: number; tone: string; emphasis?: boolean }) {
  return (
    <div className="bg-white px-5 py-4">
      <dt className="text-sm font-medium text-ink-muted">{label}</dt>
      <dd className={`tabular mt-1 font-extrabold tracking-tight ${emphasis ? "text-3xl" : "text-xl"} ${tone}`}>{brl.format(value)}</dd>
    </div>
  );
}

function TransactionForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [type, setType] = useState<TransactionType>("INCOME");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    setSaving(true);
    try {
      await adminService.createTransaction({ type, amount: value, description: description || undefined,
        category: category || undefined, date });
      toast.success("Lançamento registrado");
      await onSaved();
    } catch (cause) {
      toast.error(apiErrorMessage(cause, "Erro ao lançar"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={create}>
      <fieldset disabled={saving} className="space-y-4">
        <Field label="Tipo">
          <Select value={type} onChange={(event) => setType(event.target.value as TransactionType)}>
            <option value="INCOME">Receita</option>
            <option value="EXPENSE">Despesa</option>
          </Select>
        </Field>
        <Field label="Valor">
          <Input type="number" inputMode="decimal" min="0.01" step="0.01" required className="tabular" value={amount}
            onChange={(event) => setAmount(event.target.value)} />
        </Field>
        <Field label="Descrição">
          <Input value={description} placeholder="Ex.: mensalidade de outubro" onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <Field label="Categoria">
          <Input value={category} placeholder="Ex.: aulas, materiais, aluguel" onChange={(event) => setCategory(event.target.value)} />
        </Field>
        <Field label="Data">
          <Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvando…" : "Lançar"}</Button>
      </fieldset>
    </form>
  );
}
