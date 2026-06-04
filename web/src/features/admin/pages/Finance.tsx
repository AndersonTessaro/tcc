import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminService } from "../adminService";
import type { TransactionDto, TransactionType } from "../adminService";
import { Button, Card, Input, PageTitle } from "@/components/ui";

export default function Finance() {
  const [items, setItems] = useState<TransactionDto[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [type, setType] = useState<TransactionType>("INCOME");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([adminService.transactions(), adminService.balance()])
      .then(([t, b]) => {
        setItems(t);
        setBalance(b.balance);
      })
      .catch(() => toast.error("Erro ao carregar financeiro"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    try {
      await adminService.createTransaction({ type, amount: value, description: description || undefined });
      toast.success("Lançamento criado");
      setAmount("");
      setDescription("");
      load();
    } catch {
      toast.error("Erro ao lançar");
    }
  };

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <PageTitle>Financeiro</PageTitle>

      <Card className="mb-6">
        <p className="text-sm text-gray-500">Saldo</p>
        <p className={`text-2xl font-bold ${balance >= 0 ? "text-accent" : "text-red-500"}`}>
          R$ {balance.toFixed(2)}
        </p>
      </Card>

      <Card className="mb-6">
        <p className="mb-3 font-medium">Novo lançamento</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
          >
            <option value="INCOME">Receita</option>
            <option value="EXPENSE">Despesa</option>
          </select>
          <Input className="max-w-[140px]" placeholder="Valor" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input className="max-w-xs" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button onClick={create}>Lançar</Button>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-gray-500">
            <tr>
              <th className="p-3">Data</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id} className="border-b border-gray-100">
                <td className="p-3 text-gray-600">{t.date}</td>
                <td className="p-3">
                  <span className={t.type === "INCOME" ? "text-accent" : "text-red-500"}>
                    {t.type === "INCOME" ? "Receita" : "Despesa"}
                  </span>
                </td>
                <td className="p-3">R$ {Number(t.amount).toFixed(2)}</td>
                <td className="p-3 text-gray-600">{t.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
