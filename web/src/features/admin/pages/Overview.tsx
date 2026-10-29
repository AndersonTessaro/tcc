import { Link } from "react-router-dom";
import { Card, PageHeader } from "@/components/ui";
import { adminService } from "../adminService";
import { ListState } from "../components/ListState";
import { useAdminList } from "../hooks/useAdminList";
import { brl } from "../format";

const loadOverview = async () => {
  const [students, teachers, enrollments, balance] = await Promise.all([
    adminService.students(), adminService.teachers(), adminService.enrollments("ACTIVE"), adminService.balance(),
  ]);
  return { students, teachers, enrollments, balance: balance.balance };
};

const QUICK_ACTIONS = [
  { to: "/admin/enrollments?novo", label: "Nova matrícula" },
  { to: "/admin/students?novo", label: "Novo aluno" },
  { to: "/admin/teachers?novo", label: "Novo professor" },
  { to: "/admin/finance?novo", label: "Novo lançamento" },
];

export default function Overview() {
  const { data, loading, error } = useAdminList(loadOverview,
    { students: [], teachers: [], enrollments: [], balance: 0 }, "Erro ao carregar a visão geral");

  if (loading || error) {
    return (
      <>
        <PageHeader title="Visão geral" />
        <ListState loading={loading} error={error} empty={false} emptyMessage="" />
      </>
    );
  }

  const enrolledIds = new Set(data.enrollments.map((enrollment) => enrollment.student.id));
  const withoutFee = data.enrollments.filter((enrollment) => enrollment.monthlyFee === null);
  const monthlyRevenue = data.enrollments.reduce((sum, enrollment) => sum + (enrollment.monthlyFee ?? 0), 0);
  const unenrolled = data.students.filter((student) => !enrolledIds.has(student.id));
  const idleTeachers = data.teachers.filter((teacher) => !teacher.instruments.length);
  const pending = [
    { id: "fee", count: withoutFee.length, to: "/admin/enrollments",
      text: withoutFee.length === 1 ? "matrícula ativa sem mensalidade" : "matrículas ativas sem mensalidade",
      names: [...new Set(withoutFee.map((enrollment) => enrollment.student.name))] },
    { id: "unenrolled", count: unenrolled.length, to: "/admin/enrollments?novo",
      text: unenrolled.length === 1 ? "aluno sem matrícula ativa" : "alunos sem matrícula ativa",
      names: unenrolled.map((student) => student.name) },
    { id: "teachers", count: idleTeachers.length, to: "/admin/teachers",
      text: idleTeachers.length === 1 ? "professor sem instrumento cadastrado" : "professores sem instrumento cadastrado",
      names: idleTeachers.map((teacher) => teacher.name) },
  ].filter((item) => item.count > 0);

  return (
    <>
      <PageHeader title="Visão geral" description="A escola hoje, e o que ainda precisa de atenção." />
      <dl className="mb-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receita mensal prevista" value={brl.format(monthlyRevenue)}
          detail={`Soma das ${data.enrollments.length} matrículas ativas`} emphasis />
        <Stat label="Alunos" value={`${data.students.length}`} detail={`${enrolledIds.size} com matrícula ativa`} />
        <Stat label="Professores" value={`${data.teachers.length}`} detail="Cadastrados na escola" />
        <Stat label="Saldo do caixa" value={brl.format(data.balance)} detail="Receitas menos despesas lançadas"
          tone={data.balance < 0 ? "text-danger" : undefined} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold text-ink">Pendências</h2>
          {pending.length === 0
            ? <p className="text-sm text-ink-muted">Tudo em dia. Nenhuma matrícula sem mensalidade, nenhum aluno sem vínculo.</p>
            : (
              <ul className="divide-y divide-line">
                {pending.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm text-ink">
                        <span className="tabular mr-1.5 font-extrabold text-warning">{item.count}</span>{item.text}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-faint">{item.names.slice(0, 4).join(", ")}{item.names.length > 4 ? "…" : ""}</p>
                    </div>
                    <Link to={item.to} className="shrink-0 text-sm font-semibold text-primary hover:underline">Resolver</Link>
                  </li>
                ))}
              </ul>
            )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-bold text-ink">Atalhos</h2>
          <ul className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <li key={action.to}>
                <Link to={action.to}
                  className="block rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, detail, emphasis = false, tone }: {
  label: string;
  value: string;
  detail: string;
  emphasis?: boolean;
  tone?: string;
}) {
  return (
    <div className={`px-5 py-4 ${emphasis ? "bg-primary text-white" : "bg-white"}`}>
      <dt className={`text-sm font-medium ${emphasis ? "text-white/80" : "text-ink-muted"}`}>{label}</dt>
      <dd className={`tabular mt-1 text-2xl font-extrabold tracking-tight ${tone ?? (emphasis ? "text-white" : "text-ink")}`}>{value}</dd>
      <dd className={`mt-1 text-xs ${emphasis ? "text-white/75" : "text-ink-faint"}`}>{detail}</dd>
    </div>
  );
}
