import { useState } from "react";
import { toast } from "sonner";
import { adminService } from "../adminService";
import { Button, Card, Input, PageTitle } from "@/components/ui";

function UsuarioForm({ tipo, onSubmit }: { tipo: string; onSubmit: (b: any) => Promise<unknown> }) {
  const [f, setF] = useState({ username: "", email: "", senha: "", nome: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  const salvar = async () => {
    try {
      await onSubmit(f);
      toast.success(`${tipo} criado`);
      setF({ username: "", email: "", senha: "", nome: "" });
    } catch {
      toast.error(`Erro ao criar ${tipo.toLowerCase()}`);
    }
  };

  return (
    <Card>
      <p className="mb-3 font-medium">Novo {tipo.toLowerCase()}</p>
      <div className="space-y-2">
        <Input placeholder="Usuário" value={f.username} onChange={set("username")} />
        <Input placeholder="E-mail" value={f.email} onChange={set("email")} />
        <Input placeholder="Senha (mín. 8)" type="password" value={f.senha} onChange={set("senha")} />
        <Input placeholder="Nome" value={f.nome} onChange={set("nome")} />
        <Button onClick={salvar} className="w-full">
          Criar {tipo.toLowerCase()}
        </Button>
      </div>
    </Card>
  );
}

export default function Cadastros() {
  const [instrumento, setInstrumento] = useState("");
  const [mat, setMat] = useState({ alunoId: "", professorId: "", instrumentoId: "" });
  const setM = (k: keyof typeof mat) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setMat({ ...mat, [k]: e.target.value });

  const criarInstrumento = async () => {
    if (!instrumento.trim()) return;
    try {
      await adminService.criarInstrumento(instrumento.trim());
      toast.success("Instrumento criado");
      setInstrumento("");
    } catch {
      toast.error("Erro ao criar instrumento");
    }
  };

  const criarMatricula = async () => {
    try {
      await adminService.criarMatricula(mat);
      toast.success("Matrícula criada");
      setMat({ alunoId: "", professorId: "", instrumentoId: "" });
    } catch {
      toast.error("Erro ao criar matrícula (verifique os IDs)");
    }
  };

  return (
    <div>
      <PageTitle>Cadastros</PageTitle>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UsuarioForm tipo="Aluno" onSubmit={adminService.criarAluno} />
        <UsuarioForm tipo="Professor" onSubmit={adminService.criarProfessor} />

        <Card>
          <p className="mb-3 font-medium">Novo instrumento</p>
          <div className="flex gap-2">
            <Input placeholder="Nome do instrumento" value={instrumento} onChange={(e) => setInstrumento(e.target.value)} />
            <Button onClick={criarInstrumento}>Criar</Button>
          </div>
        </Card>

        <Card>
          <p className="mb-3 font-medium">Nova matrícula</p>
          <div className="space-y-2">
            <Input placeholder="ID do aluno" value={mat.alunoId} onChange={setM("alunoId")} />
            <Input placeholder="ID do professor" value={mat.professorId} onChange={setM("professorId")} />
            <Input placeholder="ID do instrumento" value={mat.instrumentoId} onChange={setM("instrumentoId")} />
            <Button onClick={criarMatricula} className="w-full">
              Criar matrícula
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
