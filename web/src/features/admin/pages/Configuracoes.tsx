import { Card, PageTitle } from "@/components/ui";

export default function Configuracoes() {
  return (
    <div>
      <PageTitle>Configurações</PageTitle>
      <Card>
        <p className="text-sm text-gray-500">
          Configurações chave-valor da escola estarão disponíveis em breve (aguardando endpoint no
          backend).
        </p>
      </Card>
    </div>
  );
}
