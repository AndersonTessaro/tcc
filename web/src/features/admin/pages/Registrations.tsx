import { useState } from "react";
import { toast } from "sonner";
import { adminService } from "../adminService";
import type { NewUser } from "../adminService";
import { Button, Card, Input, PageTitle } from "@/components/ui";

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

export default function Registrations() {
  const [instrument, setInstrument] = useState("");
  const [enr, setEnr] = useState({ studentId: "", teacherId: "", instrumentId: "" });
  const setE = (k: keyof typeof enr) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEnr({ ...enr, [k]: e.target.value });

  const createInstrument = async () => {
    if (!instrument.trim()) return;
    try {
      await adminService.createInstrument(instrument.trim());
      toast.success("Instrumento criado");
      setInstrument("");
    } catch {
      toast.error("Erro ao criar instrumento");
    }
  };

  const createEnrollment = async () => {
    try {
      await adminService.createEnrollment(enr);
      toast.success("Matrícula criada");
      setEnr({ studentId: "", teacherId: "", instrumentId: "" });
    } catch {
      toast.error("Erro ao criar matrícula (verifique os IDs)");
    }
  };

  return (
    <div>
      <PageTitle>Cadastros</PageTitle>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UserForm label="Aluno" onSubmit={adminService.createStudent} />
        <UserForm label="Professor" onSubmit={adminService.createTeacher} />

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
            <Input placeholder="ID do aluno" value={enr.studentId} onChange={setE("studentId")} />
            <Input placeholder="ID do professor" value={enr.teacherId} onChange={setE("teacherId")} />
            <Input placeholder="ID do instrumento" value={enr.instrumentId} onChange={setE("instrumentId")} />
            <Button onClick={createEnrollment} className="w-full">
              Criar matrícula
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
