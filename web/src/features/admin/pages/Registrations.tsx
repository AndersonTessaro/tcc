import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http/errorMessage";
import { adminService } from "../adminService";
import type { InstrumentOption, NewUser, PersonOption, TeacherOption } from "../adminService";
import { InstrumentChecklist } from "../components/InstrumentChecklist";
import { TeacherInstrumentsCard } from "../components/TeacherInstrumentsCard";
import { Button, Card, Input, PageTitle } from "@/components/ui";

type Options = { students: PersonOption[]; teachers: TeacherOption[]; instruments: InstrumentOption[] };

const EMPTY_OPTIONS: Options = { students: [], teachers: [], instruments: [] };
const EMPTY_ENROLLMENT = { studentId: "", teacherId: "", instrumentId: "" };
const EMPTY_USER: NewUser = { username: "", email: "", password: "", name: "" };

type UserFormProps = {
  label: string;
  onSubmit: (b: NewUser, instrumentIds: string[]) => Promise<unknown>;
  instruments?: InstrumentOption[];
};

function UserForm({ label, onSubmit, instruments }: UserFormProps) {
  const [f, setF] = useState<NewUser>(EMPTY_USER);
  const [instrumentIds, setInstrumentIds] = useState<string[]>([]);
  const set = (k: keyof NewUser) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  const save = async () => {
    try {
      await onSubmit(f, instrumentIds);
      toast.success(`${label} criado`);
      setF(EMPTY_USER);
      setInstrumentIds([]);
    } catch (error) {
      toast.error(apiErrorMessage(error, `Erro ao criar ${label.toLowerCase()}`));
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
        {instruments ? (
          <InstrumentChecklist instruments={instruments} selected={instrumentIds} onChange={setInstrumentIds} />
        ) : null}
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
  placeholder = "Selecione…",
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  placeholder?: string;
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
        <option value="">{placeholder}</option>
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
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao carregar alunos, professores e instrumentos"));
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const createStudent = async (b: NewUser) => {
    await adminService.createStudent(b);
    await loadOptions();
  };

  const createTeacher = async (b: NewUser, instrumentIds: string[]) => {
    await adminService.createTeacher({ ...b, instrumentIds });
    await loadOptions();
  };

  const createInstrument = async () => {
    if (!instrument.trim()) return;
    try {
      await adminService.createInstrument(instrument.trim());
      toast.success("Instrumento criado");
      setInstrument("");
      await loadOptions();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao criar instrumento"));
    }
  };

  const selectedTeacher = options.teachers.find((t) => t.id === enr.teacherId);
  const taughtInstruments = selectedTeacher?.instruments ?? [];

  const pickTeacher = (teacherId: string) => {
    const teaches = options.teachers.find((t) => t.id === teacherId)?.instruments ?? [];
    const keepInstrument = teaches.some((i) => i.id === enr.instrumentId);
    setEnr({ ...enr, teacherId, instrumentId: keepInstrument ? enr.instrumentId : "" });
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
    } catch (error) {
      toast.error(apiErrorMessage(error, "Erro ao criar matrícula"));
    }
  };

  return (
    <div>
      <PageTitle>Cadastros</PageTitle>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UserForm label="Aluno" onSubmit={createStudent} />
        <UserForm label="Professor" onSubmit={createTeacher} instruments={options.instruments} />

        <Card>
          <p className="mb-3 font-medium">Novo instrumento</p>
          <div className="flex gap-2">
            <Input placeholder="Nome do instrumento" value={instrument} onChange={(e) => setInstrument(e.target.value)} />
            <Button onClick={createInstrument}>Criar</Button>
          </div>
        </Card>

        <TeacherInstrumentsCard teachers={options.teachers} instruments={options.instruments} onSaved={loadOptions} />

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
              onChange={pickTeacher}
            />
            <OptionSelect
              label="Instrumento"
              value={enr.instrumentId}
              options={taughtInstruments.map((i) => ({ id: i.id, label: i.name }))}
              onChange={(instrumentId) => setEnr({ ...enr, instrumentId })}
              placeholder={
                !selectedTeacher
                  ? "Selecione o professor primeiro"
                  : taughtInstruments.length === 0
                    ? "Professor sem instrumentos"
                    : "Selecione…"
              }
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
