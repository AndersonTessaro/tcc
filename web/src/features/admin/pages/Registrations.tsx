import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminService } from "../adminService";
import type { InstrumentOption, NewUser, PersonOption } from "../adminService";
import { Button, Card, Input, PageTitle } from "@/components/ui";

type Options = { students: PersonOption[]; teachers: PersonOption[]; instruments: InstrumentOption[] };

const EMPTY_OPTIONS: Options = { students: [], teachers: [], instruments: [] };
const EMPTY_ENROLLMENT = { studentId: "", teacherId: "", instrumentId: "" };

function UserForm({ label, onSubmit }: { label: string; onSubmit: (b: NewUser) => Promise<unknown> }) {
  const [f, setF] = useState<NewUser>({ username: "", email: "", password: "", name: "" });
  const set = (k: keyof NewUser) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  const save = async () => {
    try {
      await onSubmit(f);
      toast.success(`${label} criado`);
      setF({ username: "", email: "", password: "", name: "" });
    } catch {
      toast.error(`Erro ao criar ${label.toLowerCase()}`);
    }
  };

  return (
    <Card>
      <p className="mb-3 font-medium">Novo {label.toLowerCase()}</p>
      <div className="space-y-2">
        <Input placeholder="Usuário" value={f.username} onChange={set("username")} />
        <Input placeholder="E-mail" value={f.email} onChange={set("email")} />
        <Input placeholder="Senha (mín. 8)" type="password" value={f.password} onChange={set("password")} />
        <Input placeholder="Nome" value={f.name} onChange={set("name")} />
        <Button onClick={save} className="w-full">
          Criar {label.toLowerCase()}
        </Button>
      </div>
    </Card>
  );
}

function OptionSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <label className="block text-sm text-gray-700">
      {label}
      <select
        aria-label={label}
        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const personLabel = (p: PersonOption) => `${p.name} (${p.username})`;

export default function Registrations() {
  const [instrument, setInstrument] = useState("");
  const [enr, setEnr] = useState(EMPTY_ENROLLMENT);
  const [options, setOptions] = useState<Options>(EMPTY_OPTIONS);

  const loadOptions = useCallback(async () => {
    try {
      const [students, teachers, instruments] = await Promise.all([
        adminService.students(),
        adminService.teachers(),
        adminService.instruments(),
      ]);
      setOptions({ students, teachers, instruments });
    } catch {
      toast.error("Erro ao carregar alunos, professores e instrumentos");
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const afterCreate = (create: (b: NewUser) => Promise<unknown>) => async (b: NewUser) => {
    await create(b);
    await loadOptions();
  };

  const createInstrument = async () => {
    if (!instrument.trim()) return;
    try {
      await adminService.createInstrument(instrument.trim());
      toast.success("Instrumento criado");
      setInstrument("");
      await loadOptions();
    } catch {
      toast.error("Erro ao criar instrumento");
    }
  };

  const createEnrollment = async () => {
    if (!enr.studentId || !enr.teacherId || !enr.instrumentId) {
      toast.error("Selecione aluno, professor e instrumento");
      return;
    }
    try {
      await adminService.createEnrollment(enr);
      toast.success("Matrícula criada");
      setEnr(EMPTY_ENROLLMENT);
    } catch {
      toast.error("Erro ao criar matrícula");
    }
  };

  return (
    <div>
      <PageTitle>Cadastros</PageTitle>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UserForm label="Aluno" onSubmit={afterCreate(adminService.createStudent)} />
        <UserForm label="Professor" onSubmit={afterCreate(adminService.createTeacher)} />

        <Card>
          <p className="mb-3 font-medium">Novo instrumento</p>
          <div className="flex gap-2">
            <Input placeholder="Nome do instrumento" value={instrument} onChange={(e) => setInstrument(e.target.value)} />
            <Button onClick={createInstrument}>Criar</Button>
          </div>
        </Card>

        <Card>
          <p className="mb-3 font-medium">Nova matrícula</p>
          <div className="space-y-2">
            <OptionSelect
              label="Aluno"
              value={enr.studentId}
              options={options.students.map((s) => ({ id: s.id, label: personLabel(s) }))}
              onChange={(studentId) => setEnr({ ...enr, studentId })}
            />
            <OptionSelect
              label="Professor"
              value={enr.teacherId}
              options={options.teachers.map((t) => ({ id: t.id, label: personLabel(t) }))}
              onChange={(teacherId) => setEnr({ ...enr, teacherId })}
            />
            <OptionSelect
              label="Instrumento"
              value={enr.instrumentId}
              options={options.instruments.map((i) => ({ id: i.id, label: i.name }))}
              onChange={(instrumentId) => setEnr({ ...enr, instrumentId })}
            />
            <Button onClick={createEnrollment} className="w-full">
              Criar matrícula
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
