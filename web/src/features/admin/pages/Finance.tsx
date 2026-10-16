import { useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { TransactionType } from "../adminService";
import { Button, Card, Input, PageTitle } from "@/components/ui";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const loadFinance = async () => {
  const [items, balance] = await Promise.all([adminService.transactions(), adminService.balance()]);
  return { items, balance: balance.balance };
};

export default function Finance() {
  const { data: { items, balance }, loading, error, reload: load } = useAdminList(loadFinance,
    { items: [], balance: 0 }, "Erro ao carregar financeiro");
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
      toast.success("Lançamento criado");
      setAmount("");
      setDescription("");
      setCategory("");
      setDate(today());
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao lançar"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageTitle>Financeiro</PageTitle>

      {!loading && !error && <Card className="mb-6">
        <p className="text-sm text-gray-500">Saldo</p>
        <p className={`text-2xl font-bold ${balance >= 0 ? "text-accent" : "text-red-500"}`}>
          {brl.format(balance)}
        </p>
      </Card>}

      <Card className="mb-6">
        <p className="mb-3 font-medium">Novo lançamento</p>
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-gray-700">Tipo
          <select
            aria-label="Tipo"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
          >
            <option value="INCOME">Receita</option>
            <option value="EXPENSE">Despesa</option>
          </select>
          </label>
          <label className="text-sm text-gray-700">Valor
            <Input className="mt-1 max-w-[140px]" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="text-sm text-gray-700">Descrição
            <Input className="mt-1 max-w-xs" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="text-sm text-gray-700">Categoria
            <Input className="mt-1 max-w-xs" value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>
          <label className="text-sm text-gray-700">Data
            <Input className="mt-1" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <Button type="submit" disabled={saving}>Lançar</Button>
        </form>
      </Card>

      <ListState loading={loading} error={error} empty={!items.length} emptyMessage="Nenhum lançamento encontrado" />
      {!loading && !error && items.length > 0 && <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Descrição</th>
              <th className="p-3">Categoria</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-b border-gray-100">
                <td className="p-3 text-gray-600">{t.date.split("-").reverse().join("/")}</td>
                <td className="p-3">
                  <span className={t.type === "INCOME" ? "text-accent" : "text-red-500"}>
                    {t.type === "INCOME" ? "Receita" : "Despesa"}
                  </span>
                </td>
                <td className="p-3">{brl.format(Number(t.amount))}</td>
                <td className="p-3 text-gray-600">{t.description ?? "—"}</td>
                <td className="p-3 text-gray-600">{t.category ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>}
    </div>
  );
}
